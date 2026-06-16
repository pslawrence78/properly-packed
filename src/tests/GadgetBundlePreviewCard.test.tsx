import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GadgetBundlePreview } from "../db/repositories/gadget-bundles-repository";
import { GadgetBundlePreviewCard } from "../features/gadgets/GadgetPlannerScreen";

describe("GadgetBundlePreviewCard", () => {
  it("shows required and optional items and toggles optional selection", async () => {
    const user = userEvent.setup();
    const onToggleOptional = vi.fn();
    const preview: GadgetBundlePreview = {
      bundle: {
        id: "bundle:1",
        name: "Camera kit",
        ownerTravellerId: "traveller:phil",
        applicableTripTypes: ["cruise"],
        applicableContexts: ["photography"],
        createdAt: "2026-06-16T00:00:00.000Z",
        updatedAt: "2026-06-16T00:00:00.000Z",
      },
      ownerTraveller: {
        id: "traveller:phil",
        name: "Phil",
        travellerType: "adult",
        defaultIncluded: true,
        createdAt: "2026-06-16T00:00:00.000Z",
        updatedAt: "2026-06-16T00:00:00.000Z",
      },
      suggestions: [
        {
          bundleItem: {
            id: "item:camera",
            bundleId: "bundle:1",
            name: "Camera body",
            category: "electronics",
            required: true,
            quantity: 1,
            flags: ["device"],
            preTripTaskType: "charge",
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
          },
          optional: false,
          status: "new",
        },
        {
          bundleItem: {
            id: "item:cloth",
            bundleId: "bundle:1",
            name: "Lens cloth",
            category: "electronics",
            required: false,
            quantity: 1,
            flags: ["cleaning"],
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
          },
          optional: true,
          status: "new",
        },
      ],
      requiredCount: 1,
      optionalCount: 1,
      duplicateCount: 0,
    };

    render(
      <GadgetBundlePreviewCard
        preview={preview}
        selectedOptionalIds={[]}
        onApply={vi.fn()}
        onToggleOptional={onToggleOptional}
      />,
    );

    expect(screen.getByRole("heading", { name: "Camera kit" })).toBeInTheDocument();
    expect(screen.getByText("Camera body")).toBeInTheDocument();
    expect(screen.getByText("Lens cloth")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));

    expect(onToggleOptional).toHaveBeenCalledWith("item:cloth");
  });
});
