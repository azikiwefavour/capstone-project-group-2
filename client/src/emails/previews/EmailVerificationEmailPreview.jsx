import EmailVerificationEmail from '../EmailVerificationEmail'

// Static development fixtures only. Real verification codes must be supplied by the backend.
const previewVerification = {
  firstName: 'Sample recipient',
  verificationCode: '739204',
  expirationTimeline: '10 minutes',
}

export default function EmailVerificationEmailPreview() {
  return (
    <main className="min-h-screen bg-white px-0 py-6 sm:px-6 sm:py-10">
      <p className="mx-auto mb-5 w-full max-w-[600px] px-6 text-left text-xs text-[#7A8190] sm:px-0">
        Development preview - sample data only. This code does not verify an account.
      </p>
      <EmailVerificationEmail {...previewVerification} />
    </main>
  )
}
