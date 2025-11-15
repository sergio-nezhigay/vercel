/**
 * Product Title Generator
 *
 * This utility generates product titles for receipts based on:
 * - Company information
 * - Payment details
 * - Supplier information (future enhancement)
 *
 * Currently returns universal titles for all companies.
 * Will be extended to support company-specific and supplier-specific titles.
 */

interface CompanyInfo {
  id: number;
  name: string;
  tax_id?: string;
}

interface PaymentInfo {
  id: number;
  description?: string;
  amount: string | number;
  sender_name?: string;
}

interface SupplierInfo {
  name?: string;
  type?: string;
}

/**
 * Get product title for a receipt based on company and payment information
 *
 * @param company - Company information
 * @param payment - Payment information
 * @param supplier - Optional supplier information (for future use)
 * @returns Product title string
 */
export function getProductTitle(
  company: CompanyInfo,
  payment: PaymentInfo,
  supplier?: SupplierInfo
): string {
  console.log('company', JSON.stringify(company, null, 2));
  // TODO: Future enhancement - customize titles per company
  // Example structure for future implementation:
  //
  switch (company.tax_id) {
    case '2593712430':
      return 'Перехідник HDMI-VGA';
    case '123456789':
      return 'Косметичні товари';
    default:
      return getUniversalProductTitle(payment);
  }
}

/**
 * Get universal product title (used for all companies currently)
 *
 * @param payment - Payment information
 * @returns Universal product title
 */
function getUniversalProductTitle(payment: PaymentInfo): string {
  // Use payment description if available, otherwise use default title
  //  if (payment.description && payment.description.trim()) {
  //    return payment.description.trim();
  //  }

  // Default universal title
  return 'Перехідник HDMI-RCA';
}

/**
 * Get product code for a receipt
 * Currently uses payment ID, can be extended for company-specific codes
 *
 * @param company - Company information
 * @param payment - Payment information
 * @returns Product code string
 */
export function getProductCode(
  company: CompanyInfo,
  payment: PaymentInfo
): string {
  // TODO: Future enhancement - company-specific product codes
  // Example: return `${company.tax_id}-${payment.id}`;

  // For now, use payment ID as product code
  return payment.id.toString();
}
