import HospitalInvitationEmail from '../HospitalInvitationEmail'

// Development-only example values; never used by the reusable template or invitation flow.
const previewInvitation = {
  hospitalName: 'Example Hospital',
  invitationUrl: 'https://example.invalid/accept-invite?token=preview-only',
  expirationTimeline: '48 hours',
}

export default function HospitalInvitationEmailPreview() {
  return (
    <main className="min-h-screen bg-white px-0 py-6 sm:px-6 sm:py-10">
      <p className="mx-auto mb-5 w-full max-w-[600px] px-6 text-left text-xs text-[#7A8190] sm:px-0">
        Development preview - sample data only. Invitation link is not functional.
      </p>
      <HospitalInvitationEmail {...previewInvitation} />
    </main>
  )
}
