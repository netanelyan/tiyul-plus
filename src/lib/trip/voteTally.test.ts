/**
 * The optimistic vote arithmetic.
 *
 * The claim being locked down is that the number painted on the click equals the
 * number the server will send back. A prediction that drifts is worse than the lag
 * it replaced: the count on screen would be confidently wrong, and on this page the
 * count is the whole content.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVote, nextVote } from './voteTally.ts';

test('applyVote: הצבעה ראשונה מעלה את הצד הנכון ומסמנת את שלי', () => {
  const t = applyVote(undefined, 'p1', 1);
  assert.deepEqual(t, { placeId: 'p1', up: 1, down: 0, mine: 1 });

  const d = applyVote(undefined, 'p1', -1);
  assert.deepEqual(d, { placeId: 'p1', up: 0, down: 1, mine: -1 });
});

test('applyVote: לחיצה שנייה על אותו צד מסירה את ההצבעה', () => {
  const after = applyVote({ placeId: 'p1', up: 3, down: 1, mine: 1 }, 'p1', 0);
  assert.equal(after.up, 2, 'my vote is removed');
  assert.equal(after.down, 1, 'the other side is untouched');
  assert.equal(after.mine, undefined, 'and I no longer have a vote');
});

test('applyVote: מעבר מצד לצד מזיז הצבעה אחת, לא מוסיף שתיים', () => {
  const after = applyVote({ placeId: 'p1', up: 2, down: 5, mine: 1 }, 'p1', -1);
  assert.equal(after.up, 1);
  assert.equal(after.down, 6);
  assert.equal(after.mine, -1);
});

test('applyVote: הצבעות של אחרים נשארות במקומן', () => {
  // 4 up / 2 down, none of them mine - my new vote adds exactly one
  const after = applyVote({ placeId: 'p1', up: 4, down: 2 }, 'p1', 1);
  assert.equal(after.up, 5);
  assert.equal(after.down, 2);
});

test('applyVote: לעולם לא מציג מספר שלילי', () => {
  // A stale tally that claims I voted up while the count is already 0
  const after = applyVote({ placeId: 'p1', up: 0, down: 0, mine: 1 }, 'p1', 0);
  assert.equal(after.up, 0);
  assert.equal(after.down, 0);
});

test('nextVote: אותו כיוון מבטל, כיוון אחר מחליף', () => {
  assert.equal(nextVote(1, 1), 0);
  assert.equal(nextVote(-1, -1), 0);
  assert.equal(nextVote(1, -1), -1);
  assert.equal(nextVote(undefined, 1), 1);
});

/*
  The round trip that matters: a full click sequence has to land back where it
  started. If it does not, a member who changes their mind twice leaves a phantom
  vote behind in the counts.
*/
test('applyVote: מעלה, מוריד, מבטל - חוזר בדיוק למצב ההתחלתי', () => {
  const start = { placeId: 'p1', up: 7, down: 3 };
  let t = applyVote(start, 'p1', nextVote(undefined, 1));
  t = applyVote(t, 'p1', nextVote(t.mine, -1));
  t = applyVote(t, 'p1', nextVote(t.mine, -1));
  assert.deepEqual(t, { placeId: 'p1', up: 7, down: 3 });
});
