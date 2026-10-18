import EmailLayout from './EmailLayout'

export default function EmailVerificationEmail({ firstName, verificationCode, expirationTimeline }) {
  return (
    <EmailLayout label="Email verification email" heading="Verify your email address">
      <p className="mb-0 mt-[30px]">
        Hello {firstName}, welcome to MedTrailNG. Use this code to verify your email address and continue your onboarding process.
      </p>
      <p aria-label="Verification code" className="my-[30px] text-[36px] font-bold leading-[1.25] text-[#28345B]">
        {verificationCode}
      </p>
      <p className="m-0 text-[#7A8190]">This code will expire in {expirationTimeline}</p>
    </EmailLayout>
  )
}
