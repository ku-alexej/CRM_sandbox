import { createElement } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Table from './Table.jsx';

const columns = [
    { id: 1, name: 'Name', type: 'text' },
    { id: 2, name: 'Score', type: 'number' },
    { id: 3, name: 'Born', type: 'date' },
    { id: 4, name: 'Phone', type: 'phone' },
];
const rows = [
    { id: 10, data: { 1: 'Alice', 2: 5 } },
    { id: 11, data: { 1: 'Bob' } },
];

function setup(props = {}) {
    const handlers = {
        onRename: vi.fn(), onDelete: vi.fn(),
        onReorder: vi.fn(), onSaveCell: vi.fn(), onDeleteRow: vi.fn(),
    };
    const utils = render(createElement(Table, {
        columns,
        rows,
        scrollRef: { current: null },
        sentinelRef: { current: null },
        ...handlers,
        ...props,
    }));
    return { ...utils, ...handlers, user: userEvent.setup() };
}

describe('Table rendering', () => {
    it('renders a header for each column with its type', () => {
        setup();
        for (const c of columns) expect(screen.getByText(c.name)).toBeInTheDocument();
        expect(screen.getByText('number')).toBeInTheDocument();
        expect(screen.getByText('phone')).toBeInTheDocument();
    });

    it('renders row ids and values; missing values are empty', () => {
        setup();
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getAllByRole('row')).toHaveLength(1 + rows.length); // header + body
    });

    it('shows an empty-state message when there are no rows', () => {
        setup({ rows: [] });
        expect(screen.getByText(/No contacts yet/)).toBeInTheDocument();
    });
});

describe('Cell inline editing', () => {
    const nameCell = () => screen.getByText('Alice');

    it('click turns the cell into an input with the current value', async () => {
        const { user } = setup();
        await user.click(nameCell());
        expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    });

    it('Enter saves the new value once', async () => {
        const { user, onSaveCell } = setup();
        await user.click(nameCell());
        const input = screen.getByDisplayValue('Alice');
        await user.clear(input);
        await user.type(input, 'Alicia{Enter}');
        expect(onSaveCell).toHaveBeenCalledTimes(1); // Enter + the following blur must not double-save
        expect(onSaveCell).toHaveBeenCalledWith(rows[0], columns[0], 'Alicia');
    });

    it('Enter followed by blur in the same tick still saves only once', async () => {
        // Browsers fire blur when the focused input disappears; both events can arrive before React re-renders.
        const { user, onSaveCell } = setup();
        await user.click(nameCell());
        const input = screen.getByDisplayValue('Alice');
        await user.clear(input);
        await user.type(input, 'Zed');
        act(() => {
            fireEvent.keyDown(input, { key: 'Enter' });
            fireEvent.blur(input);
        });
        expect(onSaveCell).toHaveBeenCalledTimes(1);
    });

    it('blur saves the new value', async () => {
        const { user, onSaveCell } = setup();
        await user.click(nameCell());
        const input = screen.getByDisplayValue('Alice');
        await user.clear(input);
        await user.type(input, 'Zed');
        await user.tab();
        expect(onSaveCell).toHaveBeenCalledTimes(1);
        expect(onSaveCell).toHaveBeenCalledWith(rows[0], columns[0], 'Zed');
    });

    it('Escape cancels without saving', async () => {
        const { user, onSaveCell } = setup();
        await user.click(nameCell());
        await user.type(screen.getByDisplayValue('Alice'), 'xyz{Escape}');
        expect(onSaveCell).not.toHaveBeenCalled();
        expect(screen.getByText('Alice')).toBeInTheDocument(); // back to display mode
    });

    it('does not save when the value did not change', async () => {
        const { user, onSaveCell } = setup();
        await user.click(nameCell());
        await user.keyboard('{Enter}');
        expect(onSaveCell).not.toHaveBeenCalled();
    });

    it('clearing a value saves an empty string (backend turns it into "no value")', async () => {
        const { user, onSaveCell } = setup();
        await user.click(nameCell());
        await user.clear(screen.getByDisplayValue('Alice'));
        await user.keyboard('{Enter}');
        expect(onSaveCell).toHaveBeenCalledWith(rows[0], columns[0], '');
    });

    it('uses an input type matching the column type', async () => {
        const { user } = setup();
        await user.click(screen.getByText('5'));
        expect(screen.getByDisplayValue('5')).toHaveAttribute('type', 'number');
    });

    it('empty cells can be edited too', async () => {
        const { user, onSaveCell } = setup();
        const row = screen.getAllByRole('row')[2]; // Bob
        const cells = row.querySelectorAll('.cell');
        await user.click(cells[1]); // Score is empty for Bob
        await user.type(row.querySelector('input'), '7{Enter}');
        expect(onSaveCell).toHaveBeenCalledWith(rows[1], columns[1], '7');
    });
});

describe('Row actions', () => {
    it('Delete button reports the row', async () => {
        const { user, onDeleteRow } = setup();
        const row = screen.getAllByRole('row')[1];
        await user.click(within(row).getByText('Delete'));
        expect(onDeleteRow).toHaveBeenCalledWith(rows[0]);
    });
});

describe('Date cells', () => {
    const dateRows = [{ id: 20, data: { 3: '1962-01-19' } }];

    it('shows dates as DD.MM.YYYY', () => {
        setup({ rows: dateRows });
        expect(screen.getByText('19.01.1962')).toBeInTheDocument();
    });

    it('edits in DD.MM.YYYY and saves as YYYY-MM-DD', async () => {
        const { user, onSaveCell } = setup({ rows: dateRows });
        await user.click(screen.getByText('19.01.1962'));
        const input = screen.getByDisplayValue('19.01.1962');
        await user.clear(input);
        await user.type(input, '5.2.1990{Enter}');
        expect(onSaveCell).toHaveBeenCalledWith(dateRows[0], columns[2], '1990-02-05');
    });

    it('does not save an unchanged date', async () => {
        const { user, onSaveCell } = setup({ rows: dateRows });
        await user.click(screen.getByText('19.01.1962'));
        await user.keyboard('{Enter}');
        expect(onSaveCell).not.toHaveBeenCalled();
    });
});
