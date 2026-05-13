# Health Dashboard — Design System (MASTER)

**Project:** Personal health-tracking dashboard (single user).
**Stack:** SvelteKit + Tailwind v4 + installable PWA.
**Primary surface:** iPhone (Safari) portrait. **Secondary:** desktop browser.
**Style direction:** *Cinema Slate* — dark-first, premium, calm, data-instrument feel. Light mode mirrors all semantics with equal polish.

This file is the source of truth. Page-specific overrides live in `design-system/pages/<page>.md` and take precedence for that page only.

---

## 1. Design principles

1. **Daily logging must feel near-zero friction.** The home screen is for one-tap inputs and one-glance status. If a user has to think, the design failed.
2. **Numbers are first-class typography.** Tabular figures site-wide. Big numbers earn their size only when they're the answer to the question on screen.
3. **Calm by default, color where it earns its place.** Surfaces are neutral. Accent ink is reserved for primary actions, current state, and goal-progress signals.
4. **Mobile-first, thumb-first.** All primary actions reachable in the bottom third of the viewport. Tab bar + FAB are the entry points.
5. **Color never carries meaning alone.** Always pair with icon, sign, or text (▲▼, +/-, "On track" / "Over").
6. **No emojis as structural icons.** Lucide (or Heroicons) SVGs only.

---

## 2. Color tokens

All colors live as CSS custom properties on `:root` and `[data-theme="light"]`. Tailwind uses them via `theme.extend.colors` or arbitrary values like `bg-[var(--bg-surface)]`. Components must never hardcode hex.

### 2.1 Semantic tokens — Dark (default)

```css
:root {
  /* Surfaces */
  --bg-canvas:           #0A0A0B;   /* page background — not pure black, avoids OLED smear */
  --bg-surface:          #141416;   /* cards, default elevated */
  --bg-surface-elevated: #1C1C1F;   /* modals, popovers, FAB */
  --bg-surface-sunken:   #07070A;   /* input fields, segmented inactive, code blocks */

  /* Foreground */
  --fg-default:          #EDEDEF;   /* primary text, KPI values */
  --fg-muted:            #A1A1AA;   /* secondary text, labels */
  --fg-subtle:           #71717A;   /* tertiary, axis ticks, helper text */
  --fg-disabled:         #52525B;

  /* Borders */
  --border-default:      rgba(255,255,255,0.08);
  --border-strong:       rgba(255,255,255,0.14);
  --border-focus:        #818CF8;   /* indigo-400 for visible focus ring on dark */

  /* Brand accent (indigo) */
  --accent:              #6366F1;
  --accent-hover:        #818CF8;
  --accent-active:       #4F46E5;
  --accent-subtle:       rgba(99,102,241,0.14);  /* tinted backgrounds, chips */
  --accent-fg:           #FFFFFF;

  /* Semantic — pair with icon/sign, never color-only */
  --positive:            #22C55E;   /* goal met, weight ▼, on track */
  --positive-subtle:     rgba(34,197,94,0.14);
  --warning:             #F59E0B;   /* approaching limit */
  --warning-subtle:      rgba(245,158,11,0.14);
  --danger:              #EF4444;   /* exceeded, destructive */
  --danger-subtle:       rgba(239,68,68,0.14);
  --info:                #38BDF8;
  --info-subtle:         rgba(56,189,248,0.14);

  /* Scrim (modal/sheet backdrop) */
  --scrim:               rgba(0,0,0,0.55);

  /* Data-viz palette (chart-library agnostic) */
  --data-1: #6366F1;   /* weight */
  --data-2: #22C55E;   /* protein, water, steps */
  --data-3: #F59E0B;   /* calories ceiling */
  --data-4: #38BDF8;   /* sleep */
  --data-5: #EC4899;   /* workouts */
  --data-6: #A855F7;
  --data-7: #14B8A6;
  --data-1-subtle: rgba(99,102,241,0.18);
  --data-2-subtle: rgba(34,197,94,0.18);
  --data-3-subtle: rgba(245,158,11,0.18);
  --data-4-subtle: rgba(56,189,248,0.18);
  --data-5-subtle: rgba(236,72,153,0.18);
  --data-6-subtle: rgba(168,85,247,0.18);
  --data-7-subtle: rgba(20,184,166,0.18);
}
```

