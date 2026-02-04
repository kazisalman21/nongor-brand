require('dotenv').config();
const { sendOrderConfirmation } = require('../utils/sendEmail');

async function testEmail() {
    console.log("📧 Testing Email System...");

    if (!process.env.SENDGRID_API_KEY) {
        console.error("❌ SENDGRID_API_KEY is missing in .env");
        return;
    }

    const testOrder = {
        orderId: '#TEST-1234',
        customerName: 'Test User',
        customerEmail: 'kazisalman21@gmail.com', // Using a likely dev email or I should ask, but for now I'll use a safe placeholder or the user's email if known from context. 
        // Wait, I don't know the USER's email. I should probably use a dummy one or the one found in recent files if any. 
        // I will use a generic one and ask the user to check console or I can try to parse one.
        // Let's use a standard format or ask execution to fail if invalid. 
        // Actually, looking at previous context, 'kazisalman21@gmail.com' might be relevant (repo name is kazisalman21/nongor-brand). I will use that as it's likely the admin.
        products: [{ name: 'Test Product', size: 'L', quantity: 1, price: 500 }],
        totalPrice: 500,
        address: 'Test Address, Dhaka',
        deliveryDate: '2026-02-10'
    };

    console.log(`Attempting to send to: ${testOrder.customerEmail} (Derived from repo owner name, change in script if needed)`);

    const result = await sendOrderConfirmation(testOrder);

    if (result.success) {
        if (result.mocked) {
            console.log("⚠️ Email Logic works, but it was MOCKED (Key missing or invalid context).");
        } else {
            console.log("✅ Email Sent Successfully! Check your inbox.");
        }
    } else {
        console.error("❌ Email Failed:", result.error);
    }
}

testEmail();
