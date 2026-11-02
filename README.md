# Simmer

Simmer is a React app for saving recipes, organizing them into cookbooks, and planning meals from what you already have at home.

It is fully client-side and stores data in the browser, so no backend is required.

## Features

- Recipe library with create, edit, favorite, and delete flows
- Recipe details: ingredients, instructions, servings, prep time, cook time, image, and source link
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
- localStorage for persistence

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the local URL shown in the terminal (usually http://localhost:5173/).

## Scripts

```bash
npm run dev          # Start local dev server
npm run build        # Create production build
npm run preview      # Preview production build locally
npm run lint         # Run oxlint
npm run lint:fix     # Auto-fix lint issues where possible
npm run format       # Run prettier write
npm run format:check # Check formatting
npm run typecheck    # Run TypeScript checker (no emit)
```

## Project Structure

```bash
src/
   App.jsx
   App.css
   RecipeLibrary.jsx
   PantryPage.jsx
   pages/
      RecipesPage.jsx
      RecipesPage.css
      MealPlanPage.jsx
      MealPlanPage.css
      GroceriesPage.jsx
      GroceriesPage.css
      DiscoverPage.jsx
      DiscoverPage.css
      PantryPage.jsx
      PantryPage.css
      ProfilePage.jsx
      ProfilePage.css
```

## Data Persistence

- Recipe data is stored in localStorage.
- Pantry selections (mains, seasonings, toppings) are also stored in localStorage.
- To reset data, clear site storage in your browser.

## Product Flow

1. Add or import recipes in the Recipes tab.
2. Open Pantry and add main ingredients you already have.
3. Optionally add seasonings and toppings for better match scoring.
4. Review ranked recipe matches based on pantry overlap.
5. Return to Recipes/Meal Plan to cook now or plan ahead.

## Notes

- This project is frontend-only and does not require a database or API.
- Because storage is browser-local, data does not sync across devices unless exported/imported manually.
