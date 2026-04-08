/**
 * Text utility functions.
 */

export function splitIntoLines(text, maxChars = 38) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
