// Recipe dashboard view.
// This page renders the sidebar filters, the main recipe tile grid, the create/edit form,
// and the full recipe detail view when a tile is selected.
// If you are adjusting recipe display behavior, search this file first.

import './RecipesPage.css'
import { useEffect, useState } from 'react'

// If you are editing recipe behavior, most of the important UI logic lives in this file.
function RecipesPage({
  recipes = [],
  selectedId,
  setSelectedId,
  isCreating,
  draft,
  setDraft,
  searchTerm,
  setSearchTerm,
  activeTag,
  setActiveTag,
  showFavoritesOnly,
  setShowFavoritesOnly,
  selectedRecipe,
  onSubmit,
  onEdit,
  onDelete,
  onToggleFavorite,
  onExport,
  onBackup,
  onCancel,
  onStartCreate,
  allTags = [],
  recipeView,
  setRecipeView,
  cookbookNames = [],
  selectedCookbook,
  setSelectedCookbook,
  isOrganizing,
  setIsOrganizing,
  cookbookInput,
  setCookbookInput,
  organizeSelectedIds = [],
  toggleCookbookSelection,
  onCreateCookbook,
  onSaveCookbook,
  onDeleteCookbook,
  cookbookCounts = {},
}) {
  // The currently visible recipe list.
  // This is already filtered upstream and passed in as the source of truth for the UI.
  const visibleRecipes = recipes

  // When the cookbook view is selected without a specific cookbook chosen, show cookbook tiles instead of recipe tiles.
  const showCookbookTiles = recipeView === 'cookbooks' && !selectedCookbook

  // Detail view state.
  // This is local UI state because it only controls whether the selected recipe is shown in expanded detail mode.
  const [detailView, setDetailView] = useState(false)

  // When the user starts creating a recipe or there is no selected recipe,
  // close the detail view so the form or empty state is the active screen.
  useEffect(() => {
    if (isCreating || !selectedRecipe) {
      setDetailView(false)
    }
  }, [isCreating, selectedRecipe])

  // Shared helper for updating any field in the draft editor.
  // This keeps the form state update logic in one place and reduces repeated code in inputs.
  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
  }

  // Open a tile in detail mode.
  // This sets the selected recipe and turns on the expanded recipe page.
  const openRecipeDetail = (recipeId) => {
    setSelectedId(recipeId)
    setDetailView(true)
  }

  // Close the detail view and return the user to the grid.
  const closeRecipeDetail = () => {
    setDetailView(false)
  }

  return (
    <div className="recipes-page">
      <aside className="recipes-sidebar">
        <div className="panel">
          <div className="panel-header">
            <h2>Recipes</h2>
          </div>

          <div className="recipe-view-tabs">
            <button
              type="button"
              className={recipeView === 'all' ? 'view-tab active' : 'view-tab'}
              onClick={() => {
                setRecipeView('all')
                setSelectedCookbook(null)
              }}
            >
              All recipes
            </button>

            <button
              type="button"
              className={recipeView === 'cookbooks' ? 'view-tab active' : 'view-tab'}
              onClick={() => {
                setRecipeView('cookbooks')
                setSelectedCookbook(null)
              }}
            >
              Cookbooks
            </button>
          </div>

          {recipeView === 'cookbooks' ? (
            <div className="cookbook-section">
              <div className="cookbook-header">
                <h3>Cookbooks</h3>
              </div>

              <div className="chip-list cookbook-list">
                {cookbookNames.map((cookbook) => (
                  <button
                    key={cookbook}
                    type="button"
                    className={selectedCookbook === cookbook ? 'chip cookbook-chip active' : 'chip cookbook-chip'}
                    onClick={() => setSelectedCookbook(cookbook)}
                  >
                    <span>{cookbook}</span>
                    <span className="cookbook-count">{cookbookCounts[cookbook] || 0}</span>
                  </button>
                ))}
              </div>

              {!selectedCookbook && isOrganizing ? (
                <div className="organize-box">
                  <label className="organize-label">
                    <span>New cookbook name</span>
                    <input
                      value={cookbookInput}
                      onChange={(event) => setCookbookInput(event.target.value)}
                      placeholder="e.g. Sunday Dinner"
                    />
                  </label>

                  <div className="organize-help">
                    <strong>Select recipes</strong>
                    <small>Choose the recipes you want in this cookbook.</small>
                  </div>

                  {recipes.length ? (
                    <div className="organize-list">
                      {recipes.map((recipe) => (
                        <label key={recipe.id} className="checkbox-row select-row">
                          <input
                            type="checkbox"
                            checked={organizeSelectedIds.includes(recipe.id)}
                            onChange={() => toggleCookbookSelection(recipe.id)}
                          />
                          <span>{recipe.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}

                  <button type="button" className="primary-button" onClick={onCreateCookbook}>
                    Create cookbook
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <label className="search-box">
            <span>Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search recipes or ingredients"
            />
          </label>

          <div className="filter-group">
            <h3>Tags</h3>
            <div className="chip-list">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={activeTag === tag ? 'chip active' : 'chip'}
                  onClick={() => setActiveTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group favorite-filter-group">
            <h3>Quick filters</h3>
            <button
              type="button"
              className={showFavoritesOnly ? 'chip favorite active' : 'chip favorite'}
              onClick={() => setShowFavoritesOnly((current) => !current)}
            >
              {showFavoritesOnly ? '★ Favorites only' : '☆ Favorites only'}
            </button>
          </div>
        </div>
      </aside>

      <section className="recipes-main">
        {!isCreating && !detailView ? (
          <div className="recipe-grid-panel">
            <div className="panel-header recipe-grid-header">
              <h2>{showCookbookTiles ? 'Cookbooks' : selectedCookbook ? selectedCookbook : 'Recipes'}</h2>

              {selectedCookbook && !showCookbookTiles ? (
                <div className="cookbook-tile-actions">
                  <button
                    type="button"
                    className="tiny-button"
                    onClick={() => {
                      setIsOrganizing(true)
                      setOrganizeSelectedIds(
                        recipes.filter((recipe) => getRecipeCookbooks(recipe).includes(selectedCookbook)).map((recipe) => recipe.id),
                      )
                      setCookbookInput(selectedCookbook)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tiny-button danger"
                    onClick={() => onDeleteCookbook(selectedCookbook)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            <div className="recipe-grid recipe-grid-large">
              {showCookbookTiles
                ? cookbookNames.map((cookbook) => (
                    <button
                      key={cookbook}
                      type="button"
                      className="recipe-tile cookbook-tile"
                      onClick={() => setSelectedCookbook(cookbook)}
                    >
                      <div className="cookbook-tile-header">
                        <span className="cookbook-tile-name">{cookbook}</span>
                        <span className="cookbook-count badge">{cookbookCounts[cookbook] || 0}</span>
                      </div>
                      <div className="cookbook-tile-body">
                        <span>{cookbookCounts[cookbook] || 0} recipe{(cookbookCounts[cookbook] || 0) === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                  ))
                : visibleRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      type="button"
                      className={selectedId === recipe.id ? 'recipe-tile active' : 'recipe-tile'}
                      onClick={() => openRecipeDetail(recipe.id)}
                    >
                      <img
                        src={recipe.image || 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80'}
                        alt={recipe.name}
                      />
                      <div className="recipe-tile-content">
                        <span className="recipe-item-name">{recipe.name}</span>
                        <span className="recipe-item-meta">
                          {recipe.cookbook || 'Uncategorized'} · {recipe.favorite ? '★ Favorite' : 'Recipe'}
                        </span>
                      </div>
                    </button>
                  ))}
            </div>
          </div>
        ) : null}

        {isCreating ? (
          <form className="recipe-form" onSubmit={onSubmit}>
            <div className="form-header">
              <h2>{draft.id ? 'Edit recipe' : 'Create recipe'}</h2>
              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={onCancel}>
                  Cancel
                </button>
                <button type="button" className="secondary-button" onClick={onBackup}>
                  Backup
                </button>
                <button type="button" className="secondary-button" onClick={onExport}>
                  Export
                </button>
              </div>
            </div>

            <label>
              <span>Name</span>
              <input value={draft.name ?? ''} onChange={(e) => updateDraft('name', e.target.value)} />
            </label>

            <label>
              <span>Image URL</span>
              <input value={draft.image ?? ''} onChange={(e) => updateDraft('image', e.target.value)} />
            </label>

            <label>
              <span>Link</span>
              <input value={draft.sourceLink ?? ''} onChange={(e) => updateDraft('sourceLink', e.target.value)} />
            </label>

            <div className="form-grid">
              <label>
                <span>Servings</span>
                <input type="number" value={draft.servings ?? 2} onChange={(e) => updateDraft('servings', e.target.value)} />
              </label>
              <label>
                <span>Prep time</span>
                <input type="number" value={draft.prepTime ?? 0} onChange={(e) => updateDraft('prepTime', e.target.value)} />
              </label>
              <label>
                <span>Cook time</span>
                <input type="number" value={draft.cookTime ?? 0} onChange={(e) => updateDraft('cookTime', e.target.value)} />
              </label>
            </div>

            <label>
              <span>Ingredients</span>
              <textarea value={draft.ingredients ?? ''} onChange={(e) => updateDraft('ingredients', e.target.value)} rows="5" />
            </label>

            <label>
              <span>Instructions</span>
              <textarea value={draft.instructions ?? ''} onChange={(e) => updateDraft('instructions', e.target.value)} rows="6" />
            </label>

            <label>
              <span>Cookbooks</span>
              <input
                value={(draft.cookbooks || [draft.cookbook || 'Uncategorized']).join(', ')}
                onChange={(e) => updateDraft('cookbooks', parseCookbookList(e.target.value))}
              />
            </label>

            <label>
              <span>Tags</span>
              <input value={draft.tags ?? ''} onChange={(e) => updateDraft('tags', e.target.value)} />
            </label>

            <label>
              <span>Cookbook comment</span>
              <textarea
                value={draft.cookbookComment ?? ''}
                onChange={(e) => updateDraft('cookbookComment', e.target.value)}
                rows="3"
                placeholder="Optional note for this cookbook assignment"
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(draft.favorite)}
                onChange={(e) => updateDraft('favorite', e.target.checked)}
              />
              <span>Favorite recipe</span>
            </label>

            <div className="form-actions form-actions-end">
              <button type="submit" className="primary-button">
                {draft.id ? 'Save changes' : 'Save recipe'}
              </button>
            </div>
          </form>
        ) : null}

        {selectedRecipe && detailView ? (
          <article className="recipe-detail recipe-detail-page">
            <div className="recipe-detail-header">
              <div>
                <p className="eyebrow">Recipe</p>
                <h2>{selectedRecipe.name}</h2>
              </div>

              <div className="recipe-detail-actions">
                <button type="button" className="secondary-button" onClick={closeRecipeDetail}>
                  Back
                </button>
                <button type="button" className="secondary-button" onClick={() => onToggleFavorite(selectedRecipe.id)}>
                  {selectedRecipe.favorite ? 'Unfavorite' : 'Favorite'}
                </button>
                <button type="button" className="secondary-button" onClick={onEdit}>
                  Edit
                </button>
                <button type="button" className="danger-button" onClick={() => onDelete(selectedRecipe.id)}>
                  Delete
                </button>
              </div>
            </div>

            {selectedRecipe.image ? (
              <img className="recipe-image" src={selectedRecipe.image} alt={selectedRecipe.name} />
            ) : null}

            <div className="recipe-meta">
              <span>{selectedRecipe.servings} servings</span>
              <span>Prep {selectedRecipe.prepTime} min</span>
              <span>Cook {selectedRecipe.cookTime} min</span>
              <span>{selectedRecipe.cookbook || 'Uncategorized'}</span>
            </div>

            {selectedRecipe.cookbookComment ? (
              <div className="detail-sections">
                <section>
                  <h3>Cookbook note</h3>
                  <p>{selectedRecipe.cookbookComment}</p>
                </section>
              </div>
            ) : null}

            <div className="detail-sections">
              <section>
                <h3>Ingredients</h3>
                <ul>
                  {(selectedRecipe.ingredients || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Instructions</h3>
                <ol>
                  {(selectedRecipe.instructions || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
            </div>
          </article>
        ) : null}

        {!isCreating && !detailView && !visibleRecipes.length ? (
          <div className="empty-state">
            <h3>No recipes yet</h3>
            <p>Use the Add recipe button to create your first recipe.</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default RecipesPage
