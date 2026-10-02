# Adi Vrskic — portfolio

A minimal two-column portfolio (one column on phones):

- **Left:** a 3×3×3 cube in matte plaster, like a cast bust, shot with a tilt-shift lens, floating a little above a soft shadow (as if on a seamless studio backdrop). It is heavy: it lands from its intro still spinning and keeps turning on its own momentum, easing to a slow spin; a drag or fling carries on the same way, and the pointer only pulls on it gently. Every face reads *adi / vrs / kic*, a letter pressed into every block (no colour, just light and shade). The icon buttons (About, Contact and the social links; on project pages: back, case study, live site, code) stand upright in the middle of the page (a row under the cube on phones). Two faint lights in the colour of the project in focus (and a neighbouring hue) slowly orbit it; scrolling the gallery turns one slice exactly one full turn per project. When **About** / **Contact** / the chat (or a project's case study) open, the blocks part and the cube stops turning: each block turns on its own instead, the top layer first (a reply starting in the chat flicks them round), and the orb at its centre glows softly in the selected project's colour; as it closes they square up and the cube comes back together and picks up its spin. Click the cube to talk to it: its chat opens on the right (click it again, or Esc, to close it).
- **Right:** a 3D drum carousel with a progress bar (on phones a short rail under the menu icons), set in a little towards the middle of the page; the focused card is exactly as far from the menu's icons as from the progress rail. The focused card is just the site, scrolling through it like a screen recording (a full-length capture panned down and back up), set in a little from the card's edges on a blurred frame of its own colours so its header clears the rounded corners, with nothing over it: the project's name and what it is sit just under it on the page (the title at the card's left edge, what it is at its right), rolling on to the next as the gallery turns, with the cards passing over them. It floats on a soft tinted shadow, and lifts a little under the pointer. The gallery comes in already on the first project (Plumeform), slowly: the card rises and fades in, the cards stacked above and below open out from behind it, the menu's icons come in one after another and the progress rail draws itself in. The cards stacked above and below are plain gray, and a card fades into the gray as it turns away. The page's scrollbar is always there, so nothing shifts sideways between pages. Behind it all, an equalizer of tiny cubes (under the cube and its shadow too) runs across the middle of the page: 400 bars in shades of the project in focus, each jumping and falling back like a meter (with held peaks), growing up and down from the middle at once, mirrored, and shrinking, blurring and fading on the way out. It has depth, like a ring seen from inside it (and a little above): its middle is the far side, smaller, its bars crowded together and hazier, and it comes nearer towards the ends of the screen, bigger and a little lower. On a phone it runs down the middle of the screen instead, top to bottom, its bars growing left and right, with far fewer (bigger) cubes. Beats ripple through it and scrolling the gallery pumps it up; it stays on every page.
- **Intro:** a thin ring fills as the page loads while the cube fades in at its centre, scrambled like a Rubik's cube (letters out of place and turned), and turns itself back a quarter turn at a time; the ring closes as the name reads true on every face. Then the ring fades out; then the cube draws back into the scene, arcs over and comes forward into its spot (on a phone it rises straight up, drawing back and forward only), making one slow, even turn on the way (its front swinging round to the right), and eases straight into its idle motion as it lands, still turning that way; only once it has landed does the rest of the page come in.
- **About / Contact / chat:** a scrollable two-tone text column that replaces the gallery on the right (the gallery animates out, and back in when you leave). Contact is a plain form under *Send a message:* (Name, Email and Message, each named over its field, then *Send*) in the column's own type; its parts rise in one after another and their hairlines draw in. It sends with [Resend](https://resend.com). The chat is **Qb**, Adi's personal assistant (the cube opens it), answering questions about Adi and his work with Claude: replies are written out on the left a word at a time at an easy reading pace, each word fading in, set in the same type (grey, with key words in ink), your own messages on the right in ink, above the line you type into (Qb is answering until the last word is down); the conversation stays while the panel is closed. Qb can also email Adi for a visitor, through the same function as the form. On a phone the column scrolls under the cube and the menu, which stay at the top of the screen, as a project page does (below).
- **Project pages:** clicking the focused card grows it into the page's hero: the same card, larger, over where the progress bar was and a padding in from the edges, its text and veil clearing away (the title and line are on the left), and sized so the next card always shows below it. The rest of the project's media follows in a scrolling column, each picture with its caption under it, then a next-project card. Back (or the browser's back button) shrinks the hero into the gallery again. The next-project card's picture grows into that project's hero as the page fades, and the rest of the new page comes in under it; going back to the previous project (the browser's back button) the pages slide down past each other. The info button parts the cube's blocks and blurs it where it is, and brings the written case study up over it: the name under the cube rolls up out of sight and the study slides up into place from there, in a column the full height of the page that scrolls on up over the cube, its own title and line rolling into view level with the menu's back arrow as the rest arrives; closing (or Esc) the study's title rolls away, the rest slides back down and the name under the cube rolls back in. On a phone, a project page keeps the cube, its title and the menu at the top of the screen and scrolls under them, its top edge fading and blurring out once it has moved; the case study opens at the top of the page. The page covers the screen behind them, so a drag anywhere (on the title, the cube or between the menu's buttons) scrolls it, and a swipe that starts on the cube scrolls the page rather than counting as a tap on it.

