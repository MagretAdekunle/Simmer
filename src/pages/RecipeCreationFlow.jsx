// Add-recipe entry choices and import forms; parsing and persistence stay with RecipesPage.
import { BackButton, CancelButton } from '../ActionButtons'

function RecipeCreationFlow({
  createStep,
  setCreateStep,
  cancelRecipeFlow,
  onCancel,
  onStartCookbook,
  beginRecipeImport,
  draft,
  photoNotice,
  isReadingPhoto,
  handlePhotoSelect,
  importError,
  importText,
  setImportText,
  importRecipeText,
  webSearch,
  setWebSearch,
  handleRecipeSearch,
  webUrl,
  setWebUrl,
  isImporting,
  handleWebImport,
  useRecipeLinkOnly,
  pasteRecipeTextFallback,
  openRecipeEditor,
}) {
  return (
    <section className="creation-flow">
      <div className="creation-flow-header">
        <div>
          <p className="eyebrow">Add to Simmer</p>
          <h2>
            {createStep === 'choose'
              ? 'What would you like to add?'
              : createStep === 'method'
                ? 'Add a recipe'
                : createStep === 'photo'
                  ? 'Import from photo'
                  : createStep === 'text'
                    ? 'Import from text'
                    : 'Import from web'}
          </h2>
        </div>
        <div className="form-actions">
          {createStep !== 'choose' ? (
            <BackButton onClick={() => setCreateStep(createStep === 'method' ? 'choose' : 'method')} />
          ) : null}
          <CancelButton onClick={cancelRecipeFlow} />
        </div>
      </div>

      {createStep === 'choose' ? (
        <div className="creation-options">
          <button type="button" className="creation-option" onClick={() => setCreateStep('method')}>
            <strong>Add a recipe</strong>
            <span>Choose an import method or enter it yourself.</span>
          </button>
          <button
            type="button"
            className="creation-option"
            onClick={() => {
              onCancel()
              onStartCookbook()
            }}
          >
            <strong>Add a cookbook</strong>
            <span>Create a cookbook and choose recipes for it.</span>
          </button>
        </div>
      ) : null}

      {createStep === 'method' ? (
        <div className="creation-options">
          <button type="button" className="creation-option" onClick={() => beginRecipeImport('photo')}>
            <strong>Import from photo</strong>
            <span>Choose an image or take a photo.</span>
          </button>
          <button type="button" className="creation-option" onClick={() => beginRecipeImport('text')}>
            <strong>Import from text</strong>
            <span>Type or paste a complete recipe.</span>
          </button>
          <button type="button" className="creation-option" onClick={() => beginRecipeImport('web')}>
            <strong>Import from web</strong>
            <span>Search for a recipe or import a link.</span>
          </button>
          <button type="button" className="creation-option" onClick={() => beginRecipeImport('editor')}>
            <strong>Write from scratch</strong>
            <span>Start with a blank recipe form.</span>
          </button>
        </div>
      ) : null}

      {createStep === 'photo' ? (
        <div className="creation-import-panel">
          <div className="photo-import-actions">
            <label className="secondary-button file-picker">
              Choose from library
              <input type="file" accept="image/*" onChange={handlePhotoSelect} />
            </label>
            <label className="secondary-button file-picker">
              Take a photo
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} />
            </label>
          </div>
          {draft.image?.startsWith('data:image/') ? (
            <div className="photo-import-preview">
              <img src={draft.image} alt="Selected recipe" />
              <span>{photoNotice || 'Photo attached. Continue to fill in the recipe details.'}</span>
              <button
                type="button"
                className="primary-button"
                disabled={isReadingPhoto}
                onClick={() => openRecipeEditor('photo')}
              >
                Continue to recipe
              </button>
            </div>
          ) : null}
          {isReadingPhoto && !draft.image?.startsWith('data:image/') ? (
            <p role="status">Reading recipe text from the photo...</p>
          ) : null}
          {importError ? <p className="import-error" role="alert">{importError}</p> : null}
        </div>
      ) : null}

      {createStep === 'text' ? (
        <div className="creation-import-panel">
          <label className="import-field">
            <span>Recipe text</span>
            <textarea
              rows="12"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={'Recipe name\n\nIngredients\n...\n\nInstructions\n...'}
            />
          </label>
          <button
            type="button"
            className="primary-button"
            disabled={!importText.trim()}
            onClick={importRecipeText}
          >
            Continue to recipe
          </button>
        </div>
      ) : null}

      {createStep === 'web' ? (
        <div className="creation-import-panel web-import-panel">
          <div className="import-field">
            <label htmlFor="recipe-web-search">Search the web</label>
            <div className="web-search-row">
              <input
                id="recipe-web-search"
                value={webSearch}
                onChange={(event) => setWebSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleRecipeSearch()
                }}
                placeholder="Search recipes"
              />
              <button
                type="button"
                className="secondary-button"
                disabled={!webSearch.trim()}
                onClick={handleRecipeSearch}
              >
                Search
              </button>
            </div>
          </div>
          <div className="import-field">
            <label htmlFor="recipe-web-url">Recipe link</label>
            <div className="web-search-row">
              <input
                id="recipe-web-url"
                type="url"
                value={webUrl}
                onChange={(event) => setWebUrl(event.target.value)}
                placeholder="https://example.com/recipe"
              />
              <button
                type="button"
                className="primary-button"
                disabled={!webUrl.trim() || isImporting}
                onClick={handleWebImport}
              >
                {isImporting ? 'Importing...' : 'Import link'}
              </button>
            </div>
          </div>
          {importError ? (
            <div className="import-error-row">
              <p className="import-error" role="alert">{importError}</p>
              <button type="button" className="secondary-button" onClick={useRecipeLinkOnly}>
                Enter details manually
              </button>
              <button type="button" className="secondary-button" onClick={pasteRecipeTextFallback}>
                Paste recipe text
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default RecipeCreationFlow
