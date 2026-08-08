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

```
app/{module}.tsx  or  app/{module}/index.tsx   ← Suspense + ScreenAccess only
modules/{path}/
├── {module}.page.tsx                 ← list + modal/drawer (no auth)
├── {module}.list.tsx
├── {module}.form.tsx
├── {module}.view.tsx
└── hooks/                            ← REQUIRED (all 4)
    ├── data.ts                       ← init / default values
    ├── types.ts                      ← all types
    ├── service.ts                    ← HTTP + signals + editModeUpdate + upload
    └── validation.ts                 ← form rules
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

Auth/permission **only** here — never in module pages.

```tsx
// app/profile/index.tsx
"use client";
import { Suspense } from "react";
import { VStack } from "@/components/ui/vstack";
import { Skeleton } from "@/components/ui/skeleton";
import { ScreenAccess } from "@/util/app.event";
import PermissionDenied from "@/components/PermissionDenied";
import { UserPage } from "@/modules/profiles/users/user.page";

export default function ProfileRoute() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      {ScreenAccess.value.read ? <UserPage /> : <PermissionDenied />}
    </Suspense>
  );
}

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

```tsx
// user.page.tsx
import { useSignals } from "@preact/signals-react/runtime";
import { Modal, ModalBackdrop, ModalContent, ModalBody } from "@/components/ui/modal";
import { editModeUpdate, userIsEditMode, userIsPopupOpen } from "./hooks/service";
import UserForm from "./user.form";
import { UserList } from "./user.list";
import UserView from "./user.view";

export function UserPage() {
  useSignals();
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

### `hooks/data.ts` · `hooks/types.ts` · `hooks/validation.ts`

```ts
// data.ts
export const userInitValues: UserType = { id: "", name: "", email: "", /* … */ };
export const getDefaultUser = (): UserType => ({ ...userInitValues });

// validation.ts
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
```

**editModeUpdate · upload**

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

```tsx
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

// Keep ContentLayout / VStack JSX simple
<VStack space="md" className="w-full">
  <TypeInput {...nameProps} />
  <TypeSelect {...telCodeProps} />      {/* options from AppHttp.Load */}
  <TypeSwitch {...activeProps} />
  <TypeButton {...cancelProps} />
</VStack>
```

Rules:
- Always `types/*` wrappers over gluestack `components/ui/*`
- Dropdown options from `hooks/service` via `AppHttp.Load`
- Defaults from `hooks/data.ts`; rules from `hooks/validation.ts`

---

## List page

```tsx
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
```

- Open row → `editModeUpdate(id)` / set `SelectedUser` + popup signals
- Status/edit → service calls (`userStatusCall`, `userListCall`)

---

## View page

```tsx
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
```

---

## Critical rules

| # | Rule |
|---|------|
| 1 | App route: Suspense + Skeleton + `ScreenAccess.value.read` |
| 2 | No auth inside `{module}.page` / list / form / view |
| 3 | Every module has `hooks/{data,types,service,validation}.ts` |
| 4 | HTTP + signals + `editModeUpdate` + upload only in `hooks/service.ts` |
| 5 | Dropdowns via `AppHttp.Load` → options signals |
| 6 | List/save via `AppHttp.Get` / `Post` with `*IsLoading` signals |
| 7 | UI via `types/*` wrapping gluestack (`components/ui/*`) — `useMemo` + `{...props}` |
| 8 | Prefer official gluestack components from the [docs catalog](https://gluestack.io/ui/docs/components/all-components) |
| 9 | Overlay: gluestack `Modal` / `Drawer` / `Actionsheet` |
| 10 | Layout: `Box` / `VStack` / `HStack` (+ project layouts if present) |

---

## Checklist

1. `hooks/types.ts` · `data.ts` · `service.ts` · `validation.ts`
2. `{module}.page.tsx` — list + Modal/Drawer form/view
3. `{module}.list.tsx` — filters + list/skeleton
4. `{module}.form.tsx` — useMemo props → Type* spreads
5. `{module}.view.tsx` — read-only + edit actions
6. `app/...` route — Suspense + ScreenAccess
7. Use gluestack primitives only through `types/` or `components/ui/`