React 19 · Vite · TypeScript · three.js / React Three Fiber · postprocessing · motion · zustand.

## Run

```bash
npm install
npm run dev
```

`npm run build` type-checks and builds to `dist/`; `npm run preview` serves the build.

The chat and the contact form need keys. Copy `.env.example` to `.env.local` and fill in `ANTHROPIC_API_KEY` (the chat) and `RESEND_API_KEY` (the form); the dev and preview servers run the site's functions (`netlify/functions`) at the same `/api/chat` and `/api/contact` paths as production, and pick up a changed `.env.local` by themselves. Without a key the page still works: the chat says it isn't set up yet, the form that it couldn't send.

## Edit content

| What | Where |
| --- | --- |
| Name, role, bio, toolkit (by area), email, social links (wrap words in `**…**` to set them in ink) | `src/data/site.ts` (the chat's brief lists the same toolkit: keep SKILLS in `netlify/functions/chat.js` in step) |
| Projects (title, year, summary, stack, links, case-study sections, glow colour) | `src/data/projects.ts` |
| Which images each project page shows, in what order, and how a cropped cover is anchored | `scripts/media.config.mjs` |
| The name on the cube (row by row; a space leaves a block blank) | `NAME_ROWS` in `src/scene/letters.ts` |
| What the chat (Qb) knows and how it talks: bio, projects, rules, the email it can send; its model | `PERSONAL_CONTEXT` and `MODEL` in `netlify/functions/chat.js` (or set `CHAT_MODEL`) |
| The chat's greeting and starter questions | `greeting` in `src/state/chat.ts`, `SUGGESTIONS` in `src/components/Chat.tsx` |
| Where the contact form (and Qb's emails) go | `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` (see `.env.example`) |
| How those emails look (the card, its dark mode and the plain-text copy) | `contactEmail` in `netlify/lib/email.js` |

Project order in `PROJECTS` is the carousel order. `accent` sets the cube's glow for that project (it is pushed towards a saturated mid-tone automatically). Private repos simply omit `links.repo`.

## Images

Source images live in `assets-src/<slug>/` (git-ignored; the optimised output in `public/projects/` is what ships).

```bash
npm run shots                    # screenshot every live site (desktop, a scrolled frame, mobile)
npm run shots -- xsbl            # just one project
npm run scrolls                  # each live site from the top down, for the cards' scroll
node scripts/generate-art.mjs    # cover art for a project without screenshots (none now: Keyfall has its own)
npm run images                   # optimise → public/projects + baked blur backdrops + accents
```

`npm run shots` and `npm run scrolls` drive an installed Chromium browser (Edge or Chrome; override with `BROWSER_PATH`); the sites they visit are listed in `scripts/browser.mjs`. A scroll capture walks down the page first so lazy images and scroll-triggered sections appear, then saves up to six screens in one image; sites whose sections only draw while scrolling (`stitch: true`) are captured a screen at a time and joined, and a target's `scroll` sets its own screen size (wider for a site that centres its content, so its header clears a card's rounded corners; taller for a single-screen app, so it fills a card). Keyfall has no live site, so its `assets-src/keyfall/scroll.png` is its player, captured by hand from its own build at a card's shape (1180×1030): it fills a desktop card exactly, and a phone's shorter card pans through it the way it does a site. On a card the site is set in a little from the edges, on a thin frame of its own colours blurred, so a page's header always shows whole. `npm run images` writes `src/data/media.generated.json`, which `projects.ts` reads, so after changing `media.config.mjs` just re-run it. The blurred card backgrounds are baked into tiny WebP files (saturation-boosted so they pop) and blurred more in CSS (`.frame-blur` in `project.css`, and `.card-backdrop` for a card's frame: still images, so they are drawn once). It also measures how light each blur is behind the card label and switches that label to dark text where white would wash out.

