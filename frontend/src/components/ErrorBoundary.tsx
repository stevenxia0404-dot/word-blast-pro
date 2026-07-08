import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-sm mx-auto min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center gap-4">
          <span className="text-5xl">😵</span>
          <h2 className="text-xl font-bold text-gray-700">哎呀，出了点问题</h2>
          <p className="text-sm text-gray-400">{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-all"
          >
            重新开始
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
