import os
import pg8000
from dotenv import load_dotenv
import logging
from pathlib import Path

# Load environment variables from Root Directory
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Logger configuration
logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.connection_string = os.getenv('NETLIFY_DATABASE_URL')
        if not self.connection_string:
            logger.error("❌ NETLIFY_DATABASE_URL not found in environment variables!")
            raise ValueError("NETLIFY_DATABASE_URL environment variable is required.")
        
        # Parse connection string for pg8000
        # Expected format: postgresql://user:pass@host/dbname?sslmode=require
        try:
            from urllib.parse import urlparse, parse_qs
            url = urlparse(self.connection_string)
            self.user = url.username
            self.password = url.password
            self.host = url.hostname
            self.port = url.port or 5432
            self.database = url.path[1:] # remove leading slash
            
            # Check SSL
            qs = parse_qs(url.query)
            self.ssl_context = True if 'sslmode' in qs and qs['sslmode'][0] != 'disable' else False
            if 'sslmode' in qs and qs['sslmode'][0] == 'require':
                 import ssl
                 self.ssl_context = ssl.create_default_context()
                 self.ssl_context.check_hostname = False
                 self.ssl_context.verify_mode = ssl.CERT_NONE

        except Exception as e:
            logger.error(f"Failed to parse DB URL: {e}")
            raise e

    def get_connection(self):
        """Create a new database connection using pg8000 DBAPI."""
        try:
            conn = pg8000.connect(
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port,
                database=self.database,
                ssl_context=self.ssl_context
            )
            return conn
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            raise e

    def fetch_one(self, query, params=None):
        """Fetch a single row."""
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            
            result = cursor.fetchone()
            if not result:
                return None
            
            # Map columns to values
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, result))

        except Exception as e:
            logger.error(f"❌ fetch_one error: {e}")
            return None
        finally:
            if conn:
                conn.close()

    def fetch_all(self, query, params=None):
        """Fetch multiple rows."""
        conn = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            
            results = cursor.fetchall()
            if not results:
                return []
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in results]

        except Exception as e:
            logger.error(f"❌ fetch_all error: {e}")
            return []
        finally:
            if conn:
                conn.close()

    # --- Business Queries ---

    def get_recent_orders(self, limit=5):
        """Get the most recent orders."""
        query = """
            SELECT 
                order_id, 
                customer_name, 
                phone,
                product_name,
                size,
                quantity,
                total_price, 
                status, 
                payment_status,
                payment_method,
                created_at 
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT %s
        """
        return self.fetch_all(query, (limit,))

    def get_todays_stats(self):
        """Get total sales and order count for today."""
        query = """
            SELECT 
                COUNT(*) as order_count, 
                COALESCE(SUM(total_price), 0) as total_sales 
            FROM orders 
            WHERE created_at >= CURRENT_DATE
        """
        return self.fetch_one(query)

    def get_low_stock_products(self, threshold=5):
        """Get products with low stock."""
        query = """
            SELECT name, stock_quantity 
            FROM products 
            WHERE stock_quantity < %s 
            ORDER BY stock_quantity ASC 
            LIMIT 10
        """
        return self.fetch_all(query, (threshold,))

    def get_sales_analytics(self):
        """Get daily, weekly, and monthly sales stats."""
        try:
            # Daily Sales
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE created_at >= CURRENT_DATE")
                daily = cursor.fetchone()[0]
                
                # Weekly Sales
                cursor.execute("SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '7 days'")
                weekly = cursor.fetchone()[0]
                
                # Monthly Sales
                cursor.execute("SELECT TO_CHAR(created_at, 'YYYY-MM'), SUM(total_price) FROM orders GROUP BY 1 ORDER BY 1 DESC LIMIT 6")
                monthly = cursor.fetchall()
            
            return {
                'daily': float(daily),
                'weekly': float(weekly),
                'monthly': monthly
            }
        except Exception as e:
            logger.error(f"Error fetching sales analytics: {e}")
            return None

    def get_top_customers(self, limit=5):
        """Get top customers by spending."""
        query = """
            SELECT 
                customer_name, 
                phone, 
                COUNT(*) as order_count, 
                SUM(total_price) as total_spent 
            FROM orders 
            GROUP BY customer_name, phone 
            ORDER BY total_spent DESC 
            LIMIT %s
        """
        return self.fetch_all(query, (limit,))

    def get_latest_order_id(self):
        """Get the ID of the very last order (for polling)."""
        query = "SELECT order_id FROM orders ORDER BY created_at DESC LIMIT 1"
        result = self.fetch_one(query)
        return result['order_id'] if result else None

# Singleton instance
db = Database()
