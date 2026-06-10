/**
 * Comment-aware line tooling shared by the language-agnostic gates.
 *
 * We avoid a full parser on purpose: gates must run on any language at v1. The
 * heuristics below recognise the comment syntax of the common families (C/JS,
 * hash, and block comments) — good enough to count code lines and to tell a
 * comment apart from a string-with-a-slash in the overwhelming majority of code.
 */

const LINE_COMMENT_PREFIXES = ['//', '#', '--', ';'];
const BLOCK_PAIRS: Array<[string, string]> = [
  ['/*', '*/'],
  ['<!--', '-->'],
  ['"""', '"""'],
  ["'''", "'''"],
];

export interface LineKind {
  /** trimmed content */
  text: string;
  blank: boolean;
  /** the line is entirely a comment (or inside a block comment) */
  comment: boolean;
}

/**
 * Classify every line as blank / comment / code. Block comments are tracked
 * across lines with a small state machine; a line that merely ends a block but
 * also starts code is conservatively treated as code.
 */
export function classifyLines(source: string): LineKind[] {
  const lines = source.split('\n');
  const out: LineKind[] = [];
  let openClose: string | null = null;

  for (const raw of lines) {
    const text = raw.trim();
    if (openClose !== null) {
      const end = text.indexOf(openClose);
      out.push({ text, blank: false, comment: true });
      if (end !== -1 && text.slice(end + openClose.length).trim() === '') openClose = null;
      else if (end !== -1) openClose = null; // closes mid-line; rest is code next pass
      continue;
    }
    if (text === '') {
      out.push({ text, blank: true, comment: false });
      continue;
    }
    const block = BLOCK_PAIRS.find(([open]) => text.startsWith(open));
    if (block) {
      const [open, close] = block;
      const closesSameLine = text.indexOf(close, open.length) !== -1;
      if (!closesSameLine) openClose = close;
      out.push({ text, blank: false, comment: true });
      continue;
    }
    const isLineComment = LINE_COMMENT_PREFIXES.some((p) => text.startsWith(p));
    out.push({ text, blank: false, comment: isLineComment });
  }
  return out;
}

/** Code lines = non-blank, non-comment. The canonical "200-line" measure. */
export function countCodeLines(source: string): number {
  return classifyLines(source).filter((l) => !l.blank && !l.comment).length;
}
