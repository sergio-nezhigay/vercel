import { config } from 'dotenv';
import { sql } from '@vercel/postgres';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function cleanupCompanies() {
  try {
    console.log('🧹 Cleaning up companies encrypted with old key...\n');

    // Delete all companies (this will cascade delete associated payments/receipts)
    const result = await sql`
      DELETE FROM companies
      RETURNING id, name;
    `;

    console.log(`✅ Deleted ${result.rowCount} companies:`);
    result.rows.forEach((company) => {
      console.log(`  - ${company.name} (ID: ${company.id})`);
    });

    console.log('\n✅ Cleanup complete! You can now create new companies with the correct encryption key.');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

cleanupCompanies()
  .then(() => {
    console.log('\n💡 Next: Create new companies via the UI or API');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  });
