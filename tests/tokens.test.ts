import { describe, expect, it } from "vitest";
import {
  buildCss,
  colorToCssLine,
  colorValue,
  slugify,
  tokenName,
  typographyToCssLines,
  type ColorToken,
  type TypographyToken,
} from "../src/tokens";

const blue: ColorToken = { path: "brand", name: "blue", color: "#2563EB", opacity: 1 };
const h1: TypographyToken = {
  path: "",
  name: "h1",
  fontFamily: "Inter",
  fontSize: "24",
  fontWeight: "700",
  lineHeight: "1.2",
  letterSpacing: "0",
  textTransform: null,
};

describe("slugify / tokenName", () => {
  it("lowercases and replaces spaces and symbols with dashes", () => {
    expect(slugify("Blue 500 / Hover")).toBe("blue-500-hover");
  });
  it("removes accents", () => {
    expect(slugify("Écran")).toBe("ecran");
  });
  it("joins path and name, ignoring an empty path", () => {
    expect(tokenName("brand", "blue")).toBe("brand-blue");
    expect(tokenName("", "h1")).toBe("h1");
  });
});

describe("colors", () => {
  it("keeps opaque colors as 6-digit hex", () => {
    expect(colorValue("#2563EB", 1)).toBe("#2563eb");
  });
  it("adds an alpha channel for transparent colors", () => {
    expect(colorValue("#000000", 0.5)).toBe("#00000080");
  });
  it("creates one CSS variable line", () => {
    expect(colorToCssLine(blue)).toBe("  --color-brand-blue: #2563eb;");
  });
});

describe("typographies", () => {
  it("creates size/weight/line-height variables with px where needed", () => {
    expect(typographyToCssLines(h1)).toEqual([
      '  --font-h1-family: "Inter", sans-serif;',
      "  --font-h1-size: 24px;",
      "  --font-h1-weight: 700;",
      "  --font-h1-line-height: 1.2;",
      "  --font-h1-letter-spacing: 0px;",
    ]);
  });
  it("adds text-transform only when it exists", () => {
    const label = { ...h1, name: "label", textTransform: "uppercase" };
    expect(typographyToCssLines(label)).toContain("  --font-label-text-transform: uppercase;");
  });
});

describe("buildCss", () => {
  it("sorts tokens, skips gradients and does not mutate the input", () => {
    const colors: ColorToken[] = [
      { path: "neutral", name: "white", color: "#FFFFFF" },
      blue,
      { path: "brand", name: "sunset", color: undefined }, // gradient
    ];
    const snapshot = JSON.stringify(colors);

    const result = buildCss(colors, [h1]);

    expect(result.colorCount).toBe(2);
    expect(result.typographyCount).toBe(1);
    expect(result.skippedColors).toEqual(["brand-sunset"]);
    expect(result.css.indexOf("--color-brand-blue")).toBeLessThan(
      result.css.indexOf("--color-neutral-white"),
    );
    expect(result.css).toContain(".text-h1 {");
    expect(JSON.stringify(colors)).toBe(snapshot); // immutability check
  });

  it("removes duplicate names", () => {
    const result = buildCss([blue, { ...blue, color: "#000000" }], []);
    expect(result.colorCount).toBe(1);
    expect(result.css).toContain("#2563eb");
  });

  it("explains when the library is empty", () => {
    expect(buildCss([], []).css).toContain("No local colors or typographies");
  });
});
