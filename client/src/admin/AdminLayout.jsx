import { Outlet, useNavigate } from 'react-router-dom'
import AdminSidebar from './components/AdminSidebar'

function getDemoAdminName() {
  return sessionStorage.getItem('medtrailDemoAdminName') || ''
}

function AdminLayout() {
  const navigate = useNavigate()
  const adminName = getDemoAdminName()

  function handleLogout() {
    sessionStorage.removeItem('medtrailDemoAdminName')
    navigate('/create-account')
  }

  return (
    <main className="min-h-screen bg-[#F6F7FB] text-[#111827] lg:flex lg:h-screen">
      <AdminSidebar adminName={adminName} onLogout={handleLogout} />
      <section
        data-admin-content
        className="min-h-screen flex-1 px-5 py-6 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-5 xl:px-10"
      >
        <Outlet context={{ adminName }} />
      </section>
    </main>
  )
}

export default AdminLayout
