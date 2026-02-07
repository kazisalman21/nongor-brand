-- Reviews Table for Nongor E-commerce
-- Run this migration on your Neon DB

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    reviewer_name VARCHAR(100),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);

-- Example: Insert a sample review (admin test)
-- INSERT INTO reviews (product_id, reviewer_name, rating, comment, approved)
-- VALUES (1, 'সাকিব', 5, 'অসাধারণ কাপড়! দাম অনুযায়ী মান অনেক ভালো।', true);
