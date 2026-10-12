import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AddUserModal from '../components/AddUserModal'
import AdminHeader from '../components/AdminHeader'

const roleStyles = {
  Doctor: {
    className: 'bg-[#DEE2FF] text-[#475AA2]',
    icon: <DoctorBadgeIcon />,
  },
  Pharmacist: {
    className: 'bg-[#F8D6DD] text-[#B83F5C]',
    icon: <PharmacistBadgeIcon />,
  },
  Patient: {
    className: 'bg-[#D0E7DC] text-[#2F7D59]',
    icon: <UserIcon className="h-3.5 w-3.5" />,
  },
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16 16L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 12H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10.5 17H13.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UserIcon({ className = 'h-8 w-8' }) {
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

function DoctorBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
      <path
        d="M8 4V9C8 11.21 9.79 13 12 13C14.21 13 16 11.21 16 9V4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 13V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function PharmacistBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
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

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M5 7H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10 11V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 11V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 7L8.6 19C8.65 19.85 9.35 20.5 10.2 20.5H13.8C14.65 20.5 15.35 19.85 15.4 19L16 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 7V4.8H14V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 19L9.2 18.2L18.4 9C19.2 8.2 19.2 6.95 18.4 6.15L17.85 5.6C17.05 4.8 15.8 4.8 15 5.6L5.8 14.8L5 19Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M13.8 6.8L17.2 10.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M4 10.2L8.1 14.3L16 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M5 5L15 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M12.5 5L7.5 10L12.5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M7.5 5L12.5 10L7.5 15"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function formatPhoneNumber(phone) {
  const digits = phone.replace(/\D/g, '')
  const localNumber = digits.startsWith('0') ? digits.slice(1) : digits

  return `+234 ${localNumber}`
}

function RoleBadge({ role }) {
  const roleStyle = roleStyles[role] || roleStyles.Patient

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${roleStyle.className}`}
    >
      {roleStyle.icon}
      {role}
    </span>
  )
}

function AdminUsers() {
  const { adminName } = useOutletContext()
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [demoUsers, setDemoUsers] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [currentPage, setCurrentPage] = useState(1)
  const adminContentScrollTopRef = useRef(0)

  useEffect(() => {
    if (!showSuccessToast) {
      return undefined
    }

    const toastTimer = window.setTimeout(() => {
      setShowSuccessToast(false)
    }, 3000)

    return () => window.clearTimeout(toastTimer)
  }, [showSuccessToast])

  const visibleUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return [...demoUsers]
      .filter((user) => roleFilter === 'All' || user.role === roleFilter)
      .filter((user) => {
        if (!normalizedQuery) {
          return true
        }

        return [user.name, user.email, user.role, user.phone].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        )
      })
      .sort((firstUser, secondUser) => {
        if (sortBy === 'Name') {
          return firstUser.name.localeCompare(secondUser.name)
        }

        if (sortBy === 'Role') {
          return firstUser.role.localeCompare(secondUser.role)
        }

        return 0
      })
  }, [demoUsers, roleFilter, searchQuery, sortBy])

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / rowsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safeCurrentPage - 1) * rowsPerPage
  const paginatedUsers = visibleUsers.slice(pageStartIndex, pageStartIndex + rowsPerPage)

  function rememberScrollPosition() {
    const adminContent = document.querySelector('[data-admin-content]')
    adminContentScrollTopRef.current = adminContent
      ? adminContent.scrollTop
      : window.scrollY
  }

  function restoreScrollPosition() {
    window.requestAnimationFrame(() => {
      const adminContent = document.querySelector('[data-admin-content]')

      if (adminContent) {
        adminContent.scrollTop = adminContentScrollTopRef.current
        return
      }

      window.scrollTo({ top: adminContentScrollTopRef.current })
    })
  }

  function handleDemoUserSaved(savedUser) {
    rememberScrollPosition()

    setDemoUsers((currentUsers) => {
      const existingUser = currentUsers.find((user) => user.id === savedUser.id)

      if (existingUser) {
        return currentUsers.map((user) =>
          user.id === savedUser.id ? savedUser : user,
        )
      }

      return [savedUser, ...currentUsers]
    })

    setEditingUser(null)
    setShowSuccessToast(true)
    restoreScrollPosition()
  }

  function handleDeleteUser(userId) {
    const shouldDelete = window.confirm(
      'Remove this user from the frontend demo table?',
    )

    if (shouldDelete) {
      rememberScrollPosition()
      setDemoUsers((currentUsers) =>
        currentUsers.filter((user) => user.id !== userId),
      )
      restoreScrollPosition()
    }
  }

  function handleEditUser(user) {
    setEditingUser(user)
    setIsAddUserModalOpen(true)
  }

  function handleCloseModal() {
    setIsAddUserModalOpen(false)
    setEditingUser(null)
  }

  return (
    <section className="mx-auto max-w-7xl lg:flex lg:min-h-full lg:flex-col">
      {showSuccessToast && (
        <div className="fixed right-5 top-5 z-50 flex items-center gap-3 rounded-xl border border-[#D0E7DC] bg-white px-4 py-3 text-sm font-medium text-[#111827] shadow-lg shadow-[#111827]/10">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]">
            <CheckIcon />
          </span>
          New user successfully added!
          <button
            type="button"
            aria-label="Close success notification"
            onClick={() => setShowSuccessToast(false)}
            className="ml-1 text-[#7A8190] transition hover:text-[#111827]"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <AdminHeader adminName={adminName} />

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-[#111827]">
            Users
          </h1>
          <p className="mt-2 text-base leading-relaxed text-[#7A8190]">
            Create accounts and assign roles
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddUserModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#475AA2] px-4 text-sm font-semibold text-white transition hover:bg-[#3D4F91] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/25"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          Add new user
        </button>
      </div>

      <div className="mt-[22px] flex flex-col gap-3 rounded-2xl border border-[#E2E5ED] bg-white p-3 shadow-sm shadow-[#111827]/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-[320px]">
          <span className="sr-only">Search users</span>
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A8190]">
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setCurrentPage(1)
            }}
            className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white pl-10 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-[#A6ADBA] focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8DCE5] bg-white px-3 text-sm font-medium text-[#52556C] transition focus-within:ring-4 focus-within:ring-[#475AA2]/15">
            <FilterIcon />
            <span>Filter</span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value)
                setCurrentPage(1)
              }}
              className="appearance-none bg-transparent pr-6 text-sm outline-none"
              aria-label="Filter users by role"
            >
              <option value="All">All</option>
              <option value="Doctor">Doctor</option>
              <option value="Pharmacist">Pharmacist</option>
              <option value="Patient">Patient</option>
            </select>
            <span className="pointer-events-none absolute right-2 text-[#7A8190]">
              <ChevronDownIcon />
            </span>
          </label>

          <label className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-[#D8DCE5] bg-white px-3 text-sm font-medium text-[#52556C] transition focus-within:ring-4 focus-within:ring-[#475AA2]/15">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value)
                setCurrentPage(1)
              }}
              className="appearance-none bg-transparent pr-6 text-sm outline-none"
              aria-label="Sort users"
            >
              <option value="Newest">Newest</option>
              <option value="Name">Name</option>
              <option value="Role">Role</option>
            </select>
            <span className="pointer-events-none absolute right-2 text-[#7A8190]">
              <ChevronDownIcon />
            </span>
          </label>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm shadow-[#111827]/[0.03] lg:flex lg:h-[clamp(360px,calc(100vh-286px),520px)] lg:flex-col">
        <div className="overflow-x-auto lg:flex-1 lg:overflow-y-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-[#E2E5ED] bg-[#F7F8FB] text-left text-xs font-medium text-[#52556C]">
                <th className="w-12 px-4 py-3">
                  <span className="sr-only">Select users</span>
                  <input
                    type="checkbox"
                    aria-label="Select all users"
                    className="h-4 w-4 rounded border-[#D8DCE5] accent-[#475AA2]"
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#E2E5ED] text-sm font-medium text-[#111827] last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${user.name}`}
                        className="h-4 w-4 rounded border-[#D8DCE5] accent-[#475AA2]"
                      />
                    </td>
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3 text-[#7A8190]">{user.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-[#7A8190]">
                      {formatPhoneNumber(user.phone)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 text-[#52556C]">
                        <button
                          type="button"
                          aria-label={`Delete ${user.name}`}
                          onClick={() => handleDeleteUser(user.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F7F8FB] hover:text-[#E5484D] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"
                        >
                          <TrashIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Edit ${user.name}`}
                          onClick={() => handleEditUser(user)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-[#F7F8FB] hover:text-[#475AA2] focus:outline-none focus:ring-4 focus:ring-[#475AA2]/15"
                        >
                          <EditIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-5 py-0">
                    <div className="flex min-h-[220px] flex-col items-center justify-center text-center lg:min-h-[calc(100vh-430px)]">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#D0E7DC] text-[#2F7D59]">
                        <UserIcon />
                      </div>
                      <p className="mt-4 text-sm font-medium text-[#7A8190]">
                        No user records
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-[#E2E5ED] px-4 py-3 text-sm text-[#52556C] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <span>Rows per page</span>
            <select
              value={rowsPerPage}
              onChange={(event) => {
                setRowsPerPage(Number(event.target.value))
                setCurrentPage(1)
              }}
              className="h-9 rounded-lg border border-[#D8DCE5] bg-white px-2 text-sm outline-none focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DCE5] bg-white transition hover:bg-[#F7F8FB] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Previous page"
            >
              <ArrowLeftIcon />
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${
                    safeCurrentPage === pageNumber
                      ? 'bg-[#475AA2] text-white'
                      : 'border border-[#D8DCE5] bg-white text-[#52556C] hover:bg-[#F7F8FB]'
                  }`}
                >
                  {pageNumber}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8DCE5] bg-white transition hover:bg-[#F7F8FB] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Next page"
            >
              <ArrowRightIcon />
            </button>

            <span className="ml-1 whitespace-nowrap">
              Page {safeCurrentPage} of {totalPages}
            </span>
          </div>
        </div>
      </div>

      <AddUserModal
        key={editingUser?.id || 'new-user'}
        isOpen={isAddUserModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleDemoUserSaved}
        initialUser={editingUser}
      />
    </section>
  )
}

export default AdminUsers
