# i18n Architecture Comparison: Atlas vs Naspire-Client

**Date:** September 7, 2026  
**Purpose:** Identify key architectural patterns from naspire-client to improve Atlas i18n implementation

---

## Executive Summary

Naspire-client has a **more mature, battle-tested i18n architecture** with several patterns Atlas should adopt. The key differences are:

| Aspect | Atlas (Proposed) | Naspire-Client (Production) |
|--------|------------------|----------------------------|
| **Library** | react-intl (Vite SPA) | next-intl (Next.js SSR) |
| **Translation Layers** | 1 (static only) | 2 (static + dynamic API content) |
| **Validation** | None | CI script with key parity check |
| **RTL Strategy** | Tailwind utilities only | Global CSS + 82+ component overrides |
| **Locale Resolution** | localStorage only | URL prefix + middleware + cookie + localStorage |
| **Fonts** | Not handled | Inter (en) + Tajawal (ar) with conditional loading |
| **Locale Links** | Not addressed | LocaleLink component auto-prefixes href |

---

## Critical Differences & Recommendations

### 1. TWO Translation Layers (Must Adopt)

**Naspire-Client Pattern:**
```
Layer 1: Static UI strings → next-intl (messages/*.json)
Layer 2: Dynamic API content → { en: string, ar: string | null } objects
```

**Why This Matters:**
- Atlas has API responses with text (project names, task descriptions, user content)
- This content comes from the database, not translation files
- Need a way to display the correct locale from `{ en: "...", ar: "..." }` API responses

**Atlas Should Adopt:**
```typescript
// src/lib/localized.ts — Adopt from naspire-client
export function pickLocale(obj: { en: string; ar?: string | null }, locale: string): string {
  if (locale === 'ar' && obj.ar) return obj.ar;
  return obj.en;
}

// src/hooks/useLoc.ts — Adopt from naspire-client
export function useLoc() {
  const { locale } = useLocale();
  return {
    locale,
    loc: <T extends { en: string; ar?: string | null }>(obj: T) => pickLocale(obj, locale),
  };
}

// Usage in components
const { loc } = useLoc();
return <span>{loc(project.name)}</span>;  // Handles { en: "Project A", ar: "مشروع أ" }
```

---

### 2. CI Validation Script (Must Adopt)

**Naspire-Client Pattern:**
```typescript
// scripts/i18n/validate-keys.ts
// Validates exact key parity between en.json and ar.json
// Fails CI if keys don't match
```

**Why This Matters:**
- Prevents shipping with missing translations
- Catches developer mistakes (added English key, forgot Arabic)
- Ensures translation completeness

**Atlas Should Create:**
```typescript
// scripts/validate-i18n.ts
import en from '../src/i18n/messages/en';
import ar from '../src/i18n/messages/ar';

const enKeys = Object.keys(en).sort();
const arKeys = Object.keys(ar).sort();

const missingInAr = enKeys.filter(k => !arKeys.includes(k));
const missingInEn = arKeys.filter(k => !enKeys.includes(k));

if (missingInAr.length > 0) {
  console.error('Missing in Arabic:', missingInAr);
  process.exit(1);
}
if (missingInEn.length > 0) {
  console.error('Missing in English:', missingInEn);
  process.exit(1);
}

console.log(`✓ All ${enKeys.length} keys present in both locales`);
```

**Add to package.json:**
```json
{
  "scripts": {
    "validate:i18n": "tsx scripts/validate-i18n.ts",
    "prebuild": "npm run validate:i18n"
  }
}
```

---

### 3. Robust Locale Resolution (Should Adopt)

**Naspire-Client Pattern:**
1. URL prefix (primary): `/[locale]/en/feed`, `/[locale]/ar/chapters`
2. Middleware: `NEXT_LOCALE` cookie → `Accept-Language` header → redirect
3. Client fallback: cookie → localStorage → `navigator.language` → default

**Atlas Constraint:** Vite SPA (no URL prefix, no middleware)

**Atlas Should Adopt (Modified):**
```typescript
// src/i18n/locale-resolver.ts
export function resolveLocale(): string {
  // Priority 1: localStorage (user preference)
  const stored = localStorage.getItem('atlas_locale');
  if (stored && ['en', 'ar'].includes(stored)) return stored;

  // Priority 2: Browser language
  const browserLang = navigator.language.split('-')[0];
  if (['en', 'ar'].includes(browserLang)) return browserLang;

  // Priority 3: Default
  return 'en';
}

// src/hooks/useLocale.ts
export function useLocale() {
  const [locale, setLocaleState] = useState(resolveLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('atlas_locale', newLocale);
    document.documentElement.dir = locales[newLocale].dir;
    document.documentElement.lang = newLocale;
  }, []);

  return { locale, setLocale, isRTL: locales[locale].dir === 'rtl' };
}
```

---

### 4. Comprehensive RTL Strategy (Should Adopt)

