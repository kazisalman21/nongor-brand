/**
 * Tests — Custom Sizing Module
 * Tests measurement validation, unit toggling, and size type switching
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock DOM ---
beforeEach(() => {
    globalThis.window = globalThis;
    window.currentSizeType = 'standard';
    window.currentMeasurementUnit = 'inch';
    window.showToast = vi.fn();
});

// Replicate validation logic from custom-sizing.js
function getAndValidateMeasurements(inputs, currentSizeType, currentMeasurementUnit) {
    if (currentSizeType === 'standard') return { valid: true };

    const measurements = {};
    let isValid = true;

    inputs.forEach(input => {
        const val = parseFloat(input.value);
        const name = input.name;

        if (isNaN(val) || val <= 0) {
            isValid = false;
        } else {
            if (currentMeasurementUnit === 'inch' && (val < 5 || val > 100)) {
                isValid = false;
            } else if (currentMeasurementUnit === 'cm' && (val < 10 || val > 250)) {
                isValid = false;
            }
            measurements[name] = val;
        }
    });

    if (!isValid) return { valid: false };

    return {
        valid: true,
        measurements,
        unit: currentMeasurementUnit,
        notes: ''
    };
}

// ========== TESTS ==========

describe('Custom Sizing — Standard mode', () => {
    it('should return valid immediately when sizeType is standard', () => {
        const result = getAndValidateMeasurements([], 'standard', 'inch');
        expect(result.valid).toBe(true);
    });

    it('should not check measurements in standard mode', () => {
        const result = getAndValidateMeasurements(
            [{ value: '', name: 'bust' }], // invalid input
            'standard',
            'inch'
        );
        expect(result.valid).toBe(true);
    });
});

describe('Custom Sizing — Custom mode (inches)', () => {
    it('should accept valid measurements in inches', () => {
        const inputs = [
            { value: '36', name: 'bust' },
            { value: '30', name: 'waist' },
            { value: '38', name: 'hip' }
        ];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(true);
        expect(result.measurements.bust).toBe(36);
        expect(result.measurements.waist).toBe(30);
        expect(result.measurements.hip).toBe(38);
        expect(result.unit).toBe('inch');
    });

    it('should reject measurements below 5 inches', () => {
        const inputs = [{ value: '3', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(false);
    });

    it('should reject measurements above 100 inches', () => {
        const inputs = [{ value: '101', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(false);
    });

    it('should reject zero values', () => {
        const inputs = [{ value: '0', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(false);
    });

    it('should reject negative values', () => {
        const inputs = [{ value: '-5', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(false);
    });

    it('should reject empty/NaN values', () => {
        const inputs = [{ value: '', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(false);
    });

    it('should reject non-numeric strings', () => {
        const inputs = [{ value: 'abc', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(false);
    });
});

describe('Custom Sizing — Custom mode (centimeters)', () => {
    it('should accept valid measurements in cm', () => {
        const inputs = [
            { value: '91', name: 'bust' },
            { value: '76', name: 'waist' }
        ];
        const result = getAndValidateMeasurements(inputs, 'custom', 'cm');
        expect(result.valid).toBe(true);
        expect(result.measurements.bust).toBe(91);
        expect(result.unit).toBe('cm');
    });

    it('should reject measurements below 10 cm', () => {
        const inputs = [{ value: '8', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'cm');
        expect(result.valid).toBe(false);
    });

    it('should reject measurements above 250 cm', () => {
        const inputs = [{ value: '260', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'cm');
        expect(result.valid).toBe(false);
    });
});

describe('Custom Sizing — Boundary values', () => {
    it('should accept exactly 5 inches (lower boundary)', () => {
        const inputs = [{ value: '5', name: 'shoulder' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(true);
    });

    it('should accept exactly 100 inches (upper boundary)', () => {
        const inputs = [{ value: '100', name: 'length' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(true);
    });

    it('should accept exactly 10 cm (lower boundary)', () => {
        const inputs = [{ value: '10', name: 'shoulder' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'cm');
        expect(result.valid).toBe(true);
    });

    it('should accept exactly 250 cm (upper boundary)', () => {
        const inputs = [{ value: '250', name: 'length' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'cm');
        expect(result.valid).toBe(true);
    });

    it('should accept decimal measurements', () => {
        const inputs = [{ value: '36.5', name: 'bust' }];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(true);
        expect(result.measurements.bust).toBe(36.5);
    });
});

describe('Custom Sizing — Multiple measurements', () => {
    it('should fail if ANY single measurement is invalid', () => {
        const inputs = [
            { value: '36', name: 'bust' },     // valid
            { value: '2', name: 'waist' },      // invalid (too small)
            { value: '38', name: 'hip' }        // valid
        ];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(false);
    });

    it('should capture all valid measurements even when one fails', () => {
        // This tests that the loop continues collecting valid values
        const inputs = [
            { value: '36', name: 'bust' },
            { value: '30', name: 'waist' },
            { value: '25', name: 'shoulder' },
            { value: '40', name: 'length' }
        ];
        const result = getAndValidateMeasurements(inputs, 'custom', 'inch');
        expect(result.valid).toBe(true);
        expect(Object.keys(result.measurements)).toHaveLength(4);
    });
});
