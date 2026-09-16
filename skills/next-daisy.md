---
name: next-daisy
description: >
  Next.js + daisyUI frontend conventions: app page ScreenAccess/Suspense,
  module page/list/form/view, hooks (data/types/service/validation), AppHttp,
  Type* props via useMemo spread, AgGrid lists, and modal edit flow.
---

# Next.js + daisyUI System Prompt

Stack: Next.js App Router · daisyUI/Tailwind · signals · AppHttp · `types/*` · AgGrid

---

## Folder structure

`.ts` = TypeScript only (no JSX). `.tsx` = view / HTML. Same basename as the matching `.tsx` (import `./{module}.list.ts`).

```
app/{module}/page.tsx                 ← Suspense + ScreenAccess only
modules/{path}/
├── {module}.page.tsx                 ← list + modal (no auth) — HTML
├── components/                       ← list + form + view + grid
│   ├── {module}.list.ts              ← list TypeScript
│   ├── {module}.list.tsx             ← list HTML
│   ├── {module}.form.ts              ← form TypeScript (useMemo, handlers)
│   ├── {module}.form.tsx             ← form HTML
│   ├── {module}.view.ts              ← view TypeScript
│   ├── {module}.view.tsx             ← view HTML
│   └── {module}.grid.ts              ← AgGrid columnDefs / datasource
├── hooks/                            ← TypeScript
│   ├── data.ts                       ← init / default values
│   ├── types.ts                      ← all types
│   ├── validation.ts                 ← form rules
│   ├── service.list.ts               ← list HTTP + signals
│   ├── service.save.ts               ← save HTTP + signals
│   ├── service.upload.ts             ← upload HTTP
│   ├── service-load.languages.ts     ← one file per select (`service-load.{select}.ts`)
│   ├── service-load.country.ts
│   ├── service-load.role.ts
│   └── edit-mode.ts                  ← popup signals + editModeUpdate (not HTTP)
layouts/   → ArticleLayout, ContentLayout, FloatLayout, GridLayout
skeleton/  → skeleton-article, skeleton-table, skeleton-float
types/     → TypeButton, TypeInput, TypeSelect, TypeSwitch, … (ALWAYS use)
```

---

## App page (permission + skeleton)

Auth/permission **only** here — never in module pages.

```tsx
"use client";
import { Suspense } from "react";
import { ArticleLayout } from "@/layouts/article-layout";
import { ContentLayout } from "@/layouts/content-layout";
import { FloatLayout } from "@/layouts/float-layout";
import { SkeletonArticle } from "@/skeleton/skeleton-article";
import { SkeletonTable } from "@/skeleton/skeleton-table";
import { SkeletonFloat } from "@/skeleton/skeleton-float";
import { ScreenAccess } from "@/utils/services/app.event";
import PermissionDenied from "@/components/permission-denied";
import { UserPage } from "@/modules/profiles/users/user.page";

export default function user() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      {ScreenAccess.value.read ? <UserPage /> : <PermissionDenied />}
    </Suspense>
  );
}

function SkeletonPage() {
  return (
    <>
      <ArticleLayout><SkeletonArticle /></ArticleLayout>
      <ContentLayout><SkeletonTable /></ContentLayout>
      <FloatLayout><SkeletonFloat /></FloatLayout>
    </>
  );
}
```

---

## Module page (list + side modal)

ScreenAction **only here** — never in list / form / view. Read `AppStorage.Get(SCREEN_ACTION)`.

| Action | Result |
|--------|--------|
| `{module}:list` | popup closed |
| `{module}:view-{id}` | open view |
| `{module}:form-{id}` | open form (edit) |
| `{module}:form` (no `-id`) | open form (new / add) |

