import { Component, ReactNode } from 'react';
import { Icon } from './Icon';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-base-300 p-4">
          <div className="card bg-base-100 border border-base-300 shadow-xl max-w-lg w-full p-8 text-center">
            <div className="text-error mb-4 flex justify-center">
              <Icon name="alert-triangle" className="w-16 h-16" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-base-content/60 mb-4">
              The application encountered an unexpected error. This has been logged.
            </p>
            <details className="text-left mb-6 p-3 bg-base-200 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium mb-2">Error details</summary>
              <pre className="text-xs text-error overflow-auto whitespace-pre-wrap">
                {this.state.error?.message}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>
            <button className="btn btn-primary" onClick={this.handleReset}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
