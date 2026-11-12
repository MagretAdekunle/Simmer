# Simmer

Simmer is a React app for saving recipes, organizing them into cookbooks, and planning meals from what you already have at home.

Recipe data is stored in the browser. A small Node server handles recipe-link imports so recipe
websites do not need to allow cross-origin browser requests.

## Features

- Recipe library with create, edit, favorite, and delete flows
- Recipe details: ingredients, instructions, adjustable servings, US/metric measurements, prep time, cook time, image, and source link
- Import recipe details from websites that publish structured recipe metadata
- Cooking mode with guided steps, independent timers, serving scaling, and US/metric conversions
- Optional screen-awake support, plus editable cooking notes and substitutions
- Editable grocery list populated from recipe ingredients
- Editable, date-based weekly meal plan with previous/next week navigation
- Search recipes by name or ingredient text
- Filter by tags, favorites, and cookbook views
- Cookbook management with multi-cookbook assignment and cookbook notes
- Tabbed pages: Recipes, Meal Plan, Groceries, Discover, Pantry, and Profile
- Pantry-based recipe matching:
   - Add main ingredients you already have
   - Optionally add seasonings and toppings
   - See ranked recipe matches based on pantry overlap
- Local export/backup workflow for recipe data

## Tech Stack

- React
- Vite
- JavaScript (ES modules)
- Node.js server for recipe-link imports and development
- localStorage for persistence

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the app and its recipe-import endpoint:

```bash
npm run dev
```

