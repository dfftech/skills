---
name: figma
description: >
  DesignForFeature Figma / product UI skill. Shell-layout enterprise SaaS
  screens using Tailwind CSS + daisyUI only (https://daisyui.com/components/).
  Flat persona menus, card lists, modal/drawer CRUD — no tables or nested pages.
---

Design an enterprise SaaS web application with a Shell Layout architecture with responsive design for mobile, tab, laptop and wide screen desktops.

0. UI stack (mandatory)
- Always use **Tailwind CSS** + **daisyUI** for every screen, shell, card, form, and overlay.
- Prefer components from the official catalog: https://daisyui.com/components/
- Map UI needs to daisyUI primitives first (e.g. `navbar`, `drawer`, `menu`, `modal`, `card`, `btn`, `input`, `select`, `toggle`, `badge`, `alert`, `toast`, `skeleton`, `dropdown`, `tabs`, `fieldset`, `checkbox`, `radio`, `file-input`, `loading`, `avatar`, `tooltip`, `join`, `indicator`, `steps`, `pagination`, `progress`, `stat`, `swap`, `collapse` / `accordion`).
- Do not invent custom component kits or alternate UI libraries (no Material, shadcn, Bootstrap, Ant, Chakra, etc.).
- Styling = Tailwind utilities + daisyUI classes/themes only; keep a consistent daisyUI theme across personas.
- When specifying a control in Figma or specs, name the daisyUI component (and link the docs page when helpful).

1. Navigation Structure
- Each Persona must have its own dedicated Side Menu.
- Every Side Menu item represents exactly one URL/page.
- No sub-pages, child pages, nested navigation, breadcrumbs, back pages, or secondary URLs.
- Navigation must remain flat and module-based.
- All navigation must reside within the Shell Component.
- Shell Component remains persistent throughout the application.

2. Page Design Rules
- Each menu link opens a standalone feature/module page.
- Every page represents a complete business capability.
- Do not create separate Create, Add, Edit, View, Details, or Configuration pages.
- All user actions must occur within the current page context.
- Under a page, no additional pages or navigation levels are allowed.

3. CRUD Operations
- Add, Edit, View, Delete actions must use:
- Modal Dialogs
- Right-side Drawers/Panels
- Never navigate to another page for CRUD operations.
- Users remain on the same URL after all actions.
- Forms should open as overlays and close after successful save.

4. Responsive Card-Based Design
- Do NOT use data tables or grids.
- Use responsive cards for displaying records.
- Cards should automatically adapt across:
- Mobile
- Tablet
- Desktop
- Large Desktop
- Cards should support:
- Key Information
- Status Indicators
- Tags
- Action Buttons
- Quick Actions
- Expandable Details
- Support card filtering, searching, sorting, and grouping.

5. Module-Based Architecture
Each page acts as a self-contained module.

Examples:
- Users
- Roles
- MFA
- Audit Logs
- Notifications
- Security Policies
- Integrations
- Settings

Each module contains:
- Page Header
- Search
- Filter Controls
- Responsive Card Collection
- Summary Metrics
- Quick Actions
- Modal Dialogs
- Right-side Edit Panels

6. MFA Module Example
- MFA is a single page and single URL.
- No separate setup or configuration screens.
- MFA Enable/Disable
- MFA Enrollment
- MFA Reset
- MFA Policy Assignment
- MFA Exceptions
- MFA Audit Information

All actions open via:
- Modal Dialogs
- Right-side Drawers

No page transitions allowed.

7. Responsive Design Principles
- Mobile-first design.
- Fully responsive layout.
- Fluid containers.
- Adaptive spacing.
- Responsive typography.
- Flexible card layouts.
- Collapsible side navigation on smaller screens.
- Touch-friendly controls.
- Accessibility compliant.
- Support portrait and landscape orientations.
- Consistent experience across all devices.

8. Shell Component
Persistent application shell includes:
- Top Header
- Persona Selector
- Side Navigation
- Global Search
- Notifications
- User Profile Menu
- Main Content Area

The shell remains visible across all modules.

9. Reusable Components (daisyUI + Tailwind only — https://daisyui.com/components/)
- Responsive Information Cards → `card`
- KPI Cards → `stat` / `card`
- Search / Filter → `input`, `select`, `filter`, `join`, `fieldset`
- Modal Dialogs / Confirmations → `modal`
- Right Drawer Panels → `drawer`
- Toast Notifications → `toast` + `alert`
- Status Chips → `badge` / `status`
- Action Menus → `dropdown` / `menu` / `btn`
- Empty / Loading States → `skeleton` / `loading`
- Shell chrome → `navbar`, `menu`, `drawer`, `avatar`, `tooltip`

10. UX Guidelines
- Minimize navigation.
- Keep users in context.
- Use overlays instead of page transitions.
- Optimize for enterprise productivity.
- Prioritize speed and usability.
- Reduce clicks and navigation depth.
- Ensure consistency across all modules.

11. Visual Style
- Modern enterprise SaaS design.
- Microsoft Admin Center inspired.
- Azure Portal inspired.
- Clean, professional, minimalist UI.
- Card-driven experience.
- Design system = **daisyUI + Tailwind** (https://daisyui.com/components/) — not a parallel custom kit.
- Consistent spacing, typography, colors, and component behavior via daisyUI theme tokens + Tailwind.

Deliverables:
- Persona-based Information Architecture.
- Shell Component Design (daisyUI `navbar` / `drawer` / `menu`).
- Responsive Module Pages.
- Card-based UI instead of tables (`card`, not data tables).
- Modal/Dialog and Drawer interaction patterns (`modal`, `drawer`).
- Mobile, Tablet, Desktop, and Large Screen responsive layouts (Tailwind breakpoints).
- Reusable component usage mapped to daisyUI catalog entries.
