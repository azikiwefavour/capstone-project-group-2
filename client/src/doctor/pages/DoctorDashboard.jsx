import { useEffect, useState, useSyncExternalStore } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import DoctorLayout from '../components/DoctorLayout'
import DoctorIcon from '../components/DoctorIcon'
import { getDoctorAccessToken, subscribeToDoctorSession } from '../../auth/doctorSession'
import { getDoctorDashboard } from '../dashboard'
import { formatMedicationTimestamp } from '../medicationDates'

const statistics = [
  { key: 'patients', label: 'Patients', icon: 'user', color: 'bg-[#D0E7DC] text-[#2F7D59]' },
  { key: 'awaitingClarification', label: 'Awaiting Clarification', icon: 'bell', color: 'bg-[#DEE2F4] text-[#7A8DD5]' },
  { key: 'prescriptions', label: 'Prescriptions', icon: 'medicineBottle', color: 'bg-[#F8D6DD] text-[#B83F5C]' },
]

const emptyViews = {
  clarifications: { title: 'Clarifications', icon: 'clarification', message: 'No clarifications' },
  activities: { title: 'Recent Activities', icon: 'activity', message: 'No activities' },
}

function EmptyState({ icon, message }) {
  return (
    <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center text-center lg:min-h-0">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]">
        <DoctorIcon type={icon} className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-[#7A8190] lg:mt-4">{message}</p>
    </div>
  )
}

function RecentSection({ title, icon, message, onViewAll, children }) {
  return (
    <section className="flex min-h-[240px] flex-col rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[clamp(240px,calc(100vh-331px),455px)] lg:min-h-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
        <button type="button" onClick={onViewAll} className="shrink-0 text-sm font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15">View All</button>
      </div>
      {children || <EmptyState icon={icon} message={message} />}
    </section>
  )
}

function Timestamp({ value }) {
  const timestamp = formatMedicationTimestamp(value)
  return timestamp ? <time dateTime={timestamp.dateTime}>{timestamp.label}</time> : '\u2014'
}

function RecentPatients({ patients }) {
  return <ul aria-label="Recent patients" className="mt-4 min-h-0 flex-1 divide-y divide-[#E2E5ED] overflow-y-auto">
    {patients.map(patient => <li key={patient.id} className="flex items-center gap-3 py-3 text-sm">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DEE2F4] text-xs font-medium text-[#475AA2]">
        {patient.initials || <DoctorIcon type="user" className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium text-[#111827]">{patient.name || 'Name unavailable'}</p>
        {patient.email && <p className="mt-1 break-words text-xs text-[#7A8190]">{patient.email}</p>}
      </div>
      <span className="max-w-[45%] text-right text-xs text-[#7A8190]"><Timestamp value={patient.lastPrescription?.date} /></span>
    </li>)}
  </ul>
}

function RecentActivities({ activities }) {
  return <ul aria-label="Recent activities" className="mt-4 min-h-0 flex-1 divide-y divide-[#E2E5ED] overflow-y-auto">
    {activities.map(activity => <li key={activity.id} className="flex items-start gap-3 py-3 text-sm">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]"><DoctorIcon type="activity" className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="break-words text-[#111827]">{activity.description || 'Activity details unavailable'}</p>
        <p className="mt-1 text-xs text-[#7A8190]"><Timestamp value={activity.createdAt} /></p>
      </div>
    </li>)}
  </ul>
}

// Mounted inside DoctorLayout only after profile verification. Preview layouts never fetch.
function DashboardContent({ counts, live, view, setView, patientsPath }) {
  const navigate = useNavigate()
  const token = useSyncExternalStore(subscribeToDoctorSession, getDoctorAccessToken)
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const checked = snapshot?.token === token && snapshot?.attempt === attempt
  const data = live && checked ? snapshot.data : null
  const error = live && checked ? snapshot.error : ''
  const loading = live && !checked
  const values = live ? data?.stats : counts

  useEffect(() => {
    if (!live || !token) return
    const controller = new AbortController()
    getDoctorDashboard(controller.signal).then(result => {
      if (!controller.signal.aborted && getDoctorAccessToken() === token) setSnapshot({ token, attempt, data: result })
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError' && getDoctorAccessToken() === token) setSnapshot({ token, attempt, error: error.message })
    })
    return () => controller.abort()
  }, [live, token, attempt])

  const status = loading ? <p role="status" className="mt-4 text-sm text-[#7A8190]">Loading dashboard...</p>
    : error ? <div role="alert" className="mt-4 text-sm text-[#E5484D]">{error} <button type="button" onClick={() => setAttempt(current => current + 1)} className="font-semibold text-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">Try again</button></div> : null

  return (
    <div aria-busy={loading}>
          {view === 'overview' ? (
            <>
              <section className="mt-4">
                <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">Overview</h1>
                <p className="mt-2 text-base leading-relaxed text-[#7A8190]">Find a patient to review or add a medication.</p>
              </section>
              {status}
              <section aria-label="Doctor statistics" className="mt-[22px] grid gap-4 lg:grid-cols-3 lg:gap-[22px]">
                {statistics.map((statistic) => {
                  const value = values?.[statistic.key]
                  const available = Number.isSafeInteger(value) && value >= 0
                  return (
                    <article key={statistic.key} className="flex min-h-[112px] items-center justify-between gap-3 rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[110px] lg:min-h-0">
                      <div className="min-w-0">
                        <p aria-label={loading ? `Loading ${statistic.label}` : available ? `${value} ${statistic.label}` : `${statistic.label} count unavailable`} className="text-3xl font-semibold tracking-normal text-[#111827]">{loading ? '...' : available ? value : '-'}</p>
                        <h2 className="mt-1.5 text-sm font-medium text-[#7A8190]">{statistic.label}</h2>
                      </div>
                      <div className={`flex h-[53px] w-[53px] shrink-0 items-center justify-center rounded-[6px] ${statistic.color}`}><DoctorIcon type={statistic.icon} className="h-5 w-5" /></div>
                    </article>
                  )
                })}
              </section>
              <section className="mt-[38px] grid gap-4 lg:gap-[22px] xl:grid-cols-2">
                <RecentSection title="Recent Patients" icon="patients" message={loading ? 'Loading patients...' : error ? 'Patient records unavailable' : 'No patient records'} onViewAll={() => navigate(patientsPath)}>
                  {data?.recentPatients.length > 0 && <RecentPatients patients={data.recentPatients} />}
                </RecentSection>
                <RecentSection title="Recent Activities" icon="activity" message={loading ? 'Loading activities...' : error ? 'Activities unavailable' : 'No activities'} onViewAll={() => setView('activities')}>
                  {data?.recentActivities.length > 0 && <RecentActivities activities={data.recentActivities} />}
                </RecentSection>
              </section>
            </>
          ) : (
            <section className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">{emptyViews[view].title}</h1>
                <button type="button" onClick={() => setView('overview')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"><DoctorIcon type="back" />Dashboard</button>
              </div>
              {status}
              <div className="mt-[22px] flex min-h-[320px] flex-col border-y border-[#E2E5ED] bg-white py-8">
                {view === 'activities' && data?.recentActivities.length > 0 ? <RecentActivities activities={data.recentActivities} />
                  : <EmptyState icon={emptyViews[view].icon} message={loading ? 'Loading dashboard...' : error ? 'Records unavailable' : emptyViews[view].message} />}
              </div>
            </section>
          )}
    </div>
  )
}

export default function DoctorDashboard({ doctor = null, counts = null, Layout = DoctorLayout, patientsPath = '/doctor/patients' }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const view = Object.hasOwn(emptyViews, requestedView) ? requestedView : 'overview'
  function setView(nextView) {
    setSearchParams(nextView === 'overview' ? {} : { view: nextView })
  }
  return <Layout doctor={doctor} view={view}>
    <DashboardContent counts={counts} live={Layout === DoctorLayout} view={view} setView={setView} patientsPath={patientsPath} />
  </Layout>
}
