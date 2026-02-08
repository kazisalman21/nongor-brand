# Test Checklist: Nongor Premium Features

## Phase 0: Stabilize Foundations
- [ ] **Tracking**: Link (e.g. `index.html?track=TOKEN`) auto-opens modal.
- [ ] **Tracking**: Modal shows status/timeline but NO PII (phone/address).
- [ ] **Shipping**: Checkout fee updates correctly when switching zones (Inside Dhaka 70, Outside 120).
- [ ] **Admin Auth**: Changing admin password invalidates current session (requires re-login).

## Phase 1: Premium Product Pages & SEO
- [ ] **Navigation**: Click "More Details" on a product card -> Navigates to `/p/product-slug` (checks URL change).
- [ ] **Load**: URL `/p/product-slug` loads product details correctly.
- [ ] **Social Sharing**: Copy the `/p/slug` link and paste into a social debugger (or WhatsApp).
    - [ ] `og:title` should be "Product Name | নোঙর".
    - [ ] `og:image` should be the product image.
    - [ ] `og:description` should be the product description.
- [ ] **JSON-LD**: Use Google Schema Validator on `/p/slug` page to check for `Product` schema.
- [ ] **Hydration**: Page loads instantly without a visible second fetch (check network tab for single API call or preloaded data).

### Phase 2: Search / Filter / Sort
- [ ] **Search**: Type "Panjabi" in the new search bar. Results should update to show only Panjabis.
- [ ] **Category**: Click "Kurti" pill. Only Kurtis should be shown.
- [ ] **Sort**: Select "Price: Low to High". Cheapest products should appear first.
- [ ] **Filter**: Open Filter Drawer, set price range (e.g., 500-1000). Only products in range should appear.
- [ ] **Combination**: Select "Panjabi" category AND "Price: High to Low". Should show Panjabis ordered by price.
- [ ] **Clear**: Click "Clear All Filters" inside drawer. Should reset to all products, default sort.

### Phase 3: Custom Measurements
- [ ] **Modal Toggle**: Open product, click "Custom Mode". Standard sizes should hide, inputs should appear.
- [ ] **Validation**: Try "Add to Cart" with empty inputs. Toast should appear ("Please enter valid measurements").
- [ ] **Add Custom**: Enter inputs (e.g., 40, 38, 42...), add to cart.
- [ ] **Cart Display**: Open Cart. Item should show "Size: Custom".
- [ ] **Order**: Place order. Database `order_items` should contain the JSON measurements.

### Phase 4: Operations Features
- [ ] **Order Management**: Change status in Admin -> Dashboard should show update in Tracking modal.
- [ ] **Emails**: Place order -> Check admin and customer email for confirmation.
- [ ] **Status Emails**: Update status to "Shipped" -> Customer should receive status update email.

### Phase 5: Trust & Conversion
- [ ] **Coupon**: Enter valid coupon -> Total should update with discount.
- [ ] **Coupon**: Enter invalid/expired coupon -> Toast should show error.
- [ ] **Reviews**: Submit a review -> Check Admin Dashboard -> Reviews tab.
- [ ] **Reviews**: Approve review in Admin -> Verify it appears on product page.

### Phase 6: Admin Order Slips
- [ ] **Preview**: Click "Download Slip" in Admin -> Opens preview.
- [ ] **Fields**: Verify all fields (ID, Date, Ship To, Items, Totals) are populated.
- [ ] **Download PDF**: Click "Download PDF" -> Check if file is valid.
- [ ] **Download PNG**: Click "Download PNG" -> Check if image is valid for WhatsApp sharing.

### Phase 7: Order Slip Bug Fix
- [ ] **Robustness**: Verify no "undefined" fields are shown in the slip.
- [ ] **Multi-Item**: Verify slip correctly lists multiple items.
- [ ] **Custom Measure**: Verify custom measurements are formatted correctly in the items table.
- [ ] **QR Code**: Scan the QR code on the preview -> Should link to the correct tracking page.

### Phase 7b: Schema Compatibility (Legacy Database)
- [ ] verify_slip_loads_without_shipping_fee_error
    - Action: Open `admin-slip.html?orderId=...` for an existing order.
    - Expected: Slip loads successfully. No "column does not exist" popup.
- [ ] verify_shipping_fee_calculation
    - Action: Check the totals on the slip.
    - Expected: Shipping Fee = Total - (Item Price * Qty) + Discount.
- [ ] verify_legacy_item_fallback
    - Action: Open slip for an old order with no `order_items` entries.
    - Expected: Item table shows the single product from `orders` table columns.
- [ ] verify_error_display_in_ui
    - Action: Open `admin-slip.html?orderId=invalid`.
    - Expected: Error message "Order not found" displayed in the center of the page (not just alert).
