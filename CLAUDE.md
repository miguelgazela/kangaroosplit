# KangarooSplit

## UI design

The UI must follow the mockups in `design/`.

- Before you create or change any screen or component, read `design/README.md` (screen map and design decisions) and `design/tokens.css` (colours, radii, type scale).
- Use the matching file in `design/screens/` as the visual reference. Rebuild it as React + Tailwind. Do not copy the mockup markup.
- Use the tokens in `design/tokens.css`. Do not add new colours or sizes without a reason.
- Where `design/README.md` and `DESIGN_BRIEF.md` differ, `design/README.md` wins.
- All UI text is European Portuguese (pt-PT). Address the viewer as "tu".

## App version

The version shown on the Definições screen is the newest entry in `web/src/data/changelog.ts`. It is not generated, so add a new entry (version, date, what changed, in pt-PT) by hand every time you push something. The same list is the Novidades screen, opened from Definições.

When the release adds something users will notice, also add `highlights` (up to three: title, one line of text, icon, tone; pt-PT, addressing the viewer as "tu") to that entry. They fill the "O que há de novo" sheet that opens once on the first launch after an update (see "What's new sheet — Novidades" in `design/README.md`). An entry without `highlights`, such as a small fix, shows no sheet. If you skip it for a release that deserves one, users never hear about the change.
