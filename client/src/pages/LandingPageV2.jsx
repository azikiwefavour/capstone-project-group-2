import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import consultationImage from '../assets/landing-consultation.jpg'
import './landing-page-v2.css'

const motionQuery = '(prefers-reduced-motion: reduce)'
function subscribeToMotion(callback) {
  const media = window.matchMedia(motionQuery)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const getReducedMotion = () => window.matchMedia(motionQuery).matches
const getServerMotion = () => false

const activityIcons = {
  doc: (<span className="badge b-doc"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v2a5 5 0 0 0 10 0v-1"/><circle cx="20" cy="11" r="2"/></svg></span>),
  ph: (<span className="badge b-ph"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="4" rx="1" fill="#E8476A"/><rect x="5" y="7" width="14" height="15" rx="2.5" fill="#E8476A"/><path d="M12 11v7M8.5 14.5h7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></span>),
  pt: (<span className="badge b-pt"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></span>),
  ok: (<span className="badge b-ok"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>),
}

const activityEvents = [
    ['doc', 'Dr. Adewale prescribed Amoxicillin 500 mg for Sarah Adeyemi', 'Just now'],
    ['ph', 'Pharm. Bakare asked Dr. Adewale to confirm a possible duplicate', '1 min ago'],
    ['doc', 'Dr. Adewale confirmed the prescription and stopped the old course', '1 min ago'],
    ['ok', 'Amoxicillin verified and dispensed for Sarah Adeyemi', 'Just now'],
    ['pt', 'Halima Musa booked General medicine, Mon 26 Oct at 11:15', 'Just now'],
    ['ph', 'Folic acid 5 mg for Josephine Eze is ready to collect', '2 min ago']
  ]

function LandingLogo() {
  return (
    <svg width="164" height="34" aria-hidden="true" focusable="false" viewBox="0 0 164 34" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 32.3027V9.19261H5.20578V13.1195H5.4766C5.95806 11.7955 6.75548 10.7624 7.86885 10.0201C8.98223 9.26784 10.3113 8.8917 11.8559 8.8917C13.4207 8.8917 14.7397 9.27285 15.8129 10.0352C16.8962 10.7874 17.6585 11.8156 18.0999 13.1195H18.3406C18.8521 11.8356 19.7148 10.8125 20.9284 10.0502C22.1521 9.27787 23.6015 8.8917 25.2766 8.8917C27.4031 8.8917 29.1383 9.56373 30.4824 10.9078C31.8265 12.2519 32.4985 14.2128 32.4985 16.7906V32.3027H27.037V17.6332C27.037 16.1988 26.6558 15.1507 25.8935 14.4887C25.1312 13.8166 24.1983 13.4806 23.095 13.4806C21.781 13.4806 20.7529 13.8919 20.0107 14.7143C19.2784 15.5268 18.9123 16.585 18.9123 17.889V32.3027H13.5711V17.4075C13.5711 16.2139 13.21 15.261 12.4879 14.5488C11.7757 13.8367 10.8429 13.4806 9.68937 13.4806C8.907 13.4806 8.19484 13.6812 7.55289 14.0824C6.91095 14.4736 6.3994 15.0303 6.01824 15.7525C5.63709 16.4647 5.44651 17.2972 5.44651 18.2501V32.3027H0Z" fill="#354379"/>
<path d="M46.5603 32.754C44.2433 32.754 42.2422 32.2726 40.5571 31.3096C38.882 30.3367 37.5931 28.9625 36.6904 27.1872C35.7876 25.4017 35.3363 23.3004 35.3363 20.883C35.3363 18.5058 35.7876 16.4195 36.6904 14.6241C37.6031 12.8186 38.877 11.4143 40.5119 10.4113C42.1469 9.39823 44.0677 8.8917 46.2744 8.8917C47.6987 8.8917 49.0428 9.1224 50.3066 9.58379C51.5805 10.0352 52.7039 10.7373 53.6769 11.6902C54.6598 12.6431 55.4322 13.8567 55.9939 15.3312C56.5556 16.7957 56.8364 18.5409 56.8364 20.5671V22.2371H37.894V18.566H51.6156C51.6056 17.5229 51.3799 16.595 50.9386 15.7826C50.4972 14.9601 49.8803 14.3131 49.0879 13.8417C48.3056 13.3703 47.3928 13.1346 46.3496 13.1346C45.2363 13.1346 44.2583 13.4054 43.4157 13.947C42.5732 14.4786 41.9162 15.1808 41.4448 16.0534C40.9834 16.916 40.7477 17.8639 40.7376 18.897V22.1017C40.7376 23.4458 40.9834 24.5993 41.4749 25.5622C41.9664 26.5151 42.6534 27.2473 43.5361 27.7589C44.4188 28.2604 45.4519 28.5112 46.6355 28.5112C47.4279 28.5112 48.1451 28.4008 48.787 28.1802C49.429 27.9495 49.9857 27.6134 50.4571 27.1721C50.9285 26.7308 51.2846 26.1841 51.5253 25.5321L56.6107 26.1039C56.2898 27.4479 55.6779 28.6215 54.7752 29.6245C53.8825 30.6175 52.739 31.3899 51.3448 31.9416C49.9506 32.4832 48.3557 32.754 46.5603 32.754Z" fill="#354379"/>
<path d="M69.3254 32.7089C67.5099 32.7089 65.885 32.2425 64.4506 31.3096C63.0163 30.3768 61.8828 29.0227 61.0503 27.2473C60.2178 25.472 59.8015 23.3154 59.8015 20.7777C59.8015 18.2099 60.2228 16.0434 61.0654 14.278C61.9179 12.5026 63.0664 11.1636 64.5108 10.2608C65.9552 9.34808 67.5651 8.8917 69.3404 8.8917C70.6945 8.8917 71.8079 9.1224 72.6806 9.58379C73.5532 10.0352 74.2453 10.5818 74.7569 11.2238C75.2684 11.8557 75.6646 12.4525 75.9455 13.0142H76.1712V1.48926H81.6327V32.3027H76.2765V28.6616H75.9455C75.6646 29.2233 75.2584 29.8201 74.7268 30.452C74.1952 31.0739 73.493 31.6055 72.6204 32.0469C71.7477 32.4882 70.6494 32.7089 69.3254 32.7089ZM70.845 28.2403C71.9985 28.2403 72.9815 27.9294 73.7939 27.3075C74.6064 26.6756 75.2233 25.7979 75.6446 24.6745C76.0658 23.5511 76.2765 22.2422 76.2765 20.7476C76.2765 19.2531 76.0658 17.9542 75.6446 16.8508C75.2333 15.7475 74.6215 14.8899 73.809 14.278C73.0066 13.6662 72.0186 13.3602 70.845 13.3602C69.6313 13.3602 68.6183 13.6762 67.8058 14.3081C66.9933 14.94 66.3815 15.8127 65.9702 16.926C65.559 18.0394 65.3534 19.3133 65.3534 20.7476C65.3534 22.192 65.559 23.4809 65.9702 24.6144C66.3915 25.7378 67.0084 26.6255 67.8208 27.2774C68.6433 27.9194 69.6514 28.2403 70.845 28.2403Z" fill="#354379"/>
<path d="M111.201 32.3029V9.19286H116.482V13.0445H116.723C117.144 11.7105 117.867 10.6824 118.89 9.96019C119.923 9.22797 121.101 8.86186 122.425 8.86186C122.726 8.86186 123.062 8.87691 123.433 8.907C123.815 8.92706 124.131 8.96216 124.381 9.01232V14.0225C124.151 13.9423 123.785 13.872 123.283 13.8119C122.792 13.7417 122.315 13.7065 121.854 13.7065C120.861 13.7065 119.968 13.9222 119.176 14.3535C118.393 14.7748 117.776 15.3616 117.325 16.1138C116.874 16.8661 116.648 17.7338 116.648 18.7167V32.3029H111.201Z" fill="#354379"/>
<path d="M132.542 32.7693C131.077 32.7693 129.758 32.5085 128.585 31.987C127.421 31.4553 126.498 30.673 125.816 29.6398C125.144 28.6067 124.808 27.3328 124.808 25.8183C124.808 24.5143 125.049 23.436 125.53 22.5835C126.012 21.7309 126.669 21.0488 127.501 20.5373C128.334 20.0257 129.272 19.6395 130.315 19.3787C131.368 19.1079 132.456 18.9123 133.58 18.792C134.934 18.6515 136.032 18.5262 136.875 18.4158C137.717 18.2955 138.329 18.1149 138.71 17.8742C139.101 17.6234 139.297 17.2372 139.297 16.7157V16.6254C139.297 15.492 138.961 14.6143 138.289 13.9924C137.617 13.3705 136.649 13.0596 135.385 13.0596C134.051 13.0596 132.993 13.3505 132.21 13.9322C131.438 14.514 130.917 15.2011 130.646 15.9935L125.56 15.2713C125.962 13.867 126.624 12.6935 127.546 11.7506C128.469 10.7977 129.598 10.0856 130.932 9.61414C132.266 9.13268 133.74 8.89195 135.355 8.89195C136.468 8.89195 137.577 9.02235 138.68 9.28314C139.783 9.54393 140.792 9.97524 141.704 10.5771C142.617 11.1689 143.349 11.9763 143.901 12.9994C144.463 14.0225 144.743 15.3014 144.743 16.836V32.3029H139.508V29.1283H139.327C138.996 29.7702 138.53 30.3721 137.928 30.9338C137.336 31.4854 136.589 31.9318 135.686 32.2728C134.793 32.6038 133.745 32.7693 132.542 32.7693ZM133.956 28.7672C135.049 28.7672 135.997 28.5515 136.799 28.1202C137.602 27.6789 138.219 27.0971 138.65 26.3749C139.091 25.6528 139.312 24.8654 139.312 24.0128V21.2895C139.142 21.43 138.851 21.5604 138.439 21.6807C138.038 21.8011 137.587 21.9064 137.085 21.9967C136.584 22.0869 136.087 22.1672 135.596 22.2374C135.104 22.3076 134.678 22.3678 134.317 22.418C133.504 22.5283 132.777 22.7088 132.135 22.9596C131.493 23.2104 130.987 23.5614 130.616 24.0128C130.245 24.4541 130.059 25.0259 130.059 25.728C130.059 26.731 130.425 27.4883 131.157 27.9999C131.89 28.5114 132.822 28.7672 133.956 28.7672Z" fill="#354379"/>
<path d="M148.525 32.3029V9.19286H153.972V32.3029H148.525ZM151.264 5.91292C150.401 5.91292 149.659 5.62706 149.037 5.05532C148.415 4.47356 148.104 3.77645 148.104 2.96398C148.104 2.14149 148.415 1.44438 149.037 0.872644C149.659 0.290881 150.401 0 151.264 0C152.136 0 152.879 0.290881 153.49 0.872644C154.112 1.44438 154.423 2.14149 154.423 2.96398C154.423 3.77645 154.112 4.47356 153.49 5.05532C152.879 5.62706 152.136 5.91292 151.264 5.91292Z" fill="#354379"/>
<path d="M163.324 1.48951V32.3029H157.878V1.48951H163.324Z" fill="#354379"/>
<path d="M96.1052 33.3027H87.5886V21.5928H96.1052V33.3027ZM107.814 21.5928H96.1052V12.0127H107.814V21.5928ZM96.1052 12.0127H87.5886V0.302734H96.1052V12.0127Z" fill="#E35977"/>
</svg>
  )
}

function scrollToSection(target, nav, behavior) {
  if (!target) return
  const safeTop = Number.parseFloat(window.getComputedStyle(nav).top) || 0
  const offset = nav.offsetHeight + safeTop + 12
  const top = target.id === 'top' ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset)
  window.scrollTo({ top, behavior })
}

export default function LandingPageV2() {
  const rootRef = useRef(null)
  const navRef = useRef(null)
  const monitorRef = useRef(null)
  const dashboardRef = useRef(null)
  const reduceMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sectionTarget, setSectionTarget] = useState(null)
  const [annual, setAnnual] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [stepRevision, setStepRevision] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [typedText, setTypedText] = useState('')
  const [feedIndex, setFeedIndex] = useState(2)
  const paused = hovered || focused

  function selectStep(index) {
    setActiveStep(index)
    setStepRevision(value => value + 1)
  }

  function handleStepKeyDown(event) {
    const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')]
    const index = tabs.indexOf(document.activeElement)
    if (index < 0) return
    let next
    if (event.key === 'ArrowDown') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    selectStep(next)
    tabs[next].focus()
  }

  function handleAnchorClick(event) {
    const link = event.target.closest('a[href^="#"]')
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = rootRef.current.querySelector(link.getAttribute('href'))
    if (!target) return
    event.preventDefault()
    window.history.replaceState(window.history.state, '', link.getAttribute('href'))
    setMenuOpen(false)
    setSectionTarget({ id: target.id })
  }

  // Measure after the mobile menu collapses and web fonts settle to avoid scroll drift.
  useLayoutEffect(() => {
    if (!sectionTarget) return
    const target = rootRef.current.querySelector(`[id="${CSS.escape(sectionTarget.id)}"]`)
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      scrollToSection(target, navRef.current, reduceMotion ? 'instant' : 'smooth')
      target?.focus({ preventScroll: true })
    })
    return () => { cancelled = true }
  }, [sectionTarget, reduceMotion])

  useLayoutEffect(() => {
    const monitor = monitorRef.current
    const dashboard = dashboardRef.current
    const fit = () => {
      dashboard.style.transform = `scale(${monitor.clientWidth / 960}, ${monitor.clientHeight / 545})`
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(monitor)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const nav = navRef.current
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'MedTrail — Medication records, from prescription to patient'
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const elements = [...root.querySelectorAll('.r')]
    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('on'))
      return
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('on')
        observer.unobserve(entry.target)
      }
    }), { threshold: 0.14, rootMargin: '0px 0px -40px 0px' })
    elements.forEach(element => observer.observe(element))
    const frame = requestAnimationFrame(() => root.querySelectorAll('.hero .r').forEach(element => element.classList.add('on')))
    const hashTarget = window.location.hash ? root.querySelector(`[id="${CSS.escape(window.location.hash.slice(1))}"]`) : null
    let cancelled = false
    document.fonts.ready.then(() => {
      if (!cancelled) scrollToSection(hashTarget, navRef.current, 'instant')
    })
    return () => { cancelled = true; observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    let timer
    let index = 0
    function type() {
      setTypedText('Amoxicillin'.slice(0, index))
      index += 1
      if (index <= 'Amoxicillin'.length) timer = window.setTimeout(type, 110)
      else { index = 0; timer = window.setTimeout(type, 3800) }
    }
    timer = window.setTimeout(type, 900)
    return () => window.clearTimeout(timer)
  }, [reduceMotion])

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setFeedIndex(value => value + 1)
    }, 3200)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  useEffect(() => {
    if (reduceMotion || paused) return
    const timer = window.setInterval(() => {
      if (!document.hidden) setActiveStep(value => (value + 1) % 4)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [reduceMotion, paused, stepRevision])

  return (
    <div className="medtrail-landing" ref={rootRef} onClick={handleAnchorClick}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Text&family=Inter:wght@400;500;600;700;800&display=swap" />


<header className="nav" ref={navRef}>
  <div className="wrap nav-in">
    <a href="#top" className="logo" aria-label="MedTrail home"><LandingLogo /></a>
    <button type="button" className="menu-btn" aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(open => !open)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={menuOpen ? 'M6 6l12 12M6 18 18 6' : 'M3 6h18M3 12h18M3 18h18'} /></svg></button>
    <nav id="landing-navigation" className={`nav-links${menuOpen ? ' is-open' : ''}`} aria-label="Main">
      <a href="#how">How it works</a>
      <a href="#who">Who it's for</a>
      <a href="#features">Features</a>
      <a href="#pricing">Pricing</a>
      <a href="#faq">FAQ</a>
      <Link to="/select-role" className="mobile-sign-in">Sign in</Link>
    </nav>
    <div className="nav-cta">
      <Link to="/select-role" className="btn g">Sign in</Link>
      <Link to="/create-account" className="btn p">Register your facility</Link>
    </div>
  </div>
</header>

<main id="top" tabIndex={-1}>
  {/* HERO */}
  <section className="hero" style={{ paddingBottom: 0 }}>
    <div className="wrap hero-copy">
      <h1 className="r">Medication records, from prescription to patient</h1>
      <p className="lead r" style={{"transitionDelay": ".1s"}}>One shared record for doctors, pharmacists and patients. Every prescription is checked before it's dispensed, and every patient can see what they're taking.</p>
      <div className="hero-cta r" style={{"transitionDelay": ".2s"}}>
        <Link to="/create-account" className="btn p lg">Start your free trial</Link>
        <a href="#how" className="btn o lg"><svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>See how it works</a>
      </div>
      <div className="trust r" style={{"transitionDelay": ".28s"}}>
        <span><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>14-day free trial</span>
        <span><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>No setup fee</span>
        <span><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Works alongside your current system</span>
      </div>

    </div>
    <div className="hero-img r" style={{"transitionDelay": ".3s"}}>
      <img src={consultationImage} alt="A doctor and patient reviewing a medication record on MedTrail together" width="2000" height="1125" />
      <div className="mon" aria-hidden="true" ref={monitorRef}><div className="dash" ref={dashboardRef}>
        <div className="d-side"><span className="dl"><LandingLogo /></span>
          <span className="d-nav on"><i></i>Today</span><span className="d-nav"><i></i>Patients</span><span className="d-nav"><i></i>Clarifications<b>1</b></span><span className="d-nav"><i></i>Appointments</span>
        </div>
        <div className="d-main">
          <div className="d-head"><span className="d-av">SA</span><div><div style={{"fontSize": "20px", "fontWeight": "700", "letterSpacing": "-.02em"}}>Sarah Adeyemi</div><div style={{"fontSize": "13px", "color": "#646A80"}}>MT-00124 · Female, 42 · 2 linked hospitals</div></div><span className="d-btn">+ Add medication</span></div>
          <div className="d-grid">
            <div className="d-card"><h5>Active medications</h5>
              <div className="d-row"><div><b>Amoxicillin 500 mg</b><small>Three times daily · 7 days</small></div><span className="d-pill" style={{"background": "#ECFDF3", "borderColor": "#ABEFC6", "color": "#067647"}}>Dispensed</span></div>
              <div className="d-row"><div><b>Metformin 500 mg</b><small>Twice daily · Lifeline Specialist Clinic</small></div><span className="d-pill" style={{"background": "#ECFDF3", "borderColor": "#ABEFC6", "color": "#067647"}}>Active</span></div>
              <div className="d-row"><div><b>Amlodipine 5 mg</b><small>Once daily · Lifeline Specialist Clinic</small></div><span className="d-pill" style={{"background": "#ECFDF3", "borderColor": "#ABEFC6", "color": "#067647"}}>Active</span></div>
            </div>
            <div style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
              <div className="d-card" style={{"borderColor": "#FDDCAB", "background": "#FFFAF5"}}><h5 style={{"color": "#B54708"}}>Possible duplicate</h5><div style={{"fontSize": "13px", "color": "#41475C"}}>Amoxicillin is already active from 12 Oct.</div></div>
              <div className="d-card"><h5>Recent visits</h5><div className="d-row"><div><b>Acute tonsillitis</b><small>12 Oct · Absolute Health</small></div></div><div className="d-row"><div><b>Type 2 diabetes</b><small>03 Sep · Lifeline</small></div></div></div>
            </div>
          </div>
        </div>
      </div></div>
      <span className="edge"></span>
    </div>
  </section>

  {/* PROBLEM */}
  <section id="about" tabIndex={-1} className="problem" style={{"padding": "104px 0"}}>
    <div className="wrap">
      <div className="why r">
        <span className="kick">Why MedTrail</span>
        <h2 className="t">A prescription passes through many hands. Its record should too.</h2>
        <p className="why-p">In most hospitals, that record still lives on paper slips and in people's memory. One Nigerian study found only <b>1.6%</b> of prescription errors were caught before the medicine reached the patient. We built MedTrail so everyone involved is looking at the same page.</p>
      </div>
      <div className="stage">
        <div className="panel deep r" style={{"transitionDelay": ".38s"}} aria-label="Live activity example">
          <span className="live"><i></i>Live at Absolute Health Hospital</span>
          <h3>Every handoff, visible to the people who need it.</h3>
          <div className="feed" aria-live="off">{[0, 1, 2].map(offset => {
            const sequence = feedIndex - offset
            const [kind, message, time] = activityEvents[(sequence + activityEvents.length) % activityEvents.length]
            return <div className={`note${offset === 0 && feedIndex > 2 ? ' in' : ''}`} key={sequence}>{activityIcons[kind]}<div>{message}<small>{time}</small></div></div>
          })}</div>
        </div>
        <div className="panel soft r" style={{"transitionDelay": ".48s"}} aria-label="Doctor adding a medication">
          <div className="bubble fl1" style={{"left": "7%", "top": "150px"}}><span className="b-doc"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v2a5 5 0 0 0 10 0v-1"/><circle cx="20" cy="11" r="2"/></svg></span></div>
          <div className="bubble fl2" style={{"left": "9%", "top": "300px"}}><span className="b-ph"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="4" rx="1" fill="#E8476A"/><rect x="5" y="7" width="14" height="15" rx="2.5" fill="#E8476A"/><path d="M12 11v7M8.5 14.5h7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></span></div>
          <div className="mock">
            <div className="between"><div><h4>Add medication</h4><div className="s">Provide prescription details</div></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#646A80" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></div>
            <div className="who"><span className="av">SA</span><div><b style={{"fontSize": "15px"}}>Sarah Adeyemi</b><div className="s">42 years old · Female · MT-00124</div></div></div>
            <div className="tabsm"><span className="on"><i>1</i>Details</span><span><i>2</i>Review</span></div>
            <div className="fld"><label>Medication</label><div className="in typing"><span><span>{reduceMotion ? 'Amoxicillin' : typedText}</span><span className="caret"></span></span></div></div>
            <div className="row2">
              <div className="fld"><label>Dose</label><div className="in">500 mg</div></div>
              <div className="fld"><label>Frequency</label><div className="in">3 times daily <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#646A80" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div></div>
            </div>
            <div className="fld"><label>Duration</label><div className="in">7 days <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#646A80" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div></div>
          </div>
          <div className="review fl2">
            <b>Review prescription</b>
            <dl><dt>Medication</dt><dd>Amoxicillin</dd><dt>Dose</dt><dd>500 mg</dd><dt>Frequency</dt><dd>3 times daily</dd><dt>Duration</dt><dd>7 days</dd><dt>Reason</dt><dd>Bacterial infection</dd></dl>
          </div>
          <div className="warn fl1">
            <span className="badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></span>
            <span><b>Possible duplicate</b><br /><span style={{"color": "var(--mute)"}}>Sarah already takes Amoxicillin 500 mg</span></span>
          </div>
        </div>
      </div>
    </div>
  </section>

  {/* HOW IT WORKS */}
  <section id="how" tabIndex={-1}>
    <div className="wrap">
      <div className="sec-h r">
        <span className="kick">How it works</span>
        <h2 className="t">One prescription, four people, zero guesswork.</h2>
        <p>Follow a prescription from the consulting room to the patient's phone.</p>
      </div>
      <div className={`how${paused ? ' paused' : ''}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
        <div className="steps" role="tablist" aria-orientation="vertical" aria-label="How MedTrail works" onKeyDown={handleStepKeyDown}>
          <button type="button" className={`step${activeStep === 0 ? ' on' : ''}`} role="tab" id="landing-step-0" aria-selected={activeStep === 0} aria-controls="landing-pane-0" tabIndex={activeStep === 0 ? 0 : -1} onClick={() => selectStep(0)}><span className="who-l"><span className="num">1</span>Doctor</span><h3>Prescribe in structured fields</h3><p>Drug, dose, frequency, duration and reason, all required. No handwriting to decipher, and the patient's full history is on screen.</p><span className="prog" key={stepRevision}></span></button>
          <button type="button" className={`step${activeStep === 1 ? ' on' : ''}`} role="tab" id="landing-step-1" aria-selected={activeStep === 1} aria-controls="landing-pane-1" tabIndex={activeStep === 1 ? 0 : -1} onClick={() => selectStep(1)}><span className="who-l"><span className="num">2</span>Pharmacist</span><h3>Verify with the full picture</h3><p>The prescription arrives in the pharmacy queue next to everything the patient already takes, from every linked hospital.</p><span className="prog" key={stepRevision}></span></button>
          <button type="button" className={`step${activeStep === 2 ? ' on' : ''}`} role="tab" id="landing-step-2" aria-selected={activeStep === 2} aria-controls="landing-pane-2" tabIndex={activeStep === 2 ? 0 : -1} onClick={() => selectStep(2)}><span className="who-l"><span className="num">3</span>Pharmacist and doctor</span><h3>Ask, don't guess</h3><p>Something unclear? One tap sends a neutral clarification request. The doctor confirms or adjusts, and nothing is dispensed until it's resolved.</p><span className="prog" key={stepRevision}></span></button>
          <button type="button" className={`step${activeStep === 3 ? ' on' : ''}`} role="tab" id="landing-step-3" aria-selected={activeStep === 3} aria-controls="landing-pane-3" tabIndex={activeStep === 3 ? 0 : -1} onClick={() => selectStep(3)}><span className="who-l"><span className="num">4</span>Patient</span><h3>The patient sees it too</h3><p>A WhatsApp message when it's ready to collect, and a plain-language record they can open any time.</p><span className="prog" key={stepRevision}></span></button>
        </div>
        <div className="screen r">
          <div className={`pane${activeStep === 0 ? ' on' : ''}`} id="landing-pane-0" role="tabpanel" aria-labelledby="landing-step-0" tabIndex={0}>
            <div className="card">
              <div className="between"><b>Add medication</b><span className="mini">Sarah Adeyemi</span></div>
              <div style={{"display": "grid", "gridTemplateColumns": "1fr 1fr", "gap": "10px", "marginTop": "14px", "fontSize": "14px"}}>
                <div><div className="mini">Medication</div><b>Lisinopril</b></div><div><div className="mini">Dose</div><b>10 mg</b></div>
                <div><div className="mini">Duration</div><b>Ongoing</b></div><div><div className="mini">Reason</div><b>Hypertension</b></div>
              </div>
              <div style={{"display": "flex", "gap": "8px", "flexWrap": "wrap", "marginTop": "14px"}}><span className="chip on">Once daily</span><span className="chip">Twice daily</span><span className="chip">As needed</span></div>
            </div>
            <div className="card"><div className="mini" style={{"marginBottom": "6px"}}>Already on record</div>
              <div className="li"><b>Metformin 500 mg</b><span className="mini" style={{"marginLeft": "auto"}}>Lifeline Specialist Clinic</span></div>
              <div className="li"><b>Amlodipine 5 mg</b><span className="mini" style={{"marginLeft": "auto"}}>Lifeline Specialist Clinic</span></div>
            </div>
          </div>
          <div className={`pane${activeStep === 1 ? ' on' : ''}`} id="landing-pane-1" role="tabpanel" aria-labelledby="landing-step-1" tabIndex={0}>
            <div className="card">
              <div className="between"><b>Verification queue</b><span className="pill blue"><i></i>3 waiting</span></div>
              <div className="li" style={{"marginTop": "10px"}}><span className="av">SA</span><div><b>Sarah Adeyemi</b><div className="mini">Amoxicillin 500 mg · Dr. Adewale</div></div><span className="pill blue" style={{"marginLeft": "auto"}}><i></i>Awaiting</span></div>
              <div className="li"><span className="av">CO</span><div><b>Chinedu Obi</b><div className="mini">Lisinopril 10 mg · Dr. Adewale</div></div><span className="pill green" style={{"marginLeft": "auto"}}><i></i>Verified</span></div>
            </div>
            <div className="card"><div className="mini" style={{"marginBottom": "6px"}}>Sarah is currently taking</div>
              <div className="li" style={{"background": "#FFF8F0", "borderRadius": "10px", "padding": "10px 12px", "border": "0"}}><b>Amoxicillin 500 mg</b><span style={{"marginLeft": "auto", "color": "#B54708", "fontWeight": "600", "fontSize": "13px"}}>Same drug</span></div>
              <div className="li"><b>Metformin 500 mg</b><span className="mini" style={{"marginLeft": "auto"}}>2× daily</span></div>
            </div>
          </div>
          <div className={`pane${activeStep === 2 ? ' on' : ''}`} id="landing-pane-2" role="tabpanel" aria-labelledby="landing-step-2" tabIndex={0}>
            <div className="card">
              <div className="between"><b>Request clarification</b><span className="mini">To Dr. Adewale</span></div>
              <div style={{"display": "flex", "gap": "8px", "flexWrap": "wrap", "marginTop": "14px"}}><span className="chip">Dose</span><span className="chip">Frequency</span><span className="chip on">Possible duplicate</span><span className="chip">Other</span></div>
              <div style={{"marginTop": "12px", "border": "1px solid #D9DCE6", "borderRadius": "10px", "padding": "10px 12px", "fontSize": "14px", "color": "var(--ink2)"}}>This appears to duplicate an active Amoxicillin prescription. Please confirm it should continue.</div>
            </div>
            <div className="card" style={{"display": "flex", "gap": "12px", "alignItems": "center"}}><span className="badge b-doc"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span><div style={{"fontSize": "14px"}}><b>Dr. Adewale confirmed</b><div className="mini">Replaces the earlier course. Old entry discontinued.</div></div></div>
          </div>
          <div className={`pane${activeStep === 3 ? ' on' : ''}`} id="landing-pane-3" role="tabpanel" aria-labelledby="landing-step-3" tabIndex={0}>
            <div className="wa" style={{"marginBottom": "16px"}}>Hi Sarah, your Amoxicillin is ready to collect at Absolute Health Hospital pharmacy.<small>14:52</small></div>
            <div className="card">
              <div className="between"><div><b style={{"fontSize": "19px"}}>Amoxicillin</b><div className="mini">500 mg</div></div><span className="pill green"><i></i>Active</span></div>
              <p style={{"marginTop": "12px", "fontSize": "15px"}}>Take <b>three times a day</b> for <b>7 days</b></p>
              <p className="mini" style={{"marginTop": "4px"}}>For bacterial infection</p>
              <p className="mini" style={{"marginTop": "12px", "paddingTop": "10px", "borderTop": "1px solid #EEF0F6"}}>Absolute Health Hospital · started 25 Oct 2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  {/* AUDIENCES */}
  <section id="who" tabIndex={-1} style={{"paddingTop": "40px"}}>
    <div className="wrap">
      <div className="sec-h c r">
        <span className="kick">Who it's for</span>
        <h2 className="t">Built for everyone who touches a prescription.</h2>
      </div>
      <div className="aud">
        <article className="a-card r">
          <div className="a-top g1"><div className="card"><div className="between"><b style={{"fontSize": "14px"}}>Plan usage</b><span className="mini">Growth</span></div><div style={{"height": "8px", "borderRadius": "99px", "background": "#ECEEF5", "marginTop": "12px", "overflow": "hidden"}}><div style={{"width": "60%", "height": "100%", "background": "linear-gradient(90deg,#5065D0,#C8649A)"}}></div></div><div className="mini" style={{"marginTop": "8px"}}>6 of 10 clinician seats</div></div></div>
          <div className="a-body"><h3>Hospitals and clinics</h3><p>Run your team, patients and appointments from one place, with an audit trail for every change.</p>
            <ul><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Invite staff and confirm their licences</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Accept appointment bookings online</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Pay in naira by card, transfer or USSD</li></ul>
            <Link to="/create-account" className="btn p">Register your facility</Link></div>
        </article>
        <article className="a-card r" style={{"transitionDelay": ".1s"}}>
          <div className="a-top g2"><div className="card" style={{"display": "flex", "gap": "12px", "alignItems": "center"}}><span className="badge b-ph"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="4" rx="1" fill="#E8476A"/><rect x="5" y="7" width="14" height="15" rx="2.5" fill="#E8476A"/><path d="M12 11v7M8.5 14.5h7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg></span><div style={{"fontSize": "14px"}}><b>Clarification resolved</b><div className="mini">Ready to verify and dispense</div></div></div></div>
          <div className="a-body"><h3>Doctors and pharmacists</h3><p>See the whole medication history, not just what's on today's slip. Questions go to the right person, in writing.</p>
            <ul><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Records shared across linked hospitals</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Duplicate medicine flagged on submit</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Clarification requests without the awkwardness</li></ul>
            <a href="#how" className="btn o">See the clinical flow</a></div>
        </article>
        <article className="a-card r" style={{"transitionDelay": ".2s"}}>
          <div className="a-top g3"><div className="card"><div className="between"><b style={{"fontSize": "14px"}}>Thu 29 Oct, 10:30</b><span className="pill green"><i></i>Confirmed</span></div><div className="mini" style={{"marginTop": "6px"}}>Lifeline Specialist Clinic · Endocrinology</div></div></div>
          <div className="a-body"><h3>Patients</h3><p>Your medicines and visits from every hospital in one place, in plain language. Book your next visit in a minute.</p>
            <ul><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Free for patients, always</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Book in-person appointments</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>You choose which hospitals see your record</li></ul>
            <Link to="/patient/login" className="btn o">Patient access</Link></div>
        </article>
      </div>
    </div>
  </section>

  {/* FEATURES */}
  <section id="features" tabIndex={-1} className="features">
    <div className="wrap">
      <div className="sec-h r">
        <span className="kick">Features</span>
        <h2 className="t">Everything the handoff needs. Nothing it doesn't.</h2>
        <p>MedTrail doesn't replace your hospital system. It covers the part paper keeps getting wrong.</p>
      </div>
      <div className="bento">
        <div className="b c4 dark r">
          <h3>One record across every hospital</h3>
          <p>When a patient links a new hospital, their doctors see what other hospitals prescribed. No more relying on memory or a crumpled slip.</p>
          <div className="vis fac"><span>Absolute Health Hospital</span><span>Lifeline Specialist Clinic</span><span>Mercy Cross Hospital</span><span>Sunrise Family Clinic</span></div>
        </div>
        <div className="b c2 r" style={{"transitionDelay": ".08s"}}>
          <h3>Duplicate check</h3>
          <p>Flags when the same drug is already active, before anything is saved.</p>
          <div className="vis"><span className="pill orange"><i></i>Possible duplicate medication</span></div>
        </div>
        <div className="b c2 r">
          <h3>WhatsApp and SMS updates</h3>
          <p>Booking confirmations, reminders and "ready to collect" messages, automatically.</p>
          <div className="vis"><div className="wa" style={{"boxShadow": "none", "background": "#F1F3FC"}}>Your appointment is confirmed: Mon 26 Oct, 11:15.<small>11:20</small></div></div>
        </div>
        <div className="b c2 r" style={{"transitionDelay": ".08s"}}>
          <h3>Online booking</h3>
          <p>Patients pick a hospital, a department and an open slot. You confirm.</p>
          <div className="vis slots"><span>09:00</span><span className="off">09:30</span><span className="on">10:30</span><span>11:15</span><span>14:00</span></div>
        </div>
        <div className="b c2 r" style={{"transitionDelay": ".16s"}}>
          <h3>Built for patchy networks</h3>
          <p>Light enough for slow connections. Changes queue and sync when the network returns.</p>
          <div className="vis"><div className="sync"><span className="spin"></span>Saved. Syncing when the connection steadies.</div></div>
        </div>
        <div className="b c3 r">
          <h3>A full audit trail</h3>
          <p>Who prescribed, verified, changed or dispensed, and when. Ready for any review.</p>
          <div className="vis log"><div><span>11:46</span>Pharm. Bakare dispensed Amoxicillin</div><div><span>11:24</span>Dr. Adewale resolved a clarification</div><div><span>11:08</span>Pharm. Bakare requested clarification</div></div>
        </div>
        <div className="b c3 r" style={{"transitionDelay": ".08s"}}>
          <h3>Role-based access</h3>
          <p>Doctors prescribe, pharmacists verify, admins manage accounts, patients view. Each person sees only what their role needs.</p>
          <div className="vis" style={{"display": "flex", "gap": "8px", "flexWrap": "wrap"}}><span className="pill blue"><i></i>Doctor</span><span className="pill orange"><i></i>Pharmacist</span><span className="pill green"><i></i>Patient</span><span className="pill" style={{"borderColor": "#DFE2EC", "color": "var(--ink2)"}}><i style={{"border": "1.5px solid var(--mute)"}}></i>Admin</span></div>
        </div>
      </div>
    </div>
  </section>

  {/* PRICING */}
  <section id="pricing" tabIndex={-1}>
    <div className="wrap">
      <div className="sec-h c r">
        <span className="kick">Pricing</span>
        <h2 className="t">Simple plans in naira. Free for patients.</h2>
        <p>Built for clinics and small hospitals. Start with a 14-day trial, and upgrade or cancel any time.</p>
        <div className="toggle" role="group" aria-label="Billing cycle"><button type="button" className={annual ? '' : 'on'} aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button><button type="button" className={annual ? 'on' : ''} aria-pressed={annual} onClick={() => setAnnual(true)}>Annual<em>2 months free</em></button></div>
      </div>
      <div className="plans">
        <div className="plan r">
          <div><h3>Starter</h3><p className="for">Small clinics and private practices</p></div>
          <div><div className="price">₦{annual ? '25,000' : '30,000'}<small> / month</small></div><div className="billed">{annual ? 'Billed ₦300,000 yearly' : ''}</div></div>
          <ul><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Up to 3 clinicians</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Up to 300 patients</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>300 WhatsApp and SMS messages a month</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Prescription verification and duplicate check</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Patient view and audit log</li></ul>
          <Link to="/create-account" className="btn o">Start free trial</Link>
        </div>
        <div className="plan feat r" style={{"transitionDelay": ".1s"}}>
          <span className="tag">Most chosen</span>
          <div><h3>Growth</h3><p className="for">Busy clinics and small hospitals</p></div>
          <div><div className="price">₦{annual ? '58,333' : '70,000'}<small> / month</small></div><div className="billed">{annual ? 'Billed ₦700,000 yearly' : ''}</div></div>
          <ul><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Up to 10 clinicians</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Up to 1,500 patients</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>1,000 WhatsApp and SMS messages a month</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Online appointment booking</li><li><svg className="ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Everything in Starter</li></ul>
          <Link to="/create-account" className="btn w">Start free trial</Link>
        </div>
      </div>
      <p className="price-note r">Prices exclude VAT. Pay by card, bank transfer or USSD through Paystack. Running more than one branch? <a href="mailto:hello@medtrail.ng">Talk to us</a>.</p>
    </div>
  </section>

  {/* TRUST */}
  <section style={{"paddingTop": "40px"}}>
    <div className="wrap">
      <div className="sec-h r">
        <span className="kick">Security and compliance</span>
        <h2 className="t">Health data, handled the way the law expects.</h2>
      </div>
      <div className="trust-grid">
        <div className="tg r"><div className="ti"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg></div><h3>Built for the NDPA 2023</h3><p>Health data is treated as sensitive personal data, with consent recorded for every hospital link.</p></div>
        <div className="tg r" style={{"transitionDelay": ".08s"}}><div className="ti"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 19a4 4 0 0 0-8 0M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/></svg></div><h3>Patients decide</h3><p>A hospital sees a patient's history only after the patient approves the link.</p></div>
        <div className="tg r" style={{"transitionDelay": ".16s"}}><div className="ti"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div><h3>Verified clinicians only</h3><p>Prescribing unlocks after the facility confirms a doctor's MDCN or a pharmacist's PCN licence.</p></div>
        <div className="tg r" style={{"transitionDelay": ".24s"}}><div className="ti"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg></div><h3>Nothing disappears</h3><p>Stopped medicines move to history with a reason. Every change is logged with a name and time.</p></div>
      </div>
    </div>
  </section>

  {/* FAQ */}
  <section id="faq" tabIndex={-1} style={{"paddingTop": "40px"}}>
    <div className="wrap">
      <div className="sec-h c r"><h2 className="t">Questions hospitals ask us</h2></div>
      <div className="faq r">
        <details><summary>Do we have to replace our current hospital system?<svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><p>No. MedTrail runs on its own in any browser and covers prescribing, verification and the patient record. Keep using whatever you already have for billing, labs and admissions.</p></details>
        <details><summary>What if our internet goes down?<svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><p>MedTrail is light enough to work on slow mobile data. If the connection drops, it tells staff clearly and syncs changes once it's back.</p></details>
        <details><summary>Does MedTrail check for drug interactions?<svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><p>Today it flags exact duplicates: the same drug already active for that patient. It supports the clinician's decision and never makes one. Full interaction checking is on our roadmap.</p></details>
        <details><summary>How do patients get access?<svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><p>Patients sign up free with their email and WhatsApp number, or your team adds them and they get a link to set a password. Patient access is view-only.</p></details>
        <details><summary>How long does setup take?<svg className="ic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><p>Register your facility and upload your CAC certificate and operating licence. Once we've verified them, invite your doctors and pharmacists and start prescribing the same day.</p></details>
      </div>
    </div>
  </section>

  {/* FINAL CTA */}
  <div className="final">
    <div className="wrap">
      <div className="final-in r">
        <span className="orb" style={{"width": "260px", "height": "260px", "left": "-80px", "top": "-90px", "background": "radial-gradient(closest-side,rgba(255,255,255,.7),transparent)"}}></span>
        <span className="orb" style={{"width": "320px", "height": "320px", "right": "-100px", "bottom": "-140px", "background": "radial-gradient(closest-side,rgba(232,71,106,.22),transparent)"}}></span>
        <h2>Put every prescription on the record.</h2>
        <p>Start a 14-day free trial for your facility. We'll help you set up your first team.</p>
        <div className="hero-cta" style={{"position": "relative"}}><Link to="/create-account" className="btn p lg">Register your facility</Link><a href="mailto:hello@medtrail.ng" className="btn o lg">Book a demo</a></div>
      </div>
    </div>
  </div>
</main>

<footer>
  <div className="wrap">
    <div className="foot">
      <div><a href="#top" className="logo" aria-label="MedTrail home"><svg width="145" height="30" aria-hidden="true" focusable="false" viewBox="0 0 164 34" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 32.3027V9.19261H5.20578V13.1195H5.4766C5.95806 11.7955 6.75548 10.7624 7.86885 10.0201C8.98223 9.26784 10.3113 8.8917 11.8559 8.8917C13.4207 8.8917 14.7397 9.27285 15.8129 10.0352C16.8962 10.7874 17.6585 11.8156 18.0999 13.1195H18.3406C18.8521 11.8356 19.7148 10.8125 20.9284 10.0502C22.1521 9.27787 23.6015 8.8917 25.2766 8.8917C27.4031 8.8917 29.1383 9.56373 30.4824 10.9078C31.8265 12.2519 32.4985 14.2128 32.4985 16.7906V32.3027H27.037V17.6332C27.037 16.1988 26.6558 15.1507 25.8935 14.4887C25.1312 13.8166 24.1983 13.4806 23.095 13.4806C21.781 13.4806 20.7529 13.8919 20.0107 14.7143C19.2784 15.5268 18.9123 16.585 18.9123 17.889V32.3027H13.5711V17.4075C13.5711 16.2139 13.21 15.261 12.4879 14.5488C11.7757 13.8367 10.8429 13.4806 9.68937 13.4806C8.907 13.4806 8.19484 13.6812 7.55289 14.0824C6.91095 14.4736 6.3994 15.0303 6.01824 15.7525C5.63709 16.4647 5.44651 17.2972 5.44651 18.2501V32.3027H0Z" fill="#354379"/>
<path d="M46.5603 32.754C44.2433 32.754 42.2422 32.2726 40.5571 31.3096C38.882 30.3367 37.5931 28.9625 36.6904 27.1872C35.7876 25.4017 35.3363 23.3004 35.3363 20.883C35.3363 18.5058 35.7876 16.4195 36.6904 14.6241C37.6031 12.8186 38.877 11.4143 40.5119 10.4113C42.1469 9.39823 44.0677 8.8917 46.2744 8.8917C47.6987 8.8917 49.0428 9.1224 50.3066 9.58379C51.5805 10.0352 52.7039 10.7373 53.6769 11.6902C54.6598 12.6431 55.4322 13.8567 55.9939 15.3312C56.5556 16.7957 56.8364 18.5409 56.8364 20.5671V22.2371H37.894V18.566H51.6156C51.6056 17.5229 51.3799 16.595 50.9386 15.7826C50.4972 14.9601 49.8803 14.3131 49.0879 13.8417C48.3056 13.3703 47.3928 13.1346 46.3496 13.1346C45.2363 13.1346 44.2583 13.4054 43.4157 13.947C42.5732 14.4786 41.9162 15.1808 41.4448 16.0534C40.9834 16.916 40.7477 17.8639 40.7376 18.897V22.1017C40.7376 23.4458 40.9834 24.5993 41.4749 25.5622C41.9664 26.5151 42.6534 27.2473 43.5361 27.7589C44.4188 28.2604 45.4519 28.5112 46.6355 28.5112C47.4279 28.5112 48.1451 28.4008 48.787 28.1802C49.429 27.9495 49.9857 27.6134 50.4571 27.1721C50.9285 26.7308 51.2846 26.1841 51.5253 25.5321L56.6107 26.1039C56.2898 27.4479 55.6779 28.6215 54.7752 29.6245C53.8825 30.6175 52.739 31.3899 51.3448 31.9416C49.9506 32.4832 48.3557 32.754 46.5603 32.754Z" fill="#354379"/>
<path d="M69.3254 32.7089C67.5099 32.7089 65.885 32.2425 64.4506 31.3096C63.0163 30.3768 61.8828 29.0227 61.0503 27.2473C60.2178 25.472 59.8015 23.3154 59.8015 20.7777C59.8015 18.2099 60.2228 16.0434 61.0654 14.278C61.9179 12.5026 63.0664 11.1636 64.5108 10.2608C65.9552 9.34808 67.5651 8.8917 69.3404 8.8917C70.6945 8.8917 71.8079 9.1224 72.6806 9.58379C73.5532 10.0352 74.2453 10.5818 74.7569 11.2238C75.2684 11.8557 75.6646 12.4525 75.9455 13.0142H76.1712V1.48926H81.6327V32.3027H76.2765V28.6616H75.9455C75.6646 29.2233 75.2584 29.8201 74.7268 30.452C74.1952 31.0739 73.493 31.6055 72.6204 32.0469C71.7477 32.4882 70.6494 32.7089 69.3254 32.7089ZM70.845 28.2403C71.9985 28.2403 72.9815 27.9294 73.7939 27.3075C74.6064 26.6756 75.2233 25.7979 75.6446 24.6745C76.0658 23.5511 76.2765 22.2422 76.2765 20.7476C76.2765 19.2531 76.0658 17.9542 75.6446 16.8508C75.2333 15.7475 74.6215 14.8899 73.809 14.278C73.0066 13.6662 72.0186 13.3602 70.845 13.3602C69.6313 13.3602 68.6183 13.6762 67.8058 14.3081C66.9933 14.94 66.3815 15.8127 65.9702 16.926C65.559 18.0394 65.3534 19.3133 65.3534 20.7476C65.3534 22.192 65.559 23.4809 65.9702 24.6144C66.3915 25.7378 67.0084 26.6255 67.8208 27.2774C68.6433 27.9194 69.6514 28.2403 70.845 28.2403Z" fill="#354379"/>
<path d="M111.201 32.3029V9.19286H116.482V13.0445H116.723C117.144 11.7105 117.867 10.6824 118.89 9.96019C119.923 9.22797 121.101 8.86186 122.425 8.86186C122.726 8.86186 123.062 8.87691 123.433 8.907C123.815 8.92706 124.131 8.96216 124.381 9.01232V14.0225C124.151 13.9423 123.785 13.872 123.283 13.8119C122.792 13.7417 122.315 13.7065 121.854 13.7065C120.861 13.7065 119.968 13.9222 119.176 14.3535C118.393 14.7748 117.776 15.3616 117.325 16.1138C116.874 16.8661 116.648 17.7338 116.648 18.7167V32.3029H111.201Z" fill="#354379"/>
<path d="M132.542 32.7693C131.077 32.7693 129.758 32.5085 128.585 31.987C127.421 31.4553 126.498 30.673 125.816 29.6398C125.144 28.6067 124.808 27.3328 124.808 25.8183C124.808 24.5143 125.049 23.436 125.53 22.5835C126.012 21.7309 126.669 21.0488 127.501 20.5373C128.334 20.0257 129.272 19.6395 130.315 19.3787C131.368 19.1079 132.456 18.9123 133.58 18.792C134.934 18.6515 136.032 18.5262 136.875 18.4158C137.717 18.2955 138.329 18.1149 138.71 17.8742C139.101 17.6234 139.297 17.2372 139.297 16.7157V16.6254C139.297 15.492 138.961 14.6143 138.289 13.9924C137.617 13.3705 136.649 13.0596 135.385 13.0596C134.051 13.0596 132.993 13.3505 132.21 13.9322C131.438 14.514 130.917 15.2011 130.646 15.9935L125.56 15.2713C125.962 13.867 126.624 12.6935 127.546 11.7506C128.469 10.7977 129.598 10.0856 130.932 9.61414C132.266 9.13268 133.74 8.89195 135.355 8.89195C136.468 8.89195 137.577 9.02235 138.68 9.28314C139.783 9.54393 140.792 9.97524 141.704 10.5771C142.617 11.1689 143.349 11.9763 143.901 12.9994C144.463 14.0225 144.743 15.3014 144.743 16.836V32.3029H139.508V29.1283H139.327C138.996 29.7702 138.53 30.3721 137.928 30.9338C137.336 31.4854 136.589 31.9318 135.686 32.2728C134.793 32.6038 133.745 32.7693 132.542 32.7693ZM133.956 28.7672C135.049 28.7672 135.997 28.5515 136.799 28.1202C137.602 27.6789 138.219 27.0971 138.65 26.3749C139.091 25.6528 139.312 24.8654 139.312 24.0128V21.2895C139.142 21.43 138.851 21.5604 138.439 21.6807C138.038 21.8011 137.587 21.9064 137.085 21.9967C136.584 22.0869 136.087 22.1672 135.596 22.2374C135.104 22.3076 134.678 22.3678 134.317 22.418C133.504 22.5283 132.777 22.7088 132.135 22.9596C131.493 23.2104 130.987 23.5614 130.616 24.0128C130.245 24.4541 130.059 25.0259 130.059 25.728C130.059 26.731 130.425 27.4883 131.157 27.9999C131.89 28.5114 132.822 28.7672 133.956 28.7672Z" fill="#354379"/>
<path d="M148.525 32.3029V9.19286H153.972V32.3029H148.525ZM151.264 5.91292C150.401 5.91292 149.659 5.62706 149.037 5.05532C148.415 4.47356 148.104 3.77645 148.104 2.96398C148.104 2.14149 148.415 1.44438 149.037 0.872644C149.659 0.290881 150.401 0 151.264 0C152.136 0 152.879 0.290881 153.49 0.872644C154.112 1.44438 154.423 2.14149 154.423 2.96398C154.423 3.77645 154.112 4.47356 153.49 5.05532C152.879 5.62706 152.136 5.91292 151.264 5.91292Z" fill="#354379"/>
<path d="M163.324 1.48951V32.3029H157.878V1.48951H163.324Z" fill="#354379"/>
<path d="M96.1052 33.3027H87.5886V21.5928H96.1052V33.3027ZM107.814 21.5928H96.1052V12.0127H107.814V21.5928ZM96.1052 12.0127H87.5886V0.302734H96.1052V12.0127Z" fill="#E35977"/>
</svg></a><p style={{"marginTop": "14px", "color": "var(--ink2)", "maxWidth": "300px", "fontSize": "15px"}}>Medication records, from prescription to patient. Made in Lagos for hospitals across Nigeria.</p></div>
      <div><h4>Product</h4><a href="#how">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
      <div><h4>For you</h4><a href="#who">Hospitals and clinics</a><a href="#who">Doctors and pharmacists</a><a href="#who">Patients</a></div>
      <div><h4>Company</h4><a href="#about">About</a><a href="mailto:hello@medtrail.ng">Contact</a><span className="unavailable-link" aria-disabled="true" title="Not available yet">Privacy notice</span><span className="unavailable-link" aria-disabled="true" title="Not available yet">Terms</span></div>
    </div>
    <div className="legal"><span>© 2026 MedTrail</span><span>hello@medtrail.ng</span></div>
  </div>
</footer>


    </div>
  )
}
