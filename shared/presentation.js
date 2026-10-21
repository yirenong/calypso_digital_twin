// Clean legacy fixture labels without changing identifiers, stored records or links.
export function websiteText(value) {
  return value.replace(/\bDemo tenant\b/g, 'Tenant').replace(/\bDemo office building\b/g, 'Office building')
    .replace(/\bDEMO-ACMV\b/g, 'ACMV').replace(/\bdemonstration\b/gi, 'sample').replace(/\bdemo\b/gi, 'sample')
}
const displayKeys = new Set(['name', 'building', 'dataMode', 'note', 'detail', 'target', 'methodology', 'contract', 'description'])
export function presentationData(value, key = '') {
  if (typeof value === 'string') return displayKeys.has(key) ? websiteText(value) : value
  if (Array.isArray(value)) return value.map(item => presentationData(item, key))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, presentationData(item, name)]))
  return value
}
