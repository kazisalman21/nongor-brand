/**
 * Input Sanitization Utility
 * Prevents XSS by stripping HTML tags from strings
 */

function sanitize(input) {
    if (typeof input !== 'string') return input;
    // Remove HTML tags
    return input.replace(/<[^>]*>?/gm, '').trim();
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
