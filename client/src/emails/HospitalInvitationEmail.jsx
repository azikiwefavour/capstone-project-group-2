import EmailLayout from './EmailLayout'

export default function HospitalInvitationEmail({ hospitalName, invitationUrl, expirationTimeline }) {
  let safeInvitationUrl
  try {
    const url = new URL(invitationUrl)
    if (url.protocol === 'https:' || url.protocol === 'http:') safeInvitationUrl = invitationUrl
  } catch { /* Missing or invalid URLs must not become actionable links. */ }

  return (
    <EmailLayout label="Hospital invitation email" heading={<>Welcome to {hospitalName}</>}>
        <p className="mb-0 mt-[30px]">
          You have been invited to use MedTrailNG with {hospitalName}, use this link to accept your invitation to the platform
        </p>
        <p className="my-[30px] min-w-0">
          <a href={safeInvitationUrl} className="text-[#6979D7] [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6979D7]">
            {invitationUrl}
          </a>
        </p>
        <p className="m-0 text-[#7A8190]">This link will expire in {expirationTimeline}</p>
    </EmailLayout>
  )
}
