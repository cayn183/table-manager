import React from 'react'

type State = { hasError: boolean; error?: Error | null; stack?: string | null }

export default class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Uncaught render error:', error, info)
    this.setState({ error, stack: info?.componentStack || null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Ein Fehler ist aufgetreten</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#900' }}>{String(this.state.error)}{this.state.stack ? '\n\n' + this.state.stack : ''}</pre>
        </div>
      )
    }
    return this.props.children as React.ReactElement
  }
}
