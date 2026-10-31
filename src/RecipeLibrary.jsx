// Central recipe data owner and editor logic.
// This file holds the app's recipe state, filtering, cookbook logic, and create/edit workflow.
// If you want to change how recipes are stored, saved, filtered, or assigned to cookbooks,
// this is the main place to edit before touching the page-level UI.

import { useEffect, useMemo, useState } from 'react'
import RecipesPage from './pages/RecipesPage'

const STORAGE_KEY = 'simmer-recipes-v1'
const BACKUP_KEY = 'simmer-backup-v1'
const DEFAULT_COOKBOOK = 'Uncategorized'

// Combine all cookbook names attached to a recipe.
// This keeps the app cookbook-aware without requiring a separate primary cookbook field.
const getRecipeCookbooks = (recipe = {}) => {
  const explicitCookbooks = Array.isArray(recipe.cookbooks) ? recipe.cookbooks : []
  const legacyCookbook = recipe.cookbook
  const values = [...explicitCookbooks, ...(legacyCookbook ? [legacyCookbook] : [])]

  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))]
}

// Blank recipe used by the create form.
// Update this if you add new recipe fields (for example: meal type, budget, or notes).
const createBlankRecipe = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `recipe-${Date.now()}`,
  name: '',
  ingredients: [],
  instructions: [],
  image: '',
  sourceLink: '',
  servings: 2,
  prepTime: 0,
  cookTime: 0,
  collections: [],
  tags: [],
  cookbook: DEFAULT_COOKBOOK,
  cookbooks: [DEFAULT_COOKBOOK],
  cookbookComment: '',
  favorite: false,
})

// Demo data shown when no recipe data exists in localStorage.
// Replace or expand these examples to fit your real cookbook content.
const sampleRecipes = [
  {
    id: 'taco-bowl',
    name: 'Citrus Chicken Taco Bowl',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
    sourceLink: 'https://www.example.com/recipes/citrus-chicken-taco-bowl',
    servings: 4,
    prepTime: 20,
    cookTime: 25,
    ingredients: [
      '2 chicken breasts',
      '1 tbsp olive oil',
      '1 tsp chili powder',
      '1 cup brown rice',
      '1 avocado',
      '1 cup black beans',
      '1 cup corn',
      '1 lime',
      '1/2 cup salsa',
      '1/4 cup cilantro',
    ],
    instructions: [
      'Season the chicken with olive oil, chili powder, salt, and pepper.',
      'Cook the chicken in a skillet until golden and fully cooked, then slice it.',
      'Warm the rice, black beans, and corn until hot and fluffy.',
      'Build each bowl with rice, chicken, beans, corn, avocado, salsa, and cilantro.',
      'Finish with fresh lime juice and serve warm.',
    ],
    collections: ['Dinner', 'Weeknight'],
    tags: ['high-protein', 'family-favorite'],
    cookbook: 'Weeknight Favorites',
    cookbooks: ['Weeknight Favorites'],
    favorite: true,
  },
  {
    id: 'vegetable-pasta',
    name: 'Roasted Veggie Pasta',
    image:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80',
    sourceLink: 'https://www.example.com/recipes/roasted-veggie-pasta',
    servings: 3,
    prepTime: 15,
    cookTime: 30,
    ingredients: [
      '250g pasta',
      '1 zucchini',
      '1 red bell pepper',
      '1 red onion',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1/2 cup parmesan',
      '1 tbsp lemon zest',
      '1/4 cup basil',
    ],
    instructions: [
      'Roast the vegetables with olive oil and garlic until tender and lightly charred.',
      'Cook pasta according to package directions and reserve a little pasta water.',
      'Toss the pasta with roasted vegetables, parmesan, basil, and lemon zest.',
      'Loosen the sauce with a splash of pasta water if needed.',
      'Serve immediately with extra parmesan and herbs.',
    ],
    collections: ['Vegetarian', 'Meal prep'],
    tags: ['quick', 'comfort'],
    cookbook: DEFAULT_COOKBOOK,
    cookbooks: [DEFAULT_COOKBOOK],
    favorite: false,
  },
]

