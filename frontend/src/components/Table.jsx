import { useRef, useState } from 'react';

// Dates are stored as YYYY-MM-DD but always shown and typed as DD.MM.YYYY (a native date input follows the browser locale).
const INPUT_TYPE = { text: 'text', number: 'number', date: 'text', phone: 'tel' };

export const isoToDisplay = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ''));
    return m ? `${m[3]}.${m[2]}.${m[1]}` : (v ?? '');
};

export const displayToIso = (v) => {
    const m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(String(v));
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : v;
};

function Cell({ type, value, onSave }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const finished = useRef(false); // prevents saving twice (Enter + blur)

    const isDate = type === 'date';
    const shown = isDate ? isoToDisplay(value) : (value ?? '');

    function start() {
        finished.current = false;
        setDraft(shown);
        setEditing(true);
    }

    function finish(save) {
        if (finished.current) return;
        finished.current = true;
        setEditing(false);
        if (save && String(draft) !== String(shown)) onSave(isDate ? displayToIso(draft) : draft);
    }

    if (!editing) {
        return <div className="cell" onClick={start}>{shown}</div>;
    }
    return (
        <input
            className="cell-input"
            autoFocus
            type={INPUT_TYPE[type]}
            placeholder={isDate ? 'DD.MM.YYYY' : undefined}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => finish(true)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') finish(true);
                if (e.key === 'Escape') finish(false);
            }}
        />
    );
}

export default function Table({
    columns, rows, scrollRef, sentinelRef,
    onRename, onDelete, onReorder, onSaveCell, onDeleteRow,
}) {
    const dragId = useRef(null);

    return (
        <div className="table-wrap" ref={scrollRef}>
            <table>
                <thead>
                    <tr>
                        <th className="id-col">ID</th>
                        {columns.map((col) => {
                            return (
                                <th
                                    key={col.id}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => dragId.current !== null && dragId.current !== col.id && onReorder(dragId.current, col.id)}
                                >
                                    <div
                                        className="th-top"
                                        draggable
                                        onDragStart={() => (dragId.current = col.id)}
                                        onDragEnd={() => (dragId.current = null)}
                                        title="Drag to reorder"
                                    >
                                        <span className="th-name">
                                            {col.name}
                                            <span className="th-type">{col.type}</span>
                                        </span>
                                        <button className="icon" onClick={() => onRename(col)} title="Rename column">✎</button>
                                        <button className="icon" onClick={() => onDelete(col)} title="Delete column">✕</button>
                                    </div>
                                </th>
                            );
                        })}
                        <th className="actions-col" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <td className="id-col">{row.id}</td>
                            {columns.map((col) => (
                                <td key={col.id}>
                                    <Cell type={col.type} value={row.data[col.id]} onSave={(v) => onSaveCell(row, col, v)} />
                                </td>
                            ))}
                            <td className="actions-col">
                                <button className="danger" onClick={() => onDeleteRow(row)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && <p className="empty">No contacts match.</p>}
            <div ref={sentinelRef} className="sentinel" />
        </div>
    );
}
