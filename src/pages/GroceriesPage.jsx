import './GroceriesPage.css'

// This page builds a shopping list from every saved recipe ingredient.
// If you want to group or deduplicate items, change the groceryItems logic below.
function GroceriesPage({ recipes = [] }) {
  // Flatten the ingredient arrays from all recipes into one combined list.
  const groceryItems = recipes.flatMap((recipe) => recipe.ingredients || [])

  return (
    <div className="page-shell groceries-page">
      <div className="page-card">
        <p className="eyebrow">Groceries</p>
        <h2>Shopping list</h2>
        <ul className="grocery-list">
          {groceryItems.length ? (
            groceryItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
          ) : (
            <li>No ingredients saved yet.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default GroceriesPage
