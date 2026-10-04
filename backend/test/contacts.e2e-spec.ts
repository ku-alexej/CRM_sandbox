import request from 'supertest';
import { createColumn, createContact, listContacts, startApp } from './helpers';

let app: any, http: any;
beforeAll(async () => ({ app, http } = await startApp()));
afterAll(async () => app?.close());

describe('contacts API', () => {
    it('create -> update -> clear a value -> delete', async () => {
        const name = await createColumn(http, 'Name', 'text');
        const score = await createColumn(http, 'Score', 'number');

        const c = await createContact(http, { [name.id]: 'John', [score.id]: '10' });
        expect(c.data).toEqual({ [name.id]: 'John', [score.id]: 10 });

        const upd = await request(http).patch(`/contacts/${c.id}`).send({ data: { [name.id]: 'Johnny' } }).expect(200);
        expect(upd.body.data[name.id]).toBe('Johnny');
        expect(upd.body.data[score.id]).toBe(10);

        const cleared = await request(http).patch(`/contacts/${c.id}`).send({ data: { [score.id]: '' } }).expect(200);
        expect(cleared.body.data[score.id]).toBeUndefined();

        await request(http).delete(`/contacts/${c.id}`).expect(200);
        await request(http).delete(`/contacts/${c.id}`).expect(404);
    });

    it('persists data: a contact is returned by the list after it was created', async () => {
        const col = await createColumn(http, 'Note', 'text');
        const c = await createContact(http, { [col.id]: 'hello' });
        const found = (await listContacts(http, '?limit=200')).items.find((x: any) => x.id === c.id);
        expect(found.data[col.id]).toBe('hello');
    });

    it('rejects values of the wrong type and unknown columns', async () => {
        const num = await createColumn(http, 'N', 'number');
        const date = await createColumn(http, 'D', 'date');
        await request(http).post('/contacts').send({ data: { [num.id]: 'abc' } }).expect(400);
        await request(http).post('/contacts').send({ data: { [date.id]: '2024-02-31' } }).expect(400);
        await request(http).post('/contacts').send({ data: { 999999: 'x' } }).expect(400);
        await request(http).patch('/contacts/999999').send({ data: {} }).expect(404);
    });

    it('new contacts come first by default (id DESC)', async () => {
        const a = await createContact(http, {});
        const b = await createContact(http, {});
        const ids = (await listContacts(http, '?limit=200')).items.map((x: any) => x.id);
        expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
    });

    it('deleting a column removes its values from every contact', async () => {
        const col = await createColumn(http, 'Temp', 'text');
        const keep = await createColumn(http, 'Keep', 'text');
        const c = await createContact(http, { [col.id]: 'secret', [keep.id]: 'stay' });
        await request(http).delete(`/columns/${col.id}`).expect(200);
        const found = (await listContacts(http, '?limit=200')).items.find((x: any) => x.id === c.id);
        expect(found.data).toEqual({ [keep.id]: 'stay' });
    });
});
