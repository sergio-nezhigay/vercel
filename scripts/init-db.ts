import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function initDatabase() {
  try {
    console.log('🚀 Starting multi-company database initialization...\n');

    // Archive old transactions table (optional - comment out if you want to keep it)
    console.log('📦 Archiving old transactions table...');
    try {
      await sql`ALTER TABLE IF EXISTS transactions RENAME TO transactions_old_backup`;
      console.log('✓ Old transactions table renamed to transactions_old_backup');
    } catch (error) {
      console.log('ℹ️  No old transactions table found (this is fine for fresh install)');
    }

    // ============================================
    // CREATE TABLES
    // ============================================


    console.log('\n🏢 Creating companies table...');
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tax_id VARCHAR(50) UNIQUE NOT NULL,
        address TEXT,
        pb_merchant_id TEXT,
        pb_api_token_encrypted TEXT,
        checkbox_license_key_encrypted TEXT,
        checkbox_cashier_login VARCHAR(255),
        checkbox_cashier_pin_encrypted TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✓ Companies table created');

    console.log('\n💰 Creating payments table...');
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        external_id VARCHAR(255) UNIQUE,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'UAH',
        description TEXT,
        sender_account VARCHAR(50),
        sender_name VARCHAR(255),
        sender_tax_id VARCHAR(50),
        document_number VARCHAR(100),
        payment_date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        receipt_issued BOOLEAN DEFAULT false,
        receipt_id INTEGER NULL,
        is_target BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✓ Payments table created');

    console.log('\n🧾 Creating receipts table...');
    await sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
        checkbox_receipt_id VARCHAR(255),
        fiscal_code VARCHAR(100),
        amount DECIMAL(10, 2),
        receipt_url TEXT,
        pdf_url TEXT,
        status VARCHAR(20) DEFAULT 'issued',
        issued_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✓ Receipts table created');

    // ============================================
    // CREATE INDEXES
    // ============================================

    console.log('\n📇 Creating indexes...');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payments_company_date ON payments(company_id, payment_date DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_receipts_company_id ON receipts(company_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
    `;

    console.log('✓ All indexes created');

    // ============================================
    // INSERT SAMPLE DATA
    // ============================================

    console.log('\n🌱 Inserting sample data for testing...\n');

    // Sample companies
    console.log('Adding sample companies...');
    const companies = await sql`
      INSERT INTO companies (name, tax_id, address, pb_merchant_id, checkbox_license_key_encrypted)
      VALUES
        ('ТОВ "Тестова Компанія 1"', '12345678', 'Київ, вул. Хрещатик, 1', 'PB_MERCHANT_1', 'CHECKBOX_LICENSE_1'),
        ('ПП "Тестова Компанія 2"', '87654321', 'Львів, пл. Ринок, 5', 'PB_MERCHANT_2', 'CHECKBOX_LICENSE_2')
      ON CONFLICT (tax_id) DO NOTHING
      RETURNING id, name;
    `;

    if (companies.rows.length > 0) {
      companies.rows.forEach((company) => {
        console.log(`  ✓ ${company.name} (ID: ${company.id})`);
      });
    } else {
      console.log('  ℹ️  Companies already exist, skipping...');
    }

    // Get company IDs for sample data
    const allCompanies = await sql`SELECT id FROM companies ORDER BY id LIMIT 2`;
    const company1Id = allCompanies.rows[0]?.id;
    const company2Id = allCompanies.rows[1]?.id;

    if (company1Id) {
      // Sample payments for company 1
      console.log('\nAdding sample payments for company 1...');
      await sql`
        INSERT INTO payments (
          company_id, external_id, amount, currency, description,
          sender_account, sender_name, payment_date, status, receipt_issued
        )
        VALUES
          (${company1Id}, 'PB_TXN_001', 1500.00, 'UAH', 'Оплата за товар', 'UA123456789', 'ФОП Іванов', NOW() - INTERVAL '2 days', 'completed', false),
          (${company1Id}, 'PB_TXN_002', 2800.50, 'UAH', 'Оплата за послуги', 'UA987654321', 'ТОВ Партнер', NOW() - INTERVAL '1 day', 'completed', true),
          (${company1Id}, 'PB_TXN_003', 750.00, 'UAH', 'Аванс', 'UA555666777', 'Клієнт А', NOW(), 'completed', false)
        ON CONFLICT (external_id) DO NOTHING;
      `;
      console.log('  ✓ 3 payments added for company 1');
    }

    if (company2Id) {
      // Sample payments for company 2
      console.log('Adding sample payments for company 2...');
      await sql`
        INSERT INTO payments (
          company_id, external_id, amount, currency, description,
          sender_account, sender_name, payment_date, status, receipt_issued
        )
        VALUES
          (${company2Id}, 'PB_TXN_004', 3200.00, 'UAH', 'Оплата накладної №123', 'UA111222333', 'ТОВ Клієнт', NOW() - INTERVAL '3 days', 'completed', false),
          (${company2Id}, 'PB_TXN_005', 1100.00, 'UAH', 'Передплата', 'UA444555666', 'ФОП Петренко', NOW() - INTERVAL '1 day', 'completed', false)
        ON CONFLICT (external_id) DO NOTHING;
      `;
      console.log('  ✓ 2 payments added for company 2');
    }

    // Sample receipt for issued payment
    if (company1Id) {
      const issuedPayment = await sql`
        SELECT id FROM payments
        WHERE company_id = ${company1Id} AND receipt_issued = true
        LIMIT 1
      `;

      if (issuedPayment.rows.length > 0) {
        console.log('\nAdding sample receipt...');
        await sql`
          INSERT INTO receipts (
            company_id, payment_id, checkbox_receipt_id,
            fiscal_number, amount, pdf_url, status
          )
          VALUES
            (${company1Id}, ${issuedPayment.rows[0].id}, 'CHK_RCP_001', '1234567890', 2800.50, 'https://example.com/receipt.pdf', 'issued')
          ON CONFLICT DO NOTHING;
        `;
        console.log('  ✓ Sample receipt added');
      }
    }

    // ============================================
    // DISPLAY SUMMARY
    // ============================================

    console.log('\n📊 Database Summary:');
    console.log('═══════════════════════════════════════');


    const companyCount = await sql`SELECT COUNT(*) as count FROM companies`;
    console.log(`Companies: ${companyCount.rows[0].count}`);

    const paymentCount = await sql`SELECT COUNT(*) as count FROM payments`;
    console.log(`Payments: ${paymentCount.rows[0].count}`);

    const receiptCount = await sql`SELECT COUNT(*) as count FROM receipts`;
    console.log(`Receipts: ${receiptCount.rows[0].count}`);

    const pendingCount = await sql`
      SELECT COUNT(*) as count FROM payments WHERE receipt_issued = false
    `;
    console.log(`Pending receipts: ${pendingCount.rows[0].count}`);

    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

initDatabase()
  .then(() => {
    console.log('✅ Database setup complete!');
    console.log('\n💡 Next steps:');
    console.log('  1. Proceed to Step 2: Authentication System');
    console.log('  2. Update DEVELOPMENT_PROGRESS.md\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  });
