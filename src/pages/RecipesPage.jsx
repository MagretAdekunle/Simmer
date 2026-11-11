// Recipe dashboard view.
// This page renders the sidebar filters, the main recipe tile grid, the create/edit form,
// and the full recipe detail view when a tile is selected.
// If you are adjusting recipe display behavior, search this file first.

import './RecipesPage.css'
import { useEffect, useState } from 'react'

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
  }
  let section = ''

  lines.forEach((line) => {
    const timeValue = (value) => {
      const hours = Number(value.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i)?.[1] || 0)
      const minutes = Number(value.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i)?.[1] || 0)
      return hours * 60 + minutes || Number(value.match(/\d+/)?.[0] || 0)
    }
    const metadata = line.match(/^(prep(?:aration)?(?: time)?|cook(?:ing)?(?: time)?|serves|servings)\s*:?\s*(.+)$/i)
    const heading = line.toLowerCase().replace(/:$/, '')

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

const findRecipeSchema = (schema) => {
  if (Array.isArray(schema)) {
    return schema.map(findRecipeSchema).find(Boolean) ?? null
  }

  if (!schema || typeof schema !== 'object') return null

  const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']]
  if (types.some((type) => typeof type === 'string' && type.endsWith('Recipe'))) return schema

  return findRecipeSchema(schema['@graph'])
}

const flattenInstructions = (steps = []) => {
  const entries = Array.isArray(steps) ? steps : [steps]
  return entries.flatMap((step) => {
    if (typeof step === 'string') return [step]
    if (step?.text) return [step.text]
    return flattenInstructions(step?.itemListElement ?? [])
  })
}

const parseDuration = (duration = '') => {
  const match = String(duration || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?/i)
  return match ? Number(match[1] || 0) * 60 + Number(match[2] || 0) : 0
}

