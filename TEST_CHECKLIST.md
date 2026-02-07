# Nongor E-commerce Test Checklist

## Security (Phase 0)
- [ ] `.env` file is NOT present in git (`git ls-files | grep "^.env$"` returns nothing)
- [ ] `node_modules/` is NOT tracked (`git ls-files | grep "^node_modules/"` returns nothing)
- [ ] `git grep -nE 'postgres(ql)?:\/\/|neon\.tech' .` returns no real secrets

## Frontend (Phase 1)
- [ ] No `ReferenceError` in browser console on page load
- [ ] No errors on Cart/Checkout flow
- [ ] No errors on Admin Dashboard

## Order Flow (Phase 2-4)
- [ ] **Buy Now Flow**: Works end-to-end
- [ ] **Cart Checkout Flow**: Works end-to-end
- [ ] **Order ID**: Format is `NG-XXXXXX` (no `#`)
- [ ] **Totals**: Server-calculated (check DB `total_price` vs expected)
- [ ] **Stock**: Deducted correctly after order
- [ ] **`order_items` table**: Populated with correct `product_id`, `qty`, `unit_price`

## Tracking (Phase 3)
- [ ] Tracking by order ID works
- [ ] Tracking by `tracking_token` works
- [ ] API returns SAFE fields only (no phone/address/email/trxId)

## Shipping (Phase 4)
- [ ] Cannot tamper `shippingFee` via client request (server uses whitelist)

## XSS (Phase 5)
- [ ] Tracking UI uses `textContent` for order data (not `innerHTML`)

## Admin (Phase 6)
- [ ] Admin Dashboard shows INACTIVE products
