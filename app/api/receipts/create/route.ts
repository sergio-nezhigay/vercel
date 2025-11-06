import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { decrypt } from '@/lib/encryption';
import {
  checkboxIssueReceipt,
  uahToKopiyky,
  CheckboxCreateReceiptRequest,
} from '@/lib/checkbox-client';
import { getProductTitle, getProductCode } from '@/lib/product-title';

// Validation schema for receipt creation
const createReceiptSchema = z.object({
  paymentId: z.number().int().positive(),
});

// POST /api/receipts/create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = createReceiptSchema.parse(body);
    const { paymentId } = validatedData;

    console.log(`Creating receipt for payment ${paymentId}`);

    // Fetch payment details
    const paymentResult = await sql`
      SELECT
        p.id,
        p.company_id,
        p.amount,
        p.sender_name,
        p.description,
        p.currency,
        p.receipt_issued,
        c.name AS company_name,
        c.checkbox_license_key_encrypted,
        c.checkbox_cashier_login,
        c.checkbox_cashier_pin_encrypted
      FROM payments p
      INNER JOIN companies c ON p.company_id = c.id
      WHERE p.id = ${paymentId}
    `;

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = paymentResult.rows[0];

    // Check if receipt already issued
    if (payment.receipt_issued) {
      return NextResponse.json(
        {
          error: 'Receipt already issued',
          message: 'A receipt has already been created for this payment',
        },
        { status: 400 }
      );
    }

    // Check if Checkbox credentials are configured
    if (
      !payment.checkbox_license_key_encrypted ||
      !payment.checkbox_cashier_login ||
      !payment.checkbox_cashier_pin_encrypted
    ) {
      return NextResponse.json(
        {
          error: 'Checkbox credentials not configured',
          message: 'Please add Checkbox credentials in company settings',
        },
        { status: 400 }
      );
    }

    // Decrypt credentials
    const licenseKey = decrypt(payment.checkbox_license_key_encrypted);
    const cashierPin = decrypt(payment.checkbox_cashier_pin_encrypted);
    const cashierLogin = payment.checkbox_cashier_login;

    // Convert amount to kopiyky (Checkbox uses kopiyky for amounts)
    const amountInKopiyky = uahToKopiyky(parseFloat(payment.amount));

    // Prepare company and payment info for product title generation
    const companyInfo = {
      id: payment.company_id,
      name: payment.company_name,
    };

    const paymentInfo = {
      id: payment.id,
      description: payment.description,
      amount: payment.amount,
      sender_name: payment.sender_name,
    };

    // Prepare receipt data
    const receiptData: CheckboxCreateReceiptRequest = {
      goods: [
        {
          good: {
            code: getProductCode(companyInfo, paymentInfo),
            name: getProductTitle(companyInfo, paymentInfo),
            price: amountInKopiyky,
          },
          quantity: 1000, // 1000 = 1 unit (Checkbox uses milliliters/milligrams)
        },
      ],
      payments: [
        {
          type: 'CASHLESS', // Assuming all payments from PrivatBank are cashless
          value: amountInKopiyky,
        },
      ],
      cashier_name: payment.company_name,
      header: `Платіж від: ${payment.sender_name}`,
      footer: 'Дякуємо за співпрацю!',
    };

    console.log('Receipt data prepared:', JSON.stringify(receiptData, null, 2));

    // Issue receipt via Checkbox API
    let checkboxReceipt;
    try {
      checkboxReceipt = await checkboxIssueReceipt(
        cashierLogin,
        cashierPin,
        licenseKey,
        receiptData
      );
    } catch (apiError: any) {
      console.error('Checkbox API error:', apiError);
      return NextResponse.json(
        {
          error: 'Failed to create receipt in Checkbox',
          message: apiError.message || 'API request failed',
          details: 'Please check your Checkbox credentials and try again',
        },
        { status: 502 }
      );
    }

    console.log('Checkbox receipt created:', checkboxReceipt.id);

    // Store receipt in database
    const receiptInsertResult = await sql`
      INSERT INTO receipts (
        company_id,
        payment_id,
        checkbox_receipt_id,
        fiscal_code,
        amount,
        receipt_url,
        pdf_url,
        status,
        issued_at
      )
      VALUES (
        ${payment.company_id},
        ${paymentId},
        ${checkboxReceipt.id},
        ${checkboxReceipt.fiscal_code || null},
        ${payment.amount},
        ${checkboxReceipt.receipt_url || null},
        ${checkboxReceipt.pdf_url || null},
        ${checkboxReceipt.status},
        ${checkboxReceipt.created_at}
      )
      RETURNING id
    `;

    const receiptId = receiptInsertResult.rows[0].id;

    // Update payment to mark receipt as issued
    await sql`
      UPDATE payments
      SET receipt_issued = true
      WHERE id = ${paymentId}
    `;

    console.log(`Receipt saved to database: ID ${receiptId}`);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Receipt created successfully',
      receipt: {
        id: receiptId,
        checkbox_receipt_id: checkboxReceipt.id,
        fiscal_code: checkboxReceipt.fiscal_code,
        receipt_url: checkboxReceipt.receipt_url,
        pdf_url: checkboxReceipt.pdf_url,
        status: checkboxReceipt.status,
        issued_at: checkboxReceipt.created_at,
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        sender_name: payment.sender_name,
        description: payment.description,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error in receipt creation route:', error);
    return NextResponse.json(
      { error: 'Failed to create receipt', message: (error as Error).message },
      { status: 500 }
    );
  }
}
