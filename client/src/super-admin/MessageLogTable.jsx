import './subscribers.css'
import { useId, useState } from 'react'
import { facilityStatusStyles } from './facilityPresentation.js'
import { maskedMessageRecipient, messageDescriptions, messageLogPage, messageLogTime } from './messageLogModel.js'
import SuperAdminPagination from './SuperAdminPagination.jsx'

const statuses = {
  delivered: { label: 'Delivered', color: facilityStatusStyles.active.color },
  failed: { label: 'Failed', color: facilityStatusStyles.past_due.color },
  queued: { label: 'Queued', color: facilityStatusStyles.trial.color },
  sent: { label: 'Sent', color: facilityStatusStyles.trial.color },
}

export default function MessageLogTable({ records, status = 'ready', controls, onControlsChange, pagination, error, onRetry }) {
  const id = useId()
  const [localFilter, setFilter] = useState('all')
  const [localPage, setLocalPage] = useState(1)
  const filter = controls?.tab ?? localFilter, page = controls?.page ?? localPage
  function setPage(value) { if (controls) onControlsChange({ page: value }); else setLocalPage(value) }
  const available = status === 'ready' && Array.isArray(records)
  const ready = ['ready', 'empty'].includes(status)
  const result = controls && ready && pagination ? { records: available ? records : [], ...pagination } : messageLogPage(available ? records : [], filter, page)
  function changeFilter(value) { if (controls) onControlsChange({ tab: value, page: 1 }); else { setFilter(value); setPage(1) } }
  return <section data-super-admin-message-log aria-labelledby={`${id}-title`} className="mt-4 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={`${id}-title`} className="text-base font-semibold">Message log</h2>
      <div role="group" aria-label="Message status filters" className="flex gap-2">{[['all', 'All'], ['failed', 'Failed'], ['queued', 'Queued']].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => changeFilter(value)} className={`rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-[#475AA2] ${filter === value ? 'border-[#475AA2] bg-[#EEF0FF] text-[#475AA2]' : 'border-[#E2E5ED] bg-white text-[#7A8190] hover:bg-[#F7F8FB]'}`}>{label}</button>)}</div>
    </div>
    <div data-message-log-card className="mt-2 min-w-0 rounded-2xl border border-[#E2E5ED] bg-white">
      <div role="region" aria-label="Message log table" tabIndex={0} className="overflow-x-auto rounded-t-2xl focus-visible:outline-2 focus-visible:outline-[#475AA2]">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs leading-4">
          <caption className="sr-only">{controls ? 'Message log with masked recipients.' : 'SMS and WhatsApp message log with masked recipients.'}</caption>
          <thead className="bg-[#F7F8FB] text-[#52556C]"><tr>{['Time', 'Facility', 'To', 'Message', 'Channel', 'Status'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{label}</th>)}</tr></thead>
          <tbody className="text-[#52556C]">{result.records.length ? result.records.map(record => {
            const badge = statuses[record.status] || { label: 'Unavailable', color: 'bg-[#F6F7FB] text-[#7A8190]' }
            return <tr key={record.id} className="border-t border-[#E2E5ED]">
              <td className="whitespace-nowrap px-3 py-1.5"><time dateTime={record.time}>{messageLogTime(record.time)}</time></td>
              <td className="whitespace-nowrap px-3 py-1.5 font-medium">{record.facilityName || 'Not available'}</td>
              <td className="whitespace-nowrap px-3 py-1.5 tabular-nums">{record.maskedRecipient === undefined ? maskedMessageRecipient(record.recipient) : record.maskedRecipient || 'Recipient unavailable'}</td>
              <td className="whitespace-nowrap px-3 py-1.5">{record.messageLabel === undefined ? messageDescriptions[record.kind] || 'Message description unavailable' : record.messageLabel || 'Message description unavailable'}</td>
              <td className="whitespace-nowrap px-3 py-1.5">{record.channel === 'sms' ? 'SMS' : record.channel === 'whatsapp' ? 'WhatsApp' : record.channel === 'email' ? 'Email' : 'Unavailable'}</td>
              <td className="px-3 py-1.5"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] leading-4 ${badge.color}`}>{badge.label}</span></td>
            </tr>
          }) : <tr className="border-t border-[#E2E5ED]"><td colSpan={6} className="px-4 py-5 text-center text-sm text-[#7A8190]">{status === 'loading' ? <span role="status">Loading messages...</span> : status === 'error' ? <span role="alert">{error || 'Unable to load messages.'}{onRetry && <button type="button" onClick={onRetry} className="ml-2 text-[#475AA2] underline">Try again</button>}</span> : filter === 'all' ? 'No messages available yet.' : 'No matching messages found.'}</td></tr>}</tbody>
        </table>
      </div>
      <SuperAdminPagination page={result.page} totalPages={result.totalPages} empty={result.total === 0} onChange={setPage} label="Message log pagination" disabled={!ready} simple />
    </div>
  </section>
}
