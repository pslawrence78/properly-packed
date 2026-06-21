// @ts-expect-error Vitest runs in Node; the app intentionally does not depend on @types/node.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "../lib/app-version";

const projectPath = (
  globalThis as typeof globalThis & { process: { cwd(): string } }
).process.cwd();
const publicPath = `${projectPath}/public/`;

describe("PWA release metadata", () => {
  it("uses the current app version for the service-worker release cache", () => {
    const serviceWorker = readFileSync(`${publicPath}sw.js`, "utf8");
    expect(serviceWorker).toContain(`properly-packed-shell-v${APP_VERSION}`);
    expect(serviceWorker).not.toContain("properly-packed-shell-v0.17.0");
    const installHandler = serviceWorker.slice(
      serviceWorker.indexOf('addEventListener("install"'),
      serviceWorker.indexOf('addEventListener("activate"'),
    );
    expect(installHandler).not.toContain("skipWaiting()");
    expect(serviceWorker).toContain('event.data?.type === "SKIP_WAITING"');
  });

  it("keeps manifest launch metadata scoped to the deployed project path", () => {
    const manifest = JSON.parse(
      readFileSync(`${publicPath}manifest.webmanifest`, "utf8"),
    ) as {
      start_url: string;
      scope: string;
      display: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };

    expect(manifest.start_url).toBe("./");
    expect(manifest.scope).toBe("./");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "icons/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "icons/icon-512.png", sizes: "512x512" }),
        expect.objectContaining({
          src: "icons/icon-maskable-512.png",
          purpose: "maskable",
        }),
      ]),
    );
    for (const icon of manifest.icons.filter((entry) => entry.type === "image/png")) {
      expect(existsSync(`${publicPath}${icon.src}`)).toBe(true);
    }
  });

  it("publishes a base-aware PNG Apple touch icon", () => {
    const html = readFileSync(`${projectPath}/index.html`, "utf8");
    expect(html).toMatch(
      /rel="apple-touch-icon"[\s\S]*sizes="180x180"[\s\S]*%BASE_URL%icons\/apple-touch-icon\.png/,
    );
    expect(existsSync(`${publicPath}icons/apple-touch-icon.png`)).toBe(true);
  });
});
