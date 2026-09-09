# Internationalization Implementation Plan

**Project:** Atlas — Project Operations

**Locales:** English (`en`) and Arabic (`ar`)

**Last reviewed:** September 8, 2026

**Status:** Approved architecture; ready for incremental implementation

## 1. Goal and scope

Add complete English and Arabic localization to Atlas, including locale-aware formatting and a usable right-to-left interface, while keeping the current Vite SPA and TanStack Router routes intact. Add only the small account-preference API and database change needed to persist each authenticated user’s locale.

The first release covers:

- Static interface copy: navigation, headings, labels, buttons, helper text, validation, empty states, and accessibility labels.
- Shared domain labels: project/task/risk/issue statuses, priorities, roles, vault types, and similar enums.
- Dates, times, numbers, percentages, and currencies shown by the client.
- Runtime language switching with a persistent browser preference.
- Account-level locale persistence across browsers, devices, and sessions.
- Correct document language and direction through `<html lang>` and `<html dir>`.
- RTL-safe layout at narrow and wide viewport sizes.
- Tajawal typography for Arabic without a third-party runtime dependency.

The first release does **not** translate user-authored data such as project names, task descriptions, comments, filenames, URLs, or people’s names. Those values remain exactly as entered.

## 2. Current codebase constraints

This plan is based on the current repository rather than on the architecture of another product:

- React 19 and Vite 8 client rendered entirely in the browser.
- TanStack Router with stable, non-localized routes such as `/projects/$projectId` and `/tasks/$taskId`.
- Tailwind CSS 4.3 plus a substantial existing `src/index.css` stylesheet.
- Static English strings throughout `App.tsx`, `src/components/`, and `src/constants.ts`.
- A hardcoded `<html lang="en">` in `index.html`.
- Locale formatting currently varies between hardcoded English, browser defaults, and `en-US`.
- API resources expose ordinary string fields, not `{ en, ar }` localized objects.
- The `users` table and authenticated user response do not yet expose a locale preference.
- API failures currently expose English human-readable `error` strings without stable error codes.
- No frontend unit-test runner is currently configured.

## 3. Decisions

### 3.1 Use React Intl (FormatJS)

Install only `react-intl` as a runtime dependency.

Why:

- It is designed for React and provides one provider, one hook, and declarative formatting components.
- ICU MessageFormat handles Arabic plural categories, selection, interpolation, and rich text without custom grammar.
- It uses the platform `Intl` APIs for date, number, relative-time, list, and display-name formatting.
- Its `intl` object is scoped to the active locale and message catalog, which fits runtime language switching.

Do not install `@types/react-intl`; React Intl ships its own TypeScript definitions. Do not add `react-i18next`, `i18next-icu`, Lingui, or a second i18n runtime.

### 3.2 Use one locale owner

Create one `LocaleProvider` that owns the current locale and renders React Intl’s `IntlProvider`. It also exposes `locale`, `direction`, and `setLocale` through a small context.

Do not create both a standalone React Intl singleton and a separate locale state hook. A global `createIntl()` instance can become stale after a locale switch. React components should use `useIntl()`; a non-React formatter should accept the locale or `IntlShape` explicitly if one is genuinely needed later.

Recommended provider order in `src/router.tsx`:

```tsx
<ThemeProvider>
  <LocaleProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </LocaleProvider>
</ThemeProvider>
```

This makes localized messages available to authentication screens and every routed page.

### 3.3 Persist locale to the authenticated user account

Locale is a personal interface preference, not route state. Persist it on the user record so it follows the user across browsers, devices, and sessions. Keep all existing routes unchanged and do not add `?lang=`, `/en/`, or `/ar/` variants.

Add a nullable `users.preferred_locale` column constrained to `en` or `ar`. `NULL` means the user has not made an explicit choice, allowing browser detection to remain useful for existing and newly invited users.

Add a dedicated authenticated endpoint:

```http
PATCH /api/users/me/preferences
Content-Type: application/json

{ "locale": "ar" }
```

The endpoint must:

