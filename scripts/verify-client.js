import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('--- Verifying DigiBanking Bulk Onboarding Implementation ---');

// 1. Verify build artifacts
assert(fs.existsSync('dist/index.html'), 'dist/index.html must exist');
assert(fs.existsSync('dist/riverside-branch-october-enrolment.xlsx'), 'demo workbook must be in dist');
assert(fs.existsSync('dist/config.xml'), 'config.xml must be in dist');
console.log('[OK] Build artifacts verified in dist/');

// 2. Verify demo workbook structure
import XLSX from 'xlsx';
const wb = XLSX.readFile('dist/riverside-branch-october-enrolment.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log(`[OK] Workbook has ${rows.length} rows (1 header + ${rows.length - 1} records)`);
assert(rows.length === 8, 'Expected 7 data rows + 1 header row');
const headers = rows[0];
assert(headers.includes('first_name'), 'Header must contain first_name');
assert(headers.includes('member_number'), 'Header must contain member_number');
assert(headers.includes('account_type'), 'Header must contain account_type');
console.log('[OK] Workbook column headers match API requirements');

// 3. Verify SQLite test data
assert(fs.existsSync('data/onboarding.sqlite'), 'data/onboarding.sqlite must exist');
console.log('[OK] SQLite database file present');

console.log('\nAll verification checks passed successfully!');
