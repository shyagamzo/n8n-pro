import React, { Component, type ReactNode } from 'react'
import './ErrorBoundary.css'
import { emitUnhandledError } from '../events/emitters'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error boundary component to catch React rendering errors
 * and display a fallback UI instead of crashing the entire app.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState>
{
  constructor(props: ErrorBoundaryProps)
  {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>
  {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void
  {
    this.setState({ errorInfo })

    // Emit error event for reactive logger
    emitUnhandledError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack
    })
  }

  handleReset = (): void =>
  {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render(): ReactNode
  {
    if (this.state.hasError)
    {
      // Use custom fallback if provided
      if (this.props.fallback)
      {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <div className="error-boundary__icon">⚠️</div>
            <h2 className="error-boundary__title">Something went wrong</h2>
            <p className="error-boundary__message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="error-boundary__actions">
              <button
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={() => window.location.reload()}
              >
                Reload Extension
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="error-boundary__details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-boundary__stack">
                  {this.state.error?.stack}
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

