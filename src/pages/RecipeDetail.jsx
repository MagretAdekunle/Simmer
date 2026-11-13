// Selected-recipe presentation and cooking controls; RecipesPage coordinates selection and navigation.
import { useEffect, useState } from 'react'
import { BackButton, CancelButton, DeleteIconButton, EditIconButton } from '../ActionButtons'
import confirmDeletion from '../confirmDeletion'
import CookingMode from './CookingMode'
import { MEAL_PLAN_DAYS, MEAL_TYPES } from '../planning'
import { convertIngredient } from './recipeMeasurements'
import { normalizeNameList, recipeMacros } from './recipePageUtils'

function RecipeDetail({
  recipe,
  nutritionGoals,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onUpdateRecipeTags,
  onUpdateRecipeStatus,
  onSaveCookingNotes,
  onAddToGroceries,
  onAddToMealPlan,
}) {
  const baseServings = Math.max(1, Number(recipe.servings) || 1)
  const [isCooking, setIsCooking] = useState(false)
  const [showMealPlanPicker, setShowMealPlanPicker] = useState(false)
  const [mealPlanDay, setMealPlanDay] = useState(MEAL_PLAN_DAYS[0])
  const [mealPlanType, setMealPlanType] = useState('Dinner')
  const [actionMessage, setActionMessage] = useState('')
  const [checkedIngredients, setCheckedIngredients] = useState([])
  const [servings, setServings] = useState(baseServings)
  const [measurementSystem, setMeasurementSystem] = useState('original')
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    setIsCooking(false)
    setShowMealPlanPicker(false)
    setActionMessage('')
    setCheckedIngredients([])
    setServings(baseServings)
    setMeasurementSystem('original')
    setNewTag('')
  }, [recipe.id])

  if (isCooking) {
    return (
      <CookingMode
        recipe={recipe}
        onClose={() => setIsCooking(false)}
        onSaveNotes={(notes, substitutions) => onSaveCookingNotes(recipe.id, notes, substitutions)}
        initialServings={servings}
        initialMeasurementSystem={measurementSystem}
      />
    )
  }

  const collections = normalizeNameList(recipe.collections)
  const tags = normalizeNameList(recipe.tags)
  const substitutions = normalizeNameList(recipe.substitutions)
  const addTag = (event) => {
    event.preventDefault()
    const tag = newTag.trim()
    if (!tag || tags.some((existingTag) => existingTag.toLocaleLowerCase() === tag.toLocaleLowerCase())) return
    onUpdateRecipeTags(recipe.id, [...tags, tag])
    setNewTag('')
  }

  return (
    <article className="recipe-detail recipe-detail-page">
      <div className="recipe-detail-header">
        <div>
          <p className="eyebrow">Recipe</p>
          <h2>{recipe.name}</h2>
        </div>
        <div className="recipe-detail-actions">
          <BackButton iconOnly className="recipe-detail-icon-button" aria-label="Back to recipes" title="Back to recipes" onClick={onClose} />
          <button
            type="button"
            className={`secondary-button recipe-detail-icon-button${recipe.favorite ? ' active' : ''}`}
            aria-label={recipe.favorite ? 'Remove from favorites' : 'Add to favorites'}
            title={recipe.favorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={() => onToggleFavorite(recipe.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
            </svg>
          </button>
          <EditIconButton label={`Edit ${recipe.name || 'recipe'}`} onClick={onEdit} />
          <DeleteIconButton label={`Delete ${recipe.name || 'recipe'}`} onClick={() => onDelete(recipe.id)} />
        </div>
      </div>

      {recipe.image ? <img className="recipe-image" src={recipe.image} alt={recipe.name} /> : null}
      {recipe.description ? <p className="recipe-description">{recipe.description}</p> : null}

      <div className="recipe-meta">
        <span>{servings} servings</span>
        <span>Prep {recipe.prepTime} min</span>
        <span>Cook {recipe.cookTime} min</span>
        <span>Total {Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0)} min</span>
      </div>

      <section className="recipe-status-panel" aria-label="Recipe cooking status and rating">
        <button
          type="button"
          className={recipe.cooked ? 'recipe-cooked-toggle active' : 'recipe-cooked-toggle'}
          role="switch"
          aria-checked={Boolean(recipe.cooked)}
          onClick={() => onUpdateRecipeStatus(recipe.id, { cooked: !recipe.cooked })}
        >
          <span className="recipe-cooked-check" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
          </span>
          <span>{recipe.cooked ? 'Marked as cooked' : 'Mark as cooked'}</span>
        </button>

        <fieldset className="recipe-detail-rating">
          <legend>Your rating</legend>
          <div className="recipe-rating-control" role="group" aria-label="Rate this recipe">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                type="button"
                key={rating}
                className={Number(recipe.rating || 0) >= rating ? 'rating-star selected' : 'rating-star'}
                aria-label={`Rate ${rating} out of 5`}
                aria-pressed={Number(recipe.rating || 0) === rating}
                onClick={() => onUpdateRecipeStatus(recipe.id, { rating })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
                </svg>
              </button>
            ))}
            {Number(recipe.rating || 0) > 0 ? (
              <button
                type="button"
                className="rating-clear"
                onClick={() => onUpdateRecipeStatus(recipe.id, { rating: 0 })}
              >
                Clear
              </button>
            ) : null}
          </div>
          <span className="rating-help">
            {Number(recipe.rating || 0) > 0
              ? `${Number(recipe.rating).toFixed(0)} out of 5`
              : 'Tap a star to rate this recipe'}
          </span>
        </fieldset>
      </section>

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
          <CancelButton onClick={() => setShowMealPlanPicker(false)} />
        </form>
      ) : null}
      {actionMessage ? <p className="recipe-action-message" role="status">{actionMessage}</p> : null}

      {collections.length ? (
        <div className="recipe-taxonomy">
          {collections.map((collection) => (
            <span className="recipe-collection-pill" key={`collection-${collection}`}>{collection}</span>
          ))}
        </div>
      ) : null}

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

      <section className="recipe-measurement-panel" aria-label="Adjust recipe measurements">
        <div className="recipe-measurement-controls">
          <label>
            <span>Servings</span>
            <div className="recipe-serving-control">
              <button
                type="button"
                aria-label="Decrease servings"
                disabled={servings <= 1}
                onClick={() => setServings((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                step="1"
                aria-label="Recipe servings"
                value={servings}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (Number.isInteger(value) && value > 0) setServings(value)
                }}
              />
              <button
                type="button"
                aria-label="Increase servings"
                onClick={() => setServings((value) => value + 1)}
              >
                +
              </button>
            </div>
          </label>
          <label>
            <span>Measurements</span>
            <select
              value={measurementSystem}
              onChange={(event) => setMeasurementSystem(event.target.value)}
            >
              <option value="original">Original</option>
              <option value="us">US</option>
              <option value="metric">Metric</option>
            </select>
          </label>
        </div>
        <p className="recipe-serving-scale-note">Scaled from {baseServings} original serving{baseServings === 1 ? '' : 's'}.</p>
      </section>

      <div className="detail-sections recipe-instructions-sections">
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
                  <span>{convertIngredient(String(ingredient), baseServings, servings, measurementSystem)}</span>
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

      <section className="recipe-tags-editor">
        <div>
          <h3>Tags</h3>
          <p>Use tags to organize and filter this recipe.</p>
        </div>
        <div className="recipe-tags-list" aria-label="Recipe tags">
          {tags.map((tag) => (
            <button
              type="button"
              className="recipe-tag-pill"
              key={`tag-${tag}`}
              aria-label={`Remove tag ${tag}`}
              onClick={() => {
                if (confirmDeletion(`the "${tag}" tag`)) {
                  onUpdateRecipeTags(recipe.id, tags.filter((existingTag) => existingTag !== tag))
                }
              }}
            >
              {tag}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
              </svg>
            </button>
          ))}
          {!tags.length ? <span className="recipe-tags-empty">No tags added yet.</span> : null}
        </div>
        <form className="recipe-tag-add-form" onSubmit={addTag}>
          <label className="sr-only" htmlFor="recipe-tag-input">Add a tag</label>
          <input
            id="recipe-tag-input"
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            placeholder="e.g. Quick, Vegetarian"
          />
          <button type="submit" className="secondary-button" disabled={!newTag.trim()}>
            Add tag
          </button>
        </form>
      </section>
    </article>
  )
}

export default RecipeDetail
