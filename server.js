import { createServer } from 'node:http'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import https from 'node:https'
import { createServer as createViteServer } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.join(root, 'dist')
const maxPageBytes = 2 * 1024 * 1024
const maxRedirects = 4
const requestTimeout = 12_000
let activeImports = 0

const isPublicAddress = (address) => {
  const family = isIP(address)

  if (family === 4) {
    const octets = address.split('.').map(Number)
    const [first, second] = octets

    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19 || second === 51)) ||
      (first === 203 && second === 0 && octets[2] === 113) ||
      first >= 224
    )
  }

  if (family !== 6) return false

  const normalized = address.toLowerCase()
  const firstGroup = Number.parseInt(normalized.split(':')[0] || '0', 16)
  return (
    firstGroup >= 0x2000 &&
    firstGroup <= 0x3fff &&
    !normalized.startsWith('2001:db8:') &&
    !normalized.startsWith('2001:20:') &&
    !normalized.startsWith('2002:') &&
    !normalized.startsWith('3fff:')
  )
}

const validateRecipeUrl = async (value) => {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Enter a valid recipe URL.')
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    throw new Error('Use a public HTTPS recipe link.')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '')
  let addresses
  try {
    addresses = isIP(host)
      ? [{ address: host, family: isIP(host) }]
      : await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new Error('The recipe website could not be found. Check the link and try again.')
  }

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('This link does not point to a public website.')
  }

  url.hash = ''
  return { url, address: addresses[0] }
}

const requestPage = (url, address) => new Promise((resolve, reject) => {
  const request = https.get(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Encoding': 'identity',
      'User-Agent': 'SimmerRecipeImporter/1.0',
    },
    lookup: (hostname, options, callback) => {
      if (options?.all) {
        callback(null, [{ ...address, address: address.address }])
      } else {
        callback(null, address.address, address.family)
      }
    },
  }, (response) => {
    const statusCode = response.statusCode || 0

    if ([301, 302, 303, 307, 308].includes(statusCode)) {
      const location = response.headers.location
      response.resume()
      if (!location) {
        reject(new Error('The recipe website returned an invalid redirect.'))
        return
      }
      resolve({ redirect: location })
      return
    }

    if (statusCode < 200 || statusCode >= 300) {
      response.resume()
      if (statusCode === 403) {
        reject(new Error('This website blocks automated recipe imports (403). Use the link as the source and add the recipe details manually, or paste the recipe text.'))
        return
      }
      reject(new Error(`The website returned an error (${statusCode}).`))
      return
    }

    const contentType = response.headers['content-type'] || ''
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      response.resume()
      reject(new Error('The link did not return a recipe webpage.'))
      return
    }

    let totalBytes = 0
    const chunks = []
    response.on('data', (chunk) => {
      totalBytes += chunk.length
      if (totalBytes > maxPageBytes) {
        response.destroy(new Error('The recipe webpage is too large to import.'))
        return
      }
      chunks.push(chunk)
    })
    response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }))
    response.on('error', reject)
  })

  request.setTimeout(requestTimeout, () => request.destroy(new Error('The recipe website took too long to respond.')))
  request.on('error', reject)
})

const fetchRecipePage = async (inputUrl) => {
  let currentUrl = inputUrl

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const { url, address } = await validateRecipeUrl(currentUrl)
    const result = await requestPage(url, address)

    if (!result.redirect) return { html: result.html, url: url.href }
    if (redirectCount === maxRedirects) throw new Error('The recipe website redirected too many times.')

    currentUrl = new URL(result.redirect, url).href
  }

  throw new Error('The recipe webpage could not be loaded.')
}

const findRecipeSchema = (schema) => {
  if (Array.isArray(schema)) return schema.map(findRecipeSchema).find(Boolean) ?? null
  if (!schema || typeof schema !== 'object') return null

  const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']]
  if (types.some((type) => typeof type === 'string' && type.endsWith('Recipe'))) return schema

  return findRecipeSchema(schema['@graph']) || findRecipeSchema(schema.mainEntity)
}

const flattenInstructions = (steps = []) => {
  const entries = Array.isArray(steps) ? steps : [steps]
  return entries.flatMap((step) => {
    if (typeof step === 'string') return [step]
    if (step?.text) return [step.text]
    return flattenInstructions(step?.itemListElement ?? [])
  })
}

const parseDuration = (duration = '') => {
  const match = String(duration).match(/^PT(?:(\d+)H)?(?:(\d+)M)?/i)
  return match ? Number(match[1] || 0) * 60 + Number(match[2] || 0) : 0
}

