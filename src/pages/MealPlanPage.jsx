import './MealPlanPage.css'

// This page turns the saved recipes into a simple weekly meal schedule.
// If you want to change the plan logic, edit the mealPlan array below.
function MealPlanPage({ recipes = [] }) {
  // Favorited recipes are used first so the most-loved meals show up in the plan.
  const favoriteRecipes = recipes.filter((recipe) => recipe.favorite)

  // Build a simple week layout using the first available recipes.
  // You can extend this array to add more days or different scheduling rules.
  const mealPlan = [
    { day: 'Monday', recipe: favoriteRecipes[0] || recipes[0] || null },
    { day: 'Tuesday', recipe: favoriteRecipes[1] || recipes[1] || null },
    { day: 'Wednesday', recipe: favoriteRecipes[2] || recipes[2] || null },
    { day: 'Thursday', recipe: favoriteRecipes[3] || recipes[3] || null },
    { day: 'Friday', recipe: favoriteRecipes[4] || recipes[4] || null },
    { day: 'Saturday', recipe: favoriteRecipes[5] || recipes[5] || null },
    { day: 'Sunday', recipe: favoriteRecipes[6] || recipes[6] || null },
  ]

  return (
    <div className="page-shell meal-plan-page">
      <div className="page-card">
        <p className="eyebrow">Meal plan</p>
        <h2>Weekly menu</h2>
        <div className="plan-grid">
          {mealPlan.map(({ day, recipe }) => (
            <div key={day} className="plan-day">
              <h3>{day}</h3>
              <p>{recipe ? recipe.name : 'Open a recipe slot'}</p>
              {recipe ? <span>{recipe.collections?.join(' • ') || 'Saved recipe'}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MealPlanPage