### 2.2 Semantic tokens — Light

```css
[data-theme="light"] {
  --bg-canvas:           #FAFAF9;
  --bg-surface:          #FFFFFF;
  --bg-surface-elevated: #FFFFFF;
  --bg-surface-sunken:   #F4F4F5;

  --fg-default:          #0A0A0A;
  --fg-muted:            #52525B;
  --fg-subtle:           #71717A;
  --fg-disabled:         #A1A1AA;

  --border-default:      #E4E4E7;
  --border-strong:       #D4D4D8;
  --border-focus:        #4F46E5;

  --accent:              #4F46E5;   /* indigo-600 reads better on white than 500 */
  --accent-hover:        #4338CA;
  --accent-active:       #3730A3;
  --accent-subtle:       rgba(79,70,229,0.10);
  --accent-fg:           #FFFFFF;

  --positive:            #16A34A;
  --positive-subtle:     rgba(22,163,74,0.12);
  --warning:             #D97706;
  --warning-subtle:      rgba(217,119,6,0.12);
  --danger:              #DC2626;
  --danger-subtle:       rgba(220,38,38,0.10);
  --info:                #0284C7;
  --info-subtle:         rgba(2,132,199,0.10);

  --scrim:               rgba(15,23,42,0.45);

  /* Data viz — same hues; saturation tuned for light bg */
  --data-1: #4F46E5;
  --data-2: #16A34A;
  --data-3: #D97706;
  --data-4: #0284C7;
  --data-5: #DB2777;
  --data-6: #9333EA;
  --data-7: #0D9488;
  /* subtle variants reuse the same alpha pattern as dark */
}
```

### 2.3 Contrast verification (must hold)

| Pair (dark)                              | Ratio | Use                  |
|------------------------------------------|-------|----------------------|
| `--fg-default` on `--bg-canvas`          | 14.1  | Body, headings       |
| `--fg-muted` on `--bg-surface`           | 5.9   | Labels               |
| `--fg-subtle` on `--bg-surface`          | 4.2   | Hints (large only)   |
| `--accent-fg` on `--accent`              | 5.4   | Primary button       |
| `--positive` on `--bg-surface`           | 4.7   | Success text         |

| Pair (light)                             | Ratio | Use                  |
|------------------------------------------|-------|----------------------|
| `--fg-default` on `--bg-canvas`          | 17.5  | Body, headings       |
| `--fg-muted` on `--bg-surface`           | 7.1   | Labels               |
| `--accent-fg` on `--accent`              | 8.1   | Primary button       |
| `--positive` on `--bg-surface`           | 4.8   | Success text         |

All pairs ≥ 4.5:1 (AA normal text). Verify per-component before merging.

### 2.4 Theme switching

- Default: `prefers-color-scheme: dark` → no attribute needed (`:root` is dark).
- Light: `<html data-theme="light">`.
- User preference stored in `localStorage`; Settings page exposes Auto / Light / Dark.
- All transitions between themes use 200ms `--ease-standard` on `background-color` and `color` only — never on layout properties.

---

## 3. Typography

### 3.1 Font stack

- **UI / body / headings:** `Inter Variable` (system-installable, excellent tabular figures, works at every weight).
- **Numeric display (optional):** same Inter, just with `font-feature-settings: "tnum" 1, "cv11" 1;` for tabular figures + alternate one. No separate display font — fewer assets, more coherence.
- **Fallback stack:** `Inter, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif`.
- **Load:** self-hosted via `@fontsource-variable/inter` (no Google Fonts request from end-user). `font-display: swap`.

### 3.2 Type scale