- Update only the authenticated user’s allowlisted preference fields.
- Validate the locale against the same supported-locale set used by the product.
- Be idempotent, use a parameterized single-row update, and return the updated preference.
- Remain separate from the admin-only `PATCH /api/users/:id`, which changes organization role and status.

Locale resolution occurs in two stages:

**Before authentication resolves, for the first paint:**

1. Valid `atlas-locale` value in `localStorage`.
2. First supported entry in `navigator.languages`, falling back to `navigator.language`; normalize regional tags such as `ar-SA` to `ar`.
3. English.

**After authentication resolves:**

1. If `preferred_locale` is present, it is authoritative; apply it and refresh the local cache.
2. If it is `NULL`, keep the pre-authentication locale until the user explicitly chooses one.

The local value is a startup cache, while the database is the durable source of truth. This provides a correct first paint without waiting for the API and still synchronizes the preference across devices.

On language selection:

1. Apply locale state, `<html lang>`, `<html dir>`, and the cached value synchronously.
2. Send the preference update in the background without blocking rendering or navigation.
3. Update the authenticated-user/query cache on success; do not refetch unrelated data.
4. Retry a transient failure once. If persistence still fails, keep the selected language active for the current page, show a localized non-blocking warning, and offer retry. The next authenticated session reconciles with the last successfully stored server preference.

Guard against stale mutation results when a user changes the selection rapidly; only the latest selection may update or report status.

Changing language must not navigate, reload, reset search parameters, or refetch locale-independent API data. A `LocaleLink` abstraction remains unnecessary.

### 3.4 Use small, eager, type-checked catalogs

With two locales in an internal SPA, eagerly import both catalogs. Do not add network loading, Suspense, namespace loaders, or locale-based chunks until catalog size produces a measured bundle problem.

Use flat semantic message IDs grouped by feature:

```text
common.save
navigation.projects
project.create.title
task.list.empty
status.project.active
validation.required
```

Keep messages as TypeScript objects:

```typescript
// messages/en.ts
export const enMessages = {
  "common.save": "Save",
  "task.count": "{count, plural, =0 {No tasks} one {# task} other {# tasks}}",
} as const;

export type MessageId = keyof typeof enMessages;

// messages/ar.ts
import type { MessageId } from "./en.js";

export const arMessages = {
  "common.save": "حفظ",
  "task.count":
    "{count, plural, zero {لا توجد مهام} one {مهمة واحدة} two {مهمتان} few {# مهام} many {# مهمة} other {# مهمة}}",
} satisfies Record<MessageId, string>;
```

Augment `FormatjsIntl.Message.ids` with `MessageId` so invalid IDs fail TypeScript checks. The Arabic catalog’s `satisfies` clause provides exact required-key coverage during `npm run typecheck`; also reject extra keys during review.

Do not add `tsx` and a custom key-parity script merely to duplicate TypeScript’s work. If catalogs later move to JSON or a translation-management system, adopt the official `@formatjs/cli` extraction/compile workflow at that point.

English is the source catalog. Arabic copy must be reviewed by a fluent Arabic speaker; key parity cannot validate translation quality.

### 3.5 Localize interface copy, not stored business content

The comparison document’s proposed `{ en, ar }` API fields, `pickLocale()`, and `useLoc()` are rejected for the current product.

Project names, task descriptions, comments, vault content, resource labels, and other user-authored values are not translation resources. Converting every database string into a bilingual object would require schema migrations, new validation and editing workflows, API contract changes, fallback policy, search changes, and ownership rules. It would also force users to enter the same content twice.

Render user-authored content verbatim. In RTL layouts:

- Use `<bdi>` for short unknown-direction values such as names and filenames.
- Use `dir="auto"` for titles, descriptions, comments, and editable free-text fields.
- Keep email addresses, URLs, IDs, and code-like values LTR where that improves readability.

If Atlas later publishes centrally curated content that must exist in several languages, design localization for that specific entity instead of changing all API strings globally.

### 3.6 Treat server errors as an API contract

Frontend-owned validation and state messages are part of the initial translation work. Existing server errors will remain English until the API exposes stable machine-readable error codes.

The long-term API shape should be additive:

