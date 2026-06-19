import { describe, expect, it } from "vitest";
import { desktopNavigation, mobileNavigation } from "../app/routes";

describe("navigation structure", () => {
  it("uses More as a safe mobile path to secondary administration", () => {
    expect(mobileNavigation.map((item) => item.label)).toEqual([
      "Trips",
      "Itinerary",
      "Pack",
      "Outfits",
      "Bags",
      "More",
    ]);
    expect(mobileNavigation.find((item) => item.label === "More")).toMatchObject({
      to: "/settings",
      match: ["/settings", "/travellers", "/library"],
    });
    expect(mobileNavigation.every((item) => !item.to.includes("/trips/demo"))).toBe(
      true,
    );
  });

  it("retains desktop access to key administration routes", () => {
    expect(desktopNavigation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Travellers", to: "/travellers" }),
        expect.objectContaining({ label: "Library", to: "/library" }),
        expect.objectContaining({ label: "Settings", to: "/settings" }),
      ]),
    );
  });
});
