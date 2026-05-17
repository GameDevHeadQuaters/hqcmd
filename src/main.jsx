import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[App] Fatal crash:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', gap: '16px', fontFamily: 'sans-serif' }}>
          <p style={{ fontSize: '40px' }}>💥</p>
          <h2 style={{ color: 'white', margin: 0 }}>Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '13px', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
            style={{ padding: '10px 24px', borderRadius: '9999px', border: 'none', background: '#534AB7', color: 'white', cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}
          >
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