```tsx
// user.page.tsx
import { useEffect } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { AppStorage, SCREEN_ACTION } from "@/utils/services/app.storage";
import { editModeUpdate, userIsEditMode, userIsPopupOpen } from "./hooks/edit-mode";
import UserForm from "./components/user.form";
import { UserList } from "./components/user.list";
import UserView from "./components/user.view";

function applyUserScreenAction() {
  const action = String(AppStorage.Get(SCREEN_ACTION) || "user:list");
  if (action === "user:list") {
    editModeUpdate(undefined);
    return;
  }
  if (action.startsWith("user:view-")) {
    const id = action.slice("user:view-".length);
    editModeUpdate(id || undefined);
    return;
  }
  if (action.startsWith("user:form")) {
    const id = action.startsWith("user:form-") ? action.slice("user:form-".length) : "";
    if (!id) editModeUpdate(undefined, "add");
    else editModeUpdate(id, "edit");
  }
}

export function UserPage() {
  useSignals();
  useEffect(() => { applyUserScreenAction(); }, []);
  return (
    <>
      <UserList />
      {userIsPopupOpen.value && (
        <div className="modal modal-open">
          <div className="modal-backdrop" role="button" tabIndex={0}
            onClick={() => editModeUpdate(undefined)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && editModeUpdate(undefined)} />
          <div className="modal-box fixed right-0 top-0 h-screen w-full max-w-4xl rounded-none p-0">
            <div className="h-full overflow-y-auto p-6">
              {userIsEditMode.value ? <UserForm /> : <UserView />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## hooks/ — required files

### `hooks/types.ts` — types only
### `hooks/data.ts` — init values only

```ts
export const userInitValues: UserType = { id: "", name: "", email: "", /* … */ };
export const getDefaultUser = (): UserType => ({ ...userInitValues });
```

### `hooks/validation.ts` — form rules only

```ts
export const userValidation = {
  name: { required: { value: true, message: ConstKeys.REQUIRED } },
  email: {
    required: { value: true, message: ConstKeys.REQUIRED },
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" },
  },
};
```

### `hooks/service.{feature}.ts` — HTTP only

`service.*` files contain **HTTP calls + their signals only**. Popup / edit mode is `edit-mode.ts` (not a service). Each dropdown is `service-load.{selectName}.ts`.

```ts
// hooks/service.list.ts
export const userListIsLoading = signal(false);

export const userListCall = async (params: any) => {
  try {
    userListIsLoading.value = true;
    const resp = await AppHttp.Get(AppHttp.MsUrl.base + "/profile/search", params);
    return { data: Array.isArray(resp?.data) ? resp.data : [], total: resp?.total || 0 };
  } catch (error: any) {
    ShowToast(t(error?.error?.message || ConstKeys.WENT_WRONG), "warning");
  } finally {
    userListIsLoading.value = false;
  }
};
```

```ts
// hooks/service.save.ts
export const userSaveIsLoading = signal(false);

export const userSaveCall = async (params: any) => {
  try {
    userSaveIsLoading.value = true;
    return await AppHttp.Post(AppHttp.MsUrl.base + "/profile/save", params);
  } catch (error: any) {
    ShowToast(t(error?.error?.message || ConstKeys.WENT_WRONG), "warning");
  } finally {
    userSaveIsLoading.value = false;
  }
};
```

```ts
// hooks/service-load.languages.ts — one file per select, always AppHttp.Load
export const languagesIsLoading = signal(false);
export const languagesOptions = signal<OptionType[]>([]);

export const languagesLoadCall = async (id: string, params?: any) => {
  try {
    languagesIsLoading.value = true;
    const resp = await AppHttp.Load(id, params);
    const rows = resp?.data && Array.isArray(resp.data) ? resp.data : Array.isArray(resp) ? resp : [];
    languagesOptions.value = rows.map((lang: any) => ({
      label: lang.label,
      value: lang.label,
      key: lang.key,
      disabled: lang.disabled || false,
    }));
  } catch (error: any) {
    ShowToast(t(error?.error?.message || ConstKeys.WENT_WRONG), "warning");
    languagesOptions.value = [];
  } finally {
    languagesIsLoading.value = false;
  }
};
```

```ts
// hooks/service-load.country.ts — same AppHttp.Load pattern as languages
export const countryIsLoading = signal(false);
export const countryOptions = signal<OptionType[]>([]);

