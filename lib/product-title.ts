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
  // TODO: Future enhancement - customize titles per company
  // Example structure for future implementation:
  //
  // switch (company.id) {
  //   case 1:
  //     return 'Перехідник HDMI-VGA (Компанія А)';
  //   case 2:
  //     return 'Адаптер HDMI-VGA (Компанія Б)';
  //   default:
  //     return getUniversalProductTitle(payment);
  // }

  // TODO: Future enhancement - customize titles per supplier
  // if (supplier?.name) {
  //   return `${getUniversalProductTitle(payment)} від ${supplier.name}`;
  // }

  // For now, return universal title for all companies
  return getUniversalProductTitle(payment);
}

/**
 * Get universal product title (used for all companies currently)
 *
 * @param payment - Payment information
 * @returns Universal product title
 */
function getUniversalProductTitle(payment: PaymentInfo): string {
  // Use payment description if available, otherwise use default title
  if (payment.description && payment.description.trim()) {
    return payment.description.trim();
  }

  // Default universal title
  return 'Перехідник HDMI-VGA';
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
