// Scale ingredient amounts and convert supported volume/weight units for recipe views.
const fractionValues = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
}

const units = {
  tsp: { aliases: ['tsp', 'teaspoon', 'teaspoons'], kind: 'volume', factor: 4.92892, system: 'us' },
  tbsp: { aliases: ['tbsp', 'tablespoon', 'tablespoons'], kind: 'volume', factor: 14.7868, system: 'us' },
  cup: { aliases: ['c', 'cup', 'cups'], kind: 'volume', factor: 236.588, system: 'us' },
  floz: { aliases: ['fl oz', 'fluid ounce', 'fluid ounces'], kind: 'volume', factor: 29.5735, system: 'us' },
  pint: { aliases: ['pt', 'pint', 'pints'], kind: 'volume', factor: 473.176, system: 'us' },
  quart: { aliases: ['qt', 'quart', 'quarts'], kind: 'volume', factor: 946.353, system: 'us' },
  gallon: { aliases: ['gal', 'gallon', 'gallons'], kind: 'volume', factor: 3785.41, system: 'us' },
  ml: { aliases: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'], kind: 'volume', factor: 1, system: 'metric' },
  l: { aliases: ['l', 'liter', 'liters', 'litre', 'litres'], kind: 'volume', factor: 1000, system: 'metric' },
  g: { aliases: ['g', 'gram', 'grams'], kind: 'weight', factor: 1, system: 'metric' },
  kg: { aliases: ['kg', 'kilogram', 'kilograms'], kind: 'weight', factor: 1000, system: 'metric' },
  oz: { aliases: ['oz', 'ounce', 'ounces'], kind: 'weight', factor: 28.3495, system: 'us' },
  lb: { aliases: ['lb', 'lbs', 'pound', 'pounds'], kind: 'weight', factor: 453.592, system: 'us' },
}

const unitAliases = Object.entries(units)
  .flatMap(([key, unit]) => unit.aliases.map((alias) => ({ key, alias })))
  .sort((first, second) => second.alias.length - first.alias.length)

const parseQuantity = (value) => {
  if (value.includes('/')) {
    const [whole, fraction] = value.trim().split(/\s+/)
    if (fraction) {
      const [numerator, denominator] = fraction.split('/').map(Number)
      return Number(whole) + numerator / denominator
    }

    const [numerator, denominator] = value.split('/').map(Number)
    return numerator / denominator
  }

  const unicodeFraction = Object.keys(fractionValues).find((fraction) => value.endsWith(fraction))
  if (unicodeFraction) {
    return Number(value.slice(0, -unicodeFraction.length) || 0) + fractionValues[unicodeFraction]
  }

  return Number(value)
}

const formatNumber = (value) => Number(value.toFixed(2)).toString()

export const convertIngredient = (ingredient, baseServings, targetServings, system) => {
  const match = ingredient.match(/^\s*((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?)|(?:\d*[½⅓⅔¼¾⅛⅜⅝⅞]))(?:\s+|$)(.*)$/)
  if (!match) return ingredient

  const amount = parseQuantity(match[1]) * targetServings / baseServings
  const remainder = match[2]
  if (!remainder || system === 'original') return `${formatNumber(amount)}${remainder ? ` ${remainder}` : ''}`

  const matchedUnit = unitAliases.find(({ alias }) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`^${escaped}(?=\\s|$)`, 'i').test(remainder)
  })

  if (!matchedUnit) return `${formatNumber(amount)} ${remainder}`

  const unit = units[matchedUnit.key]
  if (unit.system === system) return `${formatNumber(amount)} ${remainder}`

  const rest = remainder.replace(new RegExp(`^${matchedUnit.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), '')
  const baseAmount = amount * unit.factor
  let convertedAmount
  let convertedUnit

  if (unit.kind === 'weight') {
    if (system === 'metric') {
      convertedAmount = baseAmount
      convertedUnit = 'g'
      if (convertedAmount >= 1000) {
        convertedAmount /= 1000
        convertedUnit = 'kg'
      }
    } else {
      convertedAmount = baseAmount / 28.3495
      convertedUnit = 'oz'
      if (convertedAmount >= 16) {
        convertedAmount /= 16
        convertedUnit = 'lb'
      }
    }
  } else if (system === 'metric') {
    convertedAmount = baseAmount
    convertedUnit = 'ml'
    if (convertedAmount >= 1000) {
      convertedAmount /= 1000
      convertedUnit = 'l'
    }
  } else {
    const teaspoons = baseAmount / 4.92892
    if (teaspoons < 3) {
      convertedAmount = teaspoons
      convertedUnit = 'tsp'
    } else if (teaspoons < 48) {
      convertedAmount = teaspoons / 3
      convertedUnit = 'tbsp'
    } else if (teaspoons < 768) {
      convertedAmount = teaspoons / 48
      convertedUnit = 'cup'
    } else if (teaspoons < 1536) {
      convertedAmount = teaspoons / 6
      convertedUnit = 'cup'
    } else {
      convertedAmount = teaspoons / 768
      convertedUnit = 'gal'
    }
  }

  return `${formatNumber(convertedAmount)} ${convertedUnit}${rest ? ` ${rest}` : ''}`
}
