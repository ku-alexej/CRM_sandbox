import { useEffect, useState, useRef} from 'react';
import { api } from './api/api';
import Table from './components/Table.jsx';

const PAGE = 50;

const safe = (fn) => async (...args) => {
    try {
        await fn(...args);
    } catch (e) {
        alert(e.message);
    }
};

export default function App() {
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [newCol, setNewCol] = useState({ name: '', type: 'text' });
    const [hasMore, setHasMore] = useState(true);

    const reqId = useRef(0);
    const busy = useRef(false);
    const scrollRef = useRef(null);
    const sentinelRef = useRef(null);

    function buildParams(offset) {
        return new URLSearchParams({ limit: PAGE, offset }).toString();
    }

    async function loadRows(reset) {
        if (busy.current && !reset) return;
        busy.current = true;
        const id = ++reqId.current;
        const offset = reset ? 0 : rows.length;
        try {
            const data = await api.get(`/contacts?${buildParams(offset)}`);
            if (id !== reqId.current) return;
            setRows((prev) => (reset ? data.items : [...prev, ...data.items]));
            setTotal(data.total);
            setHasMore(offset + data.items.length < data.total);
            if (reset && scrollRef.current) scrollRef.current.scrollTop = 0;
        } catch (e) {
            if (id === reqId.current) alert(e.message);
        } finally {
            if (id === reqId.current) busy.current = false;
        }
    }

    useEffect(() => {
        api.get('/columns').then(setColumns).catch((e) => alert(e.message));
    }, []);

    useEffect(() => {
        loadRows(true);
    }, [columns.length]);

    useEffect(() => {
        if (!hasMore || !sentinelRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => entry.isIntersecting && loadRows(false),
            { root: scrollRef.current, rootMargin: '200px' },
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [rows.length, hasMore]);

    const addColumn = safe(async () => {
        if (!newCol.name.trim()) {
            return;
        }
        const col = await api.post('/columns', newCol);
        setColumns((cs) => [...cs, col]);
        setNewCol({ name: '', type: 'text' });
    });

    const renameColumn = safe(async (col) => {
        const name = prompt('New column name', col.name);
        if (!name || !name.trim()) {
            return;
        }
        const updated = await api.patch(`/columns/${col.id}`, { name });
        setColumns((cs) => cs.map((c) => (c.id === col.id ? updated : c)));
    });

    const deleteColumn = safe(async (col) => {
        if (!confirm(`Delete column "${col.name}" and all its values?`)) {
            return;
        }
        await api.del(`/columns/${col.id}`);
        setColumns((cs) => cs.filter((c) => c.id !== col.id));
    });

    const reorderColumns = safe(async (fromId, toId) => {
        const list = [...columns];
        const from = list.findIndex((c) => c.id === fromId);
        const to = list.findIndex((c) => c.id === toId);
        list.splice(to, 0, list.splice(from, 1)[0]);
        setColumns(list);
        await api.patch('/columns/reorder', { ids: list.map((c) => c.id) });
    });

    const saveCell = safe(async (row, col, value) => {
        const updated = await api.patch(`/contacts/${row.id}`, { data: { [col.id]: value } });
        setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)));
    });

    const addContact = safe(async () => {
        await api.post('/contacts', {});
        await loadRows(true);
    });

    const deleteContact = safe(async (row) => {
        if (!confirm('Delete this contact?')) return;
        await api.del(`/contacts/${row.id}`);
        setRows((rs) => rs.filter((r) => r.id !== row.id));
        setTotal((t) => t - 1);
    });

    return (
        <div className="app">
            <header className="toolbar">
                <h1>Contacts</h1>
                <button className="primary" onClick={addContact}>Add contact</button>
                <span className="spacer" />
                <input
                    placeholder="Column name"
                    value={newCol.name}
                    onChange={(e) => setNewCol({ ...newCol, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                />
                <select value={newCol.type} onChange={(e) => setNewCol({ ...newCol, type: e.target.value })}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="phone">Phone</option>
                </select>
                <button className="primary"onClick={addColumn}>Add column</button>
                <span className="count">{rows.length} of {total} loaded</span>
            </header>

            <Table
                columns={columns}
                rows={rows}
                scrollRef={scrollRef}
                sentinelRef={sentinelRef}
                onRename={renameColumn}
                onDelete={deleteColumn}
                onReorder={reorderColumns}
                onSaveCell={saveCell}
                onDeleteRow={deleteContact}
            />
        </div>
    );
}
