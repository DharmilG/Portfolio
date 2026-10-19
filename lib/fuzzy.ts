// lib/fuzzy.ts — fuzzy matcher for the Command Palette (Ctrl+P / Ctrl+Shift+P).
// Pure + dependency-free (dumb-depth: components compute, the store
// orchestrates). VS Code-style scoring on a budget — case-insensitive
// subsequence with the signals that matter for file/command lists:
//   - per-char base 1; bonuses: first char 10, after ./_/-/\<space> 8,
//     camel-case boundary 7, consecutive run 5, first-match earliness up to 6
//   - whole-query prefix +12, long-target penalty -0.05/char (keeps a basename
//     hit above the same chars buried inside a deep path)
//   - whitespace splits the query into AND terms (each must match)
// Returns merged match indices (ascending) so callers can highlight.

export type FuzzyMatch = { score: number; indices: number[] };

const SEPARATOR = /[/\\.\-_ ]/;
const LOWER = /[a-z0-9]/;

function matchTerm(term: string, text: string): FuzzyMatch | null {
  const t = text.toLowerCase();
  let score = 0;
  let last = -2;
  let from = 0;
  const indices: number[] = [];
  for (const ch of term) {
    const hit = t.indexOf(ch, from);
    if (hit < 0) return null;
    let s = 1;
    if (hit === 0) s += 10;
    else if (SEPARATOR.test(text[hit - 1])) s += 8;
    else if (/[A-Z]/.test(text[hit]) && LOWER.test(text[hit - 1])) s += 7;
    if (hit === last + 1) s += 5;
    score += s;
    indices.push(hit);
    last = hit;
    from = hit + 1;
  }
  return { score, indices };
}

// null = no match. Empty/whitespace-only query matches everything at 0.
export function fuzzyScore(query: string, text: string): FuzzyMatch | null {
  const q = query.trim().toLowerCase();
  if (q === "") return { score: 0, indices: [] };
  const terms = q.split(/\s+/);
  const indices: number[] = [];
  let score = 0;
  for (const term of terms) {
    const m = matchTerm(term, text);
    if (!m) return null;
    score += m.score;
    indices.push(...m.indices);
  }
  indices.sort((a, b) => a - b);
  if (text.toLowerCase().startsWith(terms[0])) score += 12;
  score += Math.max(0, 6 - indices[0]);
  score -= text.length * 0.05;
  return { score, indices };
}
