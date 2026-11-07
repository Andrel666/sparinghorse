// The slop guard: the design rules in ui/DESIGN.md as checks, so a later change can't bring back what the unslop
// passes removed. It reads the stylesheet and every component and fails on the first sign of each kind:
// off-grid spacing, weights other than the two tokens, uppercase or tracked labels, raw colours outside
// tokens.css, gradients, glows, glass, catch-all or looping motion, and emoji in the interface.
// A rule that needs an exception names it in ALLOW below, with the reason.
// Files are read from disk. Not through Vite's ?raw: under Vitest a stylesheet imports as an empty string, which
// would let every CSS check pass with nothing to check. The UI's tsconfig loads no Node types (adding them is a
// new package), so the node:fs built-ins are typed here by hand; Vitest runs on Node, where they always exist.
import { describe, expect, it } from "vitest";
// @ts-expect-error -- node:fs is a Node built-in; the UI's tsconfig has no Node types
import { readFileSync, readdirSync, statSync } from "node:fs";
type Fs = { readFileSync: (p: string, e: "utf8") => string; readdirSync: (p: string) => string[]; statSync: (p: string) => { isDirectory: () => boolean } };
const fs = { readFileSync, readdirSync, statSync } as Fs;

const SRC = decodeURIComponent(new URL("..", import.meta.url).pathname);
const read = (rel: string) => fs.readFileSync(SRC + rel, "utf8");
const walk = (rel: string): string[] => fs.readdirSync(SRC + rel).flatMap(f =>
  fs.statSync(SRC + rel + f).isDirectory() ? walk(rel + f + "/") : /\.tsx$/.test(f) ? [rel + f] : []);
const css = read("styles/base.css");
const tokens = read("styles/tokens.css");
const tsx = walk("").map(p => ({ p, s: read(p) }));
// a guard that reads nothing proves nothing
if (css.length < 10000 || tsx.length < 20) throw new Error(`slop guard read too little: ${css.length} chars of CSS, ${tsx.length} components`);
// CSS declarations without comments, as [property, value]
const decls = (text: string) => [...text.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/g)].map(m => [m[1], m[2].trim()]);
const D = decls(css);

