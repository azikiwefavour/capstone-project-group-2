const THEME_KEY = 'medtrail_theme'

export function getTheme() {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem(THEME_KEY) || 'light'
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export function setTheme(theme) {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
}

export function initTheme() {
  if (typeof window === 'undefined') return
  const current = getTheme()
  applyTheme(current)

  // Listen to system changes if theme is system
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (getTheme() === 'system') {
      applyTheme('system')
    }
  }
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener)
  }
}
