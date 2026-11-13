import { useEffect, useRef, useState } from 'react'
import { DeleteIconButton } from '../ActionButtons'
import confirmDeletion from '../confirmDeletion'
import './CookingMode.css'
import { convertIngredient } from './recipeMeasurements'

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, seconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainder = safeSeconds % 60
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const initialTimer = (label, minutes) => ({
  id: globalThis.crypto?.randomUUID?.() || `timer-${Date.now()}-${Math.random()}`,
  label,
  duration: minutes * 60,
  remaining: minutes * 60,
  endsAt: null,
  running: false,
  complete: false,
})

function CookingMode({
  recipe,
  onClose,
  onSaveNotes,
  initialServings,
  initialMeasurementSystem = 'original',
}) {
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : []
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
  const baseServings = Math.max(1, Number(recipe.servings) || 1)
  const [servings, setServings] = useState(initialServings || baseServings)
  const [measurementSystem, setMeasurementSystem] = useState(initialMeasurementSystem)
  const [stepIndex, setStepIndex] = useState(0)
  const [checkedIngredients, setCheckedIngredients] = useState([])
  const [timers, setTimers] = useState([])
  const [timerLabel, setTimerLabel] = useState('')
  const [timerMinutes, setTimerMinutes] = useState('')
  const [keepAwake, setKeepAwake] = useState(false)
  const [wakeMessage, setWakeMessage] = useState('')
  const [notes, setNotes] = useState(recipe.notes || '')
  const [substitutions, setSubstitutions] = useState(
    Array.isArray(recipe.substitutions) ? recipe.substitutions.join('\n') : recipe.substitutions || '',
  )
  const wakeLockRef = useRef(null)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setTimers((currentTimers) => currentTimers.map((timer) => {
        if (!timer.running) return timer
        const remaining = Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
        return {
          ...timer,
          remaining,
          running: remaining > 0,
          complete: remaining === 0,
        }
      }))
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        const wakeLock = wakeLockRef.current
        wakeLockRef.current = null
        await wakeLock.release()
      }
    }

    const restoreWakeLock = async () => {
      if (!keepAwake || wakeLockRef.current || document.visibilityState !== 'visible' || !navigator.wakeLock?.request) return
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        setWakeMessage('Screen will stay awake while this mode is open.')
      } catch {
        setKeepAwake(false)
        setWakeMessage('Screen-awake mode is unavailable in this browser.')
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void restoreWakeLock()
      else void releaseWakeLock()
    }

    if (keepAwake) void restoreWakeLock()
    else void releaseWakeLock()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void releaseWakeLock()
    }
  }, [keepAwake])

  const toggleKeepAwake = async () => {
    if (keepAwake) {
      setKeepAwake(false)
      setWakeMessage('Screen-awake mode turned off.')
      return
    }

    if (!navigator.wakeLock?.request) {
      setWakeMessage('Screen-awake mode is unavailable in this browser.')
      return
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setKeepAwake(true)
      setWakeMessage('Screen will stay awake while this mode is open.')
    } catch {
      setWakeMessage('Screen-awake mode could not be enabled.')
    }
  }

  const addTimer = (label, minutes) => {
    const duration = Number(minutes)
    if (!Number.isFinite(duration) || duration <= 0) return
    setTimers((current) => [...current, initialTimer(label || 'Timer', duration)])
  }

  const startTimer = (timerId) => {
    setTimers((current) => current.map((timer) => (
      timer.id === timerId
        ? { ...timer, endsAt: Date.now() + timer.remaining * 1000, running: true, complete: false }
        : timer
    )))
  }

  const pauseTimer = (timerId) => {
    setTimers((current) => current.map((timer) => (
      timer.id === timerId ? { ...timer, running: false } : timer
    )))
  }

  const resetTimer = (timerId) => {
    setTimers((current) => current.map((timer) => (
      timer.id === timerId
        ? { ...timer, remaining: timer.duration, endsAt: null, running: false, complete: false }
        : timer
    )))
  }

  const removeTimer = (timerId) => {
    const timer = timers.find((item) => item.id === timerId)
    if (!timer || !confirmDeletion(`${timer.label} timer`)) return
    setTimers((current) => current.filter((timer) => timer.id !== timerId))
  }

  const saveCookingNotes = () => {
    onSaveNotes(notes, substitutions.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))
  }

  return (
    <main className="cooking-mode">
      <header className="cooking-header">
        <div>
          <p className="eyebrow">Cooking mode</p>
          <h2>{recipe.name}</h2>
        </div>
        <div className="cooking-header-actions">
          <button type="button" className={keepAwake ? 'secondary-button active' : 'secondary-button'} onClick={toggleKeepAwake}>
            {keepAwake ? 'Keep-awake on' : 'Keep screen awake'}
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>Exit cooking mode</button>
        </div>
      </header>

      {wakeMessage ? <p className="cooking-status" role="status">{wakeMessage}</p> : null}

      <section className="cooking-section">
        <div className="cooking-section-heading">
          <div>
              <h3>Ingredients</h3>
              <p>Check off ingredients as you prep them.</p>
          </div>
          <div className="cooking-controls">
            <label>
              <span>Servings</span>
              <div className="serving-control">
                <button type="button" aria-label="Decrease servings" onClick={() => setServings((value) => Math.max(1, value - 1))}>−</button>
                <input
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (Number.isInteger(value) && value > 0) setServings(value)
                  }}
                />
                <button type="button" aria-label="Increase servings" onClick={() => setServings((value) => value + 1)}>+</button>
              </div>
            </label>
            <label>
              <span>Measurements</span>
              <select value={measurementSystem} onChange={(event) => setMeasurementSystem(event.target.value)}>
                <option value="original">Original</option>
                <option value="us">US</option>
                <option value="metric">Metric</option>
              </select>
            </label>
          </div>
        </div>

        <p className="serving-scale-note">Scaled from {baseServings} original serving{baseServings === 1 ? '' : 's'}.</p>
        {ingredients.length ? (
          <ul className="cooking-ingredients">
            {ingredients.map((ingredient, index) => (
              <li key={`${index}-${ingredient}`} className={checkedIngredients.includes(index) ? 'checked' : ''}>
                <label>
                  <input
                    type="checkbox"
                    checked={checkedIngredients.includes(index)}
                    onChange={() => setCheckedIngredients((current) => (
                      current.includes(index)
                        ? current.filter((checkedIndex) => checkedIndex !== index)
                        : [...current, index]
                    ))}
                    aria-label={`Mark ${ingredient} as prepared`}
                  />
                  <span>{convertIngredient(String(ingredient), baseServings, servings, measurementSystem)}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : <p>No ingredients have been added to this recipe yet.</p>}
      </section>

      <section className="cooking-section cooking-step-section">
        <div className="cooking-section-heading">
          <div>
            <h3>Instructions</h3>
            <p>{instructions.length ? `Step ${stepIndex + 1} of ${instructions.length}` : 'No steps yet'}</p>
          </div>
          {instructions.length ? (
            <div className="cooking-step-navigation">
              <button type="button" className="secondary-button" disabled={stepIndex === 0} onClick={() => setStepIndex((step) => step - 1)}>
                Previous
              </button>
              <button type="button" className="primary-button" disabled={stepIndex >= instructions.length - 1} onClick={() => setStepIndex((step) => step + 1)}>
                Next step
              </button>
            </div>
          ) : null}
        </div>

        {instructions.length ? (
          <>
            <div className="cooking-step-progress" aria-label={`Step ${stepIndex + 1} of ${instructions.length}`}>
              {instructions.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  className={index === stepIndex ? 'step-dot current' : index < stepIndex ? 'step-dot complete' : 'step-dot'}
                  aria-label={`Go to step ${index + 1}`}
                  onClick={() => setStepIndex(index)}
                />
              ))}
            </div>
            <article className="cooking-current-step">
              <span>Step {stepIndex + 1}</span>
              <p>{instructions[stepIndex]}</p>
              <button type="button" className="secondary-button" onClick={() => addTimer(`Step ${stepIndex + 1}`, 5)}>
                Add 5-minute timer
              </button>
            </article>
          </>
        ) : <p>Add instructions to this recipe to use step-by-step mode.</p>}
      </section>

      <section className="cooking-section">
        <div className="cooking-section-heading">
          <div>
            <h3 className="timer-section-title">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6m-3 0v2m6.6 1.4 1.4-1.4M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 3v4l2.5 1.5" /></svg>
              Timers
            </h3>
            <p>Run multiple kitchen timers independently.</p>
          </div>
        </div>
        <form
          className="add-timer-form"
          onSubmit={(event) => {
            event.preventDefault()
            addTimer(timerLabel, timerMinutes)
            setTimerLabel('')
            setTimerMinutes('')
          }}
        >
          <label>
            <span>Timer name</span>
            <input value={timerLabel} onChange={(event) => setTimerLabel(event.target.value)} placeholder="e.g. Pasta" />
          </label>
          <label>
            <span>Minutes</span>
            <input type="number" min="0.1" step="any" value={timerMinutes} onChange={(event) => setTimerMinutes(event.target.value)} required />
          </label>
          <button type="submit" className="primary-button timer-add-button">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v4l2.5 1.5M9 2h6m-3 0v2m7.1 1.9 1.4-1.4M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" /></svg>
            Add timer
          </button>
        </form>

        {timers.length ? (
          <div className="cooking-timer-list">
            {timers.map((timer) => (
              <article className={timer.complete ? 'cooking-timer complete' : 'cooking-timer'} key={timer.id}>
                <div
                  className={timer.complete ? 'timer-dial complete' : 'timer-dial'}
                  style={{ '--timer-progress': `${timer.duration ? ((timer.duration - timer.remaining) / timer.duration) * 100 : 0}%` }}
                  aria-hidden="true"
                >
                  <span>{timer.complete ? '✓' : formatTime(timer.remaining)}</span>
                </div>
                <div className="timer-details">
                  <strong>{timer.label}</strong>
                  <span className="timer-countdown" aria-live="polite">
                    {timer.complete ? 'Timer complete' : timer.running ? 'Running' : 'Paused'}
                  </span>
                </div>
                <div className="timer-actions">
                  {timer.running ? (
                    <button type="button" className="secondary-button timer-icon-button" aria-label="Pause timer" title="Pause" onClick={() => pauseTimer(timer.id)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zm5 0h3v14h-3z" /></svg>
                    </button>
                  ) : (
                    <button type="button" className="secondary-button timer-icon-button" aria-label={timer.complete ? 'Restart timer' : timer.remaining < timer.duration ? 'Resume timer' : 'Start timer'} title={timer.complete ? 'Restart' : timer.remaining < timer.duration ? 'Resume' : 'Start'} onClick={() => startTimer(timer.id)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>
                    </button>
                  )}
                  <button type="button" className="secondary-button timer-icon-button" aria-label="Reset timer" title="Reset" onClick={() => resetTimer(timer.id)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11a8 8 0 1 1 2.3 5.7M4 5v6h6" /></svg>
                  </button>
                  <DeleteIconButton label={`Remove ${timer.label} timer`} onClick={() => removeTimer(timer.id)} />
                </div>
              </article>
            ))}
          </div>
        ) : <p className="cooking-empty-hint">No timers running. Add one above.</p>}
      </section>

      <section className="cooking-section cooking-notes-grid">
        <label>
          <span>Cooking notes</span>
          <textarea rows="4" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add your notes for next time..." />
        </label>
        <label>
          <span>Substitutions</span>
          <textarea rows="4" value={substitutions} onChange={(event) => setSubstitutions(event.target.value)} placeholder={'One substitution per line\n e.g. Greek yogurt for sour cream'} />
        </label>
        <button type="button" className="primary-button save-cooking-notes" onClick={saveCookingNotes}>Save notes</button>
      </section>
    </main>
  )
}

export default CookingMode
