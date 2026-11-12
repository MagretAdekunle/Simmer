import { useState } from 'react'
import { createListItemId } from '../planning'
import './GroceriesPage.css'

function GroceriesPage({ recipes = [], groceryItems = [], setGroceryItems }) {
  const [newItem, setNewItem] = useState('')
  const recipeNames = new Map(recipes.map((recipe) => [recipe.id, recipe.name]))

  const updateItem = (itemId, updates) => {
    setGroceryItems((items) => items.map((item) => (
      item.id === itemId ? { ...item, ...updates } : item
    )))
  }

  const addItem = (event) => {
    event.preventDefault()
    const name = newItem.trim()
    if (!name) return
    setGroceryItems((items) => [...items, { id: createListItemId(), name, checked: false, recipeId: null }])
    setNewItem('')
  }

  return (
    <div className="page-shell groceries-page">
      <div className="page-card">
        <p className="eyebrow">Groceries</p>
        <div className="grocery-heading">
          <div>
            <h2>Shopping list</h2>
            <p>Add recipe ingredients, check off items, or edit the list yourself.</p>
          </div>
          {groceryItems.some((item) => item.checked) ? (
            <button
              type="button"
              className="grocery-page-button"
              onClick={() => setGroceryItems((items) => items.filter((item) => !item.checked))}
            >
              Clear checked
            </button>
          ) : null}
        </div>

        <form className="grocery-add-form" onSubmit={addItem}>
          <label className="sr-only" htmlFor="new-grocery-item">Add a grocery item</label>
          <input
            id="new-grocery-item"
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            placeholder="Add an item"
          />
          <button type="submit" className="primary-button" disabled={!newItem.trim()}>Add item</button>
        </form>

        {groceryItems.length ? (
          <ul className="grocery-list">
            {groceryItems.map((item) => (
              <li className={item.checked ? 'grocery-list-item checked' : 'grocery-list-item'} key={item.id}>
                <input
                  type="checkbox"
                  aria-label={`Mark ${item.name} as ${item.checked ? 'not purchased' : 'purchased'}`}
                  checked={Boolean(item.checked)}
                  onChange={(event) => updateItem(item.id, { checked: event.target.checked })}
                />
                <div className="grocery-item-content">
                  <input
                    aria-label={`Edit ${item.name}`}
                    value={item.name}
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                  />
                  {item.recipeId && recipeNames.has(item.recipeId) ? (
                    <small>From {recipeNames.get(item.recipeId)}</small>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="grocery-page-button danger"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => setGroceryItems((items) => items.filter((entry) => entry.id !== item.id))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="grocery-empty-state">Your shopping list is empty. Add ingredients from a recipe or enter an item above.</p>
        )}
      </div>
    </div>
  )
}

export default GroceriesPage
