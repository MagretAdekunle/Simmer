// Selected-recipe presentation and cooking controls; RecipesPage coordinates selection and navigation.
import { useEffect, useState } from 'react'
import CookingMode from './CookingMode'
import { MEAL_PLAN_DAYS, MEAL_TYPES } from '../planning'
import { normalizeNameList, normalizeRecipeUrl, recipeMacros } from './recipePageUtils'

function RecipeDetail({
  recipe,
  nutritionGoals,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSaveCookingNotes,
  onAddToGroceries,
  onAddToMealPlan,
}) {
  const [isCooking, setIsCooking] = useState(false)
  const [showMealPlanPicker, setShowMealPlanPicker] = useState(false)
  const [mealPlanDay, setMealPlanDay] = useState(MEAL_PLAN_DAYS[0])
  const [mealPlanType, setMealPlanType] = useState('Dinner')
  const [actionMessage, setActionMessage] = useState('')
  const [checkedIngredients, setCheckedIngredients] = useState([])

  useEffect(() => {
    setIsCooking(false)
    setShowMealPlanPicker(false)
    setActionMessage('')
    setCheckedIngredients([])
  }, [recipe.id])

  if (isCooking) {
    return (
      <CookingMode
        recipe={recipe}
        onClose={() => setIsCooking(false)}
        onSaveNotes={(notes, substitutions) => onSaveCookingNotes(recipe.id, notes, substitutions)}
      />
    )
  }

  const collections = normalizeNameList(recipe.collections)
  const tags = normalizeNameList(recipe.tags)
  const substitutions = normalizeNameList(recipe.substitutions)
  const sourceUrl = normalizeRecipeUrl(recipe.sourceLink || '')

  return (
    <article className="recipe-detail recipe-detail-page">
      <div className="recipe-detail-header">
        <div>
          <p className="eyebrow">Recipe</p>
          <h2>{recipe.name}</h2>
        </div>
        <div className="recipe-detail-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Back</button>
          <button type="button" className="secondary-button" onClick={() => onToggleFavorite(recipe.id)}>
            {recipe.favorite ? 'Unfavorite' : 'Favorite'}
          </button>
          <button type="button" className="secondary-button" onClick={onEdit}>Edit</button>
          <button type="button" className="danger-button" onClick={() => onDelete(recipe.id)}>Delete</button>
        </div>
      </div>

      {recipe.image ? <img className="recipe-image" src={recipe.image} alt={recipe.name} /> : null}
      {recipe.description ? <p className="recipe-description">{recipe.description}</p> : null}

      <div className="recipe-meta">
        <span>{recipe.servings} servings</span>
        <span>Prep {recipe.prepTime} min</span>
        <span>Cook {recipe.cookTime} min</span>
        <span>Total {Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0)} min</span>
        <span>{recipe.cooked ? 'Cooked' : 'Not cooked'}</span>
        <span>{Number(recipe.rating || 0) > 0 ? `Rating ${Number(recipe.rating).toFixed(1)} / 5` : 'Unrated'}</span>
        <span>{recipe.cookbook || 'Uncategorized'}</span>
      </div>

      <div className="recipe-planning-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setActionMessage(onAddToGroceries(recipe))}
        >
          Add to Groceries
        </button>
        <button
          type="button"
          className="secondary-button"
          aria-expanded={showMealPlanPicker}
          onClick={() => {
            setShowMealPlanPicker((current) => !current)
            setActionMessage('')
          }}
        >
          Add to Meal Plan
        </button>
      </div>

      {showMealPlanPicker ? (
        <form
          className="recipe-plan-picker"
          onSubmit={(event) => {
            event.preventDefault()
            onAddToMealPlan(recipe.id, mealPlanDay, mealPlanType)
            setShowMealPlanPicker(false)
            setActionMessage(`${recipe.name} added to ${mealPlanDay} ${mealPlanType}.`)
          }}
        >
          <label>
            <span>Day</span>
            <select value={mealPlanDay} onChange={(event) => setMealPlanDay(event.target.value)}>
              {MEAL_PLAN_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
          <label>
            <span>Meal</span>
            <select value={mealPlanType} onChange={(event) => setMealPlanType(event.target.value)}>
              {MEAL_TYPES.map((meal) => <option key={meal} value={meal}>{meal}</option>)}
            </select>
          </label>
          <button type="submit" className="primary-button">Add meal</button>
          <button type="button" className="secondary-button" onClick={() => setShowMealPlanPicker(false)}>
            Cancel
          </button>
        </form>
      ) : null}
      {actionMessage ? <p className="recipe-action-message" role="status">{actionMessage}</p> : null}

      {(collections.length || tags.length) ? (
        <div className="recipe-taxonomy">
          {collections.map((collection) => (
            <span className="recipe-collection-pill" key={`collection-${collection}`}>{collection}</span>
          ))}
          {tags.map((tag) => <span className="recipe-tag-pill" key={`tag-${tag}`}>{tag}</span>)}
        </div>
      ) : null}

      {sourceUrl ? (
        <a className="recipe-source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">
          View original recipe
        </a>
      ) : null}

      <section className="nutrition-comparison">
        <div>
          <h3>Nutrition per serving</h3>
          <p>Compare one serving with your daily goals from your profile.</p>
        </div>
        <div className="nutrition-comparison-grid">
          {recipeMacros.map(({ key, label }) => {
            const amount = recipe[key]
            const hasAmount = amount !== '' && amount != null && Number.isFinite(Number(amount))
            const target = Number(nutritionGoals[key])
            const hasTarget = nutritionGoals[key] !== '' && Number.isFinite(target) && target > 0
            const remaining = hasAmount && hasTarget ? target - Number(amount) : null

            return (
              <div className="nutrition-comparison-item" key={key}>
                <strong>{label}</strong>
                <span>{hasAmount ? `${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 1 })} g` : 'Not entered'}</span>
                <small>
                  {hasAmount && hasTarget
                    ? `${Math.round((Number(amount) / target) * 100)}% of daily goal · ${
                      remaining >= 0
                        ? `${remaining.toLocaleString(undefined, { maximumFractionDigits: 1 })} g remaining`
                        : `${Math.abs(remaining).toLocaleString(undefined, { maximumFractionDigits: 1 })} g over goal`
                    }`
                    : hasAmount
                      ? 'Set a daily target on your profile to compare.'
                      : 'Add this value when editing the recipe.'}
                </small>
              </div>
            )
          })}
        </div>
      </section>

      {recipe.cookbookComment ? (
        <div className="detail-sections">
          <section>
            <h3>Cookbook note</h3>
            <p>{recipe.cookbookComment}</p>
          </section>
        </div>
      ) : null}

      {recipe.notes ? (
        <div className="detail-sections">
          <section>
            <h3>Notes</h3>
            <p>{recipe.notes}</p>
          </section>
        </div>
      ) : null}

      {substitutions.length ? (
        <div className="detail-sections">
          <section>
            <h3>Substitutions</h3>
            <ul>{substitutions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
          </section>
        </div>
      ) : null}

      <div className="detail-sections">
        <section>
          <h3>Ingredients</h3>
          <ul className="recipe-ingredient-checklist">
            {(recipe.ingredients || []).map((ingredient, index) => (
              <li key={`${index}-${ingredient}`} className={checkedIngredients.includes(index) ? 'checked' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={checkedIngredients.includes(index)}
                    onChange={() => setCheckedIngredients((current) => (
                      current.includes(index)
                        ? current.filter((checkedIndex) => checkedIndex !== index)
                        : [...current, index]
                    ))}
                    aria-label={`Mark ${ingredient} as prepared`}
                  />
                  <span>{ingredient}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="instructions-heading">
            <h3>Instructions</h3>
            <button type="button" className="primary-button" onClick={() => setIsCooking(true)}>
              Start cooking
            </button>
          </div>
          <ol>{(recipe.instructions || []).map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}</ol>
        </section>
      </div>
    </article>
  )
}

export default RecipeDetail
