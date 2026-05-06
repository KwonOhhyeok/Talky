import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");

describe("Tailwind CSS build integration", () => {
  let cssContent;

  it("production build completes successfully", () => {
    // execSync throws if the command exits non-zero.
    // Vite outputs to stderr, so we capture both streams.
    const output = execSync("npm run build 2>&1", {
      cwd: projectRoot,
      encoding: "utf-8",
      timeout: 60000,
    });

    expect(output).toBeTruthy();
  });

  it("build output contains CSS files", () => {
    const distAssets = join(projectRoot, "dist", "assets");
    const files = readdirSync(distAssets);
    const cssFiles = files.filter((f) => f.endsWith(".css"));

    expect(cssFiles.length).toBeGreaterThanOrEqual(1);

    // Read the first CSS file for subsequent assertions
    cssContent = readFileSync(join(distAssets, cssFiles[0]), "utf-8");
    expect(cssContent.length).toBeGreaterThan(0);
  });

  it("CSS output contains Tailwind utility classes", () => {
    expect(cssContent).toContain("flex");
    expect(cssContent).toContain("rounded-full");
    expect(cssContent).toContain("translate-y");
  });

  it("CSS output contains custom color definitions from tailwind.config", () => {
    // Tailwind lowercases hex values in the compiled output
    expect(cssContent.toLowerCase()).toContain("0059b9"); // primary
  });

  it("CSS output contains the sample font-family declarations", () => {
    expect(cssContent).toContain("Inter");
    expect(cssContent).toContain("Work Sans");
  });
});
