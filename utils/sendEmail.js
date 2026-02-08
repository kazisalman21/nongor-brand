const sgMail = require('@sendgrid/mail');

// Set API Key from Environment
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    console.warn("⚠️ SENDGRID_API_KEY is not set. Emails will not be sent.");
}

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'orders@nongor.com';

/**
 * Send Order Confirmation Email
 */
async function sendOrderConfirmation(orderData) {
    // Return early if no key
    if (!process.env.SENDGRID_API_KEY) {
        console.log("Mock Email Sent:", orderData.orderId, "to", orderData.customerEmail);
        return { success: true, mocked: true };
    }

    const { orderId, customerName, customerEmail, products, totalPrice, address, deliveryDate } = orderData;

    // Ensure we have an email
    if (!customerEmail) return { success: false, error: 'No email provided' };

    const msg = {
        to: customerEmail,
        from: SENDER_EMAIL,
        subject: `✅ Order Confirmed - ${orderId} | নোঙর`,
        html: generateOrderEmailHTML(orderData)
    };

    try {
        await sgMail.send(msg);
        console.log(`Order confirmation email sent to ${customerEmail}`);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return { success: false, error: error.message };
    }
}

/**
 * Generate HTML Template for Order Email
 */
function generateOrderEmailHTML(data) {
    const { orderId, customerName, products, totalPrice, address, deliveryDate } = data;

    // products might be a string (from frontend basic checkout) or array
    // We handle string descriptions gracefully
    let productSection = '';

    if (Array.isArray(products)) {
        productSection = products.map(p => `
            <div class="product-item" style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <strong>${p.name}</strong><br>
                ${p.sizeType === 'custom'
                ? `<span style="color: #E07A5F; font-weight: bold;">Custom Size (${p.unit}):</span><br>
                       <span style="font-size: 12px; color: #555;">
                        ${Object.entries(p.measurements || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
                       </span><br>
                       ${p.notes ? `<i style="font-size: 11px;">Note: ${p.notes}</i><br>` : ''}`
                : `<span style="color: #666;">Size: ${p.size}</span>`
            }
                <span style="color: #666;"> | Qty: ${p.quantity} | ৳${p.price}</span>
            </div>
        `).join('');
    } else {
        productSection = `
            <div class="product-item" style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <strong>${products}</strong>
            </div>
        `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #eee; }
        .header { background: #3D405B; color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 30px; }
        .order-id { background: #FEF3F2; border: 1px dashed #E07A5F; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .total { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px; font-size: 18px; font-weight: bold; text-align: right; }
        .button { display: inline-block; background: #E07A5F; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 50px; margin: 20px 0; font-weight: bold; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0; font-family: serif;">নোঙর</h1>
            <p style="margin:5px 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">The Clothing Brand</p>
        </div>
        
        <div class="content">
            <h2 style="color: #3D405B;">Order Confirmed! ✅</h2>
            <p>Hello ${customerName},</p>
            <p>আপনার অর্ডারটি সফলভাবে প্রাপ্ত হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ! ❤️</p>
            
            <div class="order-id">
                <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase;">Order ID</p>
                <strong style="color: #E07A5F; font-size: 24px;">${orderId}</strong>
            </div>
            
            <h3>📦 Order Summary:</h3>
            ${productSection}
            
            <div class="total">
                Total: ৳${totalPrice}
            </div>
            
            <h3>🚚 Delivery Info:</h3>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${address}</p>
            <p style="margin: 5px 0;"><strong>Expected Delivery:</strong> ${deliveryDate}</p>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://nongor-brand.vercel.app/index.html?track=${data.trackingToken || orderId}" class="button">
                    Track Your Order
                </a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 13px; color: #666;">
                <strong>Need Help?</strong> আমাদের সাথে যোগাযোগ করুন:<br>
                📱 <a href="https://m.me/857107060814707" style="color: #E07A5F;">Messenger</a>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>নোঙর - The Clothing Brand</strong></p>
            <p>ভালোবাসা আর ঐতিহ্যে বোনা</p>
            <p style="color: #999; margin-top: 10px;">Dhaka, Bangladesh</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Send Order Status Update Email
 */
async function sendStatusUpdateEmail(orderData, status) {
    if (!process.env.SENDGRID_API_KEY) {
        console.log(`Mock Status Email: Order ${orderData.order_id} is now ${status}`);
        return { success: true, mocked: true };
    }

    const { order_id, customer_email, customer_name, tracking_id } = orderData;
    if (!customer_email) return { success: false, error: 'No email' };

    let subject = `Order Update - ${order_id} | নোঙর`;
    let messageBody = '';
    let statusColor = '#3D405B';

    switch (status.toLowerCase()) {
        case 'processing':
            subject = `Order Processing - ${order_id}`;
            messageBody = `We have received your payment/confirmation and are processing your order.`;
            statusColor = '#3B82F6';
            break;
        case 'shipped':
            subject = `Order Shipped! 🚚 - ${order_id}`;
            messageBody = `Great news! Your order has been handed over to our courier partner.`;
            statusColor = '#8B5CF6';
            break;
        case 'delivered':
            subject = `Delivered! 🎉 - ${order_id}`;
            messageBody = `Your order has been delivered. We hope you love your new purchase!`;
            statusColor = '#10B981';
            break;
        case 'cancelled':
            subject = `Order Cancelled - ${order_id}`;
            messageBody = `Your order has been cancelled. If this was a mistake, please contact us.`;
            statusColor = '#EF4444';
            break;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #eee; }
        .header { background: #3D405B; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 50px; font-weight: bold; margin: 15px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0;">নোঙর</h1>
        </div>
        <div class="content">
            <h2>Order Status Update</h2>
            <p>Hi ${customer_name || 'Customer'},</p>
            <p>Your order <strong>${order_id}</strong> status has been updated.</p>
            
            <div style="text-align: center;">
                <span class="status-badge">${status.toUpperCase()}</span>
            </div>
            
            <p>${messageBody}</p>
            
            ${tracking_id ? `<p><strong>Tracking ID:</strong> ${tracking_id}</p>` : ''}
            
            <p>
                <a href="https://nongor-brand.vercel.app/index.html?track=${order_id}" style="color: #E07A5F; font-weight: bold;">Track Order Status</a>
            </p>
        </div>
        <div class="footer">
            <p>Nongor Brand</p>
        </div>
    </div>
</body>
</html>
    `;

    const msg = {
        to: customer_email,
        from: SENDER_EMAIL,
        subject: subject,
        html: html
    };

    try {
        await sgMail.send(msg);
        console.log(`Status email (${status}) sent to ${customer_email}`);
        return { success: true };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendOrderConfirmation, sendStatusUpdateEmail };
