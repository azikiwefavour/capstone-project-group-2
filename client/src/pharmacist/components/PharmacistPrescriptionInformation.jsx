export default function PharmacistPrescriptionInformation({ prescription, divided = false, compact = false }) {
  return <section aria-label="Prescription information" className={`mt-4 rounded-lg border border-[#E2E5ED] bg-[#F7F8FB] p-4 ${compact ? 'lg:mt-3 lg:py-3' : ''}`}>
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
}
