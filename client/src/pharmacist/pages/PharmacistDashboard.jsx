import { useOutletContext } from 'react-router-dom'

export default function PharmacistDashboard() {
  const { pharmacistName } = useOutletContext()

  return <section className="rounded-2xl border border-[#E2E5ED] bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-semibold text-[#111827]">Pharmacist dashboard</h1>
    <p className="mt-3 text-base text-[#7A8190]">{pharmacistName ? `Welcome, ${pharmacistName}.` : 'Welcome to MedTrail.'}</p>
    <p className="mt-2 text-sm text-[#7A8190]">Your pharmacist workspace is coming soon.</p>
  </section>
}
