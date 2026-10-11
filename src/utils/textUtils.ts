/**
 * Utility functions for HTML entity decoding and structured terms/description formatting
 */

export function decodeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&amp;|&#38;/gi, '&')
    .replace(/&lt;|&#60;/gi, '<')
    .replace(/&gt;|&#62;/gi, '>')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&rlm;|&lrm;/gi, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Parses raw terms of use or descriptions into clean bullet points
 * Splits on newlines, bullet symbols (-, •, *), but preserves phone numbers and ranges (e.g. 08-6372088)
 */
export function parseTermsBullets(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const clean = decodeHtml(raw);
  if (!clean) return [];

  // Split on newlines first
  const rawSections = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const items: string[] = [];

  for (const section of rawSections) {
    // If section contains bullets like "- item - item" or "• item • item"
    // Match dash/bullet preceded by whitespace (or start) and followed by non-digit non-space
    if (/(?:^|\s+)[-•*]\s*(?=[^\d\s])/.test(section)) {
      const parts = section.split(/(?:^|\s+)[-•*]\s*(?=[^\d\s])/).map(p => p.trim()).filter(Boolean);
      items.push(...parts);
    } else {
      items.push(section);
    }
  }

  return items
    .map(s => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}
