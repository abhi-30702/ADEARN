# AdEarn UI Overhaul — Design Spec
**Date:** 2026-06-15  
**Status:** Approved

---

## 1. Approved Decisions

| Decision | Choice |
|---|---|
| Layout | Single sidebar shell for all three roles; nav items change per role |
| Visual style | Dark glassmorphism — `#060b14` background, frosted-glass cards, teal/peach accents |
| Sidebar | Collapsible — starts expanded (icon + label), collapses to icon-only via toggle |

---

## 2. Design Tokens

### Colors
```
Background:   #060b14  (page bg)
Surface:      rgba(255,255,255,0.04)  (glass cards)
Surface-2:    rgba(255,255,255,0.07)  (elevated cards, hover)
Border:       rgba(255,255,255,0.08)  (card borders)
Border-hover: rgba(94,234,212,0.25)   (teal on hover)

Accent-teal:  #5eead4  (primary CTA, active nav, badges)
Accent-teal2: #789A99  (secondary teal / brand)
Accent-peach: #FFD2C2  (secondary accent)
Accent-peach2:#FFF0EB  (subtle peach bg tints)

Text-primary:  #f1f5f9
Text-secondary:#94a3b8
Text-muted:    #475569
Text-disabled: #334155

Success: #34d399
Warning: #fbbf24
Danger:  #f87171
Info:    #60a5fa

Sidebar-bg:    rgba(15,23,42,0.95)
Sidebar-border:rgba(255,255,255,0.06)
```

### Typography
- Font: **Inter** (via Google Fonts CDN in index.html)
- Page title: 24px / 700 / tracking -0.5px
- Section title: 14px / 600
- Body: 13.5px / 400
- Label/caption: 11px / 600 / uppercase / tracking 0.7px

### Spacing
- Page padding: 24px
- Card padding: 20px
- Card border-radius: 14px
- Gap between cards: 16px
- Sidebar width expanded: 240px
- Sidebar width collapsed: 68px

### Elevation / Glassmorphism recipe
```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 14px;
backdrop-filter: blur(12px);
```
Hover state adds `border-color: rgba(94,234,212,0.25)` and `transform: translateY(-1px)`.

---

## 3. New Dependencies

```
lucide-react       — icon library (consistent SVG icons throughout)
clsx               — conditional className utility
tailwind-merge     — merge tailwind class conflicts safely
```

---

## 4. Component Library (`web/src/components/ui/`)

### `GlassCard`
Wrapper div with glassmorphism styles. Props: `className`, `hover` (adds hover lift).

### `KpiCard`
Metric display card. Props: `label`, `value`, `sub`, `trend` (`{value, direction}`), `icon` (emoji or lucide).

### `StatusBadge`
Pill badge. Props: `status`: `active|paused|review|completed|rejected|suspended`. Colors mapped from status.

### `DataTable`
Headless table wrapper. Props: `columns` (array of `{key, label, width}`), `rows`, `onRowClick`. Hover highlight row, sticky header.

### `PageHeader`
Top section of every page. Props: `title`, `subtitle`, `actions` (slot for buttons).

### `Button`
Props: `variant` (`primary|ghost|danger`), `size` (`sm|md`), `loading`, `icon`. Primary = teal gradient. Ghost = glass border.

### `Input` / `Select` / `Textarea`
Dark-styled form controls. Dark bg, teal focus ring, consistent sizing.

### `Skeleton`
Animated shimmer placeholder that matches the card/row it replaces.

### `EmptyState`
Props: `icon`, `title`, `description`, `action`. Centered in its container with subtle icon.

---

## 5. App Shell (`web/src/components/AppLayout.tsx`)

Single layout component wrapping all authenticated pages.

```
<AppLayout>        ← reads user.role from authStore
  <Sidebar />      ← role-aware nav items, collapsible
  <div.main>
    <Topbar />     ← page title (passed as prop), live badge, user avatar
    <div.content>
      {children}   ← page content
    </div>
  </div>
</AppLayout>
```

### Sidebar nav items per role

**Consumer**
- Dashboard → `/feed`
- Wallet → `/wallet`
- Transactions → `/wallet` (anchor)
- Settings → `/onboarding`

**Advertiser**
- Dashboard → `/advertiser`
- New Campaign → `/advertiser/campaigns/new`
- Analytics → `/advertiser/analytics`

**Admin**
- Overview → `/admin`
- Fraud Queue → `/admin` (fraud tab)
- Users → `/admin` (users tab)
- Advertisers → `/admin` (advertisers tab)
- Audit Log → `/admin/audit-log`
- Financials → `/admin` (financials tab)

### Collapse behaviour
- State stored in `localStorage` key `sidebar_collapsed`
- Toggle button: circular `◀`/`▶` button at top-right of sidebar
- Transition: `width 0.25s ease` on sidebar, labels fade out
- Tooltips on nav items when collapsed (title attribute)

---

## 6. Page Redesigns

