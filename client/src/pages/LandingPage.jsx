import { Link } from 'react-router-dom'
import { useLayoutEffect, useRef, useState } from 'react'
import MedTrailLogo from '../admin/components/MedTrailLogo'
import landingImage from '../assets/landing-image.png'

const startButtonClassName = 'inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#475AA2] px-5 text-sm font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/25'

function RoleIcon({ pharmacist = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      {pharmacist ? (
        <>
          <path d="M7 10H17V20H7V10Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 10V7C9 5.9 9.9 5 11 5H13C14.1 5 15 5.9 15 7V10M12 13V17M10 15H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M8 4V9C8 11.21 9.79 13 12 13C14.21 13 16 11.21 16 9V4M6 4H10M14 4H18M12 13V16C12 18.21 13.79 20 16 20C18.21 20 20 18.21 20 16V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="20" cy="13" r="2" stroke="currentColor" strokeWidth="1.8" />
        </>
      )}
    </svg>
  )
}

function MedicationPreview() {
  const fieldClassName = 'mt-1.5 h-9 w-full min-w-0 rounded-lg border border-[#D8DCE5] bg-white px-2.5 text-xs font-normal text-[#52556C] placeholder:text-[#A6ADBA] lg:h-8 [@media(max-height:820px)]:lg:mt-1 [@media(max-height:820px)]:lg:h-7'

  return (
    <div className="min-w-0 lg:h-[var(--visual-height)] lg:w-full">
    <div className="relative isolate min-w-0 rounded-2xl bg-linear-to-br from-[#CCD2FF] to-[#F8D6DD] p-4 pl-14 sm:h-[540px] sm:p-0 lg:h-full lg:w-full" role="group" aria-label="Medication record preview">
      <div aria-hidden="true" className="absolute left-2 top-16 flex w-10 flex-col items-center gap-5 sm:left-[3%] sm:top-12 sm:w-12 sm:gap-7">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#D0E7DC] text-[10px] font-semibold text-[#2F7D59]">AO</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DEE2FF] text-[#475AA2] sm:h-12 sm:w-12"><RoleIcon /></span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8D6DD] text-[#B83F5C] sm:h-12 sm:w-12"><RoleIcon pharmacist /></span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#EEF0FF] text-[10px] font-semibold text-[#475AA2]">DR</span>
      </div>

      <div className="relative rounded-2xl bg-white p-4 shadow-lg shadow-[#52556C]/10 sm:absolute sm:left-[12%] sm:top-8 sm:w-[56%] sm:p-5 lg:top-4 lg:p-4 [@media(max-height:820px)]:lg:top-2 [@media(max-height:820px)]:lg:p-[var(--preview-padding)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Add medication</h2>
            <p className="mt-1 text-xs text-[#7A8190]">Provide prescription details</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#52556C]">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#EEF0FF] p-3 lg:mt-3 lg:p-2 [@media(max-height:820px)]:lg:mt-[var(--preview-gap)] [@media(max-height:820px)]:lg:p-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DEE2FF] text-xs font-semibold text-[#475AA2]">MJ</span>
          <div>
            <p className="text-xs font-semibold text-[#111827]">Miss. Jennifer</p>
            <p className="mt-1 text-[11px] text-[#7A8190]">34 years old &bull; Female</p>
          </div>
        </div>

        <ol className="mt-4 flex items-center gap-3 text-xs font-medium lg:mt-3 [@media(max-height:820px)]:lg:mt-[var(--preview-gap)]">
          <li className="flex shrink-0 items-center gap-2 text-[#475AA2]" aria-current="step">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#475AA2] text-[10px] text-white">1</span>Details
          </li>
          <li aria-hidden="true" className="h-px flex-1 bg-[#E2E5ED]" />
          <li className="flex shrink-0 items-center gap-2 text-[#7A8190]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#D8DCE5] text-[10px]">2</span>Review
          </li>
        </ol>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-medium text-[#111827] lg:mt-3 lg:gap-2 [@media(max-height:820px)]:lg:mt-[var(--preview-gap)] [@media(max-height:820px)]:lg:gap-[var(--preview-gap)]">
          <label className="col-span-2">Medication
            <input readOnly tabIndex={-1} placeholder="Start typing..." className={fieldClassName} />
          </label>
          <label className="col-span-2 min-[400px]:col-span-1">Dose
            <input readOnly tabIndex={-1} placeholder="e.g 500mg" className={fieldClassName} />
          </label>
          <label className="col-span-2 min-[400px]:col-span-1">Frequency
            <select disabled className={`${fieldClassName} opacity-100`} defaultValue="">
              <option value="">Select role...</option>
            </select>
          </label>
          <label className="col-span-2">Duration
            <select disabled className={`${fieldClassName} opacity-100`} defaultValue="">
              <option value="">Select duration...</option>
            </select>
          </label>
          <label className="col-span-2">Reason
            <textarea readOnly tabIndex={-1} rows={2} className="mt-1.5 block w-full resize-none rounded-lg border border-[#D8DCE5] bg-white p-2.5 text-xs font-normal text-[#52556C] [@media(max-height:820px)]:lg:mt-1 [@media(max-height:820px)]:lg:h-7 [@media(max-height:820px)]:lg:p-1" />
          </label>
        </div>
      </div>

      <div className="relative z-10 mt-4 rounded-2xl bg-white p-4 shadow-xl shadow-[#52556C]/15 sm:absolute sm:right-[3%] sm:top-[164px] sm:mt-0 sm:w-[35%] sm:p-5 [@media(max-height:820px)]:lg:top-[min(164px,calc(100%_-_240px))]">
        <h3 className="text-sm font-semibold text-[#111827]">Review prescriptions</h3>
        <dl className="mt-4 space-y-3 text-xs">
          {[
            ['Medication', 'Amoxicillin'],
            ['Dose', '500mg'],
            ['Frequency', '3 times daily'],
            ['Duration', '7 days'],
            ['Reason', 'Bacterial infection'],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
              <dt className="text-[#7A8190]">{label}</dt>
              <dd className="m-0 break-words font-medium text-[#111827]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
    </div>
  )
}

function LandingPage() {
  const mainRef = useRef(null)
  const visualRef = useRef(null)
  const [visualHeight, setVisualHeight] = useState(474)

  useLayoutEffect(() => {
    function fitDesktopVisuals() {
      if (window.innerWidth < 1024) {
        setVisualHeight(474)
        return
      }

      const main = mainRef.current
      const styles = window.getComputedStyle(main)
      const availableWidth = main.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
      // Fit the doctor image proportionally; the interface fills the remaining width without scaling its text.
      setVisualHeight(Math.min(474, (availableWidth - 24) * 474 / 1248, visualRef.current.clientHeight))
    }

    fitDesktopVisuals()
    const observer = new ResizeObserver(fitDesktopVisuals)
    observer.observe(mainRef.current)
    observer.observe(visualRef.current)
    window.addEventListener('resize', fitDesktopVisuals)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fitDesktopVisuals)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-[#111827] lg:flex lg:h-screen lg:min-h-0 lg:flex-col" style={{ '--visual-height': `${visualHeight}px`, '--doctor-width': `${visualHeight * 462 / 474}px`, '--preview-gap': visualHeight < 400 ? '4px' : '8px', '--preview-padding': visualHeight < 400 ? '8px' : '12px' }}>
      <header className="mx-auto grid w-full grid-cols-[auto_1fr] items-center gap-x-4 gap-y-5 px-5 py-6 sm:px-8 lg:h-[98px] lg:shrink-0 lg:grid-cols-[1fr_auto_1fr] lg:py-[29px] [@media(max-height:820px)]:lg:h-20 [@media(max-height:820px)]:lg:py-[18px]">
        <Link to="/" aria-label="MedTrail home" className="w-[110px] rounded-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-[#475AA2]/25 sm:w-[134px] [&_g]:fill-[#475AA2]">
          <MedTrailLogo />
        </Link>
        <nav aria-label="Main navigation" className="order-3 col-span-2 flex items-center justify-center gap-7 text-sm font-medium text-[#52556C] lg:order-none lg:col-span-1 lg:gap-10">
          <a href="#about" className="rounded-sm transition hover:text-[#475AA2] focus-visible:outline-2 focus-visible:outline-[#475AA2]">About</a>
          <a href="#how-it-works" className="rounded-sm transition hover:text-[#475AA2] focus-visible:outline-2 focus-visible:outline-[#475AA2]">How it works</a>
          <a href="#features" className="rounded-sm transition hover:text-[#475AA2] focus-visible:outline-2 focus-visible:outline-[#475AA2]">Features</a>
        </nav>
        <Link to="/create-account" className={`${startButtonClassName} justify-self-end whitespace-nowrap px-3 text-xs sm:px-5 sm:text-sm`}>Get Started for free</Link>
      </header>

      <main ref={mainRef} className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-10 sm:px-8 sm:pt-14 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:px-8 lg:py-4 [@media(max-height:820px)]:lg:py-2 [@media(min-height:1000px)]:lg:py-8">
        <section className="mx-auto flex max-w-[710px] flex-col items-center gap-8 text-center lg:shrink-0 lg:gap-4 [@media(max-height:820px)]:lg:gap-2 [@media(min-height:1000px)]:lg:gap-8">
          <h3 className="m-0 text-[34px] font-bold leading-[1.16] text-[#475AA2] sm:text-[44px] lg:text-[52px]">
            Medication records, from<br className="hidden sm:block" /> prescription to patient
          </h3>
          <p className="m-0 max-w-[650px] text-base leading-relaxed text-[#52556C] sm:text-lg">
            MedTrailNG gives doctors, pharmacists, admins and patients a shared, structured medication record with role-based access
          </p>
          <Link to="/create-account" className={startButtonClassName}>Get Started for free</Link>
        </section>

        <section ref={visualRef} aria-label="MedTrail medication workflow" className="mx-auto mt-20 grid w-full max-w-[1300px] items-start gap-8 sm:mt-20 lg:mt-6 lg:min-h-0 lg:flex-1 lg:content-center lg:grid-cols-[var(--doctor-width)_minmax(0,1fr)] lg:gap-6 [@media(max-height:820px)]:lg:mt-2 [@media(min-height:1000px)]:lg:mt-[100px]">
          <img src={landingImage} width="462" height="474" alt="Doctor consulting a patient, with notifications about resolved and raised prescription clarifications" className="mx-auto h-auto w-full max-w-[462px] rounded-2xl object-contain lg:max-w-none" />
          <MedicationPreview />
        </section>
      </main>
    </div>
  )
}

export default LandingPage