export const countryLoadCall = async (id = "COUNTRIES", params?: any) => {
  try {
    countryIsLoading.value = true;
    const resp = await AppHttp.Load(id, params);
    const rows = resp?.data && Array.isArray(resp.data) ? resp.data : Array.isArray(resp) ? resp : [];
    countryOptions.value = rows.map((row: any) => ({
      label: row.label, value: row.label, key: row.key, disabled: row.disabled || false,
    }));
  } catch (error: any) {
    ShowToast(t(error?.error?.message || ConstKeys.WENT_WRONG), "warning");
    countryOptions.value = [];
  } finally {
    countryIsLoading.value = false;
  }
};
```

```ts
// hooks/service-load.role.ts — same AppHttp.Load pattern as languages
export const roleIsLoading = signal(false);
export const roleOptions = signal<OptionType[]>([]);

export const roleLoadCall = async (id = "ROLES", params?: any) => {
  try {
    roleIsLoading.value = true;
    const resp = await AppHttp.Load(id, params);
    const rows = resp?.data && Array.isArray(resp.data) ? resp.data : Array.isArray(resp) ? resp : [];
    roleOptions.value = rows.map((row: any) => ({
      label: row.label, value: row.label, key: row.key, disabled: row.disabled || false,
    }));
  } catch (error: any) {
    ShowToast(t(error?.error?.message || ConstKeys.WENT_WRONG), "warning");
    roleOptions.value = [];
  } finally {
    roleIsLoading.value = false;
  }
};
```

```ts
// hooks/edit-mode.ts — not HTTP, not a service
import { getDefaultUser } from "./data";
import { AppStorage, SCREEN_ACTION } from "@/utils/services/app.storage";

export const userIsPopupOpen = signal(false);
export const userIsEditMode = signal(false);
export const userSelectedId = signal<string | undefined>(undefined);
export const SelectedUser = signal<UserType | null>(null);

export const editModeUpdate = async (id?: string, mode?: "edit" | "add") => {
  if (mode === "add") {
    SelectedUser.value = getDefaultUser();
    userSelectedId.value = undefined;
    userIsEditMode.value = true;
    userIsPopupOpen.value = true;
    AppStorage.Set(SCREEN_ACTION, "user:form");
  } else if (id) {
    userSelectedId.value = id;
    userIsEditMode.value = mode === "edit";
    userIsPopupOpen.value = true;
    AppStorage.Set(SCREEN_ACTION, mode === "edit" ? `user:form-${id}` : `user:view-${id}`);
  } else {
    userSelectedId.value = undefined;
    userIsEditMode.value = false;
    userIsPopupOpen.value = false;
    AppStorage.Set(SCREEN_ACTION, "user:list");
  }
};
```

```ts
// hooks/service.upload.ts
export const uploadFile = async (file: File) => {
  const fileUploadUrl = await AppHttp.Post("/astropeace-util/s3/upload-url", {
    fileName: file.name,
  });
  await AppHttp.CloudUpload(fileUploadUrl.data.upload, file);
  return { url: fileUploadUrl.data.download, filename: file.name, mimetype: file.type };
};
```

Never use raw `fetch` / axios — only `AppHttp`.

---

## Form / view — `useMemo` props + spread into Type*

Logic in `components/{module}.form.ts` / `{module}.view.ts`. HTML in `components/{module}.form.tsx` / `{module}.view.tsx`. Same basename; `.tsx` imports `./{module}.form.ts`.

```ts
// components/user.form.ts — TypeScript only
import { getDefaultUser, userInitValues } from "../hooks/data";
import { userValidation } from "../hooks/validation";
import { userSaveCall, userSaveIsLoading } from "../hooks/service.save";
import { languagesOptions } from "../hooks/service-load.languages";
import { countryOptions } from "../hooks/service-load.country";
import { roleOptions } from "../hooks/service-load.role";

