/**
 * plugin.ts — runs INSIDE Penpot (a sandbox with the global `penpot` object).
 * It has no DOM. Its only jobs:
 *   1. open the UI (index.html, an iframe),
 *   2. read the local library (colors + typographies),
 *   3. send that data to the UI as plain objects.
 * All the CSS logic lives in tokens.ts (pure functions).
 */
import type { LibraryColor, LibraryTypography } from "@penpot/plugin-types";
import type { ColorToken, TypographyToken } from "./tokens";
import type { PluginToUiMessage, UiToPluginMessage } from "./messages";

// Where the UI (index.html) lives. Empty locally (Penpot then uses the plugin's own origin).
// When hosted under a sub-path (GitHub Pages), the deploy workflow sets the full URL,
// because Penpot would otherwise look for index.html at the domain root.
const UI_URL: string = import.meta.env.VITE_UI_URL ?? "";

// Open the UI and tell it the current theme through the URL (?theme=dark).
penpot.ui.open("CSS Variables Export", `${UI_URL}?theme=${penpot.theme}`, {
  width: 420,
  height: 560,
});

/* Penpot objects are "live" proxies. We copy only the fields we need into
   plain, immutable objects so they can be sent with postMessage. */
const toColorToken = (c: LibraryColor): ColorToken => ({
  path: c.path,
  name: c.name,
  color: c.color,
  opacity: c.opacity,
});

const toTypographyToken = (t: LibraryTypography): TypographyToken => ({
  path: t.path,
  name: t.name,
  fontFamily: t.fontFamily,
  fontSize: t.fontSize,
  fontWeight: t.fontWeight,
  lineHeight: t.lineHeight,
  letterSpacing: t.letterSpacing,
  textTransform: t.textTransform ?? null,
});

/** Read the local library and send it to the UI. */
const sendTokens = (): void => {
  const library = penpot.library.local;
  const message: PluginToUiMessage = {
    type: "tokens",
    colors: library.colors.map(toColorToken),
    typographies: library.typographies.map(toTypographyToken),
  };
  penpot.ui.sendMessage(message);
};

// The UI asks for data when it is ready, and again when "Refresh" is clicked.
penpot.ui.onMessage<UiToPluginMessage>((message) => {
  if (message.type === "ready" || message.type === "refresh") {
    sendTokens();
  }
});

// Keep the UI theme in sync when the user switches light/dark in Penpot.
penpot.on("themechange", (theme) => {
  const message: PluginToUiMessage = { type: "theme", theme };
  penpot.ui.sendMessage(message);
});
