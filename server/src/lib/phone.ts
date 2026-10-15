/**
 * Normalise an Indian mobile number to its 10-digit form.
 * Accepts "+91 98765 43210", "09876543210", "919876543210", "98765-43210".
 * Returns null when the input is not a valid Indian mobile number.
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** "9876543210" -> "98765 43210" for display. */
export function formatIndianMobile(phone: string): string {
  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}
