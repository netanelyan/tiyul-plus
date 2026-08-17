/**
 * PostgREST query building - **the only place allowed to assemble a
 * query string** against Supabase.
 *
 * ## Why this exists
 *
 * A security audit of every route touching the database found no live
 * injection: every user-supplied value is either `encodeURIComponent`d,
 * regex-validated, or a uuid the server itself received from Supabase,
 * and the SQL functions contain no dynamic SQL at all. But **the safety
 * rested on every caller remembering to encode**, and the signature of
 * `adminSelect(table, query: string)` positively invites hand-building
 * a string:
 *
 *     adminSelect('profiles', `user_id=eq.${id}`)   // works. and a bug waits.
 *
 * That is exactly the kind of rule this log is full of failures of: a
 * rule that rests on memory breaks the moment somebody is in a hurry.
 * So the value is not "supposed to" be encoded - it **cannot** reach
 * the server unencoded, because there is no other way to build a query.
 *
 * ## What this actually prevents
 *
 * PostgREST parses commas, parentheses and dots inside a filter value.
 * An unencoded value allows swapping the predicate -
 * `1&role=eq.owner`, `x,y` inside `in.()`, or `or=(...)` - i.e. reading
 * or updating somebody else's rows. Encoding turns those characters
 * into part of the value, and never into syntax.
 *
 * Column, table and function names are not values and therefore are
 * not encoded - they are validated against a narrow regex and rejected
 * otherwise. They are always literals in code; the check here is so
 * that stays true.
 */

const IDENT = /^[a-z_][a-z0-9_]*$/;

export class PgrestError extends Error {}

function ident(name: string): string {
  if (!IDENT.test(name)) throw new PgrestError(`unsafe identifier: ${name}`);
  return name;
}

/** A table/view/function name that goes into the URL path */
export function pgIdent(name: string): string {
  return ident(name);
}

/** A uuid that goes into a URL path (GoTrue admin) - must be an actual uuid */
export function pgUuid(value: string): string {
  if (!/^[0-9a-fA-F-]{36}$/.test(value)) throw new PgrestError('unsafe uuid');
  return value;
}

type Scalar = string | number | boolean;

/** A filter value. Always encoded - that is the whole point of this file. */
export function pgValue(value: Scalar): string {
  const s = typeof value === 'string' ? value : String(value);
  // Control characters should never reach here through any legitimate path,
  // and encodeURIComponent would actually pass them onward encoded. Better
  // to fail loudly.
  if (/[\u0000-\u001f\u007f]/.test(s)) throw new PgrestError('control character in filter value');
  // **encodeURIComponent alone is not enough here, and that was caught by
  // the test, not by eye.** It leaves `!'()*` as they are, and three of
  // them carry meaning in PostgREST: parentheses close an `in.(...)` list
  // or an `or=(...)` tree, and the asterisk is the wildcard of
  // `like`/`ilike`. We encode those too (the RFC 3986 form).
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is';

/** `col=op.value` with an encoded value */
export function pgFilter(column: string, op: Op, value: Scalar): string {
  return `${ident(column)}=${op}.${pgValue(value)}`;
}

export const eq = (column: string, value: Scalar) => pgFilter(column, 'eq', value);
export const gte = (column: string, value: Scalar) => pgFilter(column, 'gte', value);
/** `col=neq.value` - negation. Exactly the same encoding, hence the same safety. */
export const neq = (column: string, value: Scalar) => pgFilter(column, 'neq', value);

/** `col=in.(a,b,c)` - each element encoded separately, so a comma inside a value does not split */
export function pgIn(column: string, values: Scalar[]): string {
  return `${ident(column)}=in.(${values.map((v) => pgValue(v)).join(',')})`;
}

/** The list of columns to return. Code literals only - never user input. */
export function pgSelect(columns: string[]): string {
  return `select=${columns.map(ident).join(',')}`;
}

export function pgOrder(column: string, dir: 'asc' | 'desc' = 'asc'): string {
  return `order=${ident(column)}.${dir}`;
}

export function pgLimit(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new PgrestError('bad limit');
  return `limit=${n}`;
}

/** Joins the parts into one query string */
export function pgQuery(...parts: string[]): string {
  return parts.filter(Boolean).join('&');
}
