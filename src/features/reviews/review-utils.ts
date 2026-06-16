import type { ReviewLearningType } from "../../db/types";

export const reviewLearningOptions: { value: ReviewLearningType; label: string }[] = [
  { value: "forgotten", label: "Forgotten" },
  { value: "unused", label: "Unused" },
  { value: "invaluable", label: "Invaluable" },
  { value: "packed-in-wrong-bag", label: "Packed in wrong bag" },
  { value: "buy-for-next-time", label: "Buy for next time" },
  { value: "do-not-suggest-again", label: "Do not suggest again" },
  { value: "always-suggest", label: "Always suggest" },
];

export function countLearningsByType(
  learnings: { learningType: ReviewLearningType }[],
) {
  return reviewLearningOptions.reduce(
    (counts, option) => ({
      ...counts,
      [option.value]: learnings.filter(
        (learning) => learning.learningType === option.value,
      ).length,
    }),
    {} as Record<ReviewLearningType, number>,
  );
}
