# Simplifying the trip workspace - proposal for approval

Netanel's brief: *"i fear this looks like flying an airplane for some people, i am
the founder and it looks sometime scary."*

Nothing in the code has been changed. This document is the audit and the proposed
cure; per his instruction no component is touched until he approves.

---

## 1. What is actually on the screen (measured, not estimated)

Method: production build (`next start`), two seeded trips, real Chromium at two
viewports. An element counts if it is a `button`, link, `input`, `select`,
`textarea`, `role=button` or focusable, and is genuinely visible (rendered, not
`display:none`, larger than 4x4px). "First paint" means inside the viewport
before any scrolling.

| | 1440x900 | 390x844 |
|---|---|---|
| **Interactive elements at first paint** | **54** | **32** |
| Whole page, booking panel collapsed | 68 | 51 |
| Whole page, booking panel expanded | **90** | **73** |
| Page height | 1,871px (2.1 screens) | 2,133px (2.5 screens) |
| Second screen after one scroll | 36 | 23 |

Second fixture (2 cities, 4 days) gives 52 / 29 - the same picture, so this is
not an artefact of one trip shape.

**The single most important number is 54.** A first-time traveller who has just
watched the agent build their trip is handed fifty-four things they could click,
with no ranking between them.

### Where the 54 come from, at 1440

| Region | Count | What it is |
|---|---|---|
| Site chrome | 6 | logo, search, 3 nav links, the trip tab |
| Trip header | 3 | trip-name input, `+ טיול חדש`, `📍 ייבוא מפה` |
| Action row | 5 | `שכפול`, `קישור לשיתוף`, `שיתוף בוואטסאפ`, `הדפסה / PDF`, `מחיקה` |
| Preferences | 4 | `כשר`, `קצב`, `מי נוסע`, `שופינג` |
| Day tabs | 5 | `יום 1`-`יום 4`, `+ יום…` |
| Map | 13 | day/whole-trip toggle (2), map surface, 4 pins, 2 zoom, 3 attribution links |
| Day card | 3 | `מחיקת יום`, notes textarea, `פתיחת ניווט היום ב-Google Maps` |
| Stop list | 8 | per stop: remove, up, down, move-to-day - **4 controls per stop**, 2 stops visible |
| Agent chat | 7 | 4 quick replies, attach image, input, send |
| Accessibility | 1 | the floating a11y button |

### One correction to the founder's own screenshot

The booking panel (`מה עוד חסר לטיול`) defaults to **collapsed**
(`BookingPanel.tsx:33`). The screenshot showing six cards was taken after
clicking it open. So that section is *already* progressively disclosed - it is
not part of the 54, and it adds 22 more controls when opened. It is not among the
problems below.

Mobile is also already better than desktop: the action row collapses behind
`פעולות ▾` under 640px and the all-days grid collapses under 1024px. **The
"flying an airplane" feeling is primarily a desktop problem**, which matches the
screenshots being desktop.

---

## 2. The three worst contributors

### (a) Eleven controls sit above the plan, and a first-timer needs none of them

The action row plus the preference chips occupy the top ~190px at 1440 - the most
valuable space on the page - and every one of them is a *second-visit* action.
Someone seeing their first itinerary does not want to duplicate it, share it,
print it, import a Google map, or delete it. To use any of them they must already
know they have a trip worth keeping.

`מחיקה` is the sharpest instance: **destroying the trip is rendered at the same
visual weight as sharing it**, four buttons away from `+ טיול חדש`.

### (b) Four controls per stop, permanently visible

Every stop carries remove, move-up, move-down and move-to-another-day. Four
stops = 16 controls, none labelled with text, all small. To use them a first-timer
must infer that ▲▼ reorder *within* a day while the dropdown moves *between*
days - a distinction the UI never states. This is also the densest visual noise
in the itinerary column, competing directly with the place names, which are the
content people actually came to read.

### (c) The hierarchy is inverted: the agent is the smallest column

