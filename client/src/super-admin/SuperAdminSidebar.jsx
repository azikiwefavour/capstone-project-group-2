import { NavLink } from 'react-router-dom'
import MedTrailLogo from '../admin/components/MedTrailLogo'

const items = [
  ['Overview', 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
  ['Facilities', 'M4 21V5h16v16 M9 21v-5h6v5 M8 9h1 M15 9h1 M8 12h1 M15 12h1'],
  ['Subscriptions', 'M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4'],
  ['Payments', 'M3 6h18v13H3z M3 10h18 M7 15h3'],
  ['Messaging', 'M3 4h18v13H9l-6 4z M7 8h10 M7 12h6'],
  ['System Health', 'M3 12h4l3-7 4 14 3-7h4'],
  ['Audit log', 'M5 3h14v18H5z M9 7h6 M9 12h6 M9 17h4'],
]

export default function SuperAdminSidebar({ name, preview, onLogout }) {
  const profileName = name || 'MedTrail Super Admin'
  return (
    <aside aria-label="Super Admin sidebar" className="flex bg-[#4355B8] text-white dark:bg-[#111A2E] lg:h-screen lg:w-64 lg:min-w-[250px] lg:flex-col lg:overflow-y-auto border-r border-[#3848A0] dark:border-[#1E293B] transition-colors">
      <div className="flex w-full flex-col gap-5 px-4 py-5 sm:px-6 lg:min-h-full lg:flex-1 lg:px-5 lg:pb-6 lg:pt-6">
        <div className="pl-1">
          <MedTrailLogo />
        </div>
        <nav aria-label="Super Admin navigation" className="flex gap-2 overflow-x-auto lg:mt-4 lg:flex-col lg:overflow-visible">
          {items.map(([label, path], index) => {
            const icon = <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0"><path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            const base = 'flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all'
            return index < 7 ? <NavLink key={label} end to={`/super-admin/${['overview', 'facilities', 'subscriptions', 'payments', 'messaging', 'system-health', 'audit-log'][index]}`} className={({ isActive }) => `${base} ${isActive ? 'bg-[#EEF1FF] text-[#3B4C9B] shadow-sm font-semibold dark:bg-[#202C48] dark:text-[#E2E8F0]' : 'text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white'}`}>
              {icon}{label}
            </NavLink> : <button key={label} type="button" disabled title={`${label} — coming soon`} className={`${base} cursor-default text-white/80`}>{icon}{label}</button>
          })}
        </nav>
        <div className="lg:mt-auto">
          <button type="button" disabled={!onLogout} onClick={onLogout} className="mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20 transition">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M10 6H5v12h5 M14 8l4 4-4 4 M18 12H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Log out
          </button>
          <div className="flex min-h-14 max-w-full items-center gap-3 rounded-2xl bg-white/10 dark:bg-white/5 px-3 py-2 border border-white/10">
            <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#4355B8] shadow-xs">{name ? name.slice(0, 1).toUpperCase() : 'A'}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{profileName}</p><p className="text-xs text-white/70">Super Admin</p></div>
            <svg className="h-4 w-4 shrink-0 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
          </div>
        </div>
      </div>
    </aside>
  )
}
