# 🌟 Nongor Ultimate Premium Bot v3.0

**The complete business management bot for your e-commerce store!**

---

## ✨ Features

### 🌐 **Website Monitoring**
- Real-time uptime monitoring
- Automatic downtime alerts
- Response time tracking
- Status history

### 📦 **Order Management**
- Instant new order notifications
- Recent orders dashboard
- Order status tracking
- Export order data to CSV

### 💰 **Sales Analytics**
- Daily/weekly/monthly reports
- Revenue tracking
- Average order value
- Sales trends

### 📉 **Inventory Management**
- Low stock alerts
- Real-time inventory levels
- Stock quantity tracking

### 🤖 **AI Assistant (Powered by Google Gemini)**
- Conversational AI chat
- Business insights
- Content generation
- Email drafting
- Marketing suggestions

### 📊 **Business Dashboard**
- Real-time stats
- Today's performance
- Quick overview
- Alert summary

### 📤 **Data Export**
- Export orders to CSV
- Export sales reports
- Downloadable analytics

### 🔐 **Security**
- Multi-admin support
- User ID authentication
- Secure environment variables

---

## 🚀 Quick Start

### 1️⃣ **Prerequisites**

- Python 3.8 or higher
- Telegram account
- (Optional) Google Gemini API key
- (Optional) PostgreSQL database

### 2️⃣ **Installation**

```bash
# Clone or download the bot files
cd path/to/bot

# Install dependencies
pip install --upgrade --pre -r requirements.txt
```
*(Note for Python 3.14 users: This command ensures compatible versions are installed)*

