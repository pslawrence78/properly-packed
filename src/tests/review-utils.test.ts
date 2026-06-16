import { describe, expect, it } from "vitest";
import { countLearningsByType } from "../features/reviews";

describe("review utilities", () => {
  it("counts learnings by type", () => {
    expect(
      countLearningsByType([
        { learningType: "forgotten" },
        { learningType: "forgotten" },
        { learningType: "unused" },
        { learningType: "always-suggest" },
      ]),
    ).toMatchObject({
      forgotten: 2,
      unused: 1,
      "always-suggest": 1,
      invaluable: 0,
    });
  });
});
