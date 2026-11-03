/**
 * Tests for the hash route parser.
 */
import { describe, expect, it } from 'vitest';
import { parseRoute } from './route';

describe('parseRoute', () => {
  it('parseRoute_emptyOrRoot_returnsList', () => {
    for (const hash of ['', '#', '#/']) expect(parseRoute(hash)).toEqual({ screen: 'list' });
  });

  it('parseRoute_boardId_returnsDecodedBoard', () => {
    expect(parseRoute('#/board/abc')).toEqual({ screen: 'board', id: 'abc' });
    expect(parseRoute('#/board/a%20b')).toEqual({ screen: 'board', id: 'a b' });
  });

  it('parseRoute_cardTest_returnsCardTest', () => {
    expect(parseRoute('#/card-test')).toEqual({ screen: 'card-test' });
  });

  it('parseRoute_unknownOrMalformed_returnsList', () => {
    for (const hash of ['#/nope', '#/tuck-spike', '#/board/', '#/board/a/b', '#/board/%E0%A4%A']) {
      expect(parseRoute(hash)).toEqual({ screen: 'list' });
    }
  });
});
