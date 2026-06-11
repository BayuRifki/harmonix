import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-8">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-zinc-400 mb-4">
              An unexpected error occurred. You can try reloading or return to the home screen.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
                  Error details
                </summary>
                <pre className="mt-2 text-[10px] text-zinc-500 bg-zinc-900 rounded p-2 overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  this.handleReset();
                  window.location.href = '/';
                }}
                className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