3. Open the local URL shown in the terminal (usually http://localhost:5173/).

Recipe import works for sites that expose structured recipe data and allow server-side requests.
Some sites block automated requests (403) or do not publish structured recipe data. The importer
keeps the original link and lets you enter the recipe manually or paste its text instead.

To run the production app, build it and start the Node server:

```bash
npm run build
npm start
```

The production server listens on port `4173` by default and respects the `PORT` environment variable.
Deploy it to a Node.js host; static-only hosting does not provide the recipe-import endpoint.

## Scripts

```bash
npm run dev          # Start local dev server
npm run build        # Create production build
npm run preview      # Build and preview using the production server
npm start            # Start the production server (after building)
npm run lint         # Run oxlint
npm run lint:fix     # Auto-fix lint issues where possible
npm run format       # Run prettier write
npm run format:check # Check formatting
npm run typecheck    # Run TypeScript checker (no emit)
```

## Project Structure

```bash
server.js                         # Dev/production server and recipe import API
src/
  App.jsx                         # App shell, navigation, shared state and persistence
  App.css                         # Shared palette, buttons, navigation and global styles
  RecipeLibrary.jsx               # Recipe data, filters, cookbook actions and recipe callbacks
  planning.js                     # Shared meal types, dates and list-item ID helpers
  pages/
    RecipesPage.jsx               # Recipe library page coordinator and filter/grid UI
    RecipesPage.css               # Recipe library, import, editor and detail styles
    RecipeCreationFlow.jsx         # Add Recipe/Add Cookbook choice and import-method UI
    RecipeEditor.jsx               # Shared controlled form for creating/editing recipes
    RecipeDetail.jsx               # Recipe detail, grocery/meal-plan actions and cooking entry
    recipePageUtils.js             # Helpers shared by recipe creation/editor/detail components
    CookingMode.jsx               # Guided cooking steps, timers, serving scale and conversions
    CookingMode.css               # Cooking mode styles
    MealPlanPage.jsx              # Weekly planner, editable meal slots and macro totals
    MealPlanPage.css
    GroceriesPage.jsx             # Editable grocery checklist
    GroceriesPage.css
    DiscoverPage.jsx              # Recipe discovery and suggestions
    DiscoverPage.css
    PantryPage.jsx                # Pantry inputs and recipe matching
    PantryPage.css
    ProfilePage.jsx               # Profile summary and nutrition-goal editor
    ProfilePage.css
```

## How the App Is Connected

The app is organized around a shared-state parent and focused page components:

```text
App.jsx
├── navigation and active page
├── shared state: recipes, groceries, meal plan, nutrition goals
├── RecipeLibrary.jsx (when Recipes is active)
│   └── pages/RecipesPage.jsx
│       ├── RecipeCreationFlow.jsx
│       ├── RecipeEditor.jsx
│       ├── RecipeDetail.jsx
│       │   └── CookingMode.jsx
│       └── RecipesPage.css
├── pages/MealPlanPage.jsx
├── pages/GroceriesPage.jsx
├── pages/DiscoverPage.jsx
├── pages/PantryPage.jsx
└── pages/ProfilePage.jsx
```

- `App.jsx` owns navigation and the app-wide recipe, grocery, meal-plan, and nutrition-goal state. It loads and saves those shared values in `localStorage`, then passes data and update callbacks to the active page.
- `RecipeLibrary.jsx` owns recipe-library behavior: filtering and sorting, favorites, cookbooks, recipe creation and editing callbacks, and adding a recipe's ingredients to Groceries or a recipe to the Meal Plan. It renders `RecipesPage.jsx` with the current recipes and callbacks.
- `RecipesPage.jsx` coordinates the recipe list, filter controls, and which recipe workflow is visible. The smaller child components receive values and callbacks as props; they do not own or persist the main recipe data.
- `RecipeCreationFlow.jsx` displays the add choices and photo, text, and web import controls. Text/photo parsing and the web-import request are coordinated by `RecipesPage.jsx`; a successful import opens the same `RecipeEditor.jsx` used by Write from Scratch.
- `RecipeEditor.jsx` edits the current draft and sends field changes and form submission back through props. Saving is handled by `RecipeLibrary.jsx`, which updates the shared recipe list.
- `RecipeDetail.jsx` shows the selected recipe, nutrition comparison, ingredient checklist, and planning actions. Its callbacks connect back to `RecipeLibrary.jsx`; it opens `CookingMode.jsx` for the step-by-step cooking experience.
- `MealPlanPage.jsx` and `GroceriesPage.jsx` update the shared lists through setter props from `App.jsx`. Recipe Detail uses the corresponding RecipeLibrary callbacks to add ingredients or planned meals to those same lists, so additions are visible on those pages.
- `ProfilePage.jsx` edits nutrition goals in shared `App.jsx` state. Recipe details and the Meal Plan use those goals for nutrition comparisons and daily totals.
- `PantryPage.jsx` receives recipes for matching but keeps its pantry selections in its own local state and `localStorage`. `DiscoverPage.jsx` receives recipes to display suggestions.
- `planning.js` contains helpers shared by planning-related views, including meal/day constants, date calculations, and list-item IDs. Prefer extending it over duplicating planning rules.
- `App.css` provides shared visual tokens and controls. A page-specific stylesheet should hold styles for that page and its child components.

## Where to Make Changes

| If you want to change… | Start here |
| --- | --- |
| Top navigation, page switching, shared state or shared storage | `src/App.jsx` |
| Recipe search, filters, sorting, cookbooks, recipe save/delete, or cross-page recipe actions | `src/RecipeLibrary.jsx` |
| Recipe grid, filter layout, or page-level recipe workflow coordination | `src/pages/RecipesPage.jsx` and `src/pages/RecipesPage.css` |
| Add Recipe/Add Cookbook choices or import screens | `src/pages/RecipeCreationFlow.jsx` |
| Recipe fields, validation UI, or editor controls | `src/pages/RecipeEditor.jsx` |
| Recipe detail layout, ingredient checklist, serving controls, or Add to Groceries/Meal Plan actions | `src/pages/RecipeDetail.jsx` |
| Ingredient scaling or US/metric conversions used by recipe and cooking views | `src/pages/recipeMeasurements.js` |
| Guided cooking, timers, or cooking-step controls | `src/pages/CookingMode.jsx` and `src/pages/CookingMode.css` |
| Weekly schedule, meal types, week navigation, or daily macros | `src/pages/MealPlanPage.jsx`, `src/planning.js` |
| Grocery checklist and manual grocery editing | `src/pages/GroceriesPage.jsx` |
| Pantry input or pantry-to-recipe matching | `src/pages/PantryPage.jsx` |
| Nutrition-goal form or profile summary | `src/pages/ProfilePage.jsx` |
| Shared colors, typography, navigation, or reusable buttons | `src/App.css` |
| Recipe-link fetching or recipe metadata extraction | `server.js` and the web-import handler in `src/pages/RecipesPage.jsx` |

When adding a recipe field, update the blank recipe/default data and save/normalize logic in `src/RecipeLibrary.jsx`, then add its editor control in `src/pages/RecipeEditor.jsx` and any required display in `src/pages/RecipeDetail.jsx` or other consumers. For a new shared data feature, decide which owner should hold its state first, connect its page with props/callbacks from `App.jsx`, and persist it using the existing storage pattern.

## Data Persistence

- Recipes use the `simmer-recipes-v1` localStorage key. `App.jsx` loads the initial value and `RecipeLibrary.jsx` saves recipe changes.
- Nutrition goals, groceries, and the meal plan are stored by `App.jsx` under `simmer-nutrition-goals-v1`, `simmer-groceries-v1`, and `simmer-meal-plan-v1`.
- Pantry selections (mains, seasonings, toppings) use `simmer-pantry-v1` and are loaded/saved by `PantryPage.jsx`.
- To reset data, clear site storage in your browser.

The current app passes state between pages in memory through React props and stores it in the current browser's `localStorage`; there is no account-backed database or cross-device synchronization.

## Product Flow

1. Add or import recipes in the Recipes tab.
2. Open Pantry and add main ingredients you already have.
3. Optionally add seasonings and toppings for better match scoring.
4. Review ranked recipe matches based on pantry overlap.
5. Add recipe ingredients to Groceries or schedule recipes in Meal Plan, then edit those lists as needed.

## Notes

- The recipe-import endpoint fetches public HTTPS pages, follows a limited number of redirects,
  and only accepts pages with structured recipe metadata.
- Because storage is browser-local, data does not sync across devices unless exported/imported manually.