**Naspire-Client Pattern:**
- Global `[dir='rtl']` rules in `globals.css:107-220`
- 82+ component-level `[dir='rtl']` overrides in SCSS modules
- Icon flip utility: `.rtl-flip`

**Atlas Should Adopt:**

**Global RTL CSS (`src/index.css`):**
```css
[dir='rtl'] {
  /* Margin/Padding reversal */
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

**Component-Level Overrides (example):**
```css
/* Sidebar.css */
.sidebar {
  [dir='rtl'] & {
    border-right: none;
    border-left: 1px solid var(--border);
  }
}
```

---

### 5. Locale-Aware Font Loading (Should Adopt)

**Naspire-Client Pattern:**
- Inter (English), Tajawal (Arabic)
- Conditionally applied on `<html>` element

**Atlas Should Adopt:**
```html
<!-- index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
/* src/index.css */
html[lang='en'] {
  font-family: 'Inter', system-ui, sans-serif;
}

html[lang='ar'] {
  font-family: 'Tajawal', system-ui, sans-serif;
}
```

---

### 6. LocaleLink Component (Should Adopt)

**Naspire-Client Pattern:**
```typescript
// src/components/UI/LocaleLink/LocaleLink.tsx
// Auto-prefixes href with current locale
// Passes through external URLs
```

**Atlas Adaptation (no URL prefix, but maintains locale context):**
```typescript
// src/components/LocaleLink.tsx
import { Link, LinkProps } from 'react-router-dom';
import { useLocale } from '../hooks/useLocale';

