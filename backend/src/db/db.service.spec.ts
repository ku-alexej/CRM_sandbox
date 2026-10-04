import { jest } from '@jest/globals';

jest.unstable_mockModule('fs', () => ({
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
}));

const fs = await import('fs');
const { DbService } = await import('./db.service');

describe('DbService.migrate', () => {
    function setup(applied: string[], files: string[]) {
        const svc = new DbService();
        const executed: string[] = [];
        svc.query = jest.fn(async (sql: string, params: any[] = []) => {
            executed.push(sql.trim().split('\n')[0]);
            if (sql.startsWith('SELECT 1 FROM migrations')) return { rowCount: applied.includes(params[0]) ? 1 : 0 } as any;
            return { rowCount: 0 } as any;
        }) as any;
        (fs.readdirSync as jest.Mock).mockReturnValue(files);
        (fs.readFileSync as jest.Mock).mockImplementation((p: string) => `-- sql of ${p}`);
        return { svc, executed };
    }

    it('applies only migrations that were not applied yet, in name order', async () => {
        const { svc, executed } = setup(['001_initial.sql'], ['002_b.sql', '001_initial.sql', '003_c.sql', 'notes.txt']);
        await svc.migrate();
        const applied = executed.filter((s) => s.startsWith('-- sql of'));
        expect(applied).toHaveLength(2);
        expect(applied[0]).toContain('002_b.sql');
        expect(applied[1]).toContain('003_c.sql');
    });

    it('records every applied migration', async () => {
        const { svc } = setup([], ['001_initial.sql']);
        await svc.migrate();
        const inserts = (svc.query as jest.Mock).mock.calls.filter((c) => String(c[0]).startsWith('INSERT INTO migrations'));
        expect(inserts).toHaveLength(1);
        expect(inserts[0][1]).toEqual(['001_initial.sql']);
    });
});