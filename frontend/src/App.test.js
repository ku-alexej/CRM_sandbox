import { createElement } from 'react';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { api } from './api/api';

vi.mock('./api/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

const COLUMNS = [
    { id: 1, name: 'Name', type: 'text' },
    { id: 2, name: 'Score', type: 'number' },
];

const makeRows = (from, count) =>
    Array.from({ length: count }, (_, i) => ({ id: from + i, data: { 1: `Person ${from + i}`, 2: from + i } }));

// Fake backend: returns columns and one page of rows depending on the offset.
function mockBackend({ total = 3, pageSize = 50 } = {}) {
    api.get.mockImplementation(async (path) => {
        if (path === '/columns') return COLUMNS;
        const params = new URLSearchParams(path.split('?')[1]);
        const offset = Number(params.get('offset'));
        const count = Math.max(0, Math.min(pageSize, total - offset));
        return { items: makeRows(offset + 1, count), total };
    });
}

const contactCalls = () => api.get.mock.calls.map((c) => c[0]).filter((p) => p.startsWith('/contacts'));
const lastContactParams = () => new URLSearchParams(contactCalls().at(-1).split('?')[1]);

async function renderApp(opts) {
    mockBackend(opts);
    const user = userEvent.setup();
    render(createElement(App));
    await screen.findByText('Person 1');
    return user;
}

beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    IntersectionObserver.instances.length = 0;
});

describe('App: loading', () => {
    it('loads columns and the first page of contacts', async () => {
        await renderApp({ total: 3 });
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Person 3')).toBeInTheDocument();
        expect(screen.getByText('3 of 3 loaded')).toBeInTheDocument();
        const params = lastContactParams();
        expect(params.get('limit')).toBe('50');
        expect(params.get('offset')).toBe('0');
    });

    it('shows an alert when loading fails', async () => {
        api.get.mockRejectedValue(new Error('Network down'));
        render(createElement(App));
        await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Network down'));
    });
});

describe('App: infinite scroll', () => {
    it('loads the next page when the sentinel becomes visible', async () => {
        await renderApp({ total: 120 });
        expect(screen.getByText('50 of 120 loaded')).toBeInTheDocument();

        // The first observer was created before any row existed, so it remembers "0 rows loaded".
        // Wait until React has replaced it with one that knows about the 50 rows, then "scroll".
        await waitFor(() => expect(IntersectionObserver.instances[0].observed).toHaveLength(0));
        act(() => IntersectionObserver.instances.at(-1).trigger(true));

        await screen.findByText('Person 51');
        expect(lastContactParams().get('offset')).toBe('50');
        expect(screen.getByText('100 of 120 loaded')).toBeInTheDocument();
        expect(screen.getByText('Person 1')).toBeInTheDocument(); // old rows stay
    });

    it('does not request the same page twice while it is still loading', async () => {
        await renderApp({ total: 120 });
        await waitFor(() => expect(IntersectionObserver.instances[0].observed).toHaveLength(0));
        const observer = IntersectionObserver.instances.at(-1);
        act(() => {
            observer.trigger(true);
            observer.trigger(true); // fires again before the first response arrived
        });
        await screen.findByText('Person 51');
        expect(contactCalls().filter((p) => p.includes('offset=50'))).toHaveLength(1);
    });

    it('stops observing when everything is loaded', async () => {
        await renderApp({ total: 3 });
        // React disconnects the old observer in a passive effect, i.e. slightly after the rows are rendered.
        await waitFor(() => {
            const active = IntersectionObserver.instances.filter((o) => o.observed.length > 0);
            expect(active).toHaveLength(0);
        });
        const before = contactCalls().length;
        await new Promise((r) => setTimeout(r, 50));
        expect(contactCalls().length).toBe(before); // nothing else is requested
    });
});

describe('App: contacts', () => {
    it('Add contact posts an empty contact and reloads the list', async () => {
        api.post.mockResolvedValue({ id: 99, data: {} });
        const user = await renderApp();
        const before = contactCalls().length;
        await user.click(screen.getByText('Add contact'));
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/contacts', {}));
        await waitFor(() => expect(contactCalls().length).toBeGreaterThan(before));
    });

    it('editing a cell sends PATCH and shows the value returned by the server', async () => {
        api.patch.mockResolvedValue({ id: 1, data: { 1: 'Renamed', 2: 1 } });
        const user = await renderApp();
        await user.click(screen.getByText('Person 1'));
        const input = screen.getByDisplayValue('Person 1');
        await user.clear(input);
        await user.type(input, 'Renamed{Enter}');
        await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/contacts/1', { data: { 1: 'Renamed' } }));
        expect(await screen.findByText('Renamed')).toBeInTheDocument();
    });

    it('shows the backend validation error when saving fails', async () => {
        api.patch.mockRejectedValue(new Error('Must be a number'));
        const user = await renderApp();
        const scoreCell = screen.getByText('Person 2').closest('tr').querySelectorAll('.cell')[1];
        await user.click(scoreCell);
        await user.type(screen.getByDisplayValue('2'), '0{Enter}');
        await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Must be a number'));
    });

    it('Delete asks for confirmation, then removes the row and decrements the total', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        api.del.mockResolvedValue({ ok: true });
        const user = await renderApp({ total: 3 });
        const row = screen.getByText('Person 2').closest('tr');
        await user.click(within(row).getByText('Delete'));
        await waitFor(() => expect(api.del).toHaveBeenCalledWith('/contacts/2'));
        await waitFor(() => expect(screen.queryByText('Person 2')).not.toBeInTheDocument());
        expect(screen.getByText('2 of 2 loaded')).toBeInTheDocument();
    });

    it('does nothing when the deletion is not confirmed', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const user = await renderApp();
        await user.click(within(screen.getByText('Person 2').closest('tr')).getByText('Delete'));
        expect(api.del).not.toHaveBeenCalled();
        expect(screen.getByText('Person 2')).toBeInTheDocument();
    });
});
