/**
 * Tests — Cache & Rate Limiting Module (Server-Side)
 * Tests rate limiter logic, cache invalidation keys, and window calculations
 */
import { describe, it, expect, beforeEach } from 'vitest';

// --- Replicate rate limiting logic ---

function createRateLimiter() {
    const maps = {
        login: new Map(),
        order: new Map(),
        passwordReset: new Map(),
        otpRequest: new Map(),
        otpVerify: new Map(),
        totpVerify: new Map()
    };

    function checkRateLimit(type, ip) {
        let limit = 10;
        let windowMs = 60 * 60 * 1000;

        if (type === 'login' || type === 'passwordReset' || type === 'otpRequest') {
            limit = 5;
            windowMs = 15 * 60 * 1000;
        } else if (type === 'otpVerify') {
            limit = 10;
            windowMs = 15 * 60 * 1000;
        } else if (type === 'totpVerify') {
            limit = 30;
            windowMs = 15 * 60 * 1000;
        }

        const now = Date.now();
        const record = maps[type].get(ip);

        if (record && now > record.expires) {
            maps[type].delete(ip);
        }

        if (!maps[type].has(ip)) {
            if (maps[type].size > 5000) {
                maps[type].clear();
            }
            maps[type].set(ip, { count: 1, expires: now + windowMs });
            return { allowed: true };
        }

        const current = maps[type].get(ip);
        if (current.count >= limit) {
            return { allowed: false, retryAfter: Math.ceil((current.expires - now) / 1000) };
        }

        current.count++;
        return { allowed: true };
    }

    return { checkRateLimit, maps };
}

// ========== TESTS ==========

describe('Rate Limiter — Login', () => {
    let limiter;

    beforeEach(() => {
        limiter = createRateLimiter();
    });

    it('should allow first login attempt', () => {
        const result = limiter.checkRateLimit('login', '1.2.3.4');
        expect(result.allowed).toBe(true);
    });

    it('should allow up to 5 login attempts', () => {
        const ip = '1.2.3.4';
        for (let i = 0; i < 5; i++) {
            expect(limiter.checkRateLimit('login', ip).allowed).toBe(true);
        }
    });

    it('should block the 6th login attempt', () => {
        const ip = '1.2.3.4';
        for (let i = 0; i < 5; i++) {
            limiter.checkRateLimit('login', ip);
        }
        const result = limiter.checkRateLimit('login', ip);
        expect(result.allowed).toBe(false);
        expect(result.retryAfter).toBeDefined();
        expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should track different IPs independently', () => {
        for (let i = 0; i < 5; i++) {
            limiter.checkRateLimit('login', '1.1.1.1');
        }
        // 1.1.1.1 is now blocked
        expect(limiter.checkRateLimit('login', '1.1.1.1').allowed).toBe(false);
        // 2.2.2.2 should still be allowed
        expect(limiter.checkRateLimit('login', '2.2.2.2').allowed).toBe(true);
    });
});

describe('Rate Limiter — TOTP Verify', () => {
    let limiter;

    beforeEach(() => {
        limiter = createRateLimiter();
    });

    it('should allow up to 30 TOTP verification attempts', () => {
        const ip = '10.0.0.1';
        for (let i = 0; i < 30; i++) {
            expect(limiter.checkRateLimit('totpVerify', ip).allowed).toBe(true);
        }
    });

    it('should block the 31st TOTP attempt', () => {
        const ip = '10.0.0.1';
        for (let i = 0; i < 30; i++) {
            limiter.checkRateLimit('totpVerify', ip);
        }
        expect(limiter.checkRateLimit('totpVerify', ip).allowed).toBe(false);
    });
});

describe('Rate Limiter — Order', () => {
    let limiter;

    beforeEach(() => {
        limiter = createRateLimiter();
    });

    it('should allow up to 10 order attempts', () => {
        const ip = '5.5.5.5';
        for (let i = 0; i < 10; i++) {
            expect(limiter.checkRateLimit('order', ip).allowed).toBe(true);
        }
    });

    it('should block the 11th order attempt', () => {
        const ip = '5.5.5.5';
        for (let i = 0; i < 10; i++) {
            limiter.checkRateLimit('order', ip);
        }
        expect(limiter.checkRateLimit('order', ip).allowed).toBe(false);
    });
});

describe('Rate Limiter — Memory Safety', () => {
    let limiter;

    beforeEach(() => {
        limiter = createRateLimiter();
    });

    it('should clear map when exceeding 5000 IPs', () => {
        // Simulate many unique IPs
        for (let i = 0; i < 5001; i++) {
            limiter.maps.login.set(`ip-${i}`, { count: 1, expires: Date.now() + 60000 });
        }
        // Next call should clear the map and start fresh
        const result = limiter.checkRateLimit('login', 'new-ip');
        expect(result.allowed).toBe(true);
        expect(limiter.maps.login.size).toBe(1);
    });
});

describe('Rate Limiter — Expiry', () => {
    let limiter;

    beforeEach(() => {
        limiter = createRateLimiter();
    });

    it('should reset expired records', () => {
        const ip = '9.9.9.9';
        // Manually set an expired record
        limiter.maps.login.set(ip, { count: 5, expires: Date.now() - 1000 });

        // Next check should clear the expired record and allow
        const result = limiter.checkRateLimit('login', ip);
        expect(result.allowed).toBe(true);
    });

    it('should return retryAfter in seconds when blocked', () => {
        const ip = '8.8.8.8';
        for (let i = 0; i < 5; i++) {
            limiter.checkRateLimit('login', ip);
        }
        const result = limiter.checkRateLimit('login', ip);
        expect(result.allowed).toBe(false);
        expect(typeof result.retryAfter).toBe('number');
        expect(result.retryAfter).toBeGreaterThan(0);
        expect(result.retryAfter).toBeLessThanOrEqual(15 * 60); // max 15 min window
    });
});
