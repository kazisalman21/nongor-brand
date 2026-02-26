/**
 * Input Sanitization Utility
 * Prevents XSS by stripping HTML tags and encoding dangerous characters
 */

function sanitize(input) {
    if (typeof input !== 'string') return input;
    // Strip HTML tags then encode remaining dangerous characters
    return input
        .replace(/<[^>]*>?/gm, '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .trim();
}

function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    const cleanObj = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (typeof value === 'string') {
                cleanObj[key] = sanitize(value);
            } else if (typeof value === 'object') {
                cleanObj[key] = sanitizeObject(value);
            } else {
                cleanObj[key] = value;
            }
        }
    }
    return cleanObj;
}

module.exports = { sanitize, sanitizeObject };
