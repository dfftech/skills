---
name: gluestack
description: >
  Expo/React Native + gluestack-ui frontend conventions: app route ScreenAccess/Suspense,
  module page/list/form/view, hooks (data/types/service/validation), AppHttp,
  Type* props via useMemo spread, and gluestack Modal/Drawer edit flow.
  Components: https://gluestack.io/ui/docs/components/all-components
---

# gluestack-ui System Prompt

Stack: Expo Router · [gluestack-ui](https://gluestack.io/ui/docs/components/all-components) · NativeWind · signals · AppHttp · `dff-util` · `types/*`

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
│   ├── service.list.ts               ← one call: list HTTP + list signal
│   ├── service.save.ts               ← one call: save HTTP + save signal
│   ├── service.upload.ts             ← one call: upload HTTP
│   ├── service.status.ts             ← one call per extra action (`service.{call}.ts`)
│   ├── service-load.languages.ts     ← one file per select/load call (`service-load.{select}.ts`)
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

### `dff-util` types / constants / keys / patterns

Use shared `dff-util` exports instead of local duplicates:

```ts
import {
  AppAddDays,
  AppCode,
  AppCodeByType,
  AppDaysBack,
  AppRandomString,
  AppUUID4,
  ConstKeys,
  ConstValue,
  CurrencyConvert,
  DateAndTime,
  DateTime12HrFormat,
  DateTime24HrFormat,
  DecodeBase64,
  DecodeURL,
  EncodeBase64,
  EncodeURL,
  LangCountryCode,
  LangText,
  QueryCond,
  RegExp,
  SafeDecode,
  SafeEncode,
  TimeAgo,
  TruncateText,
  countries,
  languages,
  toCamelCase,
  toEntityMapper,
  toLowerCase,
  toPascalCase,
  toSchemaMapper,
  toSnakeCase,
  toUpperCase,
  toViewMapper,
} from "dff-util";
import type {
  CountryType,
  FileType,
  KeyValueType,
  LangCountryType,
  LangDirType,
  LanguageType,
  OptionType,
  OrderType,
  RequestBodyType,
  RequestByIdType,
  RequestQueryType,
  ResponseType,
  SearchType,
  ThemeType,
} from "dff-util";
```

- Request/response types: `ResponseType`, `SearchType`, `KeyValueType`, `RequestBodyType`, `RequestQueryType`, `RequestByIdType`
- File/options/domain types: `FileType`, `OptionType`, `CountryType`, `LanguageType`, `LangCountryType`, `LangDirType`, `OrderType`, `ThemeType`
- Constants: `ConstValue.ASC`, `ConstValue.DESC`, `ConstValue.LTR`, `ConstValue.RTL`, `ConstValue.LIGHT`, `ConstValue.DARK`, `ConstValue.EMPTY`
- Message keys: use `ConstKeys.*`; common validation keys are `REQUIRED`, `MIN_LENGTH_REQUIRED`, `MAX_LENGTH_EXCEED`, `INVALID_EMAIL`, `INVALID_PHONE`, `FIELD_MUST_BE_NUMERIC`, `FIELD_MUST_BE_ALPHABETIC`, `FIELD_MUST_BE_ALPHANUMERIC`, `PASSWORD_TOO_WEAK`, `INVALID_URL`, `FILE_TOO_LARGE`, `WENT_WRONG`
- Patterns: use `RegExp.EMAIL`, `RegExp.DIGITS_ONLY`, `RegExp.ALPHABETS_ONLY`, `RegExp.ALPHA_NUMERIC`, `RegExp.URL`, `RegExp.PHONE_US`, `RegExp.STRONG_PASSWORD`, `RegExp.DATE_YYYY_MM_DD`, `RegExp.TIME_HH_MM`, `RegExp.ISO_DATETIME`, `RegExp.UUID_V4`, `RegExp.AMOUNT_DECIMAL`, `RegExp.PERCENTAGE`
- Lists and locale helpers: use `countries`, `languages`, `LangCountryCode`, `LangText`, and `CurrencyConvert` for country/language/currency flows instead of hardcoded arrays or ad hoc locale maps
- Utility functions: use `AppUUID4`, `AppRandomString`, `AppCode`, `AppCodeByType`, `AppDaysBack`, `AppAddDays`, `TruncateText`, `DateTime24HrFormat`, `DateTime12HrFormat`, `DateAndTime`, `TimeAgo`, `EncodeBase64`, `DecodeBase64`, `EncodeURL`, `DecodeURL`, `SafeEncode`, `SafeDecode`, `QueryCond`
- Case and mapper helpers: use `toCamelCase`, `toSnakeCase`, `toPascalCase`, `toUpperCase`, `toLowerCase`, `toViewMapper`, `toEntityMapper`, `toSchemaMapper` when converting API/entity/view shapes

Do not create module-local copies of common messages, max length keys, regex patterns, country/language lists, request types, response envelope types, date/text helpers, encoding helpers, query parsers, or case/entity mappers when the project already has `dff-util`. Keep using the project `AppHttp` wrapper for HTTP when it exists; use `dff-util` `Http` only in projects that do not provide an `AppHttp` wrapper or explicitly wrap it.

### `hooks/validation.ts` — form rules only

Messages **always** `ConstKeys.*`; patterns **always** `RegExp.*` when one exists — never raw strings or inline common regexes.

```ts
export const userValidation = {
  name: { required: { value: true, message: ConstKeys.REQUIRED } },
  email: {
    required: { value: true, message: ConstKeys.REQUIRED },
    pattern: { value: RegExp.EMAIL, message: ConstKeys.INVALID_EMAIL },
  },
  phone: {
    required: { value: true, message: ConstKeys.REQUIRED },
    pattern: { value: RegExp.DIGITS_ONLY, message: ConstKeys.INVALID_PHONE },
    minLength: { value: 10, message: ConstKeys.MIN_LENGTH_REQUIRED },
    maxLength: { value: 15, message: ConstKeys.MAX_LENGTH_EXCEED },
  },
  telCode: { required: { value: true, message: ConstKeys.REQUIRED } },
  country: { required: { value: true, message: ConstKeys.REQUIRED } },
  role: { required: { value: true, message: ConstKeys.REQUIRED } },
  languages: { required: { value: true, message: ConstKeys.REQUIRED } },
  password: {
    required: { value: true, message: ConstKeys.REQUIRED },
    pattern: { value: RegExp.STRONG_PASSWORD, message: ConstKeys.PASSWORD_TOO_WEAK },
    minLength: { value: 8, message: ConstKeys.MIN_LENGTH_REQUIRED },
  },
};
```

### `hooks/service.{call}.ts` — one call per service file

`service.*` files contain **one HTTP call + that call's signals only**. Popup / edit mode is `edit-mode.ts` (not a service). Do not group unrelated calls into one service file. If the module has list, save, entity-by-id, status, delete, restore, export, upload, or any other action, create one file per call: `service.list.ts`, `service.save.ts`, `service.entity.ts`, `service.status.ts`, `service.delete.ts`, `service.restore.ts`, `service.export.ts`, `service.upload.ts`, etc. Each dropdown/load call is also isolated as `service-load.{selectName}.ts`.

```ts
// hooks/service.list.ts
export const userListIsLoading = signal(false);

export const userListCall = async (params: SearchType): Promise<ResponseType | undefined> => {
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

export const userSaveCall = async (params: RequestBodyType): Promise<ResponseType | undefined> => {
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
// hooks/service-load.languages.ts — use dff-util languages for static language lists
export const languagesIsLoading = signal(false);
export const languagesOptions = signal<OptionType[]>([]);

export const languagesLoadCall = () => {
  try {
    languagesIsLoading.value = true;
    languagesOptions.value = languages.map((lang) => ({
      label: lang.name,
      value: lang.lang,
      key: lang.lang,
      lang: { locale: lang.locale, dir: lang.dir },
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
// hooks/service-load.country.ts — use dff-util countries for static country lists
export const countryIsLoading = signal(false);
export const countryOptions = signal<OptionType[]>([]);

export const countryLoadCall = () => {
  try {
    countryIsLoading.value = true;
    countryOptions.value = countries.map((country) => ({
      label: country.name,
      value: country.code,
      key: country.code,
      icon: country.flag,
      lang: {
        locale: country.locale,
        currency: country.currency,
        currencyCode: country.currencyCode,
        telCode: String(country.telCode),
      },
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
// hooks/service-load.role.ts — AppHttp.Load for backend-controlled options
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
export const uploadFile = async (file: any): Promise<FileType> => {
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
- Dropdown options from `hooks/service-load.{select}.ts` signals; use `dff-util` `countries` / `languages` for static country/language lists and `AppHttp.Load` only for backend-controlled option sets
- Validation from `hooks/validation.ts` (`ConstKeys` messages and `RegExp` patterns only); defaults from `hooks/data.ts` (`userInitValues` / `getDefaultUser()`)
- Every HTTP action used by form/view/list has its own hook service file; never import a grouped service that contains multiple calls.

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
| 4 | Every module has `hooks/{data,types,validation,edit-mode}.ts` + one `hooks/service.{call}.ts` per HTTP action + one `hooks/service-load.{select}.ts` per load/select action |
| 5 | One call per hook service file: `service.{call}.ts` contains exactly one HTTP action and that action's signals; popup in `edit-mode.ts` |
| 6 | Dropdowns via option signals: `dff-util` `countries` / `languages` for static country/language lists; `AppHttp.Load` for backend-controlled options |
| 7 | List/save via `AppHttp.Get` / `Post` with `*IsLoading` signals and `dff-util` request/response types |
| 8 | UI via `types/*` wrapping gluestack (`components/ui/*`) — `useMemo` + `{...props}` |
| 9 | Prefer official gluestack components from the [docs catalog](https://gluestack.io/ui/docs/components/all-components) |
| 10 | Overlay: gluestack `Modal` / `Drawer` / `Actionsheet` |
| 11 | Layout: `Box` / `VStack` / `HStack` (+ project layouts if present) |
| 12 | List/form/view live under `components/` — `.ts` logic, `.tsx` HTML, same basename — no `grid.ts` |
| 13 | Named exports only (`export function X`). Always `import { X }`. No `export default` / `import X from`. Expo route only: `export { ProfileRoute as default }` |
| 14 | Use `dff-util` for shared constants, messages, patterns, request/response types, files/options/domain types, countries, languages, locale/currency helpers, date/text helpers, encoding helpers, `QueryCond`, and case/entity mappers; do not duplicate them locally |

---

## Checklist

1. `hooks/types.ts` · `data.ts` · `validation.ts` · `edit-mode.ts` · one `service.{call}.ts` per HTTP action · one `service-load.{select}.ts` per load/select action
2. `{module}.page.tsx` — ScreenAction (`{module}:list` / `{module}:view:{id}` / `{module}:form:{id}` / `{module}:form`) + Modal/Drawer
3. `components/{module}.list.ts` + `{module}.list.tsx` — filters + FlatList/skeleton
4. `components/{module}.form.ts` + `{module}.form.tsx` — useMemo props → Type* spreads
5. `components/{module}.view.ts` + `{module}.view.tsx` — read-only + edit actions
6. `app/...` route — Suspense + ScreenAccess
7. Use gluestack primitives only through `types/` or `components/ui/`
