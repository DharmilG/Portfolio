// lib/readme.ts — turn a README into the one-line project description the
// Explorer tooltip and the status-bar picker show (DOC/05 §5). Pure: no
// React, no store.

const MAX_DESCRIPTION = 280;

/**
 * First real paragraph of a README: headings, badges, HTML, images, code
 * fences and lists are skipped; the paragraph stops at the first blank line.
 */
export function readmeDescription(markdown: string): string {
  const lines = markdown.split("\n");
  const paragraph: string[] = [];
  let inFence = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("```") || line.startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!line) {
      // The first blank line ends the opening paragraph.
      if (paragraph.length > 0) break;
      continue;
    }
    if (line.startsWith("#")) continue; // heading
    if (line.startsWith("<")) continue; // html / badge
    if (line.startsWith("![")) continue; // image
    if (line.startsWith("[![")) continue; // badge
    if (/^[-*+]\s/.test(line)) continue; // list
    if (/^\d+\.\s/.test(line)) continue; // ordered list
    if (line.startsWith("|")) continue; // table
    if (/^={3,}$/.test(line)) continue; // setext rule
    paragraph.push(line);
  }

  const text = paragraph.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= MAX_DESCRIPTION) return text;
  return `${text.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
}
