import { cleanValue } from './contacts.validate';

describe('cleanValue', () => {
    it('validates values by column type', () => {
        expect(cleanValue('number', '42')).toBe(42);
        expect(() => cleanValue('number', 'abc')).toThrow();
        expect(() => cleanValue('date', '2024-02-31')).toThrow();
        expect(cleanValue('date', '2024-02-29')).toBe('2024-02-29');
        expect(cleanValue('text', '')).toBeNull();
    });

    it('treats null, undefined and empty string as "empty" for every type', () => {
        for (const type of ['text', 'number', 'date', 'phone']) {
            expect(cleanValue(type, null)).toBeNull();
            expect(cleanValue(type, undefined)).toBeNull();
            expect(cleanValue(type, '')).toBeNull();
        }
    });

    it('keeps 0 as a valid number (it is not "empty")', () => {
        expect(cleanValue('number', 0)).toBe(0);
        expect(cleanValue('number', '0')).toBe(0);
    });

    it('accepts negative and decimal numbers, rejects Infinity and NaN', () => {
        expect(cleanValue('number', '-3.5')).toBe(-3.5);
        expect(() => cleanValue('number', 'Infinity')).toThrow('Must be a number');
        expect(() => cleanValue('number', 'NaN')).toThrow('Must be a number');
    });

    it('rejects malformed dates', () => {
        expect(() => cleanValue('date', '2024-2-1')).toThrow();
        expect(() => cleanValue('date', '01.02.2024')).toThrow();
        expect(() => cleanValue('date', '2023-02-29')).toThrow(); // not a leap year
        expect(() => cleanValue('date', '0000-01-01')).toThrow();
    });

    it('validates phone characters', () => {
        expect(cleanValue('phone', '+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
        expect(() => cleanValue('phone', '555-CALL-NOW')).toThrow();
        expect(() => cleanValue('phone', '1'.repeat(31))).toThrow();
    });

    it('truncates text to 500 characters', () => {
        expect(String(cleanValue('text', 'x'.repeat(600))).length).toBe(100);
    });
});
