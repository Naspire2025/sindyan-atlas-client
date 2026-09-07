# Internationalization (i18n) Implementation Plan

**Project:** Atlas — Project Operations  
**Date:** September 7, 2026  
**Target Languages:** English (en) + Arabic (ar)  
**Status:** Draft for Review

---

## Executive Summary

Atlas currently has no internationalization support — all UI text is hardcoded in English. This document outlines a plan to add bilingual support (English + Arabic) with proper RTL (Right-to-Left) layout handling for Arabic.

**Primary Recommendation:** Use `react-intl` (FormatJS) instead of `react-i18next` for better long-term compatibility, industry-standard ICU message format, and built-in date/number formatting.

---

## Current State Analysis

### What Exists Today

- **38 React components** with hardcoded English strings
- **No i18n library** installed or configured
- **No translation files** or locale configuration
- **Inconsistent date/number formatting:**
  - `utils/project.ts:42` — `new Intl.DateTimeFormat('en', ...)`
  - `TaskPage.tsx:301` — `new Intl.DateTimeFormat('en', ...)`
  - `ProjectPage.tsx:2364` — `new Intl.NumberFormat("en-US", ...)`
  - `ResourcesPage.tsx:431` — `new Intl.NumberFormat(undefined, ...)`
  - `InvitationsPage.tsx:129` — `.toLocaleDateString()`
- **Centralized status/priority constants** in `src/constants.ts` (good foundation)
- **Hardcoded `<html lang="en">`** in `index.html`

### Components Requiring Translation

| Category | Components | Lines |
|----------|------------|-------|
| **Pages** | ProjectPage, ResourcesPage, VaultPage, TaskPage, DashboardPage, MemberPage, InvitationsPage, MilestonePage, RiskPage, RisksIssuesPage, IssuePage, TeamDirectoryPage, AccountPage, TasksPage, ProjectsPage, TeamPage, NotFoundPage | ~6,500+ |
| **Modals** | AllocationModal, AvailabilityModal, CapacityProfileModal, PhaseModal, NewProjectModal, EditBudgetModal, IssueDialog | ~1,000+ |
| **Shared UI** | Sidebar, Header, StatusBadge, TaskStatusSelect, FilterBar, SummaryBar, PageState, EmptyState, Button, PaginationControls, ConfirmDialog, PageHeader, DetailList, ProjectTable | ~500+ |

---

## Library Comparison Analysis

### Options Evaluated

| Library | Message Format | Bundle Size | Ecosystem | RTL Support | Arabic Pluralization |
|---------|---------------|-------------|-----------|-------------|---------------------|
| **react-intl (FormatJS)** | ICU (industry standard) | ~13-17KB | Large | ✅ | ✅ (6 forms) |
| **react-i18next** | Custom (non-standard) | ~18-25KB | Largest | ✅ | ✅ (via suffixes) |
| **LinguiJS** | ICU (compile-time) | ~3-5KB | Moderate | ✅ | ✅ (6 forms) |
| **next-intl** | ICU | ~14KB | Growing | ✅ | ✅ (6 forms) |

### 2026 Industry Consensus

From authoritative comparisons (auto18n, DEV.to, PkgPulse, Tolgee):

> "ICU MessageFormat is the industry standard. It's used in Java, PHP, Android, and iOS. For platform compatibility as you scale, ICU-based libraries are safer than react-i18next's custom format."

> "react-intl is simple and safe for smaller codebases. It's super simple, well supported by localization platforms, and has a big community."

> "react-i18next has the largest ecosystem, but its custom format can cause platform-compatibility pain later."

---

## Recommendation: react-intl (FormatJS)

### Why react-intl Wins for This Project

| Factor | react-intl Advantage |
|--------|---------------------|
| **Message Format** | ICU = industry standard, transfers across platforms (Java, iOS, Android) |
| **Arabic Pluralization** | Native 6-form support: `{count, plural, zero {...} one {...} two {...} few {...} many {...} other {...}}` |
| **Built-in Formatting** | `FormattedDate`, `FormattedNumber`, `FormattedCurrency` — solves inconsistent `Intl` usage |
| **Simpler API** | No plugin architecture, no `i18next-scanner`, no configuration overhead |
| **Bundle Size** | ~13-17KB vs ~18-25KB for react-i18next |
| **Platform Compatibility** | Works with Crowdin, Lokalise, Phrase, and other TMS platforms |
| **Long-term Safety** | If you switch libraries, ICU knowledge transfers |

