import { describe, expect, it } from "vitest";
import { cn, roleStyles } from "./utils";

describe("roleStyles", () => {
  it("returns configured style for known roles", () => {
    expect(roleStyles("researcher")).toContain("text-teal-700");
    expect(roleStyles("skeptic")).toContain("text-amber-700");
    expect(roleStyles("statistician")).toContain("text-violet-700");
  });

  it("falls back to default style for unknown roles", () => {
    expect(roleStyles("unknown-role")).toBe("bg-zinc-50 text-zinc-700 border-zinc-200");
  });
});

describe("cn", () => {
  it("merges tailwind classes with latest precedence", () => {
    expect(cn("px-2 text-sm", "px-4", "text-lg")).toBe("px-4 text-lg");
  });
});