const ALLOW = {
  // the table's sideways-scroll fade is an alpha mask, not a colour
  colour: [/mask-image: linear-gradient\(to right, #000/],
  // Leaflet needs a real colour if the CSS variable can't be read; it is the signal's own value
  tsxColour: [/RunMap\.tsx: .*"#2b3cff"/],
};

describe("slop guard: spacing", () => {
  const SPACING = /^(margin|padding|gap|row-gap|column-gap|top|bottom|left|right|inset|height|min-height|max-height)(-[a-z]+)?$/;
  it("every margin, padding, gap and fixed height in base.css is on the 4px grid (1-2px for hairlines and nudges)", () => {
    const bad = D.filter(([p]) => SPACING.test(p)).flatMap(([p, v]) =>
      [...v.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map(m => Math.abs(+m[1])).filter(n => n > 2 && n % 4 !== 0).map(n => `${p}: ${v} (${n}px)`));
    expect(bad).toEqual([]);
  });
  it("inline spacing in components is on the grid too", () => {
    const bad = tsx.flatMap(({ p, s }) => [...s.matchAll(/\b(margin|padding|gap|top|bottom|left|right|height|minHeight)(?:Top|Bottom|Left|Right)?:\s*(\d+)\b/g)]
      .filter(m => +m[2] > 2 && +m[2] % 4 !== 0).map(m => `${p}: ${m[0]}`));
    expect(bad).toEqual([]);
  });
});

describe("slop guard: type", () => {
  it("only the two weight tokens (400, 500), never 600-900", () => {
    expect(D.filter(([p, v]) => p === "font-weight" && !/^var\(--w-(regular|medium)\)$/.test(v)).map(d => d.join(": "))).toEqual([]);
    expect(tokens).toMatch(/--w-regular: 400; --w-medium: 500;/);
    expect(tsx.flatMap(({ p, s }) => [...s.matchAll(/fontWeight:\s*(\d+)/g)].filter(m => !["400", "500"].includes(m[1])).map(m => `${p}: ${m[0]}`))).toEqual([]);
  });
  it("sentence case: no uppercase labels, no wide tracking, negative tracking only from the display tokens", () => {
    expect(D.filter(([p, v]) => p === "text-transform" && /uppercase/.test(v))).toEqual([]);
    expect(D.filter(([p, v]) => p === "letter-spacing" && !/^(0|var\(--track-(display|hero)\))$/.test(v)).map(d => d.join(": "))).toEqual([]);
    expect(tsx.filter(({ s }) => /textTransform|letterSpacing/.test(s)).map(f => f.p)).toEqual([]);
  });
  it("every font size comes from the scale", () => {
    expect(D.filter(([p, v]) => p === "font-size" && !/^(var\(--fs-[a-z-]+\)|[\d.]+em|inherit)$/.test(v)).map(d => d.join(": "))).toEqual([]);
  });
});

describe("slop guard: colour and surfaces", () => {
  it("no raw colours outside tokens.css", () => {
    const bad = css.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l: string) => /#[0-9a-f]{3,8}\b|rgba?\(/i.test(l) && !ALLOW.colour.some(r => r.test(l)));
    expect(bad).toEqual([]);
    const badTsx = tsx.flatMap(({ p, s }) => s.split("\n").filter((l: string) => /["'`]#[0-9a-f]{3,8}["'`]|rgba?\(/i.test(l)).map((l: string) => `${p}: ${l.trim()}`))
      .filter((l: string) => !ALLOW.tsxColour.some(r => r.test(l)));
    expect(badTsx).toEqual([]);
  });
  it("no gradients, glows or glass", () => {
    expect(D.filter(([p, v]) => /gradient\(/.test(v) && p !== "mask-image").map(d => d.join(": "))).toEqual([]);
    expect(D.filter(([p]) => p === "backdrop-filter")).toEqual([]);
    // a shadow is the floating surfaces' token or an inset hairline/marker, never a coloured glow
    expect(D.filter(([p, v]) => p === "box-shadow" && !/^(none|var\(--float-shadow\)|inset .*)$/.test(v)).map(d => d.join(": "))).toEqual([]);
    expect(D.filter(([p, v]) => p === "text-shadow" || (p === "filter" && /drop-shadow/.test(v)))).toEqual([]);
  });
});

describe("slop guard: motion", () => {
  it("no catch-all transitions, no loops, one easing curve from the tokens", () => {
    expect(D.filter(([p, v]) => p.startsWith("transition") && /\ball\b/.test(v) && !/none !important/.test(v))).toEqual([]);
    expect(D.filter(([p, v]) => p.startsWith("animation") && /infinite/.test(v))).toEqual([]);
    expect(D.filter(([p, v]) => /^(transition|animation)$/.test(p) && !/none !important/.test(v) && !/var\(--ease-out\)/.test(v)).map(d => d.join(": "))).toEqual([]);
    expect(tsx.filter(({ s }) => /\b(transition|animation):|scale\(/.test(s)).map(f => f.p)).toEqual([]);
  });
});

describe("slop guard: icons", () => {
  it("no emoji in the interface: the line icons (Icon.tsx) stand in for them", () => {
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
    const KEEP = /[✓✕]/g;   // ✓ ✕ are typographic marks in the week and the calendar, not pictographs
    expect(tsx.flatMap(({ p, s }) => s.split("\n").filter((l: string) => EMOJI.test(l.replace(KEEP, ""))).map((l: string) => `${p}: ${l.trim().slice(0, 80)}`))).toEqual([]);
    expect(css.split("\n").filter((l: string) => /content:/.test(l) && EMOJI.test(l.replace(KEEP, "")))).toEqual([]);
  });
});
