import { Component } from 'react';
import './ErrorBoundary.css';
export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main className="error-boundary"><h1>Let’s get you back on track.</h1><p>The page encountered an unexpected error. Your saved report keys are still in this browser.</p><a className="btn btn-primary" href="/">Return home</a></main> : this.props.children; }
}
