import { useState } from 'react'
import {
  createListItemId,
  getDateForPlanDay,
  getWeekStart,
  MEAL_PLAN_DAYS,
  MEAL_TYPES,
  toLocalDateString,
} from '../planning'
import './MealPlanPage.css'

const DAILY_MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
]

function MealPlanPage({ recipes = [], mealPlan = [], setMealPlan, nutritionGoals = {} }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getWeekStart(new Date(), weekOffset)
  const weekDates = MEAL_PLAN_DAYS.map((day) => {
    const dateString = getDateForPlanDay(day, weekStart)
    const [year, month, date] = dateString.split('-').map(Number)
    return { day, dateString, date: new Date(year, month - 1, date) }
  })
  const weekEnd = weekDates[weekDates.length - 1].date
  const weekRange = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const formatDayDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
  const today = toLocalDateString(new Date())

  const updateMeal = (mealId, updates) => {
    setMealPlan((items) => items.map((item) => (
      item.id === mealId ? { ...item, ...updates } : item
    )))
  }

  const addMeal = (day, date) => {
    setMealPlan((items) => [...items, {
      id: createListItemId(),
      day,
      date,
      meal: 'Dinner',
      recipeId: '',
    }])
  }

  const removeMeal = (mealId) => {
    setMealPlan((items) => items.filter((item) => item.id !== mealId))
  }

  return (
    <div className="page-shell meal-plan-page">
      <div className="page-card">
        <p className="eyebrow">Meal plan</p>
        <div className="meal-plan-heading">
          <div>
            <h2>Weekly menu</h2>
            <p>Plan meals from your recipe library and change them any time.</p>
          </div>
          <div className="meal-plan-week-navigation" aria-label="Choose week">
            <button
              type="button"
              className="grocery-page-button"
              aria-label="Previous week"
              onClick={() => setWeekOffset((offset) => offset - 1)}
            >
              &lt;
            </button>
            <strong>
              {weekRange.format(weekStart)} – {weekRange.format(weekEnd)}
            </strong>
            <button
              type="button"
              className="grocery-page-button"
              aria-label="Next week"
              onClick={() => setWeekOffset((offset) => offset + 1)}
            >
              &gt;
            </button>
            {weekOffset !== 0 ? (
              <button type="button" className="grocery-page-button" onClick={() => setWeekOffset(0)}>
                This week
              </button>
            ) : null}
          </div>
        </div>
        <div className="plan-grid">
          {weekDates.map(({ day, dateString, date }) => {
            const dayMeals = mealPlan.filter((item) => (
              item.date ? item.date === dateString : (
                weekOffset === 0 && item.day === day
              )
            )).sort((first, second) => {
              const firstOrder = MEAL_TYPES.indexOf(first.meal)
              const secondOrder = MEAL_TYPES.indexOf(second.meal)
              return (firstOrder < 0 ? MEAL_TYPES.length : firstOrder)
                - (secondOrder < 0 ? MEAL_TYPES.length : secondOrder)
            })
            const plannedRecipes = dayMeals
              .map((item) => recipes.find((recipe) => recipe.id === item.recipeId))
              .filter(Boolean)

            return (
              <section key={day} className="plan-day">
                <div className="plan-day-heading">
                  <div>
                    <h3>{day}</h3>
                    <time dateTime={dateString} className={dateString === today ? 'plan-day-date today' : 'plan-day-date'}>
                      {formatDayDate.format(date)}{dateString === today ? ' · Today' : ''}
                    </time>
                  </div>
                  <button type="button" className="grocery-page-button" onClick={() => addMeal(day, dateString)}>Add meal</button>
                </div>
                {dayMeals.length ? (
                  <div className="plan-meal-list">
                    {dayMeals.map((item) => {
                      const plannedRecipe = recipes.find((recipe) => recipe.id === item.recipeId)
                      return (
                        <div className="plan-meal" key={item.id}>
                          {plannedRecipe ? (
                            <div className="plan-recipe-preview">
                              {plannedRecipe.image ? (
                                <img src={plannedRecipe.image} alt="" />
                              ) : (
                                <div className="plan-recipe-image-placeholder" aria-hidden="true">
                                  {plannedRecipe.name?.charAt(0) || '?'}
                                </div>
                              )}
                              <div className="plan-recipe-preview-copy">
                                <span>{item.meal === 'Snack' ? 'Snacks' : item.meal}</span>
                                <strong>{plannedRecipe.name || 'Untitled recipe'}</strong>
                              </div>
                            </div>
                          ) : null}
                          <label>
                            <span>Meal</span>
                            <select
                              aria-label={`${day} meal type`}
                              value={item.meal}
                              onChange={(event) => updateMeal(item.id, { meal: event.target.value })}
                            >
                              {MEAL_TYPES.map((meal) => (
                                <option key={meal} value={meal}>{meal === 'Snack' ? 'Snacks' : meal}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Recipe</span>
                            <select
                              aria-label={`${day} recipe`}
                              value={item.recipeId || ''}
                              onChange={(event) => updateMeal(item.id, { recipeId: event.target.value })}
                            >
                              <option value="">Choose a recipe</option>
                              {item.recipeId && !recipes.some((recipe) => recipe.id === item.recipeId) ? (
                                <option value={item.recipeId}>Recipe unavailable</option>
                              ) : null}
                              {recipes.map((recipe) => (
                                <option key={recipe.id} value={recipe.id}>{recipe.name || 'Untitled recipe'}</option>
                              ))}
                            </select>
                          </label>
                          <button
                            type="button"
                            className="grocery-page-button danger"
                            aria-label={`Remove ${day} ${item.meal}`}
                            onClick={() => removeMeal(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="plan-empty-day">No meals planned.</p>
                )}
                <section className="day-macro-summary" aria-label={`${day} macro totals`}>
                  <h4>Daily macro totals</h4>
                  <p className="day-macro-note">Based on recipe nutrition per serving.</p>
                  <div className="day-macro-grid">
                    {DAILY_MACROS.map(({ key, label }) => {
                      const enteredAmounts = plannedRecipes
                        .map((recipe) => recipe[key])
                        .filter((amount) => amount !== '' && amount != null && Number.isFinite(Number(amount)))
                      const total = enteredAmounts.reduce((sum, amount) => sum + Number(amount), 0)
                      const hasData = enteredAmounts.length > 0
                      const goal = Number(nutritionGoals[key])
                      const hasGoal = nutritionGoals[key] !== '' && Number.isFinite(goal) && goal > 0
                      const progress = hasData && hasGoal ? Math.min((total / goal) * 100, 100) : 0

                      return (
                        <div className="day-macro-item" key={key}>
                          <div className="day-macro-label">
                            <strong>{label}</strong>
                            <span>
                              {hasData
                                ? `${total.toLocaleString(undefined, { maximumFractionDigits: 1 })} g`
                                : 'No data'}
                              {hasGoal ? ` / ${goal.toLocaleString()} g` : ''}
                            </span>
                          </div>
                          {hasGoal ? (
                            <>
                              <div
                                className="day-macro-progress"
                                role="progressbar"
                                aria-label={`${day} ${label} goal`}
                                aria-valuemin="0"
                                aria-valuemax={goal}
                                aria-valuenow={hasData ? Math.min(total, goal) : 0}
                              >
                                <span style={{ width: `${progress}%` }} />
                              </div>
                              <small>
                                {hasData
                                  ? total >= goal
                                    ? 'Goal reached'
                                    : `${Math.round((total / goal) * 100)}% of goal`
                                  : 'Add recipe nutrition to compare'}
                              </small>
                            </>
                          ) : (
                            <small>{hasData ? 'Daily goal not set' : 'Add recipe nutrition'}</small>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {plannedRecipes.some((recipe) =>
                    DAILY_MACROS.some(({ key }) =>
                      recipe[key] === '' || recipe[key] == null || !Number.isFinite(Number(recipe[key])),
                    ),
                  ) ? (
                    <p className="day-macro-note">Some planned recipes are missing nutrition data, so totals may be incomplete.</p>
                  ) : null}
                </section>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MealPlanPage
