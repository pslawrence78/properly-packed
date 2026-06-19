import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PackingItem, ReviewLearning, Template, Trip } from "../db/types";
import {
  LearningCard,
  ReviewItemRow,
} from "../features/reviews/PostTripReviewScreen";

describe("ReviewItemRow", () => {
  it("captures a forgotten item tag", async () => {
    const user = userEvent.setup();
    const onCapture = vi.fn();

    render(<ReviewItemRow item={item()} trip={trip()} onCapture={onCapture} />);

    await user.click(screen.getByRole("button", { name: "Forgotten" }));

    expect(onCapture).toHaveBeenCalledWith("forgotten");
  });
});

describe("LearningCard", () => {
  it("blocks template promotion until a target is explicitly selected", async () => {
    const user = userEvent.setup();
    const onPromoteTemplate = vi.fn();
    const onTemplateChange = vi.fn();
    const props = {
      learning: learning(),
      templates: [template()],
      onAlwaysSuggest: vi.fn(),
      onNeverSuggest: vi.fn(),
      onPromoteTemplate,
      onPromoteUsefulExtra: vi.fn(),
      onTemplateChange,
    };
    const { rerender } = render(
      <LearningCard {...props} selectedTemplateId="" />,
    );

    expect(screen.getByRole("button", { name: "Add to template" })).toBeDisabled();
    expect(screen.getByText(/Choose a template before promoting/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Target template"), "template:cruise");
    expect(onTemplateChange).toHaveBeenCalledWith("template:cruise");

    rerender(<LearningCard {...props} selectedTemplateId="template:cruise" />);
    await user.click(screen.getByRole("button", { name: "Add to template" }));
    expect(onPromoteTemplate).toHaveBeenCalledOnce();
  });
});

function item(): PackingItem {
  return {
    id: "item:1",
    tripId: "trip:1",
    name: "Beach shoes",
    ownershipScope: "traveller",
    ownerTravellerId: "traveller:adult",
    category: "clothing",
    quantity: 1,
    priority: "important",
    status: "unused",
    flags: [],
    dependencyItemIds: [],
    source: "manual",
    forgottenRisk: false,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function trip(): Trip {
  return {
    id: "trip:1",
    name: "Review trip",
    tripType: "cruise",
    startDate: "2026-08-01",
    endDate: "2026-08-08",
    nights: 7,
    destinations: ["Southampton"],
    climateContextIds: [],
    accommodationContextIds: [],
    transportContextIds: [],
    activityContextIds: [],
    accommodationTypes: ["ship"],
    transportModes: ["ship"],
    activityContexts: ["cruise"],
    travellerIds: ["traveller:adult"],
    status: "completed",
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function learning(): ReviewLearning {
  return {
    id: "learning:useful",
    reviewId: "review:1",
    itemName: "Useful learning",
    learningType: "forgotten",
    appliesToTripTypes: ["cruise"],
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}

function template(): Template {
  return {
    id: "template:cruise",
    name: "Cruise template",
    applicableTripTypes: ["cruise"],
    applicableTravellers: [],
    applicableContexts: [],
    active: true,
    createdAt: "2026-06-16T00:00:00.000Z",
    updatedAt: "2026-06-16T00:00:00.000Z",
  };
}
