# Nongor E-commerce Platform

A robust, serverless e-commerce solution built for the 'Nongor' brand. This project features a vanilla JavaScript frontend and a Node.js serverless backend, designed for seamless deployment on platforms like Netlify or Vercel.

## 🚀 Features

- **Frontend**: Lightweight, high-performance vanilla HTML, CSS, and JavaScript.
- **Backend**: Node.js serverless functions handling API requests.
- **Database**: PostgreSQL integration (via Neon) for robust data management.
- **Smart Orders**: Automated order ID generation and estimated delivery dates.
- **Tracking System**: Built-in order tracking functionality.
- **Integration**: WhatsApp integration for direct order placement.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js (Serverless Functions)
- **Database**: PostgreSQL (pg)
- **Deployment**: Configured for Netlify and Vercel

## ⚙️ Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- A PostgreSQL database (e.g., [Neon](https://neon.tech/))

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/nongor-ecommerce.git
    cd nongor-ecommerce
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file or configure your deployment platform with the following variables:
    
    - `NETLIFY_DATABASE_URL`: Your PostgreSQL connection string.
    - `ADMIN_PASSWORD`: Password for admin actions (default fallback exists in code).

### Local Development

To run the project locally with Netlify Dev (recommended):

```bash
npm install -g netlify-cli
netlify dev
```

Or using the standard start script (if configured) or by simply opening `index.html` (though API functions won't work without a server environment).

## 📦 Deployment

### Netlify (Recommended)

This project is optimized for Netlify.
1. Connect your repository to Netlify.
2. Set the **Build Command** to empty (or `npm install` if needed).
3. Set the **Publish Directory** to `.`.
4. Add the `NETLIFY_DATABASE_URL` environment variable.

See [DEPLOY_INSTRUCTIONS.md](./DEPLOY_INSTRUCTIONS.md) for a detailed guide.

### Vercel

1. Import the project to Vercel.
2. Ensure the `vercel.json` configuration is used.
3. Add the `NETLIFY_DATABASE_URL` environment variable in Vercel settings.

## 🔌 API Endpoints

The backend logic resides in `api/index.js` (or `netlify/functions/api.js`).

- **GET** `/api?orderId=...`: Fetch order details.
- **POST** `/api`: Place a new order.
- **GET** `/api?action=getAllOrders`: Admin fetch all orders.
- **PUT** `/api`: Update order status (Admin/System).

## 📄 License

This project is proprietary to the Nongor brand.
