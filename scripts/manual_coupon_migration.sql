-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    expires_at TIMESTAMP,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add coupon columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Insert sample coupons (Optional)
INSERT INTO coupons (code, discount_type, discount_value, min_order_value, is_active)
VALUES 
    ('WELCOME10', 'percent', 10, 500, true),
    ('SAVE50', 'fixed', 50, 1000, true)
ON CONFLICT (code) DO NOTHING;
