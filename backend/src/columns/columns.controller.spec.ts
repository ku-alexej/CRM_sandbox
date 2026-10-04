import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ColumnsController } from './columns.controller';

function makeController(handler: (sql: string, params?: any[]) => any = () => ({ rows: [], rowCount: 0 })) {
    const calls: { sql: string; params?: any[] }[] = [];
    const db: any = {
        query: jest.fn(async (sql: string, params?: any[]) => {
            calls.push({ sql, params });
            return handler(sql, params);
        }),
    };
    return { controller: new ColumnsController(db), calls };
}

describe('ColumnsController', () => {
    describe('createColumn', () => {
        it('trims the name and inserts the column', async () => {
            const { controller, calls } = makeController(() => ({ rows: [{ id: 1, name: 'Email', type: 'text', position: 1 }] }));
            await controller.createColumn({ name: '  Email  ', type: 'text' });
            expect(calls[0].params).toEqual(['Email', 'text']);
        });

        it('requires a non-empty name', async () => {
            const { controller } = makeController();
            await expect(controller.createColumn({ name: '   ', type: 'text' })).rejects.toBeInstanceOf(BadRequestException);
            await expect(controller.createColumn({ type: 'text' })).rejects.toBeInstanceOf(BadRequestException);
        });

        it('accepts only known types', async () => {
            const { controller } = makeController(() => ({ rows: [{}] }));
            await expect(controller.createColumn({ name: 'X', type: 'boolean' })).rejects.toBeInstanceOf(BadRequestException);
            for (const type of ['text', 'number', 'date', 'phone']) {
                await expect(controller.createColumn({ name: 'X', type })).resolves.toBeDefined();
            }
        });
    });

    describe('updateColumn', () => {
        it('updates an existing column', async () => {
            const { controller } = makeController(() => ({ rowCount: 1, rows: [{ id: 1, name: 'New' }] }));
            await expect(controller.updateColumn('1', { name: 'New' })).resolves.toEqual({ id: 1, name: 'New' });
        });

        it('throws 404 for an unknown column', async () => {
            const { controller } = makeController(() => ({ rowCount: 0, rows: [] }));
            await expect(controller.updateColumn('1', { name: 'New' })).rejects.toBeInstanceOf(NotFoundException);
        });

        it('rejects an empty name', async () => {
            const { controller } = makeController();
            await expect(controller.updateColumn('1', { name: ' ' })).rejects.toBeInstanceOf(BadRequestException);
        });
    });

    describe('deleteColumn', () => {
        it('deletes the column and strips its values from contacts', async () => {
            const { controller, calls } = makeController(() => ({ rowCount: 1, rows: [] }));
            await controller.deleteColumn('4');
            expect(calls[0].sql).toContain('DELETE FROM columns');
            expect(calls[1].sql).toContain('data - $1::text');
            expect(calls[1].params).toEqual(['4']);
        });

        it('throws 404 and leaves contacts untouched for an unknown column', async () => {
            const { controller, calls } = makeController(() => ({ rowCount: 0, rows: [] }));
            await expect(controller.deleteColumn('4')).rejects.toBeInstanceOf(NotFoundException);
            expect(calls).toHaveLength(1);
        });
    });

    describe('reorderColumn', () => {
        it('writes positions 1..n in the given order', async () => {
            const { controller, calls } = makeController(() => ({ rows: [] }));
            await controller.reorderColumn({ ids: [3, 1, 2] });
            const updates = calls.filter((c) => c.sql.startsWith('UPDATE columns'));
            expect(updates.map((u) => u.params)).toEqual([[1, 3], [2, 1], [3, 2]]);
        });

        it('requires ids to be an array', async () => {
            const { controller } = makeController();
            await expect(controller.reorderColumn({ ids: 'x' })).rejects.toBeInstanceOf(BadRequestException);
            await expect(controller.reorderColumn({})).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
