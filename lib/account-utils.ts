/**
 * Account pattern matching utilities
 * Used to identify payments that require receipt issuance
 */

/**
 * Patterns that indicate non-target payments (receipts not needed)
 * These patterns appear at positions 15-18 in Ukrainian IBAN format
 */
const NON_TARGET_PATTERNS = ['2600', '2902', '2909', '2920'];
const NOVA_POSHTA_ACCOUNT = 'UA813005280000026548000000014';

/**
 * Check if a payment is a target for receipt issuance
 * Target payments are those that DON'T have specific patterns at positions 15-18 in sender's account
 *
 * @param senderAccount - The sender's account number (IBAN format)
 * @returns true if payment needs receipt, false otherwise
 *
 * @example
 * isTargetAccount('UA843052990000026001031613189') // false (has '2600' at 15-18)
 * isTargetAccount('UA783220010000012345678901234') // true (no restricted pattern)
 */
export function isTargetAccount(
  senderAccount: string | null | undefined
): boolean {
  if (!senderAccount || senderAccount.length < 19) {
    return false;
  }

  if (senderAccount === NOVA_POSHTA_ACCOUNT) {
    return false;
  }

  const patternSection = senderAccount.substring(15, 19);
  const isNonTarget = NON_TARGET_PATTERNS.includes(patternSection);

  return !isNonTarget;
}

/**
 * Extract pattern information from account number for visual display
 *
 * @param senderAccount - The sender's account number
 * @returns Pattern parts for visual highlighting
 */
export function getAccountPatternParts(
  senderAccount: string | null | undefined
): {
  prefix: string;
  pattern: string;
  suffix: string;
  isMatched: boolean;
} | null {
  if (!senderAccount || senderAccount.length < 19) {
    return null;
  }

  const prefix = senderAccount.substring(0, 15);
  const pattern = senderAccount.substring(15, 19);
  const suffix = senderAccount.substring(19);
  const isMatched = NON_TARGET_PATTERNS.includes(pattern);

  return {
    prefix,
    pattern,
    suffix,
    isMatched,
  };
}
