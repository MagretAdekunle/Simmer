// React entry point.
// This file mounts the App component into the browser and enables React's strict mode.
// If you add routing, providers, or global app wrappers, this is where they should be introduced.

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