```css
:root {
  --text-xs:   12px;  --leading-xs:   16px;  /* footnotes, axis labels */
  --text-sm:   13px;  --leading-sm:   18px;  /* labels, helper text */
  --text-base: 15px;  --leading-base: 22px;  /* default body */
  --text-md:   17px;  --leading-md:   24px;  /* prominent body */
  --text-lg:   20px;  --leading-lg:   28px;  /* section heads, KPI sub-value */
  --text-xl:   24px;  --leading-xl:   32px;  /* page title */
  --text-2xl:  32px;  --leading-2xl:  36px;  /* KPI value */
  --text-3xl:  44px;  --leading-3xl:  48px;  /* hero number (e.g. today's weight) */

  /* Weights */
  --fw-regular: 400;
  --fw-medium:  500;
  --fw-semibold: 600;
  --fw-bold:    700;

  /* Letter spacing */
  --tracking-tight: -0.01em;   /* large display only */
  --tracking-normal: 0;
  --tracking-label:  0.04em;   /* uppercase tile labels */
}
```

### 3.3 Hard rules

- **Inputs on mobile must be ≥ 16px** to avoid iOS Safari auto-zoom. Use `--text-md` (17px) for inputs by default.
- **All numeric values use `font-variant-numeric: tabular-nums`** — apply via a `.num` utility class. Prevents the KPI digits from jittering when they update.
- **Body line-height ≥ 1.45.** Headings can go tighter (1.1–1.2).
- **Max line length 65ch on desktop**, not enforced on mobile (column already constrains).
- **Tile labels are uppercase, 12px, `--tracking-label`, `--fg-muted`** — e.g. `WEIGHT`, `CALORIES`. Acts as a consistent micro-hierarchy.

---

## 4. Spacing & radius

### 4.1 Spacing (4pt grid)

```css
:root {
  --space-0:  0;
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;   /* default card padding mobile */
  --space-5:  20px;
  --space-6:  24px;   /* card padding desktop */
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

- **Tile gutters:** 12px mobile, 16px desktop.
- **Page padding:** 16px mobile, 24px tablet, 32px desktop.
- **Section spacing:** 24/32/48 hierarchy. Don't invent new gaps.

### 4.2 Radius

```css
:root {
  --radius-xs:   4px;    /* chips, badges, sparkline endpoint dot */
  --radius-sm:   8px;    /* inputs, small buttons, bar-chart bar tops */
  --radius-md:   12px;   /* default buttons, segmented control items */
  --radius-lg:   16px;   /* cards (KPI, chart, list container) */
  --radius-xl:   20px;   /* sheets, modals */
  --radius-full: 9999px; /* FAB, pills, progress bars, avatars */
}
```

Cards live at `--radius-lg`. Anything bigger than a card lives at `--radius-xl`. Anything that should feel "tactile pill" lives at `--radius-full`.

---

## 5. Elevation & shadows

Dark mode relies on **borders + a hairline inner top-highlight** more than shadow (shadows barely register on dark). Light mode is the inverse — soft drop shadows.

```css
:root {
  /* Dark */
  --elev-0: none;
  --elev-1:
    inset 0 1px 0 rgba(255,255,255,0.04);                    /* card */
  --elev-2:
    0 8px 24px rgba(0,0,0,0.45),
    inset 0 1px 0 rgba(255,255,255,0.06);                    /* popover, FAB */
  --elev-3:
    0 20px 60px rgba(0,0,0,0.6),
    inset 0 1px 0 rgba(255,255,255,0.08);                    /* modal/sheet */
}

