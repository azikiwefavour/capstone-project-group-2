import { useNavigate, useSearchParams } from 'react-router-dom'
import DoctorLayout from '../components/DoctorLayout'
import DoctorIcon from '../components/DoctorIcon'

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

function RecentSection({ title, icon, message, onViewAll }) {
  return (
    <section className="flex min-h-[240px] flex-col rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[clamp(240px,calc(100vh-331px),455px)] lg:min-h-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
        <button type="button" onClick={onViewAll} className="shrink-0 text-sm font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15">View All</button>
      </div>
      <EmptyState icon={icon} message={message} />
    </section>
  )
}

// The preview session is navigation-only, not API authorization. Supply a backend-confirmed
// doctor profile and counts here when Doctor authentication/data integration is available.
function DoctorDashboard({ doctor = null, counts = null, Layout = DoctorLayout, patientsPath = '/doctor/patients' }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('view')
  const view = Object.hasOwn(emptyViews, requestedView) ? requestedView : 'overview'

  function setView(nextView) {
    setSearchParams(nextView === 'overview' ? {} : { view: nextView })
  }

  return (
    <Layout doctor={doctor} view={view}>
          {view === 'overview' ? (
            <>
              <section className="mt-4">
                <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">Overview</h1>
                <p className="mt-2 text-base leading-relaxed text-[#7A8190]">Find a patient to review or add a medication.</p>
              </section>
              <section aria-label="Doctor statistics" className="mt-[22px] grid gap-4 lg:grid-cols-3 lg:gap-[22px]">
                {statistics.map((statistic) => {
                  const value = counts?.[statistic.key]
                  const available = Number.isSafeInteger(value) && value >= 0
                  return (
                    <article key={statistic.key} className="flex min-h-[112px] items-center justify-between gap-3 rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[110px] lg:min-h-0">
                      <div className="min-w-0">
                        <p aria-label={available ? `${value} ${statistic.label}` : `${statistic.label} count unavailable`} className="text-3xl font-semibold tracking-normal text-[#111827]">{available ? value : '-'}</p>
                        <h2 className="mt-1.5 text-sm font-medium text-[#7A8190]">{statistic.label}</h2>
                      </div>
                      <div className={`flex h-[53px] w-[53px] shrink-0 items-center justify-center rounded-[6px] ${statistic.color}`}><DoctorIcon type={statistic.icon} className="h-5 w-5" /></div>
                    </article>
                  )
                })}
              </section>
              <section className="mt-[38px] grid gap-4 lg:gap-[22px] xl:grid-cols-2">
                <RecentSection title="Recent Patients" icon="patients" message="No patient records" onViewAll={() => navigate(patientsPath)} />
                <RecentSection title="Recent Activities" icon="activity" message="No activities" onViewAll={() => setView('activities')} />
              </section>
            </>
          ) : (
            <section className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">{emptyViews[view].title}</h1>
                <button type="button" onClick={() => setView('overview')} className="inline-flex items-center gap-2 text-sm font-semibold text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"><DoctorIcon type="back" />Dashboard</button>
              </div>
              <div className="mt-[22px] flex min-h-[320px] flex-col border-y border-[#E2E5ED] bg-white py-8">
                <EmptyState icon={emptyViews[view].icon} message={emptyViews[view].message} />
              </div>
            </section>
          )}
    </Layout>
  )
}

export default DoctorDashboard
