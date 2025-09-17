import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { sanitizeObject } from '@/utils/inputValidation'
import { handleError, createAppError } from '@/utils/errorHandler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Sanitize error data before logging
    const sanitizedError = {
      ...error,
      message: error.message?.substring(0, 500) || 'Unknown error', // Limit message length
      stack: error.stack?.substring(0, 2000) || undefined // Limit stack trace
    }

    const sanitizedErrorInfo = {
      componentStack: errorInfo.componentStack?.substring(0, 1000) || undefined
    }

    console.error('ErrorBoundary caught an error:', sanitizedError.message)

    this.setState({
      error: sanitizedError,
      errorInfo: sanitizedErrorInfo
    })

    // Use centralized error handler
    handleError(createAppError('React Error Boundary', {
      severity: 'high',
      category: 'unknown',
      details: sanitizeObject({
        originalMessage: sanitizedError.message,
        componentStack: sanitizedErrorInfo.componentStack,
        timestamp: Date.now()
      }),
      recoverable: true
    }), 'ErrorBoundary')

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(sanitizedError, sanitizedErrorInfo)
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError)
      }
    }

    // Log to monitoring service
    this.logErrorToService(sanitizedError, sanitizedErrorInfo)
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Sanitize all error data before storage
    const errorData = sanitizeObject({
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message?.substring(0, 200) || 'Unknown error',
      componentStack: errorInfo.componentStack?.substring(0, 500) || undefined,
      timestamp: new Date().toISOString(),
      url: window.location.pathname, // Don't include query params for privacy
      userAgent: navigator.userAgent?.substring(0, 100) || 'Unknown', // Limit UA string
      severity: 'boundary_error'
    })

    // Store in localStorage for now (replace with actual monitoring service)
    try {
      const storageKey = 'app_boundary_errors'
      const existingErrors = JSON.parse(localStorage.getItem(storageKey) || '[]')
      existingErrors.push(errorData)

      // Keep only last 20 errors to prevent storage bloat
      if (existingErrors.length > 20) {
        existingErrors.splice(0, existingErrors.length - 20)
      }

      localStorage.setItem(storageKey, JSON.stringify(existingErrors))
    } catch (storageError) {
      // Fail silently for storage errors to prevent infinite loops
      console.warn('Failed to log error to localStorage')
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
                </p>
              </div>

              {/* Error Details (only in development) */}
              {!import.meta.env.PROD && this.state.error && (
                <details className="border rounded-lg p-4 bg-muted/30">
                  <summary className="cursor-pointer font-medium text-sm text-destructive">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-4 space-y-2 text-xs font-mono">
                    <div>
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack (truncated):</strong>
                        <pre className="whitespace-pre-wrap break-all bg-background p-2 rounded border mt-1 max-h-32 overflow-y-auto">
                          {this.state.error.stack.substring(0, 1000)}
                          {this.state.error.stack.length > 1000 && '\n... [truncated]'}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack (truncated):</strong>
                        <pre className="whitespace-pre-wrap break-all bg-background p-2 rounded border mt-1 max-h-32 overflow-y-auto">
                          {this.state.errorInfo.componentStack.substring(0, 500)}
                          {this.state.errorInfo.componentStack.length > 500 && '\n... [truncated]'}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go to Home
                </Button>
              </div>

              {/* Report Issue */}
              <div className="text-center text-sm text-muted-foreground">
                <p>
                  If this problem persists, please refresh the page or{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() => window.location.reload()}
                  >
                    reload the application
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easy wrapping
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorComponent?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorComponent}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ErrorBoundary