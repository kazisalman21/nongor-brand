"""
Nongor Website Monitor Bot
Monitors website availability and sends alerts via Telegram.

SECURITY: All tokens/secrets loaded from environment variables.
BOT TOKEN: Must be set in TELEGRAM_BOT_TOKEN env var.
"""
import os
import time
import requests
from datetime import datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
import asyncio
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ====================
# CONFIGURATION (from environment)
# ====================
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
WEBSITE_URL = os.getenv('WEBSITE_URL', 'https://nongor-brand.vercel.app/')
CHECK_INTERVAL = int(os.getenv('MONITOR_INTERVAL_SECONDS', '300'))

# Admin user IDs (comma-separated in env)
ADMIN_USER_IDS_STR = os.getenv('ADMIN_USER_IDS', '')
ADMIN_USER_IDS = [int(uid.strip()) for uid in ADMIN_USER_IDS_STR.split(',') if uid.strip()]

# Validate required config
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required!")

if not ADMIN_USER_IDS:
    logger.warning("⚠️ ADMIN_USER_IDS not set - bot commands will be unrestricted!")

# ====================
# MONITORING STATE
# ====================
monitoring_state = {
    'enabled': False,
    'last_check': None,
    'last_status': None,  # 'up', 'down', 'degraded'
    'last_error': None,
    'downtime_count': 0,
}


def is_admin(user_id: int) -> bool:
    """Check if user is authorized admin."""
    if not ADMIN_USER_IDS:
        return True  # No restriction if not configured
    return user_id in ADMIN_USER_IDS


def admin_only(func):
    """Decorator to restrict commands to admin users."""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if not is_admin(user_id):
            await update.message.reply_text("❌ Unauthorized. Admin access required.")
            logger.warning(f"Unauthorized access attempt from user {user_id}")
            return
        return await func(update, context)
    return wrapper


class WebsiteMonitor:
    """Check website availability."""
    
    @staticmethod
    async def check_website(url: str, timeout: int = 10) -> dict:
        """Check if website is accessible."""
        try:
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
                'error': 'Timeout'
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


# ====================
# BOT COMMANDS
# ====================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command."""
    user_id = update.effective_user.id
    is_authorized = is_admin(user_id)
    
    welcome_message = f"""
🤖 **Nongor Website Monitor Bot**

Hello {update.effective_user.first_name}!

Your User ID: `{user_id}`
Status: {'✅ Authorized' if is_authorized else '❌ Not Authorized'}

**Commands:**
/status - Check website status
/monitor_on - Enable monitoring
/monitor_off - Disable monitoring
/help - Show this message
"""
    await update.message.reply_text(welcome_message, parse_mode='Markdown')


@admin_only
async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Get current website status."""
    await update.message.reply_text("🔍 Checking website status...")
    
    result = await WebsiteMonitor.check_website(WEBSITE_URL)
    
    status_icon = "✅" if result['status'] == 'up' else "⚠️" if result['status'] == 'degraded' else "❌"
    monitoring_icon = "🟢" if monitoring_state['enabled'] else "🔴"
    
    last_check_str = "Never"
    if monitoring_state['last_check']:
        last_check_str = monitoring_state['last_check'].strftime('%Y-%m-%d %H:%M:%S')
    
    status_message = f"""
{status_icon} **Website Status**

🌐 URL: `{WEBSITE_URL}`
📊 Status: **{result['status'].upper()}**
🔢 HTTP Code: {result['status_code'] or 'N/A'}
⏱️ Response Time: {result['response_time'] or 'N/A'}s

{monitoring_icon} Monitoring: {'Enabled' if monitoring_state['enabled'] else 'Disabled'}
📅 Last Check: {last_check_str}
📉 Downtimes: {monitoring_state['downtime_count']}
"""
    
    if result['error']:
        status_message += f"\n❗ Error: {result['error']}"
    
    await update.message.reply_text(status_message, parse_mode='Markdown')


@admin_only
async def monitor_on_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Enable website monitoring."""
    if monitoring_state['enabled']:
        await update.message.reply_text("✅ Monitoring is already enabled!")
        return
    
    monitoring_state['enabled'] = True
    
    # Start monitoring task
    asyncio.create_task(monitoring_loop(context))
    
    await update.message.reply_text(
        f"🚀 **Monitoring Enabled**\n\n"
        f"🌐 URL: `{WEBSITE_URL}`\n"
        f"⏰ Interval: {CHECK_INTERVAL} seconds\n\n"
        f"You'll receive alerts on status changes.",
        parse_mode='Markdown'
    )


@admin_only
async def monitor_off_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Disable website monitoring."""
    monitoring_state['enabled'] = False
    await update.message.reply_text("⏹️ Monitoring disabled.")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show help."""
    await start(update, context)


# ====================
# MONITORING LOOP
# ====================

async def monitoring_loop(context: ContextTypes.DEFAULT_TYPE):
    """Background monitoring loop with state change alerts."""
    logger.info("📡 Starting monitoring loop")
    
    while monitoring_state['enabled']:
        try:
            result = await WebsiteMonitor.check_website(WEBSITE_URL)
            monitoring_state['last_check'] = datetime.now()
            
            previous_status = monitoring_state['last_status']
            current_status = result['status']
            
            # Detect state change
            if previous_status != current_status:
                logger.info(f"Status changed: {previous_status} -> {current_status}")
                
                # DOWN alert
                if current_status == 'down':
                    monitoring_state['downtime_count'] += 1
                    await send_alert_to_admins(
                        context,
                        f"🚨 **ALERT: Website is DOWN!**\n\n"
                        f"🌐 {WEBSITE_URL}\n"
                        f"❗ Error: {result['error']}\n"
                        f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    )
                
                # RECOVERY alert
                elif previous_status == 'down' and current_status == 'up':
                    await send_alert_to_admins(
                        context,
                        f"✅ **Website RECOVERED!**\n\n"
                        f"🌐 {WEBSITE_URL}\n"
                        f"⏱️ Response: {result['response_time']}s\n"
                        f"🕐 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                    )
            
            monitoring_state['last_status'] = current_status
            monitoring_state['last_error'] = result['error']
            
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
        
        await asyncio.sleep(CHECK_INTERVAL)
    
    logger.info("📡 Monitoring loop stopped")


async def send_alert_to_admins(context: ContextTypes.DEFAULT_TYPE, message: str):
    """Send alert message to all admin users."""
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


# ====================
# MAIN
# ====================

def main():
    """Start the bot."""
    if not TELEGRAM_BOT_TOKEN:
        print("❌ ERROR: TELEGRAM_BOT_TOKEN not set!")
        print("Set it in your environment or .env file.")
        return
    
    logger.info(f"🤖 Starting bot...")
    logger.info(f"🌐 Monitoring URL: {WEBSITE_URL}")
    logger.info(f"⏰ Check interval: {CHECK_INTERVAL}s")
    logger.info(f"👤 Admin users: {ADMIN_USER_IDS or 'Not restricted'}")
    
    # Create application
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("status", status_command))
    application.add_handler(CommandHandler("monitor_on", monitor_on_command))
    application.add_handler(CommandHandler("monitor_off", monitor_off_command))
    
    # Start polling
    logger.info("✅ Bot started!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
