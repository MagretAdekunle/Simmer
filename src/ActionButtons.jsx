export function BackButton({ children = 'Back', iconOnly = false, className = '', ...props }) {
  const classes = ['secondary-button', 'back-icon-button', iconOnly ? 'icon-only' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      aria-label={iconOnly ? children : undefined}
      title={iconOnly ? children : undefined}
      {...props}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m15 18-6-6 6-6M9 12h11" />
      </svg>
      {iconOnly ? null : children}
    </button>
  )
}

export function CancelButton({ ...props }) {
  return (
    <button
      type="button"
      className="cancel-icon-button"
      aria-label="Cancel"
      title="Cancel"
      {...props}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m18 6-12 12M6 6l12 12" />
      </svg>
    </button>
  )
}

export function EditIconButton({ label = 'Edit', className = '', ...props }) {
  return (
    <button
      type="button"
      className={['icon-action-button', 'edit-icon-button', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...props}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" />
      </svg>
    </button>
  )
}

export function DeleteIconButton({ label = 'Delete', className = '', ...props }) {
  return (
    <button
      type="button"
      className={['icon-action-button', 'delete-icon-button', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...props}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
      </svg>
    </button>
  )
}
