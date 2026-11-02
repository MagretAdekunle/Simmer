import './ProfilePage.css'

function ProfilePage({ recipes = [] }) {
  const favoriteCount = recipes.filter((recipe) => recipe.favorite).length
  const recipeCount = recipes.length
  const cookbooks = [...new Set(recipes.map((recipe) => recipe.cookbook).filter(Boolean))]

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
      </div>
    </div>
  )
}

export default ProfilePage