### 3️⃣ **Configuration**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ADMIN_USER_IDS=your_user_id
   GEMINI_API_KEY=your_gemini_key (optional)
   NETLIFY_DATABASE_URL=your_db_url (optional)
   ```

3. Get your Telegram Bot Token:
   - Open Telegram and search for `@BotFather`
   - Send `/newbot`
   - Follow instructions
   - Copy the token

4. Get your User ID:
   - Run the bot (see below)
   - Send `/start` to your bot
   - Your ID will be displayed

5. (Optional) Get Gemini API Key:
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with Google
   - Create API key
   - Copy and paste in `.env`

### 4️⃣ **Run the Bot**

```bash
python bot_v2.py
```

You should see:
```
✅ Bot started! Press Ctrl+C to stop.
```

### 5️⃣ **Test It**

1. Open Telegram
2. Search for your bot name
3. Send `/start`
4. Explore the menu!

---

## 📖 Usage Guide

### **Main Menu**

After sending `/start`, you'll see the main menu with these options:

#### 📊 **Dashboard**
View today's business performance:
- Total sales
- Number of orders
- Latest order info
- Inventory alerts
- System status

#### 🌐 **Website Status**
Check your website:
- Current status (UP/DOWN)
- Response time
- HTTP status code
- Toggle monitoring on/off

#### 📦 **Orders**
View recent orders:
- Last 10 orders
- Customer names
- Order values
- Order status
- Timestamps

#### 💰 **Sales**
Sales analytics:
- Today's revenue
- Order count
- Average order value
- Quick insights

#### 📉 **Inventory**
Stock management:
- Low stock alerts
- Product quantities
- Restock reminders

#### 🤖 **AI Assistant**
Chat with AI:
- Ask business questions
- Draft emails
- Generate content
- Get suggestions
- Analyze trends

#### 📤 **Export Data**
Download reports:
- Export orders as CSV
- Sales reports
- Custom date ranges

#### ⚙️ **Settings**
View configuration:
- Current settings
- Feature status
- Admin users
- Version info

---

## 🤖 AI Assistant Guide

### **Activating AI Mode**

Click **🤖 AI Assistant** from the main menu, then type your questions!

### **Example Prompts**

**Email Drafting:**
```
Draft a promotional email for 20% off summer sale
```

**Content Creation:**
```
Write a product description for organic cotton t-shirts
```

**Business Analysis:**
```
Analyze why our sales might be dropping this month
```

**Marketing Ideas:**
```
Suggest 5 Instagram post ideas for our brand
```

**Customer Service:**
```
Draft a polite refund email for order #12345
```

### **Exiting AI Mode**

Type `/menu` to return to the main menu.

---

## 🔧 Advanced Configuration

### **Website Monitoring**

Automatically monitors your website and sends alerts:

```env
WEBSITE_URL=https://your-site.com
MONITOR_INTERVAL_SECONDS=300  # Check every 5 minutes
```

**Alerts you'll receive:**
- 🚨 Website down notifications
- ✅ Recovery notifications
- ⚠️ Slow response warnings

### **Order Alerts**

Automatically notifies you of new orders:

**Requirements:**
- Database connection configured
- `NETLIFY_DATABASE_URL` in `.env`

**You'll get alerts with:**
- Order ID
- Customer name
- Order total
- Timestamp

### **Database Setup**

If using database features:

1. Get your PostgreSQL connection string
2. Add to `.env`:
   ```env
   NETLIFY_DATABASE_URL=postgresql://user:pass@host:port/db
   ```
3. Ensure `database.py` is in the same folder
4. Restart the bot

---

## 🛠️ Troubleshooting

### **Bot won't start**

**Problem:** `TELEGRAM_BOT_TOKEN not set`
- **Solution:** Add your bot token to `.env` file

**Problem:** `Module not found`
- **Solution:** Run `pip install -r requirements.txt`

### **Unauthorized access**

**Problem:** Bot says "Access Denied"
- **Solution:** Add your User ID to `ADMIN_USER_IDS` in `.env`

### **AI not working**

**Problem:** "AI is not configured"
- **Solution:** Add `GEMINI_API_KEY` to `.env`

**Problem:** AI gives errors
- **Solution:** Check your API key is valid and has credits

### **Database features not working**

**Problem:** "Database not configured"
- **Solution:** Add `NETLIFY_DATABASE_URL` to `.env`

**Problem:** Connection errors
- **Solution:** Verify your database credentials are correct

### **Website monitoring not working**

**Problem:** "Monitoring disabled"
- **Solution:** Install requests: `pip install requests`

---

## 📁 File Structure

```
your-project/
├── bot_v2.py                    # Main bot file
├── database.py                  # Database connector
├── requirements.txt             # Python dependencies
├── .env                         # Your configuration (secret!)
├── .env.example                 # Example configuration
└── README.md                    # This file
```

---

## 🔐 Security Best Practices

1. **Never commit `.env` to Git**
   - It contains your secrets!
   - Already in `.gitignore`

2. **Keep your bot token private**
   - Don't share it
   - Don't post it online

3. **Restrict admin access**
   - Set `ADMIN_USER_IDS`
   - Only add trusted users

4. **Use environment variables in production**
   - Don't hardcode credentials
   - Use platform-specific env vars

---

## 📊 Commands Reference

| Command | Description |
|---------|-------------|
| `/start` | Open main menu |
| `/help` | Show help information |
| `/menu` | Return to menu from AI chat |

---

## 🆕 What's New in v3.0

✨ **Complete rewrite with:**
- Unified monitoring + business bot
- Enhanced AI assistant
- Beautiful interactive menus
- Export to CSV
- Real-time order alerts
- Comprehensive dashboard
- Better error handling
- Improved security

---

## 🤝 Support

For issues or feature requests:
1. Check the troubleshooting section
2. Review your `.env` configuration
3. Check the logs for errors
4. Contact your developer

---

## 📝 License

MIT License - Free to use and modify!

---

## 🎯 Roadmap

**Coming soon:**
- 📈 Advanced charts and graphs
- 📧 Email notifications
- 🌍 Multi-language support
- 📱 Mobile app integration
- 🔔 Custom alert rules
- 📊 Detailed analytics dashboard

---

**Built with ❤️ for Nongor**

*Version 3.0 - February 2026*
