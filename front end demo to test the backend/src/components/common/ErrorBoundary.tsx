import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('voluntrack_sanctum_token');
    localStorage.removeItem('voluntrack_user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#131d2e] border border-slate-700 rounded-xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-100">Application Error Caught</h2>
              <p className="text-xs text-slate-400 mt-1">
                An unexpected component rendering error occurred. You can reset your session below.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-rose-400 text-left break-words overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 px-3 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 rounded text-xs font-bold border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Clear Session & Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
