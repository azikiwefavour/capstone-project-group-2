// Test-only callback host; never imported by application routes or API services.
import { useState } from 'react'
import EditUserModal from '../../src/admin/components/EditUserModal'

const fixtures = [
  { id: 'edit-doctor-fixture', name: 'Edit doctor fixture', email: 'edit-doctor@example.test', phone: '+2348000000000', role: 'Doctor' },
  { id: 'edit-pharmacist-fixture', name: 'Edit pharmacist fixture', email: 'edit-pharmacist@example.test', phone: '+44 7700 900000', role: 'Pharmacist' },
]

export default function EditUserHarness({ fail = false }) {
  const [users, setUsers] = useState(fixtures)
  const [selected, setSelected] = useState(null)
  const [calls, setCalls] = useState([])
  const [message, setMessage] = useState('')
  async function save(id, changes) {
    setCalls(current => [...current, { id, changes }])
    await new Promise(resolve => setTimeout(resolve, 350))
    if (fail) throw new Error('Test-only save failure. Please try again.')
    setUsers(current => current.map(user => user.id === id ? { ...user, ...changes } : user))
  }
  return <div className="p-5">
    <h1>Edit modal test fixtures — no backend connection</h1>
    {users.map(user => <section key={user.id} aria-label={user.id}>
      <p>{user.name} | {user.email} | {user.phone} | {user.role}</p>
      <button onClick={() => setSelected({ ...user })}>Edit {user.id}</button>
    </section>)}
    <output aria-label="Save calls">{JSON.stringify(calls)}</output>
    {message && <p role="status">{message}</p>}
    {selected && <EditUserModal key={selected.id} user={selected} onClose={() => setSelected(null)} onSave={save} onSaved={setMessage} />}
  </div>
}
