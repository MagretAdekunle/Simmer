import { useEffect, useState } from 'react'
import { CancelButton, EditIconButton } from '../ActionButtons'
import './ProfilePage.css'

const PROFILE_STORAGE_KEY = 'simmer-profile-v1'
const DEFAULT_PROFILE = {
  name: 'Magret Adekunle',
  handle: '@magret-can-cook-777',
  bio: "I'm literally becoming a machine !",
  interests: ['Meal prep', 'Quick dinners', 'Vegetarian', 'Family meals'],
}

const goalFields = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
]

function ProfilePage({
  recipes = [],
  nutritionGoals,
  onSaveNutritionGoals,
  weightEntries = [],
  onSaveWeightEntries,
}) {
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [goalDraft, setGoalDraft] = useState(nutritionGoals)
  const [weightDraft, setWeightDraft] = useState({
    weight: '',
    unit: nutritionGoals.weightUnit || 'lb',
    date: todayString,
  })
  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || 'null')
      if (!savedProfile || typeof savedProfile !== 'object' || Array.isArray(savedProfile)) return DEFAULT_PROFILE

      return {
        name: typeof savedProfile.name === 'string' ? savedProfile.name : DEFAULT_PROFILE.name,
        handle: typeof savedProfile.handle === 'string' ? savedProfile.handle : DEFAULT_PROFILE.handle,
        bio: typeof savedProfile.bio === 'string' ? savedProfile.bio : DEFAULT_PROFILE.bio,
        interests: Array.isArray(savedProfile.interests)
          ? savedProfile.interests.filter((interest) => typeof interest === 'string')
          : DEFAULT_PROFILE.interests,
      }
    } catch {
      return DEFAULT_PROFILE
    }
  })
  const [profileDraft, setProfileDraft] = useState({ name: '', handle: '', bio: '', interests: '' })
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [goalsSaved, setGoalsSaved] = useState(false)
  const favoriteCount = recipes.filter((recipe) => recipe.favorite).length
  const recipeCount = recipes.length
  const cookbooks = [...new Set(recipes.map((recipe) => recipe.cookbook).filter(Boolean))]
  const profileInitials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0))
    .join('')
    .toLocaleUpperCase() || 'MA'
  const sortedWeightEntries = [...weightEntries].sort((a, b) => (
    b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  ))
  const latestWeight = sortedWeightEntries[0]

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    setGoalDraft(nutritionGoals)
  }, [nutritionGoals])

  useEffect(() => {
    setWeightDraft((current) => ({ ...current, unit: nutritionGoals.weightUnit || 'lb' }))
  }, [nutritionGoals.weightUnit])

  const updateGoal = (field, value) => {
    setGoalDraft((current) => ({ ...current, [field]: value }))
    setGoalsSaved(false)
  }

  const saveGoals = (event) => {
    event.preventDefault()
    onSaveNutritionGoals(goalDraft)
    setGoalsSaved(true)
  }

  const startProfileEdit = () => {
    setProfileDraft({
      name: profile.name,
      handle: profile.handle,
      bio: profile.bio,
      interests: profile.interests.join(', '),
    })
    setIsEditingProfile(true)
  }

  const saveProfile = (event) => {
    event.preventDefault()
    const name = profileDraft.name.trim()
    const rawHandle = profileDraft.handle.trim()
    if (!name || !rawHandle) return

    const interests = [...new Map(
      profileDraft.interests
        .split(/[,\n]+/)
        .map((interest) => interest.trim())
        .filter(Boolean)
        .map((interest) => [interest.toLocaleLowerCase(), interest]),
    ).values()]

    setProfile({
      name,
      handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`,
      bio: profileDraft.bio.trim(),
      interests,
    })
    setIsEditingProfile(false)
  }

  const saveWeightEntry = (event) => {
    event.preventDefault()
    const weight = Number(weightDraft.weight)
    if (!Number.isFinite(weight) || weight <= 0 || !weightDraft.date) return

    onSaveWeightEntries((current) => [...current, {
      weight,
      unit: weightDraft.unit,
      date: weightDraft.date,
      createdAt: new Date().toISOString(),
    }])
    setWeightDraft((current) => ({ ...current, weight: '' }))
  }

  const formatWeightChange = (entry, previousEntry) => {
    if (!previousEntry) return null
    const entryInPounds = entry.unit === 'kg' ? entry.weight * 2.20462 : entry.weight
    const previousInPounds = previousEntry.unit === 'kg' ? previousEntry.weight * 2.20462 : previousEntry.weight
    const change = entryInPounds - previousInPounds
    const changeInEntryUnit = entry.unit === 'kg' ? change / 2.20462 : change
    const sign = changeInEntryUnit > 0 ? '+' : ''
    return `${sign}${changeInEntryUnit.toFixed(1)} ${entry.unit}`
  }

  return (
    <div className="page-shell profile-page">
      <div className="page-card profile-card">
        <div className="profile-header">
          <div className="profile-user">
            <div className="profile-avatar">{profileInitials}</div>
            <div className="profile-name">
              <h2>{profile.name}</h2>
              <span className="profile-handle">{profile.handle}</span>
            </div>
          </div>

        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <strong>{recipeCount}</strong>
            <span>Recipes</span>
          </div>
          <div className="profile-stat">
            <strong>{favoriteCount}</strong>
            <span>Favorites</span>
          </div>
          <div className="profile-stat">
            <strong>{favoriteCount}</strong>
            <span>Cooked</span>
          </div>
          <div className="profile-stat">
            <strong>{cookbooks.length}</strong>
            <span>Cookbooks</span>
          </div>
        </div>

        {isEditingProfile ? (
          <form className="profile-section profile-edit-form" onSubmit={saveProfile}>
            <label className="profile-field">
              <span>Name</span>
              <input
                autoComplete="name"
                required
                value={profileDraft.name}
                onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="profile-field">
              <span>Handle</span>
              <input
                autoComplete="username"
                required
                value={profileDraft.handle}
                onChange={(event) => setProfileDraft((current) => ({ ...current, handle: event.target.value }))}
              />
            </label>
            <label className="profile-field">
              <span>About</span>
              <textarea
                rows="3"
                value={profileDraft.bio}
                onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
              />
            </label>
            <label className="profile-field">
              <span>Interests</span>
              <input
                value={profileDraft.interests}
                onChange={(event) => setProfileDraft((current) => ({ ...current, interests: event.target.value }))}
                placeholder="Separate interests with commas"
              />
            </label>
            <div className="profile-edit-actions">
              <button type="submit" className="profile-edit-button">Save profile</button>
              <CancelButton onClick={() => setIsEditingProfile(false)} />
            </div>
          </form>
        ) : (
          <>
            <EditIconButton className="profile-edit-icon-button" label="Edit profile" onClick={startProfileEdit} />
            <div className="profile-section">
              <h3>About</h3>
              <div className="profile-bio">{profile.bio || 'No bio added yet.'}</div>
            </div>
            <div className="profile-section">
              <h3>Interests</h3>
              {profile.interests.length ? (
                <div className="profile-tag-list">
                  {profile.interests.map((interest) => (
                    <span className="profile-tag" key={interest}>{interest}</span>
                  ))}
                </div>
              ) : (
                <p className="goals-help">No interests added yet.</p>
              )}
            </div>
          </>
        )}

        <form className="profile-section nutrition-goals-section" onSubmit={saveGoals}>
          <div>
            <h3>Cut goals</h3>
            <p className="goals-help">
              Set your personal weight and daily macro goals. Add nutrition per serving to a recipe
              to compare it here.
            </p>
          </div>

          <label className="goal-field weight-goal-field">
            <span>Weight goal</span>
            <div className="goal-input-with-unit">
              <input
                type="number"
                min="0"
                step="any"
                value={goalDraft.weightGoal}
                onChange={(event) => updateGoal('weightGoal', event.target.value)}
                placeholder="Optional"
              />
              <select
                aria-label="Weight unit"
                value={goalDraft.weightUnit}
                onChange={(event) => updateGoal('weightUnit', event.target.value)}
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </label>

          <div className="macro-goal-grid">
            {goalFields.map(({ key, label }) => (
              <label className="goal-field" key={key}>
                <span>{label} <small>g / day</small></span>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={goalDraft[key]}
                  onChange={(event) => updateGoal(key, event.target.value)}
                  placeholder="Not set"
                />
              </label>
            ))}
          </div>

          <div className="goals-save-row">
            <button type="submit" className="profile-edit-button">Save goals</button>
            {goalsSaved ? <span role="status">Goals saved</span> : null}
          </div>
        </form>

        <section className="profile-section weight-tracker-section">
          <div>
            <h3>Weight history</h3>
            <p className="goals-help">Log your weight over time to compare your entries. Your history stays on this device.</p>
          </div>

          {latestWeight ? (
            <div className="current-weight-card">
              <span>Current weight</span>
              <strong>{latestWeight.weight} {latestWeight.unit}</strong>
              <small>{new Date(`${latestWeight.date}T00:00:00`).toLocaleDateString()}</small>
            </div>
          ) : null}

          <form className="weight-entry-form" onSubmit={saveWeightEntry}>
            <label className="goal-field">
              <span>Weight</span>
              <div className="goal-input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={weightDraft.weight}
                  onChange={(event) => setWeightDraft((current) => ({ ...current, weight: event.target.value }))}
                  placeholder="Enter weight"
                />
                <select
                  aria-label="Weight entry unit"
                  value={weightDraft.unit}
                  onChange={(event) => setWeightDraft((current) => ({ ...current, unit: event.target.value }))}
                >
                  <option value="lb">lb</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </label>
            <label className="goal-field">
              <span>Date</span>
              <input
                type="date"
                required
                value={weightDraft.date}
                onChange={(event) => setWeightDraft((current) => ({ ...current, date: event.target.value }))}
              />
            </label>
            <button type="submit" className="profile-edit-button">Add weight</button>
          </form>

          {sortedWeightEntries.length ? (
            <ol className="weight-history-list">
              {sortedWeightEntries.map((entry, index) => {
                const previousEntry = sortedWeightEntries[index + 1]
                const change = formatWeightChange(entry, previousEntry)
                return (
                  <li key={`${entry.date}-${entry.createdAt || index}`}>
                    <time dateTime={entry.date}>{new Date(`${entry.date}T00:00:00`).toLocaleDateString()}</time>
                    <strong>{entry.weight} {entry.unit}</strong>
                    {change ? (
                      <span className="weight-change">Change: {change}</span>
                    ) : (
                      <span className="weight-change">First entry</span>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="weight-history-empty">Your weight entries will appear here.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default ProfilePage
