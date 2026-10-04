export type Col = { id: number; type: string };

const DATE_RE = /^[1-9]\d{3}-\d{2}-\d{2}$/;
const PHONE_RE = /^[0-9+()\s-]{1,30}$/;

export function isRealDate(v: string) {
    if (!DATE_RE.test(v)) {
        return false;
    }
    const d = new Date(v + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function cleanValue(type: string, v: any): string | number | null {
    if (v === null || v === undefined || v === '') {
        return null;
    }
    if (type === 'number') {
        const n = Number(v);
        if (!Number.isFinite(n)) {
            throw new Error('Must be a number');
        }
        return n;
    }
    if (type === 'date') {
        if (!isRealDate(String(v))) {
            throw new Error('Must be a valid date (DD-MM-YYYY)');
        }
        return String(v);
    }
    if (type === 'phone') {
        if (!PHONE_RE.test(String(v))) {
            throw new Error('Phone may contain digits, + ( ) - and spaces');
        }
        return String(v);
    }
    return String(v).slice(0, 100);
}
