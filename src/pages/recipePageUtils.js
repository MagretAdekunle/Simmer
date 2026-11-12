// Shared formatting helpers and macro labels for the recipe editor and detail view.
export const recipeMacros = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
]

export const normalizeRecipeUrl = (value) => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export const normalizeNameList = (value) =>
  (Array.isArray(value) ? value : String(value || '').split(/[\n,]+/))
    .map((item) => String(item).trim())
    .filter(Boolean)

export const parseCookbookList = (value) => {
  if (!value) return ['Uncategorized']

  return [...new Set(
    String(value)
      .split(/[\n,]+/)
      .map((cookbookName) => cookbookName.trim())
      .filter(Boolean),
  )]
}
