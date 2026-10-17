function DoctorIcon({ type, className = 'h-5 w-5' }) {
  const paths = {
    dashboard: 'M4 4H10V10H4ZM14 4H20V10H14ZM4 14H10V20H4ZM14 14H20V20H14Z',
    patients: 'M15 20C14.5 16.8 12.5 15 9 15C5.5 15 3.5 16.8 3 20M16 5C20 5 20 11 16 11M18 15C20 15.8 21 17.5 21 20',
    user: 'M6 20C6.6 16.9 8.8 15 12 15C15.2 15 17.4 16.9 18 20',
    bell: 'M18 10.5C18 7.19 15.31 4.5 12 4.5C8.69 4.5 6 7.19 6 10.5V14.2L4.5 17H19.5L18 14.2V10.5ZM10 19C10.45 19.6 11.17 20 12 20C12.83 20 13.55 19.6 14 19',
    clarification: 'M8 18L4 21V5C4 4.4 4.4 4 5 4H19C19.6 4 20 4.4 20 5V17C20 17.6 19.6 18 19 18H8ZM12 8V12M12 15H12.01',
    prescription: 'M9 4H6C5.4 4 5 4.4 5 5V20H19V5C19 4.4 18.6 4 18 4H15M9 3H15V7H9ZM8 11H16M8 15H16',
    medicineBottle: 'M9 3H15V7H9ZM10 7V9L7 11V20C7 20.55 7.45 21 8 21H16C16.55 21 17 20.55 17 20V11L14 9V7M7 13H17M7 18H17M12 14.5V16.5M11 15.5H13',
    activity: 'M4 4H20V20H4ZM7 12H10L12 8L14 16L16 12H18',
    logout: 'M10 5H5V19H10M14 8L18 12L14 16M9 12H18',
    back: 'M15 5L8 12L15 19',
    search: 'M16 16L21 21',
    filter: 'M5 7H19M8 12H16M10.5 17H13.5',
    sort: 'M8 4V20M5 17L8 20L11 17M16 20V4M13 7L16 4L19 7',
    chevron: 'M8 10L12 14L16 10',
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d={paths[type]} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {type === 'patients' && <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />}
      {type === 'user' && <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />}
      {type === 'search' && <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.8" />}
    </svg>
  )
}

export default DoctorIcon