At xl the widths are 20rem itinerary / flexible map / 22rem chat. The product's
core - "tell it what you want and it plans" - is the narrowest, quietest column,
introduced by grey 12px text. Meanwhile the strongest colour on the entire screen
is `פתיחת ניווט היום ב-Google Maps`, a last-mile action for the day you are
actually travelling.

**This is the real diagnosis, and it is not about quantity.** 54 controls would
be survivable with a clear ranking. What makes it read as a cockpit is that
almost everything has the same size, the same weight and the same colour, so the
eye has nowhere to land. A pilot's instruments are dense *and* ranked; this is
dense and flat.

---

## 3. The remedy, chosen against the numbers

**Progressive disclosure, plus one deliberate hierarchy change.** Not a tutorial.

### Why not the alternatives

- **A first-run walkthrough** was the founder's first instinct. Rejected as the
  primary cure: it reduces the count by zero and *adds* controls. A tour teaches
  someone to tolerate a crowded screen instead of uncrowding it, it is seen once
  and never again, and it delays the first useful moment. Worth keeping as a
  *secondary*: one single coach-mark pointing at the agent input, once, dismissed
  forever - see the optional item at the end of the table.
- **A "simple mode" toggle with a `מצב מתקדם` switch.** Rejected: it doubles the
  states to design, build and test, and anyone who never finds the toggle never
  discovers the features behind it. Progressive disclosure is the same idea
  without a mode - the reveal sits next to the thing it belongs to.
- **Deleting features.** Not needed. Everything below stays reachable in at most
  two taps; only two genuinely low-value controls are proposed for removal, each
  with a reason in the table.

### Honest note on the target

The brief asked for the 390px first-paint count to fall by at least half, 32 → 16.
**That is not achievable without damage**, and I would rather say so now than
report a fake number later: of those 32, ten are the Leaflet map's own controls
(4 stop pins, 2 zoom buttons, 3 attribution links that the CARTO and OSM licences
require, the map surface itself) and two are the site nav. The floor is about 12.

So the target I propose to be held to instead:

| | now | proposed | change |
|---|---|---|---|
| 1440 first paint | 54 | **≤ 30** | -44% |
| 390 first paint | 32 | **≤ 20** | -37% |
| 1440, excluding map internals and site nav | 35 | **≤ 13** | **-63%** |

The third row is the one that measures the actual disease.

---

## 4. Disposition of every control

`stays` = unchanged and visible. `collapses` = behind a disclosure in the same
place. `moves` = relocated. `removed` = gone, with a reason.