```json
{
  "code": "PROJECT_LEAD_REQUIRED",
  "error": "Project lead access is required.",
  "details": {}
}
```

The client can map known `code` values to message IDs and fall back to `error` for unknown or older responses. Never translate errors by comparing their English text. Backend validation and logs should remain locale-neutral; the client owns presentation.

Adding codes to every backend error is a separate cross-repository phase, not a blocker for localizing the main interface.

### 3.7 Format values through the active locale

Replace direct UI calls to hardcoded or implicit locale formatters with `useIntl()`:

- `intl.formatDate()` and `intl.formatTime()` for dates and times.
- `intl.formatRelativeTime()` only where the product truly needs relative time.
- `intl.formatNumber()` for counts, percentages, and decimal values.
- `intl.formatNumber(amount, { style: 'currency', currency })` for money, always using the resource’s real currency code.
- `Intl.Collator(locale)` for visible locale-aware alphabetical sorting when required.

Define a small set of named date/time format presets in the provider only after repeated patterns are identified. Do not introduce a global `utils/format.ts` singleton tied to the default locale.

Formatting does not change the underlying ISO dates, numeric API values, currency codes, or timezone semantics.

Use `en` and `ar` as stable message-catalog keys. For formatting, use explicit Unicode locale extensions so output does not vary by browser defaults:

- English: `en-u-ca-gregory-nu-latn`.
- Arabic: `ar-u-ca-gregory-nu-arab`.

The Arabic default is therefore the Gregorian calendar with Arabic-Indic digits (`٠١٢٣٤٥٦٧٨٩`). Currency still comes from the resource’s ISO currency code. A future country-specific requirement can refine the formatting tag without renaming the `ar` message catalog or changing stored values.

### 3.8 Use Tailwind 4 logical utilities for RTL

Do not install `tailwindcss-rtl`. Tailwind 4.3 already supports direction variants and logical utilities.

For new or touched component styling, prefer logical utilities:

- `ms-*` / `me-*` instead of `ml-*` / `mr-*`.
- `ps-*` / `pe-*` instead of `pl-*` / `pr-*`.
- `inset-s-*` / `inset-e-*` instead of `left-*` / `right-*`.
- `border-s-*` / `border-e-*` and logical rounded-corner utilities.
- `text-start` / `text-end` instead of physical alignment.
- `rtl:*` or `ltr:*` only for behavior that cannot be expressed logically.

For existing selectors in `src/index.css` that control app structure, replace physical declarations with native logical properties when each area is migrated. The sidebar is the first known blocker:

```css
/* Existing structural CSS, converted in place */
.main-content {
  margin-inline-start: 232px;
}
.sidebar {
  inset-block: 0;
  inset-inline-start: 0;
}
```

Do not globally rewrite utility classes under `[dir='rtl']`, reverse every `.flex-row`, or swap all text alignment. Those rules change components that should retain their order and are difficult to reason about.

Only mirror directional icons whose meaning depends on direction, such as back/forward and breadcrumb chevrons. Do not mirror universal symbols such as download, search, add, delete, status, media controls, or external-link icons.

### 3.9 Use self-hosted Tajawal for Arabic

Tajawal is the approved Arabic interface font and is part of the initial implementation, not a later enhancement.

Self-host WOFF2 assets for the weights Atlas uses (`400`, `500`, and `700`) and commit the OFL license alongside them. Do not fetch fonts from Google Fonts or another third-party origin at runtime.

Define the faces once and switch through the existing font design token:

```css
@font-face {
  font-family: "Tajawal";
  src: url("/fonts/tajawal/Tajawal-Regular.v1.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

html[lang="ar"] {
  --font-sans: Tajawal, ui-sans-serif, system-ui, sans-serif;
  font-family: var(--font-sans);
}
```

Add equivalent declarations for weights `500` and `700`. Use versioned local filenames and preload all three from `index.html` with `as="font"`, `type="font/woff2"`, and `crossorigin`. The combined payload is acceptable for two always-available locales and ensures the first switch does not initiate a font download. Configure the production static host to cache the versioned files for a long duration.

