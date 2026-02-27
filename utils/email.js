require('dotenv').config();
const { generateOrderConfirmationEmail, generatePasswordResetEmail } = require('./emailTemplates');

// HTML escape to prevent XSS in email templates
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let sgMail;
let isMockMode = false;
const apiKey = process.env.SENDGRID_API_KEY;

// Default Sender
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'nongorr.anika@gmail.com';

if (apiKey) {
    try {
        sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(apiKey);
        console.log('📧 Email Service: SendGrid Configured');
    } catch (e) {
        console.error('⚠️ Email Service: SendGrid package missing. Falling back to Mock Mode.');
        isMockMode = true;
    }
} else {
    isMockMode = true;
    console.warn('⚠️ Email Service: No API Key found. Running in MOCK MODE (Logs only).');
}

/**
 * Send Order Confirmation Email
 * @param {Object} order - Order details object
 */
const sendOrderConfirmation = async (order) => {
    const htmlContent = generateOrderConfirmationEmail(order);

    // Fallback for customer email (should not happen if validated)
    if (!order.customerEmail) {
        console.error('❌ Email Service: No customer email provided for order', order.orderId);
        return false;
    }

    const msg = {
        to: order.customerEmail,
        from: SENDER_EMAIL,
        subject: `Order Confirmation - ${order.orderId}`,
        text: `Thank you for your order #${order.orderId}. Track here: https://www.nongorr.com/?track=${order.trackingToken}`,
        html: htmlContent,
    };

    if (isMockMode) {
        console.log('================ [MOCK EMAIL: CONFIRMATION] ================');
        console.log(`To: ${msg.to}`);
        console.log(`From: ${msg.from}`);
        console.log(`Subject: ${msg.subject}`);
        console.log('--- Content Preview ---');
        console.log(msg.text);
        console.log('==========================================================');
        return true;
    }

    try {
        await sgMail.send(msg);
        console.log(`✅ Email sent to ${order.customerEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Email Send Error:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return false;
    }
};

/**
 * Send Order Status Update Email
 * @param {Object} orderData - { order_id, customer_email, customer_name, tracking_id }
 * @param {String} status - New status
 */
const sendStatusUpdateEmail = async (orderData, status) => {
    const { order_id, customer_email, customer_name, tracking_id } = orderData;

    if (!customer_email) {
        console.warn(`⚠️ Status Email: No email for order ${order_id}`);
        return false;
    }

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
        default:
            messageBody = `Your order status has been updated to: ${status}`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #eee; }
        .header { background: #333; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .status-badge { display: inline-block; padding: 8px 16px; background: ${statusColor}; color: white; border-radius: 50px; font-weight: bold; margin: 15px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin:0;">NOÑGOR</h1>
        </div>
        <div class="content">
            <h2>Order Status Update</h2>
            <p>Hi ${escapeHtml(customer_name) || 'Customer'},</p>
            <p>Your order <strong>${escapeHtml(order_id)}</strong> status has been updated.</p>
            
            <div style="text-align: center;">
                <span class="status-badge">${escapeHtml(status).toUpperCase()}</span>
            </div>
            
            <p>${messageBody}</p>
            
            ${tracking_id ? `<p><strong>Tracking ID:</strong> ${escapeHtml(tracking_id)}</p>` : ''}
            
            <p>
                <a href="https://www.nongorr.com/index.html?track=${encodeURIComponent(order_id)}" style="color: #E07A5F; font-weight: bold;">Track Order Status</a>
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
        html: html,
        text: `Your order ${order_id} is now ${status}. ${messageBody}`
    };

    if (isMockMode) {
        console.log('================ [MOCK EMAIL: STATUS] ================');
        console.log(`To: ${msg.to}`);
        console.log(`Subject: ${msg.subject}`);
        console.log(`Status: ${status}`);
        console.log('======================================================');
        return true;
    }

    try {
        await sgMail.send(msg);
        console.log(`✅ Status email (${status}) sent to ${customer_email}`);
        return true;
    } catch (error) {
        console.error('❌ Email error:', error);
        return false;
    }
};

/**
 * Send Password Reset Email
 * @param {String} email - Recipient email
 * @param {String} resetUrl - The full reset link
 */
const sendPasswordResetEmail = async (email, resetUrl) => {
    if (!email) return false;

    const htmlContent = generatePasswordResetEmail(resetUrl);
    const msg = {
        to: email,
        from: SENDER_EMAIL,
        subject: 'Reset Your Password - Nongor Admin',
        text: `Reset your password here: ${resetUrl}`,
        html: htmlContent
    };

    if (isMockMode) {
        console.log('================ [MOCK EMAIL: PASSWORD RESET] ================');
        console.log(`To: ${email}`);
        console.log(`Link: ${resetUrl}`);
        console.log('==============================================================');
        return true;
    }

    try {
        await sgMail.send(msg);
        console.log(`✅ Password reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Email error:', error);
        return false;
    }
};
/**
 * Send Admin Invite Email
 * @param {String} email - Invited admin's email
 * @param {String} name - Display name
 * @param {String} role - Assigned role
 * @param {String} inviterName - Who invited them
 */
const sendAdminInviteEmail = async (email, name, role, inviterName) => {
    if (!email) return false;

    const loginUrl = 'https://www.nongorr.com/admin';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f7; }
        .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #7e3af2, #9333ea); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 28px; letter-spacing: 2px; }
        .header p { margin: 0; opacity: 0.85; font-size: 14px; }
        .content { padding: 35px 30px; }
        .role-badge { display: inline-block; padding: 6px 16px; background: #f3e8ff; color: #7e3af2; border-radius: 50px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
        .btn { display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #7e3af2, #9333ea); color: white !important; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; margin: 15px 0; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>NONGOR</h1>
            <p>Admin Dashboard Invitation</p>
        </div>
        <div class="content">
            <h2 style="margin-top:0">You're Invited! 🎉</h2>
            <p>Hi <strong>${escapeHtml(name)}</strong>,</p>
            <p><strong>${escapeHtml(inviterName || 'A super admin')}</strong> has invited you to the <strong>Nongor Admin Dashboard</strong> as:</p>
            <p style="text-align:center;"><span class="role-badge">${escapeHtml(role).replace('_', ' ')}</span></p>
            
            <div class="info-box">
                <p style="margin:0"><strong>How to sign in:</strong></p>
                <p style="margin:5px 0 0 0">Click the button below and use <strong>"Continue with Google"</strong> with this email address (<code>${escapeHtml(email)}</code>).</p>
            </div>
            
            <p style="text-align:center;">
                <a href="${loginUrl}" class="btn">Sign In to Dashboard →</a>
            </p>
        </div>
        <div class="footer">
            <p>Nongor Brand &mdash; nongorr.com</p>
        </div>
    </div>
</body>
</html>
    `;

    const msg = {
        to: email,
        from: SENDER_EMAIL,
        subject: `You're Invited to Nongor Admin Dashboard`,
        text: `Hi ${name}, you've been invited as ${role} to the Nongor Admin Dashboard. Sign in at: ${loginUrl}`,
        html: html
    };

    if (isMockMode) {
        console.log('================ [MOCK EMAIL: ADMIN INVITE] ================');
        console.log(`To: ${email}`);
        console.log(`Name: ${name}`);
        console.log(`Role: ${role}`);
        console.log('=============================================================');
        return true;
    }

    try {
        await sgMail.send(msg);
        console.log(`✅ Admin invite email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Invite email error:', error);
        return false;
    }
};

module.exports = { sendOrderConfirmation, sendStatusUpdateEmail, sendPasswordResetEmail, sendAdminInviteEmail };