### When react-i18next Would Be Better

- Need lazy-loading of large translation files (not our case — 2 languages, small app)
- Sharing i18n logic between React and non-React code (not our case)
- Need maximum plugin ecosystem (not our case)

---

## Technical Architecture

> **Enhanced with patterns from naspire-client production implementation**

### Directory Structure

```
sindyan-atlas-client/
├── src/
│   ├── i18n/
│   │   ├── index.ts                    # react-intl configuration
│   │   ├── locale-resolver.ts          # Locale detection logic (from naspire)
│   │   ├── messages/
│   │   │   ├── en.ts                   # English translations
│   │   │   └── ar.ts                   # Arabic translations
│   │   └── types.ts                    # TypeScript interfaces
│   ├── lib/
│   │   └── localized.ts               # pickLocale() for API content (from naspire)
│   ├── hooks/
│   │   ├── useLocale.ts               # Locale context hook
│   │   └── useLoc.ts                  # Dynamic content hook (from naspire)
│   ├── components/
│   │   ├── LanguageSwitcher.tsx        # Language selector component
│   │   └── LocaleLink.tsx             # Locale-aware links (from naspire)
│   └── utils/
│       └── format.ts                  # Centralized formatting (uses react-intl)
├── scripts/
│   └── validate-i18n.ts               # CI validation script (from naspire)
```

### Core Configuration (`src/i18n/index.ts`)

```typescript
import { createIntl, createIntlCache } from 'react-intl';
import en from './messages/en';
import ar from './messages/ar';

export const locales = {
  en: { label: 'English', dir: 'ltr', messages: en },
  ar: { label: 'العربية', dir: 'rtl', messages: ar },
};

export const defaultLocale = 'en';

export type Locale = keyof typeof locales;

// Create intl instance for non-React contexts
const intlCache = createIntlCache();
export const intl = createIntl(
  {
    locale: defaultLocale,
    messages: locales[defaultLocale].messages,
  },
  intlCache
);
```

### Translation Files

**English (`src/i18n/messages/en.ts`)**

```typescript
export default {
  // Navigation
  'nav.overview': 'Overview',
  'nav.projects': 'Projects',
  'nav.myTasks': 'My tasks',
  'nav.risksIssues': 'Risks & issues',
  'nav.team': 'Team',
  'nav.invitations': 'Invitations',
  'nav.resources': 'Resources',
  'nav.secureVault': 'Secure vault',

  // Project Statuses
  'status.planning': 'Planning',
  'status.active': 'Active',
  'status.onHold': 'On hold',
  'status.blocked': 'Blocked',
  'status.completed': 'Completed',
  'status.cancelled': 'Cancelled',

  // Task Statuses
  'status.todo': 'To do',
  'status.inProgress': 'In progress',
  'status.reviewing': 'In review',
  'status.reviewed': 'Reviewed',
  'status.done': 'Done',

  // Priorities
  'priority.critical': 'Critical',
  'priority.high': 'High',
  'priority.medium': 'Medium',
  'priority.low': 'Low',

  // Common Actions
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.search': 'Search',
  'common.filter': 'Filter',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.next': 'Next',

  // Pluralization Example
  'tasks.count': '{count, plural, =0 {No tasks} one {# task} other {# tasks}}',

  // Date/Number Formatting (ICU)
  'date.createdAt': 'Created {date, date, medium}',
  'project.budget': 'Budget: {amount, number, currency}',
} as const;
```

**Arabic (`src/i18n/messages/ar.ts`)**