export function LocaleLink({ to, children, ...props }: LinkProps) {
  const { locale } = useLocale();

  // Preserve locale in query param for SPA
  const href = `${to}?lang=${locale}`;

  return (
    <Link to={href} {...props}>
      {children}
    </Link>
  );
}
```

---

## Feature Comparison Matrix

| Feature | Atlas (Current Plan) | Naspire-Client | Recommendation |
|---------|---------------------|----------------|----------------|
| **i18n Library** | react-intl | next-intl | ✅ Keep react-intl (Vite SPA) |
| **Static Translations** | ✅ messages/*.ts | ✅ messages/*.json | ✅ Keep TypeScript |
| **Dynamic API Content** | ❌ Not addressed | ✅ pickLocale() | 🔴 **Must add** |
| **CI Validation** | ❌ Not addressed | ✅ validate-keys.ts | 🔴 **Must add** |
| **Locale Resolution** | localStorage only | URL + middleware + cookie | 🟡 **Enhance** |
| **RTL Global CSS** | Tailwind utilities | Global [dir='rtl'] rules | 🟡 **Add global rules** |
| **RTL Component Overrides** | ❌ None | 82+ overrides | 🟡 **Add as needed** |
| **Icon Flip** | ❌ None | .rtl-flip utility | 🟡 **Add utility** |
| **Fonts** | System fonts | Inter + Tajawal | 🟡 **Add locale fonts** |
| **Language Switcher** | ✅ Basic | ✅ Full-page nav | ✅ Keep in-app (SPA) |
| **Locale Links** | ❌ None | LocaleLink component | 🟡 **Add component** |
| **Pluralization** | ✅ ICU 6-form | ✅ ICU 6-form | ✅ Equivalent |
| **Date/Number Formatting** | ✅ Built-in | ✅ Built-in | ✅ Equivalent |

---

## Updated Implementation Plan

### Phase 1: Foundation (Day 1) — SAME

| Task | Effort |
|------|--------|
| Install `react-intl` | 5 min |
| Create `src/i18n/` directory structure | 15 min |
| Create English translation file | 30 min |
| Create Arabic translation file | 30 min |
| Wrap app in `IntlProvider` | 15 min |
| Test basic language switching | 15 min |

**Total:** ~1.5 hours

### Phase 2: Core Infrastructure (Day 2) — ENHANCED

| Task | Effort | Source |
|------|--------|--------|
| Add LanguageSwitcher component | 30 min | Original plan |
| Create `pickLocale()` utility | 30 min | **From naspire-client** |
| Create `useLoc()` hook | 30 min | **From naspire-client** |
| Create `resolveLocale()` function | 30 min | **Enhanced from naspire** |
| Create `LocaleLink` component | 30 min | **From naspire-client** |
| Create CI validation script | 1 hour | **From naspire-client** |
| Add validation to `prebuild` | 15 min | **From naspire-client** |

**Total:** ~3.25 hours (was 1.5 hours)

### Phase 3: Core Components (Days 3-4) — SAME

| Task | Effort |
|------|--------|
| Update Sidebar navigation | 1 hour |
| Update StatusBadge + TaskStatusSelect | 1 hour |
| Update FilterBar + SummaryBar | 1 hour |
| Update ProjectPage (largest) | 3 hours |
| Update TaskPage + TasksPage | 2 hours |
| Update DashboardPage | 1 hour |

**Total:** ~9 hours

### Phase 4: Modals & Remaining Pages (Day 5) — SAME

| Task | Effort |
|------|--------|
| Update all modals | 3 hours |
| Update remaining pages | 4 hours |
| Update error/empty states | 1 hour |

**Total:** ~8 hours

### Phase 5: RTL & Formatting (Day 6) — ENHANCED

| Task | Effort | Source |
|------|--------|--------|
| Add global RTL CSS rules | 1.5 hours | **From naspire-client** |
| Add icon flip utility | 30 min | **From naspire-client** |
| Add locale-specific fonts | 1 hour | **From naspire-client** |
| Add component-level RTL overrides | 2 hours | **From naspire-client** |
| Centralize date/number formatting | 1 hour | Original plan |
| Update `index.html` dynamic attributes | 15 min | Original plan |

**Total:** ~6 hours (was 4.5 hours)

### Phase 6: Testing & Polish (Day 7) — SAME

| Task | Effort |
|------|--------|
| Test Arabic RTL layout | 2 hours |
| Test pluralization | 1 hour |
| Test date/number formatting | 1 hour |
| Test dynamic API content (pickLocale) | 1 hour |
| Run validation script | 15 min |
| Run lint + build | 30 min |

**Total:** ~5.5 hours (was 5 hours)

---

## Revised Summary

| Phase | Hours | Cumulative |
|-------|-------|------------|
| Phase 1: Foundation | 1.5 | 1.5 |
| Phase 2: Core Infrastructure (Enhanced) | 3.25 | 4.75 |
| Phase 3: Core Components | 9 | 13.75 |
| Phase 4: Modals & Pages | 8 | 21.75 |
| Phase 5: RTL & Formatting (Enhanced) | 6 | 27.75 |
| Phase 6: Testing & Polish | 5.5 | 33.25 |

**Revised Total:** ~33-35 hours (was 28-30 hours)

**Overhead from naspire patterns:** +5 hours (worth it for production quality)

---

## New Files to Create

| File | Purpose | Source |
|------|---------|--------|
| `src/i18n/index.ts` | react-intl configuration | Original |
| `src/i18n/messages/en.ts` | English translations | Original |
| `src/i18n/messages/ar.ts` | Arabic translations | Original |
| `src/i18n/locale-resolver.ts` | Locale detection logic | **Enhanced from naspire** |
| `src/lib/localized.ts` | pickLocale() utility | **From naspire-client** |
| `src/hooks/useLocale.ts` | Locale context hook | Original |
| `src/hooks/useLoc.ts` | Dynamic content hook | **From naspire-client** |
| `src/components/LanguageSwitcher.tsx` | Language selector | Original |
| `src/components/LocaleLink.tsx` | Locale-aware links | **From naspire-client** |
| `src/utils/format.ts` | Centralized formatting | Original |
| `scripts/validate-i18n.ts` | CI validation | **From naspire-client** |

---

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Add fonts, dynamic `lang`/`dir` |
| `src/index.css` | Add global RTL rules |
| `src/main.tsx` | Wrap with `IntlProvider` |
| `src/constants.ts` | Add `labelKey` to Options |
| `src/App.tsx` | Update auth/session text |
| `src/components/Sidebar.tsx` | Translate navigation |
| `src/components/StatusBadge.tsx` | Translate status labels |
| All 38 components | Replace hardcoded strings |
| `package.json` | Add `validate:i18n` script |

---

## Key Takeaways

### What Atlas Gets from Naspire-Client

1. **Production-tested patterns** — These aren't theoretical; they're battle-tested in a real app
2. **Dynamic content handling** — Critical for API-driven content
3. **CI quality gates** — Prevents shipping broken translations
4. **Comprehensive RTL** — Not just utilities, but component-level overrides
5. **Locale-aware typography** — Proper Arabic font support

### What Atlas Does Differently

1. **react-intl instead of next-intl** — Correct choice for Vite SPA
2. **TypeScript translations** — Better type safety than JSON
3. **In-app language switching** — No URL prefix needed for SPA
4. **Simpler locale resolution** — No middleware needed

### Estimated ROI

- **Additional effort:** ~5 hours
- **Benefits:** Production-quality i18n, CI validation, comprehensive RTL
- **Risk reduction:** Prevents translation bugs in production

---

## Recommendation

**Adopt all naspire-client patterns** with the following modifications:

1. ✅ **Must Have:** pickLocale(), useLoc(), CI validation script
2. ✅ **Should Have:** Global RTL CSS, locale fonts, LocaleLink
3. ✅ **Nice to Have:** Component-level RTL overrides (add incrementally)

The 5-hour investment in adopting these patterns will save significant debugging time in production.

---

**Document Author:** OpenCode Agent  
**Last Updated:** 2026-09-07  
**Status:** Ready for Review
