import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/utils/errorHandler';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, {
      scope: 'app-error-boundary',
      fallbackMessage: 'The app crashed unexpectedly.',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-6 text-[var(--evergreen)]">
        <div className="max-w-md rounded-[1.75rem] border border-[var(--evergreen)]/12 bg-white/90 p-8 text-center shadow-[0_20px_60px_rgba(27,42,32,0.12)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--trail-orange)]">
            TrailReplay
          </p>
          <h1 className="mt-3 text-2xl font-bold">Something went wrong</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--evergreen-60)]">
            The page hit an unexpected runtime error. Reload the app to return to a clean state.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[var(--evergreen)] px-4 py-2 text-sm font-semibold text-[var(--canvas)] transition-colors hover:bg-[var(--evergreen)]/90"
          >
            Reload TrailReplay
          </button>
        </div>
      </div>
    );
  }
}