const parseNutritionAmount = (value) => {
  const match = String(value ?? '').match(/^\s*(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

const parseRecipe = (html, sourceUrl) => {
  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)]
  let recipe = null

  for (const [, json] of scripts) {
    try {
      recipe = findRecipeSchema(JSON.parse(json.replace(/^\uFEFF/, '').trim()))
    } catch {
      continue
    }
    if (recipe) break
  }

  if (!recipe) {
    throw new Error('No structured recipe data was found on this page. You can paste the recipe text instead.')
  }

  const imageValue = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image
  const image = typeof imageValue === 'string' ? imageValue : imageValue?.url || ''
  const nutrition = recipe.nutrition || {}
  const yieldValue = Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield
  const ingredients = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient
    : [recipe.recipeIngredient].filter(Boolean)
  const keywords = Array.isArray(recipe.keywords)
    ? recipe.keywords
    : String(recipe.keywords || '').split(',')

  return {
    name: recipe.name || '',
    description: recipe.description || '',
    ingredients,
    instructions: flattenInstructions(recipe.recipeInstructions),
    notes: recipe.recipeNotes || '',
    image,
    sourceLink: sourceUrl,
    servings: Number.parseInt(String(yieldValue ?? '').match(/\d+/)?.[0], 10) || 2,
    prepTime: parseDuration(recipe.prepTime),
    cookTime: parseDuration(recipe.cookTime),
    protein: parseNutritionAmount(nutrition.proteinContent),
    carbs: parseNutritionAmount(nutrition.carbohydrateContent),
    fat: parseNutritionAmount(nutrition.fatContent),
    fiber: parseNutritionAmount(nutrition.fiberContent),
    tags: keywords.map((keyword) => String(keyword).trim()).filter(Boolean).join(', '),
  }
}

const respondJson = (response, statusCode, data) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(data))
}

const readRequestBody = async (request) => {
  const chunks = []
  let size = 0

  for await (const chunk of request) {
    size += chunk.length
    if (size > 8 * 1024) throw new Error('Request body is too large.')
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const importRecipe = async (request, response) => {
  if (activeImports >= 5) {
    respondJson(response, 503, { error: 'Recipe imports are busy. Please try again shortly.' })
    return
  }

  activeImports += 1
  try {
    const body = await readRequestBody(request)
    if (typeof body.url !== 'string' || body.url.length > 2048) {
      respondJson(response, 400, { error: 'Enter a valid recipe URL.' })
      return
    }

    const { html, url } = await fetchRecipePage(body.url)
    const recipe = parseRecipe(html, url)
    respondJson(response, 200, { recipe })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The recipe link could not be imported.'
    const badRequest = error instanceof SyntaxError || /Request body is too large/i.test(message)
    const clientError = /valid recipe URL|public HTTPS|public website|too large|too long|redirected too many|invalid redirect|could not be found|No structured recipe data|did not return a recipe webpage|website returned an error|blocks automated recipe imports/i.test(message)
    respondJson(response, badRequest ? 400 : clientError ? 422 : 502, { error: message })
  } finally {
    activeImports -= 1
  }
}

const serveProductionFile = async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  const requestedPath = decodeURIComponent(url.pathname)
  const filePath = path.resolve(distDirectory, `.${requestedPath}`)
  const insideDist = filePath.startsWith(`${distDirectory}${path.sep}`) || filePath === path.join(distDirectory, 'index.html')
  let targetPath = filePath

  try {
    if (!insideDist || !(await stat(targetPath)).isFile()) targetPath = path.join(distDirectory, 'index.html')
  } catch {
    targetPath = path.join(distDirectory, 'index.html')
  }

  try {
    const content = await readFile(targetPath)
    const extension = path.extname(targetPath)
    const contentType = {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    }[extension] || 'application/octet-stream'
    response.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' })
    response.end(content)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
}

const production = process.argv.includes('--production')
const vite = production ? null : await createViteServer({
  appType: 'spa',
  server: { middlewareMode: true },
})

const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost')

  if (url.pathname === '/api/recipe-import') {
    if (request.method !== 'POST') {
      respondJson(response, 405, { error: 'Use POST to import a recipe.' })
      return
    }
    void importRecipe(request, response)
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405)
    response.end('Method not allowed')
    return
  }

  if (production) {
    void serveProductionFile(request, response)
    return
  }

  vite.middlewares(request, response, (error) => {
    if (error) {
      response.writeHead(500)
      response.end('Development server error')
    }
  })
})

const port = Number(process.env.PORT || (production ? 4173 : 5173))
server.listen(port, '0.0.0.0', () => {
  console.log(`Simmer ${production ? 'production' : 'development'} server listening on http://localhost:${port}`)
})