### Login Page (`/login`)
- Full-screen dark background with subtle radial gradient (teal glow top-right, peach glow bottom-left)
- Centered glass card (400px wide)
- AdEarn logo + tagline above form
- Mobile input → OTP flow (existing logic preserved)
- Demo account quick-login row: 3 pill buttons (Consumer / Advertiser / Admin) with role colour
- No sidebar (unauthenticated)

### Onboarding Page (`/onboarding`)
- No sidebar (onboarding flow outside main shell)
- Full-screen dark bg
- Centered glass card with step progress bar (teal)
- Step 1: Shopping profile — category chips (multi-select grid, predefined list: Health & Beauty, Electronics, Fashion, Grocery, Home & Kitchen, Sports, Books, Toys) instead of raw text inputs
- Step 2: Pool sliders — visual slider bars with live percentage sum indicator
- Step 3: Success — animated checkmark, "Go to Feed" CTA

### Consumer — Feed (`/feed`)
- Inside AppLayout
- Page header: "Your Feed" + subtitle "Ads matched to your purchase intent"
- Ad cards in a 2-column grid (lg: 3-column)
  - Each card: glassmorphism, brand logo placeholder, campaign name, cashback badge (teal pill), "Shop Now" CTA button
  - Hover: card lifts, teal border glow
- Empty state if no ads matched

### Consumer — Wallet (`/wallet`)
- Inside AppLayout  
- Hero summary card: total earned in large text, withdrawal eligible badge
- 2×2 pool grid: each pool card has icon, label, amount, split percentage
  - Liquid: teal, Savings: blue, Parent: purple, Charity: peach
- Transaction table: campaign name, amount, date, status badge
- Real-time polling every 5s (existing behaviour preserved)

### Advertiser — Dashboard (`/advertiser`)
- Inside AppLayout
- KPI row: Total Spend / Active Campaigns / Conversions / Avg Conv. Rate (4 cards)
- Quick action bar: "+ New Campaign" primary button
- Campaigns data table with status pills, spend bar (inline progress), actions column

### Advertiser — Campaign Create (`/advertiser/campaigns/new`)
- Inside AppLayout
- Two-column form layout: left = fields, right = live preview card
- Sections: Basic Info / Targeting / Budget / Schedule
- All inputs use the new dark Input component
- Submit button shows loading spinner

### Advertiser — Campaign Stats (`/advertiser/campaigns/:id/stats`)
- Inside AppLayout
- Back link, campaign name as page title
- KPI cards: Impressions / Conversions / Spend / Conv. Rate
- Recent conversions table

### Advertiser — Analytics (`/advertiser/analytics`)
- Inside AppLayout  
- Spend trend AreaChart (existing recharts, restyled dark theme)
- Conversion rate BarChart (restyled)
- Conv. ring SVG (existing, restyled)
- PDF export button

### Admin — Dashboard (`/admin`)
- Inside AppLayout
- 4 tabs: Financials / Fraud Queue / Users / Advertisers (existing logic)
- Each tab uses DataTable component
- Financials tab: KPI cards across top
- Action buttons per row: Approve/Reject pills

### Admin — Audit Log (`/admin/audit-log`)
- Inside AppLayout
- Filter row: action + entity_type dropdowns (dark styled)
- Full-width table, expandable rows for JSON detail
- Monospace font for JSON blocks

---

## 7. Recharts Dark Theme

All existing charts get a shared dark theme config:
```js
const CHART_THEME = {
  background: 'transparent',
  text: '#94a3b8',
  grid: 'rgba(255,255,255,0.06)',
  teal: '#5eead4',
  peach: '#FFD2C2',
}
```
CartesianGrid: `stroke='rgba(255,255,255,0.06)'`  
Tooltip: dark glass background (`#1e293b`, border `rgba(255,255,255,0.1)`)

---

## 8. Animations

- Card hover: `transition: border-color 0.2s, transform 0.2s` → `translateY(-1px)`
- Sidebar collapse: `transition: width 0.25s ease`
- Page fade-in: `@keyframes fadeIn` on `.content`, 150ms
- Skeleton shimmer: `@keyframes shimmer` gradient sweep
- Button loading: spin animation on Loader icon

---

## 9. Router Updates

- All authenticated routes wrapped in `AppLayout`
- Login + Onboarding remain bare (no AppLayout)
- Index route redirects to role-appropriate home after auth check

---

## 10. Implementation Order

1. Install dependencies (lucide-react, clsx, tailwind-merge)
2. Update tailwind.config.js with new tokens
3. Update index.html with Inter font
4. Build UI component library (`components/ui/`)
5. Build AppLayout + Sidebar + Topbar
6. Redesign Login page
7. Redesign Onboarding page
8. Redesign Consumer pages (Feed, Wallet)
9. Redesign Advertiser pages (Dashboard, Create, Stats, Analytics)
10. Redesign Admin pages (Dashboard, Audit Log)
11. Restyle recharts with dark theme
12. TypeScript check + full regression test