## Settings: the cube and the equalizer

Everything you might want to change is in `src/config.ts`: the cube (size, pose, sway, block gap and rounding, colour, roughness, letter depth, the lights, its spin (and how fast the blocks turn while it is parted), the core's glow and bloom while it is open, hover and scroll motion, the floor under it (its shadow's darkness, colour, softness and detail, how far below the floor is and its tilt, where the shadow's light comes from, and the core's glow on it), the loading puzzle, the intro flight) and the equalizer (which edge of the screen it comes in from: right, left, top or bottom, or the middle of the screen, where its bars grow up and down at once, mirrored (down the middle on a phone, growing left and right); where it shows; reach, number of bars (and how many on a phone), gaps, the parabola, shrink, fade and blur, its depth as a ring (how much nearer its ends are, the haze on its far middle, and how far its ends drop), energy, waves, beats, attack and release, peaks and the shades).

## Where the look lives

| Effect | File | Knobs |
| --- | --- | --- |
| Cards: the site scrolling, the glass under the text, title, line and call to explore | `src/components/CardFace.tsx`, `carousel.css` (`.card-*`, `.card-glass`, `site-scroll`) | the scroll's pace (`cycleFor`), how far above the title the glass starts (`.card-foot`), its blur and gradient, the type |
| Voxel cube: plaster material, lights, groove shading, spins, the loading puzzle (most knobs are in `src/config.ts`) | `src/scene/VoxelCube.tsx` | block gap, colour/roughness/sheen, light colours and orbit, how far the blocks part; the room they get to turn in (`ROOM`, `SHRINK`) and the flick (`KICK`) |
| About / Contact section (the toolkit, and the contact form) | `src/components/InfoSection.tsx`, `info.css` (`.info-kit*`, `.contact-*`), reveal timing in `reveal.ts` | typography, reveal timing, where the text starts, the form's labels, its fields' hairlines and when they draw in |
| The cube's chat | `src/components/Chat.tsx`, `chat.css`; the conversation and streaming in `src/state/chat.ts`; replies written out in `src/components/Typed.tsx` | how far above the bottom the line to type into is kept (`scroll-margin-bottom`), the dots, the starter questions; the writing pace (`WORD_MS`, `SENTENCE_MS`) and each word's fade (`.chat-word`) |
| Pressed-in letters | `src/scene/letters.ts` + `uLetterDepth` / `uLetterTint` in `VoxelCube.tsx` | font weight/size, bevel softness, depth, tint |
| Page background + light around the cube | `src/scene/Backdrop.tsx` | colour, glow spread |
| Tilt-shift, the core's bloom | `src/scene/Scene.tsx` (`Effects`, `BLOOM_THRESHOLD`), `src/scene/TiltShiftEffect.ts` | focus band, ramp, max blur, region; what blooms (only the core, burning brighter than white: `coreHeat`) |
| Drum carousel motion, position, gray cards, top/bottom fade | `src/components/Carousel.tsx`, `carousel.css` (`--card-w0`, `--shift0`, `--rail-x`, `--card-gray`, `--fade`; the menu's place is `--menu-x` in `layout.css`) | `layout()` spacing/angles, spring stiffness/damping/mass; the base card and how far it sits towards the middle, and where the progress rail is (the card then widens until its gaps to the menu and the rail match); the gray, fade height |
| Project ↔ project (the pages slide past each other) | `src/components/ProjectPage.tsx` (`SLIDE`, `page`, `holdInPlace`), the direction in `src/App.tsx` | duration and curve, how far they travel |
| Card ↔ project hero (the clicked card grows into the project page; Back shrinks it again) | `src/components/Morph.tsx`, `src/components/CardFace.tsx` (shared by the gallery, the flight and the hero), `project.css` (`--hero-w`), `layout.css` (`--pad`) | flight length and easing, hero size, padding from the page edges; card proportions are `--card-ratio` in `carousel.css` |
| Case study over the cube | `Brief` and `Lifted` in `src/components/LeftColumn.tsx`, `layout.css` (`.brief`) | typography, where it starts (level with the back arrow, `--back-mid`), its column's width, the lift up and back down (`LIFT`, `SETTLE`); how soft the cube goes behind it is `infoBlur` in `src/config.ts` |
| Intro, in phases (ring fills → ring fades → cube flies and turns → page comes in) | `src/components/Loader.tsx` (phases, ring fade), `src/scene/flight.ts` (the flight's curves), `src/state/loading.ts` | minimum duration, fade length and pause, what counts towards progress; the flight's length, depth, bow and turns are `flightSeconds` / `flightDepth` / `flightBow` / `flightTurns` in `src/config.ts` |
| Equalizer of tiny cubes from an edge (or from the middle, mirrored) | `src/scene/Equalizer.tsx` (settings in `src/config.ts`) | edge (`center` for the middle), reach, bars (`lines`), gaps, how much shorter the end bars are (`taper`), energy and beats, attack/release, the shades, where the fade and blur start |

The DOM drives the 3D layout: the cube is drawn wherever the `[data-cube-anchor]` element is.

## Deploy

Netlify builds the site from `netlify.toml` (`npm run build`, publishing `dist`, Node 22). The two functions in `netlify/functions` serve `/api/chat` and `/api/contact`; a function's path is answered before any redirect.

Environment variables (*Site configuration → Environment variables*; a change needs a new deploy to reach the functions):

| Name | For | |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | the chat | required |
| `RESEND_API_KEY` | the contact form, and Qb's emails | required |
| `CONTACT_FROM_EMAIL` | the sender, e.g. `Adi Vrskic <hello@adivrskic.dev>` | a domain verified in Resend; without it Resend's test sender only delivers to the Resend account's own inbox |
| `CONTACT_TO_EMAIL` | where messages go | defaults to adivrskic123@gmail.com |
| `CHAT_MODEL` | another Claude model for the chat | defaults to `claude-sonnet-5-5` |

The functions only answer the site itself (`adivrskic.dev`, `www.`, a deploy preview calling its own functions, and localhost; a request has to say where it comes from), cap a conversation at 40 messages / 24,000 characters (the oldest drop off), and rate-limit each visitor twice: Netlify's own limit across every instance (10 chat / 3 contact requests a minute, the `rateLimit` in each function's config) and a per-instance one (20 / 5 per 10 minutes). Qb's replies are signed when they're sent (an HMAC keyed off the API key), and a reply that comes back with the conversation without a valid signature is dropped, so nobody can put words in Qb's mouth. Put a monthly spend limit on the Anthropic key as well.

`vercel.json` still routes the app on Vercel, but the chat, the form, the headers and the page-per-route files are Netlify's.

## Search, sharing and security

`npm run build` also writes (the seo plugins in `vite.config.ts`, from `src/data`): a page per route with its own title, description, canonical link, Open Graph / Twitter card and structured data (`dist/_pages`, served at the clean URLs by a generated `_redirects`), a 404 page for anything else, `sitemap.xml` and `robots.txt`, and a 1200×630 sharing card per project from its cover (`dist/og`). The home page's card is `public/og/home.jpg`, a screenshot of the site; the site's URL comes from Netlify's `URL` (defaults to `https://www.adivrskic.dev`).

`netlify.toml` sets the security headers: a Content-Security-Policy that allows only the site's own scripts, styles, images, fonts and API (no third parties, no framing), HSTS, `nosniff`, a strict referrer policy and a permissions policy; built assets are cached for good (their names change with their contents). If you add a third-party script or embed later, add its origin to the policy.

## Accessibility & performance

Keyboard: arrow keys / PageUp / PageDown move the carousel (the progress bar is also a slider you can click or drag), Enter opens a project, Esc closes panels and focus is trapped inside them. The cube's chat is a link for the keyboard too (Tab from the top of the page: it shows on the cube while focused); a reply is read out once it has arrived, not word by word. `prefers-reduced-motion` stills the cube's sway, the cards' site scroll and the page slides, and shortens the carousel motion. The grey half of the two-tone type (`--ink-2`) is 4.6:1 on the page, so it passes WCAG AA; a skip link leads past the menu, page changes are announced and focus moves to the new page, and unknown paths say they're not found (axe: no violations on any route; Lighthouse: 100 for accessibility, best practices and SEO). The 3D scene is lazy-loaded after first paint and drops its pixel ratio if frame rate dips.
