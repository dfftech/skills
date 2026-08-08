---
name: encore-mongo
description: >
  Encore.dev (TypeScript) backend conventions with MongoDB and dff-util.
  Use when building or changing Encore modules that use MongoDB.
---

# Backend Encore Development System Prompt

Framework: Encore.dev (TypeScript) | Database: MongoDB | Utils: dff-util 1.3.1

---

## File Structure (Rule 1)

Module and file names must be **singular** (e.g. user, not users).

**Every module MUST include:**
- **Schema** — `{moduleName}.schema.ts` with MongoDB collection schema / types (e.g. userSchema). Required.
- **Service** — `{moduleName}.service.ts` with Db(), CollectionService(), SchemaService(), EntityByIdService(id), SaveService, and SearchService. Required.
- **Save** — API (e.g. SaveUser) + SaveService for create/update
- **Search** — API (e.g. SearchUsers) + SearchService for list/search
- **Entity by id** — API GET `/{module}-entity/:id` (path param id) + EntityByIdService(id) to fetch one document

```
modules/
  {moduleName}/                    ← singular: user, post, branch
    ├── {moduleName}.api.ts        ← HTTP endpoints: /{module}-save, /{module}-search, /{module}-entity/:id (required)
    ├── {moduleName}.service.ts    ← Business logic: Db(), CollectionService(), SchemaService(), EntityByIdService(id), SaveService, SearchService (required)
    ├── {moduleName}.dto.ts        ← Request/Response types (e.g. UserDto). Search request uses SearchType from utils/app-types.
    ├── {moduleName}.schema.ts     ← MongoDB schema / document types (e.g. userSchema) (required)
    └── encore.service.ts         ← Service definition with middlewares
```

Key Point: Each module MUST have exactly these 5 files. Every module must have schema, service, save, search, and get-entity-by-id (`/{module}-entity/:id`).

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

All methods must be static, PascalCase, and have a Service postfix. **Every service must have Db(), CollectionService(), SchemaService(), EntityByIdService(id), SaveService, and SearchService.**

```ts
export default class UserService {
  static Db() { ... }                              // required — returns tenant Mongo client/db helper
  static CollectionService() { ... }               // required — returns collection (e.g. db().collection("users"))
  static SchemaService() { ... }                   // required — returns schema (e.g. userSchema)
  static async EntityByIdService(id: string) { ... }  // required — fetch one document by id (path param)
  static async SaveService(userDto) { ... }        // required
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

- Schemas / documents: collection names plural in Mongo (`users`, `posts`); schema export names singular (`userSchema`, `postSchema`). Document fields snake_case for DB.

```ts
// In .schema.ts — example: userSchema and postSchema
export type UserSchema = {
  _id?: string;
  name: string;
  created_at?: Date;
  created_by?: string;
  updated_at?: Date;
  updated_by?: string;
};

export type PostSchema = {
  _id?: string;
  title: string;
  content?: string;
  author_id: string;
  created_at?: Date;
};

export const userSchema = "users";   // collection name reference if used by helpers
export const postSchema = "posts";
```

**Schemas are for types / validation / collection naming only.** Do not invent ad-hoc collection names in services — always go through `CollectionService()` / `SchemaService()`. Keep schemas in sync with the actual MongoDB collections by hand.

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

Service class pattern (static methods only). Each service method max **25 lines**. Use `Collection()` / `Db()` for tenant Mongo access. Never hardcode collection access outside `CollectionService()`.

```ts
export default class UserService {
  static Db() {
    return db(); // tenant-scoped Mongo helper from app-util
  }

  /** Returns the Mongo collection for this module (required). */
  static CollectionService() {
    return this.Db().collection("users");
  }

  /** Returns the schema / collection key for this module (required). */
  static SchemaService() {
    return userSchema;
  }

  /** Fetch one document by id (required). Path param id from API /{module}-entity/:id. */
  static async EntityByIdService(id: string): Promise<ResponseType> {
    const col = this.CollectionService();
    const entity = await col.findOne({ _id: id });
    if (!entity) return { data: null };
    return { data: toViewMapper(entity) };
  }

  /** Fills audit fields for insert/update. Call before insert or update. */
  static AuditUpdate(entity: UserSchema): UserSchema {
    const user = session_user();
    const now = new Date();
    const by = user?.id ?? "system";
    const hasId = "_id" in entity && entity._id != null;
    return {
      ...entity,
      updated_at: now,
      updated_by: by,
      ...(hasId ? {} : { created_at: now, created_by: by }),
    };
  }
}
```

SaveService example (MongoDB, max 25 lines):

```ts
static async SaveService(userDto: UserDto): Promise<ResponseType> {
  const log = logger();
  try {
    let entity = toSchemaMapper(userDto) as UserSchema;
    entity = this.AuditUpdate(entity);
    entity = await this.SaveValidation(userDto, entity);
    const col = this.CollectionService();
    if (entity._id) {
      await col.updateOne({ _id: entity._id }, { $set: entity });
    } else {
      const result = await col.insertOne(entity);
      entity = { ...entity, _id: result.insertedId?.toString?.() ?? entity._id };
    }
    const dto = toViewMapper(entity);
    log.info(`Saved user: ${entity._id}`);
    return { data: dto };
  } catch (error) {
    log.error(`Failed to save: ${error}`);
    throw error;
  }
}

static async SaveValidation(dto: UserDto, entity: UserSchema): Promise<UserSchema> {
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
// DTO to Schema (for insert/update)
const entity = toSchemaMapper(userDto);

// Schema / document to DTO (for response)
const dto = toViewMapper(entity);
```

Never manually convert field names.

---

## Core Utilities (Rule 6)

- Tenant DB / collection access: `db()`, `CollectionService()` — never hardcode `db().collection("...")` outside the service helper
- Other tenant DB: `await get_db(tenantId)` when required by app-util
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
| 1 | Every module must have: Schema, Service, Save, Search, EntityById (`/{module}-entity/:id`, API e.g. EntityByIdUser); 5 files; names singular |
| 2 | Service: Db(), CollectionService(), SchemaService(), EntityByIdService(id), SaveService, SearchService; static + PascalCase + Service postfix |
| 3 | Service methods max 25 lines |
| 4 | DTO fields use camelCase |
| 5 | Schema / document fields use snake_case |
| 6 | All API responses use ResponseType; search request uses SearchType from utils/app-types |
| 7 | Use toSchemaMapper & toViewMapper from dff-util |
| 8 | Use Db() / CollectionService(); never hardcode collection access |
| 9 | Use logger() instead of console.log |
| 10 | Use app-util for DB and session utilities |
| 11 | Schemas are for types / collection naming only — keep in sync with real Mongo collections by hand |
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
