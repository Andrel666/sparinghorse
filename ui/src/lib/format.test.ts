import { describe, expect, it } from "vitest";
import { ago, bpm, dayNum, km, numDay, pace, verdictTone } from "./format";

describe("format", () => {
  it("formats distances, paces and heart rate, with a dash for missing values", () => {
    expect(km(6.2)).toBe("6.2 km"); expect(km(null)).toBe("—");
    expect(pace("6:37")).toBe("6:37/km"); expect(pace(null)).toBe("—");
    expect(bpm(156)).toBe("156 bpm");
  });
  it("words the sync age", () => {
    expect(ago(null)).toBe("not synced yet"); expect(ago(0)).toBe("just now");
    expect(ago(24)).toBe("24 min ago"); expect(ago(90)).toBe("2 h ago"); expect(ago(60 * 72)).toBe("3 days ago");
  });
  it("maps every verdict vocabulary onto one tone", () => {
    expect(verdictTone("green")).toBe("ok"); expect(verdictTone("on")).toBe("ok");
    expect(verdictTone("amber")).toBe("warn"); expect(verdictTone("hot")).toBe("warn");
    expect(verdictTone("red")).toBe("bad"); expect(verdictTone("too_hard")).toBe("bad");
    expect(verdictTone(null)).toBeUndefined();
  });
});

it("calendar dates survive the day-number round trip in any time zone", () => {
  for (const d of ["2026-11-01", "2027-02-26", "2026-03-29"]) expect(numDay(dayNum(d))).toBe(d);
  expect(dayNum("2026-11-02") - dayNum("2026-11-01")).toBe(1);
});
