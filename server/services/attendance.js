import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import XLSX from 'xlsx';
import pool from '../db/pool.js';
import { generateVisitorId } from '../utils/gymId.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const XLSX_PATH = join(DATA_DIR, 'attendance.xlsx');
const HEADERS = ['Member Name', 'GYM ID', 'Clock In Date & Time'];

export class MemberNotFoundError extends Error {}
export class DuplicateCheckInError extends Error {}
export class MemberExpiredError extends Error {
  constructor(message, memberData) {
    super(message);
    this.memberData = memberData;
  }
}

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

export const processVisitorCheckIn = async (gymId, name, phoneNumber) => {
  const client = await pool.connect();
  let visitor;
  let log;
  let isNew = false;

  try {
    await client.query('BEGIN');

    // Look up returning visitor by phone number
    if (phoneNumber) {
      const existing = await client.query(
        `SELECT id, name FROM members
         WHERE gym_id = $1 AND is_visitor = true AND phone_number = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [gymId, phoneNumber]
      );
      if (existing.rows.length > 0) visitor = existing.rows[0];
    }

    // Create new visitor record if not found
    if (!visitor) {
      const gymResult = await client.query(
        'SELECT visitor_id_counter FROM gyms WHERE id = $1 FOR UPDATE',
        [gymId]
      );
      const newCounter = gymResult.rows[0].visitor_id_counter + 1;
      const scanToken = generateVisitorId(newCounter);
      await client.query('UPDATE gyms SET visitor_id_counter = $1 WHERE id = $2', [newCounter, gymId]);

      const defaultHash = await bcrypt.hash('password123', 10);
      const memberResult = await client.query(
        `INSERT INTO members (gym_id, name, phone_number, is_visitor, scan_token, password_hash)
         VALUES ($1, $2, $3, true, $4, $5)
         RETURNING id, name`,
        [gymId, name.trim(), phoneNumber || null, scanToken, defaultHash]
      );
      visitor = memberResult.rows[0];
      isNew = true;
    }

    // Prevent duplicate check-in on the same day
    const openCheckIn = await client.query(
      `SELECT id FROM attendance_logs
       WHERE member_id = $1 AND gym_id = $2
         AND checked_out_at IS NULL
         AND checked_in_at::date = CURRENT_DATE
       LIMIT 1`,
      [visitor.id, gymId]
    );
    if (openCheckIn.rows.length > 0) {
      throw new DuplicateCheckInError('Visitor is already checked in today');
    }

    const logResult = await client.query(
      `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at)
       VALUES ($1, $2, NOW())
       RETURNING id, checked_in_at`,
      [gymId, visitor.id]
    );
    log = logResult.rows[0];

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { visitorName: visitor.name, checkedInAt: log.checked_in_at, isNew, visitorMemberId: visitor.id };
};

function validateMemberExpiry(member, scanToken) {
  if (member.expiry_date && new Date(member.expiry_date) < new Date()) {
    const expiredOn = new Date(member.expiry_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    throw new MemberExpiredError(`Membership expired on ${expiredOn}`, {
      memberId: member.id,
      memberName: member.name,
      scanToken,
      expiryDate: member.expiry_date,
    });
  }
}

async function checkDuplicateCheckin(client, memberId, gymId) {
  const openCheckIn = await client.query(
    `SELECT id
     FROM attendance_logs
     WHERE member_id = $1 AND gym_id = $2
       AND checked_out_at IS NULL
       AND checked_in_at::date = CURRENT_DATE
     LIMIT 1`,
    [memberId, gymId]
  );
  if (openCheckIn.rows.length > 0) {
    throw new DuplicateCheckInError('Member is already checked in');
  }
}

async function insertCheckinLog(client, gymId, memberId) {
  const logResult = await client.query(
    `INSERT INTO attendance_logs (gym_id, member_id, checked_in_at)
     VALUES ($1, $2, NOW())
     RETURNING id, checked_in_at`,
    [gymId, memberId]
  );
  return logResult.rows[0];
}

export const processScan = async (gymId, scanToken) => {
  const client = await pool.connect();
  let member;
  let log;

  try {
    await client.query('BEGIN');

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
    validateMemberExpiry(member, scanToken);
    await checkDuplicateCheckin(client, member.id, gymId);
    log = await insertCheckinLog(client, gymId, member.id);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  appendToXlsx({ memberName: member.name, gymMemberId: scanToken, checkedInAt: log.checked_in_at });

  return {
    memberName: member.name,
    checkedInAt: log.checked_in_at,
    scanToken,
    packageName: member.package_name || null,
    expiryDate: member.expiry_date || null,
  };
};

export const processMemberSelfCheckin = async (gymId, memberId) => {
  const client = await pool.connect();
  let member;
  let log;

  try {
    await client.query('BEGIN');

    const memberResult = await client.query(
      `SELECT m.id, m.name, m.scan_token, m.expiry_date, p.name AS package_name
       FROM members m
       LEFT JOIN membership_packages p ON p.id = m.package_id
       WHERE m.id = $1 AND m.gym_id = $2 AND m.deleted_at IS NULL`,
      [memberId, gymId]
    );

    if (memberResult.rows.length === 0) {
      throw new MemberNotFoundError('Member not found for this gym');
    }

    member = memberResult.rows[0];
    validateMemberExpiry(member);
    await checkDuplicateCheckin(client, member.id, gymId);
    log = await insertCheckinLog(client, gymId, member.id);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  appendToXlsx({ memberName: member.name, gymMemberId: member.scan_token, checkedInAt: log.checked_in_at });

  return {
    memberName: member.name,
    checkedInAt: log.checked_in_at,
    packageName: member.package_name || null,
    expiryDate: member.expiry_date || null,
  };
};
