function IconButton({ label, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E5ED] bg-white text-[#52556C] transition hover:bg-[#F7F8FB] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"
    >
      {children}
    </button>
  )
}

function AdminHeader({ adminName }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-[#111827]">
        {adminName ? `Welcome, ${adminName}` : 'Welcome'}
      </p>
      <div className="flex items-center gap-3">
        <IconButton label="Open settings">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M19 12C19 11.55 18.96 11.11 18.88 10.69L21 9.05L19 5.59L16.5 6.6C15.82 6.08 15.05 5.68 14.2 5.43L13.85 2.75H9.85L9.5 5.43C8.65 5.68 7.88 6.08 7.2 6.6L4.7 5.59L2.7 9.05L4.82 10.69C4.74 11.11 4.7 11.55 4.7 12C4.7 12.45 4.74 12.89 4.82 13.31L2.7 14.95L4.7 18.41L7.2 17.4C7.88 17.92 8.65 18.32 9.5 18.57L9.85 21.25H13.85L14.2 18.57C15.05 18.32 15.82 17.92 16.5 17.4L19 18.41L21 14.95L18.88 13.31C18.96 12.89 19 12.45 19 12Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
        <IconButton label="View notifications">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
            <path
              d="M18 10.5C18 7.19 15.31 4.5 12 4.5C8.69 4.5 6 7.19 6 10.5V14.2L4.5 17H19.5L18 14.2V10.5Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M10 19C10.45 19.6 11.17 20 12 20C12.83 20 13.55 19.6 14 19"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </IconButton>
      </div>
    </header>
  )
}

export default AdminHeader
