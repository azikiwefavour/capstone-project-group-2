import ResetPasswordEmail from '../ResetPasswordEmail'

// Static development fixtures only. Real reset codes must be supplied by the backend.
const previewReset = {
  firstName: 'Sample recipient',
  resetCode: '684205',
  expirationTimeline: '10 minutes',
}

export default function ResetPasswordEmailPreview() {
  return (
    <main className="min-h-screen bg-white px-0 py-6 sm:px-6 sm:py-10">
      <p className="mx-auto mb-5 w-full max-w-[600px] px-6 text-left text-xs text-[#7A8190] sm:px-0">
        Development preview - sample data only. This code does not reset a password.
      </p>
      <ResetPasswordEmail {...previewReset} />
    </main>
  )
}
