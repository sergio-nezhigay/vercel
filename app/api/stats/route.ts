import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation schema for query params
const getStatsSchema = z.object({
  companyId: z.string(),
});

// GET /api/stats - Get dashboard statistics for a company
export async function GET(request: NextRequest) {
  try {
    console.log('[/api/stats] Request received');
    const { searchParams } = new URL(request.url);

    // Parse and validate query params
    const rawParams = {
      companyId: searchParams.get('companyId') || undefined,
    };

    const params = getStatsSchema.parse(rawParams);
    const companyId = parseInt(params.companyId);

    console.log('[/api/stats] Getting stats for company:', companyId);

    // Overall statistics
    const overallStatsQuery = `
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN receipt_issued = false THEN 1 ELSE 0 END) as pending_receipts,
        SUM(CASE WHEN receipt_issued = true THEN 1 ELSE 0 END) as issued_receipts,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN receipt_issued = false THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN receipt_issued = true THEN amount ELSE 0 END), 0) as issued_amount,
        MIN(payment_date) as earliest_payment,
        MAX(payment_date) as latest_payment
      FROM payments
      WHERE company_id = $1
    `;

    const overallStatsResult = await sql.query(overallStatsQuery, [companyId]);
    const overallStats = overallStatsResult.rows[0];

    // This month statistics
    const thisMonthStatsQuery = `
      SELECT
        COUNT(*) as total_payments,
        SUM(CASE WHEN receipt_issued = false THEN 1 ELSE 0 END) as pending_receipts,
        SUM(CASE WHEN receipt_issued = true THEN 1 ELSE 0 END) as issued_receipts,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE company_id = $1
        AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)
    `;

    const thisMonthStatsResult = await sql.query(thisMonthStatsQuery, [companyId]);
    const thisMonthStats = thisMonthStatsResult.rows[0];

    // Last 7 days statistics
    const last7DaysStatsQuery = `
      SELECT
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE company_id = $1
        AND payment_date >= CURRENT_DATE - INTERVAL '7 days'
    `;

    const last7DaysStatsResult = await sql.query(last7DaysStatsQuery, [companyId]);
    const last7DaysStats = last7DaysStatsResult.rows[0];

    // Receipt issuance rate
    const totalPayments = parseInt(overallStats.total_payments || '0');
    const issuedReceipts = parseInt(overallStats.issued_receipts || '0');
    const receiptIssuanceRate = totalPayments > 0
      ? Math.round((issuedReceipts / totalPayments) * 100)
      : 0;

    // Recent activity (last 10 payments)
    const recentActivityQuery = `
      SELECT
        p.id,
        p.amount,
        p.sender_name,
        p.description,
        p.payment_date,
        p.receipt_issued,
        p.created_at
      FROM payments p
      WHERE p.company_id = $1
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT 10
    `;

    const recentActivityResult = await sql.query(recentActivityQuery, [companyId]);

    // Top senders by payment count
    const topSendersQuery = `
      SELECT
        sender_name,
        COUNT(*) as payment_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE company_id = $1
        AND sender_name IS NOT NULL
      GROUP BY sender_name
      ORDER BY payment_count DESC
      LIMIT 5
    `;

    const topSendersResult = await sql.query(topSendersQuery, [companyId]);

    // Daily payment trend (last 30 days)
    const dailyTrendQuery = `
      SELECT
        DATE(payment_date) as date,
        COUNT(*) as payment_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM payments
      WHERE company_id = $1
        AND payment_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(payment_date)
      ORDER BY date DESC
    `;

    const dailyTrendResult = await sql.query(dailyTrendQuery, [companyId]);

    // Build response
    return NextResponse.json({
      overall: {
        total_payments: parseInt(overallStats.total_payments || '0'),
        pending_receipts: parseInt(overallStats.pending_receipts || '0'),
        issued_receipts: parseInt(overallStats.issued_receipts || '0'),
        total_amount: parseFloat(overallStats.total_amount || '0'),
        pending_amount: parseFloat(overallStats.pending_amount || '0'),
        issued_amount: parseFloat(overallStats.issued_amount || '0'),
        receipt_issuance_rate: receiptIssuanceRate,
        earliest_payment: overallStats.earliest_payment,
        latest_payment: overallStats.latest_payment,
      },
      this_month: {
        total_payments: parseInt(thisMonthStats.total_payments || '0'),
        pending_receipts: parseInt(thisMonthStats.pending_receipts || '0'),
        issued_receipts: parseInt(thisMonthStats.issued_receipts || '0'),
        total_amount: parseFloat(thisMonthStats.total_amount || '0'),
      },
      last_7_days: {
        total_payments: parseInt(last7DaysStats.total_payments || '0'),
        total_amount: parseFloat(last7DaysStats.total_amount || '0'),
      },
      recent_activity: recentActivityResult.rows,
      top_senders: topSendersResult.rows.map(row => ({
        sender_name: row.sender_name,
        payment_count: parseInt(row.payment_count || '0'),
        total_amount: parseFloat(row.total_amount || '0'),
      })),
      daily_trend: dailyTrendResult.rows.map(row => ({
        date: row.date,
        payment_count: parseInt(row.payment_count || '0'),
        total_amount: parseFloat(row.total_amount || '0'),
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error fetching stats:', error);
    console.error('Error stack:', (error as Error).stack);
    return NextResponse.json(
      {
        error: 'Failed to fetch stats',
        message: (error as Error).message,
        details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
}
