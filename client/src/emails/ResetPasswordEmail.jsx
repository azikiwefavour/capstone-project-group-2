import EmailLayout from './EmailLayout'

export default function ResetPasswordEmail({ firstName, resetCode, expirationTimeline }) {
  return (
    <EmailLayout label="Reset password email" heading="Reset password">
      <p className="mb-0 mt-[30px]">
        Hello {firstName}, please use this code to start your password reset process.
      </p>
      <p aria-label="Password reset code" className="my-[30px] text-[36px] font-bold leading-[1.25] text-[#28345B]">
        {resetCode}
      </p>
      <p className="m-0 text-[#7A8190]">This code will expire in {expirationTimeline}</p>
    </EmailLayout>
  )
}
