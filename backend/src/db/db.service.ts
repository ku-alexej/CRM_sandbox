import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
    pool = new Pool({
        connectionString: process.env.DB_URL || 'postgres://aleskei:fox@localhost:5432/crm'
    });

    async onModuleInit() {
        await this.migrate();
    }

    async onModuleDestroy() {
        await this.pool.end();
    }

    query(sql: string, params: any[] = []) {
        return this.pool.query(sql, params);
    }

    async migrate() {
        for (let attempt = 1; ; attempt++) {
            try {
                await this.query('CREATE TABLE IF NOT EXISTS migrations (name text PRIMARY KEY)' );
                break;
            } catch (err) {
                if (attempt >= 30) {
                    throw err;
                }
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
        const dir = join(process.cwd(), 'migrations');
        for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
            const done = await this.query('SELECT 1 FROM migrations WHERE name = $1', [file]);
            if (done.rowCount > 0) {
                continue;
            }
            await this.query(readFileSync(join(dir, file), 'utf-8'));
            await this.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        }
    }
}
