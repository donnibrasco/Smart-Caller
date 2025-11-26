/**
 * Phone Number Utilities
 * Ensures all phone numbers are converted to E.164 format (+1XXXXXXXXXX)
 */

/**
 * Format phone number to E.164 format
 * Converts various formats to +1XXXXXXXXXX (US/Canada)
 * 
 * Examples:
 * - "825-712-6553" -> "+18257126553"
 * - "(825) 712-6553" -> "+18257126553"
 * - "8257126553" -> "+18257126553"
 * - "+18257126553" -> "+18257126553"
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters except leading +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // If already in E.164 format with +, return as-is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // Remove any leading + that might have been in the middle
  const digitsOnly = cleaned.replace(/\+/g, '');
  
  // If 11 digits starting with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return '+' + digitsOnly;
  }
  
  // If 10 digits, add +1 prefix (US/Canada)
  if (digitsOnly.length === 10) {
    return '+1' + digitsOnly;
  }
  
  // If other length, try to make it work by adding +1
  // This handles cases where user might enter without country code
  if (digitsOnly.length > 0) {
    // If it looks like it might be international (starts with non-1)
    if (digitsOnly.length > 10) {
      return '+' + digitsOnly;
    }
    // Otherwise assume US and add +1
    return '+1' + digitsOnly;
  }
  
  return phoneNumber; // Return original if we can't parse it
}

/**
 * Validate if a phone number is in valid E.164 format
 */
export function isValidE164(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Format phone number for display (human-readable)
 * Converts +18257126553 to (825) 712-6553
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // US/Canada format
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const digits = cleaned.substring(1);
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  return phoneNumber;
}

/**
 * Batch format an array of phone numbers
 */
export function formatPhoneNumbers(phoneNumbers: string[]): string[] {
  return phoneNumbers.map(formatPhoneNumber);
}
