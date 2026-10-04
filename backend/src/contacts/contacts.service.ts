import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { cleanValue, Col } from './contacts.validate';

@Injectable()
export class ContactsService {
    constructor(private db: DbService) {}

    private async getColumns(): Promise<Col[]> {
        return (await this.db.query('SELECT id, type FROM columns')).rows;
    }

    private async clean(input: Record<string, any>) {
        const cols = await this.getColumns();
        const out: Record<string, any> = {};
        for (const [id, v] of Object.entries(input || {})) {
            const col = cols.find((c) => String(c.id) === id);
            if (!col) {
                throw new BadRequestException(`Unknown column ${id}`);
            }
            try {
                out[id] = cleanValue(col.type, v);
            } catch (e) {
                throw new BadRequestException(e.message);
            }
        }
        return out;
    }

    async getAll(q: any) {
        const limit = Math.min(Math.max(parseInt(q.limit) || 50, 1), 200);
        const offset = Math.max(parseInt(q.offset) || 0, 0);
        const [count, list] = await Promise.all([
            this.db.query(
                `SELECT count(*)::int AS n FROM contacts`
            ),
            this.db.query(
                `SELECT id, data FROM contacts ORDER BY id DESC LIMIT $1 OFFSET $2`,
                [limit, offset]
            ),
        ]);
        return { items: list.rows, total: count.rows[0].n };
    }

    async create(body: any) {
        const values = await this.clean(body?.data);
        const data: Record<string, any> = {};
        for (const [k, v] of Object.entries(values)) if (v !== null) data[k] = v;
        const r = await this.db.query(
            `INSERT INTO contacts (data) VALUES ($1) RETURNING id, data`,
            [JSON.stringify(data)]
        );
        return r.rows[0];
    }

    async update(id: string, body: any) {
        const found = await this.db.query(
            `SELECT data FROM contacts WHERE id = $1`,
            [parseInt(id) || 0]
        );
        if (!found.rowCount) {
            throw new NotFoundException();
        }
        const data = found.rows[0].data;
        for (const [k, v] of Object.entries(await this.clean(body?.data))) {
            if (v === null) {
                delete data[k];
            } else {
                data[k] = v;
            }
        }
        const r = await this.db.query(
            `UPDATE contacts SET data = $1 WHERE id = $2 RETURNING id, data`,
            [JSON.stringify(data), id]
        );
        return r.rows[0];
    }

    async delete(id: string) {
        const r = await this.db.query(
            `DELETE FROM contacts WHERE id = $1`,
            [parseInt(id) || 0]
        );
        if (!r.rowCount) {
            throw new NotFoundException();
        }
        return { ok: true };
    }
}
