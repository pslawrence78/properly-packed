import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
          key: "template-item:1:shared:none",
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
          packingStatus: "needed",
          status: "new",
          reason: "Suggested by Cruise template. Suggested as a shared trip item.",
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
    expect(screen.getByText("Source: Cruise template")).toBeInTheDocument();
    expect(screen.getByText(/Suggested as a shared trip item/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply 1 new item" })).toBeEnabled();
  });

  it("requires confirmation before applying", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const preview = previewRow();
    render(<TemplatePreviewCard preview={preview} onApply={onApply} />);

    await user.click(screen.getByRole("button", { name: "Apply 1 new item" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Existing packing items will not be changed"));
    expect(onApply).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Apply 1 new item" }));
    expect(onApply).toHaveBeenCalledOnce();
    confirm.mockRestore();
  });
});

function previewRow(): TemplatePreview {
  const template: TemplatePreview["template"] = {
    id: "template:1",
    name: "Cruise template",
    applicableTripTypes: ["cruise"],
    applicableTravellers: ["adult"],
    applicableContexts: [],
    active: true,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
  };
  return {
    template,
    suggestions: [
      {
        key: "template-item:1:shared:none",
        template,
        templateItem: {
          id: "template-item:1",
          templateId: template.id,
          name: "Travel documents",
          ownerType: "shared",
          category: "documents",
          quantity: 1,
          priority: "essential",
          flags: [],
          conditionRules: [],
          createdAt: "2026-06-18T00:00:00.000Z",
          updatedAt: "2026-06-18T00:00:00.000Z",
        },
        ownershipScope: "shared",
        packingStatus: "needed",
        status: "new",
        reason: "Suggested by Cruise template.",
      },
    ],
    newCount: 1,
    duplicateCount: 0,
    skippedCount: 0,
  };
}
