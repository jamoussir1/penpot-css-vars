/**
 * tokens.ts — the "brain" of the plugin.
 *
 * Every function in this file is PURE:
 *   - it only reads its arguments (no global `penpot`, no DOM),
 *   - it never mutates its arguments (we build new arrays/strings),
 *   - same input  ->  same output, every time.
 *
 * That is why this file can be unit-tested with plain Vitest, without Penpot.
 */

/* ------------------------------------------------------------------ */
/* Plain data types (a "DTO" copy of what Penpot gives us)            */
/* ------------------------------------------------------------------ */

/** A library color, reduced to the fields we need. `readonly` = immutable. */
export interface ColorToken {
  readonly path: string; // group, e.g. "brand"   (from "brand/blue")
  readonly name: string; // e.g. "blue"
  readonly color?: string; // hex like "#2563eb" — undefined for gradients/images
  readonly opacity?: number; // 0..1
}

/** A library typography, reduced to the fields we need. */
export interface TypographyToken {
  readonly path: string;
  readonly name: string;
  readonly fontFamily: string;
  readonly fontSize: string; // Penpot stores numbers as strings, e.g. "24"
  readonly fontWeight: string; // e.g. "700"
  readonly lineHeight: string; // e.g. "1.2"
  readonly letterSpacing: string; // e.g. "0"
  readonly textTransform?: string | null;
}

export interface ExportResult {
  readonly css: string;
  readonly colorCount: number;
  readonly typographyCount: number;
  readonly skippedColors: readonly string[]; // gradients/images we can't express as one hex
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * "Brand / Blue 500" -> "brand-blue-500"
 * Lowercase, anything that isn't a-z or 0-9 becomes "-", no double/edge dashes.
 */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove accents: "é" -> "e"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Join the group path and the name: ("brand", "blue") -> "brand-blue". */
export const tokenName = (path: string, name: string): string =>
  [path, name]
    .map(slugify)
    .filter((part) => part.length > 0)
    .join("-");

/** Turn a 0..1 opacity into a 2-digit hex alpha: 0.5 -> "80". */
const alphaToHex = (opacity: number): string =>
  Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16)
    .padStart(2, "0");

/**
 * Final CSS color value.
 * Fully opaque  -> "#2563eb"
 * Semi-opaque   -> "#2563eb80" (8-digit hex, supported by all modern browsers)
 */
export const colorValue = (hex: string, opacity = 1): string => {
  const base = hex.toLowerCase();
  return opacity >= 1 ? base : `${base}${alphaToHex(opacity)}`;
};

/** A string that looks like a plain number gets "px" ("24" -> "24px"). */
const toPx = (value: string): string =>
  /^-?\d+(\.\d+)?$/.test(value.trim()) ? `${value.trim()}px` : value.trim();

/** Wrap a font family in quotes and add a generic fallback. */
const fontStack = (family: string): string => `"${family}", sans-serif`;

/* ------------------------------------------------------------------ */
/* Token -> CSS lines                                                  */
/* ------------------------------------------------------------------ */

/** Only solid colors have a hex value; gradients/images are skipped. */
export const isSolid = (token: ColorToken): boolean =>
  typeof token.color === "string" && token.color.length > 0;

/** One color -> one CSS custom property line. */
export const colorToCssLine = (token: ColorToken): string =>
  `  --color-${tokenName(token.path, token.name)}: ${colorValue(
    token.color ?? "",
    token.opacity ?? 1,
  )};`;

/** One typography -> several CSS custom property lines. */
export const typographyToCssLines = (token: TypographyToken): readonly string[] => {
  const prefix = `--font-${tokenName(token.path, token.name)}`;
  const lines = [
    `  ${prefix}-family: ${fontStack(token.fontFamily)};`,
    `  ${prefix}-size: ${toPx(token.fontSize)};`,
    `  ${prefix}-weight: ${token.fontWeight};`,
    `  ${prefix}-line-height: ${token.lineHeight};`,
    `  ${prefix}-letter-spacing: ${toPx(token.letterSpacing)};`,
  ];
  // Only add text-transform when Penpot actually has one (e.g. "uppercase").
  return token.textTransform
    ? [...lines, `  ${prefix}-text-transform: ${token.textTransform};`]
    : lines;
};

/**
 * A ready-to-use utility class for each typography, built FROM the variables:
 * .text-h1 { font-family: var(--font-h1-family); ... }
 */
export const typographyToClass = (token: TypographyToken): string => {
  const name = tokenName(token.path, token.name);
  const prefix = `--font-${name}`;
  const declarations = [
    `font-family: var(${prefix}-family);`,
    `font-size: var(${prefix}-size);`,
    `font-weight: var(${prefix}-weight);`,
    `line-height: var(${prefix}-line-height);`,
    `letter-spacing: var(${prefix}-letter-spacing);`,
    ...(token.textTransform ? [`text-transform: var(${prefix}-text-transform);`] : []),
  ];
  return `.text-${name} {\n${declarations.map((d) => `  ${d}`).join("\n")}\n}`;
};

/* ------------------------------------------------------------------ */
/* Whole export                                                        */
/* ------------------------------------------------------------------ */

/** Sort without mutating the original array (copy first with [...array]). */
const byTokenName = <T extends { path: string; name: string }>(list: readonly T[]): T[] =>
  [...list].sort((a, b) => tokenName(a.path, a.name).localeCompare(tokenName(b.path, b.name)));

/** Keep the first token for each generated name, so we never emit duplicates. */
const uniqueByName = <T extends { path: string; name: string }>(list: readonly T[]): T[] =>
  list.reduce<T[]>(
    (acc, token) =>
      acc.some((t) => tokenName(t.path, t.name) === tokenName(token.path, token.name))
        ? acc
        : [...acc, token],
    [],
  );

/**
 * The main function: colors + typographies -> full CSS file.
 * map / filter / reduce only — no loops, no mutation.
 */
export const buildCss = (
  colors: readonly ColorToken[],
  typographies: readonly TypographyToken[],
): ExportResult => {
  const solidColors = uniqueByName(byTokenName(colors.filter(isSolid)));
  const skippedColors = colors.filter((c) => !isSolid(c)).map((c) => tokenName(c.path, c.name));
  const typos = uniqueByName(byTokenName(typographies));

  const variableLines = [
    ...(solidColors.length > 0 ? ["  /* Colors */", ...solidColors.map(colorToCssLine)] : []),
    ...(typos.length > 0 ? ["  /* Typographies */", ...typos.flatMap(typographyToCssLines)] : []),
  ];

  const header = "/* Generated by Penpot CSS Variables Export */";
  const root = `:root {\n${variableLines.join("\n")}\n}`;
  const classes = typos.map(typographyToClass);

  const css =
    variableLines.length === 0
      ? `${header}\n/* No local colors or typographies found in this file. */\n`
      : [header, root, ...classes].join("\n\n") + "\n";

  return {
    css,
    colorCount: solidColors.length,
    typographyCount: typos.length,
    skippedColors,
  };
};
