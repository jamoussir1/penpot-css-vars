/**
 * main.ts — the plugin UI (runs in an iframe, has a DOM, has NO `penpot` object).
 * It receives tokens from plugin.ts, turns them into CSS with buildCss (pure),
 * and lets the user copy or download the result.
 */
import "./style.css";
import { buildCss, type ExportResult } from "./tokens";
import type { PluginToUiMessage, UiToPluginMessage } from "./messages";

const output = document.querySelector<HTMLTextAreaElement>("#output");
const summary = document.querySelector<HTMLParagraphElement>("#summary");
const copyButton = document.querySelector<HTMLButtonElement>("#copy");
const downloadButton = document.querySelector<HTMLButtonElement>("#download");
const refreshButton = document.querySelector<HTMLButtonElement>("#refresh");

// Theme comes from the URL the plugin opened us with (?theme=dark).
document.body.dataset.theme = new URLSearchParams(window.location.search).get("theme") ?? "light";

const sendToPlugin = (message: UiToPluginMessage): void => parent.postMessage(message, "*");

/** Build the one-line summary text (pure). */
const summaryText = (result: ExportResult): string => {
  const base = `${result.colorCount} colors · ${result.typographyCount} typographies`;
  return result.skippedColors.length > 0
    ? `${base} · skipped (gradient/image): ${result.skippedColors.join(", ")}`
    : base;
};

/** The only place that touches the DOM after a new export. */
const render = (result: ExportResult): void => {
  if (output) output.value = result.css;
  if (summary) summary.textContent = summaryText(result);
};

/** Copy with the modern API, fall back to execCommand inside restricted iframes. */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    output?.select();
    return document.execCommand("copy");
  }
};

/** Download the CSS as a file using a temporary <a download>. */
const downloadCss = (css: string): void => {
  const url = URL.createObjectURL(new Blob([css], { type: "text/css" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "tokens.css" });
  link.click();
  URL.revokeObjectURL(url);
};

/** Show a short confirmation on the Copy button, then restore its label. */
const flashCopyLabel = (text: string): void => {
  if (!copyButton) return;
  const original = copyButton.textContent;
  copyButton.textContent = text;
  window.setTimeout(() => {
    copyButton.textContent = original;
  }, 1200);
};

copyButton?.addEventListener("click", async () => {
  const ok = await copyToClipboard(output?.value ?? "");
  flashCopyLabel(ok ? "Copied!" : "Copy failed");
});
downloadButton?.addEventListener("click", () => downloadCss(output?.value ?? ""));
refreshButton?.addEventListener("click", () => sendToPlugin({ type: "refresh" }));

// Messages coming from plugin.ts
window.addEventListener("message", (event: MessageEvent<PluginToUiMessage>) => {
  const message = event.data;
  if (message?.type === "tokens") {
    render(buildCss(message.colors, message.typographies));
  } else if (message?.type === "theme") {
    document.body.dataset.theme = message.theme;
  }
});

// Tell the plugin we are ready to receive data.
sendToPlugin({ type: "ready" });
