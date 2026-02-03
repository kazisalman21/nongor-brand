require('dotenv').config();
const pool = require('../api/db');

async function debugUpdate() {
    try {
        console.log('🔌 Connecting to DB...');
        const client = await pool.connect();
        console.log('✅ Connected.');

        // 1. Get the most recent order
        const res = await client.query('SELECT order_id, status, delivery_status FROM orders ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length === 0) {
            console.log('❌ No orders found to test.');
            client.release();
            return;
        }

        const order = res.rows[0];
        console.log('🧐 Current State:', order);

        // 2. Determine new status
        const newStatus = order.delivery_status === 'Pending' ? 'Processing' : 'Pending';
        console.log(`🔄 Attempting update to: ${newStatus}`);

        // 3. Perform Update
        const updateRes = await client.query(
            'UPDATE orders SET delivery_status = $1, status = $2 WHERE order_id = $3 RETURNING *',
            [newStatus, newStatus, order.order_id]
        );

        console.log(`📝 Rows Affected: ${updateRes.rowCount}`);

        if (updateRes.rows.length > 0) {
            console.log('✅ Update Returned Row:', updateRes.rows[0].delivery_status);
        } else {
            console.log('❌ Update returned NO rows.');
        }

        // 4. Verify Persistence (Select again)
        const verifyRes = await client.query('SELECT order_id, status, delivery_status FROM orders WHERE order_id = $1', [order.order_id]);
        console.log('🧐 Post-Update State:', verifyRes.rows[0]);

        if (verifyRes.rows[0].delivery_status === newStatus) {
            console.log('🎉 SUCCESS: Database persistence works.');
        } else {
            console.log('💀 FAILURE: Database reverted or did not persist.');
        }

        client.release();
    } catch (e) {
        console.error('💥 Error:', e);
    } finally {
        pool.end();
    }
}

debugUpdate();
