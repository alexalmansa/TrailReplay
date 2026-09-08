/**
 * Text layout for the annotation card.
 *
 * Pure and separate from the drawing so it can be tested without a canvas, and
 * so there is one implementation rather than a copy in a test that drifts.
 *
 * The card used to be a fixed width with everything past it replaced by an
 * ellipsis. That works for a title someone types into a box while watching it
 * fit, and fails for one taken from a source: "Avituallament 1 — Collet de
 * Barraques" and its list of contents both collapsed to "…", which is how an
 * annotation ends up in exactly the right place and still unreadable.
 */

/** Just enough of a canvas context to measure text. */
export interface TextMeasurer {
  measureText: (text: string) => { width: number };
}

/** Trim to fit, with an ellipsis. The last resort, not the first. */
export function fitText(measurer: TextMeasurer, text: string, maxWidth: number): string {
  if (measurer.measureText(text).width <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 0 && measurer.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}…`;
}

/**
 * Break text across at most `maxLines`, on word boundaries.
 *
 * Only the final line is ever ellipsised, and only once the line budget is
 * spent, so a long title loses its tail rather than everything after the first
 * few words. A single word too wide to fit is kept whole on its own line: an
 * unbreakable word trimmed to "Super…" says less than one that overflows.
 */
export function wrapText(
  measurer: TextMeasurer,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  if (maxLines <= 1) return [fitText(measurer, text, maxWidth)];
  if (measurer.measureText(text).width <= maxWidth) return [text];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (let index = 0; index < words.length; index += 1) {
    const candidate = line ? `${line} ${words[index]}` : words[index];

    if (measurer.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }

    lines.push(line);
    line = words[index];

    // On the last line the remaining words go in together and are trimmed as a
    // unit, so the ellipsis lands at the end of the text rather than mid-title.
    if (lines.length === maxLines - 1) {
      line = words.slice(index).join(' ');
      break;
    }
  }

  lines.push(lines.length === maxLines - 1 ? fitText(measurer, line, maxWidth) : line);
  return lines;
}
