# Header Carousel

Discourse theme component that renders a featured-content carousel
above the topic list on configured pages. Slides are pulled per locale
from a JSON feed; English falls back to a static welcome banner when
the feed is empty.

## Behavior

- Renders only on paths listed in the `allowed_paths` setting (default:
  homepage, `/latest`, and the five language-section category pages).
- Hidden for anonymous visitors by default — toggle via
  `show_for_anonymous`.
- Slides come from `${api_base_url}/carousel-{locale}.json`. The user's
  Discourse locale is mapped via the `locale_map` setting
  (e.g. `de → de-de`, `en → en-gb`).
- If the feed is empty:
  - English → static welcome banner (single slide, no nav / no dots).
  - Other locales → carousel doesn't mount at all.
- Autoplay (default 5s) pauses on hover and on focus inside the
  viewport, and is disabled entirely under
  `prefers-reduced-motion: reduce`.
- Keyboard: `←` / `→` arrow keys when the viewport has focus.
- Touch swipe: > 40 px horizontal drag.
- RTL: on `lang="ar"` (or `dir="rtl"`) the slide ordering is preserved
  (data-driven), but arrow keys and swipe direction are mirrored.

## What this is a refactor of

Replaces the legacy "Custom Header Carousel" theme that bundled JS,
SCSS, head_tag.html and a deprecated `<script type="text/discourse-plugin"
version="0.8">` wrapper. Functional behavior is preserved 1:1; the
implementation was modernized:

- `apiInitializer("1.39.0", …)` — no deprecated wrapper.
- All hardcoded values moved to `settings.yml` (URL, paths, locale map,
  autoplay timing, fallback slide content).
- All UI strings moved to `locales/{de,en,fr,ar,ru,uk}.yml` and
  fetched via `i18n("header_carousel.<key>")` — used to live as a
  `READ_MORE_LABELS` dictionary inside the JS.
- DOM built via `createElement` + `textContent` — the legacy version
  used `innerHTML` with template strings interpolating raw API data
  (XSS surface).
- Listener cleanup via `AbortController` (was: `node.replaceWith(node.cloneNode(true))`).
- The continuous `MutationObserver` watching `#main-outlet` for re-paint
  is gone — placement happens on `api.onPageChange` only, with a single
  re-place check per nav.
- The English-special-case (slides as `<div>` instead of `<a>`,
  controls hidden via `html[lang|=en]` CSS rules) is replaced by a
  generic `hf-single` class added when there's only one slide. Slides
  use `<a>` when they have a URL, `<div>` otherwise — same behavior,
  no locale branching in the renderer.

## Settings

| Key | Default | Description |
|---|---|---|
| `api_base_url` | `https://community.enableme.org` | Origin of the per-locale JSON feeds |
| `allowed_paths` | homepage, `/latest`, 5 category pages | Pages on which the carousel renders (exact match) |
| `locale_map` | `de:de-de\|fr:fr-fr\|en:en-gb\|ru:ru\|uk:uk\|ar:ar-ma` | UI-locale → feed-slug |
| `autoplay_ms` | `5000` | Autoplay interval in ms (`0` disables) |
| `placeholder_image` | placehold.co URL | Fallback image when a slide has no Image field |
| `show_for_anonymous` | `false` | Show to logged-out visitors |
| `en_static_fallback_enabled` | `true` | Render the welcome banner when EN feed is empty |
| `en_fallback_image` | EnableMe upload URL | Image for the EN welcome banner |
| `en_fallback_url` | `/pub/welcome` | Click-through URL for the EN welcome banner |
| `debug_logging` | `false` | Log lifecycle / fetch events with `[HF]` prefix |

## Install

In Discourse admin → Customize → Themes → Components → **Install** →
**From a git repository**:

```
https://gitlab.com/Maxiii12/discourse-header-carousel.git
```

Then add the component to your active theme.

## File layout

```
about.json
settings.yml
locales/
  de.yml  en.yml  fr.yml  ar.yml  ru.yml  uk.yml
common/
  common.scss
javascripts/
  discourse/
    api-initializers/
      header-carousel.js
README.md
```
