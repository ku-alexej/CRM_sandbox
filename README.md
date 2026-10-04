# CRM Contacts MVP
Full-stack application with basic CRM functionality: contacts in a table with dynamic, typed columns
(text / number / date / phone), inline editing and infinite scroll.
The table is hand-written (React + CSS), no grid libraries.
 
Stack: NestJS + PostgreSQL (`pg`, no ORM), React + Vite (JavaScript, plain CSS), Docker Compose.
 
## 1. How to run the application
```
docker compose up --build
```
- Frontend: http://localhost:5173
- API: http://localhost:3000
Stop / remove everything (`-v` also deletes the database volume, i.e. all data):
```
docker compose down
docker compose down -v
```
 
Run the backend without Docker (needs a local PostgreSQL; set `DATABASE_URL`, default
`postgres://crm:crm@localhost:5432/crm`):
```
cd backend
npm install
npm run build
npm start
```
 
## 2. Database and demo data
The database schema is created automatically: migrations from `backend/migrations/*.sql` are applied when the
backend starts (applied files are stored in the `schema_migrations` table). The backend retries the connection for
up to ~60 seconds while the database container is starting. A fresh database is empty.
 
Load the demo data (5 columns: Name, Company, Phone, Birth Date, Score + 500 contacts). The data is deterministic,
and the command deletes existing columns and contacts before creating them again:
```
docker compose exec backend npm run seed
```
Then refresh the page. Without Docker: `cd backend && npm run build && npm run seed`.
 
Data is stored in the `pgdata` volume, so it survives `docker compose down` and page reloads.
 
## 3. How to run the tests
```
cd backend
npm install
npm test
```
Unit tests (Jest, no database needed) cover value validation by column type and the contacts service.
 
CI (`.github/workflows/ci.yml`) runs on every push and pull request to `main` / `master`, with Node.js 20.
 
## 4. Main technical choices
- **JSONB instead of EAV.** `contacts(id, created_at, data jsonb)` with `data = {"<columnId>": value}`, plus
  `columns(id, name, type, position)`. A contact is read as one row without JOINs, deleting a column is
  `data - key`, adding a column needs no migration. The backend validates values on write (`cleanValue`).
- **Pagination runs in PostgreSQL** (`limit/offset` in `ContactsService.getAll`).
- **SQL is parameterized.** Values are passed only as parameters (no SQL injection).
- **`pg` without ORM**, so the SQL is visible and easy to explain. Validation is written by hand, without DTOs.
- **Infinite scroll:** `IntersectionObserver` + `limit/offset`, 50 rows per page. Order is `id DESC`
  (new contacts on top).
- **Column reorder:** native HTML5 drag-and-drop (drag a header onto another header), saved with one request.
- **Frontend state** lives in `App.jsx`; `Table.jsx` only renders and calls handlers from props. Responses of outdated
  requests are ignored.
Architecture:
```
backend/
  migrations/001_init.sql             database schema
  src/database/db.service.ts          DB connection + migration runner
  src/contacts/                       controller, service, validation, tests
  src/columns/columns.controller.ts   columns CRUD + reorder
  src/seed.ts                         seed command
frontend/src/
  App.jsx                             state, data loading, infinite scroll, handlers
  components/Table.jsx                table, editable cell, column drag-and-drop
  api/api.js                          fetch wrapper
  styles.css
.github/workflows/ci.yml              CI
```
Request flow: `Controller -> Service -> DbService -> PostgreSQL`.
 
### API
| Method | URL | Description |
|---|---|---|
| GET | `/contacts?limit&offset` | page of contacts + `total` |
| POST | `/contacts` | create a contact (`{data?: {colId: value}}`) |
| PATCH | `/contacts/:id` | update values (`{data: {colId: value}}`), an empty value clears the cell |
| DELETE | `/contacts/:id` | delete a contact |
| GET / POST | `/columns` | list / create (`{name, type}`) |
| PATCH | `/columns/:id` | rename (`{name}`) |
| PATCH | `/columns/reorder` | set a new order (`{ids: [3,1,2]}`) |
| DELETE | `/columns/:id` | delete a column and its values |
 
 
## 5. Features: done and incomplete
| Feature | Status | Where |
|---|---|---|
| Table view of contacts | Done | `Table.jsx` |
| Infinite scrolling (backend pagination) | Done | `App.jsx` (`loadRows`, `IntersectionObserver`) |
| Inline editing (Enter / blur saves, Esc cancels) | Done | `Table.jsx` (`Cell`), `App.jsx` (`saveCell`) |
| Add / rename / delete column | Done | `App.jsx`, `columns.controller.ts` |
| Reorder columns (drag-and-drop) | Done | `Table.jsx`, `PATCH /columns/reorder` |
| Add / edit / delete contact | Done | `App.jsx`, `contacts.service.ts` |
| Column types text / number / date / phone | Done | `INPUT_TYPE` in `Table.jsx`, `cleanValue` in `contacts.query.ts` |
| Persistence in PostgreSQL | Done | `docker-compose.yml`, volume `pgdata` |
| Migrations and seed (500 contacts) | Done | `migrations/`, `seed.ts` |
| Docker Compose (frontend, backend, db) | Done | `docker-compose.yml` |
| Unit tests + CI | partial coverage | `*.ts`, `ci.yml` |
| Filters and sorting | Not released | |
 
## 6. Known limitations
- A column type cannot be changed after creation.
- Phone type check only symbols inside phone number.
- Date type shows different format and use browser's language. 
- `limit/offset` pagination may shift if the data is changed by someone else while scrolling, and it gets slower on
  very large tables.
- `reorder` and column deletion run several queries without a transaction; `PATCH /contacts/:id` reads, modifies
  and writes the row, so two simultaneous edits of the same contact can overwrite each other.
- `PATCH /columns/abc` (a non-numeric id) returns 500 instead of 400.
- Validation is written by hand (no DTOs).
- Errors, confirmations and column renaming use `alert`, `confirm` and `prompt`; there is no loading indicator.
- No authentication, undo, import / export or mobile layout.
- The frontend container runs `vite dev`, not a production build.

## 7. Priority improvements
1. More integration tests to find what to improve.
2. Filters and sorting
3. Validate ids with `ParseIntPipe` and wrap column reorder / delete in transactions.
4. Atomic cell update (`data = data || $1`) to avoid lost updates.
5. DTO for transfer and validation information.
6. Proper modals and error messages instead of `alert` / `prompt`, and a loading state.
7. Production frontend image (Vite build served by nginx) and frontend tests.
8. Change a column type with conversion of existing values.

## 8. AI tools used
- Claude: generating examples, suggesting technologies, creating tests, debugging, and writing the README.
- GPT: reviewing information on unfamiliar technologies and quick troubleshooting.
- GitHub Copilot: accelerating code generation and debugging during application startup.

## 9. Time spent
Approximately 4 hours 10 min
