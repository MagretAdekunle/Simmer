import { useMemo, useState } from 'react'
import confirmDeletion from '../confirmDeletion'
import './PantryPage.css'

const PANTRY_STORAGE_KEY = 'simmer-pantry-v1'

const normalizeText = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()

// Persist pantry selections between sessions so suggestions survive refreshes.
const splitInputItems = (value = '') =>
  uniqueList(
    String(value)
      .split(/[\n,]+/)
      .map((item) => item.trim()),
  )

const uniqueList = (items = []) => [...new Set(items.map(normalizeText).filter(Boolean))]

// Accept comma or newline separated pantry input to support quick paste from notes.
const loadPantry = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PANTRY_STORAGE_KEY) || '{}')
    return {
      mains: uniqueList(parsed.mains || []),
      seasonings: uniqueList(parsed.seasonings || []),
      toppings: uniqueList(parsed.toppings || []),
    // Load saved pantry values safely; fallback to empty values if storage is missing/corrupt.
    }
  } catch {
    return { mains: [], seasonings: [], toppings: [] }
  }
}

function PantryPage({ recipes = [] }) {
  const initialPantry = loadPantry()

  const [mainInput, setMainInput] = useState('')
  const [seasoningInput, setSeasoningInput] = useState('')
  const [toppingInput, setToppingInput] = useState('')

  const [mains, setMains] = useState(initialPantry.mains)
  const [seasonings, setSeasonings] = useState(initialPantry.seasonings)
  const [toppings, setToppings] = useState(initialPantry.toppings)
      // Input controls for the three pantry categories.

  const persistPantry = (nextMains, nextSeasonings, nextToppings) => {
    localStorage.setItem(
      PANTRY_STORAGE_KEY,
      // Normalized pantry items used by the matcher.
      JSON.stringify({ mains: nextMains, seasonings: nextSeasonings, toppings: nextToppings }),
    )
  }

// Single write path keeps localStorage updates consistent across all add/remove actions.
  const addMainItems = (value) => {
    const items = splitInputItems(value)
    if (!items.length) return
    const next = uniqueList([...mains, ...items])
    setMains(next)
    persistPantry(next, seasonings, toppings)
  }

  const addSeasoningItems = (value) => {
    const items = splitInputItems(value)
    if (!items.length) return
    const next = uniqueList([...seasonings, ...items])
    setSeasonings(next)
    persistPantry(mains, next, toppings)
  }

  const addToppingItems = (value) => {
    const items = splitInputItems(value)
    if (!items.length) return
    const next = uniqueList([...toppings, ...items])
    setToppings(next)
    persistPantry(mains, seasonings, next)
  }

  const removeMainItem = (item) => {
    if (!confirmDeletion(`${item} from your pantry`)) return
    const next = mains.filter((entry) => entry !== item)
    setMains(next)
    persistPantry(next, seasonings, toppings)
  }

  const removeSeasoningItem = (item) => {
    if (!confirmDeletion(`${item} from your pantry`)) return
    const next = seasonings.filter((entry) => entry !== item)
    setSeasonings(next)
    persistPantry(mains, next, toppings)
  }

  const removeToppingItem = (item) => {
    if (!confirmDeletion(`${item} from your pantry`)) return
    const next = toppings.filter((entry) => entry !== item)
    setToppings(next)
    persistPantry(mains, seasonings, next)
  }

  const suggestions = useMemo(() => {
    if (!recipes.length || mains.length === 0) return []

    return recipes
      .map((recipe) => {
        const ingredientLines = (recipe.ingredients || []).map((item) => normalizeText(item))

      // Recipe ranking:
      // - Main ingredients are weighted highest (core pantry signal).
      // - Seasonings/toppings refine the score but do not gate inclusion.
        const matchedMains = mains.filter((item) =>
          ingredientLines.some((line) => line.includes(item)),
        )

        if (matchedMains.length === 0) {
          return null
        }

        const matchedSeasonings = seasonings.filter((item) =>
          ingredientLines.some((line) => line.includes(item)),
        )
        const matchedToppings = toppings.filter((item) =>
          ingredientLines.some((line) => line.includes(item)),
        )

        const score = matchedMains.length * 3 + matchedSeasonings.length + matchedToppings.length

        return {
          id: recipe.id,
          name: recipe.name,
          score,
          matchedMains,
          matchedSeasonings,
          matchedToppings,
          ingredientCount: ingredientLines.length,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
  }, [recipes, mains, seasonings, toppings])

  return (
    <div className="page-shell pantry-page">
      <div className="page-card pantry-card">
        <p className="eyebrow">Pantry</p>
        <h2>Cook From What You Have</h2>
        <p className="pantry-subtitle">
          Add your main ingredients first, then optional seasonings and toppings.
        </p>

        <div className="pantry-input-grid">
          <label className="pantry-field">
            <span>Main items</span>
            <div className="pantry-input-row">
              <input
                type="text"
                value={mainInput}
                onChange={(event) => setMainInput(event.target.value)}
                placeholder="chicken, rice, beans"
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  addMainItems(mainInput)
                  setMainInput('')
                }}
              >
                Add
              </button>
            </div>
          </label>

          <label className="pantry-field">
            <span>Seasonings</span>
            <div className="pantry-input-row">
              <input
                type="text"
                value={seasoningInput}
                onChange={(event) => setSeasoningInput(event.target.value)}
                placeholder="salt, pepper, paprika"
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  addSeasoningItems(seasoningInput)
                  setSeasoningInput('')
                }}
              >
                Add
              </button>
            </div>
          </label>

          <label className="pantry-field">
            <span>Toppings</span>
            <div className="pantry-input-row">
              <input
                type="text"
                value={toppingInput}
                onChange={(event) => setToppingInput(event.target.value)}
                placeholder="cheese, herbs, avocado"
              />
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  addToppingItems(toppingInput)
                  setToppingInput('')
                }}
              >
                Add
              </button>
            </div>
          </label>
        </div>

        <div className="pantry-lists">
          <div className="pantry-list-block">
            <h3>Main ingredients</h3>
            <div className="chip-list">
              {mains.length ? (
                mains.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip pantry-chip"
                    aria-label={`Remove ${item} from pantry`}
                    onClick={() => removeMainItem(item)}
                  >
                    {item}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                    </svg>
                  </button>
                ))
              ) : (
                <span className="pantry-empty">No main ingredients yet.</span>
              )}
            </div>
          </div>

          <div className="pantry-list-block">
            <h3>Seasonings</h3>
            <div className="chip-list">
              {seasonings.length ? (
                seasonings.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip pantry-chip"
                    aria-label={`Remove ${item} from pantry`}
                    onClick={() => removeSeasoningItem(item)}
                  >
                    {item}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                    </svg>
                  </button>
                ))
              ) : (
                <span className="pantry-empty">Optional, but useful for flavor.</span>
              )}
            </div>
          </div>

          <div className="pantry-list-block">
            <h3>Toppings</h3>
            <div className="chip-list">
              {toppings.length ? (
                toppings.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="chip pantry-chip"
                    aria-label={`Remove ${item} from pantry`}
                    onClick={() => removeToppingItem(item)}
                  >
                    {item}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                    </svg>
                  </button>
                ))
              ) : (
                <span className="pantry-empty">Optional finishers for serving.</span>
              )}
            </div>
          </div>
        </div>

        <section className="pantry-suggestions">
          <h3>Recipe matches</h3>
          {mains.length === 0 ? (
            <p className="pantry-empty">Add at least one main ingredient to see recipe suggestions.</p>
          ) : suggestions.length === 0 ? (
            <p className="pantry-empty">No current recipes match your pantry mains yet.</p>
          ) : (
            <div className="pantry-results">
              {suggestions.map((recipe) => (
                <article key={recipe.id} className="pantry-result-card">
                  <div className="pantry-result-head">
                    <h4>{recipe.name}</h4>
                    <strong>{recipe.score} pts</strong>
                  </div>

                  <p>
                    Main matches: <span>{recipe.matchedMains.join(', ')}</span>
                  </p>

                  {recipe.matchedSeasonings.length > 0 && (
                    <p>
                      Seasonings: <span>{recipe.matchedSeasonings.join(', ')}</span>
                    </p>
                  )}

                  {recipe.matchedToppings.length > 0 && (
                    <p>
                      Toppings: <span>{recipe.matchedToppings.join(', ')}</span>
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default PantryPage
