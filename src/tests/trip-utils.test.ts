import { describe, expect, it } from "vitest";
import { calculateTripNights, validateTrip } from "../features/trips/trip-utils";

describe("trip utilities", () => {
  it("calculates nights from start and end dates", () => {
    expect(calculateTripNights("2026-07-01", "2026-07-08")).toBe(7);
    expect(calculateTripNights("2026-07-08", "2026-07-01")).toBe(0);
  });

  it("validates required trip fields", () => {
    const errors = validateTrip({
      name: "",
      tripType: "cruise",
      startDate: "2026-07-08",
      endDate: "2026-07-01",
      destinations: [],
      climateContextIds: [],
      accommodationContextIds: [],
      transportContextIds: [],
      activityContextIds: [],
      travellerIds: [],
      status: "draft",
    });

    expect(errors).toContain("Trip name is required.");
    expect(errors).toContain("End date cannot be before start date.");
    expect(errors).toContain("Select at least one traveller for this trip.");
  });
});
