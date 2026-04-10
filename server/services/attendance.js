import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import pool from '../db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const XLSX_PATH = join(DATA_DIR, 'attendance.xlsx');
const HEADERS = ['Member Name', 'Gym ID', 'Clock In Date & Time'];

export class MemberNotFoundError extends Error {}
export class DuplicateCheckInError extends Error {}

const appendToXlsx = ({ memberName, gymId, checkedInAt }) => {
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
    gymId,
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

    // 1. Resolve member by scan token, scoped to gym
    const memberResult = await client.query(
      `SELECT id, name
       FROM members
       WHERE gym_id = $1 AND scan_token = $2 AND deleted_at IS NULL`,
      [gymId, scanToken]
    );

    if (memberResult.rows.length === 0) {
      throw new MemberNotFoundError('Member not found for this gym');
    }

    member = memberResult.rows[0];

    // 2. Check for open check-in
    const openCheckIn = await client.query(
      `SELECT id
       FROM attendance_logs
       WHERE member_id = $1 AND gym_id = $2 AND checked_out_at IS NULL
       LIMIT 1`,
      [member.id, gymId]
    );

    if (openCheckIn.rows.length > 0) {
      throw new DuplicateCheckInError('Member is already checked in');
    }

    // 3. Insert attendance log (append-only)
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

  // 4. Write to XLSX after DB commit — failure here won't roll back the DB record
  appendToXlsx({ memberName: member.name, gymId: scanToken, checkedInAt: log.checked_in_at });

  return { memberName: member.name, checkedInAt: log.checked_in_at };
};
