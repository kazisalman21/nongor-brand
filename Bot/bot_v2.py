"""
🌟 NONGOR ULTIMATE PREMIUM BOT v3.0 🌟
========================================
Complete Business Management Bot for E-commerce

Features:
- 🌐 Website Monitoring with Auto-Alerts
- 📦 Real-time Order Notifications
- 🤖 AI Assistant (Gemini-powered)
- 📊 Business Analytics & Charts
- 💰 Sales Reports (Daily/Weekly/Monthly)
- 📉 Inventory Management
- 👥 Customer Insights
- 📤 Data Export (CSV)
- 🔐 Multi-Admin Support
- 🎨 Rich Interactive UI

Author: Claude AI
License: MIT
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from pathlib import Path
from io import BytesIO
import csv

from dotenv import load_dotenv
import google.generativeai as genai

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, 
    CommandHandler, 
    CallbackQueryHandler, 
    ContextTypes, 
    MessageHandler, 
    filters
)

# Import custom modules
try:
    from database import db
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    print("⚠️ database.py not found - database features disabled")

# Try to import matplotlib for charts
try:
    import matplotlib.pyplot as plt
    import matplotlib
    matplotlib.use('Agg')  # Non-GUI backend
    CHARTS_AVAILABLE = True
except ImportError:
    CHARTS_AVAILABLE = False
    print("⚠️ matplotlib not found - chart features disabled")

# Try to import requests for website monitoring
try:
    import requests
    MONITORING_AVAILABLE = True
except ImportError:
    MONITORING_AVAILABLE = False
    print("⚠️ requests not found - monitoring features disabled")

# ============================================================================
# CONFIGURATION
# ============================================================================

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Bot Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
WEBSITE_URL = os.getenv('WEBSITE_URL', 'https://nongor-brand.vercel.app/')
CHECK_INTERVAL = int(os.getenv('MONITOR_INTERVAL_SECONDS', '300'))

# Admin Users
ADMIN_USER_IDS_STR = os.getenv('ADMIN_USER_IDS', '')
ADMIN_USER_IDS = [int(uid.strip()) for uid in ADMIN_USER_IDS_STR.split(',') if uid.strip()]

# Configure Gemini AI
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model_name = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')
    ai_model = genai.GenerativeModel(model_name)
    logger.info(f"✅ Gemini AI configured (Model: {model_name})")
else:
    ai_model = None
    logger.warning("⚠️ GEMINI_API_KEY missing - AI features disabled")

# Global State
monitoring_state = {
    'enabled': False,
    'last_check': None,
    'last_status': None,
    'last_error': None,
    'downtime_count': 0,
}

last_seen_order_id = None
conversation_mode = {}  # Track if user is in AI chat mode

# ============================================================================
# AUTHENTICATION & SECURITY
# ============================================================================

def is_admin(user_id: int) -> bool:
    """Check if user is authorized admin."""
    if not ADMIN_USER_IDS:
        return True  # No restriction if not configured
    return user_id in ADMIN_USER_IDS

async def check_admin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Verify admin access and send error if unauthorized."""
    user_id = update.effective_user.id
    if not is_admin(user_id):
        await update.message.reply_text(
            "🔒 **Access Denied**\n\n"
            "This bot is restricted to authorized administrators only.\n"
            f"Your User ID: `{user_id}`",
            parse_mode='Markdown'
        )
        logger.warning(f"Unauthorized access attempt from user {user_id}")
        return False
    return True

# ============================================================================
# WEBSITE MONITORING
# ============================================================================

class WebsiteMonitor:
    """Website uptime monitoring."""
    
    @staticmethod
    async def check_website(url: str, timeout: int = 10) -> dict:
        """Check if website is accessible."""
        if not MONITORING_AVAILABLE:
            return {
                'status': 'unknown',
                'error': 'Monitoring disabled - install requests library'
            }
        
        try:
            import time
            start_time = time.time()
            response = requests.get(url, timeout=timeout, allow_redirects=True)
            response_time = time.time() - start_time
            
            return {
                'status': 'up' if response.status_code == 200 else 'degraded',
                'status_code': response.status_code,
                'response_time': round(response_time, 2),
                'timestamp': datetime.now().isoformat(),
                'error': None
            }
        except requests.exceptions.Timeout:
            return {
                'status': 'down',
                'status_code': None,
                'response_time': None,
                'timestamp': datetime.now().isoformat(),
                'error': 'Connection Timeout'
            }
        except requests.exceptions.ConnectionError:
            return {
                'status': 'down',
                'status_code': None,
                'response_time': None,
                'timestamp': datetime.now().isoformat(),
                'error': 'Connection Error'
            }
        except Exception as e:
            return {
                'status': 'down',
                'status_code': None,
                'response_time': None,
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }

