# CSS Variables Export — a Penpot plugin

Export the **colors** and **typographies** of a Penpot file's local library as
**CSS custom properties**, plus one utility class per typography.

**Why?** Penpot's _Inspect_ tab gives raw values (`color: #2563eb`). Front-end code
should use design tokens (`color: var(--color-brand-blue)`), so a color change in the
design becomes a one-line change in code. This plugin generates that token file.

## Example output

For a library with `brand/blue` and a `label` typography:

```css
:root {
  /* Colors */
  --color-brand-blue: #2563eb;
  /* Typographies */
  --font-label-family: "Inter", sans-serif;
  --font-label-size: 12px;
  --font-label-weight: 600;
  --font-label-line-height: 1.2;
  --font-label-letter-spacing: 0px;
  --font-label-text-transform: uppercase;
}

.text-label {
  font-family: var(--font-label-family);
  font-size: var(--font-label-size);
  /* … */
}
```

Naming: the asset group and name are joined and turned into a slug
(`Brand / Blue 500` → `--color-brand-blue-500`). Colors with opacity become 8-digit hex
(`#00000080`). Gradient and image colors are skipped and listed in the plugin window.

## Install (hosted version)

In a Penpot file press **Ctrl + Alt + P** and paste:

```
https://jamoussir1.github.io/penpot-css-vars/manifest.json
```

The `deploy.yml` workflow publishes `dist/` to GitHub Pages on every push to `main`.
Because the plugin lives under a sub-path (`/penpot-css-vars/`), the workflow writes the
full URLs of `plugin.js` (in `manifest.json`) and `index.html` (via `VITE_UI_URL`).

## Run locally

1. `npm install`
2. `npm run dev` (builds in watch mode and serves `dist/` on <http://localhost:4400>)
3. In Penpot, open a file and press **Ctrl + Alt + P** (Plugin Manager).
4. Paste `http://localhost:4400/manifest.json` and install.
5. The window shows the CSS; click **Copy** or **Download .css**.

## How it works

```
Penpot (sandbox)                         Plugin window (iframe)
┌──────────────────────┐   postMessage   ┌───────────────────────────┐
│ src/plugin.ts        │ ──────────────▶ │ src/main.ts               │
│ reads                │  {colors,       │ buildCss() from tokens.ts │
│ penpot.library.local │   typographies} │ shows / copies / downloads│
└──────────────────────┘ ◀────────────── └───────────────────────────┘
                          {type:"refresh"}
```

- **`src/plugin.ts`** runs inside Penpot and is the only file that uses the `penpot`
  API. It copies library colors/typographies into plain objects and sends them to the UI.
- **`src/tokens.ts`** contains all the logic as **pure functions** (no `penpot`, no DOM,
  no mutation): `slugify`, `colorValue`, `colorToCssLine`, `typographyToCssLines`,
  `buildCss`. Built with `map`, `filter`, `flatMap` and `reduce`, using `readonly` types.
- **`src/main.ts`** is the UI. It only renders the result and handles the buttons.
- **`src/messages.ts`** types every message between the two sides (discriminated union).

Permissions requested in `public/manifest.json`: `library:read` (read colors and
typographies), `content:read` (listen to the theme change event), `allow:downloads`
(the _Download .css_ button).

## Scripts

| Command                | What it does                               |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Build in watch mode and serve on port 4400 |
| `npm run build`        | Type-check and build to `dist/`            |
| `npm test`             | Unit tests for `tokens.ts` (Vitest)        |
| `npm run lint`         | ESLint (TypeScript + functional rules)     |
| `npm run format:check` | Prettier check                             |

GitHub Actions (`.github/workflows/ci.yml`) runs format check, lint, tests and build on
every push and pull request.

## Deploy

Build with `npm run build` and host the `dist/` folder on any static host
(Netlify, Cloudflare Pages, Surge). `public/_headers` adds the CORS header Penpot needs.
Then install from `https://<your-site>/manifest.json`.

## Limitations

- Only the file's **local** library is exported (not connected shared libraries).
- Gradients and image fills are skipped.
- Font fallback is always `sans-serif`.

Built with the official [Penpot Plugins API](https://help.penpot.app/plugins/)
(`@penpot/plugin-types`, `@penpot/plugin-styles`). MIT license.