```typescript
export default {
  // Navigation
  'nav.overview': 'نظرة عامة',
  'nav.projects': 'المشاريع',
  'nav.myTasks': 'مهامي',
  'nav.risksIssues': 'المخاطر والمشاكل',
  'nav.team': 'الفريق',
  'nav.invitations': 'الدعوات',
  'nav.resources': 'الموارد',
  'nav.secureVault': 'الخزينة الآمنة',

  // Project Statuses
  'status.planning': 'التخطيط',
  'status.active': 'نشط',
  'status.onHold': 'معلق',
  'status.blocked': 'محظور',
  'status.completed': 'مكتمل',
  'status.cancelled': 'ملغي',

  // Task Statuses
  'status.todo': 'للعمل',
  'status.inProgress': 'قيد التنفيذ',
  'status.reviewing': 'قيد المراجعة',
  'status.reviewed': 'تمت المراجعة',
  'status.done': 'تم',

  // Priorities
  'priority.critical': 'حرج',
  'priority.high': 'عالي',
  'priority.medium': 'متوسط',
  'priority.low': 'منخفض',

  // Common Actions
  'common.loading': 'جاري التحميل...',
  'common.error': 'خطأ',
  'common.save': 'حفظ',
  'common.cancel': 'إلغاء',
  'common.delete': 'حذف',
  'common.edit': 'تعديل',
  'common.create': 'إنشاء',
  'common.search': 'بحث',
  'common.filter': 'تصفية',
  'common.confirm': 'تأكيد',
  'common.back': 'رجوع',
  'common.next': 'التالي',

  // Pluralization (Arabic has 6 forms)
  'tasks.count': '{count, plural, =0 {لا توجد مهام} zero {# مهمة} one {# مهمة} two {مهمتان} few {# مهمات} many {# مهمة} other {# مهمة}}',

  // Date/Number Formatting
  'date.createdAt': 'أنشئ في {date, date, medium}',
  'project.budget': 'الميزانية: {amount, number, currency}',
} as const;
```

---

## Implementation Plan

### Phase 1: Foundation (Day 1)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Install `react-intl` | 5 min | `npm install react-intl @types/react-intl` |
| Create `src/i18n/` directory structure | 15 min | Directory + index.ts |
| Create English translation file | 30 min | `messages/en.ts` with ~100 keys |
| Create Arabic translation file | 30 min | `messages/ar.ts` with ~100 keys |
| Wrap app in `IntlProvider` | 15 min | Update `main.tsx` |
| Test basic language switching | 15 min | Verify translations render |

**Total Phase 1:** ~1.5 hours

### Phase 2: Core Components (Days 2-3)

| Task | Effort | Components |
|------|--------|------------|
| Add LanguageSwitcher component | 30 min | `LanguageSwitcher.tsx` |
| Update Sidebar navigation | 1 hour | `Sidebar.tsx` |
| Update StatusBadge + TaskStatusSelect | 1 hour | Status display components |
| Update FilterBar + SummaryBar | 1 hour | Shared UI |
| Update ProjectPage (largest) | 3 hours | Main project view |
| Update TaskPage + TasksPage | 2 hours | Task management |
| Update DashboardPage | 1 hour | Overview dashboard |

**Total Phase 2:** ~9.5 hours

### Phase 3: Modals & Remaining Pages (Days 4-5)

| Task | Effort | Components |
|------|--------|------------|
| Update all modals | 3 hours | AllocationModal, PhaseModal, etc. |
| Update remaining pages | 4 hours | Resources, Vault, Team, etc. |
| Update error/empty states | 1 hour | PageState, EmptyState |

**Total Phase 3:** ~8 hours

### Phase 4: RTL & Formatting (Day 6)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Add RTL support | 1 hour | Dynamic `dir` attribute + Tailwind RTL |
| Install `tailwindcss-rtl` | 15 min | `npm install tailwindcss-rtl` |
| Update CSS utilities | 2 hours | `ml-4` → `ms-4`, etc. |
| Centralize date/number formatting | 1 hour | Replace inconsistent `Intl` usage |
| Update `index.html` lang attribute | 15 min | Dynamic `lang` + `dir` |

**Total Phase 4:** ~4.5 hours

### Phase 5: Testing & Polish (Day 7)

| Task | Effort | Deliverable |
|------|--------|-------------|
| Test Arabic RTL layout | 2 hours | Visual verification |
| Test pluralization | 1 hour | Edge cases |
| Test date/number formatting | 1 hour | Locale-aware formatting |
| Add language persistence | 30 min | localStorage |
| Run lint + build | 30 min | `npm run lint && npm run build` |

**Total Phase 5:** ~5 hours

---

## Summary