async def monitoring_loop(context: ContextTypes.DEFAULT_TYPE):
    """Background website monitoring with alerts."""
    logger.info("📡 Starting website monitoring loop")
    
    while monitoring_state['enabled']:
        try:
            result = await WebsiteMonitor.check_website(WEBSITE_URL)
            monitoring_state['last_check'] = datetime.now()
            
            previous_status = monitoring_state['last_status']
            current_status = result['status']
            
            # Detect status change
            if previous_status != current_status and previous_status is not None:
                logger.info(f"Status changed: {previous_status} → {current_status}")
                
                # Website DOWN alert
                if current_status == 'down':
                    monitoring_state['downtime_count'] += 1
                    await send_alert_to_admins(
                        context,
                        "🚨 **CRITICAL ALERT: Website Down!**\n\n"
                        f"🌐 URL: `{WEBSITE_URL}`\n"
                        f"❌ Error: {result['error']}\n"
                        f"🕐 Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
                        f"⚠️ Total Downtimes: {monitoring_state['downtime_count']}"
                    )
                
                # Website RECOVERED alert
                elif previous_status == 'down' and current_status == 'up':
                    await send_alert_to_admins(
                        context,
                        "✅ **Website Recovered!**\n\n"
                        f"🌐 URL: `{WEBSITE_URL}`\n"
                        f"⚡ Response Time: {result['response_time']}s\n"
                        f"🕐 Recovered At: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    )
            
            monitoring_state['last_status'] = current_status
            monitoring_state['last_error'] = result['error']
            
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
        
        await asyncio.sleep(CHECK_INTERVAL)
    
    logger.info("📡 Monitoring loop stopped")

# ============================================================================
# ORDER MONITORING
# ============================================================================

async def poll_orders_loop(bot):
    """Background loop to poll database for new orders."""
    global last_seen_order_id
    
    if not DB_AVAILABLE:
        return

    logger.info("📦 Order polling task started")
    await asyncio.sleep(10) # Initial delay

    while True:
        try:
            # Initialize tracking on first run
            if last_seen_order_id is None:
                try:
                    result = db.fetch_one("SELECT order_id FROM orders ORDER BY created_at DESC LIMIT 1")
                    if result:
                        last_seen_order_id = result['order_id']
                        logger.info(f"📦 Initialized order tracking at ID: {last_seen_order_id}")
                except Exception as e:
                    logger.error(f"Failed to initialize order tracking: {e}")
            
            else:
                # Check for new orders
                query = "SELECT * FROM orders WHERE order_id > %s ORDER BY created_at ASC"
                new_orders = db.fetch_all(query, (last_seen_order_id,))
                
                for order in new_orders:
                    last_seen_order_id = order['order_id']
                    
                    # Send new order alert
                    msg = (
                        f"🎉 **NEW ORDER RECEIVED!**\n\n"
                        f"🆔 Order #`{order['order_id']}`\n"
                        f"👤 Customer: {order['customer_name']}\n"
                        f"💰 Total: ${order['total_price']}\n"
                        f"📦 Status: {order.get('status', 'Pending')}\n"
                        f"🕐 {order.get('created_at', 'Now').strftime('%Y-%m-%d %H:%M:%S') if hasattr(order.get('created_at'), 'strftime') else 'Now'}"
                    )
                    
                    # Notify admins
                    for user_id in ADMIN_USER_IDS:
                        try:
                            await bot.send_message(
                                chat_id=user_id,
                                text=msg,
                                parse_mode='Markdown'
                            )
                        except Exception as e:
                            logger.error(f"Failed to notify admin {user_id}: {e}")

        except Exception as e:
            logger.error(f"Error polling orders: {e}")
        
        # Wait for next check
        await asyncio.sleep(60)

# ============================================================================
# UI MENUS
# ============================================================================

def get_main_menu():
    """Main dashboard menu."""
    keyboard = [
        [
            InlineKeyboardButton("📊 Dashboard", callback_data='dashboard'),
            InlineKeyboardButton("🌐 Website", callback_data='website_status')
        ],
        [
            InlineKeyboardButton("📦 Orders", callback_data='orders'),
            InlineKeyboardButton("💰 Sales", callback_data='sales')
        ],
        [
            InlineKeyboardButton("📉 Inventory", callback_data='inventory'),
            InlineKeyboardButton("👥 Customers", callback_data='customers')
        ],
        [
            InlineKeyboardButton("🤖 AI Assistant", callback_data='ai_mode'),
            InlineKeyboardButton("📤 Export Data", callback_data='export')
        ],
        [
            InlineKeyboardButton("⚙️ Settings", callback_data='settings'),
            InlineKeyboardButton("🔄 Refresh", callback_data='refresh')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

def get_back_button():
    """Simple back to main menu button."""
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("◀️ Back to Menu", callback_data='back_to_menu')
    ]])

