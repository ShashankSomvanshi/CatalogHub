export function matchesTableSearch(values, searchTerm) {
  const terms = String(searchTerm || '')
    .toLowerCase()
    .match(/"[^"]+"|\S+/g)
    ?.map((term) => term.replace(/^"|"$/g, '')) || []

  if (terms.length === 0) return true

  const searchableValues = values.map((value) => String(value ?? '').toLowerCase())
  return terms.every((term) => searchableValues.some((value) => value.includes(term)))
}
