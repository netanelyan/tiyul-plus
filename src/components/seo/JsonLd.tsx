import type { JsonLdNode } from '@/lib/seo/jsonLd';

/**
 * Renders JSON-LD into the document.
 *
 * ## The escaping is not optional
 *
 * `JSON.stringify` does not escape `<`, so a catalog string containing the
 * literal sequence that closes a script tag would terminate the block early and
 * put the remaining JSON into the page as markup. The catalog is curated Hebrew
 * prose and has no such string today, but "today" is doing a lot of work in that
 * sentence - a data session adds text to this file's inputs every week, and the
 * failure mode is an injection, not a typo.
 *
 * Escaping `<` as `<` is valid JSON, parses to exactly the same string, and
 * removes the possibility entirely. `&` and `>` are escaped too so the payload
 * cannot be mangled by an HTML-entity-decoding proxy.
 *
 * A `<script>` tag is used rather than Next's `<Script>` because this must be in
 * the server-rendered HTML: a crawler that does not execute JavaScript has to
 * see it, which is the entire purpose.
 */
export default function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const nodes = Array.isArray(data) ? data : [data];
  if (nodes.length === 0) return null;

  const json = JSON.stringify(nodes.length === 1 ? nodes[0] : nodes)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <script
      type="application/ld+json"
      // The content is built from the catalog by the builders in
      // `@/lib/seo/jsonLd`, never from user input, and is escaped above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
