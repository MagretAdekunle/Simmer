// Inspiration page.
// This screen is intended to showcase featured recipes and summary stats.
// If you want to change the content or layout of the discovery view, edit the arrays and counts here.

import './DiscoverPage.css'

function DiscoverPage({ recipes = [] }) {
  // Show the first three recipes as featured cards on the landing/inspiration view.
  const featured = recipes.slice(0, 3)

  // Collect unique cookbook names instead of legacy collections.
  const topCookbooks = [...new Set(recipes.flatMap((recipe) => recipe.cookbooks || recipe.cookbook ? [recipe.cookbook || recipe.cookbooks?.[0]] : []))].filter(Boolean).slice(0, 4)

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
              <p>{recipe.cookbooks?.join(' • ') || recipe.cookbook || 'Saved recipe'}</p>
            </article>
          ))}
        </div>

        <div className="discover-summary">
          <div>
            <strong>{favoriteCount}</strong>
            <span>favorite recipes</span>
          </div>
          <div>
            <strong>{topCookbooks.length}</strong>
            <span>cookbooks</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiscoverPage
