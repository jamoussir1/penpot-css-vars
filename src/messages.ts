/**
 * messages.ts — the "contract" between plugin.ts (inside Penpot) and the UI (iframe).
 * Using a discriminated union (the `type` field) lets TypeScript check every message.
 */
import type { ColorToken, TypographyToken } from "./tokens";

/** Messages the plugin sends to the UI. */
export type PluginToUiMessage =
  | {
      readonly type: "tokens";
      readonly colors: readonly ColorToken[];
      readonly typographies: readonly TypographyToken[];
    }
  | { readonly type: "theme"; readonly theme: "light" | "dark" };

/** Messages the UI sends to the plugin. */
export type UiToPluginMessage = { readonly type: "ready" } | { readonly type: "refresh" };
