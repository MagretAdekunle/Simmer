import { useEffect, useState } from 'react'
import './ProfilePage.css'

const goalFields = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
]

function ProfilePage({ recipes = [], nutritionGoals, onSaveNutritionGoals }) {
  const [goalDraft, setGoalDraft] = useState(nutritionGoals)
  const [goalsSaved, setGoalsSaved] = useState(false)
  const favoriteCount = recipes.filter((recipe) => recipe.favorite).length
  const recipeCount = recipes.length
  const cookbooks = [...new Set(recipes.map((recipe) => recipe.cookbook).filter(Boolean))]

  useEffect(() => {
    setGoalDraft(nutritionGoals)
  }, [nutritionGoals])

  const updateGoal = (field, value) => {
    setGoalDraft((current) => ({ ...current, [field]: value }))
    setGoalsSaved(false)
  }

  const saveGoals = (event) => {
    event.preventDefault()
    onSaveNutritionGoals(goalDraft)
    setGoalsSaved(true)
  }

  return (
    <div className="page-shell profile-page">
      <div className="page-card profile-card">
        <div className="profile-header">
          <div className="profile-user">
            <div className="profile-avatar">MA</div>
            <div className="profile-name">
              <h2>Magret Adekunle</h2>
              <span className="profile-handle">@magret-can-cook-777</span>
            </div>
          </div>

        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <strong>{recipeCount}</strong>
            <span>Recipes</span>
          </div>
          <div className="profile-stat">
            <strong>{favoriteCount}</strong>
            <span>Favorites</span>
          </div>
          <div className="profile-stat">
            <strong>{favoriteCount}</strong>
            <span>Cooked</span>
          </div>
          <div className="profile-stat">
            <strong>{cookbooks.length}</strong>
            <span>Cookbooks</span>
          </div>
        </div>

        <button type="button" className="profile-edit-button">
            Edit profile
        </button>

        <div className="profile-section">
          <h3>About</h3>
          <div className="profile-bio">
            Food-first home cook with a soft spot for quick weeknight dinners, cozy soups,
            and meals that feel like a reset. I love organizing recipes by season, mood,
            and what I already have in the fridge.
          </div>
        </div>

        <div className="profile-section">
          <h3>Interests</h3>
          <div className="profile-tag-list">
            <span className="profile-tag">Meal prep</span>
            <span className="profile-tag">Quick dinners</span>
            <span className="profile-tag">Vegetarian</span>
            <span className="profile-tag">Family meals</span>
          </div>
        </div>

        <form className="profile-section nutrition-goals-section" onSubmit={saveGoals}>
          <div>
            <h3>Cut goals</h3>
            <p className="goals-help">
              Set your personal weight and daily macro goals. Add nutrition per serving to a recipe
              to compare it here.
            </p>
          </div>

          <label className="goal-field weight-goal-field">
            <span>Weight goal</span>
            <div className="goal-input-with-unit">
              <input
                type="number"
                min="0"
                step="any"
                value={goalDraft.weightGoal}
                onChange={(event) => updateGoal('weightGoal', event.target.value)}
                placeholder="Optional"
              />
              <select
                aria-label="Weight unit"
                value={goalDraft.weightUnit}
                onChange={(event) => updateGoal('weightUnit', event.target.value)}
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </label>

          <div className="macro-goal-grid">
            {goalFields.map(({ key, label }) => (
              <label className="goal-field" key={key}>
                <span>{label} <small>g / day</small></span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={goalDraft[key]}
                  onChange={(event) => updateGoal(key, event.target.value)}
                  placeholder="Not set"
                />
              </label>
            ))}
          </div>

          <div className="goals-save-row">
            <button type="submit" className="profile-edit-button">Save goals</button>
            {goalsSaved ? <span role="status">Goals saved</span> : null}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfilePage
