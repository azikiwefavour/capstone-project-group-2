import { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(current => current.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts(current => [...current, { id, type, title, message }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  const success = useCallback((message, title = 'Success') => addToast({ type: 'success', title, message }), [addToast])
  const error = useCallback((message, title = 'Error') => addToast({ type: 'error', title, message }), [addToast])
  const warning = useCallback((message, title = 'Warning') => addToast({ type: 'warning', title, message }), [addToast])
  const info = useCallback((message, title = 'Information') => addToast({ type: 'info', title, message }), [addToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div
          role="region"
          aria-label="Notifications"
          className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        >
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success'
            const isError = toast.type === 'error'
            const isWarning = toast.type === 'warning'

            return (
              <div
                key={toast.id}
                role="status"
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
                  isSuccess
                    ? 'border-emerald-200 bg-white text-emerald-950 dark:border-emerald-800/60 dark:bg-[#13281E] dark:text-emerald-100'
                    : isError
                    ? 'border-rose-200 bg-white text-rose-950 dark:border-rose-800/60 dark:bg-[#281517] dark:text-rose-100'
                    : isWarning
                    ? 'border-amber-200 bg-white text-amber-950 dark:border-amber-800/60 dark:bg-[#292014] dark:text-amber-100'
                    : 'border-[#DEE2F4] bg-white text-[#111827] dark:border-[#2C3852] dark:bg-[#161F30] dark:text-slate-100'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    isSuccess
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : isError
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                      : isWarning
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                      : 'bg-[#EEF0FF] text-[#475AA2] dark:bg-[#475AA2]/20 dark:text-[#A5B4FC]'
                  }`}
                >
                  {isSuccess ? '✓' : isError ? '✕' : isWarning ? '!' : 'i'}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  {toast.title && <p className="text-sm font-semibold leading-tight">{toast.title}</p>}
                  <p className="mt-1 text-xs leading-normal opacity-90">{toast.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-lg p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      success: (msg, title) => console.log('Toast (success):', title, msg),
      error: (msg, title) => console.error('Toast (error):', title, msg),
      warning: (msg, title) => console.warn('Toast (warning):', title, msg),
      info: (msg, title) => console.info('Toast (info):', title, msg),
    }
  }
  return context
}