The language switch must remain usable if a font asset unexpectedly fails: `font-display: swap` and the system fallback render Arabic immediately, while self-hosting removes the third-party availability risk.

### 3.10 Make language switching available before and after authentication

Use one reusable `LanguageSwitcher` in both places where it is needed:

- On login and invitation-acceptance screens, so a user can choose Arabic before authenticating.
- Beside the existing theme preference in the authenticated sidebar profile controls.

Do not add a second Account-page copy unless user testing shows that preferences need a dedicated settings section. Reuse the current compact select pattern in the sidebar and an equivalent unobtrusive auth-page treatment.

Show language names in their own language:

- English
- العربية

The control needs a translated visible or screen-reader label, keyboard support, and an immediate update without a full-page reload.

The switch handler must not dynamically import catalogs, inject remote stylesheets, wait for the preferences endpoint, or recreate the router/query client. Both message catalogs and Tajawal are ready before interaction; changing locale is an in-memory provider update.

### 3.11 Localize outbound email

The repository already sends invitation, assignment, comment, blocker, status-change, and deadline-reminder emails. Leaving these in English would make the bilingual experience incomplete.

- Render authenticated-user notifications using the recipient’s `preferred_locale`, falling back to English when it is `NULL`.
- Add a constrained `locale` to invitations. Default it to the inviter’s active locale, allow the inviter to choose English or Arabic in the invitation form, and preserve it when resending.
- When an invitation is accepted, initialize the new user’s `preferred_locale` from the invitation locale.
- Keep backend email catalogs/templates independent from React components; do not import client files into the server.
- Localize the subject, body, action label, status wording, and date/number formatting while preserving user-authored names, project titles, task titles, and comments verbatim with safe escaping and bidi isolation.
- Record the chosen locale when the email is rendered/enqueued so retries produce the same content.

## 4. Proposed files

Create only the following foundation files:

```text
src/i18n/
├── locale.ts                 # Locale type, supported locale metadata, resolver
├── locale-context.ts         # Context declaration
├── LocaleProvider.tsx        # State, persistence, DOM synchronization, IntlProvider
├── useLocale.ts              # Guarded context hook
└── messages/
    ├── en.ts                 # English source catalog + MessageId
    └── ar.ts                 # Arabic catalog with type-enforced parity
src/components/
└── LanguageSwitcher.tsx
public/fonts/tajawal/
├── Tajawal-Regular.v1.woff2
├── Tajawal-Medium.v1.woff2
├── Tajawal-Bold.v1.woff2
└── OFL.txt
```

Do not create `LocaleLink.tsx`, `useLoc.ts`, `lib/localized.ts`, a custom validation script, or a global mutable formatter.

The persistence change also touches the existing server boundaries rather than creating a separate preference subsystem:

```text
sindyan-atlas-server/src/db/migrate.ts
sindyan-atlas-server/src/db/repositories/user.repository.ts
sindyan-atlas-server/src/db/repositories/session.repository.ts
sindyan-atlas-server/src/services/user.service.ts
sindyan-atlas-server/src/controllers/user.controller.ts
sindyan-atlas-server/src/routes/user.routes.ts
sindyan-atlas-server/src/types/auth.ts
```

Email localization additionally updates the existing invitation repository/service, task-notification service, and email templates. Add invitation locale through its own next sequential migration if it is not shipped in the same migration as `preferred_locale`.

## 5. Implementation sequence

Ship this incrementally in reviewable slices. Do not expose Arabic in production while major routes still contain untranslated interface copy.

### Phase 1 — Foundation

1. Install `react-intl` and update the lockfile.
2. Add supported locale metadata, locale resolution, context, and provider.
3. Wrap the root application with `LocaleProvider`.
4. Synchronize `document.documentElement.lang` and `.dir` whenever locale changes.
5. Localize `document.title` and any other user-visible document metadata.
6. Extend the existing small `index.html` bootstrap script to apply the stored/browser locale before React paints, avoiding an initial LTR flash for Arabic.
7. Add self-hosted Tajawal WOFF2 assets, license, `@font-face` declarations, and preload hints.
8. Add the next sequential migration for nullable, constrained `users.preferred_locale`; do not edit only the base `CREATE TABLE` definition.
9. Return `preferred_locale` in authenticated-user responses and add `PATCH /api/users/me/preferences`.
10. Add the language switcher to authentication screens and the sidebar using the optimistic persistence flow for authenticated users.
11. Add typed English and Arabic catalogs with a small smoke-test set of messages.

