export default function Table({ columns, rows, onRename, onDelete}) {
    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th className="id-col">ID</th>
                        {columns.map((col) => (
                            <th key={col.id}>
                                <div className="th-top">
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
