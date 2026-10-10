export function normalizeHebrew(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
    .replace(/["'״׳\-–_.,()/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
