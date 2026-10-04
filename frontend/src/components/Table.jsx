import { useRef } from 'react';

export default function Table({ columns, rows, onRename, onDelete, onReorder}) {
    const dragId = useRef(null);

    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th className="id-col">ID</th>
                        {columns.map((col) => (
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
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id}>
                            <td className="id-col">{row.id}</td>
                            {columns.map((col) => (
                                <td key={col.id}>
                                    <div className="cell">{row.data[col.id] ?? ''}</div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && <p className="empty">No contacts match.</p>}
        </div>
    );
}
