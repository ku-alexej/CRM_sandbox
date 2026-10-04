import { Controller, Get, Post, Patch, Delete, Query, Body, Param } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
    constructor(private contacts: ContactsService) {}

    @Get()
    getContacts(@Query() query: any) {
        return this.contacts.getAll(query);
    }

    @Post()
    createContact(@Body() body: any) {
        return this.contacts.create(body);
    }

    @Patch(':id')
    updateContact(@Param('id') id: string, @Body() body: any) {
        return this.contacts.update(id, body);
    }

    @Delete(':id')
    deleteContact(@Param('id') id: string) {
        return this.contacts.delete(id);
    }
}
