import './DiscoverPage.css'

// This page is the inspiration tab: it surfaces featured recipes and summary stats.
// If you want to change what shows up here, edit the arrays and counts below.
function DiscoverPage({ recipes = [] }) {
  // Show the first three recipes as featured cards on the landing/inspiration view.
  const featured = recipes.slice(0, 3)

  // Collect unique collection names so the summary reflects how the app is organized.
  const topCollections = [...new Set(recipes.flatMap((recipe) => recipe.collections || []))].slice(0, 4)

  // Count favorite recipes to give a quick health check on the library.
  const favoriteCount = recipes.filter((recipe) => recipe.favorite).length

  return (
    <div className="page-shell discover-page">
      <div className="page-card">
        <p className="eyebrow">Discover</p>
        <h2>Inspiration</h2>
        <div className="discover-grid">
          {featured.map((recipe) => (
            <article key={recipe.id} className="discover-card">
              <h3>{recipe.name}</h3>
              <p>{recipe.collections?.join(' • ') || 'Saved recipe'}</p>
            </article>
          ))}
        </div>

        <div className="discover-summary">
          <div>
            <strong>{favoriteCount}</strong>
            <span>favorite recipes</span>
          </div>
          <div>
            <strong>{topCollections.length}</strong>
            <span>collections</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiscoverPage
