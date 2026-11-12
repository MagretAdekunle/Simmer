// Recipe dashboard view.
// This page coordinates recipe filters, the recipe grid, and its focused creation/detail views.

import './RecipesPage.css'
import { useEffect, useState } from 'react'
import RecipeDetail from './RecipeDetail'
import RecipeEditor from './RecipeEditor'
import RecipeCreationFlow from './RecipeCreationFlow'
import { normalizeRecipeUrl } from './recipePageUtils'

const parseTextRecipe = (sourceText) => {
  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const recipe = {
    name: '',
    description: '',
    ingredients: [],
    instructions: [],
    notes: '',
    prepTime: 0,
    cookTime: 0,
    servings: 2,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
  }
  let section = ''

  lines.forEach((line) => {
    const timeValue = (value) => {
      const hours = Number(value.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i)?.[1] || 0)
      const minutes = Number(value.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i)?.[1] || 0)
      return hours * 60 + minutes || Number(value.match(/\d+/)?.[0] || 0)
    }
    const metadata = line.match(/^(prep(?:aration)?(?: time)?|cook(?:ing)?(?: time)?|serves|servings)\s*:?\s*(.+)$/i)
    const macroMetadata = line.match(/^(protein|carbs?|carbohydrates|fat|fiber)\s*:?\s*(\d+(?:\.\d+)?)\s*(?:g|grams?)?$/i)
    const heading = line.toLowerCase().replace(/:$/, '')

    if (macroMetadata) {
      const field = /^carb/i.test(macroMetadata[1]) ? 'carbs' : macroMetadata[1].toLowerCase()
      recipe[field] = Number(macroMetadata[2])
      return
    }

    if (metadata) {
      if (/^prep/i.test(metadata[1])) recipe.prepTime = timeValue(metadata[2])
      if (/^cook/i.test(metadata[1])) recipe.cookTime = timeValue(metadata[2])
      if (/^serv/i.test(metadata[1])) recipe.servings = Number.parseInt(metadata[2], 10) || recipe.servings
      return
    }

    if (/^ingredients?$/.test(heading)) {
      section = 'ingredients'
    } else if (/^(instructions?|directions?|method|steps?)$/.test(heading)) {
      section = 'instructions'
    } else if (/^description$/.test(heading)) {
      section = 'description'
    } else if (/^notes?$/.test(heading)) {
      section = 'notes'
    } else if (!recipe.name && !section) {
      recipe.name = line
    } else if (section === 'ingredients') {
      recipe.ingredients.push(line.replace(/^(?:[-*•]\s*|\d+[.)]\s*)/, ''))
    } else if (section === 'instructions') {
      recipe.instructions.push(line.replace(/^(?:[-*•]\s*|\d+[.)]\s*)/, ''))
    } else if (section === 'description') {
      recipe.description = [recipe.description, line].filter(Boolean).join(' ')
    } else if (section === 'notes') {
      recipe.notes = [recipe.notes, line].filter(Boolean).join('\n')
    }
  })

  return recipe
}

