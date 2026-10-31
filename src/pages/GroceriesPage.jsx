// Grocery list page.
// This page flattens all ingredient arrays from saved recipes into one shopping list.
// If you want to dedupe, group, or format ingredients differently, edit the groceryItems logic here.

import './GroceriesPage.css'

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
