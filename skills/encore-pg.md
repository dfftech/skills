---
name: encore-pg
description: >
  Encore.dev (TypeScript) backend conventions with Drizzle ORM (PostgreSQL)
  and dff-util. Use when building or changing Encore modules that use Postgres.
---

# Backend Encore Development System Prompt

Framework: Encore.dev (TypeScript) | Database: Drizzle ORM (PostgreSQL) | Utils: dff-util 1.3.1

---

## File Structure (Rule 1)

Module and file names must be **singular** (e.g. user, not users).

**Every module MUST include:**
- **Entity** — `{moduleName}.entity.ts` with Drizzle table definition (e.g. userEntity). Required.
- **Service** — `{moduleName}.service.ts` with Db(), EntityService(), EntityByIdService(id), SaveService, and SearchService. Required.
- **Save** — API (e.g. SaveUser) + SaveService for create/update
- **Search** — API (e.g. SearchUsers) + SearchService for list/search
- **Entity by id** — API GET `/{module}-entity/:id` (path param id) + EntityByIdService(id) to fetch one entity

```
modules/
  {moduleName}/                    ← singular: user, post, branch
    ├── {moduleName}.api.ts        ← HTTP endpoints: /{module}-save, /{module}-search, /{module}-entity/:id (required)
    ├── {moduleName}.service.ts    ← Business logic: Db(), EntityService(), EntityByIdService(id), SaveService, SearchService (required)
    ├── {moduleName}.dto.ts        ← Request/Response types (e.g. UserDto). Search request uses SearchType from utils/app-types.
    ├── {moduleName}.entity.ts     ← Drizzle table (e.g. userEntity) (required)
    └── encore.service.ts         ← Service definition with middlewares
```

Key Point: Each module MUST have exactly these 5 files. Every module must have entity, service, save, search, and get-entity-by-id (`/{module}-entity/:id`).

Important: Other than the `modules` folder and `docs/rest` folder, do NOT write or change files outside them.

---

## Naming Rules (Rule 2)

### API Functions (in `.api.ts`)

Use PascalCase for API function names:

```ts
// CORRECT
export const SaveUser = api<UserDto, ResponseType>(...);
export const SearchUsers = api<SearchType, ResponseType>(...);  // SearchType from utils/app-types
export const EntityByIdUser = api<{ id: string }, ResponseType>(...);  // path param id — get entity by id

// WRONG
export const save_user = api(...)     // snake_case
export const saveUser = api(...)      // camelCase
```

### API Paths

All paths must use kebab-case only (no underscores): **xxx-yyy-zzz**. For paths with a param use **xxx-yyy/:param** (e.g. lang-entity/:id, loader/:id).

```ts
// CORRECT
path: "/user-save"
path: "/user-search"
path: "/user-entity/:id"      // xxx-yyy/:param
path: "/campaign-job-save"
path: "/loader/:id"

// WRONG
path: "/user_save"            // underscore
path: "/user_entity/id"       // use xxx-yyy/:id not xxx_yyy/zzz
path: "/UserSave"             // PascalCase
path: "/save-user"            // reversed order
```

### Service Methods (in `.service.ts`)

All methods must be static, PascalCase, and have a Service postfix. **Every service must have Db(), EntityService(), EntityByIdService(id), SaveService, and SearchService.**

```ts
export default class UserService {
  static Db() { ... }                         // required — returns session_db()
  static EntityService() { ... }               // required — returns entity table (e.g. userEntity)
  static async EntityByIdService(id: string) { ... }  // required — fetch one entity by id (path param)
  static async SaveService(userDto) { ... }   // required
  static async SearchService(input: SearchType) { ... }  // required; SearchType from utils/app-types
}

// WRONG
async SaveService(data) { }     // Not static
static saveService(data) { }    // Not PascalCase
static Save(data) { }           // Missing Service postfix
```

### Field Naming

- DTOs: camelCase

```ts
type UserDto = {
  userId: string;     // camelCase
  createdAt?: Date;
};
```

- Entities: use Drizzle `pgTable`; name tables singular (`userEntity`, `postEntity`). Column names snake_case for DB, `references()` for FKs.

