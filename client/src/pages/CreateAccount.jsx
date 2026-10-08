import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import medicationImage from '../assets/medication-image.png'

function CreateAccount() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      <section className="relative flex min-h-[520px] w-full flex-col overflow-hidden bg-[#475AA2] px-8 pt-16 text-white sm:px-12 md:min-h-[660px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-10 [@media(min-height:850px)]:lg:pt-16">
       <h4 className="mt 10 max-w-[520px] text-2xl font-semibold leading-[1.13] tracking-normal text-[#111827] sm:text-2xl lg:text-3xl">
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

      <section className="flex w-full items-start justify-center bg-white px-6 py-12 sm:px-10 lg:h-full lg:min-h-0 lg:w-[51.65%] lg:rounded-l-[24px] lg:px-14 lg:py-6 [@media(min-height:850px)]:lg:items-center [@media(min-height:850px)]:lg:py-10">
        <form className="w-full max-w-[440px]" aria-label="Create account form">
          <div className="mb-5 [@media(min-height:850px)]:lg:mb-9">
            <h2 className="text-3xl font-semibold tracking-normal text-[#111827] sm:text-[2.5rem] lg:text-4xl [@media(min-height:850px)]:lg:text-[2.5rem]">
              Let&rsquo;s get started
            </h2>
            <p className="mt-2 text-base text-[#7A8190] [@media(min-height:850px)]:lg:mt-3">
              Fill the following information
            </p>
          </div>

          <div className="space-y-3 [@media(min-height:850px)]:lg:space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="e.g johndoe@email.com"
                className="h-11 w-full rounded-xl border border-[#D8DCE5] bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13"
              />
            </div>

            <div>
              <label
                htmlFor="hospitalName"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2"
              >
                Hospital name
              </label>
              <input
                id="hospitalName"
                name="hospitalName"
                type="text"
                placeholder="Enter name..."
                className="h-11 w-full rounded-xl border border-[#D8DCE5] bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13"
              />
            </div>

            <div>
              <label
                htmlFor="yourName"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2"
              >
                Your name
              </label>
              <input
                id="yourName"
                name="yourName"
                type="text"
                placeholder="Enter name..."
                className="h-11 w-full rounded-xl border border-[#D8DCE5] bg-white px-4 text-base text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2"
              >
                Phone
              </label>
              <div className="flex h-11 w-full overflow-hidden rounded-xl border border-[#D8DCE5] bg-white transition focus-within:border-[#475AA2] focus-within:ring-4 focus-within:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13">
                <div className="flex items-center gap-2 border-r border-[#D8DCE5] px-3 text-sm font-medium text-[#111827] sm:px-4">
                  <span
                    className="flex h-5 w-5 shrink-0 overflow-hidden rounded-full"
                    aria-label="Nigeria"
                  >
                    <span className="h-full flex-1 bg-[#008753]" />
                    <span className="h-full flex-1 bg-white" />
                    <span className="h-full flex-1 bg-[#008753]" />
                  </span>
                  <span>+234</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                    className="text-[#6B7280]"
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="812-3456-789"
                  className="min-w-0 flex-1 bg-white px-4 text-base text-[#111827] outline-none placeholder:text-[#A6ADBA]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-[#111827] [@media(min-height:850px)]:lg:mb-2"
              >
                Password
              </label>
              <div className="flex h-11 w-full items-center rounded-xl border border-[#D8DCE5] bg-white transition focus-within:border-[#475AA2] focus-within:ring-4 focus-within:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="min-w-0 flex-1 bg-transparent px-4 text-base text-[#111827] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((currentValue) => !currentValue)}
                  className="flex h-full items-center px-4 text-sm font-medium text-[#475AA2] outline-none transition hover:text-[#364782] focus-visible:ring-4 focus-visible:ring-[#475AA2]/20"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/verify-email')}
            className="mt-5 h-11 w-full rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 [@media(min-height:850px)]:lg:mt-8 [@media(min-height:850px)]:lg:h-13"
          >
            Continue
          </button>

          <p className="mt-4 text-center text-sm text-[#7A8190] [@media(min-height:850px)]:lg:mt-6">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/select-role')}
              className="font-semibold text-[#475AA2] transition hover:text-[#364782] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/20"
            >
              Log in
            </button>
          </p>
        </form>
      </section>
    </main>
  )
}

export default CreateAccount
