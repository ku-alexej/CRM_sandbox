import { Module } from '@nestjs/common';
import { DbService } from './db/db.service';
import { ColumnsController } from './columns/columns.controller';

@Module({
    controllers: [ColumnsController],
    providers: [DbService],
})

export class AppModule {}
