import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Traveller, Trip } from "../db/types";
import { TripForm } from "../features/trips/TripForm";

const travellers: Traveller[] = [
  {
    id: "traveller:beck",
    name: "Beck",
    travellerType: "adult",
    defaultIncluded: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
  {
    id: "traveller:albert",
    name: "Albert",
    travellerType: "dog",
    defaultIncluded: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  },
];

describe("TripForm", () => {
  it("submits a valid create trip payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TripForm
        travellers={travellers}
        submitLabel="Create trip"
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Trip name"), "Summer Cruise");
    await user.type(screen.getByLabelText("Start date"), "2026-07-01");
    await user.type(screen.getByLabelText("End date"), "2026-07-08");
    await user.click(screen.getByRole("button", { name: "Create trip" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Summer Cruise",
        nights: 7,
        travellerIds: ["traveller:beck"],
      }),
    );
  });

  it("submits trip context values containing spaces and commas", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TripForm
        travellers={travellers}
        submitLabel="Create trip"
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Trip name"), "Realistic Trip");
    await user.type(screen.getByLabelText("Start date"), "2026-07-01");
    await user.type(screen.getByLabelText("End date"), "2026-07-08");

    await addEntry(user, "Destinations", "New York, USA");
    await addEntry(user, "Destinations", "Rome, Italy");
    await addEntry(user, "Climate profile", "warm");
    await addEntry(user, "Climate profile", "mixed");
    await addEntry(user, "Accommodation types", "Cruise cabin");
    await addEntry(user, "Accommodation types", "Self-catering apartment");
    await addEntry(user, "Transport modes", "Taxi or private transfer");
    await addEntry(user, "Transport modes", "Walking-heavy trip");
    await addEntry(user, "Activity contexts", "Cruise formal night");
    await addEntry(user, "Activity contexts", "Long travel day");
    await addEntry(user, "Activity contexts", "Kids' clubs");

    await user.click(screen.getByRole("button", { name: "Create trip" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        destinations: ["New York, USA", "Rome, Italy"],
        climateProfile: "warm, mixed",
        accommodationTypes: ["Cruise cabin", "Self-catering apartment"],
        transportModes: ["Taxi or private transfer", "Walking-heavy trip"],
        activityContexts: [
          "Cruise formal night",
          "Long travel day",
          "Kids' clubs",
        ],
      }),
    );
  });

  it("commits pending trip context text when the form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <TripForm
        travellers={travellers}
        submitLabel="Create trip"
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("Trip name"), "Submit Draft Trip");
    await user.type(screen.getByLabelText("Start date"), "2026-07-01");
    await user.type(screen.getByLabelText("End date"), "2026-07-08");
    await user.type(screen.getByLabelText("Destinations"), "Dubai, UAE");
    await user.type(screen.getByLabelText("Climate profile"), "hot and humid");
    await user.type(
      screen.getByLabelText("Accommodation types"),
      "Mixed accommodation",
    );
    await user.type(
      screen.getByLabelText("Transport modes"),
      "Taxi or private transfer",
    );
    await user.type(screen.getByLabelText("Activity contexts"), "Kids’ clubs");

    await user.click(screen.getByRole("button", { name: "Create trip" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        destinations: ["Dubai, UAE"],
        climateProfile: "hot and humid",
        accommodationTypes: ["Mixed accommodation"],
        transportModes: ["Taxi or private transfer"],
        activityContexts: ["Kids’ clubs"],
      }),
    );
  });

  it("renders, removes and adds trip context values when editing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const trip: Trip = {
      id: "trip:summer",
      name: "Summer Cruise",
      tripType: "cruise",
      startDate: "2026-07-01",
      endDate: "2026-07-08",
      nights: 7,
      destinations: ["New York, USA", "Rome, Italy"],
      climateProfile: "warm, mixed",
      accommodationTypes: ["Cruise cabin", "Self-catering apartment"],
      transportModes: ["Taxi or private transfer", "Walking-heavy trip"],
      activityContexts: ["Cruise formal night", "Long travel day"],
      travellerIds: ["traveller:beck"],
      status: "planning",
      notes: "Existing notes",
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    };

    render(
      <TripForm
        travellers={travellers}
        initialTrip={trip}
        submitLabel="Save trip"
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("New York, USA")).toBeInTheDocument();
    expect(screen.getByText("Rome, Italy")).toBeInTheDocument();
    expect(screen.getByText("warm")).toBeInTheDocument();
    expect(screen.getByText("mixed")).toBeInTheDocument();
    expect(screen.getByText("Taxi or private transfer")).toBeInTheDocument();
    expect(screen.getByText("Long travel day")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove Rome, Italy" }));
    await addEntry(user, "Destinations", "Barcelona, Spain");
    await user.click(screen.getByRole("button", { name: "Remove mixed" }));
    await addEntry(user, "Climate profile", "cool evenings");

    await user.click(screen.getByRole("button", { name: "Save trip" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        destinations: ["New York, USA", "Barcelona, Spain"],
        climateProfile: "warm, cool evenings",
        accommodationTypes: ["Cruise cabin", "Self-catering apartment"],
        transportModes: ["Taxi or private transfer", "Walking-heavy trip"],
        activityContexts: ["Cruise formal night", "Long travel day"],
        notes: "Existing notes",
        nights: 7,
      }),
    );
  });
});

async function addEntry(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) {
  const input = screen.getByLabelText(label);
  await user.type(input, value);
  await user.click(
    within(input.parentElement as HTMLElement).getByRole("button", {
      name: "Add",
    }),
  );
}
