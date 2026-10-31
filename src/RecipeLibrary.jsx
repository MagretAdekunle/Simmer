import { useEffect, useMemo, useState } from 'react'
import RecipesPage from './pages/RecipesPage'

const STORAGE_KEY = 'simmer-recipes-v1'
const BACKUP_KEY = 'simmer-backup-v1'
const DEFAULT_COOKBOOK = 'Uncategorized'

const getRecipeCookbooks = (recipe = {}) => {
  // Recipes can belong to multiple cookbooks, but we still keep one primary cookbook
  // so the app can display a single value in places like the recipe cards and detail view.
  const explicitCookbooks = Array.isArray(recipe.cookbooks) ? recipe.cookbooks : []
  const primaryCookbook = recipe.cookbook
  const values = [...explicitCookbooks, ...(primaryCookbook ? [primaryCookbook] : [])]

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
    cookbook: baseRecipe.cookbook ?? cookbooks[0] ?? DEFAULT_COOKBOOK,
    cookbooks: cookbooks.length ? cookbooks : [DEFAULT_COOKBOOK],
    cookbookComment: baseRecipe.cookbookComment ?? '',
    favorite: Boolean(baseRecipe.favorite),
  }
}

function RecipeLibrary({ recipes, setRecipes }) {
  // Selected recipe in the left sidebar.
  const [selectedId, setSelectedId] = useState(sampleRecipes[0]?.id ?? null)

  // Form mode: creating a new recipe vs editing an existing one.
  const [isCreating, setIsCreating] = useState(false)

  // Current form values for the create/edit form.
  const [draft, setDraft] = useState(toDraft())

  // Search and filter state for the recipe list.
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCollection, setActiveCollection] = useState('All')
  const [activeTag, setActiveTag] = useState('All')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Small status banner shown after actions like save, delete, and backup.
  const [statusMessage, setStatusMessage] = useState('')

  // 'all' shows everything; 'cookbooks' shows only cookbook filtered results.
  const [recipeView, setRecipeView] = useState('all')

  // Currently selected cookbook in cookbook view.
  const [selectedCookbook, setSelectedCookbook] = useState(null)

  // Toggle whether the user is creating a new cookbook.
  const [isOrganizing, setIsOrganizing] = useState(false)

  // Name of the new cookbook being created.
  const [cookbookInput, setCookbookInput] = useState('')

  // Recipe ids selected when building a new cookbook.
  const [organizeSelectedIds, setOrganizeSelectedIds] = useState([])

  // Persist recipe state to browser storage after every change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  // Auto-clear toast-like success messages.
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 1800)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [statusMessage])

  // All unique collection names used across all stored recipes.
  const allCollections = useMemo(
    () => ['All', ...new Set(recipes.flatMap((recipe) => recipe.collections || []))],
    [recipes],
  )

  // All unique tag names used across all stored recipes.
  const allTags = useMemo(
    () => ['All', ...new Set(recipes.flatMap((recipe) => recipe.tags || []))],
    [recipes],
  )

  // Cookbook names used in the cookbook filter panel.
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

  // Number of recipes assigned to each cookbook.
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

  // Main search + filter logic for the recipe list.
  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return recipes.filter((recipe) => {
      const matchesSearch =
        !normalizedSearch ||
        recipe.name.toLowerCase().includes(normalizedSearch) ||
        (recipe.ingredients || []).some((item) => item.toLowerCase().includes(normalizedSearch))

      const matchesCollection =
        activeCollection === 'All' ||
        (recipe.collections || []).includes(activeCollection)

      const matchesTag = activeTag === 'All' || (recipe.tags || []).includes(activeTag)
      const matchesFavorite = !showFavoritesOnly || recipe.favorite

      return matchesSearch && matchesCollection && matchesTag && matchesFavorite
    })
  }, [recipes, searchTerm, activeCollection, activeTag, showFavoritesOnly])

  // Filter recipes to just the recipes inside the currently selected cookbook.
  const filteredCookbookRecipes = useMemo(() => {
    return filteredRecipes.filter((recipe) => {
      const recipeCookbooks = getRecipeCookbooks(recipe)
      return recipeCookbooks.includes(selectedCookbook)
    })
  }, [filteredRecipes, selectedCookbook])

  // Keep the selected recipe aligned with whatever list is currently visible.
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
  const resetDraft = () => {
    setDraft(toDraft())
  }

  // Save new recipe or update an existing one.
  // This is the central place to edit when changing recipe fields or adding new ones.
  const handleSubmit = (event) => {
    event.preventDefault()

    // Keep a primary cookbook for older single-value fields while also supporting
    // multiple cookbook membership in the new `cookbooks` array.
    const parsedCookbooks = parseCookbookList(draft.cookbooks || draft.cookbook)
    const primaryCookbook = draft.cookbook?.trim() || parsedCookbooks[0] || DEFAULT_COOKBOOK
    const normalizedCookbooks = [...new Set([primaryCookbook, ...parsedCookbooks])]

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
      collections: parseIngredientList(draft.collections),
      tags: parseIngredientList(draft.tags),
      cookbook: primaryCookbook,
      cookbooks: normalizedCookbooks,
      cookbookComment: draft.cookbookComment?.trim() ?? '',
      favorite: Boolean(draft.favorite),
    }

    if (draft.id) {
      setRecipes((currentRecipes) =>
        currentRecipes.map((recipe) =>
          recipe.id === draft.id ? recipePayload : recipe,
        ),
      )
      setStatusMessage('Recipe updated')
      setSelectedId(draft.id)
    } else {
      setRecipes((currentRecipes) => [recipePayload, ...currentRecipes])
      setStatusMessage('Recipe added')
      setSelectedId(recipePayload.id)
    }

    setIsCreating(false)
    setRecipeView('all')
    resetDraft()
  }

  // Populate the edit form with the selected recipe.
  const handleEdit = () => {
    if (!selectedRecipe) return

    setIsCreating(true)
    setRecipeView('all')
    setDraft(toDraft(selectedRecipe))
  }

  // Remove a recipe from the list and reset the editor.
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

  // Toggle favorite status without leaving the current screen.
  const toggleFavorite = (recipeId) => {
    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === recipeId ? { ...recipe, favorite: !recipe.favorite } : recipe,
      ),
    )
    setStatusMessage('Favorite updated')
  }

  // Export the current library as JSON so it can be backed up or shared.
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

  // Save a browser backup of the current library.
  const backupRecipes = () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(recipes))
    setStatusMessage('Backup saved')
  }

  // Start a new blank recipe draft.
  const startCreate = () => {
    setIsCreating(true)
    setRecipeView('all')
    setSelectedId(null)
    setDraft(toDraft())
  }

  // Toggle recipe selection when creating a cookbook from multiple recipes.
  const toggleCookbookSelection = (recipeId) => {
    setOrganizeSelectedIds((currentSelection) =>
      currentSelection.includes(recipeId)
        ? currentSelection.filter((id) => id !== recipeId)
        : [...currentSelection, recipeId],
    )
  }

  // Create a new cookbook and add the selected recipes to it.
  // This keeps existing cookbook membership intact while adding the new cookbook.
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
        const primaryCookbook =
          recipe.cookbook && recipe.cookbook !== DEFAULT_COOKBOOK ? recipe.cookbook : trimmedName

        return {
          ...recipe,
          cookbook: primaryCookbook,
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
        activeCollection={activeCollection}
        setActiveCollection={setActiveCollection}
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
        onStartCreate={startCreate}
        allCollections={allCollections}
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
        cookbookCounts={cookbookCounts}
      />
    </>
  )
}

export default RecipeLibrary