const normalizeRecipeUrl = (value) => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

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
      const recipePageResponse = await fetch(recipeUrl)
      if (!recipePageResponse.ok) throw new Error('Recipe page could not be loaded')

      const page = new DOMParser().parseFromString(await recipePageResponse.text(), 'text/html')
      const recipe = [...page.querySelectorAll('script[type="application/ld+json"]')]
        .map((script) => {
          try {
            return findRecipeSchema(JSON.parse(script.textContent || ''))
          } catch {
            return null
          }
        })
        .find(Boolean)

      if (!recipe) throw new Error('No recipe data found')

      const imageValue = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image
      const imageUrl = typeof imageValue === 'string' ? imageValue : imageValue?.url || ''
      const keywordList = Array.isArray(recipe.keywords) ? recipe.keywords : String(recipe.keywords || '').split(',')
      const servings = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield
      const ingredients = Array.isArray(recipe.recipeIngredient)
        ? recipe.recipeIngredient
        : [recipe.recipeIngredient].filter(Boolean)

      onStartCreate()
      setDraft((currentDraft) => ({
        ...currentDraft,
        name: recipe.name || '',
          description: recipe.description || '',
        ingredients,
          instructions: flattenInstructions(recipe.recipeInstructions),
          notes: recipe.recipeNotes || '',
        image: imageUrl,
        sourceLink: recipeUrl,
        servings: Number.parseInt(servings, 10) || currentDraft.servings,
        prepTime: parseDuration(recipe.prepTime),
        cookTime: parseDuration(recipe.cookTime),
        tags: keywordList.map((keyword) => String(keyword).trim()).filter(Boolean).join(', '),
      }))
      openRecipeEditor('web')
    } catch {
      setImportError('This site may block direct imports or lack recipe data. You can still add its link.')
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

  return (
    <div className="recipes-page">
      <aside className="recipes-sidebar">
        <div className="panel">

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

          <label className="search-box">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search recipes"
            />
          </label>

          <div className="filter-selects">
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

          <div className="filter-group favorite-filter-group">
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
          <section className="creation-flow">
            <div className="creation-flow-header">
              <div>
                <p className="eyebrow">Add to Simmer</p>
                <h2>
                  {createStep === 'choose'
                    ? 'What would you like to add?'
                    : createStep === 'method'
                      ? 'Add a recipe'
                      : createStep === 'photo'
                        ? 'Import from photo'
                        : createStep === 'text'
                          ? 'Import from text'
                          : 'Import from web'}
                </h2>
              </div>
              <div className="form-actions">
                {createStep !== 'choose' ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setCreateStep(createStep === 'method' ? 'choose' : 'method')}
                  >
                    Back
                  </button>
                ) : null}
                <button type="button" className="secondary-button" onClick={cancelRecipeFlow}>
                  Cancel
                </button>
              </div>
            </div>

            {createStep === 'choose' ? (
              <div className="creation-options">
                <button type="button" className="creation-option" onClick={() => setCreateStep('method')}>
                  <strong>Add a recipe</strong>
                  <span>Choose an import method or enter it yourself.</span>
                </button>
                <button
                  type="button"
                  className="creation-option"
                  onClick={() => {
                    onCancel()
                    onStartCookbook()
                  }}
                >
                  <strong>Add a cookbook</strong>
                  <span>Create a cookbook and choose recipes for it.</span>
                </button>
              </div>
            ) : null}

            {createStep === 'method' ? (
              <div className="creation-options">
                <button type="button" className="creation-option" onClick={() => beginRecipeImport('photo')}>
                  <strong>Import from photo</strong>
                  <span>Choose an image or take a photo.</span>
                </button>
                <button type="button" className="creation-option" onClick={() => beginRecipeImport('text')}>
                  <strong>Import from text</strong>
                  <span>Type or paste a complete recipe.</span>
                </button>
                <button type="button" className="creation-option" onClick={() => beginRecipeImport('web')}>
                  <strong>Import from web</strong>
                  <span>Search for a recipe or import a link.</span>
                </button>
                <button type="button" className="creation-option" onClick={() => beginRecipeImport('editor')}>
                  <strong>Write from scratch</strong>
                  <span>Start with a blank recipe form.</span>
                </button>
              </div>
            ) : null}

            {createStep === 'photo' ? (
              <div className="creation-import-panel">
                <div className="photo-import-actions">
                  <label className="secondary-button file-picker">
                    Choose from library
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} />
                  </label>
                  <label className="secondary-button file-picker">
                    Take a photo
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} />
                  </label>
                </div>
                {draft.image?.startsWith('data:image/') ? (
                  <div className="photo-import-preview">
                    <img src={draft.image} alt="Selected recipe" />
                    <span>{photoNotice || 'Photo attached. Continue to fill in the recipe details.'}</span>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={isReadingPhoto}
                      onClick={() => openRecipeEditor('photo')}
                    >
                      Continue to recipe
                    </button>
                  </div>
                ) : null}
                {isReadingPhoto && !draft.image?.startsWith('data:image/') ? (
                  <p role="status">Reading recipe text from the photo...</p>
                ) : null}
                {importError ? <p className="import-error" role="alert">{importError}</p> : null}
              </div>
            ) : null}

            {createStep === 'text' ? (
              <div className="creation-import-panel">
                <label className="import-field">
                  <span>Recipe text</span>
                  <textarea
                    rows="12"
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder={'Recipe name\n\nIngredients\n...\n\nInstructions\n...'}
                  />
                </label>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!importText.trim()}
                  onClick={importRecipeText}
                >
                  Continue to recipe
                </button>
              </div>
            ) : null}

            {createStep === 'web' ? (
              <div className="creation-import-panel web-import-panel">
                <div className="import-field">
                  <label htmlFor="recipe-web-search">Search the web</label>
                  <div className="web-search-row">
                    <input
                      id="recipe-web-search"
                      value={webSearch}
                      onChange={(event) => setWebSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleRecipeSearch()
                      }}
                      placeholder="Search recipes"
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={!webSearch.trim()}
                      onClick={handleRecipeSearch}
                    >
                      Search
                    </button>
                  </div>
                </div>
                <div className="import-field">
                  <label htmlFor="recipe-web-url">Recipe link</label>
                  <div className="web-search-row">
                    <input
                      id="recipe-web-url"
                      type="url"
                      value={webUrl}
                      onChange={(event) => setWebUrl(event.target.value)}
                      placeholder="https://example.com/recipe"
                    />
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!webUrl.trim() || isImporting}
                      onClick={handleWebImport}
                    >
                      {isImporting ? 'Importing...' : 'Import link'}
                    </button>
                  </div>
                </div>
                {importError ? (
                  <div className="import-error-row">
                    <p className="import-error" role="alert">{importError}</p>
                    <button type="button" className="secondary-button" onClick={useRecipeLinkOnly}>
                      Use link in form
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {isCreating && createStep === 'editor' ? (
          <form className="recipe-form" onSubmit={onSubmit}>
            <div className="form-header">
              <h2>{draft.id ? 'Edit recipe' : 'Create recipe'}</h2>
              <div className="form-actions">
                {!draft.id ? (
                  <button type="button" className="secondary-button" onClick={() => setCreateStep(editorReturnStep)}>
                    Back
                  </button>
                ) : null}
                <button type="button" className="secondary-button" onClick={cancelRecipeFlow}>
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
              <span>Description</span>
              <textarea
                value={draft.description ?? ''}
                onChange={(e) => updateDraft('description', e.target.value)}
                rows="3"
              />
            </label>

            <label>
              <span>Image URL</span>
              <input
                value={draft.image?.startsWith('data:image/') ? '' : draft.image ?? ''}
                onChange={(e) => updateDraft('image', e.target.value)}
                placeholder={draft.image?.startsWith('data:image/') ? 'Photo attached' : 'Optional image URL'}
              />
            </label>

            <div className="editor-photo-control">
              {draft.image?.startsWith('data:image/') ? (
                <img className="editor-photo-preview" src={draft.image} alt="Recipe preview" />
              ) : null}
              <label className="secondary-button file-picker">
                Upload photo
                <input type="file" accept="image/*" onChange={handlePhotoSelect} />
              </label>
              {isReadingPhoto ? <span>Reading photo text...</span> : null}
            </div>

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

            <section className="recipe-list-editor">
              <div className="list-editor-header">
                <h3>Ingredients</h3>
                <button type="button" className="secondary-button" onClick={() => addRecipeListRow('ingredients')}>
                  Add ingredient
                </button>
              </div>
              {(draft.ingredients.length ? draft.ingredients : ['']).map((ingredient, index) => (
                <div className="recipe-edit-row" key={`ingredient-${index}`}>
                  <input
                    aria-label={`Ingredient ${index + 1}`}
                    value={ingredient}
                    onChange={(event) => updateRecipeList('ingredients', index, event.target.value)}
                    placeholder="e.g. 2 cups flour"
                  />
                  <button
                    type="button"
                    className="secondary-button remove-row-button"
                    aria-label={`Remove ingredient ${index + 1}`}
                    onClick={() => removeRecipeListRow('ingredients', index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>

            <section className="recipe-list-editor">
              <div className="list-editor-header">
                <h3>Instructions</h3>
                <button type="button" className="secondary-button" onClick={() => addRecipeListRow('instructions')}>
                  Add step
                </button>
              </div>
              {(draft.instructions.length ? draft.instructions : ['']).map((instruction, index) => (
                <div className="recipe-edit-row" key={`instruction-${index}`}>
                  <textarea
                    aria-label={`Instruction step ${index + 1}`}
                    rows="2"
                    value={instruction}
                    onChange={(event) => updateRecipeList('instructions', index, event.target.value)}
                    placeholder={`Step ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="secondary-button remove-row-button"
                    aria-label={`Remove step ${index + 1}`}
                    onClick={() => removeRecipeListRow('instructions', index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>

            <label>
              <span>Notes</span>
              <textarea
                value={draft.notes ?? ''}
                onChange={(e) => updateDraft('notes', e.target.value)}
                rows="3"
                placeholder="Optional recipe notes"
              />
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

            <div className="form-grid">
              <label>
                <span>Rating</span>
                <select
                  value={Number(draft.rating ?? 0)}
                  onChange={(e) => updateDraft('rating', Number(e.target.value))}
                >
                  <option value={0}>Unrated</option>
                  <option value={0.5}>0.5</option>
                  <option value={1}>1.0</option>
                  <option value={1.5}>1.5</option>
                  <option value={2}>2.0</option>
                  <option value={2.5}>2.5</option>
                  <option value={3}>3.0</option>
                  <option value={3.5}>3.5</option>
                  <option value={4}>4.0</option>
                  <option value={4.5}>4.5</option>
                  <option value={5}>5.0</option>
                </select>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(draft.cooked)}
                  onChange={(e) => updateDraft('cooked', e.target.checked)}
                />
                <span>Cooked this recipe</span>
              </label>
            </div>

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

            {selectedRecipe.description ? <p className="recipe-description">{selectedRecipe.description}</p> : null}

            <div className="recipe-meta">
              <span>{selectedRecipe.servings} servings</span>
              <span>Prep {selectedRecipe.prepTime} min</span>
              <span>Cook {selectedRecipe.cookTime} min</span>
              <span>Total {Number(selectedRecipe.prepTime || 0) + Number(selectedRecipe.cookTime || 0)} min</span>
              <span>{selectedRecipe.cooked ? 'Cooked' : 'Not cooked'}</span>
              <span>{Number(selectedRecipe.rating || 0) > 0 ? `Rating ${Number(selectedRecipe.rating).toFixed(1)} / 5` : 'Unrated'}</span>
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

            {selectedRecipe.notes ? (
              <div className="detail-sections">
                <section>
                  <h3>Notes</h3>
                  <p>{selectedRecipe.notes}</p>
                </section>
              </div>
            ) : null}

            <div className="detail-sections">
              <section>
                <h3>Ingredients</h3>
                <ul>
                  {(selectedRecipe.ingredients || []).map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Instructions</h3>
                <ol>
                  {(selectedRecipe.instructions || []).map((instruction) => (
                    <li key={instruction}>{instruction}</li>
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
