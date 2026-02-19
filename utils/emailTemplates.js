/**
 * Email Templates for Nongor
 * Genreates responsive HTML emails
 */

const generateOrderConfirmationEmail = (order) => {
    const {
        orderId,
        customerName,
        products, // Can be a string or array, we should handle both
        totalPrice,
        address,
        deliveryDate,
        trackingToken
    } = order;

    const trackingLink = `https://www.nongorr.com/?track=${trackingToken}`;

    // Parse products if string (legacy) or format array
    let productListHtml = '';
    if (typeof products === 'string') {
        productListHtml = `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${products}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${totalPrice} Tk</td>
            </tr>
        `;
    } else if (Array.isArray(products)) {
        productListHtml = products.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${item.name}</strong><br>
                    <span style="font-size: 12px; color: #777;">Size: ${item.size} x ${item.quantity}</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    ${item.price * item.quantity} Tk
                </td>
            </tr>
        `).join('');
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: #333; color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">NOÑGOR</h1>
            <p style="margin: 5px 0 0; opacity: 0.8;">Order Confirmation</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hello <strong>${customerName}</strong>,</p>
            <p style="color: #555; line-height: 1.6;">
                Thank you for your order! We have received it and are getting it ready for delivery.
            </p>

            <!-- Order Details Box -->
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 6px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Order #${orderId}</h3>
                <p style="margin: 5px 0; color: #666;">Estimate Delivery: <strong>${deliveryDate}</strong></p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    ${productListHtml}
                    <tr>
                        <td style="padding: 10px; font-weight: bold;">Total</td>
                        <td style="padding: 10px; text-align: right; font-weight: bold; color: #E65100;">${totalPrice} Tk</td>
                    </tr>
                </table>
            </div>

            <!-- Address -->
            <div style="margin-bottom: 30px;">
                <h4 style="margin-bottom: 10px; color: #333;">Delivery Address:</h4>
                <p style="margin: 0; color: #555; background: #fff; border: 1px solid #eee; padding: 15px; border-radius: 4px;">
                    ${address}
                </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${trackingLink}" style="background-color: #E65100; color: white; padding: 12px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">
                    Track Your Order
                </a>
            </div>

            <p style="color: #999; font-size: 14px; text-align: center;">
                If you have any questions, reply to this email or contact us on WhatsApp.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #eee; padding: 20px; text-align: center; font-size: 12px; color: #777;">
            &copy; 2026 Nongor Brand. All rights reserved.
        </div>
    </div>
</body>
</html>
    `;
};

const generatePasswordResetEmail = (resetLink) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; padding: 40px 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: #333; margin-bottom: 10px;">Reset Your Password</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
            You requested a password reset for your Nongor Admin account.<br>
            Click the button below to set a new password.
        </p>
        
        <a href="${resetLink}" style="background-color: #E65100; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">
            Reset Password
        </a>
        
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
            This link is valid for 15 minutes.<br>
            If you didn't request this, you can safely ignore this email.
        </p>
    </div>
</body>
</html>
    `;
};

module.exports = { generateOrderConfirmationEmail, generatePasswordResetEmail };
