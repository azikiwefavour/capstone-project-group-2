import { NavLink } from 'react-router-dom'
import MedTrailLogo from './MedTrailLogo'

const navigationItems = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M4 5.5C4 4.67 4.67 4 5.5 4H9C9.83 4 10.5 4.67 10.5 5.5V9C10.5 9.83 9.83 10.5 9 10.5H5.5C4.67 10.5 4 9.83 4 9V5.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M13.5 5.5C13.5 4.67 14.17 4 15 4H18.5C19.33 4 20 4.67 20 5.5V9C20 9.83 19.33 10.5 18.5 10.5H15C14.17 10.5 13.5 9.83 13.5 9V5.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M4 15C4 14.17 4.67 13.5 5.5 13.5H9C9.83 13.5 10.5 14.17 10.5 15V18.5C10.5 19.33 9.83 20 9 20H5.5C4.67 20 4 19.33 4 18.5V15Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M13.5 15C13.5 14.17 14.17 13.5 15 13.5H18.5C19.33 13.5 20 14.17 20 15V18.5C20 19.33 19.33 20 18.5 20H15C14.17 20 13.5 19.33 13.5 18.5V15Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M3.8 19C4.45 15.95 6.35 14.2 9 14.2C11.65 14.2 13.55 15.95 14.2 19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 11.5C17.66 11.5 19 10.16 19 8.5C19 6.84 17.66 5.5 16 5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M17 14.5C18.86 15.1 20.12 16.6 20.5 19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: 'Audit Log',
    to: '/admin/audit-log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M7 7H17"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 12H17"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M7 17H13"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5.5 3.5H18.5C19.33 3.5 20 4.17 20 5V19C20 19.83 19.33 20.5 18.5 20.5H5.5C4.67 20.5 4 19.83 4 19V5C4 4.17 4.67 3.5 5.5 3.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
]

function AdminSidebar({ adminName, onLogout }) {
  const profileName = adminName || 'Admin'

  return (
    <aside className="flex bg-[#475AA2] text-white lg:h-screen lg:w-1/5 lg:min-w-[250px] lg:flex-col lg:overflow-y-auto">
      <div className="flex w-full flex-col gap-5 px-4 py-5 sm:px-6 lg:min-h-full lg:flex-1 lg:px-5 lg:pb-6 lg:pt-6">
        <div className="flex items-center">
          <MedTrailLogo />
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:mt-4 lg:flex-col lg:overflow-visible">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#DEE2F4] text-[#475AA2]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden lg:block">
          <button
            type="button"
            onClick={onLogout}
            className="mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 -scale-x-100"
            >
              <path
                d="M10 6H6.5C5.67 6 5 6.67 5 7.5V16.5C5 17.33 5.67 18 6.5 18H10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M14 8L18 12L14 16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18 12H10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Log out
          </button>

          <div className="box-border h-16 w-full max-w-[263px] rounded-[32px] bg-[#586EC1] py-2.5 pl-[13px] pr-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-[#475AA2]">
                {profileName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profileName}</p>
                <p className="text-xs font-medium text-white/70">Admin</p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-xl px-4 py-2 text-left text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20 lg:hidden"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
