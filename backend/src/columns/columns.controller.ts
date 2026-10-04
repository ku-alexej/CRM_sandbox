import { Controller, Get, Post, Patch, Delete} from '@nestjs/common';
import { DbService } from '../db/db.service';

const TYPES = ['text', 'number', 'date', 'phone'];

@Controller('columns')
export class ColumnsController {
    constructor(private db: DbService) {}

    @Get()
    async getColumns() {
        const r = await this.db.query(
            'SELECT id, name, type, position FROM columns ORDER BY position, id'
        );
        return r.rows;
    }

    // @Post()
    // async createColumn() {
    // }

    // @Patch(':id')
    // async updateColumn() {
    // }

    // @Delete(':id')
    // async deleteColumn() {
    // }
}