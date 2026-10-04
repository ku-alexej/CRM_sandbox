import { useEffect, useState } from 'react';
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

    // Load the columns and the first page of contacts once.
    useEffect(() => {
        Promise.all([api.get('/columns'), api.get(`/contacts?limit=${PAGE}&offset=0`)])
            .then(([cols, data]) => {
                setColumns(cols);
                setRows(data.items);
                setTotal(data.total);
            })
            .catch((e) => alert(e.message));
    }, []);

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

    return (
        <div className="app">
            <header className="toolbar">
                <h1>Contacts</h1>
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
                onRename={renameColumn}
                onDelete={deleteColumn}
                onReorder={reorderColumns}
            />
        </div>
    );
}
