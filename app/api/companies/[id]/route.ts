import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { encrypt, decrypt } from '@/lib/encryption';

// Validation schema for updating a company
const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  tax_id: z.string().min(1).optional(),
  pb_merchant_id: z.string().optional().nullable(),
  pb_api_token: z.string().optional().nullable(),
  checkbox_license_key: z.string().optional().nullable(),
  checkbox_cashier_pin: z.string().optional().nullable(),
});

// GET /api/companies/[id] - Get a single company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const result = await sql`
      SELECT
        id,
        name,
        tax_id,
        pb_merchant_id,
        pb_api_token_encrypted,
        checkbox_license_key_encrypted,
        checkbox_cashier_pin_encrypted,
        created_at
      FROM companies
      WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = result.rows[0];

    // Safe decrypt helper
    const safeDecrypt = (encrypted: string | null): string | null => {
      if (!encrypted) return null;
      try {
        return decrypt(encrypted);
      } catch (error) {
        console.error(`Decryption failed for company ${company.id}:`, error);
        return null;
      }
    };

    // Decrypt sensitive fields
    const decryptedCompany = {
      id: company.id,
      name: company.name,
      tax_id: company.tax_id,
      pb_merchant_id: company.pb_merchant_id,
      pb_api_token: safeDecrypt(company.pb_api_token_encrypted),
      checkbox_license_key: safeDecrypt(company.checkbox_license_key_encrypted),
      checkbox_cashier_pin: safeDecrypt(company.checkbox_cashier_pin_encrypted),
      created_at: company.created_at,
    };

    return NextResponse.json({ company: decryptedCompany });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

// PUT /api/companies/[id] - Update a company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate input
    const validatedData = updateCompanySchema.parse(body);

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (validatedData.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(validatedData.name);
      paramIndex++;
    }

    if (validatedData.tax_id !== undefined) {
      updates.push(`tax_id = $${paramIndex}`);
      values.push(validatedData.tax_id);
      paramIndex++;
    }

    if (validatedData.pb_merchant_id !== undefined) {
      updates.push(`pb_merchant_id = $${paramIndex}`);
      values.push(validatedData.pb_merchant_id);
      paramIndex++;
    }

    if (validatedData.pb_api_token !== undefined) {
      updates.push(`pb_api_token_encrypted = $${paramIndex}`);
      values.push(validatedData.pb_api_token ? encrypt(validatedData.pb_api_token) : null);
      paramIndex++;
    }

    if (validatedData.checkbox_license_key !== undefined) {
      updates.push(`checkbox_license_key_encrypted = $${paramIndex}`);
      values.push(validatedData.checkbox_license_key ? encrypt(validatedData.checkbox_license_key) : null);
      paramIndex++;
    }

    if (validatedData.checkbox_cashier_pin !== undefined) {
      updates.push(`checkbox_cashier_pin_encrypted = $${paramIndex}`);
      values.push(validatedData.checkbox_cashier_pin ? encrypt(validatedData.checkbox_cashier_pin) : null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add id to values
    values.push(id);

    const query = `
      UPDATE companies
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        name,
        tax_id,
        pb_merchant_id,
        created_at
    `;

    const result = await sql.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const company = result.rows[0];

    return NextResponse.json({
      message: 'Company updated successfully',
      company: {
        ...company,
        pb_api_token: validatedData.pb_api_token || null,
        checkbox_license_key: validatedData.checkbox_license_key || null,
        checkbox_cashier_pin: validatedData.checkbox_cashier_pin || null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/[id] - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if company has associated payments
    const paymentsCheck = await sql`
      SELECT COUNT(*) as count
      FROM payments
      WHERE company_id = ${id}
    `;

    const paymentCount = parseInt(paymentsCheck.rows[0].count);

    if (paymentCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete company with existing payments',
          details: `This company has ${paymentCount} payment(s). Please delete or reassign them first.`,
        },
        { status: 400 }
      );
    }

    // Delete company
    const result = await sql`
      DELETE FROM companies
      WHERE id = ${id}
      RETURNING id, name
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Company deleted successfully',
      company: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}
