# Design

<!-- impeccable:design-schema 1 -->

## Direction

CFLB reads as a matchday programme, not a SaaS dashboard. The prior "dark scoreboard, ESPN/Sofascore energy" direction was rejected by the user as generic — four passes (flat neon dashboard, bolder type only, teletext x2) were tried before this one landed. The defining fix wasn't a new color or font, it was composition: every earlier pass reused the same stacked hero-metric-card page shape under different paint. This world uses an asymmetric splash-plus-sidebar cover grid and dense hairline-ruled lists instead, matching a real matchday programme's structure.

## Visual System

- **Ground:** near-black ink (`--bg: #0b0d10`). No card surfaces with fills — sections sit directly on the ground, separated by hairline rules (`--border: rgba(255,255,255,0.16)`), not boxes.
- **Accent (Committed strategy):** flat pitch green (`--accent: #2ee6a6`), used as a single flat spot-ink color — no gradients, no glow, no glass. Carries active nav underline, buttons, promotion zone, source tags, leaderboard points.
- **Secondary:** gold (`--gold: #ffc233`) for rank/prestige/points only — leaderboard #1, points columns, section-label tags.
- **Danger:** `--danger: #ff4d4d` for relegation zone only.
- **Type:** Anton (`--font-splash`) carries true splash moments only — h1/h2/h3, the rank ordinal, standings position numerals, score-stepper values. Archivo Narrow (`--font-display` / `--font-body`) carries everything else: nav, data, body copy, small caps labels. Loaded via Google Fonts in `index.html`.
- **Radius/depth:** zero border-radius anywhere — print has no rounded corners. No box-shadows, no backdrop-filter/blur, no gradients on surfaces. Depth comes from hairline rules and a 4px solid accent-color left rule on the rank panel, never from soft effects.
- **Photography:** hero/list images run through `grayscale()` + a flat accent-color duotone tint (`mix-blend-mode: color` on a full-bleed accent layer) rather than full color — reinforces the print-ink material rather than a glossy photo card.

## Components

- **Masthead/nav:** wordmark in Anton, underline-style nav (active = green underline + full-brightness text, inactive = dim text) — not pill buttons.
- **News:** asymmetric two-column cover grid — full-bleed duotone splash story on the left (Anton headline overlaid on the image), a sidebar on the right stacking the rank panel, notification opt-in, matchday banner, and games-coming-up. Below the cover, remaining articles run as a plain hairline-divided list. Collapses to one column under 780px; the hero drops its absolute-positioned overlay and flows the headline below the image under 480px (a fixed-height hero with overlaid text broke on mobile once when the image was short and the headline long — don't reintroduce the overlay below 480px).
- **Rank panel:** a 4px solid accent-color left rule, no card fill — Anton ordinal at up to 4.5rem, gold only for #1.
- **Standings table:** dense hairline grid (`border-bottom` rules only, no boxed card). Promotion/relegation rows get a colored position number in Anton, no left-rule border (dropped in this pass — the color-coded numeral alone carries the meaning). Sticky `#`/Team columns on horizontal scroll (mobile). Legend below.
- **Predictions:** fixture list is a two-column grid of hairline-divided classified-style boxes (one column on narrow viewports), not stacked full-width cards. Home/away rows separated by a dashed rule, no "v" divider pill. One bulk "Submit Predictions" button at the bottom, not one per fixture.
- **Podcast:** hero "Latest Episode" (Anton title), a capped compact previous-episodes list (hairline rows with thumbnails), a separate horizontal-scroll Shorts row, Spotify audio feed capped in a sidebar with an overflow count once it exceeds the cap.
- **Team crests:** real `logo_url` image when present; otherwise a flat monogram badge (initials, deterministic color per team name, no radius) — never a blank placeholder circle.

## Constraints Carried Forward

- Dark mode is a hard requirement, not a category default — ruled out an otherwise-strong teletext/newsprint direction earlier in this process for conflicting with it (light cream-paper ground).
- Sponsor placements (header/feed/sidebar) must stay visually prominent — confirmed real monetization mechanic, not filler.
- Grid layout uses `minmax(0, 1fr)` columns, not bare `1fr` — bare `1fr` silently overflows on narrow viewports when any child has a wide unbreakable min-content (this bit us once; don't reintroduce it).
- Touch targets stay at 44px minimum across nav, buttons, and the score stepper.
