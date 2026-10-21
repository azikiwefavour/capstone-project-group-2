import DoctorIcon from '../../doctor/components/DoctorIcon'

export default function PharmacistPatientProfile({ patient, compact = false }) {
  const initials = patient.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <section aria-label="Patient profile" className={`mt-5 flex items-center gap-3 rounded-xl border border-[#DEE2F4] bg-[#EEF0FF] p-4 ${compact ? 'lg:mt-3 lg:py-3' : ''}`}>
    <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DEE2F4] text-sm font-semibold text-[#475AA2]">{initials || <DoctorIcon type="user" className="h-5 w-5" />}</div>
    <div className="min-w-0"><h1 className={`break-words text-lg font-semibold text-[#111827] ${compact ? 'lg:text-base' : ''}`}>{patient.name || 'Patient information unavailable'}</h1>
      <p className={`mt-1 text-sm text-[#7A8190] ${compact ? 'lg:text-xs' : ''}`}>{Number.isSafeInteger(patient.age) && patient.age >= 0 ? `${patient.age} years old` : 'Age unavailable'} &bull; {patient.gender || 'Gender unavailable'}</p>
    </div>
  </section>
}
