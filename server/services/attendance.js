import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import pool from '../db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const XLSX_PATH = join(DATA_DIR, 'attendance.xlsx');
const HEADERS = ['Member Name', 'GYM ID', 'Clock In Date & Time'];

export class MemberNotFoundError extends Error {}
export class DuplicateCheckInError extends Error {}
export class MemberExpiredError extends Error {}

const appendToXlsx = ({ memberName, gymMemberId, checkedInAt }) => {
  mkdirSync(DATA_DIR, { recursive: true });

  let workbook;
  let worksheet;

  if (existsSync(XLSX_PATH)) {
    workbook = XLSX.readFile(XLSX_PATH);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
  } else {
    workbook = XLSX.utils.book_new();
    worksheet = XLSX.utils.aoa_to_sheet([HEADERS]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  }

  const newRow = [
    memberName,
    gymMemberId,
    new Date(checkedInAt).toLocaleString('en-US', { timeZone: 'UTC', hour12: false }),
  ];

  XLSX.utils.sheet_add_aoa(worksheet, [newRow], { origin: -1 });
  XLSX.writeFile(workbook, XLSX_PATH);
};

export const processScan = async (gymId, scanToken) => {
  const client = await pool.connect();
  let member;
  let log;

  try {
    await client.query('BEGIN');

    // 1. Resolve member by scan token (GYM ID), scoped to gym
    const memberResult = await client.query(
      `SELECT m.id, m.name, m.expiry_date, p.name AS package_name
       FROM members m
       LEFT JOIN membership_packages p ON p.id = m.package_id
       WHERE m.gym_id = $1 AND m.scan_token = $2 AND m.deleted_at IS NULL`,
      [gymId, scanToken]
    );

    if (memberResult.rows.length === 0) {
      throw new MemberNotFoundError('Member not found for this gym');
    }

    member = memberResult.rows[0];

    // 2. Check membership expiry
    if (member.expiry_date && new Date(member.expiry_date) < new Date()) {
      const expiredOn = new Date(member.expiry_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      throw new MemberExpiredError(`Membership expired on ${expiredOn}`);
    }

    // 3. Check for open check-in today
    const openCheckIn = await client.query(
      `SELECT id
       FROM attendance_logs
       WHERE member_id = $1 AND gym_id = $2
         AND checked_out_at IS NULL
         AND checked_in_at::date = CURRENT_DATE
       LIMIT 1`,
      [member.id, gymId]
    );

    if (openCheckIn.rows.length > 0) {
      throw new DuplicateCheckInError('Member is already checked in');
    }

    // 4. Insert attendance log (append-only)
    const logResult = await client.query(
      `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at)
       VALUES ($1, $2, NOW())
       RETURNING id, checked_in_at`,
      [gymId, member.id]
    );

    log = logResult.rows[0];
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // 5. Write to XLSX after DB commit — failure here won't roll back the DB record
  appendToXlsx({ memberName: member.name, gymMemberId: scanToken, checkedInAt: log.checked_in_at });

  return {
    memberName: member.name,
    checkedInAt: log.checked_in_at,
    scanToken,
    packageName: member.package_name || null,
    expiryDate: member.expiry_date || null,
  };
};
