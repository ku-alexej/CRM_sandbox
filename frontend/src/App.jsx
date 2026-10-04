import { useEffect, useState } from 'react';
import { api } from './api/api';
import Table from './components/Table.jsx';

const PAGE = 50;

export default function App() {
    const [columns, setColumns] = useState([]);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);

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

    return (
        <div className="app">
            <header className="toolbar">
                <h1>Contacts</h1>
                <span className="spacer" />
                <span className="count">{rows.length} of {total} loaded</span>
            </header>

            <Table columns={columns} rows={rows} />
        </div>
    );
}
