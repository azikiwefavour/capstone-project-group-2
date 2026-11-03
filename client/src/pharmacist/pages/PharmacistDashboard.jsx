import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import DoctorIcon from '../../doctor/components/DoctorIcon'
import { getPharmacistAccessToken, subscribeToPharmacistSession } from '../../auth/pharmacistSession'
import { getPharmacistDashboard } from '../dashboard'

const statistics = [
  { key: 'awaitingClarification', label: 'Awaiting Clarification', icon: 'bell', color: 'bg-[#DEE2F4] text-[#7A8DD5]' },
  { key: 'verifiedPrescriptions', label: 'Verified Prescriptions', icon: 'prescription', color: 'bg-[#D0E7DC] text-[#2F7D59]' },
  { key: 'dispensedMedications', label: 'Dispensed Medications', icon: 'medicineBottle', color: 'bg-[#F8D6DD] text-[#B83F5C]' },
]

function EmptyState({ icon, message }) {
  return <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center text-center lg:min-h-0">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]"><DoctorIcon type={icon} /></div>
    <p className="mt-3 text-sm font-medium text-[#7A8190] lg:mt-4">{message}</p>
  </div>
}

export default function PharmacistDashboard() {
  const token = useSyncExternalStore(subscribeToPharmacistSession, getPharmacistAccessToken)
  const [attempt, setAttempt] = useState(0)
  const [snapshot, setSnapshot] = useState(null)
  const [searchParams] = useSearchParams()
  const showAllPatients = searchParams.get('patients') === 'all'
  const checked = snapshot?.token === token && snapshot?.attempt === attempt
  const data = checked ? snapshot.data : null
  const error = checked ? snapshot.error : ''
  const loading = !checked

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    getPharmacistDashboard(controller.signal).then(result => {
      if (!controller.signal.aborted && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, data: result })
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError' && getPharmacistAccessToken() === token) setSnapshot({ token, attempt, error: error.message })
    })
    return () => controller.abort()
  }, [token, attempt])

  const patients = data?.recentPatients || []
  const visiblePatients = showAllPatients ? patients : patients.slice(0, 5)

  return <div aria-busy={loading}>
    <section className="mt-4">
      <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">Overview</h1>
      <p className="mt-2 text-base leading-relaxed text-[#7A8190]">Review each prescription against the patient's current medications.</p>
    </section>
    {loading ? <p role="status" className="mt-4 text-sm text-[#7A8190]">Loading dashboard...</p>
      : error ? <div role="alert" className="mt-4 text-sm text-[#E5484D]">{error} <button type="button" onClick={() => setAttempt(current => current + 1)} className="font-semibold text-[#475AA2] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/15">Try again</button></div> : null}
    <section aria-label="Pharmacist statistics" className="mt-[22px] grid gap-4 lg:grid-cols-3 lg:gap-[22px]">
      {statistics.map(statistic => {
        const value = data?.stats[statistic.key]
        const available = Number.isSafeInteger(value) && value >= 0
        const waiting = loading && !available
        return <article key={statistic.key} className="flex min-h-[112px] items-center justify-between gap-3 rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:min-h-[110px]">
          <div className="min-w-0">
            <p aria-label={waiting ? `Loading ${statistic.label}` : available ? `${value} ${statistic.label}` : `${statistic.label} count unavailable`} className="text-3xl font-semibold tracking-normal text-[#111827]">{waiting ? '...' : available ? value : '—'}</p>
            <h2 className="mt-1.5 text-sm font-medium text-[#7A8190]">{statistic.label}</h2>
            {statistic.key === 'verifiedPrescriptions' && !available && !loading && <p className="mt-1 text-xs text-[#7A8190]">Not available yet</p>}
          </div>
          <div className={`flex h-[53px] w-[53px] shrink-0 items-center justify-center rounded-[6px] ${statistic.color}`}><DoctorIcon type={statistic.icon} /></div>
        </article>
      })}
    </section>
    <section className="mt-[38px] grid gap-4 lg:gap-[22px] xl:grid-cols-2">
      <section id="recent-patients" aria-labelledby="recent-patients-title" className="flex min-h-[240px] flex-col rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[clamp(240px,calc(100vh-331px),455px)] lg:min-h-0">
        <div className="flex items-center justify-between gap-4">
          <h2 id="recent-patients-title" className="text-base font-semibold text-[#111827]">Recent Patients</h2>
          <Link to={showAllPatients ? '/pharmacist/dashboard#recent-patients' : '/pharmacist/dashboard?patients=all#recent-patients'} className="shrink-0 text-sm font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15">{showAllPatients ? 'View Less' : 'View All'}</Link>
        </div>
        {visiblePatients.length > 0 ? <ul aria-label="Recent patients" className="mt-4 min-h-0 flex-1 divide-y divide-[#E2E5ED] overflow-y-auto">
          {visiblePatients.map(patient => <li key={patient.id} className="flex items-center gap-3 py-3 text-sm">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DEE2F4] text-[#475AA2]"><DoctorIcon type="user" className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-[#111827]">{patient.name || 'Name unavailable'}</p>
              <p className="mt-1 break-words text-xs text-[#7A8190]">{patient.email || 'Email unavailable'}</p>
            </div>
          </li>)}
        </ul> : <EmptyState icon="patients" message={loading ? 'Loading patients...' : error ? 'Patient records unavailable' : 'No recent patient records'} />}
      </section>
      <section aria-labelledby="recent-activities-title" className="flex min-h-[240px] flex-col rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[clamp(240px,calc(100vh-331px),455px)] lg:min-h-0">
        <div className="flex items-center justify-between gap-4">
          <h2 id="recent-activities-title" className="text-base font-semibold text-[#111827]">Recent Activities</h2>
        </div>
        {data?.recentActivities && data.recentActivities.length > 0 ? (
          <ul aria-label="Recent activities" className="mt-4 min-h-0 flex-1 divide-y divide-[#E2E5ED] overflow-y-auto">
            {data.recentActivities.map(activity => (
              <li key={activity.id} className="flex items-start gap-3 py-3 text-sm">
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]">
                  <DoctorIcon type="activity" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[#111827]">{activity.description || 'Activity details unavailable'}</p>
                  <p className="mt-1 text-xs text-[#7A8190]">{activity.date || activity.createdAt || ''}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="activity" message={loading ? 'Loading activities...' : 'No recent activities recorded yet.'} />
        )}
      </section>
    </section>
  </div>
}
