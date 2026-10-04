import { DbService } from './db/db.service';

// Deterministic pseudo-random numbers: the same data on every run.
let state = 42;
const rnd = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (arr: string[]) => arr[Math.floor(rnd() * arr.length)];
const pad = (n: number) => String(n).padStart(2, '0');

const FIRST = [
    'John', 'Anna', 'Peter', 'Maria', 'Alex', 'Olga', 'David', 'Elena', 'Tom', 'Nina',
    'Michael', 'Sofia', 'James', 'Maya', 'Daniel', 'Aisha', 'Lucas', 'Grace', 'Ethan', 'Lena',
    'Noah', 'Priya', 'Leo', 'Sara', 'Mateo', 'Zoe', 'Omar', 'Iris', 'Ryan', 'Amara',
];
const LAST = [
    'Smith', 'Ivanova', 'Brown', 'Petrov', 'Miller', 'Sidorova', 'Clark', 'Kuznetsov', 'Davis', 'Orlova',
    'Wilson', 'Chen', 'Garcia', 'Patel', 'Anderson', 'Kim', 'Lopez', 'Singh', 'Taylor', 'Nakamura',
    'Martin', 'Ahmed', 'White', 'Costa', 'Thompson', 'Reed', 'Morgan', 'Bennett', 'Park', 'Fischer',
];
const COMPANIES = [
    'ACME', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark Industries', 'Wayne Corp', 'Soylent',
    'Northstar Labs', 'Brightside Health', 'Juniper Works', 'Redwood Analytics', 'Bluebird Logistics',
    'Copperline Media', 'Atlas Robotics', 'Cedar & Stone', 'Orbit Systems', 'Pioneer Foods',
    'Summit Creative', 'Evergreen Energy',
];

async function main() {
    const db = new DbService();
    await db.migrate();
    await db.query('TRUNCATE contacts, columns RESTART IDENTITY');

    const defs = [['Name', 'text'], ['Company', 'text'], ['Phone', 'phone'], ['Birth Date', 'date'], ['Score', 'number']];
    const ids: number[] = [];
    for (let i = 0; i < defs.length; i++) {
        const r = await db.query('INSERT INTO columns (name, type, position) VALUES ($1, $2, $3) RETURNING id', [defs[i][0], defs[i][1], i + 1]);
        ids.push(r.rows[0].id);
    }

    for (let i = 0; i < 500; i++) {
        const data = {
            [ids[0]]: `${pick(FIRST)} ${pick(LAST)}`,
            [ids[1]]: pick(COMPANIES),
            [ids[2]]: `+1 555 ${String(Math.floor(rnd() * 9000000) + 1000000).replace(/(\d{3})(\d{4})/, '$1-$2')}`,
            [ids[3]]: `${1960 + Math.floor(rnd() * 45)}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`,
            [ids[4]]: Math.floor(rnd() * 101),
        };
        await db.query('INSERT INTO contacts (data) VALUES ($1)', [JSON.stringify(data)]);
    }

    console.log('Seeded 5 columns and 500 contacts');
    await db.pool.end();
}
main();
