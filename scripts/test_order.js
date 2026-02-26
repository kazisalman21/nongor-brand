const fetch = require('node-fetch');

async function testSubmit() {
    const payload = {
        "productId": 5, // Just an example ID
        "customerName": "Test Kazi",
        "customerEmail": "test@test.com",
        "customerPhone": "01616510027",
        "address": "Dhaka",
        "productName": "হরিদ্রা (XL) x3",
        "items": [
            {
                "id": 1, // Need a valid ID from the DB
                "name": "হরিদ্রা",
                "price": 870,
                "image": "https://i.ibb.co.com/8LFpWpCH/3.jpg",
                "size": "XL",
                "quantity": 3,
                "sizeType": "standard"
            }
        ],
        "size": "Mixed",
        "quantity": 3,
        "deliveryDate": "02/03/2026",
        "paymentMethod": "COD",
        "senderNumber": "",
        "trxId": "",
        "couponCode": "BRACU50", // Now testing with the coupon
        "shippingZone": "inside_dhaka",
        "shippingFee": 70,
        "status": "Pending"
    };

    try {
        const res = await fetch('https://nongorr.com/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const txt = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", txt);
    } catch (e) {
        console.error(e);
    }
}

testSubmit();
