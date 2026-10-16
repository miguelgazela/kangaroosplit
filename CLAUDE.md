# KangarooSplit

## UI design

The UI must follow the mockups in `design/`.

- Before you create or change any screen or component, read `design/README.md` (screen map and design decisions) and `design/tokens.css` (colours, radii, type scale).
- Use the matching file in `design/screens/` as the visual reference. Rebuild it as React + Tailwind. Do not copy the mockup markup.
- Use the tokens in `design/tokens.css`. Do not add new colours or sizes without a reason.
- Where `design/README.md` and `DESIGN_BRIEF.md` differ, `design/README.md` wins.
- All UI text is European Portuguese (pt-PT). Address the viewer as "tu".

## App version

The version shown on the Definições screen is the `VERSION` constant in `web/src/screens/Settings.tsx`. It is not generated, so update it by hand every time you push something.
