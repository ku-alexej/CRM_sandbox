// Shared setup for integration tests: real HTTP requests -> NestJS -> real PostgreSQL.
//
// They NEVER touch your working database: every suite drops and re-creates a separate database
// named "crm_test" on the same server as the configured database URL or DB_* settings.
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';

const TEST_DB = 'crm_test';
const ADMIN_URL = process.env.DB_URL || 'postgres://aleskei:fox@localhost:5432/crm';
const testUrl = new URL(ADMIN_URL);
testUrl.pathname = `/${TEST_DB}`;
const TEST_URL = testUrl.toString();

async function recreateTestDatabase() {
    const admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();
}

export async function startApp() {
    await recreateTestDatabase();
    process.env.DB_URL = TEST_URL; // DbService reads it when the module is created
    const { AppModule } = await import('../src/app.modules');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app: INestApplication = mod.createNestApplication();
    await app.init();
    return { app, http: app.getHttpServer() };
}

export const createColumn = async (http: any, name: string, type: string) =>
    (await request(http).post('/columns').send({ name, type }).expect(201)).body;

export const createContact = async (http: any, data: Record<string, any>) =>
    (await request(http).post('/contacts').send({ data }).expect(201)).body;

export const listContacts = async (http: any, qs = '') => (await request(http).get(`/contacts${qs}`).expect(200)).body;
