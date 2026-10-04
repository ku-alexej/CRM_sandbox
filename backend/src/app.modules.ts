import { Module } from '@nestjs/common';
import { DbService } from './db/db.service';
import { ColumnsController } from './columns/columns.controller';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';

@Module({
    controllers: [ColumnsController, ContactsController],
    providers: [DbService, ContactsService],
})

export class AppModule {}