def get_monitoring_menu():
    """Website monitoring controls."""
    status = "🟢 ON" if monitoring_state['enabled'] else "🔴 OFF"
    keyboard = [
        [
            InlineKeyboardButton(f"Monitoring: {status}", callback_data='toggle_monitoring')
        ],
        [
            InlineKeyboardButton("◀️ Back", callback_data='back_to_menu')
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

# ============================================================================
# COMMAND HANDLERS
# ============================================================================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command - Entry point."""
    if not await check_admin(update, context):
        return
    
    user = update.effective_user
    
    welcome_text = (
        f"👋 **Welcome, {user.first_name}!**\n\n"
        f"🌟 **Nongor Ultimate Premium Bot v3.0**\n\n"
        f"Your all-in-one business management assistant.\n\n"
        f"🆔 User ID: `{user.id}`\n"
        f"✅ Status: Authorized Admin\n\n"
        f"Select an option below to get started:"
    )
    
    await update.message.reply_text(
        welcome_text,
        reply_markup=get_main_menu(),
        parse_mode='Markdown'
    )

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help information."""
    if not await check_admin(update, context):
        return
    
    help_text = (
        "📖 **Bot Commands & Features**\n\n"
        "**Commands:**\n"
        "/start - Open main menu\n"
        "/help - Show this help\n"
        "/dashboard - Quick stats\n"
        "/status - Website status\n"
        "/ai - Enter AI chat mode\n\n"
        "**Features:**\n"
        "📊 Real-time business analytics\n"
        "📦 Instant order notifications\n"
        "🌐 Website uptime monitoring\n"
        "🤖 AI-powered assistant\n"
        "📤 Export data to CSV\n"
        "📈 Sales reports & charts\n\n"
        "**Support:**\n"
        "For issues or questions, contact your developer."
    )
    
    await update.message.reply_text(
        help_text,
        reply_markup=get_main_menu(),
        parse_mode='Markdown'
    )

# ============================================================================
# CALLBACK QUERY HANDLERS (Button Clicks)
# ============================================================================

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle all inline button clicks."""
    query = update.callback_query
    await query.answer()  # Acknowledge click
    
    if not is_admin(query.from_user.id):
        await query.edit_message_text("🔒 Unauthorized access.")
        return
    
    data = query.data
    
    # Route to appropriate handler
    if data == 'back_to_menu' or data == 'refresh':
        await show_main_menu(query)
    
    elif data == 'dashboard':
        await show_dashboard(query)
    
    elif data == 'website_status':
        await show_website_status(query)
    
    elif data == 'toggle_monitoring':
        await toggle_monitoring(query, context)
    
    elif data == 'orders':
        await show_orders(query)
    
    elif data == 'sales':
        await show_sales(query)
    
    elif data == 'inventory':
        await show_inventory(query)
    
    elif data == 'customers':
        await show_customers(query)
    
    elif data == 'ai_mode':
        await activate_ai_mode(query, context)
    
    elif data == 'export':
        await show_export_options(query)
    
    elif data.startswith('export_'):
        await export_data(query, context, data.replace('export_', ''))
    
    elif data == 'settings':
        await show_settings(query)

# ============================================================================
# MENU DISPLAYS
# ============================================================================

async def show_main_menu(query):
    """Show main menu."""
    text = (
        f"🌟 **Nongor Premium Bot**\n\n"
        f"🕐 Last Updated: {datetime.now().strftime('%H:%M:%S')}\n"
        f"Select an option below:"
    )
    await query.edit_message_text(text, reply_markup=get_main_menu(), parse_mode='Markdown')

async def show_dashboard(query):
    """Show business dashboard."""
    if not DB_AVAILABLE:
        text = "❌ Database not configured.\n\nPlease set NETLIFY_DATABASE_URL in your .env file."
    else:
        try:
            stats = db.get_todays_stats()
            recent = db.get_recent_orders(1)
            low_stock = db.get_low_stock_products(5)
            
            text = (
                f"📊 **Business Dashboard**\n\n"
                f"**Today's Performance:**\n"
                f"💰 Sales: ${stats.get('total_sales', 0):,.2f}\n"
                f"📦 Orders: {stats.get('order_count', 0)}\n\n"
                f"**Latest Order:**\n"
            )
            
            if recent:
                order = recent[0]
                # Escape markdown characters
                cust_name = order['customer_name'].replace('_', '\\_').replace('*', '\\*').replace('`', '\\`')
                prod_name = order.get('product_name', 'Unknown').replace('_', '\\_').replace('*', '\\*')
                status_emoji = {'pending': '⏳', 'processing': '⚙️', 'shipped': '🚚', 'delivered': '✅', 'cancelled': '❌'}.get(order.get('status', 'pending'), '📦')
                
                text += (
                    f"🆔 `#{order['order_id']}` {status_emoji}\n"
                    f"👤 {cust_name}\n"
                    f"🛍️ {prod_name} (x{order.get('quantity', 1)})\n"
                    f"💰 ৳{order['total_price']} · {order.get('payment_status', 'Due')}\n\n"
                )
            else:
                text += "No orders yet today.\n\n"
            
            text += f"**Alerts:**\n"
            if low_stock:
                text += f"⚠️ {len(low_stock)} items low in stock\n"
            else:
                text += "✅ Inventory levels good\n"
            
            if monitoring_state['enabled']:
                text += f"🟢 Website monitoring active\n"
            else:
                text += f"🔴 Website monitoring disabled\n"
        
        except Exception as e:
            text = f"❌ Error loading dashboard: {e}"
            await query.edit_message_text(text, reply_markup=get_back_button(), parse_mode=None)
            return
    
    await query.edit_message_text(text, reply_markup=get_back_button(), parse_mode='Markdown')

async def show_website_status(query):
    """Show website status."""
    status_msg = await query.message.reply_text("🔍 Checking website...")
    
    result = await WebsiteMonitor.check_website(WEBSITE_URL)
    
    status_icon = "✅" if result['status'] == 'up' else "⚠️" if result['status'] == 'degraded' else "❌"
    monitoring_icon = "🟢" if monitoring_state['enabled'] else "🔴"
    
    text = (
        f"{status_icon} **Website Status**\n\n"
        f"🌐 URL: `{WEBSITE_URL}`\n"
        f"📊 Status: **{result['status'].upper()}**\n"
    )
    
    if result['status_code']:
        text += f"📟 HTTP Code: {result['status_code']}\n"
    if result['response_time']:
        text += f"⚡ Response Time: {result['response_time']}s\n"
    if result['error']:
        text += f"❌ Error: {result['error']}\n"
    
    text += f"\n{monitoring_icon} **Monitoring:** {'Enabled' if monitoring_state['enabled'] else 'Disabled'}\n"
    
    if monitoring_state['last_check']:
        text += f"🕐 Last Check: {monitoring_state['last_check'].strftime('%H:%M:%S')}\n"
    
    text += f"📉 Downtimes: {monitoring_state['downtime_count']}"
    
    await status_msg.delete()
    await query.edit_message_text(text, reply_markup=get_monitoring_menu(), parse_mode='Markdown')

async def toggle_monitoring(query, context):
    """Toggle website monitoring on/off."""
    monitoring_state['enabled'] = not monitoring_state['enabled']
    
    if monitoring_state['enabled']:
        # Start monitoring
        asyncio.create_task(monitoring_loop(context))
        text = f"✅ Website monitoring **ENABLED**\n\n⏰ Checking every {CHECK_INTERVAL}s"
    else:
        text = "⏹️ Website monitoring **DISABLED**"
    
    await query.answer(text)
    await show_website_status(query)

async def show_orders(query):
    """Show recent orders."""
    if not DB_AVAILABLE:
        text = "❌ Database not configured."
    else:
        try:
            orders = db.get_recent_orders(10)
            
            if not orders:
                text = "📦 **Recent Orders**\n\nNo orders found."
            else:
                text = f"📦 **Recent Orders** (Last 10)\n\n"
                for order in orders:
                    status_icon = {'pending': '⏳', 'processing': '⚙️', 'shipped': '🚚', 'delivered': '✅', 'cancelled': '❌'}.get(order.get('status', 'pending'), '📦')
                    
                    cust_name = order['customer_name'].replace('_', '\\_').replace('*', '\\*').replace('`', '\\`')
                    prod_name = order.get('product_name', 'Unknown').replace('_', '\\_').replace('*', '\\*')
                    date_str = str(order.get('created_at', 'N/A')).split('.')[0]

                    text += (
                        f"{status_icon} `#{order['order_id']}`\n"
                        f"👤 {cust_name}\n"
                        f"📞 {order.get('phone', 'N/A')}\n"
                        f"🛍️ {prod_name} (Size: {order.get('size','N/A')} | x{order.get('quantity',1)})\n"
                        f"💰 ৳{order['total_price']} · {order.get('payment_status', 'Due')} · {order.get('payment_method', 'COD')}\n"
                        f"🕐 {date_str}\n\n"
                    )
        except Exception as e:
            text = f"❌ Error: {e}"
    
    await query.edit_message_text(text, reply_markup=get_back_button(), parse_mode='Markdown')

async def show_sales(query):
    """Show sales analytics."""
    if not DB_AVAILABLE:
        text = "❌ Database not configured."
    else:
        try:
            analytics = db.get_sales_analytics()
            
            if not analytics:
                 text = "❌ Error fetching sales data."
            else:
                text = (
                    f"💰 **Sales Analytics**\n\n"
                    f"📅 **Daily Sales**\n"
                    f"💵 Amount: ৳{analytics['daily']:,.2f}\n\n"
                    
                    f"📅 **Weekly Sales** (Last 7 Days)\n"
                    f"💵 Amount: ৳{analytics['weekly']:,.2f}\n\n"
                    
                    f"📅 **Monthly Trends**\n"
                )
                
                if analytics['monthly']:
                    for month, total in analytics['monthly']:
                         text += f"• {month}: ৳{float(total):,.2f}\n"
                else:
                    text += "No monthly data available.\n"
                    
            text += "\n💡 Tip: Use /export to download detailed reports"
        
        except Exception as e:
            text = f"❌ Error: {e}"
    
    await query.edit_message_text(text, reply_markup=get_back_button(), parse_mode='Markdown')

async def show_inventory(query):
    """Show inventory status."""
    if not DB_AVAILABLE:
        text = "❌ Database not configured."
    else:
        try:
            low_stock = db.get_low_stock_products(5)
            
            if not low_stock:
                text = "✅ **Inventory Status**\n\nAll products have sufficient stock! (>5 units)"
            else:
                text = f"⚠️ **Low Stock Alert**\n\nProducts below 5 units:\n\n"
                for product in low_stock:
                    icon = "🔴" if product['stock_quantity'] == 0 else "⚠️"
                    text += f"{icon} **{product['name']}**\n📦 Stock: {product['stock_quantity']} units\n\n"
        
        except Exception as e:
            text = f"❌ Error: {e}"
    
    await query.edit_message_text(text, reply_markup=get_back_button(), parse_mode='Markdown')

async def show_customers(query):
    """Show customer insights."""
    if not DB_AVAILABLE:
        text = "❌ Database not configured."
    else:
        try:
             customers = db.get_top_customers(5)
             
             if not customers:
                 text = "👥 **Top Customers**\n\nNo customer data found."
             else:
                 text = "🏆 **Top 5 Loyal Customers**\n\n"
                 for i, cust in enumerate(customers, 1):
                     name = cust['customer_name'].replace('_', '\\_')
                     total = float(cust['total_spent'])
                     count = cust['order_count']
                     
                     text += (
                         f"{i}. **{name}**\n"
                         f"   💰 Spent: ৳{total:,.2f} | 📦 Orders: {count}\n"
                         f"   📞 `{cust['phone']}`\n\n"
                     )
                     
        except Exception as e:
            text = f"❌ Error: {e}"

    await query.edit_message_text(text, reply_markup=get_back_button(), parse_mode='Markdown')

async def activate_ai_mode(query, context):
    """Activate AI assistant chat mode."""
    user_id = query.from_user.id
    conversation_mode[user_id] = True
    
    text = (
        "🤖 **AI Assistant Activated**\n\n"
        "You can now chat with me! Ask anything:\n\n"
        "💡 Examples:\n"
        "• Draft a promotional email\n"
        "• Analyze sales trends\n"
        "• Suggest marketing strategies\n"
        "• Generate product descriptions\n\n"
        "Type /menu to return to main menu."
    )
    
    await query.edit_message_text(text, parse_mode='Markdown')

async def show_export_options(query):
    """Show data export options."""
    keyboard = [
        [
            InlineKeyboardButton("📦 Orders CSV", callback_data='export_orders'),
            InlineKeyboardButton("📊 Sales CSV", callback_data='export_sales')
        ],
        [
            InlineKeyboardButton("◀️ Back", callback_data='back_to_menu')
        ]
    ]
    
    text = "📤 **Export Data**\n\nSelect what to export:"
    await query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='Markdown')

async def export_data(query, context, export_type):
    """Export data to CSV."""
    if not DB_AVAILABLE:
        await query.answer("❌ Database not configured", show_alert=True)
        return
    
    await query.answer("Generating export...", show_alert=False)
    
    try:
        if export_type == 'orders':
            orders = db.get_recent_orders(100)
            
            # Create CSV in memory
            output = BytesIO()
            output.write(b'\xef\xbb\xbf')  # UTF-8 BOM
            writer = csv.DictWriter(output, fieldnames=['order_id', 'customer_name', 'total_price', 'status', 'created_at'])
            writer.writeheader()
            writer.writerows(orders)
            output.seek(0)
            
            filename = f"orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            await context.bot.send_document(
                chat_id=query.message.chat_id,
                document=output,
                filename=filename,
                caption=f"📦 Orders Export - {len(orders)} records"
            )
        
        elif export_type == 'sales':
            # Export all orders as Sales Report
            orders = db.fetch_all("SELECT * FROM orders ORDER BY created_at DESC")
            
            output = BytesIO()
            output.write(b'\xef\xbb\xbf')
            
            if orders:
                keys = orders[0].keys()
                writer = csv.DictWriter(output, fieldnames=keys)
                writer.writeheader()
                writer.writerows(orders)
            
            output.seek(0)
            filename = f"sales_report_{datetime.now().strftime('%Y%m%d')}.csv"
            
            await context.bot.send_document(
                chat_id=query.message.chat_id,
                document=output,
                filename=filename,
                caption=f"📊 Full Sales Report - {len(orders)} records"
            )
    
    except Exception as e:
        await query.message.reply_text(f"❌ Export failed: {e}")
    
    await show_export_options(query)

