import { useState } from 'react'
import { DeleteIconButton } from '../ActionButtons'
import { createListItemId, getDateForPlanDay, getWeekStart, MEAL_PLAN_DAYS, MEAL_TYPES } from '../planning'
import confirmDeletion from '../confirmDeletion'
import './MyFoodsPage.css'

const EMPTY_FOOD = {
  name: '',
  brand: '',
  barcode: '',
  servingSize: '1 serving',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  image: '',
  labelImage: '',
}

const resizeImage = (file) => new Promise((resolve, reject) => {
  const imageUrl = URL.createObjectURL(file)
  const image = new Image()

  image.onload = () => {
    const maxDimension = 1200
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext('2d')

    URL.revokeObjectURL(imageUrl)
    if (!context) {
      reject(new Error('This photo could not be processed.'))
      return
    }

    try {
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    } catch (error) {
      reject(error)
    }
  }

  image.onerror = () => {
    URL.revokeObjectURL(imageUrl)
    reject(new Error('This photo could not be opened.'))
  }
  image.src = imageUrl
})

const readNutritionLabel = (text) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const fields = [
    ['calories', /\bcalories\b/i],
    ['protein', /\bprotein\b/i],
    ['carbs', /\btotal\s+carbohydrate\b|\bcarbohydrate\b/i],
    ['fat', /\btotal\s+fat\b/i],
    ['fiber', /\b(?:dietary\s+)?fiber\b/i],
  ]

  return Object.fromEntries(fields.flatMap(([field, pattern]) => {
    const lineIndex = lines.findIndex((candidate) => pattern.test(candidate))
    const value = lineIndex < 0
      ? ''
      : lines[lineIndex].match(/\d+(?:\.\d+)?/)?.[0]
        || lines[lineIndex + 1]?.match(/^\s*(\d+(?:\.\d+)?)\s*(?:g|mg|kcal)?\s*$/i)?.[1]
        || ''
    return value ? [[field, value]] : []
  }))
}

const getNutrient = (nutriments, keys) => {
  for (const suffix of ['_serving', '_100g']) {
    for (const key of keys) {
      const rawValue = nutriments[`${key}${suffix}`]
      if (rawValue == null || rawValue === '') continue
      const value = Number(rawValue)
      if (Number.isFinite(value)) return String(Math.round(value * 10) / 10)
    }
  }
  return ''
}

