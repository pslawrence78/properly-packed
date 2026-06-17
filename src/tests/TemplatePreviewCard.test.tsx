import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplatePreviewCard } from "../features/templates/TripTemplatesScreen";
import type { TemplatePreview } from "../db/repositories/templates-repository";

describe("TemplatePreviewCard", () => {
  it("shows suggestion counts and preview rows", () => {
    const preview: TemplatePreview = {
      template: {
        id: "template:1",
        name: "Cruise",
        applicableTripTypes: ["cruise"],
        applicableTravellers: ["adult"],
        applicableContexts: ["formal-night"],
        active: true,
        createdAt: "2026-06-16T00:00:00.000Z",
        updatedAt: "2026-06-16T00:00:00.000Z",
      },
      suggestions: [
        {
          template: {
            id: "template:1",
            name: "Cruise",
            applicableTripTypes: ["cruise"],
            applicableTravellers: ["adult"],
            applicableContexts: ["formal-night"],
            active: true,
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
          },
          templateItem: {
            id: "template-item:1",
            templateId: "template:1",
            name: "Cruise boarding documents",
            ownerType: "shared",
            category: "documents",
            quantity: 1,
            priority: "essential",
            flags: [],
            conditionRules: [],
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
          },
          ownershipScope: "shared",
          status: "new",
        },
      ],
      newCount: 1,
      duplicateCount: 0,
      skippedCount: 0,
    };

    render(<TemplatePreviewCard preview={preview} onApply={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Cruise" })).toBeInTheDocument();
    expect(screen.getByText("1 new, 0 duplicates, 0 skipped.")).toBeInTheDocument();
    expect(screen.getByText("Cruise boarding documents")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply template" })).toBeEnabled();
  });
});