export function useUserForm() {
  const { control, formState: { errors } } = useForm<UserType>({
    defaultValues: getDefaultUser(), // userInitValues from hooks/data.ts
  });

  const nameProps = useMemo(
    () => ({
      control,
      name: "name",
      label: t("name"),
      rules: userValidation.name,
      error: errors.name,
      className: "w-full mb-3",
    }),
    [t, control, errors.name],
  );

  const cancelProps = useMemo(
    () => ({
      action: "secondary" as const,
      label: t("cancel"),
      name: "CircleX" as const,
      onPress: onCancel,
    }),
    [t],
  );

  return { nameProps, cancelProps, defaultValues: userInitValues };
}
```

```tsx
// components/user.form.tsx — view / HTML
import { useUserForm } from "./user.form.ts";

export default function UserForm() {
  const { nameProps, telCodeProps, langProps, countryProps, roleProps, activeProps, cancelProps } = useUserForm();
  return (
    <ContentLayout>
      <TypeInput {...nameProps} />
      <TypeSelect {...telCodeProps} />
      <TypeList {...langProps} />
      <TypeSelect {...countryProps} />
      <TypeSelect {...roleProps} />
      <TypeSwitch {...activeProps} />
      <TypeButton {...cancelProps} />
    </ContentLayout>
  );
}
```

Rules:
- Always use `types/*` (`TypeInput`, `TypeSelect`, `TypeSwitch`, `TypeButton`, `TypeDate`, `TypeList`, …)
- Dropdown options come from `hooks/service-load.{select}.ts` signals filled by `AppHttp.Load`
- Validation from `hooks/validation.ts`; defaults from `hooks/data.ts` (`userInitValues` / `getDefaultUser()`)

---

## List / grid page

`components/{module}.list.ts` + `{module}.list.tsx`. Grid helpers in `components/{module}.grid.ts`.

```ts
// components/user.list.ts — TypeScript only
import { userListCall, userListIsLoading } from "../hooks/service.list";
import { zodiacSignOptions } from "../hooks/service-load.zodiacSign";
import { editModeUpdate } from "../hooks/edit-mode";

export function useUserList() {
  const searchProps = useMemo(
    () => ({ name: "search", label: t("search"), onChange: onSearch }),
    [t],
  );
  const zodiacSignProps = useMemo(
    () => ({ name: "zodiac", label: t("zodiac"), options: zodiacSignOptions.value }),
    [t, zodiacSignOptions.value],
  );
  const userStatusProps = useMemo(
    () => ({ name: "status", label: t("status"), onChange: onStatus }),
    [t],
  );
  const reloadProps = useMemo(
    () => ({ action: "secondary" as const, label: t("reload"), onPress: onReload }),
    [t],
  );
  return { searchProps, zodiacSignProps, userStatusProps, reloadProps, handleAction };
}
```

```ts
// components/user.grid.ts — TypeScript only
export const columnDefs = (t: TFunction, handleAction: (row: UserType) => void) => [/* … */];
export const getDataSource = () => ({ /* AgGrid IDatasource via userListCall */ });
export const gridOptions = { /* … */ };
```

```tsx
// components/user.list.tsx — HTML
import { useUserList } from "./user.list.ts";
import { columnDefs, getDataSource } from "./user.grid.ts";

