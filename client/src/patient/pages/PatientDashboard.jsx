import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken, setAccessToken } from '../../auth/session'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')

export default function PatientDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const token = getAccessToken()

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true, state: { selectedRole: 'Patient' } })
      return
    }

    const controller = new AbortController()

    async function fetchDashboard() {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`${apiBaseUrl}/api/patient/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setAccessToken(null)
            navigate('/login', { replace: true, state: { selectedRole: 'Patient' } })
            return
          }
          throw new Error('Failed to load patient dashboard')
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Unable to connect to the server')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
    return () => controller.abort()
  }, [token, navigate])

  function handleLogout() {
    setAccessToken(null)
    navigate('/login', { replace: true, state: { selectedRole: 'Patient' } })
  }

  const patient = data?.patient
  const stats = data?.stats
  const activePrescriptions = data?.activePrescriptions || []
  const diagnoses = data?.diagnoses || []

  const filteredDiagnoses = diagnoses.filter(d =>
    [d.diagnosis, d.treatedWith, d.status].some(val =>
      (val || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#111827]">
      {/* Top Navigation Bar */}
      <header className="flex h-16 w-full items-center justify-between bg-[#475AA2] px-6 sm:px-10 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">med<span className="text-sky-300">·</span>rail</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm font-medium text-white/90 transition hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l2.47-2.47a.75.75 0 10-1.06-1.06l-3.75 3.75a.75.75 0 000 1.06l3.75 3.75a.75.75 0 101.06-1.06l-2.47-2.47H18.25c.414 0 .75-.336.75-.75z" clipRule="evenodd" />
          </svg>
          Log out
        </button>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">
            Welcome, {patient?.name || 'Patient'}
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#475AA2]/20 border-t-[#475AA2]" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Pending Prescriptions */}
              <div className="flex items-center justify-between rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-3xl font-semibold text-[#111827]">{stats?.pending ?? 0}</p>
                  <p className="mt-1 text-sm text-[#7A8190]">Pending prescriptions</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d="M4.5 9.75a6 6 0 0111.479-2.436A7.492 7.492 0 0118 7.5a7.5 7.5 0 017.5 7.5c0 1.954-.746 3.733-1.97 5.064A6 6 0 0117.5 21a6 6 0 01-6-6c0-.387.037-.765.108-1.13A6.002 6.002 0 014.5 9.75z" />
                  </svg>
                </div>
              </div>

              {/* 2. Active Prescriptions */}
              <div className="flex items-center justify-between rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-3xl font-semibold text-[#111827]">{stats?.active ?? 0}</p>
                  <p className="mt-1 text-sm text-[#7A8190]">Active prescriptions</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FCE7F3] text-[#DB2777]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-1.5V9a5.25 5.25 0 00-10.5 0v1.5H6a3 3 0 00-3 3V18a3 3 0 003 3h13.5zM9 9a3.75 3.75 0 017.5 0v1.5H9V9zm-1.5 6a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75z" />
                  </svg>
                </div>
              </div>

              {/* 3. All Prescriptions */}
              <div className="flex items-center justify-between rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-3xl font-semibold text-[#111827]">{stats?.all ?? 0}</p>
                  <p className="mt-1 text-sm text-[#7A8190]">All prescriptions</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0E7FF] text-[#4F46E5]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h13.5A2.25 2.25 0 0121 4.25v15.5A2.25 2.25 0 0118.75 22H5.25A2.25 2.25 0 013 19.75V4.25zm8.25 3.75a.75.75 0 00-1.5 0v2.25H7.5a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25h2.25a.75.75 0 000-1.5h-2.25V8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* 4. Discontinued Prescriptions */}
              <div className="flex items-center justify-between rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-3xl font-semibold text-[#111827]">{stats?.discontinued ?? 0}</p>
                  <p className="mt-1 text-sm text-[#7A8190]">Discontinued prescriptions</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#6B7280]">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Prescriptions Section */}
            <section className="mb-10">
              <h2 className="mb-4 text-lg font-bold text-[#111827]">Active prescriptions</h2>
              {activePrescriptions.length === 0 ? (
                <div className="rounded-2xl border border-[#E2E5ED] bg-white p-8 text-center text-sm text-[#7A8190]">
                  No active prescriptions currently recorded.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {activePrescriptions.map((rx) => (
                    <article
                      key={rx.id}
                      className="rounded-2xl border border-[#E2E5ED] bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#D1FAE5] text-[#059669]">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                            <path d="M4.5 10.5C3.67 10.5 3 11.17 3 12s.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5h-15z" />
                            <path fillRule="evenodd" d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 6.75a.75.75 0 01.75.75v3.75h3.75a.75.75 0 010 1.5h-3.75v3.75a.75.75 0 01-1.5 0v-3.75H7.5a.75.75 0 010-1.5h3.75V7.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-[#111827]">
                              {rx.medicationTitle}
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[#7A8190]">
                            {rx.frequency} • {rx.duration} • {rx.reason}
                          </p>
                          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-[#7A8190]">
                            <span className="inline-flex items-center gap-1 font-medium text-[#475AA2]">
                              🩺 {rx.doctorName}
                            </span>
                            <span>{rx.date}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Diagnoses Section */}
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-[#111827]">Diagnoses</h2>
                <div className="relative w-full max-w-xs">
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                    🔍
                  </span>
                  <input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#D8DCE5] bg-white pl-9 pr-10 text-sm outline-none focus:border-[#475AA2] focus:ring-4 focus:ring-[#475AA2]/15"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">
                    ⌘1
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#E2E5ED] bg-white shadow-sm">
                <table className="min-w-full divide-y divide-[#E2E5ED] text-left text-sm">
                  <thead className="bg-[#F9FAFB] text-xs font-semibold text-[#7A8190]">
                    <tr>
                      <th scope="col" className="w-12 px-4 py-3 text-center">
                        <input type="checkbox" className="rounded border-gray-300 text-[#475AA2]" readOnly />
                      </th>
                      <th scope="col" className="px-4 py-3">Diagnosis ↕</th>
                      <th scope="col" className="px-4 py-3">First recorded ↕</th>
                      <th scope="col" className="px-4 py-3">Treated with ↕</th>
                      <th scope="col" className="px-4 py-3">Status ↕</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E5ED]">
                    {filteredDiagnoses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-sm text-[#7A8190]">
                          No diagnoses recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredDiagnoses.map((d, index) => (
                        <tr key={d.id || index} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" className="rounded border-gray-300 text-[#475AA2]" readOnly />
                          </td>
                          <td className="px-4 py-3 font-medium text-[#111827]">{d.diagnosis}</td>
                          <td className="px-4 py-3 text-[#7A8190]">{d.firstRecorded}</td>
                          <td className="px-4 py-3 text-[#111827]">{d.treatedWith}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                d.status === 'Current treatment'
                                  ? 'bg-blue-50 text-[#475AA2]'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
