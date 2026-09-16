---
name: gluestack
description: >
  Expo/React Native + gluestack-ui frontend conventions: app route ScreenAccess/Suspense,
  module page/list/form/view, hooks (data/types/service/validation), AppHttp,
  Type* props via useMemo spread, and gluestack Modal/Drawer edit flow.
  Components: https://gluestack.io/ui/docs/components/all-components
---

# gluestack-ui System Prompt

Stack: Expo Router · [gluestack-ui](https://gluestack.io/ui/docs/components/all-components) · NativeWind · signals · AppHttp · `types/*`

UI source of truth: [All Components](https://gluestack.io/ui/docs/components/all-components) — use project wrappers in `types/` (TypeButton, TypeInput, …) which wrap `@/components/ui/*`.

---

## Folder structure

`.ts` = TypeScript only (no JSX). `.tsx` = view / HTML. Same basename as the matching `.tsx` (import `./{module}.list.ts`). No `grid.ts`.

```
app/{module}.tsx  or  app/{module}/index.tsx   ← Suspense + ScreenAccess only
modules/{path}/
├── {module}.page.tsx                 ← list + modal/drawer (no auth) — HTML
├── components/                       ← list + form + view
│   ├── {module}.list.ts              ← list TypeScript
│   ├── {module}.list.tsx             ← list HTML
│   ├── {module}.form.ts              ← form TypeScript (useMemo, handlers)
│   ├── {module}.form.tsx             ← form HTML
│   ├── {module}.view.ts              ← view TypeScript
│   └── {module}.view.tsx             ← view HTML
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
components/ui/   → gluestack primitives (button, input, select, modal, …)
types/           → TypeButton, TypeInput, TypeSelect, TypeSwitch, … (ALWAYS use)
layouts/         → ArticleLayout, ContentLayout, FloatLayout (optional)
```

---

## Prefer these gluestack components

From [gluestack All Components](https://gluestack.io/ui/docs/components/all-components):

| Need | Use |
|------|-----|
| Layout | `Box`, `VStack`, `HStack`, `Center`, `Divider`, `Grid` |
| Text | `Button`, `Input`, `Select`, `Checkbox`, `Radio`, `Switch`, `Textarea`, `FormControl`, `Slider` |
| Feedback | `Alert`, `Toast`, `Spinner`, `Progress`, `Skeleton` |
| Overlay | `Modal`, `Drawer`, `Actionsheet`, `AlertDialog`, `Popover`, `Menu` |
| Display | `Text`, `Heading`, `Card`, `Badge`, `Avatar`, `Image`, `Icon`, `Table`, `Tabs` |

**Always call them through `types/*` wrappers** when a Type* exists (e.g. `TypeButton` → `components/ui/button`). Do not invent raw RN `<TextInput>` / `<Pressable>` for standard forms.

---

## App route (permission + skeleton)

Auth/permission **only** here — never in module pages. No `SCREEN_ACTION` here.

```tsx
// app/profile/index.tsx
"use client";
import { Suspense } from "react";
import { VStack } from "@/components/ui/vstack";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenAccess } from "@/util/app.event";
import { PermissionDenied } from "@/components/PermissionDenied";
import { UserPage } from "@/modules/profiles/users/user.page";

export function ProfileRoute() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      {ScreenAccess.value.read ? <UserPage /> : <PermissionDenied />}
    </Suspense>
  );
}
export { ProfileRoute as default }; // Expo route file only

function SkeletonPage() {
  return (
    <VStack space="md" className="p-4">
      <Skeleton className="h-10 w-1/2 rounded-md" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </VStack>
  );
}
```

---

## Module page (list + Modal / Drawer)

ScreenAction **only here** — never in list / form / view. Read `AppStorage.Get(SCREEN_ACTION)`.

| Action | Result |
|--------|--------|
| `{module}:list` | popup closed |
| `{module}:view:{id}` | open view |
| `{module}:form:{id}` | open form (edit) |
| `{module}:form` (no `:{id}`) | open form (new / add) |

```tsx
// user.page.tsx
import { useEffect } from "react";
import { useSignals } from "@preact/signals-react/runtime";
import { Modal, ModalBackdrop, ModalContent, ModalBody } from "@/components/ui/modal";
import { applyScreenAction, editModeUpdate, userIsEditMode, userIsPopupOpen } from "./hooks/edit-mode";
import { UserForm } from "./components/user.form";
import { UserList } from "./components/user.list";
import { UserView } from "./components/user.view";

export function UserPage() {
  useSignals();
  useEffect(() => { applyScreenAction(); }, []);
  return (
    <>
      <UserList />
      <Modal isOpen={userIsPopupOpen.value} onClose={() => editModeUpdate(undefined)} size="lg">
        <ModalBackdrop />
        <ModalContent className="max-w-4xl w-full h-full m-0 rounded-none">
          <ModalBody className="p-6">
            {userIsEditMode.value ? <UserForm /> : <UserView />}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
```

Prefer gluestack `Modal` / `Drawer` / `Actionsheet` — not web-only daisy classes.

---

## hooks/ — required

### `hooks/types.ts` — types only
### `hooks/data.ts` — init values only

```ts
export const userInitValues: UserType = { id: "", name: "", email: "", /* … */ };
export const getDefaultUser = (): UserType => ({ ...userInitValues });
```

### `hooks/validation.ts` — form rules only

Messages **always** `ConstKeys.*` — never raw strings.

```ts
export const userValidation = {
  name: { required: { value: true, message: ConstKeys.REQUIRED } },
  email: {
    required: { value: true, message: ConstKeys.REQUIRED },
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: ConstKeys.INVALID_EMAIL },
  },
  phone: {
    required: { value: true, message: ConstKeys.REQUIRED },
    minLength: { value: 10, message: ConstKeys.MIN_LENGTH },
    maxLength: { value: 15, message: ConstKeys.MAX_LENGTH },
  },
  telCode: { required: { value: true, message: ConstKeys.REQUIRED } },
  country: { required: { value: true, message: ConstKeys.REQUIRED } },
  role: { required: { value: true, message: ConstKeys.REQUIRED } },
  languages: { required: { value: true, message: ConstKeys.REQUIRED } },
  password: {
    required: { value: true, message: ConstKeys.REQUIRED },
    minLength: { value: 8, message: ConstKeys.MIN_LENGTH },
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
import { AppStorage, SCREEN_ACTION } from "@/util/app.storage";

export const userIsPopupOpen = signal(false);
export const userIsEditMode = signal(false);
export const userSelectedId = signal<string | undefined>(undefined);
export const SelectedUser = signal<UserType | null>(null);

export const applyScreenAction = () => {
  const action = String(AppStorage.Get(SCREEN_ACTION) || "user:list");
  const [, kind, id] = action.split(":");
  if (!kind || kind === "list") {
    editModeUpdate(undefined);
    return;
  }
  if (kind === "view") {
    editModeUpdate(id || undefined);
    return;
  }
  if (kind === "form") {
    if (!id) editModeUpdate(undefined, "add");
    else editModeUpdate(id, "edit");
  }
};

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
    AppStorage.Set(SCREEN_ACTION, mode === "edit" ? `user:form:${id}` : `user:view:${id}`);
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
export const uploadFile = async (file: any) => {
  const fileUploadUrl = await AppHttp.Post("/astropeace-util/s3/upload-url", {
    fileName: file.name || file.fileName,
  });
  await AppHttp.CloudUpload(fileUploadUrl.data.upload, file);
  return { url: fileUploadUrl.data.download, filename: file.name, mimetype: file.type };
};
```

Never raw `fetch` / axios — only `AppHttp`.

---

## Form / view — `useMemo` props → Type* spread

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
    }),
    [t, control, errors.name],
  );

  const cancelProps = useMemo(
    () => ({
      action: "secondary" as const,
      label: t("cancel"),
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

export function UserForm() {
  const { nameProps, telCodeProps, countryProps, roleProps, activeProps, cancelProps } = useUserForm();
  return (
    <VStack space="md" className="w-full">
      <TypeInput {...nameProps} />
      <TypeSelect {...telCodeProps} />
      <TypeSelect {...countryProps} />
      <TypeSelect {...roleProps} />
      <TypeSwitch {...activeProps} />
      <TypeButton {...cancelProps} />
    </VStack>
  );
}
```

Rules:
- Always `types/*` wrappers over gluestack `components/ui/*`
- Dropdown options from `hooks/service-load.{select}.ts` via `AppHttp.Load`
- Validation from `hooks/validation.ts` (`ConstKeys` messages only); defaults from `hooks/data.ts` (`userInitValues` / `getDefaultUser()`)

---

## List page

`components/{module}.list.ts` + `{module}.list.tsx`. No `grid.ts` — use `FlatList`.

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
  const statusProps = useMemo(
    () => ({ name: "status", label: t("status"), onChange: onStatus }),
    [t],
  );
  const reloadProps = useMemo(
    () => ({ action: "secondary" as const, label: t("reload"), onPress: onReload }),
    [t],
  );
  return { searchProps, zodiacSignProps, statusProps, reloadProps, rows, renderItem };
}
```

```tsx
// components/user.list.tsx — HTML
import { useUserList } from "./user.list.ts";

export function UserList() {
  const { searchProps, zodiacSignProps, statusProps, reloadProps, rows, renderItem } = useUserList();
  return (
    <VStack space="md" className="p-4">
      <HStack className="justify-between items-center">
        <Heading>{t("users")}</Heading>
        <HStack space="sm">
          <TypeInput {...searchProps} />
          <TypeSelect {...zodiacSignProps} />
          <TypeSwitch {...statusProps} />
        </HStack>
      </HStack>
      {userListIsLoading.value ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <FlatList data={rows} renderItem={renderItem} keyExtractor={(i) => i.id} />
      )}
      <TypeButton {...reloadProps} />
    </VStack>
  );
}
```

- Open row → `editModeUpdate`
- Status/edit → service calls (`userStatusCall`, `userListCall`)

---

## View page

`components/{module}.view.ts` + `{module}.view.tsx`. Same basename; import `./{module}.view.ts`.

```ts
// components/user.view.ts — TypeScript only
import { editModeUpdate, userSelectedId } from "../hooks/edit-mode";

export function useUserView() {
  const cancelProps = useMemo(
    () => ({ action: "secondary" as const, label: t("cancel"), onPress: onCancel }),
    [t],
  );
  const editActionProps = useMemo(
    () => ({
      action: "primary" as const,
      label: t("edit"),
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

export function UserView() {
  const { cancelProps, editActionProps } = useUserView();
  return (
    <VStack space="md" className="w-full">
      <HStack className="justify-between">
        <Heading size="md">{t("userView")}</Heading>
        <TypeButton {...cancelProps} />
      </HStack>
      {!SelectedUser.value ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : (
        <Card className="p-4">
          <Text>{SelectedUser.value.name}</Text>
          {ScreenAccess.value.update && <TypeButton {...editActionProps} />}
        </Card>
      )}
    </VStack>
  );
}
```

---

## Critical rules

| # | Rule |
|---|------|
| 1 | App route: Suspense + Skeleton + `ScreenAccess.value.read` |
| 2 | No auth / no `SCREEN_ACTION` inside list / form / view |
| 3 | `{module}.page` only: `AppStorage.Get(SCREEN_ACTION)` → `{module}:list` / `{module}:view:{id}` / `{module}:form:{id}` / `{module}:form` |
| 4 | Every module has `hooks/{data,types,validation,edit-mode}.ts` + HTTP `hooks/service.{list,save,upload}.ts` + `hooks/service-load.{select}.ts` |
| 5 | HTTP + its signals only in `service.*` / `service-load.{select}.ts`; popup in `edit-mode.ts` |
| 6 | Dropdowns via `AppHttp.Load` → options signals |
| 7 | List/save via `AppHttp.Get` / `Post` with `*IsLoading` signals |
| 8 | UI via `types/*` wrapping gluestack (`components/ui/*`) — `useMemo` + `{...props}` |
| 9 | Prefer official gluestack components from the [docs catalog](https://gluestack.io/ui/docs/components/all-components) |
| 10 | Overlay: gluestack `Modal` / `Drawer` / `Actionsheet` |
| 11 | Layout: `Box` / `VStack` / `HStack` (+ project layouts if present) |
| 12 | List/form/view live under `components/` — `.ts` logic, `.tsx` HTML, same basename — no `grid.ts` |
| 13 | Named exports only (`export function X`). Always `import { X }`. No `export default` / `import X from`. Expo route only: `export { ProfileRoute as default }` |

---

## Checklist

1. `hooks/types.ts` · `data.ts` · `validation.ts` · `edit-mode.ts` · `service.{list,save,upload}.ts` · `service-load.{select}.ts`
2. `{module}.page.tsx` — ScreenAction (`{module}:list` / `{module}:view:{id}` / `{module}:form:{id}` / `{module}:form`) + Modal/Drawer
3. `components/{module}.list.ts` + `{module}.list.tsx` — filters + FlatList/skeleton
4. `components/{module}.form.ts` + `{module}.form.tsx` — useMemo props → Type* spreads
5. `components/{module}.view.ts` + `{module}.view.tsx` — read-only + edit actions
6. `app/...` route — Suspense + ScreenAccess
7. Use gluestack primitives only through `types/` or `components/ui/`
