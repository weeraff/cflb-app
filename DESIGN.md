# Design

<!-- impeccable:design-schema 1 -->

## Direction

CFLB reads as a live scoreboard, not a content blog. Stats and scores lead; the app refuses the generic card-grid aggregator look most fan sites default to. Pinned by the user as "slick sports app, ESPN/Sofascore energy" — dark mode was a requirement, not a category default.

## Visual System

- **Ground:** near-black (`--bg: #0a0e14`), dark slate surfaces (`--surface: #12171f`, `--surface-alt: #1a212c`).
- **Accent (Committed strategy):** pitch green (`--accent: #2ee6a6`) — football-turf-specific rather than generic tech neon, carries live/action states: active nav pill, buttons, promotion zone, source labels, leaderboard points.
- **Secondary:** gold (`--gold: #d4af37`) reserved for rank/prestige only — leaderboard #1, "Sponsored" micro-label.
- **Danger:** `--danger: #ef4a5c` for relegation zone only.
- **Type:** Oswald (condensed, scoreboard/jersey character) carries headings, nav, scores, team names, buttons. Inter carries body copy and snippets. Loaded via Google Fonts in `index.html`.
- **Radius/depth:** 10px card radius, 1px borders, no drop shadows on rest state — hover states use border-color shift and a soft accent-tinted glow on primary buttons only.

## Components

- **Nav:** pill-style, active tab fills solid accent. Wordmark swaps to "CFLB" under 480px to prevent overflow.
- **Sponsor slots:** solid bordered card with a small gold "Sponsored" label (functional ad-slot disclosure, not decorative).
- **News:** first article renders as a full-bleed image hero with scrim-over-text; remaining articles are a compact image+text list.
- **Standings table:** promotion (top zone) and relegation (bottom zone) rows get a colored left rule and colored position number — a real sports-table convention, not decoration. Legend below the table explains the colors.
- **Predictions:** fixture cards styled as a scoreboard row (team / score input / "v" / score input / team). Leaderboard ranks #1–3 in gold/silver/bronze.
- **Podcast:** badge-labeled cards (episode vs. clip), embeds Spotify show and YouTube channel uploads.

## Constraints Carried Forward

- Sponsor placements (header/feed/sidebar) must stay visually prominent — confirmed real monetization mechanic, not filler.
- Grid layout uses `minmax(0, 1fr)` columns, not bare `1fr` — bare `1fr` silently overflows on narrow viewports when any child has a wide unbreakable min-content (this bit us once; don't reintroduce it).