| Control | Now | Disposition | Reason |
|---|---|---|---|
| Trip name input | header | **stays** | it is the page title; editing in place is good |
| `7 עצירות · 4 ימים` pill | header | **stays** | orientation, not a control |
| `+ טיול חדש` | header button | **stays** | the one header action a first-timer may want |
| `📍 ייבוא מפה` | header button | **moves** → actions menu | Google My Maps import is a power feature; it earns a menu row, not prime space |
| `שכפול` | action row | **moves** → actions menu | second-visit action |
| `קישור לשיתוף` | action row | **moves** → share group | still one tap from a single `שיתוף` button |
| `שיתוף בוואטסאפ` | action row | **moves** → share group | same |
| `הדפסה / PDF` | action row | **moves** → actions menu | pre-departure action |
| `מחיקה` | action row | **moves** → actions menu, bottom, separated | destructive actions must not sit at first paint beside sharing |
| 4 preference chips | always open row | **collapses** → one `העדפות` chip showing set values, expanding to all four | they are set once and re-read rarely; the *values* stay visible as text so nothing is hidden |
| `שומרי שבת` / budget chips | conditional | **collapses** with the above | same group |
| Day tabs `יום 1..N` | row | **stays** | this is the plan's primary navigation |
| `+ יום…` | tab row | **stays** | genuine editing affordance in the right place |
| Day/whole-trip map toggle | above map | **stays** | two controls, high value, shipped for exactly this |
| Map pins / zoom / attribution | Leaflet | **stays** | attribution is a licence obligation |
| Day title + description | day card | **stays** | content |
| Notes textarea | day card, always | **collapses** → `+ הערה ליום` which opens it (stays open when it has content) | an empty textarea reads as an unfinished form; most days have no note |
| `מחיקת יום` | day card | **moves** → day menu (`⋯`) beside the day title | destructive, one tap deeper |
| `פתיחת ניווט ב-Google Maps` | big coral button | **stays, restyled** to secondary | keeps its place, stops being the loudest thing on a screen you are reading at home |
| Per-stop remove / up / down | always visible, 3 per stop | **collapses** → one `⋯` per stop revealing all three; also revealed on keyboard focus | 12 of the 16 stop controls disappear from first paint; keyboard reveal keeps it accessible |
| Per-stop `העברה ליום אחר` | select, when city has 2+ days | **collapses** into the same `⋯` | belongs with the other move actions |
| Agent panel | 22rem third column | **stays, promoted**: wider at xl, a real heading, the composer visually primary | it is the product; it should not be the quietest column |
| Agent quick replies | 4 chips | **stays** | they are the cheapest path to a first successful edit |
| Attach image / send | composer | **stays** | core |
| All-days overview grid | open at lg+ | **collapses** at all widths (already collapsed under lg) | it repeats the day tabs and the day card; useful on demand |
| `מה עוד חסר לטיול` | already collapsed | **stays** | already correct |
| Pins panel | below booking | **stays** | only renders when pins exist |
| Accessibility button | floating | **stays** | must never be occluded |
| Nav search icon | site nav | **removed** at <1024px only | the mobile menu already contains a search row; two entry points in 390px of width is clutter |

**Only one control is proposed for outright removal, and the count above does not
depend on it.** Netanel allowed removing genuinely low-value controls, so I went
looking for some. I drafted this table with `שופינג` marked for deletion on the
theory that nothing reads it for an existing trip - **then checked the code, and
it was wrong.** `shopping` is validated by `set_preferences`
(`agent.ts:958`), carries a Hebrew label the agent reports back
(`agent.ts:497`), rides to the model inside `preferences` on every single turn,
is named in the system prompt's preferences rule, and drives real scoring in
`generate.ts:55-57`. The chip is the only way to set it on a trip that already
exists. It collapses with the other preferences; it is not removed. Recording the
mistake here because "low-value control" is an easy thing to assert and a
five-minute grep to check.

**One optional addition** (not required for the target, decide separately): a
single one-time coach-mark on the agent composer - *"כל שינוי בטיול נעשה כאן -
פשוט תכתבו"* - shown once per browser, dismissed on any interaction. This is the
part of the founder's "tutorial" instinct worth keeping, at 1/20th the cost.

---

## 5. Proposed first paint

### 390px

```
┌─────────────────────────────────────────┐
│ ☰                              טיול+ ✈ │
├─────────────────────────────────────────┤
│ וינה 4 ימים        7 עצירות · 4 ימים   │
│ [+ טיול חדש] [שיתוף] [⋯]               │
│ העדפות: כשר · רגוע · משפחה  ▾           │
│ [יום 1] [יום 2] [יום 3] [יום 4] [+]     │
│         [יום 1 | 🗺️ כל הטיול]          │
│ ┌─────────────────────────────────────┐ │
│ │              המפה                   │ │
│ └─────────────────────────────────────┘ │
│ יום 1 · וינה                        ⋯  │
│ אתרים ומוזיאונים · ועוד 3 עצירות        │
│  1  קתדרלת סנט סטפן                 ⋯  │
│  2  ארמון הופבורג                   ⋯  │
├─────────────────────────────────────────┤
│ 💬 בקשה לסוכן: תוסיף יום, תחליף מקום…  │
└─────────────────────────────────────────┘
```

### 1440px

