/**
 * "Which day works for everyone" - the arithmetic behind the date poll.
 *
 * Pure and separate from the database code so it can be tested, because the
 * summary it produces is the whole reason the poll exists: an organiser reads
 * "4 of 5 can do the 12th" and books flights on it. A quietly wrong count here
 * is worse than no poll at all.
 *
 * **Silence is not a yes.** A member who has not answered for a day is neither
 * `yes` nor `no` - they are `pending`, counted separately and shown separately.
 * Folding them into either side is what turns "nobody objected" into "everybody
 * agreed", which is exactly the mistake that gets a date booked that half the
 * group cannot make.
 */

export interface DayTally {
  day: string;
  yes: number;
  no: number;
  /** Members who have not answered for this day at all. */
  pending: number;
  /** True only when every member answered and every answer was yes. */
  everyone: boolean;
  /** The member ids who said no - so the organiser can ask them, not guess. */
  blockers: string[];
}

export function tallyDates(
  options: string[],
  memberIds: string[],
  votes: { member_id: string; day: string; ok: boolean }[],
): DayTally[] {
  const members = [...new Set(memberIds)].filter(Boolean);
  const byDay = new Map<string, Map<string, boolean>>();
  for (const v of votes) {
    if (!byDay.has(v.day)) byDay.set(v.day, new Map());
    byDay.get(v.day)!.set(v.member_id, v.ok);
  }

  return [...options].sort().map((day) => {
    const answers = byDay.get(day) ?? new Map<string, boolean>();
    let yes = 0;
    let no = 0;
    const blockers: string[] = [];
    for (const id of members) {
      const a = answers.get(id);
      if (a === true) yes += 1;
      else if (a === false) {
        no += 1;
        blockers.push(id);
      }
    }
    const pending = members.length - yes - no;
    return {
      day,
      yes,
      no,
      pending,
      // Not "no objections" - every member has to have actually said yes.
      everyone: members.length > 0 && yes === members.length,
      blockers,
    };
  });
}

/**
 * The best candidates, for the one line the organiser reads first.
 * Ranked by yes, then by fewest no, then by date - so a day everybody can make
 * always beats a day nobody has answered on.
 */
export function bestDays(tallies: DayTally[], limit = 3): DayTally[] {
  return [...tallies]
    .filter((t) => t.yes > 0)
    .sort((a, b) => b.yes - a.yes || a.no - b.no || a.day.localeCompare(b.day))
    .slice(0, limit);
}
