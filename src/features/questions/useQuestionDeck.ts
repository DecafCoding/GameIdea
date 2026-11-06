/**
 * useQuestionDeck: the Questions panel's view state (docs/feature-questions-panel.html Pick
 * rule): the current question, the seen list and the half-typed draft. None of it is
 * stored or in undo; it resets on board change and on reload. Next Question and Save
 * Answer pick in their handlers; an effect picks only when the pool or the answers change
 * outside the panel (the pool loads, an undo, another tab, a delete in the all-answered
 * state). The canvas keeps this hook above its nodes, so an off-screen panel keeps it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { pickQuestion } from './pickQuestion';

export interface QuestionDeck {
  /** null while loading, before the first pick, or when all are answered. */
  current: string | null;
  /** The pool loaded and every pool question is answered. */
  allAnswered: boolean;
  draft: string;
  setDraft: (text: string) => void;
  /** Next Question: picks another question and keeps the draft. */
  next: () => void;
  /** After Save Answer: clears the draft and picks the next question. */
  saved: () => void;
}

interface DeckState {
  boardId: string;
  current: string | null;
  seen: string[];
  draft: string;
}

const fresh = (boardId: string): DeckState => ({ boardId, current: null, seen: [], draft: '' });

export function useQuestionDeck(
  pool: readonly string[] | null,
  answered: ReadonlySet<string>,
  boardId: string,
  random: () => number = Math.random,
): QuestionDeck {
  const [state, setState] = useState<DeckState>(() => fresh(boardId));
  // A board change resets the deck (adjusting state on a prop change, during render).
  let view = state;
  if (state.boardId !== boardId) {
    view = fresh(boardId);
    setState(view);
  }
  const { current, seen } = view;
  const usable =
    current !== null && pool !== null && pool.includes(current) && !answered.has(current);

  useEffect(() => {
    if (pool === null || usable) return;
    const pick = pickQuestion({ pool, answered, seen, current }, random);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- picks a random question when the pool or the answers change outside the panel
    setState((s) =>
      pick === null
        ? s.current === null
          ? s
          : { ...s, current: null }
        : { ...s, current: pick.question, seen: pick.seen },
    );
  }, [pool, answered, current, seen, usable, random]);

  const next = useCallback(() => {
    if (pool === null) return;
    const pick = pickQuestion({ pool, answered, seen, current }, random);
    if (pick) setState((s) => ({ ...s, current: pick.question, seen: pick.seen }));
  }, [pool, answered, seen, current, random]);

  const saved = useCallback(() => {
    if (pool === null) return;
    // The just-saved question counts as answered before the new answers arrive.
    const done = new Set(answered);
    if (current !== null) done.add(current);
    const pick = pickQuestion({ pool, answered: done, seen, current }, random);
    setState((s) => ({
      ...s,
      draft: '',
      current: pick?.question ?? null,
      seen: pick?.seen ?? [],
    }));
  }, [pool, answered, seen, current, random]);

  const setDraft = useCallback((text: string) => setState((s) => ({ ...s, draft: text })), []);

  const allAnswered = pool !== null && pool.every((text) => answered.has(text));
  const shown = usable ? current : null;
  const draft = view.draft;
  return useMemo(
    () => ({ current: shown, allAnswered, draft, setDraft, next, saved }),
    [shown, allAnswered, draft, setDraft, next, saved],
  );
}
