import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/api-error-handler';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation schema for query params
const getPaymentsSchema = z.object({
  companyId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['all', 'pending', 'issued']).default('all'),
  search: z.string().optional(),
  limit: z.string().default('50'),
  offset: z.string().default('0'),
});

// GET /api/payments - List payments with filtering
export async function GET(request: NextRequest) {
  const context = { method: 'GET', path: '/api/payments' };

  try {
    logger.apiRequest(context.method, context.path);
    const { searchParams } = new URL(request.url);

    // Parse and validate query params
    const rawParams = {
      companyId: searchParams.get('companyId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    const params = getPaymentsSchema.parse(rawParams);
    logger.debug('Payments query params', params);

    const companyId = params.companyId ? parseInt(params.companyId) : null;
    const limit = parseInt(params.limit);
    const offset = parseInt(params.offset);

    // Build WHERE clauses
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by company (required)
    if (companyId) {
      whereClauses.push(`p.company_id = $${paramIndex}`);
      queryParams.push(companyId);
      paramIndex++;
    }

    // Filter by date range
    if (params.startDate) {
      whereClauses.push(`p.payment_date >= $${paramIndex}`);
      queryParams.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      whereClauses.push(`p.payment_date <= $${paramIndex}`);
      queryParams.push(params.endDate);
      paramIndex++;
    }

    // Filter by receipt status
    if (params.status === 'pending') {
      whereClauses.push(`p.receipt_issued = false`);
    } else if (params.status === 'issued') {
      whereClauses.push(`p.receipt_issued = true`);
    }

    // Search by sender name or description
    if (params.search) {
      whereClauses.push(`(p.sender_name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM payments p
      ${whereClause}
    `;

    const countResult = await sql.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get payments with pagination
    const paymentsQuery = `
      SELECT
        p.id,
        p.company_id,
        p.external_id,
        p.amount,
        p.currency,
        p.description,
        p.sender_account,
        p.sender_name,
        p.sender_tax_id,
        p.document_number,
        p.payment_date,
        p.status,
        p.receipt_issued,
        p.is_target,
        p.receipt_id,
        p.created_at,
        r.checkbox_receipt_id,
        r.fiscal_code,
        r.pdf_url
      FROM payments p
      LEFT JOIN receipts r ON p.receipt_id = r.id
      ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    logger.dbQuery('SELECT payments with filters');
    const paymentsResult = await sql.query(paymentsQuery, queryParams);

    // Calculate summary stats (use same where clause but rebuild params without limit/offset)
    const statsParams = queryParams.slice(0, -2); // Remove limit and offset
    const statsQuery = `
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN p.receipt_issued = false THEN 1 ELSE 0 END) as pending_receipts,
        SUM(CASE WHEN p.receipt_issued = true THEN 1 ELSE 0 END) as issued_receipts,
        COALESCE(SUM(p.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN p.receipt_issued = false THEN p.amount ELSE 0 END), 0) as pending_amount
      FROM payments p
      ${whereClause}
    `;

    logger.dbQuery('SELECT payment stats');
    const statsResult = await sql.query(statsQuery, statsParams);
    const stats = statsResult.rows[0];

    logger.apiResponse(context.method, context.path, 200);
    return NextResponse.json({
      payments: paymentsResult.rows,
      pagination: {
        total: totalCount,
        limit: limit,
        offset: offset,
        hasMore: offset + limit < totalCount,
      },
      summary: {
        total_payments: parseInt(stats.total_payments || '0'),
        pending_receipts: parseInt(stats.pending_receipts || '0'),
        issued_receipts: parseInt(stats.issued_receipts || '0'),
        total_amount: parseFloat(stats.total_amount || '0'),
        pending_amount: parseFloat(stats.pending_amount || '0'),
      },
    });
  } catch (error) {
    return handleApiError(error, context);
  }
}
