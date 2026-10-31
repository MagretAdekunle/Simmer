Simmer is a React-based recipe library for saving, organizing, and planning meals. It keeps your recipes in one place, lets you sort them into cookbooks, and supports a simple weekly cooking workflow without needing a backend.

## Features

- Add, edit, and delete recipes
- Store recipe details like ingredients, instructions, servings, prep time, cook time, and source links
- Add recipe images and mark favorites
- Search recipes by name or ingredient
- Filter recipes by collection, tag, and favorites-only view
- Organize recipes into multiple cookbooks while keeping a primary cookbook
- Add cookbook-specific comments or notes to a recipe
- Browse across tabbed sections for Recipes, Meal Plan, Groceries, and Discover
- Export recipe data as JSON
- Save a backup in browser storage for local recovery

## Tech stack

- React
- Vite
- JavaScript
- Local browser storage for persistence

## Getting started

1. Open the project folder in your terminal.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the local URL shown in the terminal, usually:
   ```bash
   http://localhost:5173/
   ```

## Production build

```bash
npm run build
```

## Project structure

```bash
src/
  App.jsx
  App.css
  RecipeLibrary.jsx
  pages/
    RecipesPage.jsx
    MealPlanPage.jsx
    GroceriesPage.jsx
    DiscoverPage.jsx
```

## Current app behavior

- `App.jsx` handles the main page navigation and app layout.
- `RecipeLibrary.jsx` contains the recipe CRUD logic, cookbook filters, and cookbook creation flow.
- `RecipesPage.jsx` renders the sidebar, recipe list, filters, recipe form, and recipe detail view.
- Recipe data is kept in browser storage using `localStorage`, so it persists on the same device/browser.

## Notes

- Recipe data is saved in the browser using `localStorage`, so it persists on the same device/browser.
- To reset the app data, clear the site storage for this app in the browser.
- The app is a client-side project and does not require a database or server.
- Cookbook membership can be multi-select, but a recipe still keeps one `primary cookbook` for simpler display and filtering.