[data-theme="light"] {
  --elev-1: 0 1px 2px rgba(15,23,42,0.04);
  --elev-2: 0 4px 12px rgba(15,23,42,0.08);
  --elev-3: 0 20px 48px rgba(15,23,42,0.12);
}
```

Cards always pair the elevation token with a 1px `--border-default`. The border carries the work in dark mode; the shadow carries it in light.

---

## 6. Motion

```css
:root {
  --dur-instant: 0ms;
  --dur-fast:    120ms;   /* press feedback, hover */
  --dur-base:    200ms;   /* default transitions, tooltips */
  --dur-slow:    320ms;   /* sheet entry, route transition */
  --dur-celebr:  480ms;   /* one-shot success (goal met) */

  --ease-standard:    cubic-bezier(0.2, 0, 0, 1);     /* Material-ish */
  --ease-emphasized:  cubic-bezier(0.16, 1, 0.3, 1);  /* Apple/Linear-ish spring-out */
  --ease-exit:        cubic-bezier(0.4, 0, 1, 1);     /* exits accelerate out */
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Rules:**
- Animate only `transform` and `opacity`. Never `width/height/top/left`.
- Exit ≈ 70% of enter duration.
- Press feedback: `transform: scale(0.97)` over `--dur-fast`, snap-back over `--dur-base`.
- Sheet enters from bottom (`translateY(100%) → 0`) with `--dur-slow`, `--ease-emphasized`. Exits with `--dur-base`, `--ease-exit`.
- Stagger list items at 30ms per child for first paint of a screen, max 8 items, then drop the stagger.
- Goal-met celebration: a single 480ms checkmark draw + tile pulse. Once per goal per day.

---

## 7. Component recipes

Every component below is described as the contract — slots, sizes, states, tokens used. The actual Svelte components live in `src/lib/components/`; this section is what they must conform to.

### 7.1 Button

| Variant      | Background          | Foreground       | Border                   | Use                                |
|--------------|---------------------|------------------|--------------------------|------------------------------------|
| Primary      | `--accent`          | `--accent-fg`    | none                     | Single primary CTA per screen      |
| Secondary    | `--bg-surface-sunken` | `--fg-default` | 1px `--border-strong`    | Secondary actions                  |
| Ghost        | transparent         | `--fg-default`   | none                     | Tertiary, in toolbars              |
| Destructive  | `--danger`          | `#FFFFFF`        | none                     | Delete, reset                      |
| Tonal-accent | `--accent-subtle`   | `--accent`       | none                     | Selected segmented item            |

**Sizing:**
- Default: height 44, padding 12 × 16, `--text-base`, `--fw-medium`, `--radius-md`.
- Compact (in dense rows): height 36, padding 8 × 12, `--text-sm`. Still 44 hit area via padding/hitslop.
- Icon-only: 44 × 44, `--radius-md`. **Must include `aria-label`.**

**States:**
- Hover: bg → `*-hover` (where defined), `--dur-fast`.
- Active: `transform: scale(0.97)`, `--dur-fast`.
- Focus-visible: 2px outline `--border-focus`, offset 2px.
- Loading: text replaced by spinner; button disabled but width preserved.
- Disabled: `opacity: 0.4`, `pointer-events: none`, `aria-disabled="true"`.

### 7.2 Card

```
border:       1px solid var(--border-default)
background:   var(--bg-surface)
border-radius: var(--radius-lg)
padding:      var(--space-4) mobile, var(--space-5) desktop
box-shadow:   var(--elev-1)
```

Cards are interactive when they link to a detail view; whole-card click target. Hover (desktop): border → `--border-strong`, `--dur-fast`. Press (mobile): `scale(0.99)` over `--dur-fast`.

### 7.3 KPI / Metric card

The headline component. Used on the home bento grid.

**Required slots:**
- **Label** — top-left, uppercase, `--text-xs`, `--tracking-label`, `--fg-muted`. E.g. `WEIGHT`.
- **Value** — `--text-2xl` (or `--text-3xl` if the tile is 2×1 hero), `--fw-semibold`, `tabular-nums`, `--fg-default`.
- **Unit** — appears inline with value, `--text-md`, `--fg-muted`.
- **Delta** — `--text-sm`, semantic color (`--positive`/`--danger`), preceded by a `lucide-trending-down` / `lucide-trending-up` icon and a sign (▼/▲). Screen reader text: `"down 1.2 kg this week"`.
- **Sparkline (optional)** — full tile width, 36px tall, stroke `--data-N`, fill `--data-N-subtle`, no axes/grid, last-point dot in `--data-N`.
- **Progress (optional, mutually exclusive with sparkline)** — for goal-bound metrics (calories, water, steps). 6px tall bar at the bottom of the tile, `--radius-full`. Numeric "1240 / 1800" + percent label above.

**Variants:**
- `weight` — sparkline, no progress.
- `calories` — progress, no sparkline.
- `steps` — both: weekly sparkline + today's progress.
- `protein` — progress.
- `sleep` — sparkline.
- `body-fat` — sparkline + delta only.

**Sizes (bento spans):**
- `1×1` (default): 1 column wide, ~168px tall mobile.
- `2×1` (hero): full row, ~168px tall.
- `2×2` (trend): full row, ~336px tall — used for the "this week" weight trend.

Whole tile is `<a>` to `/metrics/<slug>` (detail page with the full chart history).

### 7.4 Input (text / number)

```
height:        48px (mobile), 40px (desktop)
padding:       0 var(--space-4)
background:    var(--bg-surface-sunken)
border:        1px solid var(--border-default)
border-radius: var(--radius-sm)
font-size:     17px (--text-md)   ← never below 16px on mobile
color:         var(--fg-default)
```

**States:** focus = 2px outer ring `--border-focus`, inner border `--accent`. Error = border `--danger` + helper text `--danger` below.

**Numeric inputs:** `inputmode="decimal"`, `pattern="[0-9]*\\.?[0-9]*"`, autoselect on focus. Show unit suffix inside the field as a `--fg-muted` adornment.

**Label:** always visible above the input. Placeholder is **never** the label.

### 7.5 Progress bar

```
height: 6px
background: var(--bg-surface-sunken)
border-radius: var(--radius-full)
fill: var(--accent) or var(--positive) depending on metric semantics
```

If value > 100% of goal (e.g. calories exceeded), fill switches to `--danger` and the bar caps visually at 100% with a small "over" badge to the right.

Animate width change: `--dur-base`, `--ease-standard`.

### 7.6 Sparkline

Library-agnostic spec; whichever chart lib we pick must respect this:

- 36px tall, fills available width.
- Stroke 2px, color `--data-N` (passed in by the parent metric).
- Area fill `--data-N-subtle`, gradient to 0% at the baseline.
- Smooth curve (monotone).
- No axes, no grid lines, no tooltip.
- Single dot on the last data point, 4px, fill = stroke color.
- Skip animation if `prefers-reduced-motion`.

### 7.7 FAB (Floating Action Button)

- 56 × 56, `--radius-full`, `--accent` background, `--accent-fg` icon (`lucide-plus`).
- Position: fixed, bottom = `calc(72px + env(safe-area-inset-bottom) + 12px)` (sits above the tab bar), right = 16px.
- Shadow: `--elev-2`.
- Tap: opens the **Quick Log sheet** (water, weight, meal, custom).
- Long-press (mobile): radial menu with 4 quick actions.
- Animation: scale 0.96 on press; haptic light tick if `navigator.vibrate` available.

### 7.8 Bottom tab bar

- Fixed, height = `56px + env(safe-area-inset-bottom)`.
- Background: `color-mix(in srgb, var(--bg-canvas) 85%, transparent)`, `backdrop-filter: blur(20px)`. Border-top 1px `--border-default`.
- 4 items max: **Home / Log / Trends / Settings**.
- Each item: icon 24px + label `--text-xs`, stacked. Active state: icon and label `--accent`, 2px top indicator bar in `--accent`. Inactive: `--fg-subtle`.
- 56px tap area minimum per item.
- Hide on desktop (≥1024px) — sidebar takes over.

### 7.9 Segmented control

Used for time-range switching on Trends ("D / W / M / Y") and similar small-cardinality choices.

- Container: `--bg-surface-sunken`, `--radius-md`, padding 4px, inline-flex.
- Each segment: `--text-sm`, `--fw-medium`, padding 6 × 12, `--radius-sm`.
- Active segment: `--bg-surface` background, `--elev-1`, `--fg-default`, with `--accent` left-bar indicator (2px).
- Inactive: `--fg-muted`. Hover: `--fg-default`.
- Animate background of active via `transform` on a sliding pill (200ms emphasized).

### 7.10 Sheet (mobile) / Modal (desktop)

**Mobile (default):**
- Slides up from bottom. `--bg-surface-elevated`, `--radius-xl` on top corners only.
- Drag handle (32 × 4, `--fg-subtle`, `--radius-full`) at top, 12px from edge.
- Max height: `92dvh`. Scrolls internally if content overflows.
- Scrim: `--scrim` + `backdrop-filter: blur(4px)`.
- Swipe-down dismisses; if there are unsaved changes, confirm dialog first.
- Header row: title (`--text-md` `--fw-semibold`) left, Cancel/Done buttons right.

**Desktop (≥1024):**
- Centered modal, `max-width: 480px`, `--radius-xl`, `--elev-3`.
- Close (×) button top-right.
- Same scrim.

### 7.11 List / row

For the manual entry list (food log, water log, etc.):
- Container: card or full-width section.
- Each row: 56px min height, padding 12 × 16, `--border-default` divider between rows (not on first/last).
- Left: icon (optional) + primary text (`--text-base`) + secondary text (`--text-sm` `--fg-muted`) stacked.
- Right: value (`tabular-nums`) + chevron if tappable.
- Swipe-left reveals destructive action (Delete) with `--danger` background. Always also expose a Delete action in a long-press menu or via the row's detail page — swipe alone is not the only path.

### 7.12 Empty state

- Vertical, centered in the container.
- 32px icon, `--fg-subtle`.
- Title `--text-md` `--fw-semibold`.
- One sentence guidance `--text-sm` `--fg-muted`.
- One primary button to fix it ("Add your first meal").
- Never just a blank chart — render the empty state instead.

### 7.13 Toast

- Bottom-center on mobile (above tab bar), bottom-right on desktop.
- `--bg-surface-elevated`, border `--border-default`, `--elev-2`, `--radius-md`, padding 12 × 16.
- Auto-dismiss in 4s. Critical errors stay until acknowledged.
- `role="status"` for info/success, `role="alert"` for errors.
- No focus stealing. Action button (Undo) optional.

### 7.14 Badge / chip

- Inline-flex, `--text-xs`, `--fw-medium`, padding 2 × 8, `--radius-xs`.
- Variants: `tonal-accent` (default), `positive`, `warning`, `danger`, `neutral`.
- Tonal background uses the corresponding `--*-subtle` token; text uses the solid token.

---

## 8. Chart styling (library-agnostic)

The chart library is deliberately deferred. These rules let us swap libraries without changing the visual language. Every chart implementation must read from these CSS vars at runtime (not hardcode hex).

### 8.1 Series colors

Use `--data-1` through `--data-7` in order. The metric → color binding lives in one place (`src/lib/charts/palette.ts`):

```ts
export const metricColors = {
  weight:   'var(--data-1)',
  protein:  'var(--data-2)',
  steps:    'var(--data-2)',
  water:    'var(--data-2)',
  calories: 'var(--data-3)',
  sleep:    'var(--data-4)',
  workouts: 'var(--data-5)',
  hr:       'var(--data-6)',
  bodyFat:  'var(--data-7)',
};
```

### 8.2 Axes & grid

- Axis tick text: `--text-xs`, `--fg-subtle`, `tabular-nums`.
- Axis line: hide on Y, show on X with `--border-default`.
- Grid lines: horizontal only, dashed `2 4`, color `--border-default` at 50% opacity.
- Origin: not forced to zero for weight/HR/sleep; auto-fit with 5% padding. Forced to zero for cumulative metrics (calories today, steps today).

### 8.3 Tooltip

- `--bg-surface-elevated` bg, 1px `--border-default`, `--radius-md`, `--elev-2`, padding 8 × 12.
- Date: `--text-xs` `--fg-muted` (e.g. "Tue, May 13").
- Value: `--text-sm` `--fg-default` `tabular-nums` + unit.
- Delta vs target (optional): `--text-xs` in semantic color.
- Triggers: hover on desktop, tap on mobile. Tap-and-drag along X scrubs.

### 8.4 Line / area chart

- Stroke 2px, smooth (monotone interpolation), color from palette.
- Area fill: linear gradient from `--data-N-subtle` at top → transparent at baseline.
- No markers by default; show single hover/scrub marker (filled circle 6px in stroke color, white halo 2px).

### 8.5 Bar chart

- Bar fill: solid `--data-N`.
- Bar radius: `--radius-sm` on top corners only.
- Gap between bars: 25% of bar width; gap between groups: 50%.
- For "today's hourly steps"-style charts on mobile, ≤24 bars per view.

### 8.6 Donut / pie

- **Avoid for >5 categories.** Use a horizontal bar instead.
- Stroke 2px `--bg-canvas` between slices (separates them visually).
- Inner radius ≥ 60% (donut, not pie). Center holds total + label.

### 8.7 Heatmap (calendar)

For habit tracking / streaks in v2:
- 5-step color scale from `--bg-surface-sunken` (no data) to `--accent` (max). Each step is a fixed alpha applied to `--accent`.
- 12px squares, 2px gap, `--radius-xs`.

### 8.8 Empty / error / loading

- Loading: skeleton block, `--bg-surface-sunken`, no shimmer animation if `prefers-reduced-motion`.
- Empty: 7.12 empty state pattern, not an empty frame.
- Error: red icon + message + Retry button.

### 8.9 Accessibility for charts

- Every chart has an associated visually-hidden `<table>` with the same data (`.sr-only`).
- Series legends always visible, positioned above or next to the chart (not below the fold).
- Tooltip data also exposed as ARIA live region on focus.
- Color never the only encoding — pair with shape (different marker per series) or pattern (dashed/solid) when there are 2+ series in a single chart.

---

## 9. Home-screen bento layout

### 9.1 Mobile (375 – 767px)

```
┌─────────────────────────────────────────┐
│  HEADER (sticky, safe-area-aware)       │  56 + safe-area-top
│   Good morning, Joao        🔔  ⚙       │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │   ← 2 cols, 12px gap
│  │  WEIGHT     │  │  CALORIES       │  │
│  │   82.4 kg   │  │   1240 / 1800   │  │
│  │   ▼ 1.2     │  │   ▓▓▓▓▓▓▓░░ 69% │  │
│  │   ╱╲╱╲╱╲    │  │   560 left      │  │
│  └─────────────┘  └─────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐ │   ← 2-col span
│  │  STEPS         7,432 / 8,000      │ │
│  │   ╱╲    ╱╲╱╲╱╲                    │ │
│  │  ╱  ╲__╱      ╲___                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Quick log                              │   ← uppercase --tracking-label
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │   ← scroll-snap row
│  │ +250 ml │ │ +500 ml │ │  Meal   │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │  PROTEIN    │  │  SLEEP          │  │
│  │  86 / 140 g │  │  7h 12m         │  │
│  │  ▓▓▓░░ 61%  │  │   ╱╲╱╲╱╲        │  │
│  └─────────────┘  └─────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐ │   ← 2x2 weight trend
│  │  THIS WEEK                        │ │
│  │   ╲          ╲                    │ │
│  │    ╲__       ╲___                 │ │
│  │       ╲___      ╲___              │ │
│  │  Mon  Tue  Wed  Thu  Fri  Sat Sun │ │
│  └───────────────────────────────────┘ │
│                                  ╭───╮ │
│                                  │ + │ │   ← FAB
│  ┌──────┬──────┬──────┬──────┐  ╰───╯ │
│  │ Home │ Log  │Trend │ Set. │        │   ← Tab bar (blur)
│  └──────┴──────┴──────┴──────┘         │
└─────────────────────────────────────────┘
```

**Spec:**
- Page padding: 16px horizontal, 16px top below header, bottom padding `calc(72px + env(safe-area-inset-bottom) + 16px)` so the last tile clears the tab bar + FAB.
- Grid: `grid-template-columns: repeat(2, 1fr); gap: 12px;`
- Tiles use `grid-column: span 1` (default) or `span 2` (hero rows).
- Quick-log row: `overflow-x: auto; scroll-snap-type: x mandatory;` so additional quick-add chips can be added without breaking layout.
- The Quick log label is one of the few "section heads" — `--text-xs`, `--tracking-label`, `--fg-muted`, full-width, margin-top 8.

### 9.2 Tablet (768 – 1023px)

- Grid switches to `repeat(3, 1fr)`; tiles can now span 1, 2, or 3.
- FAB stays; tab bar stays at the bottom.

### 9.3 Desktop (≥1024px)

- Grid `repeat(4, 1fr); gap: 16px;` inside `max-width: 1280px`, page padding 32px.
- Tab bar → sidebar (240px) on the left; top row reserved for the page title + actions.
- FAB removed; primary action surfaces as a button in the page header.
- Charts can now span 2–4 columns for richer detail views.

---

## 10. Iconography

- **Library:** Lucide (`lucide-svelte`). Single library, single visual language.
- **Sizes:** 16 / 20 / 24 px. Default 20px inline with body; 24px in nav.
- **Stroke:** 1.5px (Lucide default). Don't mix with 2px stroke icons.
- **Color:** `currentColor`. Buttons set their own foreground.
- **Decorative icons:** `aria-hidden="true"`.
- **Standalone icon buttons:** `aria-label` is mandatory.

---

## 11. PWA & mobile specifics

### 11.1 Manifest essentials

- `display: standalone`.
- `theme_color`: `#0A0A0B` (dark) — iOS uses this for the status bar background.
- `background_color`: `#0A0A0B` matching canvas to avoid splash flash.
- 192/512 maskable icons. Monochrome iOS-style icon (no full-bleed).
- `start_url: /`, `scope: /`.

### 11.2 Safe areas

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- Tab bar, FAB, and headers must reserve `env(safe-area-inset-*)`. Apply via padding, not margin.
- iOS notch / Dynamic Island never overlaps interactive elements.

### 11.3 Touch & input

- All tap targets ≥ 44 × 44 pt, with 8pt spacing minimum.
- `touch-action: manipulation` on buttons to kill 300ms delay.
- Inputs use semantic types: `type="number"` + `inputmode="decimal"` for weight/calories, `type="email"`, etc.
- Haptics (`navigator.vibrate`) on quick-log success: 10ms light tick. Only on confirmed writes, never on hover.

### 11.4 Status bar

- iOS Safari standalone: `apple-mobile-web-app-status-bar-style: black-translucent`. The page's own gradient draws under the status bar.

---

## 12. Accessibility (non-negotiable)

| Item                                                         | Check                                          |
|--------------------------------------------------------------|------------------------------------------------|
| Body text contrast                                           | ≥ 4.5:1 in both themes                         |
| Large text (≥18px or ≥14px bold) contrast                    | ≥ 3:1                                          |
| Focus ring visible on every interactive element              | 2px `--border-focus`, offset 2px              |
| Icon-only buttons have `aria-label`                          | Required                                       |
| Form inputs have visible `<label>` linked via `for`/`id`     | Required                                       |
| Error messages near the field + `aria-describedby`           | Required                                       |
| Color paired with icon / sign / text                         | Required for any semantic color                |
| `prefers-reduced-motion` respected                           | Animations disabled, not reduced               |
| `prefers-color-scheme` honoured by default                   | Required                                       |
| Charts have visually-hidden data table alternative           | Required                                       |
| Tab order matches visual order                               | Required                                       |
| Heading hierarchy `h1 → h2 → h3` with no skips               | Required                                       |
| Skip link "Skip to content" on every page                    | Required                                       |
| Live regions for toasts (`role="status"` / `role="alert"`)   | Required                                       |

---

## 13. Anti-patterns (don't do this)

- Don't use emoji as structural icons. Use Lucide.
- Don't introduce a new color outside the tokens above. If you need a new semantic color, add it to this file first.
- Don't hardcode hex anywhere except this file.
- Don't put a primary CTA and a destructive CTA next to each other without spatial separation (≥ 24px gap or a divider).
- Don't use placeholder as the only label.
- Don't use a pie chart for >5 categories.
- Don't animate `width` / `height` / `top` / `left`. Use `transform`.
- Don't disable zoom (`maximum-scale=1`). Ever.
- Don't use a sub-16px font on a mobile input — iOS will auto-zoom.
- Don't use shadows in dark mode as the *sole* elevation cue. Always pair with border.
- Don't celebrate every action. Goal-met checkmark is the one celebratory animation; everything else is calm.

---

## 14. Page overrides

When building a specific page (e.g. `trends`, `food-log`), check `design-system/pages/<page>.md` first. If it exists, its rules override this file *for that page only*. If not, this file is authoritative.

Common reasons to create a page override:
- A page needs a chart variant not covered here (e.g. a sleep-stages stacked bar).
- A page needs additional `--data-N` slots for many series at once.
- A page has unique spacing / hierarchy needs (e.g. landing page if we ever build one).

Override files should be short — only the deltas, not a full copy of this file.
