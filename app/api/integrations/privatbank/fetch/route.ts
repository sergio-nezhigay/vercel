import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { decrypt } from '@/lib/encryption';
import {
  fetchPrivatBankPayments,
  parsePrivatBankTransaction,
} from '@/lib/privatbank-client';
import { isTargetAccount } from '@/lib/account-utils';

// Validation schema for fetch request
const fetchPaymentsSchema = z.object({
  companyId: z.number().int().positive(),
  startDate: z.string().optional(), // ISO date string or DD.MM.YYYY
  endDate: z.string().optional(),   // ISO date string or DD.MM.YYYY
});

// POST /api/integrations/privatbank/fetch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = fetchPaymentsSchema.parse(body);
    const { companyId, startDate, endDate } = validatedData;

    console.log(`Fetching PrivatBank payments for company ${companyId}`);

    // Fetch company details including encrypted credentials
    const companyResult = await sql`
      SELECT
        id,
        name,
        pb_merchant_id,
        pb_api_token_encrypted
      FROM companies
      WHERE id = ${companyId}
    `;

    if (companyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = companyResult.rows[0];

    // Check if PrivatBank credentials are configured
    if (!company.pb_merchant_id || !company.pb_api_token_encrypted) {
      return NextResponse.json(
        {
          error: 'PrivatBank credentials not configured',
          message: 'Please add PrivatBank Merchant ID and API Token in company settings',
        },
        { status: 400 }
      );
    }

    // Decrypt API token
    const apiToken = decrypt(company.pb_api_token_encrypted);

    // Set date range (default to last 30 days if not provided)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log(`Fetching payments for date range: ${start.toLocaleDateString('uk-UA')} to ${end.toLocaleDateString('uk-UA')}`);
    console.log(`Date range (ISO): ${start.toISOString()} to ${end.toISOString()}`);

    // Fetch payments from PrivatBank
    let transactions;
    try {
      transactions = await fetchPrivatBankPayments({
        merchantId: company.pb_merchant_id,
        token: apiToken,
        startDate: start,
        endDate: end,
      });
    } catch (apiError: any) {
      console.error('PrivatBank API error:', apiError);
      return NextResponse.json(
        {
          error: 'Failed to fetch payments from PrivatBank',
          message: apiError.message || 'API request failed',
          details: 'Please check your PrivatBank credentials and try again',
        },
        { status: 502 }
      );
    }

    console.log(`Fetched ${transactions.length} transactions from PrivatBank`);

    // Process and store payments
    let newPayments = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const tx of transactions) {
      try {
        const payment = parsePrivatBankTransaction(tx);

        // Check if payment already exists (by external_id and company_id)
        const existingPayment = await sql`
          SELECT id
          FROM payments
          WHERE external_id = ${payment.external_id}
            AND company_id = ${companyId}
          LIMIT 1
        `;

        if (existingPayment.rows.length > 0) {
          duplicates++;
          console.log(`Duplicate payment: ${payment.external_id}`);
          continue;
        }

        // Insert new payment
        await sql`
          INSERT INTO payments (
            company_id,
            external_id,
            amount,
            sender_name,
            sender_account,
            sender_tax_id,
            description,
            payment_date,
            currency,
            document_number,
            receipt_issued,
            is_target
          )
          VALUES (
            ${companyId},
            ${payment.external_id},
            ${payment.amount},
            ${payment.sender_name},
            ${payment.sender_account},
            ${payment.sender_tax_id},
            ${payment.description},
            ${payment.payment_date},
            ${payment.currency},
            ${payment.document_number},
            false,
            ${isTargetAccount(payment.sender_account)}
          )
        `;

        newPayments++;
        console.log(`Saved new payment: ${payment.external_id} - ${payment.amount} ${payment.currency}`);
      } catch (error: any) {
        console.error('Error processing payment:', error);
        errors.push(`Failed to process payment ${tx.NUM_DOC}: ${error.message}`);
      }
    }

    // Return summary
    return NextResponse.json({
      success: true,
      message: `Fetched ${transactions.length} transactions from PrivatBank`,
      summary: {
        total_fetched: transactions.length,
        new_payments: newPayments,
        duplicates: duplicates,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
      company_name: company.name,
      date_range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in PrivatBank fetch route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', message: (error as Error).message },
      { status: 500 }
    );
  }
}
