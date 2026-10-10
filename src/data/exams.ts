import raw from "../../data/exams.json";
import type { ExamQuestion, ExamRef, ExamSet } from "../types";

const sets = raw.exams as unknown as ExamSet;

export const EXAM_LAST_UPDATED = raw.metadata.lastUpdated;

/** Look up a single question by its set + id. */
export function getQuestion(set: number, id: number): ExamQuestion | undefined {
  return sets[String(set)]?.find((q) => q.id === id);
}

export interface ResolvedRef {
  ref: ExamRef;
  question: ExamQuestion;
}

/** Turn a list of refs into full questions, dropping any that do not resolve. */
export function resolveRefs(refs?: ExamRef[]): ResolvedRef[] {
  if (!refs) return [];
  return refs
    .map((ref) => {
      const question = getQuestion(ref.set, ref.id);
      return question ? { ref, question } : null;
    })
    .filter((r): r is ResolvedRef => r !== null);
}

/** All distinct reference texts for a set of refs, de-duplicated. */
export function referenceTexts(refs?: ExamRef[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { question } of resolveRefs(refs)) {
    const text = question.reference.trim();
    if (text && !seen.has(text)) {
      seen.add(text);
      out.push(text);
    }
  }
  return out;
}
