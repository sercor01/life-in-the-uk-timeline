import raw from "../../data/exams.json";
import type { ExamQuestion, ExamRef } from "../types";

const sets = raw.exams as unknown as Record<string, ExamQuestion[]>;

export interface ResolvedRef {
  ref: ExamRef;
  question: ExamQuestion;
}

/** Turn a list of refs into full questions, dropping any that do not resolve. */
export function resolveRefs(refs?: ExamRef[]): ResolvedRef[] {
  if (!refs) return [];
  return refs
    .map((ref) => {
      const question = sets[String(ref.set)]?.find((q) => q.id === ref.id);
      return question ? { ref, question } : null;
    })
    .filter((r): r is ResolvedRef => r !== null);
}
