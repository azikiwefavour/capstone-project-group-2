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
    <aside aria-label="Super Admin sidebar" className="flex bg-[#475AA2] text-white lg:h-screen lg:w-1/5 lg:min-w-[250px] lg:flex-col lg:overflow-y-auto">
      <div className="flex w-full flex-col gap-5 px-4 py-5 sm:px-6 lg:min-h-full lg:flex-1 lg:px-5 lg:pb-6 lg:pt-6">
        <MedTrailLogo />
        <nav aria-label="Super Admin navigation" className="flex gap-2 overflow-x-auto lg:mt-4 lg:flex-col lg:overflow-visible">
          {items.map(([label, path], index) => {
            const icon = <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0"><path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            const base = 'flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium'
            return index < 7 ? <NavLink key={label} end to={`/super-admin/${['overview', 'facilities', 'subscriptions', 'payments', 'messaging', 'system-health', 'audit-log'][index]}`} className={({ isActive }) => `${base} ${isActive ? 'bg-[#DEE2F4] text-[#475AA2]' : 'text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white'}`}>
              {icon}{label}
            </NavLink> : <button key={label} type="button" disabled title={`${label} — coming soon`} className={`${base} cursor-default text-white/80`}>{icon}{label}</button>
          })}
        </nav>
        <div className="lg:mt-auto">
          <button type="button" disabled={!onLogout} onClick={onLogout} className="mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/85 hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5"><path d="M10 6H5v12h5 M14 8l4 4-4 4 M18 12H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Log out
          </button>
          <div className="flex min-h-16 max-w-[263px] items-center gap-3 rounded-[32px] bg-white/10 px-3 py-2.5">
            <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-[#475AA2]">{name ? name.slice(0, 1).toUpperCase() : '—'}</div>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{profileName}</p><p className="text-xs font-medium text-white/70">Super Admin</p></div>
          </div>
        </div>
      </div>
    </aside>
  )
}
