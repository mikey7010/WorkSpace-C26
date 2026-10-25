/**
 * Automatic Supabase Migration & Seeder
 * Usage:
 *   node switch-to-supabase.js "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
 *
 * This script will:
 * 1. Switch prisma provider in schema.prisma from "sqlite" to "postgresql"
 * 2. Update .env with your Supabase DATABASE_URL
 * 3. Run `prisma db push` to create all PostgreSQL tables
 * 4. Run `prisma/seed.js` to populate all 87 C26 headcount rows, 10 departments & personnel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const supabaseUrl = process.argv[2] || process.env.SUPABASE_DATABASE_URL;

if (!supabaseUrl || !supabaseUrl.startsWith('postgres')) {
  console.error('\x1b[31m[ERROR] Please provide your Supabase PostgreSQL connection string.\x1b[0m');
  console.log('\nExample:');
  console.log('  node switch-to-supabase.js "postgresql://postgres.xxx:mypassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"\n');
  console.log('You can find this string in your Supabase project dashboard -> Settings -> Database -> Connection string (URI - Transaction pooler or direct).');
  process.exit(1);
}

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '.env');

console.log('\x1b[36m===> Step 1: Updating schema.prisma provider to postgresql...\x1b[0m');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');
schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
fs.writeFileSync(schemaPath, schemaContent, 'utf8');
console.log('✔ schema.prisma updated.');

console.log('\x1b[36m===> Step 2: Updating server .env with Supabase connection string...\x1b[0m');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
if (/^DATABASE_URL=.*$/m.test(envContent)) {
  envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${supabaseUrl}"`);
} else {
  envContent += `\nDATABASE_URL="${supabaseUrl}"\n`;
}
fs.writeFileSync(envPath, envContent, 'utf8');
console.log('✔ .env updated with Supabase DATABASE_URL.');

console.log('\x1b[36m===> Step 3: Pushing database schema to Supabase...\x1b[0m');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: __dirname, shell: true });
  console.log('✔ Supabase PostgreSQL tables created successfully.');
} catch (err) {
  console.error('\x1b[31m[ERROR] Failed to push schema to Supabase. Check your connection URL and password.\x1b[0m');
  process.exit(1);
}

console.log('\x1b[36m===> Step 4: Seeding all C26 Master Data into Supabase...\x1b[0m');
try {
  execSync('node prisma/seed.js', { stdio: 'inherit', cwd: __dirname, shell: true });
  console.log('\x1b[32m✔ SUCCESS! All 87 positions, 1,157 headcounts, and 10 departments migrated to Supabase.\x1b[0m');
  console.log('\x1b[32m✔ Restart your server (npm run dev) to start using Supabase in real-time.\x1b[0m');
} catch (err) {
  console.error('\x1b[31m[ERROR] Seeding failed.\x1b[0m', err.message);
  process.exit(1);
}
