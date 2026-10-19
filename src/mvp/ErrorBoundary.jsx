import { Component } from 'react'

// Last line of defence: show a way back instead of a blank screen.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="m-app">
        <header className="m-head">
          <h1 className="m-head__title">Something went wrong</h1>
          <p className="m-head__sub">Your picks are safe. Reloading usually sorts it.</p>
        </header>
        <main className="m-list">
          <div className="m-notice">
            <button type="button" className="m-btn m-btn--block m-press" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </main>
      </div>
    )
  }
}