export function UserList() {
  const { searchProps, zodiacSignProps, userStatusProps, reloadProps, handleAction } = useUserList();
  return (
    <>
      <ArticleLayout>
        <aside className="flex justify-between gap-2">
          <h2 className="text-2xl font-bold text-primary">{t("users")}</h2>
          <div className="flex gap-4">
            <TypeSearch {...searchProps} />
            <TypeSelect {...zodiacSignProps} />
            <TypeSwitch {...userStatusProps} />
          </div>
        </aside>
      </ArticleLayout>
      <GridLayout>
        <AgGridReact ref={gridRef} columnDefs={columnDefs(t, handleAction)} datasource={getDataSource()} />
      </GridLayout>
      <FloatLayout>
        <TypeButton {...reloadProps} />
      </FloatLayout>
    </>
  );
}
```

- Open row → `editModeUpdate`
- Status/edit actions call service methods (`userStatusCall`, etc.)

---

## View page

`components/{module}.view.ts` + `{module}.view.tsx`. Same basename; import `./{module}.view.ts`.

```ts
// components/user.view.ts — TypeScript only
import { editModeUpdate, userSelectedId } from "../hooks/edit-mode";

export function useUserView() {
  const cancelProps = useMemo(
    () => ({ action: "secondary" as const, label: t("cancel"), name: "CircleX" as const, onPress: onCancel }),
    [t],
  );
  const editActionProps = useMemo(
    () => ({
      action: "primary" as const,
      label: t("edit"),
      disabled: !ScreenAccess.value.update,
      onPress: () => editModeUpdate(userSelectedId.value, "edit"),
    }),
    [t],
  );
  return { cancelProps, editActionProps };
}
```

```tsx
// components/user.view.tsx — HTML
import { useUserView } from "./user.view.ts";

export default function UserView() {
  const { cancelProps, editActionProps } = useUserView();
  return (
    <section className="w-full">
      <ArticleLayout>
        <div className="flex justify-between gap-4">
          <h3>{t("userView")}</h3>
          <TypeButton {...cancelProps} />
        </div>
      </ArticleLayout>
      <ContentLayout>
        {!SelectedUser.value ? (
          <div className="skeleton h-40 w-full rounded-lg" />
        ) : (
          <TypeButton {...editActionProps} />
        )}
      </ContentLayout>
    </section>
  );
}
```

---

## Critical rules

| # | Rule |
|---|------|
| 1 | App page: Suspense + Skeleton + `ScreenAccess.value.read` |
| 2 | No auth / no `SCREEN_ACTION` inside list / form / view |
| 3 | `{module}.page` only: `AppStorage.Get(SCREEN_ACTION)` → list / view-{id} / form-{id} / form (new) |
| 4 | Every module has `hooks/{data,types,validation,edit-mode}.ts` + HTTP `hooks/service.{list,save,upload}.ts` + `hooks/service-load.{select}.ts` |
| 5 | HTTP + its signals only in `service.*` / `service-load.{select}.ts`; popup in `edit-mode.ts` |
| 6 | Dropdowns via `AppHttp.Load` → options signals |
| 7 | List/save via `AppHttp.Get` / `Post` with `*IsLoading` signals |
| 8 | UI controls always from `types/` — props via `useMemo` + `{...props}` |
| 9 | ContentLayout JSX stays simple: `<TypeInput {...emailProps} />` |
| 10 | List uses ArticleLayout + GridLayout + FloatLayout |
| 11 | List/form/view/grid live under `components/` — `.ts` logic, `.tsx` HTML, same basename |
| 12 | Form/view use ArticleLayout + ContentLayout |

---

## Checklist

1. `hooks/types.ts` · `data.ts` · `validation.ts` · `edit-mode.ts` · `service.{list,save,upload}.ts` · `service-load.{select}.ts`
2. `{module}.page.tsx` — ScreenAction (`{module}:list` / `view-{id}` / `form-{id}` / `form`) + modal
3. `components/{module}.list.ts` + `{module}.list.tsx` — AgGrid + filter props
4. `components/{module}.form.ts` + `{module}.form.tsx` — useMemo props → Type* spreads
5. `components/{module}.view.ts` + `{module}.view.tsx` — read-only + edit actions
6. `components/{module}.grid.ts` — columnDefs / datasource
7. `app/.../page.tsx` — Suspense + ScreenAccess