// Filtering and page-level recipe workflows are coordinated here.
function RecipesPage({
  recipes = [],
  selectedId,
  setSelectedId,
  isCreating,
  nutritionGoals = {},
  draft,
  setDraft,
  searchTerm,
  setSearchTerm,
  activeTag,
  setActiveTag,
  activeCollection,
  setActiveCollection,
  allCollections = [],
  activeIngredient,
  setActiveIngredient,
  totalTimeFilter,
  setTotalTimeFilter,
  cookedFilter,
  setCookedFilter,
  ratingFilter,
  setRatingFilter,
  sortBy,
  setSortBy,
  showFavoritesOnly,
  setShowFavoritesOnly,
  selectedRecipe,
  onSubmit,
  onEdit,
  onDelete,
  onToggleFavorite,
  onUpdateRecipeTags,
  onUpdateRecipeStatus,
  onSaveCookingNotes,
  onAddToGroceries,
  onAddToMealPlan,
  onExport,
  onBackup,
  onCancel,
  onStartCreate,
  onStartCookbook,
  allTags = [],
  allIngredients = [],
  recipeView,
  setRecipeView,
  recipeDisplayMode,
  setRecipeDisplayMode,
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
  const [createStep, setCreateStep] = useState('choose')
  const [editorReturnStep, setEditorReturnStep] = useState('method')
  const [importText, setImportText] = useState('')
  const [webSearch, setWebSearch] = useState('')
  const [webUrl, setWebUrl] = useState('')
  const [importError, setImportError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isReadingPhoto, setIsReadingPhoto] = useState(false)
  const [photoNotice, setPhotoNotice] = useState('')
  const [showCompactFilters, setShowCompactFilters] = useState(false)

  // When the user starts creating a recipe or there is no selected recipe,
  // close the detail view so the form or empty state is the active screen.
  useEffect(() => {
    if (isCreating || !selectedRecipe) {
      setDetailView(false)
    }
  }, [isCreating, selectedRecipe])

  useEffect(() => {
    if (isCreating) {
      setCreateStep(draft.id ? 'editor' : 'choose')
    }
  }, [isCreating, draft.id])

  // Shared helper for updating any field in the draft editor.
  // This keeps the form state update logic in one place and reduces repeated code in inputs.
  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
  }

  const updateRecipeList = (field, index, value) => {
    setDraft((currentDraft) => {
      const rows = Array.isArray(currentDraft[field]) ? [...currentDraft[field]] : []
      rows[index] = value
      return { ...currentDraft, [field]: rows }
    })
  }

  const addRecipeListRow = (field) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: [...(Array.isArray(currentDraft[field]) ? currentDraft[field] : []), ''],
    }))
  }

  const removeRecipeListRow = (field, index) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: currentDraft[field].filter((_, rowIndex) => rowIndex !== index),
    }))
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

  const cancelRecipeFlow = () => {
    const hasDraftContent = Boolean(
      draft.id ||
      draft.name.trim() ||
      draft.description.trim() ||
      draft.image ||
      draft.sourceLink.trim() ||
      draft.ingredients.some((ingredient) => ingredient.trim()) ||
      draft.instructions.some((instruction) => instruction.trim()) ||
      draft.notes.trim() ||
      draft.substitutions.trim() ||
      draft.tags.trim() ||
      draft.cookbookComment.trim() ||
      (draft.cookbooks || []).some((cookbook) => cookbook !== 'Uncategorized') ||
      importText.trim() ||
      webSearch.trim() ||
      webUrl.trim()
    )

    if (hasDraftContent && !window.confirm('Discard your changes? They will not be saved.')) return

    onCancel()
    setImportText('')
    setWebSearch('')
    setWebUrl('')
    setImportError('')
    setPhotoNotice('')
  }

  const beginRecipeImport = (step) => {
    onStartCreate()
    setImportError('')
    setPhotoNotice('')
    if (step === 'text') setImportText('')
    if (step === 'web') {
      setWebSearch('')
      setWebUrl('')
    }
    setCreateStep(step)
  }

  const openRecipeEditor = (returnStep) => {
    setEditorReturnStep(returnStep)
    setCreateStep('editor')
  }

  const importRecipeText = () => {
    const parsedRecipe = parseTextRecipe(importText)
    setDraft((currentDraft) => ({ ...currentDraft, ...parsedRecipe }))
    openRecipeEditor('text')
  }

  const handlePhotoSelect = (event) => {
    const photoFile = event.target.files?.[0]
    event.target.value = ''
    if (!photoFile) return

    if (!photoFile.type.startsWith('image/')) {
      setImportError('Choose an image file to continue.')
      return
    }

    const photoUrl = URL.createObjectURL(photoFile)
    const photo = new Image()
    photo.onload = async () => {
      const maxDimension = 1280
      const scale = Math.min(1, maxDimension / Math.max(photo.width, photo.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(photo.width * scale)
      canvas.height = Math.round(photo.height * scale)
      const context = canvas.getContext('2d')

      if (context) {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(photo, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL('image/jpeg', 0.78)
        setDraft((currentDraft) => ({ ...currentDraft, image: imageData }))
        setImportError('')
        setIsReadingPhoto(true)
        setPhotoNotice('Reading recipe text from the photo...')

        let worker
        try {
          const { createWorker: createOcrWorker } = await import('tesseract.js')
          worker = await createOcrWorker('eng')
          const ocrResult = await worker.recognize(imageData)
          const parsedRecipe = parseTextRecipe(ocrResult.data.text)
          setDraft((currentDraft) => ({ ...currentDraft, ...parsedRecipe, image: imageData }))
          setPhotoNotice(parsedRecipe.ingredients.length || parsedRecipe.instructions.length
            ? 'Recipe text is ready to review and edit.'
            : 'Photo attached. Add the recipe details in the editor.')
        } catch {
          setPhotoNotice('Photo attached, but its text could not be read. You can enter the details yourself.')
        } finally {
          if (worker) await worker.terminate()
          setIsReadingPhoto(false)
        }
      } else {
        setImportError('This photo could not be opened. Try another image.')
      }

      URL.revokeObjectURL(photoUrl)
    }
    photo.onerror = () => {
      URL.revokeObjectURL(photoUrl)
      setImportError('This photo could not be opened. Try another image.')
    }
    photo.src = photoUrl
  }

  const handleRecipeSearch = () => {
    const searchUrl = new URL('https://www.google.com/search')
    searchUrl.searchParams.set('q', `${webSearch.trim()} recipe`)
    window.open(searchUrl.href, '_blank', 'noopener,noreferrer')
  }

  const handleWebImport = async () => {
    const recipeUrl = normalizeRecipeUrl(webUrl.trim())
    if (!recipeUrl) {
      setImportError('Enter a valid recipe link.')
      return
    }

    setWebUrl(recipeUrl)
    setImportError('')
    setIsImporting(true)

    try {
      const response = await fetch('/api/recipe-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: recipeUrl }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The recipe link could not be imported.')

      onStartCreate()
      setDraft((currentDraft) => ({
        ...currentDraft,
        ...result.recipe,
        sourceLink: recipeUrl,
      }))
      openRecipeEditor('web')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The recipe link could not be imported.')
    } finally {
      setIsImporting(false)
    }
  }

  const useRecipeLinkOnly = () => {
    const recipeUrl = normalizeRecipeUrl(webUrl.trim())
    if (!recipeUrl) {
      setImportError('Enter a valid recipe link.')
      return
    }

    onStartCreate()
    setDraft((currentDraft) => ({ ...currentDraft, sourceLink: recipeUrl }))
    openRecipeEditor('web')
  }

  const pasteRecipeTextFallback = () => {
    const recipeUrl = normalizeRecipeUrl(webUrl.trim())
    if (!recipeUrl) {
      setImportError('Enter a valid recipe link.')
      return
    }

    setDraft((currentDraft) => ({ ...currentDraft, sourceLink: recipeUrl }))
    setImportText('')
    setImportError('')
    setCreateStep('text')
  }

  return (
    <div className="recipes-page">
      <aside className="recipes-sidebar">
        <div className="panel">

          <div className="recipe-toolbar-main">
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

            <label className="search-box">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search recipes"
              />
            </label>

            <div className="filter-group favorite-filter-group">
              <button
                type="button"
                className={showFavoritesOnly ? 'chip favorite active' : 'chip favorite'}
                onClick={() => setShowFavoritesOnly((current) => !current)}
              >
                {showFavoritesOnly ? '★ Favorites' : '☆ Favorites'}
              </button>
            </div>

            <button
              type="button"
              className="filter-toggle-button"
              aria-expanded={showCompactFilters}
              onClick={() => setShowCompactFilters((current) => !current)}
            >
              {showCompactFilters ? 'Hide filters' : 'Filters'}
            </button>
          </div>

          {recipeView === 'cookbooks' ? (
            <div className="cookbook-section">
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

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setIsOrganizing(false)
                        setRecipeView('all')
                        setCookbookInput('')
                      }}
                    >
                      Cancel
                    </button>
                    <button type="button" className="primary-button" onClick={onCreateCookbook}>
                      Create cookbook
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={showCompactFilters ? 'filter-selects expanded' : 'filter-selects'}>
            <label className="toolbar-select">
              <span>Tag</span>
              <select value={activeTag} onChange={(event) => setActiveTag(event.target.value)}>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>

            <label className="toolbar-select">
              <span>Collection</span>
              <select value={activeCollection} onChange={(event) => setActiveCollection(event.target.value)}>
                {allCollections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </label>

            <label className="toolbar-select">
              <span>Ingredient</span>
              <select
                value={activeIngredient}
                onChange={(event) => setActiveIngredient(event.target.value)}
              >
                {allIngredients.map((ingredient) => (
                  <option key={ingredient} value={ingredient}>
                    {ingredient}
                  </option>
                ))}
              </select>
            </label>

            <label className="toolbar-select">
              <span>Total time</span>
              <select
                value={totalTimeFilter}
                onChange={(event) => setTotalTimeFilter(event.target.value)}
              >
                <option value="all">Any</option>
                <option value="under-30">30 min or less</option>
                <option value="30-60">31 to 60 min</option>
                <option value="over-60">Over 60 min</option>
              </select>
            </label>

            <label className="toolbar-select">
              <span>Cooked</span>
              <select value={cookedFilter} onChange={(event) => setCookedFilter(event.target.value)}>
                <option value="all">Any</option>
                <option value="cooked">Cooked</option>
                <option value="not-cooked">Not cooked</option>
              </select>
            </label>

            <label className="toolbar-select">
              <span>Rating</span>
              <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}>
                <option value="all">Any</option>
                <option value="4.5+">4.5+ stars</option>
                <option value="4+">4+ stars</option>
                <option value="3.5+">3.5+ stars</option>
                <option value="3+">3+ stars</option>
                <option value="2.5+">2.5+ stars</option>
                <option value="2+">2+ stars</option>
              </select>
            </label>

            <label className="toolbar-select">
              <span>Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="default">Default</option>
                <option value="name-asc">Name A-Z</option>
                <option value="time-asc">Total time: low-high</option>
                <option value="time-desc">Total time: high-low</option>
                <option value="rating-desc">Rating: high-low</option>
              </select>
            </label>
          </div>

        </div>
      </aside>

      <section className="recipes-main">
        {!isCreating && !detailView ? (
          <div className="recipe-grid-panel">
            <div className="panel-header recipe-grid-header">
              <h2>{showCookbookTiles ? 'Cookbooks' : selectedCookbook ? selectedCookbook : 'Recipes'}</h2>

              {!showCookbookTiles ? (
                <div className="view-mode-toggle" role="group" aria-label="Recipe layout">
                  <button
                    type="button"
                    className={recipeDisplayMode === 'grid' ? 'tiny-button active' : 'tiny-button'}
                    onClick={() => setRecipeDisplayMode('grid')}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    className={recipeDisplayMode === 'list' ? 'tiny-button active' : 'tiny-button'}
                    onClick={() => setRecipeDisplayMode('list')}
                  >
                    List
                  </button>
                </div>
              ) : null}

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

            <div className={showCookbookTiles || recipeDisplayMode === 'grid' ? 'recipe-grid recipe-grid-large' : 'recipe-grid recipe-grid-large recipe-list-layout'}>
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
                        <span className="recipe-item-meta">
                          {Number(recipe.rating || 0) > 0 ? `★ ${Number(recipe.rating).toFixed(1)}` : 'Unrated'} · {recipe.cooked ? 'Cooked' : 'Not cooked'}
                        </span>
                      </div>
                    </button>
                  ))}
            </div>
          </div>
        ) : null}

        {isCreating && createStep !== 'editor' ? (
          <RecipeCreationFlow
            createStep={createStep}
            setCreateStep={setCreateStep}
            cancelRecipeFlow={cancelRecipeFlow}
            onCancel={onCancel}
            onStartCookbook={onStartCookbook}
            beginRecipeImport={beginRecipeImport}
            draft={draft}
            photoNotice={photoNotice}
            isReadingPhoto={isReadingPhoto}
            handlePhotoSelect={handlePhotoSelect}
            importError={importError}
            importText={importText}
            setImportText={setImportText}
            importRecipeText={importRecipeText}
            webSearch={webSearch}
            setWebSearch={setWebSearch}
            handleRecipeSearch={handleRecipeSearch}
            webUrl={webUrl}
            setWebUrl={setWebUrl}
            isImporting={isImporting}
            handleWebImport={handleWebImport}
            useRecipeLinkOnly={useRecipeLinkOnly}
            pasteRecipeTextFallback={pasteRecipeTextFallback}
            openRecipeEditor={openRecipeEditor}
          />
        ) : null}

        {isCreating && createStep === 'editor' ? (
          <RecipeEditor
            draft={draft}
            editorReturnStep={editorReturnStep}
            setCreateStep={setCreateStep}
            cancelRecipeFlow={cancelRecipeFlow}
            onBackup={onBackup}
            onExport={onExport}
            onSubmit={onSubmit}
            onUpdateDraft={updateDraft}
            onUpdateRecipeList={updateRecipeList}
            onAddRecipeListRow={addRecipeListRow}
            onRemoveRecipeListRow={removeRecipeListRow}
            onPhotoSelect={handlePhotoSelect}
            isReadingPhoto={isReadingPhoto}
          />
        ) : null}

        {selectedRecipe && detailView ? (
          <RecipeDetail
            recipe={selectedRecipe}
            nutritionGoals={nutritionGoals}
            onClose={closeRecipeDetail}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleFavorite={onToggleFavorite}
            onUpdateRecipeTags={onUpdateRecipeTags}
            onUpdateRecipeStatus={onUpdateRecipeStatus}
            onSaveCookingNotes={onSaveCookingNotes}
            onAddToGroceries={onAddToGroceries}
            onAddToMealPlan={onAddToMealPlan}
          />
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