function MyFoodsPage({ foods = [], setFoods, onAddToMealPlan }) {
  const todayIndex = (new Date().getDay() + 6) % 7
  const [draft, setDraft] = useState(EMPTY_FOOD)
  const [planDay, setPlanDay] = useState(MEAL_PLAN_DAYS[todayIndex])
  const [planMeal, setPlanMeal] = useState('Dinner')
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false)
  const [isReadingLabel, setIsReadingLabel] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const lookupBarcode = async (value = draft.barcode) => {
    const barcode = value.trim().replace(/\s/g, '')
    if (!/^\d{8,14}$/.test(barcode)) {
      setError('Enter a valid 8–14 digit barcode.')
      setNotice('')
      return
    }

    setDraft((current) => ({ ...current, barcode }))
    setError('')
    setNotice('')
    setIsLookingUpBarcode(true)

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
      if (!response.ok) throw new Error('The product database could not be reached.')

      const result = await response.json()
      if (result.status !== 1 || !result.product) {
        setNotice('Product not found. Enter the details manually to save it.')
        return
      }

      const product = result.product
      const nutriments = product.nutriments || {}
      const hasServingValues = ['energy-kcal', 'proteins', 'carbohydrates', 'fat', 'fiber']
        .some((key) => nutriments[`${key}_serving`] != null)
      setDraft((current) => ({
        ...current,
        name: product.product_name || current.name,
        brand: product.brands || current.brand,
        barcode,
        servingSize: product.serving_size || (hasServingValues ? '1 serving' : '100 g'),
        calories: getNutrient(nutriments, ['energy-kcal', 'energy-kcal_value']),
        protein: getNutrient(nutriments, ['proteins']),
        carbs: getNutrient(nutriments, ['carbohydrates']),
        fat: getNutrient(nutriments, ['fat']),
        fiber: getNutrient(nutriments, ['fiber']),
        image: product.image_front_small_url || product.image_front_url || current.image,
      }))
      setNotice('Product details found. Review them and save the food.')
    } catch (lookupError) {
      setError(lookupError instanceof Error
        ? `${lookupError.message} Enter the details manually to continue.`
        : 'Product lookup failed. Enter the details manually to continue.')
    } finally {
      setIsLookingUpBarcode(false)
    }
  }

  const scanBarcodePhoto = async (file) => {
    if (!file) return
    setError('')
    setNotice('')

    if (!window.BarcodeDetector) {
      setError('Barcode scanning is not supported in this browser. Enter the barcode manually instead.')
      return
    }

    let bitmap
    try {
      bitmap = await createImageBitmap(file)
      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
      const results = await detector.detect(bitmap)
      const barcode = results[0]?.rawValue
      if (!barcode) {
        setError('No barcode was found in that photo. Try a clearer photo or enter it manually.')
        return
      }
      await lookupBarcode(barcode)
    } catch (scanError) {
      setError(scanError instanceof Error
        ? `${scanError.message} Enter the barcode manually instead.`
        : 'The barcode could not be scanned. Enter it manually instead.')
    } finally {
      bitmap?.close()
    }
  }

  const scanNutritionLabel = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file for the nutrition label.')
      return
    }

    setError('')
    setNotice('')
    setIsReadingLabel(true)
    let worker

    try {
      const labelImage = await resizeImage(file)
      setDraft((current) => ({ ...current, labelImage }))

      const { createWorker } = await import('tesseract.js')
      worker = await createWorker('eng')
      const result = await worker.recognize(labelImage)
      const nutrition = readNutritionLabel(result.data.text)
      setDraft((current) => ({ ...current, labelImage, ...nutrition }))

      setNotice(Object.keys(nutrition).length
        ? 'Nutrition details were read. Review the values before saving.'
        : 'Photo attached, but nutrition details were not recognized. Enter them manually.')
    } catch (scanError) {
      setError(scanError instanceof Error
        ? `${scanError.message} You can still enter the nutrition details manually.`
        : 'The label could not be read. You can still enter the nutrition details manually.')
    } finally {
      if (worker) await worker.terminate()
      setIsReadingLabel(false)
    }
  }

  const saveFood = (event) => {
    event.preventDefault()
    const name = draft.name.trim()
    if (!name) {
      setError('Add a food name before saving.')
      return
    }

    setFoods((items) => [{
      ...draft,
      id: createListItemId(),
      name,
      brand: draft.brand.trim(),
      barcode: draft.barcode.trim(),
      servingSize: draft.servingSize.trim(),
    }, ...items])
    setDraft(EMPTY_FOOD)
    setError('')
    setNotice(`${name} saved to My Foods.`)
  }

  const addFoodToMealPlan = (food) => {
    const date = getDateForPlanDay(planDay, getWeekStart())
    onAddToMealPlan(food.id, planDay, date, planMeal)
    setNotice(`${food.name} added to ${planDay}'s ${planMeal} plan.`)
  }

  const updateDraft = (field) => (event) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <div className="page-shell my-foods-page">
      <div className="page-card">
        <p className="eyebrow">My Foods</p>
        <header className="my-foods-heading">
          <div>
            <h2>Food library</h2>
            <p>Save packaged foods and nutrition details for your meal plans.</p>
          </div>
        </header>

        <section className="food-editor">
          <h3>Add a food</h3>
          <div className="food-capture-options">
            <div className="food-capture-card">
              <h4>Find by barcode</h4>
              <label>
                <span>Barcode</span>
                <input
                  inputMode="numeric"
                  value={draft.barcode}
                  onChange={updateDraft('barcode')}
                  placeholder="Enter UPC or EAN"
                />
              </label>
              <div className="food-capture-actions">
                <button
                  type="button"
                  className="grocery-page-button"
                  onClick={() => lookupBarcode()}
                  disabled={isLookingUpBarcode}
                >
                  {isLookingUpBarcode ? 'Looking up…' : 'Look up product'}
                </button>
                <label className="food-file-button">
                  Scan barcode photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label="Scan a barcode from a photo"
                    onChange={(event) => {
                      scanBarcodePhoto(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>
              <small>Product lookup uses Open Food Facts. If it is unavailable or has no match, enter details below.</small>
            </div>

            <div className="food-capture-card">
              <h4>Scan nutrition label</h4>
              <p>OCR runs on this device. Review all values before saving.</p>
              <label className="food-file-button">
                {isReadingLabel ? 'Reading label…' : 'Take or upload label photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="Take or upload a nutrition label photo"
                  disabled={isReadingLabel}
                  onChange={(event) => {
                    scanNutritionLabel(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              {draft.labelImage ? <img className="food-label-preview" src={draft.labelImage} alt="Nutrition label preview" /> : null}
            </div>
          </div>

          <form className="food-editor-form" onSubmit={saveFood}>
            <div className="food-fields">
              <label className="food-field food-field-wide">
                <span>Food name *</span>
                <input value={draft.name} onChange={updateDraft('name')} placeholder="e.g. Plain Greek yogurt" required />
              </label>
              <label className="food-field">
                <span>Brand</span>
                <input value={draft.brand} onChange={updateDraft('brand')} placeholder="Brand name" />
              </label>
              <label className="food-field">
                <span>Serving size</span>
                <input value={draft.servingSize} onChange={updateDraft('servingSize')} placeholder="e.g. 1 cup (170 g)" />
              </label>
              <label className="food-field">
                <span>Calories</span>
                <input type="number" min="0" step="any" value={draft.calories} onChange={updateDraft('calories')} />
              </label>
              <label className="food-field">
                <span>Protein (g)</span>
                <input type="number" min="0" step="any" value={draft.protein} onChange={updateDraft('protein')} />
              </label>
              <label className="food-field">
                <span>Carbs (g)</span>
                <input type="number" min="0" step="any" value={draft.carbs} onChange={updateDraft('carbs')} />
              </label>
              <label className="food-field">
                <span>Fat (g)</span>
                <input type="number" min="0" step="any" value={draft.fat} onChange={updateDraft('fat')} />
              </label>
              <label className="food-field">
                <span>Fiber (g)</span>
                <input type="number" min="0" step="any" value={draft.fiber} onChange={updateDraft('fiber')} />
              </label>
            </div>
            <button type="submit" className="primary-button">Save food</button>
          </form>

          {error ? <p className="food-feedback error" role="alert">{error}</p> : null}
          {notice ? <p className="food-feedback" role="status">{notice}</p> : null}
        </section>

        <section className="saved-foods">
          <div className="saved-foods-heading">
            <div>
              <h3>Saved foods</h3>
            </div>
            <div className="food-plan-controls">
              <label>
                <span>Day</span>
                <select value={planDay} onChange={(event) => setPlanDay(event.target.value)}>
                  {MEAL_PLAN_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
              </label>
              <label>
                <span>Meal</span>
                <select value={planMeal} onChange={(event) => setPlanMeal(event.target.value)}>
                  {MEAL_TYPES.map((meal) => <option key={meal} value={meal}>{meal}</option>)}
                </select>
              </label>
            </div>
          </div>

          {foods.length ? (
            <div className="saved-food-list">
              {foods.map((food) => (
                <article className="saved-food-card" key={food.id}>
                  {(food.image || food.labelImage) ? (
                    <img className="saved-food-image" src={food.image || food.labelImage} alt="" />
                  ) : (
                    <div className="saved-food-image food-image-placeholder" aria-hidden="true">
                      {food.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="saved-food-details">
                    <h4>{food.name}</h4>
                    {food.brand ? <p>{food.brand}</p> : null}
                    {food.servingSize ? <small>Per {food.servingSize}</small> : null}
                    <div className="food-nutrition-summary">
                      {food.calories !== '' && food.calories != null ? <span>{food.calories} kcal</span> : null}
                      {food.protein !== '' && food.protein != null ? <span>{food.protein}g protein</span> : null}
                      {food.carbs !== '' && food.carbs != null ? <span>{food.carbs}g carbs</span> : null}
                      {food.fat !== '' && food.fat != null ? <span>{food.fat}g fat</span> : null}
                      {food.fiber !== '' && food.fiber != null ? <span>{food.fiber}g fiber</span> : null}
                    </div>
                  </div>
                  <div className="saved-food-actions">
                    <button
                      type="button"
                      className="food-add-button"
                      aria-label={`Add ${food.name} to ${planDay} ${planMeal}`}
                      title={`Add to ${planDay} ${planMeal}`}
                      onClick={() => addFoodToMealPlan(food)}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                    <DeleteIconButton
                      label={`Remove ${food.name}`}
                      onClick={() => {
                        if (confirmDeletion(food.name)) {
                          setFoods((items) => items.filter((item) => item.id !== food.id))
                        }
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="foods-empty-state">No saved foods yet. Add one above to keep its nutrition details handy.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default MyFoodsPage
