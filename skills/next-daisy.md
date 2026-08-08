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

```
app/{module}/page.tsx                 ← Suspense + ScreenAccess only
modules/{path}/
├── {module}.page.tsx                 ← list + modal (no auth)
├── {module}.list.tsx
├── {module}.form.tsx
├── {module}.view.tsx
├── hooks/                            ← REQUIRED (all 4)
│   ├── data.ts                       ← init / default values
│   ├── types.ts                      ← all types
│   ├── service.ts                    ← HTTP + signals + editModeUpdate + upload
│   └── validation.ts                 ← form rules
└── hooks/grid.ts                     ← optional AgGrid columnDefs / datasource
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

```tsx
// user.page.tsx
import { useSignals } from "@preact/signals-react/runtime";
import { editModeUpdate, userIsEditMode, userIsPopupOpen } from "./hooks/service";
import UserForm from "./user.form";
import { UserList } from "./user.list";
import UserView from "./user.view";

export function UserPage() {
  useSignals();
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

### `hooks/service.ts` — signals + AppHttp only

**List / save**

```ts
export const userListIsLoading = signal(false);
export const userSaveIsLoading = signal(false);
export const userIsPopupOpen = signal(false);
export const userIsEditMode = signal(false);
export const userSelectedId = signal<string | undefined>(undefined);
export const SelectedUser = signal<UserType | null>(null);

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

**Dropdowns — always `AppHttp.Load`**

```ts
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
// same pattern: telCodeLoadCall("COUNTRIES_TELECODES"), zodiacSignLoadCall("ZODIAC_SIGNS")
```

**edit / add mode**

```ts
export const editModeUpdate = async (id?: string, mode?: "edit" | "add") => {
  if (mode === "add") {
    SelectedUser.value = {} as UserType;
    userSelectedId.value = undefined;
    userIsEditMode.value = true;
    userIsPopupOpen.value = true;
  } else if (id) {
    userSelectedId.value = id;
    userIsEditMode.value = mode === "edit";
    userIsPopupOpen.value = true;
  } else {
    userSelectedId.value = undefined;
    userIsEditMode.value = false;
    userIsPopupOpen.value = false;
  }
};
```

**Upload**

```ts
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

Build props with `useMemo`, then keep JSX simple:

```tsx
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

// ContentLayout — easy JSX
<ContentLayout>
  <TypeInput {...nameProps} />
  <TypeSelect {...telCodeProps} />
  <TypeList {...langProps} />
  <TypeSwitch {...activeProps} />
  <TypeButton {...cancelProps} />
</ContentLayout>
```

Rules:
- Always use `types/*` (`TypeInput`, `TypeSelect`, `TypeSwitch`, `TypeButton`, `TypeDate`, `TypeList`, …)
- Dropdown options come from `hooks/service` signals filled by `AppHttp.Load`
- Validation from `hooks/validation.ts`; defaults from `hooks/data.ts`

---

## List / grid page

Use layouts: `ArticleLayout` (filters) · `GridLayout` (AgGrid) · `FloatLayout` (actions).

```tsx
<ArticleLayout>
  <aside className="flex justify-between gap-2">
    <h2 className="text-2xl font-bold text-primary">{t("users")}</h2>
    <div className="flex gap-4">
      <TypeSearch {...searchProps} />
      <TypeSelect {...zodiacSignProps} />   {/* options from AppHttp.Load */}
      <TypeSwitch {...userStatusProps} />
    </div>
  </aside>
</ArticleLayout>
<GridLayout>
  <AgGridReact ref={gridRef} columnDefs={columnDefs(t, handleAction)} datasource={dataSource} … />
</GridLayout>
<FloatLayout>
  <TypeButton {...reloadProps} />
</FloatLayout>
```

- Grid helpers in `hooks/grid.ts` (`columnDefs`, `getDataSource`, `gridOptions`)
- Open row → set selected signal + `userIsPopupOpen` / `editModeUpdate`
- Status/edit actions call service methods (`userStatusCall`, etc.)

---

## View page

```tsx
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
      /* read-only fields; edit buttons disabled when !ScreenAccess.value.update */
      <TypeButton {...editActionProps} />
    )}
  </ContentLayout>
</section>
```

---

## Critical rules

| # | Rule |
|---|------|
| 1 | App page: Suspense + Skeleton + `ScreenAccess.value.read` |
| 2 | No auth inside `{module}.page` / list / form / view |
| 3 | Every module has `hooks/{data,types,service,validation}.ts` |
| 4 | HTTP + signals + `editModeUpdate` + upload only in `hooks/service.ts` |
| 5 | Dropdowns via `AppHttp.Load` → options signals |
| 6 | List/save via `AppHttp.Get` / `Post` with `*IsLoading` signals |
| 7 | UI controls always from `types/` — props via `useMemo` + `{...props}` |
| 8 | ContentLayout JSX stays simple: `<TypeInput {...emailProps} />` |
| 9 | List uses ArticleLayout + GridLayout + FloatLayout |
| 10 | Form/view use ArticleLayout + ContentLayout |

---

## Checklist

1. `hooks/types.ts` · `data.ts` · `service.ts` · `validation.ts`
2. `{module}.page.tsx` — list + modal form/view
3. `{module}.list.tsx` — AgGrid + filter props
4. `{module}.form.tsx` — useMemo props → Type* spreads
5. `{module}.view.tsx` — read-only + edit actions
6. `app/.../page.tsx` — Suspense + ScreenAccess
