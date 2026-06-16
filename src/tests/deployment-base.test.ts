import { describe, expect, it } from "vitest";
import {
  DEPLOYMENT_BASE_PATH,
  getRouterBasename,
} from "../lib/deployment-base";

describe("deployment base helpers", () => {
  it("uses the GitHub Pages project-site path for production builds", () => {
    expect(DEPLOYMENT_BASE_PATH).toBe("/properly-packed/");
  });

  it("normalises BrowserRouter basename values", () => {
    expect(getRouterBasename("/properly-packed/")).toBe("/properly-packed");
    expect(getRouterBasename("/")).toBeUndefined();
  });
});
