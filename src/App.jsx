// App shell and top-level navigation.
// This file decides which page is visible (Recipes, Meal Plan, Groceries, Discover)
// and it also triggers the "Add recipe" action from the top navigation.
// If you want to add a new tab or change the app layout, start here.

import { useEffect, useState } from 'react'
import './App.css'
import RecipeLibrary from './RecipeLibrary'
import MealPlanPage from './pages/MealPlanPage'
import GroceriesPage from './pages/GroceriesPage'
import DiscoverPage from './pages/DiscoverPage'

const STORAGE_KEY = 'simmer-recipes-v1'
const DEFAULT_COOKBOOK = 'Uncategorized'

// Demo data used until the user adds or stores their own recipes.
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

function App() {
  // Tracks which section of the app is currently visible.
  const [activeTab, setActiveTab] = useState('recipes')

  // A one-time signal used to tell the recipe library to open a blank creation form.
  const [createRecipeRequested, setCreateRecipeRequested] = useState(false)

  // Keep the recipe list in localStorage so it persists across page refreshes.
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  // Route the selected app tab to the right page component.
  const renderPage = () => {
    if (activeTab === 'meal plan') {
      return <MealPlanPage recipes={recipes} />
    }

    if (activeTab === 'groceries') {
      return <GroceriesPage recipes={recipes} />
    }

    if (activeTab === 'discover') {
      return <DiscoverPage recipes={recipes} />
    }

    return (
      <RecipeLibrary
        recipes={recipes}
        setRecipes={setRecipes}
        createRecipeRequested={createRecipeRequested}
        setCreateRecipeRequested={setCreateRecipeRequested}
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

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            // Jump to the recipes screen and create a blank draft.
            setActiveTab('recipes')
            setCreateRecipeRequested(true)
          }}
        >
          Add recipe
        </button>
      </header>

      <main className="content-shell">{renderPage()}</main>
    </div>
  )
}

export default App
