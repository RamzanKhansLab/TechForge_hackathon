import { Component } from 'react';
import './ErrorBoundary.css';
export class ErrorBoundary extends Component {
  state = { failed: false, error: null };
  static getDerivedStateFromError(error) { return { failed: true, error }; }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.failed) {
      return (
        <main className="error-boundary p-8 max-w-xl mx-auto my-12 border border-[var(--color-rule,#ded7c8)] bg-white text-center">
          <h1 className="font-serif text-xl font-bold text-[var(--color-ink,#1a1815)]">Let’s get you back on track.</h1>
          <p className="text-xs text-[var(--color-ink-2,#4a443b)] mt-2">
            The page encountered an unexpected rendering error. Your saved report keys are still stored in this browser.
          </p>
          {this.state.error?.message && (
            <div className="my-4 p-3 bg-red-50 border border-red-200 text-left font-mono text-xs text-red-700 break-words">
              <strong>Error:</strong> {this.state.error.message}
            </div>
          )}
          <a className="btn btn-primary text-xs mt-3 inline-block" href="/">Return home</a>
        </main>
      );
    }
    return this.props.children;
  }
}