Storage access must be guarded so restricted browser environments fall back to English rather than preventing the application from rendering.

### Phase 2 — Shared vocabulary and primitives

1. Change `Option.label` and `NavItem.label` in `src/constants.ts` to typed `messageId` fields.
2. Localize `Sidebar`, `StatusBadge`, `TaskStatusSelect`, `FilterBar`, `SummaryBar`, `PaginationControls`, `PageHeader`, `PageState`, `EmptyState`, `ConfirmDialog`, and shared buttons.
3. Localize validation messages and accessible names owned by those components.
4. Replace repeated status/priority formatting with one shared message-ID mapping.
5. Verify English before/after behavior remains equivalent.

### Phase 3 — Pages by vertical slice

Migrate complete user journeys instead of translating disconnected strings:

1. Authentication, invitation acceptance, Account, and Not Found.
2. Dashboard and Projects, including project creation/editing.
3. Tasks and task detail, including comments and status actions.
4. Risks and issues.
5. Team, member detail, allocations, capacity, and availability.
6. Resources and finance.
7. Vault, including upload/review/viewer states.

For each slice, translate page copy, dialogs, loading/empty/error states, tooltips, placeholders, confirmation text, and ARIA labels together.

Avoid sentence fragments assembled in JSX. Use one ICU message with named values so translators can reorder the complete sentence.

### Phase 4 — Formatting and bidirectional content

1. Replace the known hardcoded formatters in `utils/project.ts`, `TaskPage.tsx`, `ProjectPage.tsx`, `ResourcesPage.tsx`, `AllocationModal.tsx`, and `InvitationsPage.tsx`.
2. Audit every date, time, count, percentage, budget, and currency display.
3. Add `<bdi>` or `dir="auto"` at user-content boundaries.
4. Confirm form input direction remains practical for Arabic, English, email addresses, URLs, and mixed content.

### Phase 5 — RTL layout audit

1. Convert the sidebar and main-content offset to logical positioning.
2. Audit breadcrumbs, drawers, menus, dialog placement, tables, kanban boards, pagination, form adornments, toasts, and the vault viewer.
3. Replace physical Tailwind utilities in touched components with logical equivalents.
4. Mirror only semantic directional icons.
5. Test narrow and wide layouts in both themes and both locales.

### Phase 6 — Stable API error codes before Arabic release

This is a separate cross-repository slice, but it is a release requirement rather than post-launch cleanup. Otherwise common Arabic workflows would still display English server failures.

1. Define a documented error-code naming convention and a shared client union generated or maintained from the API contract.
2. Add `code` without removing the existing `error` field.
3. Teach `ApiError` to retain `code` and structured details.
4. Translate common actionable error codes; retain the server message as a compatibility fallback.
5. Cover authentication, authorization, validation, conflict, and unavailable-service cases first.

### Phase 7 — Localized email notifications

1. Add and validate invitation locale, including resend and acceptance behavior.
2. Pass recipient locale into task-notification rendering.
3. Add English and Arabic email copy with locale-aware formatting and RTL-safe HTML layout.
4. Keep user-authored content escaped, verbatim, and bidi-isolated.
5. Extend the existing deterministic email-template tests to cover both locales.

## 6. Translation rules

