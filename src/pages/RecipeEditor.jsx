// The controlled create/edit form for one recipe; RecipesPage owns the draft and save flow.
import { BackButton, CancelButton, DeleteIconButton } from '../ActionButtons'
import { parseCookbookList, recipeMacros } from './recipePageUtils'

function RecipeEditor({
  draft,
  editorReturnStep,
  setCreateStep,
  cancelRecipeFlow,
  onBackup,
  onExport,
  onSubmit,
  onUpdateDraft,
  onUpdateRecipeList,
  onAddRecipeListRow,
  onRemoveRecipeListRow,
  onPhotoSelect,
  isReadingPhoto,
}) {
  return (
    <form className="recipe-form" onSubmit={onSubmit}>
      <div className="form-header">
        <h2>
          {draft.id
            ? 'Edit recipe'
            : ['photo', 'text', 'web'].includes(editorReturnStep)
              ? 'Review imported recipe'
              : 'Create recipe'}
        </h2>
        <div className="form-actions">
          {!draft.id ? (
            <BackButton onClick={() => setCreateStep(editorReturnStep)} />
          ) : null}
          <CancelButton onClick={cancelRecipeFlow} />
          <button type="button" className="secondary-button" onClick={onBackup}>Backup</button>
          <button type="button" className="secondary-button" onClick={onExport}>Export</button>
        </div>
      </div>

      <label>
        <span>Name</span>
        <input value={draft.name ?? ''} onChange={(event) => onUpdateDraft('name', event.target.value)} />
      </label>

      <label>
        <span>Description</span>
        <textarea
          value={draft.description ?? ''}
          onChange={(event) => onUpdateDraft('description', event.target.value)}
          rows="3"
        />
      </label>

      <label>
        <span>Image URL</span>
        <input
          value={draft.image?.startsWith('data:image/') ? '' : draft.image ?? ''}
          onChange={(event) => onUpdateDraft('image', event.target.value)}
          placeholder={draft.image?.startsWith('data:image/') ? 'Photo attached' : 'Optional image URL'}
        />
      </label>

      <div className="editor-photo-control">
        {draft.image?.startsWith('data:image/') ? (
          <img className="editor-photo-preview" src={draft.image} alt="Recipe preview" />
        ) : null}
        <label className="secondary-button file-picker">
          Upload photo
          <input type="file" accept="image/*" onChange={onPhotoSelect} />
        </label>
        {isReadingPhoto ? <span>Reading photo text...</span> : null}
      </div>

      <label>
        <span>Link</span>
        <input value={draft.sourceLink ?? ''} onChange={(event) => onUpdateDraft('sourceLink', event.target.value)} />
      </label>

      <div className="form-grid">
        <label>
          <span>Servings</span>
          <input type="number" value={draft.servings ?? 2} onChange={(event) => onUpdateDraft('servings', event.target.value)} />
        </label>
        <label>
          <span>Prep time</span>
          <input type="number" value={draft.prepTime ?? 0} onChange={(event) => onUpdateDraft('prepTime', event.target.value)} />
        </label>
        <label>
          <span>Cook time</span>
          <input type="number" value={draft.cookTime ?? 0} onChange={(event) => onUpdateDraft('cookTime', event.target.value)} />
        </label>
      </div>

      <section className="recipe-list-editor nutrition-editor">
        <div>
          <h3>Nutrition per serving</h3>
          <p>Enter grams per serving from a label or nutrition source to compare with your daily goals.</p>
        </div>
        <div className="nutrition-input-grid">
          {recipeMacros.map(({ key, label }) => (
            <label key={key}>
              <span>{label} (g)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={draft[key] ?? ''}
                onChange={(event) => onUpdateDraft(key, event.target.value)}
                placeholder="Not entered"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="recipe-list-editor">
        <div className="list-editor-header">
          <h3>Ingredients</h3>
          <button type="button" className="secondary-button" onClick={() => onAddRecipeListRow('ingredients')}>
            Add ingredient
          </button>
        </div>
        {(draft.ingredients.length ? draft.ingredients : ['']).map((ingredient, index) => (
          <div className="recipe-edit-row" key={`ingredient-${index}`}>
            <input
              aria-label={`Ingredient ${index + 1}`}
              value={ingredient}
              onChange={(event) => onUpdateRecipeList('ingredients', index, event.target.value)}
              placeholder="e.g. 2 cups flour"
            />
            <DeleteIconButton
              label={`Remove ingredient ${index + 1}`}
              className="remove-row-button"
              onClick={() => onRemoveRecipeListRow('ingredients', index)}
            />
          </div>
        ))}
      </section>

      <section className="recipe-list-editor">
        <div className="list-editor-header">
          <h3>Instructions</h3>
          <button type="button" className="secondary-button" onClick={() => onAddRecipeListRow('instructions')}>
            Add step
          </button>
        </div>
        {(draft.instructions.length ? draft.instructions : ['']).map((instruction, index) => (
          <div className="recipe-edit-row" key={`instruction-${index}`}>
            <textarea
              aria-label={`Instruction step ${index + 1}`}
              rows="2"
              value={instruction}
              onChange={(event) => onUpdateRecipeList('instructions', index, event.target.value)}
              placeholder={`Step ${index + 1}`}
            />
            <DeleteIconButton
              label={`Remove step ${index + 1}`}
              className="remove-row-button"
              onClick={() => onRemoveRecipeListRow('instructions', index)}
            />
          </div>
        ))}
      </section>

      <label>
        <span>Notes</span>
        <textarea
          value={draft.notes ?? ''}
          onChange={(event) => onUpdateDraft('notes', event.target.value)}
          rows="3"
          placeholder="Optional recipe notes"
        />
      </label>

      <label>
        <span>Collections</span>
        <input
          value={draft.collections ?? ''}
          onChange={(event) => onUpdateDraft('collections', event.target.value)}
          placeholder="e.g. Weeknight, Vegetarian"
        />
      </label>

      <label>
        <span>Substitutions</span>
        <textarea
          value={draft.substitutions ?? ''}
          onChange={(event) => onUpdateDraft('substitutions', event.target.value)}
          rows="3"
          placeholder={'One substitution per line\n e.g. Greek yogurt for sour cream'}
        />
      </label>

      <label>
        <span>Cookbooks</span>
        <input
          value={(draft.cookbooks || [draft.cookbook || 'Uncategorized']).join(', ')}
          onChange={(event) => onUpdateDraft('cookbooks', parseCookbookList(event.target.value))}
        />
      </label>

      <label>
        <span>Tags</span>
        <input value={draft.tags ?? ''} onChange={(event) => onUpdateDraft('tags', event.target.value)} />
      </label>

      <section className="recipe-status-editor" aria-label="Recipe status">
        <fieldset className="recipe-rating-editor">
          <legend>Your rating</legend>
          <div className="recipe-rating-control" role="group" aria-label="Rate this recipe">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                type="button"
                key={rating}
                className={Number(draft.rating || 0) >= rating ? 'rating-star selected' : 'rating-star'}
                aria-label={`Rate ${rating} out of 5`}
                aria-pressed={Number(draft.rating || 0) === rating}
                onClick={() => onUpdateDraft('rating', rating)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
                </svg>
              </button>
            ))}
            {Number(draft.rating || 0) > 0 ? (
              <button type="button" className="rating-clear" onClick={() => onUpdateDraft('rating', 0)}>
                Clear
              </button>
            ) : null}
          </div>
          <span className="rating-help">
            {Number(draft.rating || 0) > 0 ? `${Number(draft.rating).toFixed(0)} out of 5` : 'Tap a star to rate this recipe'}
          </span>
        </fieldset>

        <div className="recipe-status-toggles">
          <button
            type="button"
            className={draft.cooked ? 'recipe-status-toggle active' : 'recipe-status-toggle'}
            role="switch"
            aria-checked={Boolean(draft.cooked)}
            onClick={() => onUpdateDraft('cooked', !draft.cooked)}
          >
            <span className="status-toggle-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <span className="status-toggle-copy">
              <strong>Made this recipe</strong>
              <small>{draft.cooked ? 'You’ve cooked this one' : 'Mark it when you’ve tried it'}</small>
            </span>
            <span className="status-toggle-track" aria-hidden="true"><span /></span>
          </button>

          <button
            type="button"
            className={draft.favorite ? 'recipe-status-toggle active favorite' : 'recipe-status-toggle favorite'}
            role="switch"
            aria-checked={Boolean(draft.favorite)}
            onClick={() => onUpdateDraft('favorite', !draft.favorite)}
          >
            <span className="status-toggle-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>
            </span>
            <span className="status-toggle-copy">
              <strong>Favorite</strong>
              <small>{draft.favorite ? 'Saved to your favorites' : 'Keep it close at hand'}</small>
            </span>
            <span className="status-toggle-track" aria-hidden="true"><span /></span>
          </button>
        </div>
      </section>

      <div className="form-actions form-actions-end">
        <button type="submit" className="primary-button">
          {draft.id ? 'Save changes' : 'Save recipe'}
        </button>
      </div>
    </form>
  )
}

export default RecipeEditor
