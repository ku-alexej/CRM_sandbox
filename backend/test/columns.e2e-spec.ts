import request from 'supertest';
import { createColumn, startApp } from './helpers';

let app: any, http: any;
beforeAll(async () => ({ app, http } = await startApp()));
afterAll(async () => app?.close());

describe('columns API', () => {
    it('creates, lists, renames, reorders and deletes columns', async () => {
        const a = await createColumn(http, 'A', 'text');
        const b = await createColumn(http, 'B', 'number');
        expect(b.position).toBeGreaterThan(a.position);

        const renamed = await request(http).patch(`/columns/${a.id}`).send({ name: 'Alpha' }).expect(200);
        expect(renamed.body.name).toBe('Alpha');

        const reordered = await request(http).patch('/columns/reorder').send({ ids: [b.id, a.id] }).expect(200);
        const ids = reordered.body.map((c: any) => c.id);
        expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));

        await request(http).delete(`/columns/${a.id}`).expect(200);
        await request(http).delete(`/columns/${b.id}`).expect(200);
        const left = (await request(http).get('/columns').expect(200)).body.map((c: any) => c.id);
        expect(left).not.toContain(a.id);
        expect(left).not.toContain(b.id);
    });

    it('validates input', async () => {
        await request(http).post('/columns').send({ name: '', type: 'text' }).expect(400);
        await request(http).post('/columns').send({ name: 'X', type: 'boolean' }).expect(400);
        await request(http).patch('/columns/999999').send({ name: 'X' }).expect(404);
        await request(http).delete('/columns/999999').expect(404);
    });

    it('keeps the order of columns after a reload of the list', async () => {
        const x = await createColumn(http, 'X', 'text');
        const y = await createColumn(http, 'Y', 'text');
        await request(http).patch('/columns/reorder').send({ ids: [y.id, x.id] }).expect(200);
        const ids = (await request(http).get('/columns').expect(200)).body.map((c: any) => c.id);
        expect(ids.indexOf(y.id)).toBeLessThan(ids.indexOf(x.id));
    });
});
