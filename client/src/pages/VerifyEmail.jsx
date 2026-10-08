import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import medicationImage from '../assets/medication-image.png'

function VerifyEmail() {
  const [codeValues, setCodeValues] = useState(['', '', '', '', '', ''])
  const navigate = useNavigate()

  function handleCodeChange(index, value) {
    const nextCodeValues = [...codeValues]
    nextCodeValues[index] = value.slice(-1)
    setCodeValues(nextCodeValues)
  }

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-white lg:h-screen lg:min-h-0 lg:flex-row">
      <section className="relative flex min-h-[520px] w-full flex-col overflow-hidden bg-[#475AA2] px-8 pt-16 text-white sm:px-12 md:min-h-[660px] lg:h-full lg:min-h-0 lg:w-[48.35%] lg:px-16 lg:pt-10 [@media(min-height:850px)]:lg:pt-16">
     <h4 className=" mt-10 max-w-[520px] text-2xl font-semibold leading-[1.13] tracking-normal text-[#111827] sm:text-2xl lg:text-3xl">
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
        <form className="w-full max-w-[440px]" aria-label="Verify email form">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-normal text-[#111827] sm:text-[2.5rem] lg:text-4xl [@media(min-height:850px)]:lg:text-[2.5rem]">
              Verify email
            </h2>
            <p className="mt-3 text-base text-[#7A8190]">
              Enter the code sent to
            </p>
            <p className="mt-2 text-base font-medium text-[#111827]">
              johndoe@email.com
            </p>
          </div>

          <div className="mt-8 grid grid-cols-6 gap-2 sm:gap-3 [@media(min-height:850px)]:lg:mt-10">
            {codeValues.map((codeValue, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength="1"
                aria-label={`Verification code digit ${index + 1}`}
                value={codeValue}
                onChange={(event) =>
                  handleCodeChange(index, event.target.value)
                }
                className="aspect-square w-full rounded-xl border border-[#D8DCE5] bg-white text-center text-xl font-semibold text-[#111827] outline-none transition focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
              />
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 [@media(min-height:850px)]:lg:mt-10">
            <button
              type="button"
              onClick={() => navigate('/create-account')}
              className="h-11 rounded-xl border border-[#D8DCE5] bg-[#F7F8FB] text-base font-semibold text-[#475AA2] transition hover:bg-[#EEF1F8] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15 [@media(min-height:850px)]:lg:h-13"
            >
              Go back
            </button>
            <button
              type="button"
              onClick={() => navigate('/select-role')}
              className="h-11 rounded-xl bg-[#475AA2] text-base font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25 [@media(min-height:850px)]:lg:h-13"
            >
              Continue
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default VerifyEmail
