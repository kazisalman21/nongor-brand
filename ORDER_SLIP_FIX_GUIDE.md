# Order Slip Preview Fix Guide

## Problem Summary
The order slip preview (`admin-slip.html`) shows:
- ✗ Ship To fields display placeholder text instead of actual customer data
- ✗ Items table is completely empty
- ✗ All monetary values show ৳0
- ✓ Order metadata (Order ID, Date, Status) renders correctly

## Root Cause Analysis

### Issue 1: Database Column Name Mismatch
The frontend expects **camelCase** fields but the database likely uses **snake_case**:
- Frontend expects: `customerName`, `paymentMethod`, `shippingFee`
- Database has: `customer_name`, `payment_method`, `shipping_fee`

### Issue 2: Missing Items Join
The `getOrderDetails` API endpoint likely:
- Returns only the order row from `orders` table
- Does NOT join with `order_items` table
- Does NOT join with `products` table for product names

### Issue 3: Inconsistent Response Structure
The API might return a flat object instead of the expected structure:
```javascript
// Current (wrong):
{ order_id: "...", customer_name: "...", ... }

// Expected (correct):
{ 
  order: { orderId: "...", customerName: "...", ... },
  items: [ { productName: "...", qty: 1, ... } ]
}
```

---

## Fix Implementation

### Step 1: Fix Backend API Response

#### 1.1 Update SQL Query for Orders
Modify the `getOrderDetails` endpoint to use column aliases:

```sql
-- In your API handler (e.g., api.js, functions/api.js)
SELECT 
  order_id AS "orderId",
  created_at AS "createdAt",
  customer_name AS "customerName",
  phone,
  address,
  status,
  payment_status AS "paymentStatus",
  payment_method AS "paymentMethod",
  total_price AS "total",
  shipping_fee AS "shippingFee",
  discount_amount AS "discount",
  tracking_token AS "trackingToken"
FROM orders
WHERE order_id = $1
```

#### 1.2 Add Items Query with Product Join
```sql
SELECT 
  oi.product_id AS "productId",
  p.name AS "productName",
  oi.quantity AS "qty",
  oi.unit_price AS "unitPrice",
  oi.size_type AS "sizeType",
  oi.size_label AS "sizeLabel",
  oi.measurements,
  oi.measurement_notes AS "measurementNotes"
FROM order_items oi
LEFT JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = $1
```

#### 1.3 Structure the Response
```javascript
return res.status(200).json({
    result: 'success',
    order: order,
    items: items
});
```

---

### Step 2: Fix Frontend Rendering

#### 2.1 Update renderSlip()
In `admin-slip.html`, update `renderSlip(order, items)` to use the nested structure and camelCase keys.

#### 2.2 Add Safety Fallbacks
Use `|| 'N/A'` or `|| 0` for all rendered fields to prevent `undefined` from appearing in the UI.

---

---

## Common Pitfalls

### Pitfall 1: Order ID Mismatch
**Problem:** Order created with ID 'LG-0001' but items stored with 'NG-0001'
**Solution:** Ensure `order_items.order_id` exactly matches `orders.order_id`

### Pitfall 2: Case Sensitivity
**Problem:** Database returns `customer_name` but code expects `customerName`
**Solution:** Use SQL aliases as shown in Step 1.1.

### Pitfall 3: API Hijacking (CRITICAL)
**Problem:** Public tracking logic `if (query.orderId)` catching admin requests.
**Solution:** Use specific conditions: `if ((query.orderId || query.tracking_token) && !query.action)`.

### Pitfall 4: Null Values
**Problem:** Database has NULLs instead of empty strings
**Solution:** Use `COALESCE` in SQL:
```sql
SELECT COALESCE(customer_name, 'N/A') AS "customerName"
```

---

### Step 3: Testing Checklist
- [x] **Robustness**: Verify no "undefined" fields are shown in the slip.
- [x] **Multi-Item**: Verify slip correctly lists multiple items.
- [x] **Custom Measure**: Verify custom measurements are formatted correctly.
- [x] **QR Code**: Verify the tracking link works.
