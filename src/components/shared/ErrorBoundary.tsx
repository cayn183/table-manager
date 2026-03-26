import React from 'react'
import logger from '../../utils/logger'
import sentry from '../../sentryClient'

type State = { hasError: boolean; error?: Error | null; stack?: string | null }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    logger.error('ErrorBoundary', { error, info })
    // report to Sentry if available
    try { sentry.captureException(error, { requestId: (window as any).__requestId }) } catch (e) {}
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
