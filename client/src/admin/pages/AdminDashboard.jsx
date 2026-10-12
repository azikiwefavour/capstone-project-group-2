import { Link, useOutletContext } from 'react-router-dom'
import AdminHeader from '../components/AdminHeader'

function DoctorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
      <path
        d="M8 4V9C8 11.21 9.79 13 12 13C14.21 13 16 11.21 16 9V4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M6 4H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 4H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M12 13V16C12 18.21 13.79 20 16 20C18.21 20 20 18.21 20 16V15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="20" cy="13" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function PharmacyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
      <path d="M7 10H17V20H7V10Z" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M9 10V7C9 5.9 9.9 5 11 5H13C14.1 5 15 5.9 15 7V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 13V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 15H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PersonIcon({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 20C6.6 16.9 8.8 15 12 15C15.2 15 17.4 16.9 18 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-8 w-8">
      <path d="M8 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 17H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 7H5.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M5 12H5.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M5 17H5.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

const summaryCards = [
  {
    label: 'Doctors',
    icon: <DoctorIcon />,
    iconClassName: 'bg-[#DEE2FF] text-[#475AA2]',
  },
  {
    label: 'Pharmacists',
    icon: <PharmacyIcon />,
    iconClassName: 'bg-[#F8D6DD] text-[#B83F5C]',
  },
  {
    label: 'Patients',
    icon: <PersonIcon />,
    iconClassName: 'bg-[#D0E7DC] text-[#2F7D59]',
  },
]

function EmptyPanel({ title, linkTo, linkLabel, icon, message }) {
  return (
    <section className="flex min-h-[240px] flex-col rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[clamp(320px,calc(100vh-331px),455px)] lg:min-h-0">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-[#111827]">{title}</h3>
        <Link
          to={linkTo}
          className="text-sm font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"
        >
          {linkLabel}
        </Link>
      </div>

      <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center text-center lg:min-h-0 lg:justify-start lg:pt-[clamp(56px,12vh,108px)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59] lg:h-20 lg:w-20">
          {icon}
        </div>
        <p className="mt-3 text-sm font-medium text-[#7A8190] lg:mt-4">
          {message}
        </p>
      </div>
    </section>
  )
}

function AdminDashboard() {
  const { adminName } = useOutletContext()

  return (
    <div className="mx-auto max-w-7xl">
      <AdminHeader adminName={adminName} />

      <section className="mt-4">
        <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">
          Admin dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#7A8190]">
          Manage accounts and review activity. Clinical medication data is available here.
        </p>
      </section>

      <section className="mt-[22px] grid gap-4 lg:grid-cols-3 lg:gap-[22px]">
        {summaryCards.map((card) => (
          <article
            key={card.label}
            className="flex min-h-[112px] items-center justify-between rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm shadow-[#111827]/[0.03] lg:h-[110px] lg:min-h-0"
          >
            <div>
              <p className="text-3xl font-semibold tracking-normal text-[#111827]">
                0
              </p>
              <p className="mt-1.5 text-sm font-medium text-[#7A8190]">
                {card.label}
              </p>
            </div>
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.iconClassName}`}
            >
              {card.icon}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-[38px] grid gap-4 xl:grid-cols-2 lg:gap-[22px]">
        <EmptyPanel
          title="Active users"
          linkTo="/admin/users"
          linkLabel="view all"
          icon={<PersonIcon />}
          message="No user records"
        />
        <EmptyPanel
          title="Audit log"
          linkTo="/admin/audit-log"
          linkLabel="view all"
          icon={<ListIcon />}
          message="No activities"
        />
      </section>

      <div className="h-4 lg:hidden" />
    </div>
  )
}

export default AdminDashboard
