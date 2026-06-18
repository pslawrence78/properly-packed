import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ContextOption, ContextOptionType, Traveller, Trip } from "../db/types";
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
];

const contextOptions = [
  context("climate:warm", "climate", "Warm"),
  context("accommodation:cruise", "accommodation", "Cruise cabin"),
  context("transport:flight", "transport", "Flight"),
  context("activity:formal", "activity", "Cruise formal night"),
  context("activity:travel", "activity", "Long travel day"),
  context("activity:museum", "activity", "Museum day", false),
];

describe("TripForm", () => {
  it("submits selected context IDs and a destination containing spaces and commas", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(<TripForm travellers={travellers} contextOptions={contextOptions} submitLabel="Create trip" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Trip name"), "Summer Cruise");
    await user.type(screen.getByLabelText("Start date"), "2026-07-01");
    await user.type(screen.getByLabelText("End date"), "2026-07-08");
    await user.type(screen.getByLabelText("Destinations"), "New York, USA");
    await user.click(within(screen.getByLabelText("Destinations").parentElement as HTMLElement).getByRole("button", { name: "Add destination" }));

    await selectContext(user, "Climate Profiles", "climate:warm");
    await selectContext(user, "Accommodation Types", "accommodation:cruise");
    await selectContext(user, "Transport Modes", "transport:flight");
    await selectContext(user, "Activity Contexts", "activity:formal");
    await selectContext(user, "Activity Contexts", "activity:travel");
    await user.click(screen.getByRole("button", { name: "Create trip" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      destinations: ["New York, USA"],
      climateContextIds: ["climate:warm"],
      accommodationContextIds: ["accommodation:cruise"],
      transportContextIds: ["transport:flight"],
      activityContextIds: ["activity:formal", "activity:travel"],
      nights: 7,
      travellerIds: ["traveller:beck"],
    }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("climateProfile");
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("activityContexts");
  });

  it("keeps inactive and unknown saved contexts readable", () => {
    const trip: Trip = {
      id: "trip:summer",
      name: "Summer Cruise",
      tripType: "cruise",
      startDate: "2026-07-01",
      endDate: "2026-07-08",
      nights: 7,
      destinations: ["Rome, Italy"],
      climateContextIds: ["climate:warm"],
      accommodationContextIds: ["accommodation:cruise"],
      transportContextIds: ["transport:flight"],
      activityContextIds: ["activity:museum", "activity:missing"],
      travellerIds: ["traveller:beck"],
      status: "planning",
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    };

    renderForm(<TripForm travellers={travellers} contextOptions={contextOptions} initialTrip={trip} submitLabel="Save trip" onSubmit={vi.fn()} />);

    expect(screen.getByText("Museum day")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Unknown context")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Activity Contexts")).queryByRole("option", { name: "Museum day" })).not.toBeInTheDocument();
    expect(screen.getByText("Rome, Italy")).toBeInTheDocument();
  });

  it("requires a traveller and clears the inline error after selection", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(<TripForm travellers={travellers} contextOptions={contextOptions} submitLabel="Create trip" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Trip name"), "City break");
    await user.type(screen.getByLabelText("Start date"), "2026-09-01");
    await user.type(screen.getByLabelText("End date"), "2026-09-04");
    await user.click(screen.getByRole("checkbox", { name: /Beck/i }));
    await user.click(screen.getByRole("button", { name: "Create trip" }));

    expect(screen.getAllByText("Select at least one traveller for this trip.").length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox", { name: /Beck/i }));
    expect(screen.queryByText("Select at least one traveller for this trip.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create trip" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ travellerIds: ["traveller:beck"] }));
  });
});

async function selectContext(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  id: string,
) {
  await user.selectOptions(screen.getByLabelText(label), id);
  await user.click(screen.getByRole("button", { name: `Add ${label}` }));
}

function renderForm(form: JSX.Element) {
  return render(<MemoryRouter>{form}</MemoryRouter>);
}

function context(
  id: string,
  type: ContextOptionType,
  label: string,
  active = true,
): ContextOption {
  return {
    id,
    type,
    label,
    active,
    sortOrder: 0,
    archivedAt: active ? undefined : "2026-06-16T00:00:00.000Z",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
