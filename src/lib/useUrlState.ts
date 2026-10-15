import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  isNavigating,
  reduce,
  type Action,
  type AppState,
} from "./appState";
import { encodeState, parseState } from "./urlState";

/** The current URL, as the string we compare our own writes against. */
function currentUrl(): string {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

/**
 * App state, kept in the address bar.
 *
 * The URL is the store: it is read once at boot, rewritten as the visitor moves
 * and re-read on every Back or Forward, which is what makes a view shareable
 * and a tab switch undoable. State still lives in React, so no render depends
 * on the URL being parseable — the two are just kept equal.
 *
 * Writes are batched by React (one effect run per commit), so a whole gesture
 * costs one `replaceState`, and an action whose result is a URL we are already
 * on writes nothing at all. That last part is what keeps a repeated click from
 * padding the history with identical entries.
 */
export function useUrlState(): [AppState, (action: Action) => void] {
  const [state, dispatch] = useReducer(reduce, undefined, () =>
    parseState(window.location.search),
  );
  /** The latest state, readable from `send` without re-creating it per render. */
  const stateRef = useRef(state);
  stateRef.current = state;
  /**
   * The verb for the next write. A push wins if any action in the same commit
   * navigates: clicking a pin opens a panel *and* focuses the place, and the
   * visitor should get one Back for that, not two.
   */
  const nextVerb = useRef<"push" | "replace">("replace");
  /** The last URL we wrote, so an unchanged state never touches history. */
  const written = useRef(currentUrl());

  const send = useCallback((action: Action) => {
    /*
     * Run the reducer here as well, for two reasons. A no-op — re-picking the
     * active tab, say — is recognised and dropped, so it neither re-renders nor
     * leaves a push armed for the next write (React would bail out of that
     * render anyway, but the push would still be waiting). And the history verb
     * sometimes depends on what we are moving *from* (the first panel a tab
     * opens pushes; changing it later replaces), which only the previous state
     * can say. Running it also keeps the ref current when two actions land in
     * one commit, so the second composes on the first rather than on the same
     * stale state.
     */
    const previous = stateRef.current;
    const next = reduce(previous, action);
    if (next === previous) return;
    if (isNavigating(action, previous)) nextVerb.current = "push";
    stateRef.current = next;
    dispatch(action);
  }, []);

  useEffect(() => {
    const query = encodeState(state);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    // Consumed here, whatever happens next: a verb belongs to the commit that
    // armed it, and one that writes nothing (a state change with the same URL)
    // must not lie in wait for a later, continuous one.
    const verb = nextVerb.current;
    nextVerb.current = "replace";
    if (url === written.current) return;
    written.current = url;
    // Also the first run's job: a link with junk in it is quietly tidied to its
    // canonical form, on the entry the visitor landed on.
    if (verb === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [state]);

  useEffect(() => {
    const onPop = () => {
      // The browser has already moved: mirror it rather than pushing again.
      written.current = currentUrl();
      nextVerb.current = "replace";
      dispatch({ type: "restore", state: parseState(window.location.search) });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return [state, send];
}
