import { NewPasswordForm } from '../../pages/NewPassword'

export default function PharmacistNewPasswordPreview() {
  if (!import.meta.env.DEV) return null

  return <NewPasswordForm recoveryBasePath="/pharmacist" visualOnly />
}
