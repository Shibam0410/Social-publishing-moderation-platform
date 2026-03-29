import { Component } from 'react';

/**
 * ErrorBoundary — wraps any component to catch render errors.
 * On error it shows a small fallback card instead of crashing the whole page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || 'Unknown error' };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-4">
          ⚠️ This post couldn't be displayed. ({this.state.errorMsg})
        </div>
      );
    }
    return this.props.children;
  }
}
