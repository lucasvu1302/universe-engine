/**
 * Accent-insensitive Vietnamese & Latin text normalizer.
 * Lives in a tiny eager-safe i18n utility so SuperNav, ObservatoryMegaHub, and CommandPalette
 * never pull in lazy cosmic-lab physics bundles.
 */
export function normalizeViText(input: string): string {
  if (!input) return '';
  return input
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
