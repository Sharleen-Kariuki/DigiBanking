import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const headers = [
  'first_name',
  'last_name',
  'date_of_birth',
  'email',
  'branch',
  'account_type',
  'member_number',
  'phone_number',
  'id_number'
];

const rows = [
  // 1. Valid core member - Amina Njeri
  [
    'Amina',
    'Njeri',
    '1988-04-12',
    'amina.njeri@example.test',
    'Riverside Branch',
    'personal',
    'MBR-100001',
    '+254700100001',
    '29100001'
  ],
  // 2. Valid core member - Brian Otieno
  [
    'Brian',
    'Otieno',
    '1992-09-03',
    'brian.otieno@example.test',
    'Riverside Branch',
    'personal',
    'MBR-100002',
    '+254700100002',
    '29100002'
  ],
  // 3. Valid core member - Wanjiku Kamau
  [
    'Wanjiku',
    'Kamau',
    '1985-01-21',
    'wanjiku.kamau@example.test',
    'Riverside Branch',
    'business',
    'MBR-100003',
    '+254700100003',
    '29100003'
  ],
  // 4. Duplicate entry (same member MBR-100001 in same workbook)
  [
    'Amina',
    'Njeri',
    '1988-04-12',
    'amina.njeri@example.test',
    'Riverside Branch',
    'personal',
    'MBR-100001',
    '+254700100001',
    '29100001'
  ],
  // 5. Does not match core banking (Unknown member)
  [
    'Charles',
    'Ochieng',
    '1991-05-15',
    'charles.ochieng@example.test',
    'Riverside Branch',
    'personal',
    'MBR-999999',
    '+254799999999',
    '99999999'
  ],
  // 6. Conflicting identifiers (MBR-100004 belongs to David Mwangi, but phone belongs to Grace Achieng)
  [
    'David',
    'Otieno',
    '1990-06-30',
    'david.otieno@example.test',
    'Riverside Branch',
    'personal',
    'MBR-100004',
    '+254700100005',
    '29100004'
  ],
  // 7. Format errors (Invalid account type, invalid date format, invalid email)
  [
    'Faith',
    'Moraa',
    '1990-99-99',
    'faith-not-an-email',
    'Riverside Branch',
    'unsupported_type',
    'MBR-100005',
    '+254700100005',
    '29100005'
  ]
];

const data = [headers, ...rows];
const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Onboarding');

// Ensure sample-data and public folders exist
fs.mkdirSync('sample-data', { recursive: true });
fs.mkdirSync('public', { recursive: true });

const targetFile = path.join('sample-data', 'riverside-branch-october-enrolment.xlsx');
const publicFile = path.join('public', 'riverside-branch-october-enrolment.xlsx');

XLSX.writeFile(wb, targetFile);
XLSX.writeFile(wb, publicFile);

console.log(`Generated demo workbook at ${targetFile} and ${publicFile}`);

