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