| Phase | Hours | Cumulative |
|-------|-------|------------|
| Phase 1: Foundation | 1.5 | 1.5 |
| Phase 2: Core Infrastructure (Enhanced) | 3.25 | 4.75 |
| Phase 3: Core Components | 9 | 13.75 |
| Phase 4: Modals & Pages | 8 | 21.75 |
| Phase 5: RTL & Formatting (Enhanced) | 6 | 27.75 |
| Phase 6: Testing & Polish | 5.5 | 33.25 |

**Total Estimated Effort:** ~33-35 hours (1+ week full-time)

> **+5 hours vs. original plan** due to adopted naspire-client patterns (two-layer translations, CI validation, comprehensive RTL, locale fonts, LocaleLink). Worth the investment for production quality.

---

## Two Translation Layers (Adopted from Naspire-Client)

Atlas follows naspire-client's proven two-layer translation model:

### Layer 1: Static UI Strings (react-intl)

- `src/i18n/messages/en.ts` and `ar.ts`
- All static labels, buttons, navigation, statuses, priorities
- Consumed via `<FormattedMessage>` or `intl.formatMessage()`

### Layer 2: Dynamic API Content ({ en, ar } objects)

- API responses return localized objects: `{ en: string, ar?: string | null }`
- `pickLocale()` utility selects the correct field
- `useLoc()` hook binds locale to components
- Critical for project names, task descriptions, and user-generated content

```typescript
// src/lib/localized.ts — Adopted from naspire-client
export function pickLocale(
  obj: { en: string; ar?: string | null },
  locale: string
): string {
  if (locale === 'ar' && obj.ar) return obj.ar;
  return obj.en;
}

// src/hooks/useLoc.ts — Adopted from naspire-client
export function useLoc() {
  const { locale } = useLocale();
  return {
    locale,
    loc: (obj: { en: string; ar?: string | null }) => pickLocale(obj, locale),
  };
}

// Usage in a component
const { loc } = useLoc();
return <h1>{loc(project.name)}</h1>; // Handles { en: "Project A", ar: "مشروع أ" }
```

---

## Locale Resolution (Enhanced from Naspire-Client)

```
Priority:
1. localStorage 'atlas_locale' (user preference, set by LanguageSwitcher)
2. navigator.language (browser default)
3. 'en' (app default)
```

```typescript
// src/i18n/locale-resolver.ts
export function resolveLocale(): string {
  const stored = localStorage.getItem('atlas_locale');
  if (stored && ['en', 'ar'].includes(stored)) return stored;

  const browserLang = navigator.language.split('-')[0];
  if (['en', 'ar'].includes(browserLang)) return browserLang;

  return 'en';
}
```

> **Note:** Naspire-client uses URL prefix + middleware. Atlas is a Vite SPA without URL routing, so localStorage + navigator is the equivalent for this architecture.

---

## CI Validation (Adopted from Naspire-Client)

Naspire-client validates exact key parity between locale files in CI. Atlas should do the same.

```typescript
// scripts/validate-i18n.ts
import en from '../src/i18n/messages/en';
import ar from '../src/i18n/messages/ar';

const enKeys = Object.keys(en).sort();
const arKeys = Object.keys(ar).sort();

const missingInAr = enKeys.filter(k => !arKeys.includes(k));
const missingInEn = arKeys.filter(k => !enKeys.includes(k));

for (const key of missingInAr) console.error('❌ Missing in Arabic:', key);
for (const key of missingInEn) console.error('❌ Missing in English:', key);

if (missingInAr.length || missingInEn.length) process.exit(1);

console.log(`✓ All ${enKeys.length} keys present in both locales`);
```

**package.json:**
```json
{
  "scripts": {
    "validate:i18n": "tsx scripts/validate-i18n.ts",
    "prebuild": "npm run validate:i18n"
  }
}
```

---

## RTL Support (Enhanced from Naspire-Client)

### Global RTL CSS Rules (`src/index.css`)