- Use semantic, stable IDs; do not use full English sentences as keys.
- Keep placeholders named by meaning: `{projectName}`, `{count}`, `{dueDate}`.
- Keep a complete sentence in one message when word order may change.
- Use ICU `plural` categories rather than manual singular/plural conditionals.
- Always include `other` in `plural` and `select` messages.
- Use `=0` only when the zero wording is intentionally special; do not substitute `=1` for the locale’s `one` category.
- Do not place HTML in catalog strings. Use React Intl rich-text placeholders for the rare message that needs markup.
- Do not translate database enum values, route paths, query keys, API field names, telemetry identifiers, or permission names. Translate only their displayed labels.
- Do not translate brand names, people’s names, email addresses, URLs, file extensions, or source filenames.
- Add translator context in a nearby comment when an English term is ambiguous.
- Prefer concise Arabic UI copy that fits the established compact layout; do not solve overflow by shrinking text below design standards.

## 7. Verification and acceptance criteria

For every completed slice:

- English and Arabic contain the same typed message IDs.
- Switching language updates visible copy immediately and persists after reload.
- A successfully saved locale follows the authenticated user in a fresh browser profile or on another device.
- The preference endpoint accepts only `en` or `ar`, cannot modify another user, and is safe to retry.
- Reloading directly into Arabic sets `lang="ar"` and `dir="rtl"` before the app becomes visible.
- Switching locale does not wait for an API response, reload the page, recreate the router, or refetch unrelated data.
- The new locale, document direction, and font family are committed by the next browser paint without a loading state.
- Tajawal is already cached before the user switches to Arabic; switching triggers no font or catalog network request.
- A preference-save failure is visible, retryable, and does not leave stale mutation results in control of the UI.
- Login and invitation-acceptance screens can switch language before a session exists.
- English retains the current LTR layout and behavior.
- Arabic has no clipped controls, overlapping text, off-screen menus, or incorrect fixed positioning.
- Navigation order and reading order are logical with keyboard and screen reader use.
- User-authored English, Arabic, and mixed-direction content remains readable.
- Dates, numbers, percentages, and currencies use the active locale without changing stored values.
- Arabic plural messages are checked with `0`, `1`, `2`, `3`, `11`, and `100`.
- Arabic formatting uses the Gregorian calendar and Arabic-Indic digits consistently.
- User notifications use the recipient’s locale, and invitation emails use the invitation’s stored locale.
- Missing-message and malformed-ICU errors observed during development or the locale test matrix are treated as release failures, not suppressed.
- Both light and dark themes work at narrow and wide viewport sizes.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.

The repository has no frontend test runner today. Do not add one solely to satisfy this plan. When a frontend test framework is introduced, add focused tests for locale resolution, persistence, message fallback, pluralization, and the language switcher.

## 8. Product policies made explicit

These were previously implicit or ambiguous and are now part of the plan:

| Area                  | Decision                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Arabic formatting     | Generic Arabic catalog, Gregorian calendar, and Arabic-Indic digits.                                   |
| Locale persistence    | User account is durable; local storage is the fast startup cache.                                      |
| Switcher placement    | Authentication screens and authenticated sidebar.                                                      |
| Server errors         | Stable error codes and Arabic mappings are required before Arabic release.                             |
| Email notifications   | Localize by recipient/invitation locale as part of the rollout.                                        |
| User-authored content | Preserve verbatim; do not automatically translate or require duplicate entry.                          |
| Routes                | Keep stable and language-neutral; locale is not URL state.                                             |
| Arabic rollout        | Do not expose Arabic as complete until all primary journeys and failure states pass the locale matrix. |

## 9. Deliberately deferred capabilities

These items have concrete adoption triggers rather than an unspecified “later” status:

| Capability                                 | Why it is not needed now                                                                | Adopt when                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Locale-prefixed routes or query parameters | Atlas is an authenticated SPA and locale is an account preference.                      | Public/SEO pages or shareable links must force a specific language.                                |
| Localized database content                 | Current project/task/resource text is authored by users, not centrally translated copy. | A specific curated entity has an approved multilingual authoring and search workflow.              |
| Automatic or machine translation           | It creates quality, confidentiality, cost, and review-policy requirements.              | Product approves providers, data handling, human review, and fallback behavior.                    |
| Lazy-loaded locale bundles                 | Two eager catalogs make switching faster and remain operationally simple.               | Bundle analysis shows catalogs materially affect startup performance.                              |
| Translation-management platform            | There is no external translation workflow to integrate yet.                             | Multiple translators, more locales, or release coordination makes Git-based catalogs a bottleneck. |
| FormatJS extraction/compile pipeline       | Typed central catalogs are sufficient for the initial two-locale implementation.        | Messages move inline/JSON, TMS integration begins, or manual ICU validation becomes unreliable.    |
| Pseudolocalization                         | Real Arabic already exercises RTL and expansion, and no visual test harness exists.     | Automated visual regression or additional LTR locales make synthetic coverage valuable.            |

