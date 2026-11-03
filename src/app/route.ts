/**
 * Hash routing (routing in docs/architecture.html): no router library. The address hash
 * names the screen: #/ (board list), #/board/{id}, and #/card-test for the Phase 1 page.
 */
import { useEffect, useState } from 'react';

export type Route = { screen: 'list' } | { screen: 'board'; id: string } | { screen: 'card-test' };

/** Parses a location hash. Empty, '#', '#/' and anything unknown open the board list. */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/card-test') return { screen: 'card-test' };
  const board = /^\/board\/([^/]+)$/.exec(path);
  if (board) {
    try {
      return { screen: 'board', id: decodeURIComponent(board[1]!) };
    } catch {
      // A malformed escape is an unknown address.
      return { screen: 'list' };
    }
  }
  return { screen: 'list' };
}

/** The current route, updated on every hashchange. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
