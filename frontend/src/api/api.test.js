import { api } from './api';

function mockFetch(status, body) {
    const fn = vi.fn(async () => ({
        ok: status >= 200 && status < 300,
        status,
        statusText: 'Status text',
        text: async () => (body === undefined ? '' : JSON.stringify(body)),
    }));
    vi.stubGlobal('fetch', fn);
    return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
    it('GET returns parsed JSON and calls the right URL', async () => {
        const fetch = mockFetch(200, { items: [1] });
        await expect(api.get('/contacts?limit=1')).resolves.toEqual({ items: [1] });
        expect(fetch.mock.calls[0][0]).toMatch(/\/contacts\?limit=1$/);
        expect(fetch.mock.calls[0][1].method).toBe('GET');
    });

    it('POST / PATCH send a JSON body with the right method', async () => {
        const fetch = mockFetch(200, { ok: true });
        await api.post('/columns', { name: 'A', type: 'text' });
        await api.patch('/contacts/1', { data: { 1: 'x' } });
        expect(fetch.mock.calls[0][1].method).toBe('POST');
        expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ name: 'A', type: 'text' });
        expect(fetch.mock.calls[1][1].method).toBe('PATCH');
        expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
    });

    it('DELETE uses the DELETE method and sends no body', async () => {
        const fetch = mockFetch(200, { ok: true });
        await api.del('/contacts/1');
        expect(fetch.mock.calls[0][1].method).toBe('DELETE');
        expect(fetch.mock.calls[0][1].body).toBeUndefined();
    });

    it('throws Error with the backend message on a failed request', async () => {
        mockFetch(400, { message: 'Must be a number' });
        await expect(api.patch('/contacts/1', {})).rejects.toThrow('Must be a number');
    });

    it('falls back to statusText when the error body has no message', async () => {
        mockFetch(500, undefined);
        await expect(api.get('/x')).rejects.toThrow('Status text');
    });

    it('handles an empty successful response', async () => {
        mockFetch(200, undefined);
        await expect(api.get('/x')).resolves.toBeNull();
    });
});