External font hosting and an RTL Tailwind plugin are rejected, not deferred: Tajawal is self-hosted, and Tailwind 4.3 already provides logical utilities and direction variants.

## 10. Decision record

| Decision                                         | Outcome                     | Reason                                                                                          |
| ------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------------------------------- |
| React Intl / FormatJS                            | Adopt                       | React-focused, ICU-native, and sufficient without plugins.                                      |
| English + Arabic catalogs                        | Adopt                       | Explicit product scope.                                                                         |
| Typed flat TypeScript catalogs                   | Adopt                       | Simple key parity and autocomplete with current tooling.                                        |
| Eager catalog loading                            | Adopt                       | Two small locales do not justify async loading complexity.                                      |
| Account-level locale persistence                 | Adopt                       | Locale is a durable user preference and must follow authenticated users across devices.         |
| Local locale cache                               | Adopt                       | Provides the correct first paint without delaying startup on authentication.                    |
| Optimistic preference update                     | Adopt                       | Makes switching immediate while retaining durable server persistence.                           |
| Tailwind/native logical properties               | Adopt                       | Built into the installed Tailwind version and browser platform.                                 |
| Stable API error codes                           | Adopt before Arabic release | Required for reliable localized server errors.                                                  |
| Localized outbound email                         | Adopt                       | Existing notifications are user-facing product surfaces.                                        |
| Arabic Gregorian calendar + Arabic-Indic digits  | Adopt                       | Makes formatting deterministic instead of relying on browser defaults.                          |
| `{ en, ar }` for all API text                    | Reject                      | User-authored content is not static translation content.                                        |
| `pickLocale()` / `useLoc()`                      | Reject for current model    | No localized-object API fields exist or are required.                                           |
| Locale-aware links and URL prefixes              | Reject                      | Locale is not part of Atlas route identity.                                                     |
| `tailwindcss-rtl`                                | Reject                      | Tailwind 4.3 already provides the needed capabilities.                                          |
| Global RTL class rewrites                        | Reject                      | They are broad, fragile, and reverse components indiscriminately.                               |
| Self-hosted Tajawal (`400`, `500`, `700`)        | Adopt                       | Confirmed Arabic font with reliable, immediate switching and no third-party runtime dependency. |
| Preload Tajawal and eagerly bundle both catalogs | Adopt                       | Two locales are small and switch latency is more important than marginal deferred loading.      |
| Custom parity script plus `tsx`                  | Reject                      | TypeScript can enforce catalog coverage without another tool.                                   |

## 11. Primary references

- [React Intl installation](https://formatjs.github.io/docs/getting-started/installation/)
- [React Intl provider and formatting components](https://formatjs.github.io/docs/react-intl/components/)
- [React Intl imperative API and locale lifecycle](https://formatjs.github.io/docs/react-intl/api/)
- [FormatJS ICU message syntax](https://formatjs.github.io/docs/core-concepts/icu-syntax/)
- [FormatJS TypeScript message-ID typing](https://formatjs.github.io/docs/react-intl/)
- [FormatJS CLI, if extraction becomes necessary](https://formatjs.github.io/docs/tooling/cli/)
- [Tailwind logical margin utilities](https://tailwindcss.com/docs/margin)
- [Tailwind RTL/LTR variants](https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support)
- [Tailwind logical inset utilities](https://tailwindcss.com/docs/top-right-bottom-left#using-logical-properties)
- [Tajawal source and OFL license](https://github.com/googlefonts/tajawal)

`I18N_COMPARISON.md` remains useful background material, but its Naspire-specific recommendations are not requirements for Atlas. This document is the implementation source of truth.
