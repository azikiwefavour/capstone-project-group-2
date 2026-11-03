import { NavLink } from 'react-router-dom'
import MedTrailLogo from '../../admin/components/MedTrailLogo'
import DoctorIcon from '../../doctor/components/DoctorIcon'

export default function PharmacistSidebar({ pharmacistName, onLogout }) {
  const profileName = pharmacistName || 'Pharmacist'
  const navigationClass = ({ isActive }) => `flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/20 ${isActive ? 'bg-[#DEE2F4] text-[#475AA2]' : 'text-white/85 hover:bg-white/10 hover:text-white'}`

  return <aside className="flex bg-[#475AA2] text-white lg:h-screen lg:w-1/5 lg:min-w-[250px] lg:flex-col lg:overflow-y-auto">
    <div className="flex w-full min-w-0 flex-col gap-5 px-4 py-5 sm:px-6 lg:min-h-full lg:flex-1 lg:px-5 lg:pb-6 lg:pt-6">
      <div className="flex items-center"><MedTrailLogo /></div>
      <nav aria-label="Pharmacist navigation" className="flex gap-2 overflow-x-auto lg:mt-4 lg:flex-col lg:overflow-visible">
        <NavLink to="/pharmacist/dashboard" className={navigationClass}>
          <DoctorIcon type="dashboard" />Dashboard
        </NavLink>
        <NavLink to="/pharmacist/verification-queue" className={navigationClass}>
          <DoctorIcon type="prescription" />Verification Queue
        </NavLink>
        <NavLink to="/pharmacist/clarifications" className={navigationClass}>
          <DoctorIcon type="clarification" />Clarifications
        </NavLink>
        <NavLink to="/pharmacist/dispensed-medication" className={navigationClass}>
          <DoctorIcon type="medicineBottle" />Dispensed medication
        </NavLink>
      </nav>
      <div className="lg:mt-auto">
        <button type="button" onClick={onLogout} className="mb-4 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-4 focus:ring-white/20">
          <DoctorIcon type="logout" />Log out
        </button>
        <div className="box-border flex min-h-16 w-full max-w-[263px] items-center gap-3 rounded-[32px] bg-[#586EC1] py-2.5 pl-[13px] pr-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-base font-semibold text-[#475AA2]">
            {pharmacistName ? pharmacistName.slice(0, 1).toUpperCase() : <DoctorIcon type="user" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={profileName}>{profileName}</p>
            <p className="text-xs font-medium text-white/70">Pharmacist</p>
          </div>
        </div>
      </div>
    </div>
  </aside>
}