```css
/* Global [dir='rtl'] overrides — adopted from naspire-client globals.css */
[dir='rtl'] {
  /* Margin/Padding logical reversal */
  [dir='rtl'] .ml-4 { margin-left: 0; margin-right: 1rem; }
  [dir='rtl'] .mr-4 { margin-right: 0; margin-left: 1rem; }
  [dir='rtl'] .pl-4 { padding-left: 0; padding-right: 1rem; }
  [dir='rtl'] .pr-4 { padding-right: 0; padding-left: 1rem; }

  /* Text alignment */
  .text-left { text-align: right; }
  .text-right { text-align: left; }

  /* Flex row reversal */
  .flex-row { flex-direction: row-reverse; }
}

/* Icon flip utility */
.rtl-flip {
  [dir='rtl'] & {
    transform: scaleX(-1);
  }
}
```

### Locale-Aware Fonts (Adopted from Naspire-Client)

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
/* src/index.css */
html[lang='en'] { font-family: 'Inter', system-ui, sans-serif; }
html[lang='ar'] { font-family: 'Tajawal', system-ui, sans-serif; }
```

### Component-Level RTL Overrides

```css
/* Example: Sidebar RTL override */
[dir='rtl'] .sidebar {
  border-right: none;
  border-left: 1px solid var(--border);
}
```

---

## Locale-Aware Links (Adopted from Naspire-Client)

```typescript
// src/components/LocaleLink.tsx
import { Link, type LinkProps } from 'react-router-dom';
import { useLocale } from '../hooks/useLocale';

export function LocaleLink({ to, children, ...props }: LinkProps) {
  const { locale } = useLocale();
  const href = `${to}?lang=${locale}`;
  return <Link to={href} {...props}>{children}</Link>;
}
```

---

## File Modifications Required

### New Files to Create

| File | Purpose | Source |
|------|---------|--------|
| `src/i18n/index.ts` | react-intl configuration | Original |
| `src/i18n/locale-resolver.ts` | Locale detection logic | **From naspire-client** |
| `src/i18n/messages/en.ts` | English translations | Original |
| `src/i18n/messages/ar.ts` | Arabic translations | Original |
| `src/lib/localized.ts` | pickLocale() for API content | **From naspire-client** |
| `src/hooks/useLocale.ts` | Locale context hook | Original |
| `src/hooks/useLoc.ts` | Dynamic content hook | **From naspire-client** |
| `src/components/LanguageSwitcher.tsx` | Language selector UI | Original |
| `src/components/LocaleLink.tsx` | Locale-aware links | **From naspire-client** |
| `src/utils/format.ts` | Centralized formatting | Original |
| `scripts/validate-i18n.ts` | CI validation script | **From naspire-client** |

### Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add Inter + Tajawal fonts, dynamic `lang`/`dir` |
| `src/index.css` | Add global [dir='rtl'] rules + font selection |
| `src/main.tsx` | Wrap with `IntlProvider` |
| `src/constants.ts` | Add translation keys to Option labels |
| `src/App.tsx` | Update auth/session text |
| `src/components/Sidebar.tsx` | Translate navigation |
| `src/components/StatusBadge.tsx` | Translate status labels |
| All 38 components | Replace hardcoded strings with `<FormattedMessage>` or `intl.formatMessage()` |
| `package.json` | Add `validate:i18n` script + `prebuild` hook |

---

## Translation Key Strategy

> **Adopted from naspire-client:** ensure exact key parity between en/ar (enforced by `validate-i18n.ts` in CI)

### Key Naming Convention

```
{category}.{specific}

Examples:
- nav.projects
- status.active
- priority.high
- common.save
- project.createModal.title
- task.list.emptyState
```

### Two-Layer Content Strategy

| Content Type | Layer | Mechanism |
|--------------|-------|-----------|
| UI labels, buttons, navigation | Layer 1 | react-intl messages/*.ts |
| Status/priority labels | Layer 1 | constants.ts with `labelKey` |
| API responses (names, descriptions) | Layer 2 | `{ en, ar }` + `pickLocale()` |
| User-generated content | Layer 2 | `{ en, ar }` + `pickLocale()` |

### Constants.ts Refactoring

```typescript
// Before
export const PROJECT_STATUSES: Option[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
];

// After
export const PROJECT_STATUSES: Option[] = [
  { value: 'planning', labelKey: 'status.planning' },
  { value: 'active', labelKey: 'status.active' },
];

