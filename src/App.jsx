import { useEffect, useMemo, useState } from 'react'
import './App.css'
import RecipesPage from './pages/RecipesPage'
import MealPlanPage from './pages/MealPlanPage'
import GroceriesPage from './pages/GroceriesPage'
import DiscoverPage from './pages/DiscoverPage'

const STORAGE_KEY = 'simmer-recipes-v1'
const BACKUP_KEY = 'simmer-backup-v1'

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
  favorite: false,
})

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
    favorite: false,
  },
]

const parseIngredientList = (value) =>
  value
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean)

const parseInstructionList = (value) =>
  value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)

const formatMinutes = (value) => (value ? `${value} min` : '—')

const toDraft = (recipe = null) => {
  const baseRecipe = recipe ?? createBlankRecipe()

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
    favorite: Boolean(baseRecipe.favorite),
  }
}

function App() {
  const [recipes, setRecipes] = useState(() => {
    const storedRecipes = localStorage.getItem(STORAGE_KEY)
    if (!storedRecipes) {
      return sampleRecipes
    }

    try {
      return JSON.parse(storedRecipes)
    } catch {
      return sampleRecipes
    }
  })

  const [selectedId, setSelectedId] = useState(sampleRecipes[0]?.id ?? null)
  const [isCreating, setIsCreating] = useState(false)
  const [draft, setDraft] = useState(toDraft())
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCollection, setActiveCollection] = useState('All')
  const [activeTag, setActiveTag] = useState('All')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [activeTab, setActiveTab] = useState('recipes')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(''), 1800)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [statusMessage])

  const allCollections = useMemo(
    () => ['All', ...new Set(recipes.flatMap((recipe) => recipe.collections || []))],
    [recipes],
  )

  const allTags = useMemo(
    () => ['All', ...new Set(recipes.flatMap((recipe) => recipe.tags || []))],
    [recipes],
  )

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return recipes.filter((recipe) => {
      const matchesSearch =
        !normalizedSearch ||
        recipe.name.toLowerCase().includes(normalizedSearch) ||
        recipe.ingredients.some((item) => item.toLowerCase().includes(normalizedSearch))

      const matchesCollection =
        activeCollection === 'All' ||
        (recipe.collections || []).includes(activeCollection)

      const matchesTag = activeTag === 'All' || (recipe.tags || []).includes(activeTag)
      const matchesFavorite = !showFavoritesOnly || recipe.favorite

      return matchesSearch && matchesCollection && matchesTag && matchesFavorite
    })
  }, [recipes, searchTerm, activeCollection, activeTag, showFavoritesOnly])

  useEffect(() => {
    if (!filteredRecipes.length) {
      setSelectedId(null)
      return
    }

    if (!selectedId || !filteredRecipes.some((recipe) => recipe.id === selectedId)) {
      setSelectedId(filteredRecipes[0].id)
    }
  }, [filteredRecipes, selectedId])

  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedId) ?? null

  const resetDraft = () => {
    setDraft(toDraft())
  }

  const handleDraftChange = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

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
    setActiveTab('recipes')
    resetDraft()
  }

  const handleEdit = () => {
    if (!selectedRecipe) return

    setIsCreating(true)
    setActiveTab('recipes')
    setDraft(toDraft(selectedRecipe))
  }

  const handleDelete = (recipeId) => {
    setRecipes((currentRecipes) => currentRecipes.filter((recipe) => recipe.id !== recipeId))
    setStatusMessage('Recipe deleted')
    setIsCreating(false)
    setActiveTab('recipes')
    resetDraft()
    if (selectedId === recipeId) {
      setSelectedId(null)
    }
  }

  const toggleFavorite = (recipeId) => {
    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === recipeId ? { ...recipe, favorite: !recipe.favorite } : recipe,
      ),
    )
    setStatusMessage('Favorite updated')
  }

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

  const backupRecipes = () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(recipes))
    setStatusMessage('Backup saved')
  }

  const startCreate = () => {
    setActiveTab('recipes')
    setIsCreating(true)
    setSelectedId(null)
    setDraft(toDraft())
  }

  const renderPage = () => {
    if (activeTab === 'meal plan') {
      return <MealPlanPage />
    }

    if (activeTab === 'groceries') {
      return <GroceriesPage />
    }

    if (activeTab === 'discover') {
      return <DiscoverPage />
    }

    return (
      <RecipesPage
        recipes={recipes}
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
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand-block">
          <p className="eyebrow">Recipe library</p>
          <h1>Simmer</h1>
        </div>

        <nav className="nav-tabs" aria-label="Main navigation">
          {['recipes', 'meal plan', 'groceries', 'discover'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'meal plan' ? 'Meal Plan' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <button type="button" className="primary-button" onClick={startCreate}>
          Add recipe
        </button>
      </header>

      <main className="content-shell">
        {statusMessage ? <div className="status-banner">{statusMessage}</div> : null}
        {renderPage()}
      </main>
    </div>
  )
}

export default App
