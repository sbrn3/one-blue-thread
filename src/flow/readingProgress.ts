/**
 * Whether today's Scripture is wholly on screen without scrolling — its
 * bottom edge (in scroll-content coordinates) within the first viewport.
 *
 * "Read to the end" is normally detected from scroll events, but a short
 * sitting on a tall screen never scrolls, so no event would ever fire and the
 * seal would stay locked. When this is true, Flow treats the reading as
 * started and its end as reached. Zero heights mean "not laid out yet".
 */
export function scriptureFitsOnScreen(scriptureBottom: number, viewportHeight: number): boolean {
  if (scriptureBottom <= 0 || viewportHeight <= 0) return false;
  return scriptureBottom <= viewportHeight;
}
