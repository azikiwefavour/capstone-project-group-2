export function getSettingsPasswordErrors({ currentPassword, newPassword, confirmPassword }) {
  return {
    currentPassword: currentPassword.trim() ? '' : 'Current password is required.',
    newPassword: !newPassword.trim() ? 'New password is required.'
      : newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)
        ? 'Use at least 8 characters, an uppercase letter, a number, and a special character.' : '',
    confirmPassword: !confirmPassword.trim() ? 'Confirm your new password.'
      : confirmPassword !== newPassword ? 'Passwords do not match.' : '',
  }
}
