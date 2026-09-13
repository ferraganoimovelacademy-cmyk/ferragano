import { describe, it, expect } from "vitest";
import { Route as ManifestRoute } from "../manifest[.]json";
import { Route as RobotsRoute } from "../robots[.]txt";

describe("Static Server Routes Integrity", () => {
  it("manifest.json should export a valid TanStack Route with server handler", () => {
    expect(ManifestRoute).toBeDefined();
    const routeObj = ManifestRoute as any;
    expect(routeObj.options).toBeDefined();
    // In TanStack Start v1, the path for a file route often doesn't exist on options if it's inferred
    // We check if the server handler is present, which is the critical part for build/SSR.
    expect(routeObj.options.server?.handlers?.GET).toBeDefined();
  });

  it("robots.txt should export a valid TanStack Route with server handler", () => {
    expect(RobotsRoute).toBeDefined();
    const routeObj = RobotsRoute as any;
    expect(routeObj.options).toBeDefined();
    expect(routeObj.options.server?.handlers?.GET).toBeDefined();
  });
});
