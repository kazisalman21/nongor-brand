/**
 * Resend Inbound Email Webhook Handler
 * Receives incoming emails to support@nongorr.com and forwards them to Gmail.
 */
let resend = null;
try {
    const { Resend } = require('resend');
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
} catch (e) {
    console.warn('Resend SDK not available for webhook handler.');
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const payload = req.body;

        // Resend sends inbound email data as JSON
        const fromEmail = payload.from || 'Unknown sender';
        const toEmail = payload.to || 'support@nongorr.com';
        const subject = payload.subject || '(No subject)';
        const textBody = payload.text || '';
        const htmlBody = payload.html || '';
        const date = new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' });

        console.log(`📧 Inbound email from: ${fromEmail} | Subject: ${subject}`);

        if (!resend) {
            console.error('Cannot forward email — Resend not initialized');
            return res.status(200).json({ received: true, forwarded: false });
        }

        // Forward the email to your personal Gmail
        const forwardResult = await resend.emails.send({
            from: 'Nongor Support <support@nongorr.com>',
            to: 'nongorr.anika@gmail.com',
            subject: `📩 FWD: ${subject}`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #f0f0f0; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d4a853;">
                        <h3 style="margin: 0 0 10px; color: #333;">📩 Forwarded Email — Nongor Support</h3>
                        <p style="margin: 4px 0; color: #555;"><strong>From:</strong> ${fromEmail}</p>
                        <p style="margin: 4px 0; color: #555;"><strong>To:</strong> ${toEmail}</p>
                        <p style="margin: 4px 0; color: #555;"><strong>Subject:</strong> ${subject}</p>
                        <p style="margin: 4px 0; color: #555;"><strong>Received:</strong> ${date}</p>
                    </div>
                    <div style="padding: 15px 0; border-top: 1px solid #ddd;">
                        ${htmlBody || `<pre style="white-space: pre-wrap; font-family: inherit;">${textBody}</pre>`}
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 11px; color: #999; text-align: center;">
                        This email was sent to support@nongorr.com and auto-forwarded by Nongor's email system.
                    </p>
                </div>
            `,
        });

        console.log('✅ Forwarded to Gmail:', forwardResult);
        return res.status(200).json({ received: true, forwarded: true });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        // Always return 200 to Resend so it doesn't retry endlessly
        return res.status(200).json({ received: true, error: error.message });
    }
};
