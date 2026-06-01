import React from 'react'
import ReactDOM from 'react-dom/client'
import BubbleApp from './BubbleApp'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('bubble-root')!).render(
  <React.StrictMode>
    <BubbleApp />
  </React.StrictMode>
)
