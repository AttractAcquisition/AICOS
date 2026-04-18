import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const redirectParam = new URLSearchParams(window.location.search).get('__redirect')
if (redirectParam) {
  window.history.replaceState({}, '', redirectParam)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
