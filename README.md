<div align="center">

# নোঙর (Nongor)

### Premium Bangladeshi Clothing Brand

**ভালোবাসা আর ঐতিহ্যে বোনা** — *Woven with Love and Heritage*

[![Live Site](https://img.shields.io/badge/🌐_Live_Site-nongor.vercel.app-E07A5F?style=for-the-badge)](https://nongor-brand.vercel.app)
[![Admin Panel](https://img.shields.io/badge/🔐_Admin-Dashboard-3D405B?style=for-the-badge)](https://nongor-brand.vercel.app/admin.html)

---

</div>

## ✨ Overview

**Nongor** is a premium e-commerce platform for a Bangladeshi clothing brand specializing in handcrafted heritage fashion. Built with modern web technologies, it delivers a luxurious shopping experience with smooth animations, optimized performance, and seamless order management.

---

## 🎯 Features

### 🛍️ Customer Experience
| Feature | Description |
|---------|-------------|
| **Multi-Image Gallery** | Product modal with thumbnail navigation and image zoom |
| **Smooth Animations** | Premium scale-in, fade-in-up, and cross-fade effects |
| **Lazy Loading** | Optimized image loading for fast page performance |
| **Order Tracking** | Real-time order status updates via tracking modal |
| **WhatsApp Integration** | Direct order placement via Messenger/WhatsApp |
| **Responsive Design** | Fully optimized for mobile, tablet, and desktop |

### 🔐 Admin Dashboard
| Feature | Description |
|---------|-------------|
| **Secure Login** | Password-protected admin access |
| **Product Management** | Add, edit, delete products with multi-image upload |
| **Order Management** | View, update status, and manage all orders |
| **Cloudinary Integration** | Cloud-based image hosting and optimization |
| **Real-time Stats** | Dashboard overview with order/product counts |

### ⚡ Performance
- **Preloaded Hero Image** — Instant above-the-fold rendering
- **GPU-Accelerated Animations** — Smooth 60fps transitions
- **Throttled Scroll Events** — No jank during scrolling
- **Minified CSS Build** — Tailwind CLI production build

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | HTML5, Vanilla JavaScript (ES6+), Tailwind CSS |
| **Backend** | Node.js Serverless Functions |
| **Database** | PostgreSQL (Neon) |
| **Image Hosting** | Cloudinary |
| **Deployment** | Vercel |
| **Fonts** | Google Fonts (Noto Serif Bengali, Playfair Display) |

---

## 📁 Project Structure

```
nongor-ecommerce/
├── 📄 index.html          # Main storefront
├── 📄 admin.html          # Admin dashboard
├── 📄 checkout.html       # Checkout page
├── 📄 about.html          # Brand story
├── 📄 terms.html          # Terms & conditions
├── 📄 return-policy.html  # Return policy
├── 📄 404.html            # Error page
├── 📜 script.js           # Main JavaScript logic
│
├── 📁 api/
│   └── index.js           # Serverless API (Vercel)
│
├── 📁 assets/
│   ├── logo.jpeg          # Brand logo
│   ├── hero-bg.jpg        # Hero background
│   └── styles.css         # Compiled Tailwind CSS
│
├── 📁 src/
│   └── input.css          # Tailwind source with utilities
│
├── ⚙️ tailwind.config.js  # Tailwind configuration
├── ⚙️ vercel.json         # Vercel deployment config
├── ⚙️ package.json        # Dependencies & scripts
└── 📖 README.md           # This file
```

---

## ⚙️ Setup & Installation

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **PostgreSQL** database ([Neon](https://neon.tech/) recommended)
- **Cloudinary** account ([Sign up](https://cloudinary.com/))

### 1. Clone Repository

```bash
git clone https://github.com/your-username/nongor-ecommerce.git
cd nongor-ecommerce
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create environment variables on your deployment platform:

| Variable | Description |
|----------|-------------|
| `NETLIFY_DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Admin dashboard password |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned preset |

### 4. Build CSS

```bash
npm run build        # Production build (minified)
npm run watch:css    # Development watch mode
```

### 5. Local Development

Open `index.html` in a browser, or use a local server:

```bash
npx serve .
```

> ⚠️ API functions require Vercel/Netlify environment for full functionality.

---

## � Deployment

### Vercel (Recommended)

1. **Import** repository to [Vercel](https://vercel.com)
2. **Build Command**: `npm run build`
3. **Output Directory**: `.`
4. **Add Environment Variables** in Vercel Settings
5. **Deploy** — Site goes live automatically

### Configuration Files

**vercel.json**
```json
{
  "version": 2,
  "outputDirectory": ".",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" }
  ]
}
```

---

## 🔌 API Endpoints

Base URL: `/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api?action=getProducts` | Fetch all products |
| `GET` | `/api?orderId=XXX` | Track specific order |
| `GET` | `/api?action=getAllOrders` | Admin: Get all orders |
| `POST` | `/api` | Create new order |
| `PUT` | `/api` | Update order status |
| `DELETE` | `/api?productId=XXX` | Delete product |

---

## 🎨 Design System

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| 🟠 Terracotta | `#E07A5F` | Primary accent, CTAs |
| 🟡 Sand | `#F2CC8F` | Secondary highlights |
| 🔵 Deep | `#3D405B` | Text, dark elements |
| ⚪ Light | `#F4F1DE` | Backgrounds |

### Animations

| Class | Effect |
|-------|--------|
| `animate-scale-in` | Modal entrance |
| `animate-fade-in-up` | Card cascade |
| `animate-bounce-in` | Playful pop |
| `animate-gentle-pulse` | Subtle attention |

---

## 📱 Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero + Product collection |
| Admin | `/admin.html` | Dashboard & management |
| Checkout | `/checkout.html` | Order form |
| About | `/about.html` | Brand story |
| Terms | `/terms.html` | Terms & conditions |
| Return Policy | `/return-policy.html` | Return guidelines |

---

## 🔧 Scripts

```bash
npm run build       # Build production CSS
npm run build:css   # Compile Tailwind CSS
npm run watch:css   # Watch mode for development
```

---

## 📄 License

© 2025 **Nongor Brand**. All rights reserved.

This project is proprietary software. Unauthorized copying, modification, or distribution is prohibited.

---

<div align="center">

**Made with ❤️ in Bangladesh**

*ভালোবাসা আর ঐতিহ্যে বোনা*

</div>