```ts
// In .entity.ts — example: userEntity and postEntity with relation
export const userEntity = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  created_by: text("created_by"),
  updated_at: timestamp("updated_at").defaultNow(),
  updated_by: text("updated_by"),
});

export const postEntity = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: integer("author_id").notNull().references(() => userEntity.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserEntity = typeof userEntity.$inferSelect;
export type PostEntity = typeof postEntity.$inferSelect;
```

**Drizzle entities must NOT alter the database.** Entity definitions (`pgTable`) are used only for queries and type inference. Do not use drizzle-kit push, migrate, or any flow that applies entity changes to the DB. Table/schema changes are done via separate SQL migrations or manual DDL; keep entities in sync with the actual DB schema by hand.

---

## API Layer (Rule 3)

Keep API handlers thin and simple. APIs must only call service methods (logic lives in `.service.ts` only).

```ts
export const SaveUser = api<UserDto, ResponseType>(
  {
    expose: true,
    method: "POST",
    path: "/user-save",
  },
  async (input: UserDto) => {
    return await UserService.SaveService(input);
  }
);

export const SearchUsers = api<SearchType, ResponseType>(
  {
    expose: true,
    method: "POST",
    path: "/user-search",
  },
  async (input: SearchType) => {
    return await UserService.SearchService(input);
  }
);

export const EntityByIdUser = api<{ id: string }, ResponseType>(
  {
    expose: true,
    method: "GET",
    path: "/user-entity/:id",
  },
  async (params: { id: string }) => {
    return await UserService.EntityByIdService(params.id);
  }
);
```

Use unified ResponseType format:

```ts
{
  status?: string | number;
  data?: any;
  error?: any;
  total?: number;  // pagination
  skip?: number;   // pagination
  limit?: number;  // pagination
  meta?: {
    traceId?: string | number;
    timestamp?: string | number;
    duration?: number;
  };
}
```

---

## Service Layer (Rule 4)

Service class pattern (static methods only). Each service method max **25 lines**. Use `session_db()` for tenant DB, `core_db()` for core/registry. **Every service class must have Db() and EntityService().**

```ts
export default class UserService {
  static Db() {
    return session_db();
  }

  /** Returns the entity table for this module (required). */
  static EntityService() {
    return userEntity;
  }

  /** Fetch one entity by id (required). Path param id from API /{module}-entity/:id. */
  static async EntityByIdService(id: string): Promise<ResponseType> {
    const db = this.Db();
    const table = this.EntityService();
    const rows = await db.select().from(table).where(eq(table.id, id)).limit(1);
    const entity = rows[0];
    if (!entity) return { data: null };
    return { data: toViewMapper(entity) };
  }

  /** Fills audit fields for Drizzle insert/update. Call before insert or update. */
  static AuditUpdate(entity: UserEntity): UserEntity {
    const user = session_user();
    const now = new Date();
    const by = user?.id ?? "system";
    const hasId = "id" in entity && entity.id != null;
    return {
      ...entity,
      updated_at: now,
      updated_by: by,
      ...(hasId ? {} : { created_at: now, created_by: by }),
    } as UserEntity;
  }
}
```

SaveService example (Drizzle, max 25 lines):

```ts
static async SaveService(userDto: UserDto): Promise<ResponseType> {
  const log = logger();
  try {
    let entity = toEntityMapper(userDto) as UserEntity;
    entity = this.AuditUpdate(entity);
    entity = await this.SaveValidation(userDto, entity);
    const db = this.Db();
    const table = this.EntityService();
    if (entity.id) {
      await db.update(table).set(entity).where(eq(table.id, entity.id));
    } else {
      const [inserted] = await db.insert(table).values(entity).returning();
      entity = inserted ?? entity;
    }
    const dto = toViewMapper(entity);
    log.info(`Saved user: ${entity.id}`);
    return { data: dto };
  } catch (error) {
    log.error(`Failed to save: ${error}`);
    throw error;
  }
}

static async SaveValidation(dto: UserDto, entity: UserEntity): Promise<UserEntity> {
  if (!entity.name || entity.name === "") {
    throw new Error("INVALID_USER_NAME");
  }
  return entity;
}
```

