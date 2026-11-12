export const MEAL_PLAN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export const toLocalDateString = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getWeekStart = (date = new Date(), weekOffset = 0) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysSinceMonday = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - daysSinceMonday + weekOffset * 7)
  return monday
}

export const getDateForPlanDay = (day, weekStart) => {
  const dayIndex = MEAL_PLAN_DAYS.indexOf(day)
  if (dayIndex < 0) return null
  const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + dayIndex)
  return toLocalDateString(date)
}

export const createListItemId = () =>
  globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`