async def show_settings(query):
    """Show bot settings."""
    text = (
        f"⚙️ **Bot Settings**\n\n"
        f"**Configuration:**\n"
        f"🌐 Website: `{WEBSITE_URL}`\n"
        f"⏰ Check Interval: {CHECK_INTERVAL}s\n"
        f"👥 Admins: {len(ADMIN_USER_IDS) if ADMIN_USER_IDS else 'Unrestricted'}\n\n"
        f"**Features Status:**\n"
        f"{'✅' if DB_AVAILABLE else '❌'} Database Connection\n"
        f"{'✅' if ai_model else '❌'} AI Assistant (Gemini)\n"
        f"{'✅' if MONITORING_AVAILABLE else '❌'} Website Monitoring\n"
        f"{'✅' if CHARTS_AVAILABLE else '❌'} Chart Generation\n\n"
        f"**Version:** 3.1\n"
        f"**Uptime:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    
    await query.edit_message_text(text, reply_markup=get_back_button(), parse_mode='Markdown')

# ============================================================================
# AI ASSISTANT MESSAGE HANDLER
# ============================================================================

async def ai_message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle AI assistant conversations."""
    if not await check_admin(update, context):
        return
    
    user_id = update.effective_user.id
    user_text = update.message.text
    
    # Check for menu command
    if user_text.lower() == '/menu':
        conversation_mode[user_id] = False
        await start(update, context)
        return
    
    # Check if user is in AI mode
    if user_id not in conversation_mode or not conversation_mode[user_id]:
        # Not in AI mode, ignore regular messages
        return
    
    # Check if AI is available
    if not ai_model:
        await update.message.reply_text(
            "❌ AI Assistant is not configured.\n\n"
            "Please add GEMINI_API_KEY to your .env file."
        )
        return
    
    # Show typing indicator
    status_msg = await update.message.reply_text("🤖 Thinking...")
    
    try:
        # Generate AI response
        response = await ai_model.generate_content_async(
            f"You are a helpful business assistant for an e-commerce company called Nongor. "
            f"Answer this question professionally: {user_text}"
        )
        
        ai_reply = response.text
        
        # Telegram max message length
        if len(ai_reply) > 4000:
            ai_reply = ai_reply[:4000] + "\n\n...(truncated)"
        
        await context.bot.edit_message_text(
            chat_id=update.effective_chat.id,
            message_id=status_msg.message_id,
            text=f"🤖 **AI Assistant:**\n\n{ai_reply}",
            parse_mode='Markdown'
        )
    
    except Exception as e:
        logger.error(f"AI Error: {e}")
        await context.bot.edit_message_text(
            chat_id=update.effective_chat.id,
            message_id=status_msg.message_id,
            text=f"❌ AI Error: {str(e)}\n\nTry rephrasing your question."
        )

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

async def send_alert_to_admins(context: ContextTypes.DEFAULT_TYPE, message: str):
    """Send alert to all admin users."""
    for user_id in ADMIN_USER_IDS:
        try:
            await context.bot.send_message(
                chat_id=user_id,
                text=message,
                parse_mode='Markdown'
            )
            logger.info(f"Alert sent to admin {user_id}")
        except Exception as e:
            logger.error(f"Failed to notify admin {user_id}: {e}")

# ============================================================================
# MAIN APPLICATION
# ============================================================================

def main():
    """Start the bot."""
    
    # Validate configuration
    if not TELEGRAM_BOT_TOKEN:
        print("❌ ERROR: TELEGRAM_BOT_TOKEN not set!")
        print("Please set it in your .env file.")
        return
    
    # Log startup
    logger.info("=" * 60)
    logger.info("🌟 NONGOR ULTIMATE PREMIUM BOT v3.0")
    logger.info("=" * 60)
    logger.info(f"🌐 Website: {WEBSITE_URL}")
    logger.info(f"⏰ Monitor Interval: {CHECK_INTERVAL}s")
    logger.info(f"👥 Admins: {ADMIN_USER_IDS if ADMIN_USER_IDS else 'Unrestricted (⚠️ WARNING!)'}")
    logger.info(f"🗄️  Database: {'✅ Connected' if DB_AVAILABLE else '❌ Not configured'}")
    logger.info(f"🤖 AI Assistant: {'✅ Active (Gemini)' if ai_model else '❌ Not configured'}")
    logger.info(f"🌐 Monitoring: {'✅ Available' if MONITORING_AVAILABLE else '❌ Disabled'}")
    logger.info(f"📊 Charts: {'✅ Available' if CHARTS_AVAILABLE else '❌ Disabled'}")
    logger.info("=" * 60)
    
    # Post-init to start background tasks
    async def post_init(application: Application):
        if DB_AVAILABLE:
            asyncio.create_task(poll_orders_loop(application.bot))

    # Create application
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).post_init(post_init).build()
    
    # Register command handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("menu", start))
    
    # Register callback handler (for button clicks)
    app.add_handler(CallbackQueryHandler(button_handler))
    
    # Register message handler for AI chat
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, ai_message_handler))
    
    # Start the bot
    logger.info("✅ Bot started! Press Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