---

## Data Mapping (Rule 5)

Always use dff-util mappers for field conversion:

```ts
// DTO to Entity (for insert/update)
const entity = toEntityMapper(userDto);

// Entity/Row to DTO (for response)
const dto = toViewMapper(entity);
```

Never manually convert field names.

---

## Core Utilities (Rule 6)

- Tenant DB (Drizzle): `session_db()` — use for tenant-scoped tables
- Core / registry DB (Drizzle): `core_db()` — use for shared tables (e.g. tenant registry)
- Other tenant DB: `await get_db(tenantId)`
- Logger: Use `logger()`, never `console.log`
- Session User, Tenant, Request ID: `session_user()`, `tenant_id()`, `request_id()` from app-util
- HTTP / fetch: Always use `app-http` functions from the `utils` folder. Never use raw `fetch()`, `axios`, or other HTTP clients directly.

```ts
// CORRECT — utils/app-http (or project utils app-http helpers)
import { AppHttpGet, AppHttpPost, AppHttpPut, AppHttpDelete } from "../utils/app-http";

const result = await AppHttpPost("/external/path", body);

// WRONG
await fetch("/external/path", { method: "POST", body: JSON.stringify(body) });
```

---

## Critical Rules Summary

| Rule No | Summary |
|--------|---------|
| 1 | Every module must have: Entity, Service, Save, Search, EntityById (`/{module}-entity/:id`, API e.g. EntityByIdUser); 5 files; names singular |
| 2 | Service: Db(), EntityService(), EntityByIdService(id), SaveService, SearchService; static + PascalCase + Service postfix |
| 3 | Service methods max 25 lines |
| 4 | DTO fields use camelCase |
| 5 | Entity/table columns use snake_case |
| 6 | All API responses use ResponseType; search request uses SearchType from utils/app-types |
| 7 | Use toEntityMapper & toViewMapper from dff-util |
| 8 | Use Db(), EntityService(), session_db() / core_db(); entity table names singular (userEntity) |
| 9 | Use logger() instead of console.log |
| 10 | Use app-util for DB and session utilities |
| 11 | Drizzle entities are for queries/types only — do NOT use to alter tables; schema changes via SQL/migrations only |
| 12 | API paths: kebab-case only (xxx-yyy-zzz); with param use xxx-yyy/:param (e.g. lang-entity/:id) |
| 13 | APIs only in `.api.ts`; business logic only in `.service.ts` |
| 14 | For any HTTP/fetch call, always use `app-http` functions from the `utils` folder — never raw `fetch` / axios |

---

## REST Files (`.http`)

Create one `.http` file per module in `docs/rest/`:

```
docs/rest/
├── org.http
├── menu.http
├── branch.http
└── user.http
```

**Format:**

```http
# Environment
@hosturl = http://localhost:4000
@authToken = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IkFETUlOIiwiZW1haWwiOiJockBkZmYtc29mdHdhcmUuY29tIiwibW9iaWxlIjoiMDAwMDAwMDAwMCIsIm5hbWUiOiJBZG1pbiBVc2VyIiwicGVyc29uYSI6ImFkbWluIiwicm9sZXMiOlsiQURNSU5fQURNSU4iXSwia2V5IjoibWFpbG5leG9fand0IiwiZXhwIjoxNzczMDIwNjIyfQ.qgZiT-TKSRiriigmMNiBsnY1u7ax6qQaB_CWveta7jk


### 1. Create User
POST {{hosturl}}/user-save
Authorization: {{authToken}}
x-tenant-id: TEST

{
  "name": "admin",
  "role": "admin"
}

### 2. Search Users
POST {{hosturl}}/user-search
Authorization: {{authToken}}
x-tenant-id: TEST

{
  "skip": 0,
  "limit": 20
}

### 3. Get User by id
GET {{hosturl}}/user-entity/1
Authorization: {{authToken}}
x-tenant-id: TEST
```

---

## Important Warning

Do NOT write or change any files outside the `modules` folder and `docs/rest` folder.

Developer code should be maintainable and easy to understand with optimization.

Follow these rules to ensure clean, consistent, and maintainable Encore backend code.