```
┌──────────────────────────────────────────────────────────────────────┐
│ טיול+ ✈   סוכן הנסיעות החכם            וינה  כשרות  תכנון טיול  יעדים │
├──────────────────────────────────────────────────────────────────────┤
│ וינה 4 ימים   7 עצירות · 4 ימים      [+ טיול חדש] [שיתוף ▾] [⋯]     │
│ העדפות: כשר · רגוע · משפחה ▾                                          │
│ [יום 1] [יום 2] [יום 3] [יום 4] [+ יום…]                             │
│ ┌───────────────────┐ ┌──────────────────────┐ ┌──────────────────┐  │
│ │  הסוכן            │ │  [יום 1|כל הטיול]    │ │ יום 1 · וינה  ⋯ │  │
│ │  ────────         │ │                      │ │ אתרים ומוזיאונים │  │
│ │  כתבו מה לשנות    │ │        המפה          │ │  1 סנט סטפן   ⋯ │  │
│ │  בטיול            │ │                      │ │  2 הופבורג    ⋯ │  │
│ │                   │ │                      │ │  3 בלוודר     ⋯ │  │
│ │  [תוסיף לי יום]   │ │                      │ │  4 הפראטר     ⋯ │  │
│ │  [מה כשר באזור?]  │ └──────────────────────┘ │ + הערה ליום     │  │
│ │  ┌─────────────┐  │                          │ ניווט ב-Maps    │  │
│ │  │ כתבו כאן…   │  │                          │                  │  │
│ │  └─────────────┘  │                          │                  │  │
│ └───────────────────┘                          └──────────────────┘  │
│ ▸ כל הימים                                                            │
│ ▸ 🧳 מה עוד חסר לטיול                                                │
└──────────────────────────────────────────────────────────────────────┘
```

The three columns stay - one screen for plan, map and agent was a deliberate
decision (session log 2026-07-25 b) and it is right. What changes is which of
them the eye reaches first.

---

## 6. What could go wrong for existing users

- **You use `הדפסה / PDF` and `קישור לשיתוף` constantly.** They become one tap
  deeper. If that is wrong for you, keep either one in the row - the table is
  per-row vetoable.
- **Hover-only reveals break touch.** The per-stop `⋯` must be a real button, not
  a hover state, or reordering becomes impossible on a phone. Also revealed on
  keyboard focus, or the itinerary stops being keyboard-operable - the a11y audit
  in the log already flags Leaflet markers as unreachable; do not add a second
  such hole.
- **A collapsed notes field can hide content.** It must auto-open whenever the
  day already has a note, or people will think their notes were deleted.
- **Nothing here is irreversible.** Every item is a relocation or a disclosure;
  the one deletion is a duplicate search entry point on mobile. The one control I
  had wanted to delete turned out to be load-bearing (see the note under the
  table), which is a reminder that the remaining clutter is mostly *misplaced*,
  not *worthless*.
- **The all-days grid disappearing from desktop** is the change most likely to
  annoy someone who used it to scan a long trip. It stays one tap away, and the
  day tabs cover short trips.
- **Nothing here helps the empty state.** A first-time visitor with no trip sees
  the landing hero, not this screen. If the fear is about first *impressions*
  rather than first *itineraries*, the entry flow is a separate piece of work and
  this proposal does not address it.

---

## 7. If approved

Order of work, each step verified by re-running the count harness and reading
real screenshots at 1440 and 390 rather than reasoning about markup:

1. Header: actions menu + share group + preferences collapse. Biggest win, lowest
   risk. (54 → ~40 at 1440.)
2. Stop list: per-stop `⋯`. (→ ~30.)
3. Day card: notes disclosure, `מחיקת יום` into the day menu, navigation button
   restyled to secondary.
4. Hierarchy: agent column widened and given a real heading; all-days collapsed
   at every width.
5. Optional: the one-time coach-mark.

Steps 1-3 are mechanical and reversible. Step 4 is the one with a real design
judgement in it, and it is the one worth looking at together on a deployed
preview before it lands on `main`.
