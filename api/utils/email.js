let resend = null;
try {
    const { Resend } = require('resend');
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
} catch (e) {
    console.warn('Resend module not found or failed to initialize. Order emails will be skipped.');
}

/**
 * Sends an HTML Order Confirmation Email to the customer via Resend.
 * @param {Object} data 
 * @param {string} data.orderId
 * @param {string} data.customerName
 * @param {string} data.customerEmail
 * @param {Array} data.products
 * @param {number|string} data.totalPrice
 * @param {string} data.address
 * @param {string} data.trackingToken
 */
async function sendOrderConfirmation(data) {
    if (!resend) {
        console.warn('RESEND IS NOT INITIALIZED. Skipping confirmation email safely without crashing.');
        return;
    }

    try {
        let productListHtml = '';
        data.products.forEach(p => {
            productListHtml += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.name || 'Product'} (Size: ${p.size || 'N/A'})</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${p.quantity}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">৳${p.price}</td>
                </tr>
            `;
        });

        const trackingUrl = `https://www.nongorr.com/track.html?token=${data.trackingToken}`;

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://www.nongorr.com/assets/logo.jpeg" alt="Nongor Logo" style="max-height: 80px; border-radius: 50%;">
                </div>
                
                <h2 style="color: #333; text-align: center;">Thank You for Your Order!</h2>
                
                <p>Hello <strong>${data.customerName}</strong>,</p>
                <p>We've received your order and are getting it ready to ship. We will notify you once it's on its way.</p>
                
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-top: 20px;">
                    <h3 style="margin-top: 0; color: #555;">Order Details (ID: ${data.orderId})</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f0f0f0;">
                                <th style="padding: 10px; text-align: left;">Item</th>
                                <th style="padding: 10px; text-align: center;">Qty</th>
                                <th style="padding: 10px; text-align: right;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productListHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
                                <td style="padding: 10px; text-align: right; font-weight: bold; color: #e94e77;">৳${data.totalPrice}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="margin-top: 25px; text-align: center;">
                    <p style="margin-bottom: 10px;">Track your delivery status in real-time:</p>
                    <a href="${trackingUrl}" style="background-color: #333; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Track Order</a>
                </div>

                <div style="margin-top: 30px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
                    <p>Shipping to: ${data.address || 'Address on file'}</p>
                    <p>If you have any questions, reply to this email or contact us at support@nongorr.com</p>
                    <p>&copy; ${new Date().getFullYear()} Nongor Brand. All rights reserved.</p>
                </div>
            </div>
        `;

        const response = await resend.emails.send({
            from: 'Nongor Orders <orders@nongorr.com>',
            to: data.customerEmail,
            subject: `Order Confirmation - Nongor (#${data.orderId})`,
            html: htmlContent,
        });

        console.log('Resend Delivery Attempted:', response);
        return { success: true, id: response.id };

    } catch (error) {
        console.error('Failed to send Resend email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendOrderConfirmation
};
