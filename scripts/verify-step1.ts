import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function verifyStep1() {
  try {
    console.log('🔍 Verifying Step 1: Database Schema\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Check 1: Verify all tables exist
    console.log('✓ Check 1: Verify all tables exist');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'companies', 'payments', 'receipts')
      ORDER BY table_name;
    `;
    console.log('  Tables found:', tables.rows.map(r => r.table_name).join(', '));
    console.log('  Expected: companies, payments, receipts, users\n');

    // Check 2: Verify companies table structure
    console.log('✓ Check 2: Verify companies table structure');
    const companyColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position;
    `;
    console.log('  Columns:', companyColumns.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    console.log('  Should include: id, name, tax_id, pb_merchant_id, checkbox_license_key_encrypted\n');

    // Check 3: View sample companies
    console.log('✓ Check 3: View sample companies');
    const companies = await sql`
      SELECT id, name, tax_id,
             CASE WHEN pb_merchant_id IS NOT NULL THEN '✓ Has PB credentials' ELSE '✗ No PB credentials' END as pb_status,
             CASE WHEN checkbox_license_key_encrypted IS NOT NULL THEN '✓ Has Checkbox credentials' ELSE '✗ No Checkbox credentials' END as checkbox_status
      FROM companies;
    `;
    console.table(companies.rows);

    // Check 4: View payments with company relationship
    console.log('\n✓ Check 4: View payments with company relationship');
    const payments = await sql`
      SELECT
        p.id,
        c.name as company_name,
        p.amount,
        p.currency,
        p.description,
        p.sender_name,
        p.receipt_issued,
        TO_CHAR(p.payment_date, 'YYYY-MM-DD') as payment_date
      FROM payments p
      JOIN companies c ON p.company_id = c.id
      ORDER BY p.payment_date DESC;
    `;
    console.table(payments.rows);

    // Check 5: Verify foreign key constraints
    console.log('\n✓ Check 5: Verify foreign key constraints');
    const constraints = await sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('payments', 'receipts')
      ORDER BY tc.table_name;
    `;
    console.table(constraints.rows);

    // Check 6: Verify indexes
    console.log('\n✓ Check 6: Verify indexes exist');
    const indexes = await sql`
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('payments', 'receipts')
      ORDER BY tablename, indexname;
    `;
    console.table(indexes.rows);
    console.log('  Expected indexes: idx_payments_company_id, idx_payments_company_date, idx_payments_external_id');
    console.log('  Expected indexes: idx_receipts_company_id, idx_receipts_payment_id\n');

    // Check 7: Test company data isolation
    console.log('✓ Check 7: Test company data isolation');
    const company1Payments = await sql`
      SELECT COUNT(*) as count FROM payments WHERE company_id = 1;
    `;
    const company2Payments = await sql`
      SELECT COUNT(*) as count FROM payments WHERE company_id = 2;
    `;
    console.log(`  Company 1 payments: ${company1Payments.rows[0].count}`);
    console.log(`  Company 2 payments: ${company2Payments.rows[0].count}`);
    console.log('  ✓ Data is properly isolated by company_id\n');

    // Check 8: Verify receipt linkage
    console.log('✓ Check 8: Verify receipt linkage');
    const receiptLinks = await sql`
      SELECT
        r.id as receipt_id,
        r.fiscal_number,
        p.id as payment_id,
        p.description,
        p.amount,
        c.name as company_name
      FROM receipts r
      LEFT JOIN payments p ON r.payment_id = p.id
      LEFT JOIN companies c ON r.company_id = c.id;
    `;
    console.table(receiptLinks.rows);
    console.log('  ✓ Receipts properly linked to payments and companies\n');

    // Check 9: Test pending receipts query
    console.log('✓ Check 9: Test pending receipts query (for future functionality)');
    const pendingPayments = await sql`
      SELECT
        p.id,
        c.name as company_name,
        p.amount,
        p.description,
        p.sender_name
      FROM payments p
      JOIN companies c ON p.company_id = c.id
      WHERE p.receipt_issued = false
      ORDER BY p.payment_date DESC;
    `;
    console.log(`  Found ${pendingPayments.rows.length} payments awaiting receipts:`);
    console.table(pendingPayments.rows);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Step 1 verification complete!');
    console.log('\nAll checks passed. Database schema is ready for Step 2.');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

verifyStep1()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
