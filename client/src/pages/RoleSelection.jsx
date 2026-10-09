import { useNavigate } from 'react-router-dom'
import medicationImage from '../assets/medication-image.png'

const roles = [
  {
    name: 'Doctor',
    iconBackground: 'bg-[#EEF0FF]',
    iconColor: 'text-[#6575C9]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7"
      >
        <path
          d="M8 4V9C8 11.21 9.79 13 12 13C14.21 13 16 11.21 16 9V4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 4H10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14 4H18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 13V16C12 18.21 13.79 20 16 20C18.21 20 20 18.21 20 16V15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="20"
          cy="13"
          r="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    name: 'Pharmacist',
    iconBackground: 'bg-[#FFEFF6]',
    iconColor: 'text-[#D85B93]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7"
      >
        <path
          d="M7 10H17V20H7V10Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 10V7C9 5.9 9.9 5 11 5H13C14.1 5 15 5.9 15 7V10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 13V17"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10 15H14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    name: 'Patient',
    iconBackground: 'bg-[#EEF9F2]',
    iconColor: 'text-[#35A66A]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7"
      >
        <circle
          cx="12"
          cy="8"
          r="3"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M6 20C6.6 16.9 8.8 15 12 15C15.2 15 17.4 16.9 18 20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: 'Admin',
    iconBackground: 'bg-[#F1F2F8]',
    iconColor: 'text-[#686D86]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7"
      >
        <circle
          cx="12"
          cy="8"
          r="3"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M5.5 20C6.1 16.9 8.5 15 12 15C15.5 15 17.9 16.9 18.5 20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 6.5L18.4 7.3L19.8 6.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M18.4 7.3V9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

function RoleSelection() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      <section className="relative flex min-h-[520px] w-full flex-col overflow-hidden bg-[#475AA2] px-8 pt-16 text-white sm:px-12 md:min-h-[660px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-10 [@media(min-height:850px)]:lg:pt-16">
        <h4 className="mt-10 max-w-[520px] text-2xl font-semibold leading-[1.13] tracking-normal text-[#111827] sm:text-2xl lg:text-3xl">
          One medication record,
          <br />
          from prescription to
          <br />
          patient
        </h4>

        <div className="mt-auto flex min-h-0 flex-1 items-end justify-center pt-4 [@media(min-height:850px)]:lg:pt-8">
          <img
            src={medicationImage}
            alt="Medication records and pills"
            className="max-h-full w-full max-w-[600px] object-contain lg:max-w-[650px]"
          />
        </div>
      </section>

      <section className="flex w-full items-center justify-center bg-white px-6 py-12 sm:px-10 lg:h-full lg:min-h-0 lg:w-[51.65%] lg:rounded-l-[24px] lg:px-14 lg:py-6 [@media(min-height:850px)]:lg:py-10">
        <div className="w-full max-w-[440px]">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-normal text-[#111827] sm:text-[2.5rem] lg:text-4xl [@media(min-height:850px)]:lg:text-[2.5rem]">
              Welcome to Medtrail
            </h2>
            <p className="mt-3 text-base text-[#7A8190]">
              Select the role you were assigned
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 [@media(min-height:850px)]:lg:mt-10">
            {roles.map((role) => (
              <button
                key={role.name}
                type="button"
                onClick={() => navigate('/login')}
                className="flex h-[148px] flex-col items-start justify-between rounded-xl border border-[#E2E5ED] bg-white p-5 text-left transition hover:border-[#475AA2] hover:bg-[#FAFBFF] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-[160px]"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${role.iconBackground} ${role.iconColor}`}
                >
                  {role.icon}
                </span>
                <span className="text-base font-semibold text-[#111827]">
                  {role.name}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-[#7A8190] [@media(min-height:850px)]:lg:mt-8">
            Don&rsquo;t have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/create-account')}
              className="font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20"
            >
              Create one
            </button>
          </p>
        </div>
      </section>
    </main>
  )
}

export default RoleSelection
