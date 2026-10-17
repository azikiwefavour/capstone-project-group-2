import MedTrailLogo from '../../admin/components/MedTrailLogo'
import DoctorIcon from './DoctorIcon'

const items = [
  { view: 'overview', label: 'Dashboard', icon: 'dashboard', path: 'dashboard' },
  { view: 'patients', label: 'Patients', icon: 'patients', path: 'patients' },
  { view: 'clarifications', label: 'Clarifications', icon: 'clarification', path: 'clarifications' },
]

function DoctorSidebar({ doctorName, view, onLogout, basePath = '/doctor' }) {
  const profileName = doctorName || 'Doctor'

  return (
    <aside className="flex bg-[#475AA2] text-white lg:h-screen lg:w-1/5 lg:min-w-[250px] lg:flex-col lg:overflow-y-auto">
      <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 lg:min-h-full lg:flex-1 lg:px-5 lg:pb-6 lg:pt-6">
        <div className="flex items-center"><MedTrailLogo /></div>
        <nav aria-label="Doctor navigation" className="flex gap-2 overflow-x-auto lg:mt-4 lg:flex-col lg:overflow-visible">
          {items.map((item) => (
            <Link
              key={item.view}
              to={`${basePath}/${item.path}`}
              aria-current={view === item.view ? 'page' : undefined}
              className={`flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20 ${view === item.view ? 'bg-[#DEE2F4] text-[#475AA2]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              <DoctorIcon type={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="lg:mt-auto">
          <button type="button" onClick={onLogout} className="mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20">
            <DoctorIcon type="logout" />
            Log out
          </button>
          <div className="box-border flex min-h-16 w-full max-w-[263px] items-center gap-3 rounded-[32px] bg-[#586EC1] py-2.5 pl-[13px] pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-[#475AA2]">
              {doctorName ? doctorName.trim().slice(0, 1).toUpperCase() : <DoctorIcon type="patients" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium" title={profileName}>{profileName}</p>
              <p className="text-xs font-medium text-white/70">Doctor</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default DoctorSidebar
import { Link } from 'react-router-dom'
