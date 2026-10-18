// Change this one line to switch the currency symbol shown across the app.
export const CURRENCY = '₦'

export function formatPrice(amount: number | string | null | undefined): string {
  const value = Number(amount)
  if (!Number.isFinite(value)) return ''
  return `${CURRENCY}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
