/**
 * Tests — Navigation Module
 * Tests search routing logic, navbar scroll behavior, and mobile menu handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Replicate search handling logic ---

function resolveSearchAction(query, isHomePage) {
    const q = query.trim();
    if (!q) return { action: 'none' };

    if (isHomePage) {
        return { action: 'filter', query: q };
    } else {
        return {
            action: 'redirect',
            url: `index.html?search=${encodeURIComponent(q)}#collection`
        };
    }
}

function resolveMobileNavClick(href, currentPageHasSections) {
    if (href.startsWith('#')) {
        if (currentPageHasSections) {
            return { action: 'scroll', target: href };
        } else {
            return { action: 'redirect', url: 'index.html' + href };
        }
    }
    return { action: 'navigate', url: href };
}

function computeNavbarState(scrollY, windowWidth) {
    const isMobile = windowWidth < 1024;
    const isScrolled = scrollY > 50;
    return { isScrolled, isMobile };
}

// ========== TESTS ==========

describe('Search Routing', () => {
    it('should return "none" for empty query', () => {
        expect(resolveSearchAction('', true).action).toBe('none');
    });

    it('should return "none" for whitespace-only query', () => {
        expect(resolveSearchAction('   ', true).action).toBe('none');
    });

    it('should filter on home page', () => {
        const result = resolveSearchAction('কুর্তি', true);
        expect(result.action).toBe('filter');
        expect(result.query).toBe('কুর্তি');
    });

    it('should redirect from non-home page', () => {
        const result = resolveSearchAction('kurti', false);
        expect(result.action).toBe('redirect');
        expect(result.url).toContain('index.html');
        expect(result.url).toContain('search=kurti');
        expect(result.url).toContain('#collection');
    });

    it('should URL-encode search queries with special characters', () => {
        const result = resolveSearchAction('test & query', false);
        expect(result.url).toContain(encodeURIComponent('test & query'));
    });

    it('should URL-encode Bengali search queries', () => {
        const result = resolveSearchAction('কুর্তি', false);
        expect(result.url).toContain(encodeURIComponent('কুর্তি'));
    });
});

describe('Mobile Nav Click Routing', () => {
    it('should scroll to hash on current page if section exists', () => {
        const result = resolveMobileNavClick('#collection', true);
        expect(result.action).toBe('scroll');
        expect(result.target).toBe('#collection');
    });

    it('should redirect to index with hash if section not on current page', () => {
        const result = resolveMobileNavClick('#collection', false);
        expect(result.action).toBe('redirect');
        expect(result.url).toBe('index.html#collection');
    });

    it('should navigate normally for page links', () => {
        const result = resolveMobileNavClick('about.html', true);
        expect(result.action).toBe('navigate');
        expect(result.url).toBe('about.html');
    });

    it('should navigate for track.html', () => {
        const result = resolveMobileNavClick('track.html', false);
        expect(result.action).toBe('navigate');
    });
});

describe('Navbar Scroll State', () => {
    it('should not be scrolled at top of page', () => {
        const state = computeNavbarState(0, 1200);
        expect(state.isScrolled).toBe(false);
    });

    it('should be scrolled after 50px', () => {
        const state = computeNavbarState(51, 1200);
        expect(state.isScrolled).toBe(true);
    });

    it('should detect mobile at < 1024px', () => {
        const state = computeNavbarState(0, 768);
        expect(state.isMobile).toBe(true);
    });

    it('should detect desktop at >= 1024px', () => {
        const state = computeNavbarState(0, 1024);
        expect(state.isMobile).toBe(false);
    });

    it('should be scrolled AND mobile on small scrolled screen', () => {
        const state = computeNavbarState(100, 375);
        expect(state.isScrolled).toBe(true);
        expect(state.isMobile).toBe(true);
    });

    it('should not be scrolled at exactly 50px (threshold)', () => {
        const state = computeNavbarState(50, 1200);
        expect(state.isScrolled).toBe(false);
    });
});
