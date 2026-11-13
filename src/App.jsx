import { useEffect, useState } from 'react'
import './App.css'
import RecipeLibrary from './RecipeLibrary'
import MealPlanPage from './pages/MealPlanPage'
import GroceriesPage from './pages/GroceriesPage'
import DiscoverPage from './pages/DiscoverPage'
import ProfilePage from './pages/ProfilePage'
import PantryPage from './pages/PantryPage'

// This file decides which page is visible (Recipes, Meal Plan, Groceries, Discover)
// If you want to add a new tab or change the app layout, start here.


const STORAGE_KEY = 'simmer-recipes-v1'
const GOALS_STORAGE_KEY = 'simmer-nutrition-goals-v1'
const WEIGHT_ENTRIES_STORAGE_KEY = 'simmer-weight-entries-v1'
const GROCERIES_STORAGE_KEY = 'simmer-groceries-v1'
const MEAL_PLAN_STORAGE_KEY = 'simmer-meal-plan-v1'
const DEFAULT_COOKBOOK = 'Uncategorized'
const DEFAULT_GOALS = {
  weightGoal: '',
  weightUnit: 'lb',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
}

const navigationTabs = [
  { id: 'recipes', label: 'Recipes', icon: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5zM4 7h16M8 3v4' },
  { id: 'meal plan', label: 'Meal Plan', icon: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1zM8 13h3m2 0h3m-8 3h3' },
  { id: 'groceries', label: 'Groceries', icon: 'M3 5h2l2.2 10.1a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6M10 20h.01M17 20h.01' },
  { id: 'discover', label: 'Discover', icon: 'M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 6l1.5 3.5L17 11l-3.5 1.5L12 16l-1.5-3.5L7 11l3.5-1.5z' },
  { id: 'pantry', label: 'Pantry', icon: 'M5 7h14l-1 14H6L5 7zm2 0V5a5 5 0 0 1 10 0v2m-5 4v5' },
]

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

  const [nutritionGoals, setNutritionGoals] = useState(() => {
    const storedGoals = localStorage.getItem(GOALS_STORAGE_KEY)
    if (!storedGoals) return DEFAULT_GOALS

    try {
      return { ...DEFAULT_GOALS, ...JSON.parse(storedGoals) }
    } catch {
      return DEFAULT_GOALS
    }
  })

  const [weightEntries, setWeightEntries] = useState(() => {
    try {
      const storedEntries = JSON.parse(localStorage.getItem(WEIGHT_ENTRIES_STORAGE_KEY) || '[]')
      return Array.isArray(storedEntries) ? storedEntries : []
    } catch {
      return []
    }
  })

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

  const [groceryItems, setGroceryItems] = useState(() => {
    try {
      const storedItems = JSON.parse(localStorage.getItem(GROCERIES_STORAGE_KEY) || '[]')
      return Array.isArray(storedItems) ? storedItems : []
    } catch {
      return []
    }
  })

  const [mealPlan, setMealPlan] = useState(() => {
    try {
      const storedPlan = JSON.parse(localStorage.getItem(MEAL_PLAN_STORAGE_KEY) || '[]')
      return Array.isArray(storedPlan) ? storedPlan : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
  }, [recipes])

  useEffect(() => {
    localStorage.setItem(GROCERIES_STORAGE_KEY, JSON.stringify(groceryItems))
  }, [groceryItems])

  useEffect(() => {
    localStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(mealPlan))
  }, [mealPlan])

  useEffect(() => {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(nutritionGoals))
  }, [nutritionGoals])

  useEffect(() => {
    localStorage.setItem(WEIGHT_ENTRIES_STORAGE_KEY, JSON.stringify(weightEntries))
  }, [weightEntries])

  // Route the selected app tab to the right page component.
  const renderPage = () => {
    if (activeTab === 'meal plan') {
      return (
        <MealPlanPage
          recipes={recipes}
          mealPlan={mealPlan}
          setMealPlan={setMealPlan}
          nutritionGoals={nutritionGoals}
        />
      )
    }

    if (activeTab === 'groceries') {
      return <GroceriesPage recipes={recipes} groceryItems={groceryItems} setGroceryItems={setGroceryItems} />
    }

    if (activeTab === 'discover') {
      return <DiscoverPage recipes={recipes} />
    }

    if (activeTab === 'profile') {
      return (
        <ProfilePage
          recipes={recipes}
          nutritionGoals={nutritionGoals}
          onSaveNutritionGoals={setNutritionGoals}
          weightEntries={weightEntries}
          onSaveWeightEntries={setWeightEntries}
        />
      )
    }

    if (activeTab === 'pantry') {
      return <PantryPage recipes={recipes} />
    }

    return (
      <RecipeLibrary
        recipes={recipes}
        setRecipes={setRecipes}
        groceryItems={groceryItems}
        setGroceryItems={setGroceryItems}
        onSetMealPlan={setMealPlan}
        nutritionGoals={nutritionGoals}
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
          {navigationTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={tab.icon} />
              </svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="nav-actions">

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setActiveTab('recipes')
              setCreateRecipeRequested(true)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add recipe
          </button>

          <button
            type="button"
            className="profile-button"
            aria-label="Profile"
            onClick={() => setActiveTab('profile')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12Zm0 1.75c-3.25 0-6 1.87-6 4.19V19h12v-.06c0-2.32-2.75-4.19-6-4.19Z" />
            </svg>
          </button>

        </div>
      </header>

      <main className="content-shell">{renderPage()}</main>
    </div>
  )
}

export default App
