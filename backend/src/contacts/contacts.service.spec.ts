import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContactsService } from './contacts.service';

// DbService is replaced by a fake: it records SQL and returns prepared rows.
function makeService(handler: (sql: string, params?: any[]) => any) {
    const calls: { sql: string; params?: any[] }[] = [];
    const db: any = {
        query: jest.fn(async (sql: string, params?: any[]) => {
            calls.push({ sql, params });
            return handler(sql, params);
        }),
    };
    return { service: new ContactsService(db), calls };
}

const COLUMNS = {
    rows: [
        { id: 1, type: 'text' },
        { id: 2, type: 'number' },
    ],
};

describe('ContactsService', () => {
    describe('create', () => {
        it('stores validated values and drops empty ones', async () => {
            const { service, calls } = makeService((sql) => {
                if (sql.includes('FROM columns')) return COLUMNS;
                return { rows: [{ id: 7, data: {} }] };
            });
            await service.create({ data: { 1: 'John', 2: '' } });
            const insert = calls.find((c) => c.sql.startsWith('INSERT INTO contacts'));
            expect(JSON.parse(insert.params[0])).toEqual({ '1': 'John' });
        });

        it('converts numbers according to the column type', async () => {
            const { service, calls } = makeService((sql) =>
                sql.includes('FROM columns') ? COLUMNS : { rows: [{ id: 1, data: {} }] },
            );
            await service.create({ data: { 2: '42' } });
            const insert = calls.find((c) => c.sql.startsWith('INSERT INTO contacts'));
            expect(JSON.parse(insert.params[0])).toEqual({ '2': 42 });
        });

        it('creates an empty contact when no data is given', async () => {
            const { service, calls } = makeService((sql) =>
                sql.includes('FROM columns') ? COLUMNS : { rows: [{ id: 1, data: {} }] },
            );
            await service.create({});
            const insert = calls.find((c) => c.sql.startsWith('INSERT INTO contacts'));
            expect(insert.params[0]).toBe('{}');
        });

        it('rejects unknown columns with 400', async () => {
            const { service } = makeService(() => COLUMNS);
            await expect(service.create({ data: { 99: 'x' } })).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects invalid values with 400 and a readable message', async () => {
            const { service } = makeService(() => COLUMNS);
            await expect(service.create({ data: { 2: 'abc' } })).rejects.toThrow('Must be a number');
        });
    });

    describe('update', () => {
        it('merges values into the existing data', async () => {
            const { service, calls } = makeService((sql) => {
                if (sql.includes('FROM columns')) return COLUMNS;
                if (sql.startsWith('SELECT data')) return { rowCount: 1, rows: [{ data: { '1': 'Old', '2': 5 } }] };
                return { rows: [{ id: 3, data: {} }] };
            });
            await service.update('3', { data: { 1: 'New' } });
            const upd = calls.find((c) => c.sql.startsWith('UPDATE contacts'));
            expect(JSON.parse(upd.params[0])).toEqual({ '1': 'New', '2': 5 });
        });

        it('removes the key when the value is cleared', async () => {
            const { service, calls } = makeService((sql) => {
                if (sql.includes('FROM columns')) return COLUMNS;
                if (sql.startsWith('SELECT data')) return { rowCount: 1, rows: [{ data: { '1': 'Old', '2': 5 } }] };
                return { rows: [{ id: 3, data: {} }] };
            });
            await service.update('3', { data: { 1: '' } });
            const upd = calls.find((c) => c.sql.startsWith('UPDATE contacts'));
            expect(JSON.parse(upd.params[0])).toEqual({ '2': 5 });
        });

        it('throws 404 when the contact does not exist', async () => {
            const { service } = makeService((sql) =>
                sql.startsWith('SELECT data') ? { rowCount: 0, rows: [] } : COLUMNS,
            );
            await expect(service.update('1', { data: { 1: 'x' } })).rejects.toBeInstanceOf(NotFoundException);
        });

        it('does not write anything when validation fails', async () => {
            const { service, calls } = makeService((sql) => {
                if (sql.includes('FROM columns')) return COLUMNS;
                return { rowCount: 1, rows: [{ data: {} }] };
            });
            await expect(service.update('1', { data: { 2: 'abc' } })).rejects.toBeInstanceOf(BadRequestException);
            expect(calls.some((c) => c.sql.startsWith('UPDATE contacts'))).toBe(false);
        });
    });

    describe('delete', () => {
        it('deletes an existing contact', async () => {
            const { service } = makeService(() => ({ rowCount: 1 }));
            await expect(service.delete('5')).resolves.toEqual({ ok: true });
        });

        it('throws 404 when nothing was deleted', async () => {
            const { service } = makeService(() => ({ rowCount: 0 }));
            await expect(service.delete('5')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('does not pass a non-numeric id to SQL', async () => {
            const { service, calls } = makeService(() => ({ rowCount: 0 }));
            await expect(service.delete('abc')).rejects.toBeInstanceOf(NotFoundException);
            expect(calls[0].params).toEqual([0]);
        });
    });

    describe('list', () => {
        it('returns items and total from two queries', async () => {
            const { service, calls } = makeService((sql) => {
                if (sql.includes('FROM columns')) return COLUMNS;
                if (sql.startsWith('SELECT count')) return { rows: [{ n: 120 }] };
                return { rows: [{ id: 1, data: {} }, { id: 2, data: {} }] };
            });
            const res = await service.getAll({ limit: '2' });
            expect(res.total).toBe(120);
            expect(res.items).toHaveLength(2);
            expect(calls.some((c) => c.sql.startsWith('SELECT count'))).toBe(true);
        });
    });
});
