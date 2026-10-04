import { Controller, Get, Post, Patch, Delete, Body, Param, BadRequestException, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';

const TYPES = ['text', 'number', 'date', 'phone'];

@Controller('columns')
export class ColumnsController {
    constructor(private db: DbService) {}

    @Get()
    async getColumns() {
        const r = await this.db.query(
            `SELECT id, name, type, position FROM columns ORDER BY position, id`
        );
        return r.rows;
    }

    @Post()
    async createColumn(@Body() body: any) {
        const columnName = String(body?.name || '').trim();
        if (!columnName) {
            throw new BadRequestException('Column name is required');
        }
        if (!TYPES.includes(body?.type)) {
            throw new BadRequestException('Invalid column type');
        }
        const r = await this.db.query(
            `INSERT INTO columns (name, type, position)
            VALUES ($1, $2, (SELECT COALESCE(MAX(position), 0) + 1 FROM columns))
            RETURNING id, name, type, position`,
            [columnName, body.type],
        );
        return r.rows[0];
    }

    @Patch('reorder')
    async reorderColumn(@Body() body: any) {
        if (!Array.isArray(body?.ids)) {
            throw new BadRequestException('ids must be an array');
        }
        for (let i = 0; i < body.ids.length; i++) {
            await this.db.query(
                `UPDATE columns SET position = $1 WHERE id = $2`,
                [i + 1, body.ids[i]]
            );
        }
        return this.getColumns();
    }

    @Patch(':id')
    async updateColumn(@Param('id') id: string, @Body() body: any) {
        const columnName = String(body?.name || '').trim();
        if (!columnName) {
            throw new BadRequestException('Name is required');
        }
        const r = await this.db.query(
            `UPDATE columns
            SET name = $1
            WHERE id = $2
            RETURNING id, name, type, position`,
            [columnName, id]
        );
        if (!r.rowCount) {
            throw new NotFoundException();
        }
        return r.rows[0];
    }

    @Delete(':id')
    async deleteColumn(@Param('id') id: string) {
        const r = await this.db.query(
            `DELETE FROM columns WHERE id = $1 RETURNING id`,
            [id]
        );
        if (!r.rowCount) {
            throw new NotFoundException();
        }
        await this.db.query(
            `UPDATE contacts SET data = data - $1::text`,
            [id]
        );
        return {ok: true};
    }
}