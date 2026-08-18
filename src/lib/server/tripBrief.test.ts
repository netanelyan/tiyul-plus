import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agentAlreadyAsked,
  conversationStatesBrief,
  conversationStatesLength,
  statesTravellerBrief,
  statesTripLength,
} from './tripBrief';

test('אורך שנאמר במפורש מזוהה - הצורות שאנשים באמת כותבים', () => {
  const stated = [
    'תבנה לי טיול 5 ימים בוינה',
    'טיול של 8 ימים בברטיסלבה ווינה',
    'ל-10 ימים באיטליה',
    'שלושה ימים בפראג',
    'חמישה לילות ברומא',
    'יומיים בבודפשט',
    'שבועיים ביפן',
    'שבוע באיטליה',
    'סופ"ש בפראג',
    'סוף שבוע בברלין',
    'חודש בתאילנד',
    'a week in Rome',
    '7 days in Vienna',
    'weekend in Berlin',
    'טסים 12-18/8',
    'מ-5 עד 9 באוגוסט',
    '3-10 באוגוסט',
  ];
  for (const s of stated) assert.equal(statesTripLength(s), true, `לא זוהה אורך ב: ${s}`);
});

test('בקשה בלי אורך אינה נחשבת כאורך - זה בדיוק המקרה שהמציא 4 ימים', () => {
  const missing = [
    'תבנה לי טיול לוינה',
    'תכנן לי מסלול באיטליה',
    'אני רוצה לטוס לפראג',
    'מה כדאי לראות בברצלונה?',
    'טיול משפחתי עם ילדים',
    'תבנה לי טיול רומנטי',
  ];
  for (const s of missing) assert.equal(statesTripLength(s), false, `זוהה אורך שלא נאמר ב: ${s}`);
});

test('"בשבוע הבא" הוא מתי, לא כמה - וזו הטעות שהייתה מחזירה את הבאג', () => {
  /*
    A false positive here is worse than a miss: it lets the model build with a
    length nobody stated, which is the whole bug. "Next week" and "this week"
    say WHEN, not HOW LONG.
  */
  for (const s of ['אני חושב על וינה בשבוע הבא', 'השבוע אני פנוי', 'נוסע בשבוע שעבר היינו', 'בחודש הבא']) {
    assert.equal(statesTripLength(s), false, `נספר כאורך למרות שזה תאריך: ${s}`);
  }
});

test('תשובה שהיא רק מספר נחשבת - אחרת שואלים את אותה שאלה פעמיים', () => {
  assert.equal(statesTripLength('5'), true);
  assert.equal(statesTripLength(' 7 '), true);
  assert.equal(statesTripLength('12.'), true);
  // Not a length: a year, a price, an id
  assert.equal(statesTripLength('2026'), false);
  assert.equal(statesTripLength('אולי 5 אנשים'), false);
});

test('רק המטייל קובע - אורך שהסוכן הציע אינו אורך שנאמר', () => {
  /*
    The failure this guards: the model answers "here is a 4-day suggestion",
    and one turn later reads its own sentence back as if the traveller had
    asked for four days. Exactly the shape of the kashrut gate's rule.
  */
  const convo = [
    { role: 'user', content: 'תבנה לי טיול לוינה' },
    { role: 'assistant', content: 'הנה הצעה ל-4 ימים בוינה' },
  ];
  assert.equal(conversationStatesLength(convo), false);
  assert.equal(
    conversationStatesLength([...convo, { role: 'user', content: '6 ימים' }]),
    true,
  );
});

test('האורך נספר מכל השיחה, לא רק מההודעה האחרונה', () => {
  const convo = [
    { role: 'user', content: 'חשבתי על 6 ימים באיטליה' },
    { role: 'assistant', content: 'רומא היא התחלה טובה' },
    { role: 'user', content: 'יאללה, תבנה' },
  ];
  assert.equal(conversationStatesLength(convo), true);
});

test('מי נוסע ומה מעניין - מזוהה כשנאמר', () => {
  const said = [
    'זוג, אוהבים אוכל',
    'משפחה עם ילדים',
    'טיול עם החברים',
    'אני נוסע לבד',
    'ירח דבש',
    'אוהבים היסטוריה ומוזיאונים',
    'בעיקר טבע והליכות',
    'רוצים שופינג וחיי לילה',
  ];
  for (const s of said) assert.equal(statesTravellerBrief(s), true, `לא זוהה תדריך ב: ${s}`);
});

test('אורך לבדו אינו תדריך - זה בדיוק המקרה שבנה בלי לשאול', () => {
  assert.equal(statesTravellerBrief('תבנה לי טיול 6 ימים בוינה'), false);
  assert.equal(statesTravellerBrief('תבנה לי טיול לפראג'), false);
  assert.equal(
    conversationStatesBrief([{ role: 'user', content: 'תבנה לי טיול 6 ימים בוינה' }]),
    false,
  );
});

test('שאלה אחת ודי - הסוכן ששאל כבר לא ייחסם שוב', () => {
  /*
    The loop breaker. Without it, a traveller who answers "doesn't matter" is
    asked the same thing again forever - which is a worse product than the
    assumption this gate exists to prevent.
  */
  const asked = [
    { role: 'user', content: 'תבנה לי טיול 6 ימים בוינה' },
    { role: 'assistant', content: 'מי נוסע? זוג, משפחה או חברים?' },
    { role: 'user', content: 'לא משנה, תבנה כבר' },
  ];
  assert.equal(agentAlreadyAsked(asked), true);
  assert.equal(conversationStatesBrief(asked), false, 'המטייל באמת לא אמר - וזה בסדר');
  // A conversation the agent never questioned is still gated
  assert.equal(
    agentAlreadyAsked([
      { role: 'user', content: 'תבנה לי טיול 6 ימים בוינה' },
      { role: 'assistant', content: 'בניתי לך שישה ימים.' },
    ]),
    false,
  );
});
