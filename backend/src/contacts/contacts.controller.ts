import { Controller, Get, Post, Patch, Delete, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
	constructor(private contacts: ContactsService) {}

	@Get()
	getContacts(@Query() query: any) {
		return this.contacts.getAll(query);
	}

	// @Post()
	// createContact() {
	// }

	// @Patch(':id')
	// updateContact() {
	// }

	// @Delete(':id')
	// deleteContact() {
	// }
}
