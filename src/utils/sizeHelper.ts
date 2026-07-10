/**
 * Helper to sort sizes in standard order:
 * Niña/Niño (2-4, 6-8, 10-12, 14-16) -> Dama (S, M, L) -> Plus (XL, 2XL, 3XL)
 */

export const TALLAS_ORDENADAS = [
  '2', '4', '6', '8', '10', '12', '14', '16',
  '2-4', '6-8', '10-12', '14-16',
  'S', 'M', 'L',
  'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL'
];

export function sortSizeEntries(entries: [string, number][]): [string, number][] {
  return [...entries].sort(([tallaA], [tallaB]) => {
    const idxA = TALLAS_ORDENADAS.indexOf(tallaA.toUpperCase());
    const idxB = TALLAS_ORDENADAS.indexOf(tallaB.toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return tallaA.localeCompare(tallaB);
  });
}

export function getSortedTallasStr(tallasDetalle?: Record<string, number>, fallbackTalla: string = ''): string {
  if (!tallasDetalle || Object.keys(tallasDetalle).length === 0) {
    if (!fallbackTalla || fallbackTalla === 'N/A') return 'N/A';
    const pairs = fallbackTalla.split(',').map(s => s.trim()).filter(Boolean);
    const parsedDetalle: Record<string, number> = {};
    pairs.forEach(pair => {
      const parenMatch = pair.match(/^(.*?)\s*\((\d+)\)$/);
      if (parenMatch) {
        parsedDetalle[parenMatch[1].trim()] = parseInt(parenMatch[2], 10);
        return;
      }
      const hyphenMatch = pair.match(/^(.*?)-(\d+)$/);
      if (hyphenMatch) {
        parsedDetalle[hyphenMatch[1].trim()] = parseInt(hyphenMatch[2], 10);
        return;
      }
      parsedDetalle[pair] = 0;
    });
    return getSortedTallasStr(parsedDetalle);
  }

  const entries = Object.entries(tallasDetalle).filter(([_, q]) => q > 0);
  if (entries.length === 0) return 'N/A';

  const sorted = sortSizeEntries(entries);
  return sorted
    .map(([t, q]) => t === 'N/A' ? 'N/A' : `${t}-${q}`)
    .join(', ');
}
