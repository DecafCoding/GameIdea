/**
 * Question pool loading: fetches public/pools/question.json by web address, on its own
 * and apart from the 11 deck pools, so a failed question load never turns off the deck
 * buttons (docs/feature-questions-panel.html Scope).
 */
import type { QuestionPool } from '@/shared/model';
import { parseQuestionPool } from './parseQuestionPool';

/** The web address of the question pool file, relative to the app's base address. */
export function questionPoolUrl(): string {
  return `${import.meta.env.BASE_URL}pools/question.json`;
}

/** Loads the question pool. Rejects on a network error, a non-OK status, bad JSON or a bad shape. */
export async function loadQuestionPool(fetchFn: typeof fetch = fetch): Promise<QuestionPool> {
  const response = await fetchFn(questionPoolUrl());
  if (!response.ok) {
    throw new Error(`The question pool did not load (status ${response.status}).`);
  }
  return parseQuestionPool(await response.json());
}
