import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function updateIsTargetPatterns() {
  try {
    console.log('🔄 Updating is_target values with corrected pattern positions...\n');

    // Update existing records based on corrected sender_account pattern
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

    console.log(`✓ Updated ${updateResult.rowCount} payment records with corrected is_target values`);

    // Show some examples of the changes
    const examples = await sql`
      SELECT
        external_id,
        sender_account,
        SUBSTRING(sender_account FROM 16 FOR 4) as pattern,
        is_target
      FROM payments
      WHERE sender_account IS NOT NULL
      ORDER BY payment_date DESC
      LIMIT 10
    `;

    console.log('\n📊 Sample of updated records:');
    console.log('─'.repeat(80));
    examples.rows.forEach(row => {
      const status = row.is_target ? '🎯 Target' : 'ℹ️  Non-target';
      console.log(`Pattern: ${row.pattern} → ${status}`);
      console.log(`Account: ${row.sender_account}`);
      console.log('─'.repeat(80));
    });

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

updateIsTargetPatterns();
