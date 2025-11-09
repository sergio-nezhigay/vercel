import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function addIsTargetColumn() {
  try {
    console.log('🔄 Adding is_target column to payments table...\n');

    // Check if column already exists
    const checkColumn = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'payments' AND column_name = 'is_target'
    `;

    if (checkColumn.rows.length > 0) {
      console.log('✓ Column is_target already exists in payments table');
      console.log('✅ Migration complete!');
      process.exit(0);
    }

    // Add is_target column
    await sql`
      ALTER TABLE payments
      ADD COLUMN is_target BOOLEAN DEFAULT true
    `;

    console.log('✓ Added is_target column to payments table');

    // Update existing records based on sender_account pattern
    // Patterns at positions 15-18 (0-indexed): 2600, 2902, 2909, 2920 = NOT target
    // SQL SUBSTRING is 1-indexed, so position 16 = JavaScript position 15
    const updateResult = await sql`
      UPDATE payments
      SET is_target = CASE
        WHEN sender_account IS NULL OR LENGTH(sender_account) < 19 THEN false
        WHEN SUBSTRING(sender_account FROM 16 FOR 4) IN ('2600', '2902', '2909', '2920') THEN false
        ELSE true
      END
    `;

    console.log(`✓ Updated ${updateResult.rowCount} existing payment records with is_target values`);

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addIsTargetColumn();
