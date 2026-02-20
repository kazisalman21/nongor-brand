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
 * Sends a Premium HTML Order Confirmation Email to the customer via Resend.
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
        // Build product rows
        let productRowsHtml = '';
        let itemCount = 0;
        data.products.forEach(p => {
            itemCount += (p.quantity || 1);
            productRowsHtml += `
                <tr>
                    <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <div style="color: #f0e6d3; font-weight: 600; font-size: 15px;">${p.name || 'Product'}</div>
                        <div style="color: #8a8a9a; font-size: 12px; margin-top: 3px;">Size: ${p.size || 'N/A'}</div>
                    </td>
                    <td style="padding: 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: center; color: #c0bfc8; font-size: 14px;">×${p.quantity || 1}</td>
                    <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: right; color: #d4a853; font-weight: 700; font-size: 15px;">৳${p.price}</td>
                </tr>
            `;
        });

        const trackingUrl = `https://www.nongorr.com/track.html?token=${data.trackingToken}`;
        const year = new Date().getFullYear();

        const htmlContent = `
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - Nongor</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f14; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <!-- Outer Container -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f0f14;">
        <tr>
            <td align="center" style="padding: 30px 15px;">
                <!-- Main Email Card -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1a1a24; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    
                    <!-- ═══════════ HEADER ═══════════ -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e1e2e 0%, #2a1f3d 50%, #1a1a2e 100%); padding: 40px 40px 30px; text-align: center; position: relative;">
                            <!-- Decorative Top Border -->
                            <div style="height: 3px; background: linear-gradient(90deg, transparent, #d4a853, #e8c882, #d4a853, transparent); margin-bottom: 30px; border-radius: 2px;"></div>
                            
                            <!-- Logo -->
                            <div style="margin-bottom: 20px;">
                                <img src="https://www.nongorr.com/assets/logo.jpeg" alt="নোঙর" width="80" height="80" style="border-radius: 50%; border: 3px solid rgba(212,168,83,0.4); box-shadow: 0 8px 25px rgba(212,168,83,0.2);">
                            </div>
                            
                            <!-- Brand Name -->
                            <div style="font-size: 28px; font-weight: 300; color: #f0e6d3; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 4px;">NONGOR</div>
                            <div style="font-size: 14px; color: #d4a853; letter-spacing: 4px; font-weight: 300;">নোঙর — THE CLOTHING BRAND</div>
                            
                            <!-- Decorative Divider -->
                            <div style="margin-top: 25px;">
                                <span style="color: #d4a853; font-size: 10px; letter-spacing: 3px;">✦ &nbsp; ✦ &nbsp; ✦</span>
                            </div>
                        </td>
                    </tr>

                    <!-- ═══════════ SUCCESS BADGE ═══════════ -->
                    <tr>
                        <td style="padding: 35px 40px 10px; text-align: center;">
                            <!-- Checkmark Circle -->
                            <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #2ecc71, #27ae60); margin: 0 auto 20px; line-height: 64px; font-size: 30px; color: #fff; box-shadow: 0 6px 20px rgba(46,204,113,0.3);">✓</div>
                            
                            <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #f0e6d3;">Order Confirmed!</h1>
                            <p style="margin: 0; font-size: 15px; color: #8a8a9a; line-height: 1.5;">Thank you, <strong style="color: #d4a853;">${data.customerName}</strong>. Your order has been received and is being processed.</p>
                        </td>
                    </tr>

                    <!-- ═══════════ ORDER ID BADGE ═══════════ -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background: linear-gradient(135deg, rgba(212,168,83,0.1), rgba(212,168,83,0.05)); border: 1px solid rgba(212,168,83,0.2); border-radius: 12px; padding: 16px 20px; text-align: center;">
                                        <div style="font-size: 11px; color: #8a8a9a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Order ID</div>
                                        <div style="font-size: 22px; font-weight: 700; color: #d4a853; letter-spacing: 2px;">#${data.orderId}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ═══════════ PRODUCT TABLE ═══════════ -->
                    <tr>
                        <td style="padding: 10px 40px 20px;">
                            <div style="font-size: 13px; color: #8a8a9a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);">Order Summary</div>
                            
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th style="padding: 10px 16px; text-align: left; font-size: 11px; color: #6a6a7a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.08);">Item</th>
                                        <th style="padding: 10px; text-align: center; font-size: 11px; color: #6a6a7a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.08);">Qty</th>
                                        <th style="padding: 10px 16px; text-align: right; font-size: 11px; color: #6a6a7a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.08);">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productRowsHtml}
                                </tbody>
                            </table>

                            <!-- Total Row -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 15px;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, rgba(212,168,83,0.15), rgba(212,168,83,0.05)); border-radius: 10px; padding: 18px 20px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="color: #c0bfc8; font-size: 14px; font-weight: 600;">Total (${itemCount} item${itemCount > 1 ? 's' : ''})</td>
                                                <td style="text-align: right; color: #d4a853; font-size: 24px; font-weight: 800;">৳${data.totalPrice}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ═══════════ SHIPPING INFO ═══════════ -->
                    <tr>
                        <td style="padding: 10px 40px 25px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 18px 20px;">
                                        <div style="font-size: 11px; color: #8a8a9a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">📦 Shipping To</div>
                                        <div style="font-size: 14px; color: #c0bfc8; line-height: 1.5;">${data.address || 'Address on file'}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ═══════════ TRACK BUTTON ═══════════ -->
                    <tr>
                        <td style="padding: 10px 40px 35px; text-align: center;">
                            <a href="${trackingUrl}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #d4a853, #c4943f); color: #1a1a24; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 50px; letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 8px 25px rgba(212,168,83,0.3);">
                                Track Your Order →
                            </a>
                            <p style="margin: 12px 0 0; font-size: 12px; color: #6a6a7a;">Real-time delivery tracking with live updates</p>
                        </td>
                    </tr>

                    <!-- ═══════════ TIMELINE ═══════════ -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="font-size: 13px; color: #8a8a9a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px; text-align: center;">Order Progress</div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="25%" style="text-align: center;">
                                        <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #2ecc71, #27ae60); margin: 0 auto 8px; line-height: 36px; font-size: 16px; color: #fff;">✓</div>
                                        <div style="font-size: 11px; color: #2ecc71; font-weight: 600;">Confirmed</div>
                                    </td>
                                    <td width="25%" style="text-align: center;">
                                        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); margin: 0 auto 8px; line-height: 36px; font-size: 14px; color: #6a6a7a;">2</div>
                                        <div style="font-size: 11px; color: #6a6a7a;">Processing</div>
                                    </td>
                                    <td width="25%" style="text-align: center;">
                                        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); margin: 0 auto 8px; line-height: 36px; font-size: 14px; color: #6a6a7a;">3</div>
                                        <div style="font-size: 11px; color: #6a6a7a;">Shipped</div>
                                    </td>
                                    <td width="25%" style="text-align: center;">
                                        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); margin: 0 auto 8px; line-height: 36px; font-size: 14px; color: #6a6a7a;">4</div>
                                        <div style="font-size: 11px; color: #6a6a7a;">Delivered</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ═══════════ FOOTER ═══════════ -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #141420, #1a1a2e); padding: 30px 40px; text-align: center;">
                            <!-- Decorative Line -->
                            <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212,168,83,0.3), transparent); margin-bottom: 20px;"></div>
                            
                            <!-- Social Links -->
                            <div style="margin-bottom: 15px;">
                                <a href="https://www.facebook.com/nongorclothingbd" style="display: inline-block; width: 36px; height: 36px; background: rgba(255,255,255,0.06); border-radius: 50%; line-height: 36px; text-align: center; margin: 0 5px; text-decoration: none; font-size: 16px; color: #8a8a9a;">f</a>
                                <a href="https://www.instagram.com/nongorr_" style="display: inline-block; width: 36px; height: 36px; background: rgba(255,255,255,0.06); border-radius: 50%; line-height: 36px; text-align: center; margin: 0 5px; text-decoration: none; font-size: 14px; color: #8a8a9a;">ig</a>
                                <a href="https://wa.me/message/74UB552NKNJYG1" style="display: inline-block; width: 36px; height: 36px; background: rgba(255,255,255,0.06); border-radius: 50%; line-height: 36px; text-align: center; margin: 0 5px; text-decoration: none; font-size: 14px; color: #8a8a9a;">wa</a>
                            </div>

                            <p style="margin: 0 0 6px; font-size: 13px; color: #6a6a7a;">Need help? Contact us at <a href="mailto:support@nongorr.com" style="color: #d4a853; text-decoration: none;">support@nongorr.com</a></p>
                            <p style="margin: 0 0 15px; font-size: 12px; color: #4a4a5a;">Meryl Bazla, Dhaka, Bangladesh</p>
                            
                            <!-- Decorative Bottom -->
                            <div style="margin-top: 15px;">
                                <span style="color: rgba(212,168,83,0.4); font-size: 9px; letter-spacing: 3px;">✦ &nbsp; ✦ &nbsp; ✦</span>
                            </div>
                            <p style="margin: 10px 0 0; font-size: 11px; color: #3a3a4a;">&copy; ${year} Nongor Brand. ভালোবাসা আর ঐতিহ্যে বোনা</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;

        const response = await resend.emails.send({
            from: 'Nongor Orders <orders@nongorr.com>',
            to: data.customerEmail,
            subject: `✨ Order Confirmed — Nongor (#${data.orderId})`,
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