// Convert a comma/newline-separated string into an array of clean ingredient values.
const parseIngredientList = (value) =>
  value
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean)

// Used for populating textareas in the form.
// If you add a new field that is an array, add a matching formatter here.
const parseInstructionList = (value) =>
  value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)

// Cookbook names are entered as comma-separated or newline-separated text.
// This normalizes them into a unique array of cookbook names.
const parseCookbookList = (value) => {
  if (!value) return [DEFAULT_COOKBOOK]

  return [...new Set(
    String(value)
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  )]
}

// Convert stored recipe data into the shape used by the editor form.
// This is the main place to edit if a new recipe field needs to appear in the create/edit form.
const toDraft = (recipe = null) => {
  const baseRecipe = recipe ?? createBlankRecipe()
  const cookbooks = getRecipeCookbooks(baseRecipe)

  return {
    ...baseRecipe,
    ingredients: Array.isArray(baseRecipe.ingredients)
      ? baseRecipe.ingredients.join(',\n')
      : '',
    instructions: Array.isArray(baseRecipe.instructions)
      ? baseRecipe.instructions.join('\n')
      : '',
    collections: Array.isArray(baseRecipe.collections)
      ? baseRecipe.collections.join(', ')
      : '',
    tags: Array.isArray(baseRecipe.tags) ? baseRecipe.tags.join(', ') : '',
    sourceLink: baseRecipe.sourceLink ?? '',
    image: baseRecipe.image ?? '',
    servings: baseRecipe.servings ?? 2,
    prepTime: baseRecipe.prepTime ?? 0,
    cookTime: baseRecipe.cookTime ?? 0,
    cookbook: cookbooks[0] ?? DEFAULT_COOKBOOK,
    cookbooks: cookbooks.length ? cookbooks : [DEFAULT_COOKBOOK],
    cookbookComment: baseRecipe.cookbookComment ?? '',
    favorite: Boolean(baseRecipe.favorite),
  }
}