// Helper function
export function getTranslatedLabel(
  items: Option[],
  value: string,
  intl: IntlShape
): string {
  const item = items.find(i => i.value === value);
  return item ? intl.formatMessage({ id: item.labelKey }) : value;
}
```

---

## Testing Checklist

- [ ] Language switcher toggles between English and Arabic
- [ ] All static text updates immediately on language change
- [ ] All **dynamic API content** (project names, descriptions) renders in correct locale
- [ ] Arabic text displays correctly with proper Unicode
- [ ] RTL layout mirrors correctly (margins, padding, alignment)
- [ ] Icons flip direction where appropriate (.rtl-flip)
- [ ] **Inter font for English, Tajawal for Arabic loads correctly**
- [ ] Date formatting uses locale-specific patterns
- [ ] Number formatting uses locale-specific separators
- [ ] Currency formatting displays correctly
- [ ] Pluralization works for Arabic (0, 1, 2, few, many, other)
- [ ] Display of partial API content (ar null → falls back to en)
- [ ] Language preference persists across page reloads (localStorage)
- [ ] Browser language detection works when no preference set
- [ ] `<html lang="...">` updates dynamically
- [ ] `<html dir="...">` updates dynamically
- [ ] **CI validation script passes** (`npm run validate:i18n`)
- [ ] No console errors or warnings
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Translation completeness | Users see English fallback | **CI validation script (artefact of naspire)** |
| Dynamic content untranslated | API responses show wrong language | **pickLocale() + useLoc() two-layer pattern** |
| RTL layout bugs | Broken UI in Arabic | Global [dir='rtl'] CSS + component overrides |
| Bundle size increase | Slower load time | react-intl is smaller than react-i18next |
| Missing RTL font | Arabic renders in system font | Conditionally load Tajawal |
| Date/number format inconsistencies | Confusing formatting | Centralize via react-intl |

---

## Future Considerations

### If Adding More Languages Later

1. Add new locale file in `src/i18n/messages/{locale}.ts`
2. Add locale config to `src/i18n/index.ts`
3. Run `lingui extract` or equivalent to find missing keys
4. Translate missing strings

### If Adding Translation Management Platform

- **Crowdin** — integrates with react-intl via GitHub
- **Lokalise** — supports ICU format natively
- **Phrase** — formerly Memsource, enterprise-grade

All three support ICU MessageFormat, making migration seamless.

---

## References

- [FormatJS Documentation](https://formatjs.io/)
- [React Intl GitHub](https://github.com/formatjs/formatjs)
- [ICU Message Format Guide](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [Tailwind RTL Plugin](https://github.com/rtlcss/tailwindcss-rtl)
- [2026 i18n Comparison](https://www.auto18n.com/en/blog/react-i18n-2026)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-07 | Use react-intl over react-i18next | ICU standard, simpler API, smaller bundle, better platform compatibility |
| 2026-09-07 | Target English + Arabic | Business requirement |
| 2026-09-07 | Use ICU MessageFormat | Industry standard, handles Arabic pluralization natively |
| 2026-09-07 | **Adopt two-layer translation (static + dynamic)** | From naspire-client — critical for API-driven content |
| 2026-09-07 | **Adopt CI validation script** | From naspire-client — prevents broken translations |
| 2026-09-07 | **Adopt comprehensive RTL (global CSS + component overrides)** | From naspire-client — tested approach for Arabic |
| 2026-09-07 | **Adopt locale-aware fonts (Inter + Tajawal)** | From naspire-client — proper Arabic typography |

---

## Reference Architecture

This plan incorporates patterns from **naspire-client's production i18n architecture**:

| Naspire-Client Feature | Atlas Adaptation |
|----------------------|------------------|
| next-intl | react-intl (Vite SPA equivalent) |
| `src/i18n/routing.ts` | `src/i18n/locale-resolver.ts` |
| `src/middleware.ts` (URL + cookie) | localStorage + navigator.language |
| `pickLocale()` + `useLoc()` | Adopted directly |
| `scripts/i18n/validate-keys.ts` | `scripts/validate-i18n.ts` |
| Global [dir='rtl'] CSS in globals.css | Adopted in index.css |
| 82+ component RTL overrides | Add incrementally as needed |
| Inter + Tajawal fonts | Adopted in index.html |
| LocaleLink component | Adopted (SPA variant) |

---

**Document Author:** OpenCode Agent  
**Last Updated:** 2026-09-07  
**Status:** Ready for Review
