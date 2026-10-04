const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, method = 'GET', body) {
    const res = await fetch(BASE + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
        throw new Error(json?.message || res.statusText);
    }
    return json;
}

export const api = {
    get: (path) => request(path),
};
