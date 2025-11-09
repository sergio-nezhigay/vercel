/**
 * Account pattern matching utilities
 * Used to identify payments that require receipt issuance
 */

/**
 * Patterns that indicate non-target payments (receipts not needed)
 * These patterns appear at positions 14-17 in Ukrainian IBAN format
 */
const NON_TARGET_PATTERNS = ['2600', '2902', '2909', '2920'];

/**
 * Check if a payment is a target for receipt issuance
 * Target payments are those that DON'T have specific patterns at positions 14-17 in sender's account
 *
 * @param senderAccount - The sender's account number (IBAN format)
 * @returns true if payment needs receipt, false otherwise
 *
 * @example
 * isTargetAccount('UA783220010000026007345056540') // false (has '2600' at 14-17)
 * isTargetAccount('UA783220010000012345678901234') // true (no restricted pattern)
 */
export function isTargetAccount(senderAccount: string | null | undefined): boolean {
  // If no sender account, consider it non-target for safety
  if (!senderAccount || senderAccount.length < 18) {
    return false;
  }

  // Extract characters at positions 14-17 (0-indexed)
  const patternSection = senderAccount.substring(14, 18);

  // Check if this section matches any non-target patterns
  const isNonTarget = NON_TARGET_PATTERNS.includes(patternSection);

  // Return opposite: if it's NOT a non-target pattern, then it IS a target
  return !isNonTarget;
}

/**
 * Get a human-readable label for payment target status
 *
 * @param senderAccount - The sender's account number
 * @returns Label describing whether payment needs receipt
 */
export function getTargetLabel(senderAccount: string | null | undefined): {
  text: string;
  emoji: string;
  needsReceipt: boolean;
} {
  const isTarget = isTargetAccount(senderAccount);

  if (isTarget) {
    return {
      text: 'Потребує чек',
      emoji: '🎯',
      needsReceipt: true
    };
  } else {
    return {
      text: 'Не потребує чека',
      emoji: 'ℹ️',
      needsReceipt: false
    };
  }
}
