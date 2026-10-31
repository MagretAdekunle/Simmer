Simmer is a React-based recipe library for saving, organizing, and planning meals. It helps you keep recipes in one place, filter by collection or tag, and build a simple weekly cooking workflow without needing a backend.

## Features

- Add, edit, and delete recipes
- Store recipe details like ingredients, instructions, servings, prep time, cook time, and source links
- Add recipe images and mark favorites
- Search recipes by name or ingredient
- Filter recipes by collection, tag, and favorites-only view
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
  pages/
    RecipesPage.jsx
    MealPlanPage.jsx
    GroceriesPage.jsx
    DiscoverPage.jsx
```

## Notes

- Recipe data is saved in the browser using `localStorage`, so it persists on the same device/browser.
- To reset the app data, clear the site storage for this app in the browser.
- The app is a client-side project and does not require a database or server.