function RecipeLibrary({ recipes, setRecipes, createRecipeRequested, setCreateRecipeRequested }) {
  // State shape:
  // - selectedId: recipe currently highlighted in the list
  // - isCreating: whether the user is viewing the create/edit form instead of the gallery
  // - draft: the editable copy of the recipe being created or edited
  // - searchTerm / activeTag / showFavoritesOnly: UI filters for the main recipe list
  // - recipeView: 'all' or 'cookbooks' changes whether the list is filtered by all recipes or cookbook grouping
  // - selectedCookbook: active cookbook filter when the user browses cookbook view
  // - organizeSelectedIds: recipe ids chosen for a cookbook creation batch
  // This state is the source of truth for recipe data and page behavior.
  const [selectedId, setSelectedId] = useState(sampleRecipes[0]?.id ?? null)

  // Form mode: creating a new recipe vs editing an existing one.
  // When a user clicks Add recipe or Edit, this flips to true and the form appears.
  const [isCreating, setIsCreating] = useState(false)

  // Current form values for the create/edit form.
  // This is intentionally a separate draft object so users can change inputs freely
  // before saving back into the main recipes array.
  const [draft, setDraft] = useState(toDraft())

  // Search and filter state for the main recipe list.
  // These filters are applied before the grid or detail view is rendered.
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Status banner appears after actions like save, delete, export, and cookbook creation.
  // It auto-clears after a short delay so the screen doesn't get cluttered.
  const [statusMessage, setStatusMessage] = useState('')

  // 'all' shows everything; 'cookbooks' switches the list to filter by cookbook membership.
  const [recipeView, setRecipeView] = useState('all')

  // The cookbook currently selected in cookbook mode.
  // This is used to narrow the recipe list to recipes assigned to one cookbook.
  const [selectedCookbook, setSelectedCookbook] = useState(null)

  // Toggle whether the user is creating a new cookbook from the selected recipes.
  const [isOrganizing, setIsOrganizing] = useState(false)

  // Name of the new cookbook being created from the organization panel.
  const [cookbookInput, setCookbookInput] = useState('')

  // Recipe ids selected when building a new cookbook.
  // This allows multi-select behavior before creating a cookbook group.
  const [organizeSelectedIds, setOrganizeSelectedIds] = useState([])

  // When the top navigation requests a new recipe, this effect opens the blank form.
  // The request flag is fired by App.jsx and then reset immediately after startCreate().
  useEffect(() => {
    if (!createRecipeRequested) {
      return
    }

    startCreate()
    setCreateRecipeRequested(false)
  }, [createRecipeRequested, setCreateRecipeRequested])

  // Keep recipe data synced with localStorage after each change.
  // This gives the app persistence across refreshes without any backend service.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  // Auto-clear the status banner after a short time.
  // This keeps the app feeling lightweight while still giving feedback after actions.
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 1800)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [statusMessage])

  // Build the tag list shown in the sidebar.
  // It includes a synthetic 'All' option before all unique tags from the current library.
  const allTags = useMemo(
    () => ['All', ...new Set(recipes.flatMap((recipe) => recipe.tags || []))],
    [recipes],
  )

  // Build the cookbook filter list.
  // The default 'Uncategorized' option stays present so recipes without a cookbooks value still show up.
  const cookbookNames = useMemo(() => {
    const names = new Set([DEFAULT_COOKBOOK])

    recipes.forEach((recipe) => {
      const recipeCookbooks = getRecipeCookbooks(recipe)
      recipeCookbooks.forEach((name) => {
        if (name && name !== DEFAULT_COOKBOOK) {
          names.add(name)
        }
      })
    })

    return Array.from(names).sort((firstName, secondName) => {
      if (firstName === DEFAULT_COOKBOOK) return -1
      if (secondName === DEFAULT_COOKBOOK) return 1
      return firstName.localeCompare(secondName)
    })
  }, [recipes])

  // Count how many recipes belong to each cookbook.
  // This drives the small badge beside each cookbook chip in the sidebar.
  const cookbookCounts = useMemo(() => {
    const counts = {}

    recipes.forEach((recipe) => {
      const names = getRecipeCookbooks(recipe)
      if (!names.length) {
        counts[DEFAULT_COOKBOOK] = (counts[DEFAULT_COOKBOOK] || 0) + 1
        return
      }

      names.forEach((name) => {
        counts[name] = (counts[name] || 0) + 1
      })
    })

    return counts
  }, [recipes])

  // The main list shown in the recipe view.
  // This applies the text search, tag filter, and favorites filter before any cookbook filtering.
  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return recipes.filter((recipe) => {
      const matchesSearch =
        !normalizedSearch ||
        recipe.name.toLowerCase().includes(normalizedSearch) ||
        (recipe.ingredients || []).some((item) => item.toLowerCase().includes(normalizedSearch))

      const matchesTag = activeTag === 'All' || (recipe.tags || []).includes(activeTag)
      const matchesFavorite = !showFavoritesOnly || recipe.favorite

      return matchesSearch && matchesTag && matchesFavorite
    })
  }, [recipes, searchTerm, activeTag, showFavoritesOnly])

  // When the user picks a cookbook, narrow the filtered list to only recipes assigned to that cookbook.
  const filteredCookbookRecipes = useMemo(() => {
    return filteredRecipes.filter((recipe) => {
      const recipeCookbooks = getRecipeCookbooks(recipe)
      return recipeCookbooks.includes(selectedCookbook)
    })
  }, [filteredRecipes, selectedCookbook])

  // Keep selectedId aligned with whatever recipe list is currently visible.
  // This prevents the selected recipe from pointing at an item that is no longer in the current filter view.
  useEffect(() => {
    const visibleRecipes = recipeView === 'cookbooks' ? filteredCookbookRecipes : filteredRecipes

    if (!visibleRecipes.length) {
      setSelectedId(null)
      return
    }

    if (!selectedId || !visibleRecipes.some((recipe) => recipe.id === selectedId)) {
      setSelectedId(visibleRecipes[0].id)
    }
  }, [filteredCookbookRecipes, filteredRecipes, recipeView, selectedId])

  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? null

  // Reset the form back to a blank create-mode draft.
  // This is used after canceling a save or after a recipe is deleted.
  const resetDraft = () => {
    setDraft(toDraft())
  }

  // Save path for both create and edit.
  // The key idea is: user edits a draft object, then we convert that draft back into
  // a real recipe object and swap it into the array at the right moment.
  const handleSubmit = (event) => {
    event.preventDefault()

    const cookbookInputValue = Array.isArray(draft.cookbooks)
      ? draft.cookbooks.join(', ')
      : draft.cookbooks || ''

    const normalizedCookbooks = parseCookbookList(cookbookInputValue)
    const firstCookbook = normalizedCookbooks[0] || DEFAULT_COOKBOOK

    const recipePayload = {
      id: draft.id || (crypto.randomUUID ? crypto.randomUUID() : `recipe-${Date.now()}`),
      name: draft.name.trim() || 'Untitled recipe',
      ingredients: parseIngredientList(draft.ingredients),
      instructions: parseInstructionList(draft.instructions),
      image: draft.image.trim(),
      sourceLink: draft.sourceLink.trim(),
      servings: Number(draft.servings) || 1,
      prepTime: Number(draft.prepTime) || 0,
      cookTime: Number(draft.cookTime) || 0,
      tags: parseIngredientList(draft.tags),
      cookbook: firstCookbook,
      cookbooks: normalizedCookbooks,
      cookbookComment: draft.cookbookComment?.trim() ?? '',
      favorite: Boolean(draft.favorite),
    }

    if (draft.id) {
      // Existing recipe: replace the matching item in the library.
      setRecipes((currentRecipes) =>
        currentRecipes.map((recipe) =>
          recipe.id === draft.id ? recipePayload : recipe,
        ),
      )
      setStatusMessage('Recipe updated')
      setSelectedId(draft.id)
    } else {
      // New recipe: add it to the front of the list so it immediately appears in the grid.
      setRecipes((currentRecipes) => [recipePayload, ...currentRecipes])
      setStatusMessage('Recipe added')
      setSelectedId(recipePayload.id)
    }

    setIsCreating(false)
    setRecipeView('all')
    resetDraft()
  }

  // Open the form with a selected recipe's data.
  // This is the main edit flow: data is copied from the selected recipe into the draft object,
  // then form controls mutate that draft until Save is clicked.
  const handleEdit = () => {
    if (!selectedRecipe) return

    setIsCreating(true)
    setRecipeView('all')
    setDraft(toDraft(selectedRecipe))
  }

  // Remove a recipe from the saved library.
  // After deleting, the editor is closed and the selection is cleared if the deleted recipe was active.
  const handleDelete = (recipeId) => {
    setRecipes((currentRecipes) => currentRecipes.filter((recipe) => recipe.id !== recipeId))
    setStatusMessage('Recipe deleted')
    setIsCreating(false)
    setRecipeView('all')
    resetDraft()
    if (selectedId === recipeId) {
      setSelectedId(null)
    }
  }

  // Toggle favorite status without leaving the current view.
  // This keeps the UI quick and avoids forcing the user back to the main page.
  const toggleFavorite = (recipeId) => {
    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === recipeId ? { ...recipe, favorite: !recipe.favorite } : recipe,
      ),
    )
    setStatusMessage('Favorite updated')
  }

  // Export the current library as JSON for a manual backup or shared file.
  const exportRecipes = () => {
    const json = JSON.stringify(recipes, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.href = url
    link.download = 'simmer-export.json'
    link.click()
    URL.revokeObjectURL(url)
    setStatusMessage('Data exported')
  }

  // Save a browser backup in localStorage.
  // This is a lightweight backup for the current app state and should be kept separate from the main recipe key.
  const backupRecipes = () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(recipes))
    setStatusMessage('Backup saved')
  }

  // Cancel the create/edit form.
  // This closes the editor and clears any draft data so the user returns to the default list view.
  const cancelCreateOrEdit = () => {
    setIsCreating(false)
    setRecipeView('all')
    resetDraft()
  }

  // Start a brand-new recipe from scratch.
  // This clears the current selected recipe and creates a blank draft with default values.
  const startCreate = () => {
    setIsCreating(true)
    setRecipeView('all')
    setSelectedId(null)
    setDraft(toDraft())
  }

  // Toggle recipe selection inside the cookbook creation panel.
  // Multiple recipe ids can be chosen before creating a new cookbook group.
  const toggleCookbookSelection = (recipeId) => {
    setOrganizeSelectedIds((currentSelection) =>
      currentSelection.includes(recipeId)
        ? currentSelection.filter((id) => id !== recipeId)
        : [...currentSelection, recipeId],
    )
  }

  // Create or update a cookbook.
  // When selectedCookbook is set, this acts as an edit flow for that existing group.
  const saveCookbook = () => {
    const trimmedName = cookbookInput.trim()

    if (!trimmedName) {
      setStatusMessage('Name your cookbook first')
      return
    }

    const isEditingExistingCookbook = Boolean(selectedCookbook)

    if (isEditingExistingCookbook && selectedCookbook !== trimmedName && cookbookNames.includes(trimmedName)) {
      setStatusMessage('That cookbook already exists')
      return
    }

    if (!isEditingExistingCookbook && cookbookNames.includes(trimmedName)) {
      setStatusMessage('That cookbook already exists')
      return
    }

    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) => {
        const belongsToCookbook = getRecipeCookbooks(recipe).includes(selectedCookbook)
        const shouldInclude = organizeSelectedIds.includes(recipe.id)
        const safeCookbookName = isEditingExistingCookbook ? selectedCookbook : trimmedName

        if (isEditingExistingCookbook) {
          const updatedCookbooks = getRecipeCookbooks(recipe).filter((name) => name !== safeCookbookName)
          const nextCookbooks = shouldInclude
            ? [...new Set([...updatedCookbooks, trimmedName])]
            : updatedCookbooks

          const fallbackCookbook = nextCookbooks[0] || DEFAULT_COOKBOOK
          const updatedRecipe = {
            ...recipe,
            cookbook: nextCookbooks.includes(recipe.cookbook) ? recipe.cookbook : fallbackCookbook,
            cookbooks: nextCookbooks,
          }

          return updatedRecipe
        }

        if (shouldInclude) {
          const existingCookbooks = getRecipeCookbooks(recipe)
          const nextCookbooks = [...new Set([...existingCookbooks, trimmedName])]
          const fallbackCookbook = nextCookbooks[0] || DEFAULT_COOKBOOK

          return {
            ...recipe,
            cookbook: fallbackCookbook,
            cookbooks: nextCookbooks,
          }
        }

        return recipe
      }),
    )

    if (isEditingExistingCookbook) {
      setRecipes((currentRecipes) =>
        currentRecipes.map((recipe) => {
          const originalCookbook = selectedCookbook
          const hasOldName = getRecipeCookbooks(recipe).includes(originalCookbook)
          if (!hasOldName) {
            return recipe
          }

          const renamedCookbooks = getRecipeCookbooks(recipe).map((name) =>
            name === originalCookbook ? trimmedName : name,
          )

          return {
            ...recipe,
            cookbook: renamedCookbooks[0] || DEFAULT_COOKBOOK,
            cookbooks: [...new Set(renamedCookbooks)],
          }
        }),
      )
    }

    setSelectedCookbook(trimmedName)
    setRecipeView('cookbooks')
    setIsOrganizing(false)
    setOrganizeSelectedIds([])
    setCookbookInput('')
    setStatusMessage(
      isEditingExistingCookbook ? `Cookbook "${trimmedName}" updated` : `Cookbook "${trimmedName}" created`,
    )
  }

  const deleteCookbook = (cookbookName = selectedCookbook) => {
    if (!cookbookName) return

    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) => {
        const existingCookbooks = getRecipeCookbooks(recipe).filter((name) => name !== cookbookName)
        const fallbackCookbook = existingCookbooks[0] || DEFAULT_COOKBOOK

        return {
          ...recipe,
          cookbook: existingCookbooks.includes(recipe.cookbook) ? recipe.cookbook : fallbackCookbook,
          cookbooks: existingCookbooks,
        }
      }),
    )

    setSelectedCookbook(null)
    setRecipeView('all')
    setIsOrganizing(false)
    setOrganizeSelectedIds([])
    setCookbookInput('')
    setStatusMessage(`Cookbook "${cookbookName}" deleted`)
  }

  // Create a new cookbook by assigning selected recipes to it.
  // This keeps recipe membership additive instead of destructive, so recipes can appear in many cookbooks.
  const createCookbook = () => {
    const trimmedName = cookbookInput.trim()

    if (!trimmedName) {
      setStatusMessage('Name your cookbook first')
      return
    }

    if (cookbookNames.includes(trimmedName)) {
      setStatusMessage('That cookbook already exists')
      return
    }

    if (!organizeSelectedIds.length) {
      setStatusMessage('Select at least one recipe')
      return
    }

    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) => {
        if (!organizeSelectedIds.includes(recipe.id)) {
          return recipe
        }

        const existingCookbooks = getRecipeCookbooks(recipe)
        const nextCookbooks = [...new Set([...existingCookbooks, trimmedName])]
        const fallbackCookbook = nextCookbooks[0] || DEFAULT_COOKBOOK

        return {
          ...recipe,
          cookbook: fallbackCookbook,
          cookbooks: nextCookbooks,
        }
      }),
    )

    setSelectedCookbook(trimmedName)
    setRecipeView('cookbooks')
    setIsOrganizing(false)
    setOrganizeSelectedIds([])
    setCookbookInput('')
    setStatusMessage(`Cookbook "${trimmedName}" created`)
  }

  // When a cookbook is selected, keep the input box in sync so the user can rename it immediately.
  useEffect(() => {
    if (selectedCookbook) {
      setCookbookInput(selectedCookbook)
      setOrganizeSelectedIds(
        recipes
          .filter((recipe) => getRecipeCookbooks(recipe).includes(selectedCookbook))
          .map((recipe) => recipe.id),
      )
    }
  }, [selectedCookbook, recipes])

  return (
    <>
      {statusMessage ? <div className="status-banner">{statusMessage}</div> : null}
      <RecipesPage
        recipes={recipeView === 'cookbooks' ? filteredCookbookRecipes : filteredRecipes}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        draft={draft}
        setDraft={setDraft}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        showFavoritesOnly={showFavoritesOnly}
        setShowFavoritesOnly={setShowFavoritesOnly}
        selectedRecipe={selectedRecipe}
        onSubmit={handleSubmit}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleFavorite={toggleFavorite}
        onExport={exportRecipes}
        onBackup={backupRecipes}
        onCancel={cancelCreateOrEdit}
        onStartCreate={startCreate}
        allTags={allTags}
        recipeView={recipeView}
        setRecipeView={setRecipeView}
        cookbookNames={cookbookNames}
        selectedCookbook={selectedCookbook}
        setSelectedCookbook={setSelectedCookbook}
        isOrganizing={isOrganizing}
        setIsOrganizing={setIsOrganizing}
        cookbookInput={cookbookInput}
        setCookbookInput={setCookbookInput}
        organizeSelectedIds={organizeSelectedIds}
        toggleCookbookSelection={toggleCookbookSelection}
        onCreateCookbook={createCookbook}
        onSaveCookbook={saveCookbook}
        onDeleteCookbook={deleteCookbook}
        cookbookCounts={cookbookCounts}
      />
    </>
  )
}

export default RecipeLibrary
