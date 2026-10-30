export default function PharmacistPrescriptionInformation({ prescription, medications = null, divided = false, compact = false }) {
  if (medications && medications.length > 1) {
    return (
      <section aria-label="Prescription information" className={`mt-4 rounded-xl border border-[#E2E5ED] bg-[#F7F8FB] p-4 ${compact ? 'lg:mt-3 lg:py-3' : ''}`}>
        <div className="grid grid-cols-[108px_minmax(0,1fr)] gap-3 pb-3 border-b border-[#E2E5ED] text-[13px] leading-5 sm:grid-cols-[140px_minmax(0,1fr)]">
          <span className="text-[#7A8190]">Prescribed by</span>
          <span className="font-medium text-[#111827]">{prescription.doctorName || '—'}</span>
          <span className="text-[#7A8190]">Submitted on</span>
          <span className="font-medium text-[#111827]">
            {prescription.timestamp ? <time dateTime={prescription.timestamp.dateTime}>{prescription.timestamp.label}</time> : '—'}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#52556C] mb-2.5">
            Prescribed Medications ({medications.length})
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {medications.map((med, idx) => (
              <div key={med.id || idx} className="rounded-lg border border-[#E2E5ED] bg-white p-3.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm text-[#111827]">{med.medicationName || 'Medication'}</p>
                  <span className="inline-flex rounded-md border border-[#F8D6DD] bg-[#FFF1F3] px-2 py-0.5 text-[11px] font-medium text-[#B83F5C]">
                    {med.status === 'clarified' ? 'Clarified' : med.status === 'dispensed' ? 'Dispensed' : 'Unverified'}
                  </span>
                </div>
                <dl className="mt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-[#7A8190]">Dose:</dt>
                    <dd className="font-medium text-[#111827]">{med.dosage || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#7A8190]">Frequency:</dt>
                    <dd className="font-medium text-[#111827]">{med.frequency || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#7A8190]">Duration:</dt>
                    <dd className="font-medium text-[#111827]">{med.duration || '—'}</dd>
                  </div>
                  {med.reason && (
                    <div className="pt-1.5 border-t border-[#F0F2F7]">
                      <dt className="text-[#7A8190]">Reason:</dt>
                      <dd className="text-[#52556C] font-normal">{med.reason}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Prescription information" className={`mt-4 rounded-lg border border-[#E2E5ED] bg-[#F7F8FB] p-4 ${compact ? 'lg:mt-3 lg:py-3' : ''}`}>
      <dl>
        {[
          ['Prescribed by', prescription.doctorName],
          ['Submitted on', prescription.timestamp ? <time dateTime={prescription.timestamp.dateTime}>{prescription.timestamp.label}</time> : '—'],
          ['Medication', prescription.medicationName], ['Dose', prescription.dosage],
          ['Frequency', prescription.frequency], ['Duration', prescription.duration], ['Reason', prescription.reason],
        ].map(([label, value]) => <div key={label} className={`grid grid-cols-[108px_minmax(0,1fr)] gap-3 py-1 text-[13px] leading-5 sm:grid-cols-[140px_minmax(0,1fr)] ${divided && label === 'Medication' ? 'mt-3 border-t border-[#E2E5ED] pt-3' : ''} ${compact ? 'lg:py-0.5' : ''}`}>
          <dt className="text-[#7A8190]">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words font-medium text-[#111827]">{value || '—'}</dd>
        </div>)}
      </dl>
    </section>
  )
}
