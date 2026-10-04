import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class ContactsService {
    constructor(private db: DbService) {}

    async getAll(q: any) {
        const limit = Math.min(Math.max(parseInt(q.limit) || 50, 1), 200);
        const offset = Math.max(parseInt(q.offset) || 0, 0);
        const [count, list] = await Promise.all([
            this.db.query(
                'SELECT count(*)::int AS n FROM contacts'
            ),
            this.db.query(
                'SELECT id, data FROM contacts ORDER BY id DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            ),
        ]);
        return { items: list.rows, total: count.rows[0].n };
    }

    // async create() {
    // }

    // async update() {
    // }

    // async delete() {
    // }
}
