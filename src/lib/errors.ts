// Turns raw backend errors into friendly messages. Raw database errors are
// never shown to users.
export function friendlyAuthError(error: { message?: string } | null | undefined): string {
  const msg = (error?.message ?? '').toLowerCase()

  if (msg.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'An account with this email already exists. Try logging in instead.'
  if (msg.includes('database error saving new user'))
    return 'That username is already taken. Please choose another one.'
  if (msg.includes('password') && msg.includes('characters'))
    return 'Password must be at least 6 characters.'
  if (msg.includes('rate limit') || msg.includes('too many'))
    return 'Too many attempts. Please wait a few minutes and try again.'
  if (msg.includes('email not confirmed'))
    return 'Please confirm your email address first, then log in.'
  if (msg.includes('network') || msg.includes('fetch'))
    return 'Could not connect. Check your internet connection and try again.'
  return 'Something went wrong. Please try again.'
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/
