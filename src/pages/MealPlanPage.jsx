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
  const [selectedDate, setSelectedDate] = useState('')
  const [pendingMealSortDate, setPendingMealSortDate] = useState('')
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
  const selectedDay = weekDates.find(({ dateString }) => dateString === selectedDate)

  const getDayMeals = (day, dateString) => {
    const dayMeals = mealPlan.filter((item) => (
      item.date ? item.date === dateString : (
        weekOffset === 0 && item.day === day
      )
    ))

    if (pendingMealSortDate === dateString) return dayMeals

    return dayMeals.sort((first, second) => {
      const firstOrder = MEAL_TYPES.indexOf(first.meal)
      const secondOrder = MEAL_TYPES.indexOf(second.meal)
      return (firstOrder < 0 ? MEAL_TYPES.length : firstOrder)
        - (secondOrder < 0 ? MEAL_TYPES.length : secondOrder)
    })
  }

  const getPlannedRecipes = (dayMeals) => dayMeals
    .map((item) => recipes.find((recipe) => recipe.id === item.recipeId))
    .filter(Boolean)

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
    setPendingMealSortDate('')
    setMealPlan((items) => items.filter((item) => item.id !== mealId))
  }

  const renderMacroSummary = (day, plannedRecipes, detailed = false) => (
    <section className={detailed ? 'day-macro-summary detailed' : 'day-macro-summary'} aria-label={`${day} macro totals`}>
      <h4>Daily macro totals</h4>
      {detailed ? <p className="day-macro-note">Based on recipe nutrition per serving.</p> : null}
      <div className={detailed ? 'day-macro-grid' : 'day-macro-compact-grid'}>
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
            <div className={detailed ? 'day-macro-item' : 'day-macro-compact-item'} key={key}>
              <div className="day-macro-label">
                <strong>{label}</strong>
                <span>
                  {hasData
                    ? `${total.toLocaleString(undefined, { maximumFractionDigits: 1 })} g`
                    : '—'}
                  {detailed && hasGoal ? ` / ${goal.toLocaleString()} g` : ''}
                </span>
              </div>
              {detailed && hasGoal ? (
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
              ) : null}
              {detailed && !hasGoal ? (
                <small>{hasData ? 'Daily goal not set' : 'Add recipe nutrition'}</small>
              ) : null}
            </div>
          )
        })}
      </div>
      {detailed && plannedRecipes.some((recipe) =>
        DAILY_MACROS.some(({ key }) =>
          recipe[key] === '' || recipe[key] == null || !Number.isFinite(Number(recipe[key])),
        ),
      ) ? (
        <p className="day-macro-note">Some planned recipes are missing nutrition data, so totals may be incomplete.</p>
      ) : null}
    </section>
  )

  return (
    <div className="page-shell meal-plan-page">
      <div className="page-card">
        <p className="eyebrow">Meal plan</p>
        <div className="meal-plan-heading">
          <div>
            <h2>{selectedDay ? `${selectedDay.day} meal plan` : 'Weekly menu'}</h2>
            <p>{selectedDay ? 'Manage meals and view nutrition for this day.' : 'A simple look at what you are eating this week.'}</p>
          </div>
          <div className="meal-plan-week-navigation" aria-label="Choose week">
            {selectedDay ? (
              <button type="button" className="grocery-page-button" onClick={() => setSelectedDate('')}>
                Back to week
              </button>
            ) : null}
            <button
              type="button"
              className="grocery-page-button"
              aria-label="Previous week"
              onClick={() => {
                setSelectedDate('')
                setWeekOffset((offset) => offset - 1)
              }}
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
              onClick={() => {
                setSelectedDate('')
                setWeekOffset((offset) => offset + 1)
              }}
            >
              &gt;
            </button>
            {weekOffset !== 0 ? (
              <button
                type="button"
                className="grocery-page-button"
                onClick={() => {
                  setSelectedDate('')
                  setWeekOffset(0)
                }}
              >
                This week
              </button>
            ) : null}
          </div>
        </div>
        {selectedDay ? (() => {
          const dayMeals = getDayMeals(selectedDay.day, selectedDay.dateString)
          const plannedRecipes = getPlannedRecipes(dayMeals)

          return (
            <section className="plan-day-detail">
              <div className="plan-day-heading">
                <div>
                  <h3>{selectedDay.day}</h3>
                  <time
                    dateTime={selectedDay.dateString}
                    className={selectedDay.dateString === today ? 'plan-day-date today' : 'plan-day-date'}
                  >
                    {formatDayDate.format(selectedDay.date)}{selectedDay.dateString === today ? ' · Today' : ''}
                  </time>
                </div>
                <button
                  type="button"
                  className="grocery-page-button"
                  onClick={() => addMeal(selectedDay.day, selectedDay.dateString)}
                >
                  Add meal
                </button>
              </div>
              {dayMeals.length ? (
                <div className="plan-meal-list">
                  {dayMeals.map((item) => (
                    <div
                      className="plan-meal"
                      key={item.id}
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setPendingMealSortDate('')
                        }
                      }}
                    >
                      {recipes.find((recipe) => recipe.id === item.recipeId) ? (
                        <div className="plan-recipe-preview">
                          {recipes.find((recipe) => recipe.id === item.recipeId).image ? (
                            <img
                              src={recipes.find((recipe) => recipe.id === item.recipeId).image}
                              alt=""
                            />
                          ) : (
                            <div className="plan-recipe-image-placeholder" aria-hidden="true">
                              {recipes.find((recipe) => recipe.id === item.recipeId).name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="plan-recipe-preview-copy">
                            <span>{item.meal}</span>
                            <strong>{recipes.find((recipe) => recipe.id === item.recipeId).name || 'Untitled recipe'}</strong>
                          </div>
                        </div>
                      ) : null}
                      <label>
                        <span>Meal</span>
                        <select
                          aria-label={`${selectedDay.day} meal type`}
                          value={item.meal}
                          onChange={(event) => {
                            setPendingMealSortDate(selectedDay.dateString)
                            updateMeal(item.id, { meal: event.target.value })
                          }}
                        >
                          {MEAL_TYPES.map((meal) => (
                            <option key={meal} value={meal}>{meal}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span>Recipe</span>
                        <select
                          aria-label={`${selectedDay.day} recipe`}
                          value={item.recipeId || ''}
                          onChange={(event) => {
                            setPendingMealSortDate(selectedDay.dateString)
                            updateMeal(item.id, { recipeId: event.target.value })
                          }}
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
                        aria-label={`Remove ${selectedDay.day} ${item.meal}`}
                        onClick={() => removeMeal(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="plan-empty-day">No meals planned.</p>
              )}
              {renderMacroSummary(selectedDay.day, plannedRecipes, true)}
            </section>
          )
        })() : (
          <div className="plan-grid">
            {weekDates.map(({ day, dateString, date }) => {
              const dayMeals = getDayMeals(day, dateString)
              const plannedRecipes = getPlannedRecipes(dayMeals)

              return (
                <article
                  key={day}
                  className="plan-day-card"
                  aria-label={`Open ${day} meal plan`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDate(dateString)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedDate(dateString)
                    }
                  }}
                >
                  <span className="plan-day-heading">
                    <span>
                      <strong className="plan-day-title">{day}</strong>
                      <time
                        dateTime={dateString}
                        className={dateString === today ? 'plan-day-date today' : 'plan-day-date'}
                      >
                        {formatDayDate.format(date)}{dateString === today ? ' · Today' : ''}
                      </time>
                    </span>
                    <span className="plan-day-open-indicator" aria-hidden="true">View day →</span>
                  </span>
                  {dayMeals.length ? (
                    <span className="plan-week-meal-list">
                      {dayMeals.map((item) => {
                        const plannedRecipe = recipes.find((recipe) => recipe.id === item.recipeId)
                        return (
                          <span className="plan-week-meal" key={item.id}>
                            {plannedRecipe?.image ? (
                              <img src={plannedRecipe.image} alt="" />
                            ) : (
                              <span className="plan-week-meal-placeholder" aria-hidden="true">
                                {plannedRecipe?.name?.charAt(0) || '+'}
                              </span>
                            )}
                            <span className="plan-week-meal-copy">
                              <span className="plan-week-meal-type">{item.meal === 'Snack' ? 'Snack' : item.meal}</span>
                              <strong>{plannedRecipe?.name || 'Choose a recipe'}</strong>
                            </span>
                          </span>
                        )
                      })}
                    </span>
                  ) : (
                    <span className="plan-week-empty">No meals planned</span>
                  )}
                  {renderMacroSummary(day, plannedRecipes)}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MealPlanPage
