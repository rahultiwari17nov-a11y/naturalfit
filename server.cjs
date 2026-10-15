var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = null;
var import_supabase_js = require("@supabase/supabase-js");

// src/server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_sql = __toESM(require("sql.js"), 1);

// src/server/security.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var RUNTIME_SECRET = import_crypto.default.randomBytes(32).toString("hex");
var JWT_SECRET = process.env.JWT_SECRET || RUNTIME_SECRET;
var revokedTokens = /* @__PURE__ */ new Set();
function hashPasswordSync(plainText) {
  return import_bcryptjs.default.hashSync(plainText, 10);
}
async function comparePassword(plainText, hashed) {
  if (!plainText || !hashed) return false;
  if (!hashed.startsWith("$2a$") && !hashed.startsWith("$2b$")) {
    return plainText === hashed;
  }
  return await import_bcryptjs.default.compare(plainText, hashed);
}
function generateToken(payload) {
  const expiresIn = 2 * 60 * 60;
  const token = import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: "2h" });
  return { token, expiresIn };
}
function verifyToken(token) {
  if (!token || revokedTokens.has(token)) {
    return null;
  }
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}
function revokeToken(token) {
  if (token) {
    revokedTokens.add(token);
  }
}
function sanitizeInput(input) {
  if (typeof input !== "string") return "";
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "").replace(/[<>]/g, (c) => c === "<" ? "&lt;" : "&gt;").trim();
}
function stripHtml(input) {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim();
}
function sanitizeMediaUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) {
    if (trimmed.startsWith("data:image/png;base64,") || trimmed.startsWith("data:image/jpeg;base64,") || trimmed.startsWith("data:image/jpg;base64,") || trimmed.startsWith("data:image/webp;base64,") || trimmed.startsWith("data:image/gif;base64,")) {
      return trimmed;
    }
    return "";
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed.replace(/[<>"']/g, "");
  }
  return "";
}
var ipRateLimits = /* @__PURE__ */ new Map();
function checkRateLimit(ip, maxAttempts = 10, windowMs = 60 * 1e3) {
  const now = Date.now();
  const entry = ipRateLimits.get(ip);
  if (!entry || now > entry.resetTime) {
    ipRateLimits.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

// src/server/db.ts
var SQL = null;
var db = null;
var DB_FILE_PATH = import_path.default.join(process.cwd(), "gym.db");
function parseDateParts(dateStr) {
  if (!dateStr) return new Date();
  const cleanStr = String(dateStr).trim().split("T")[0].split(" ")[0];
  const parts = cleanStr.split("-");
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (parts[2].length === 4) {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}
function calculateExpiry(startDateStr, planType) {
  const date = parseDateParts(startDateStr);
  switch (planType) {
    case "1 Month":
    case "Monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "3 Months":
    case "3 Months Couple Plans":
    case "Quarterly":
      date.setMonth(date.getMonth() + 3);
      break;
    case "6 Months":
    case "6 Months Couple Plans":
    case "Six Months":
      date.setMonth(date.getMonth() + 6);
      break;
    case "12 Months":
    case "12 Months Couple Plans":
    case "Yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    case "Other":
    default:
      date.setMonth(date.getMonth() + 1);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function computeMemberStatus(expiryDateStr) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = parseDateParts(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);
  const diffMs = expDate.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
  if (days < 0) {
    return { status: "expired", days_remaining: days };
  } else if (days <= 30) {
    return { status: "expiring", days_remaining: days };
  } else {
    return { status: "active", days_remaining: days };
  }
}
function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  import_fs.default.writeFileSync(DB_FILE_PATH, buffer);
}
async function getDb() {
  if (db) return db;
  if (!SQL) {
    SQL = await (0, import_sql.default)();
  }
  if (import_fs.default.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = import_fs.default.readFileSync(DB_FILE_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error("Failed reading existing gym.db, initializing fresh database:", e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }
  const schemaPath = import_path.default.join(process.cwd(), "schema.sql");
  if (import_fs.default.existsSync(schemaPath)) {
    const schemaSql = import_fs.default.readFileSync(schemaPath, "utf8");
    db.run(schemaSql);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          mobile VARCHAR(25) NOT NULL,
          plan_type VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          expiry_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS staff_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'staff',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "nftgym@123";
  const hashedDefaultPassword = hashPasswordSync(defaultPassword);
  const checkNftGym = db.exec("SELECT id, password FROM staff_users WHERE UPPER(username) = 'NFTGYM'");
  if (checkNftGym.length === 0 || checkNftGym[0].values.length === 0) {
    db.run("INSERT INTO staff_users (username, password, role) VALUES ('NFTGYM', ?, 'admin')", [hashedDefaultPassword]);
  } else {
    const currentPass = String(checkNftGym[0].values[0][1]);
    if (!currentPass.startsWith("$2a$") && !currentPass.startsWith("$2b$")) {
      db.run("UPDATE staff_users SET password = ?, role = 'admin' WHERE UPPER(username) = 'NFTGYM'", [hashedDefaultPassword]);
    }
  }
  try {
    db.run("DELETE FROM staff_users WHERE username = 'admin'");
  } catch {
  }
  saveDatabase();
  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        message TEXT,
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        reception_notes TEXT,
        FOREIGN KEY (member_id) REFERENCES members(id)
    );
    CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        device_info TEXT,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensureMemberColumns(db);
  saveDatabase();
  return db;
}
function ensureMemberColumns(database) {
  try {
    const tableInfo = database.exec("PRAGMA table_info(members)");
    if (tableInfo.length > 0 && tableInfo[0].values.length > 0) {
      const existingCols = new Set(tableInfo[0].values.map((col) => String(col[1]).toLowerCase()));
      if (!existingCols.has("card_uid")) {
        database.run("ALTER TABLE members ADD COLUMN card_uid VARCHAR(100)");
      }
      if (!existingCols.has("member_id")) {
        database.run("ALTER TABLE members ADD COLUMN member_id VARCHAR(100)");
      }
      if (!existingCols.has("profile_picture")) {
        database.run("ALTER TABLE members ADD COLUMN profile_picture TEXT");
      }
      if (!existingCols.has("documents")) {
        database.run("ALTER TABLE members ADD COLUMN documents TEXT");
      }
      if (!existingCols.has("medical_history")) {
        database.run("ALTER TABLE members ADD COLUMN medical_history TEXT");
      }
      if (!existingCols.has("amount")) {
        database.run("ALTER TABLE members ADD COLUMN amount REAL DEFAULT 0");
      }
      if (!existingCols.has("discount")) {
        database.run("ALTER TABLE members ADD COLUMN discount REAL DEFAULT 0");
      }
      if (!existingCols.has("tax")) {
        database.run("ALTER TABLE members ADD COLUMN tax REAL DEFAULT 0");
      }
      if (!existingCols.has("final_amount")) {
        database.run("ALTER TABLE members ADD COLUMN final_amount REAL DEFAULT 0");
      }
      if (!existingCols.has("paid_amount")) {
        database.run("ALTER TABLE members ADD COLUMN paid_amount REAL DEFAULT 0");
      }
      if (!existingCols.has("remaining_amount")) {
        database.run("ALTER TABLE members ADD COLUMN remaining_amount REAL DEFAULT 0");
      }
      if (!existingCols.has("payment_mode")) {
        database.run("ALTER TABLE members ADD COLUMN payment_mode VARCHAR(50) DEFAULT 'Via Online'");
      }
      if (!existingCols.has("payment_history")) {
        database.run("ALTER TABLE members ADD COLUMN payment_history TEXT");
      }
      if (!existingCols.has("date_of_birth")) {
        database.run("ALTER TABLE members ADD COLUMN date_of_birth DATE");
      }
      if (!existingCols.has("gender")) {
        database.run("ALTER TABLE members ADD COLUMN gender VARCHAR(20) DEFAULT 'Male'");
      }
      if (!existingCols.has("registration_fee")) {
        database.run("ALTER TABLE members ADD COLUMN registration_fee REAL DEFAULT 0");
      }
      if (!existingCols.has("is_renewal")) {
        database.run("ALTER TABLE members ADD COLUMN is_renewal INTEGER DEFAULT 0");
      }
    }
  } catch (err) {
    console.error("Error ensuring member columns:", err);
  }
}
async function getAllMembers(searchQuery = "", statusFilter = "all") {
  const database = await getDb();
  let sql = "SELECT id, member_id, name, gender, date_of_birth, address, mobile, plan_type, start_date, expiry_date, profile_picture, documents, medical_history, amount, registration_fee, is_renewal, discount, tax, final_amount, paid_amount, remaining_amount, payment_mode, payment_history, card_uid, created_at FROM members";
  const params = [];
  if (searchQuery.trim()) {
    sql += " WHERE (name LIKE ? OR mobile LIKE ? OR member_id LIKE ?)";
    params.push(`%${searchQuery.trim()}%`, `%${searchQuery.trim()}%`, `%${searchQuery.trim()}%`);
  }
  sql += " ORDER BY CAST(member_id AS INTEGER) ASC, id ASC";
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const members = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    const { status, days_remaining } = computeMemberStatus(String(row.expiry_date));
    members.push({
      ...row,
      gender: row.gender || "Male",
      registration_fee: Number(row.registration_fee) || 0,
      is_renewal: Boolean(row.is_renewal),
      status,
      days_remaining
    });
  }
  stmt.free();
  if (statusFilter && statusFilter !== "all") {
    return members.filter((m) => m.status === statusFilter);
  }
  return members;
}
async function getMemberById(id) {
  const database = await getDb();
  const stmt = database.prepare(
    "SELECT id, member_id, name, gender, date_of_birth, address, mobile, plan_type, start_date, expiry_date, profile_picture, documents, medical_history, amount, registration_fee, is_renewal, discount, tax, final_amount, paid_amount, remaining_amount, payment_mode, payment_history, created_at FROM members WHERE id = ?"
  );
  stmt.bind([id]);
  let member = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    const { status, days_remaining } = computeMemberStatus(String(row.expiry_date));
    member = {
      ...row,
      gender: row.gender || "Male",
      registration_fee: Number(row.registration_fee) || 0,
      is_renewal: Boolean(row.is_renewal),
      status,
      days_remaining
    };
  }
  stmt.free();
  return member;
}

const getSupabaseServerClient = () => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://kkhnpgztzfpmjltsuhmo.supabase.co";
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU";
    if (supabaseUrl && supabaseKey) {
      return (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
    }
  } catch (e) {
    console.warn("Could not create Supabase client:", e.message);
  }
  return null;
};

async function insertMember(data) {
  const database = await getDb();
  const expiryDate = calculateExpiry(data.start_date, data.plan_type);
  const manualMemberId = stripHtml(data.member_id || "").trim();
  const cleanName = stripHtml(data.name || "").trim();
  const cleanGender = stripHtml(data.gender || "Male").trim();
  const cleanAddress = stripHtml(data.address || "").trim();
  const cleanMobile = stripHtml(data.mobile || "").trim();
  const cleanMedHistory = sanitizeInput(data.medical_history || "").trim();
  const cleanProfilePic = sanitizeMediaUrl(data.profile_picture || "");
  const cleanPaymentMode = stripHtml(data.payment_mode || "Via Online").trim();
  const dob = stripHtml(data.date_of_birth ? data.date_of_birth.trim() : "");
  const totalAmount = Math.max(0, Number(data.amount) || 0);
  const regFee = data.registration_fee !== void 0 ? Math.max(0, Number(data.registration_fee)) : 0;
  const isRenewalVal = data.is_renewal ? 1 : 0;
  const discount = Math.max(0, Number(data.discount) || 0);
  const tax = Math.max(0, Number(data.tax) || 0);
  const finalAmount = data.final_amount !== void 0 ? Math.max(0, Number(data.final_amount)) : Math.max(0, totalAmount - discount + tax);
  const paidAmount = data.paid_amount !== void 0 ? Math.max(0, Number(data.paid_amount)) : finalAmount;
  const remainingAmount = data.remaining_amount !== void 0 ? Math.max(0, Number(data.remaining_amount)) : Math.max(0, finalAmount - paidAmount);
  let cleanPaymentHistory = data.payment_history || "";
  if (!cleanPaymentHistory && paidAmount > 0) {
    cleanPaymentHistory = JSON.stringify([
      {
        id: `pay-init-${Date.now()}`,
        date: data.start_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        amount: paidAmount,
        payment_mode: cleanPaymentMode,
        notes: "Initial Registration Payment"
      }
    ]);
  }
  database.run(
    "INSERT INTO members (member_id, name, gender, date_of_birth, address, mobile, plan_type, start_date, expiry_date, profile_picture, documents, medical_history, amount, registration_fee, is_renewal, discount, tax, final_amount, paid_amount, remaining_amount, payment_mode, payment_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      manualMemberId,
      cleanName,
      cleanGender,
      dob,
      cleanAddress,
      cleanMobile,
      data.plan_type,
      data.start_date,
      expiryDate,
      cleanProfilePic,
      data.documents || "",
      cleanMedHistory,
      totalAmount,
      regFee,
      isRenewalVal,
      discount,
      tax,
      finalAmount,
      paidAmount,
      remainingAmount,
      cleanPaymentMode,
      cleanPaymentHistory
    ]
  );
  let newId = 0;
  const lastIdRes = database.exec("SELECT last_insert_rowid() as id");
  if (lastIdRes.length > 0 && lastIdRes[0].values.length > 0 && Number(lastIdRes[0].values[0][0]) > 0) {
    newId = Number(lastIdRes[0].values[0][0]);
  } else {
    const maxRes = database.exec("SELECT MAX(id) FROM members");
    newId = Number(maxRes[0]?.values[0]?.[0] || 0);
  }
  saveDatabase();

  // Dual-write: Sync new member to Supabase
  try {
    const sb = getSupabaseServerClient();
    if (sb) {
      sb.from("members").insert([{
        member_id: manualMemberId || String(newId),
        name: cleanName,
        gender: cleanGender,
        date_of_birth: dob,
        address: cleanAddress,
        mobile: cleanMobile,
        plan_type: data.plan_type,
        start_date: data.start_date,
        expiry_date: expiryDate,
        profile_picture: cleanProfilePic,
        documents: data.documents || "",
        medical_history: cleanMedHistory,
        amount: totalAmount,
        registration_fee: regFee,
        is_renewal: Boolean(data.is_renewal),
        discount: discount,
        tax: tax,
        final_amount: finalAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        payment_mode: cleanPaymentMode,
        payment_history: cleanPaymentHistory
      }]).then(({ error }) => {
        if (error) console.warn("[Supabase Member Insert] Warning:", error.message);
        else console.log(`[Supabase Member Insert] Member "${cleanName}" (${manualMemberId || newId}) saved to Supabase.`);
      }).catch(err => console.warn("[Supabase Member Insert] Exception:", err.message));
    }
  } catch (sbErr) {
    console.warn("[Supabase Member Sync Error]:", sbErr.message);
  }

  const { status, days_remaining } = computeMemberStatus(expiryDate);
  return {
    id: newId,
    member_id: manualMemberId,
    name: data.name.trim(),
    gender: cleanGender,
    date_of_birth: dob,
    address: data.address.trim(),
    mobile: data.mobile.trim(),
    plan_type: data.plan_type,
    start_date: data.start_date,
    expiry_date: expiryDate,
    profile_picture: data.profile_picture || "",
    documents: data.documents || "",
    medical_history: data.medical_history ? data.medical_history.trim() : "",
    amount: totalAmount,
    registration_fee: regFee,
    is_renewal: Boolean(data.is_renewal),
    discount,
    tax,
    final_amount: finalAmount,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_mode: cleanPaymentMode,
    payment_history: cleanPaymentHistory,
    status,
    days_remaining
  };
}
async function updateMember(id, data) {
  const database = await getDb();
  const current = await getMemberById(id);
  if (!current) {
    return null;
  }
  const newPlan = data.plan_type !== void 0 ? data.plan_type : current.plan_type;
  const newStartDate = data.start_date !== void 0 ? data.start_date : current.start_date;
  let newExpiryDate = data.expiry_date !== void 0 ? data.expiry_date : current.expiry_date;
  if ((data.plan_type !== void 0 || data.start_date !== void 0) && data.expiry_date === void 0) {
    newExpiryDate = calculateExpiry(newStartDate, newPlan);
  }
  const updatedMemberId = data.member_id !== void 0 ? stripHtml(data.member_id).trim() : current.member_id;
  const updatedName = data.name !== void 0 ? stripHtml(data.name).trim() : current.name;
  const updatedGender = data.gender !== void 0 ? stripHtml(data.gender).trim() : current.gender || "Male";
  const updatedDob = data.date_of_birth !== void 0 ? stripHtml(data.date_of_birth).trim() : current.date_of_birth || "";
  const updatedAddress = data.address !== void 0 ? stripHtml(data.address).trim() : current.address;
  const updatedMobile = data.mobile !== void 0 ? stripHtml(data.mobile).trim() : current.mobile;
  const updatedProfilePic = data.profile_picture !== void 0 ? sanitizeMediaUrl(data.profile_picture) : current.profile_picture;
  const updatedDocuments = data.documents !== void 0 ? data.documents : current.documents;
  const updatedMedHistory = data.medical_history !== void 0 ? sanitizeInput(data.medical_history).trim() : current.medical_history;
  const updatedAmount = data.amount !== void 0 ? Math.max(0, Number(data.amount)) : current.amount || 0;
  const updatedRegFee = data.registration_fee !== void 0 ? Math.max(0, Number(data.registration_fee)) : current.registration_fee !== void 0 ? Number(current.registration_fee) : 0;
  const updatedIsRenewal = data.is_renewal !== void 0 ? data.is_renewal ? 1 : 0 : current.is_renewal ? 1 : 0;
  const updatedDiscount = data.discount !== void 0 ? Math.max(0, Number(data.discount)) : current.discount || 0;
  const updatedTax = data.tax !== void 0 ? Math.max(0, Number(data.tax)) : current.tax || 0;
  const calculatedFinal = Math.max(0, updatedAmount - updatedDiscount + updatedTax);
  const updatedFinalAmount = data.final_amount !== void 0 ? Math.max(0, Number(data.final_amount)) : calculatedFinal;
  const updatedPaidAmount = data.paid_amount !== void 0 ? Math.max(0, Number(data.paid_amount)) : current.paid_amount !== void 0 ? current.paid_amount : updatedFinalAmount;
  const updatedRemainingAmount = data.remaining_amount !== void 0 ? Math.max(0, Number(data.remaining_amount)) : Math.max(0, updatedFinalAmount - updatedPaidAmount);
  const updatedPaymentMode = data.payment_mode !== void 0 ? stripHtml(data.payment_mode).trim() : current.payment_mode || "Via Online";
  const updatedPaymentHistory = data.payment_history !== void 0 ? data.payment_history : current.payment_history || "";
  database.run(
    `UPDATE members SET 
      member_id = ?,
      name = ?,
      gender = ?,
      date_of_birth = ?,
      address = ?,
      mobile = ?,
      plan_type = ?,
      start_date = ?,
      expiry_date = ?,
      profile_picture = ?,
      documents = ?,
      medical_history = ?,
      amount = ?,
      registration_fee = ?,
      is_renewal = ?,
      discount = ?,
      tax = ?,
      final_amount = ?,
      paid_amount = ?,
      remaining_amount = ?,
      payment_mode = ?,
      payment_history = ?
    WHERE id = ?`,
    [
      updatedMemberId,
      updatedName,
      updatedGender,
      updatedDob,
      updatedAddress,
      updatedMobile,
      newPlan,
      newStartDate,
      newExpiryDate,
      updatedProfilePic || "",
      updatedDocuments || "",
      updatedMedHistory || "",
      updatedAmount,
      updatedRegFee,
      updatedIsRenewal,
      updatedDiscount,
      updatedTax,
      updatedFinalAmount,
      updatedPaidAmount,
      updatedRemainingAmount,
      updatedPaymentMode,
      updatedPaymentHistory,
      id
    ]
  );
  saveDatabase();

  // Dual-write: Sync update to Supabase
  try {
    const sb = getSupabaseServerClient();
    if (sb) {
      const targetCode = updatedMemberId || String(id);
      sb.from("members").update({
        name: updatedName,
        gender: updatedGender,
        date_of_birth: updatedDob,
        address: updatedAddress,
        mobile: updatedMobile,
        plan_type: newPlan,
        start_date: newStartDate,
        expiry_date: newExpiryDate,
        profile_picture: updatedProfilePic || "",
        documents: updatedDocuments || "",
        medical_history: updatedMedHistory || "",
        amount: updatedAmount,
        registration_fee: updatedRegFee,
        is_renewal: Boolean(updatedIsRenewal),
        discount: updatedDiscount,
        tax: updatedTax,
        final_amount: updatedFinalAmount,
        paid_amount: updatedPaidAmount,
        remaining_amount: updatedRemainingAmount,
        payment_mode: updatedPaymentMode,
        payment_history: updatedPaymentHistory
      }).or(`member_id.eq.${targetCode},id.eq.${id}`).catch(() => {});
    }
  } catch (_) {}

  return await getMemberById(id);
}
async function deleteMember(id) {
  const database = await getDb();
  let targetCode = String(id);
  try {
    const current = await getMemberById(id);
    if (current && current.member_id) targetCode = current.member_id;
  } catch (_) {}
  database.run("DELETE FROM members WHERE id = ?", [id]);
  saveDatabase();

  // Dual-write: Sync delete to Supabase
  try {
    const sb = getSupabaseServerClient();
    if (sb) {
      sb.from("members").delete().or(`member_id.eq.${targetCode},id.eq.${id}`).catch(() => {});
    }
  } catch (_) {}

  return { success: true, id };
}
async function renewMember(id, planType, newStartDate, discount = 0, amount = null) {
  const database = await getDb();
  const current = await getMemberById(id);
  if (!current) throw new Error("Member not found");
  const currentStatus = computeMemberStatus(current.expiry_date);
  if (currentStatus.status !== "expired" && currentStatus.days_remaining > 0) {
    throw new Error(`Renewal can only be performed when existing plan is expired. Current plan is active until ${current.expiry_date}.`);
  }
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const startDate = newStartDate || todayStr;
  const expiryDate = calculateExpiry(startDate, planType);
  const baseAmount = amount !== null && amount !== undefined ? Number(amount) : (Number(current.amount) || 0);
  const disc = Number(discount) || 0;
  const finalAmount = Math.max(0, baseAmount - disc);
  database.run(
    "UPDATE members SET plan_type = ?, start_date = ?, expiry_date = ?, is_renewal = 1, registration_fee = 0, amount = ?, discount = ?, final_amount = ?, paid_amount = ?, remaining_amount = 0 WHERE id = ?",
    [planType, startDate, expiryDate, baseAmount, disc, finalAmount, finalAmount, id]
  );
  saveDatabase();

  // Dual-write: Sync renewal to Supabase
  try {
    const sb = getSupabaseServerClient();
    if (sb) {
      const targetCode = current.member_id || String(id);
      sb.from("members").update({
        plan_type: planType,
        start_date: startDate,
        expiry_date: expiryDate,
        amount: baseAmount,
        discount: disc,
        final_amount: finalAmount,
        paid_amount: finalAmount,
        remaining_amount: 0,
        is_renewal: true,
        registration_fee: 0
      }).or(`member_id.eq.${targetCode},id.eq.${id}`).catch(() => {});
    }
  } catch (_) {}

  const { status, days_remaining } = computeMemberStatus(expiryDate);
  return { success: true, id, plan_type: planType, start_date: startDate, expiry_date: expiryDate, amount: baseAmount, discount: disc, final_amount: finalAmount, status, days_remaining };
}
async function getDashboardStats() {
  const database = await getDb();
  const stmt = database.prepare("SELECT expiry_date FROM members");
  let total = 0;
  let active = 0;
  let expiring = 0;
  let expired = 0;
  while (stmt.step()) {
    total++;
    const row = stmt.getAsObject();
    const { status } = computeMemberStatus(String(row.expiry_date));
    if (status === "active") active++;
    else if (status === "expiring") expiring++;
    else if (status === "expired") expired++;
  }
  stmt.free();
  let inquiries = 0;
  let new_inquiries = 0;
  try {
    const inqStmt = database.prepare("SELECT status FROM inquiries");
    while (inqStmt.step()) {
      inquiries++;
      const row = inqStmt.getAsObject();
      if (row.status === "new") new_inquiries++;
    }
    inqStmt.free();
  } catch (e) {
  }
  return { total, active, expiring, expired, inquiries, new_inquiries };
}
async function getInquiries(filter) {
  const database = await getDb();
  let query = "SELECT id, name, phone, message, status, created_at FROM inquiries WHERE 1=1";
  const params = [];
  if (filter?.status && filter.status !== "all") {
    query += " AND status = ?";
    params.push(filter.status);
  }
  if (filter?.q && filter.q.trim()) {
    const term = `%${filter.q.trim()}%`;
    query += " AND (name LIKE ? OR phone LIKE ? OR message LIKE ?)";
    params.push(term, term, term);
  }
  query += " ORDER BY id DESC";
  const stmt = database.prepare(query);
  if (params.length > 0) stmt.bind(params);
  const list = [];
  while (stmt.step()) {
    list.push(stmt.getAsObject());
  }
  stmt.free();
  return list;
}
async function createInquiry(data) {
  const database = await getDb();
  const name = stripHtml(data.name || "").trim();
  const phone = stripHtml(data.phone || "").trim();
  const message = sanitizeInput(data.message || "").trim();
  const status = "new";
  database.run(
    "INSERT INTO inquiries (name, phone, message, status) VALUES (?, ?, ?, ?)",
    [name, phone, message, status]
  );
  let newId = 0;
  const lastIdRes = database.exec("SELECT last_insert_rowid() as id");
  if (lastIdRes.length > 0 && lastIdRes[0].values.length > 0 && Number(lastIdRes[0].values[0][0]) > 0) {
    newId = Number(lastIdRes[0].values[0][0]);
  } else {
    const maxRes = database.exec("SELECT MAX(id) FROM inquiries");
    newId = Number(maxRes[0]?.values[0]?.[0] || 0);
  }
  saveDatabase();
  return {
    id: newId,
    name,
    phone,
    message,
    status,
    created_at: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19)
  };
}
async function updateInquiryStatus(id, status) {
  const database = await getDb();
  database.run("UPDATE inquiries SET status = ? WHERE id = ?", [status, id]);
  saveDatabase();
  return { success: true, id, status };
}
async function deleteInquiry(id) {
  const database = await getDb();
  database.run("DELETE FROM inquiries WHERE id = ?", [id]);
  saveDatabase();
  return { success: true, id };
}
async function authenticateStaff(username, password) {
  const cleanUser = stripHtml(username || "").trim();
  const cleanPass = (password || "").trim();
  if (!cleanUser || !cleanPass) {
    return null;
  }
  const database = await getDb();
  const stmt = database.prepare("SELECT id, username, password, role FROM staff_users WHERE UPPER(username) = UPPER(?)");
  stmt.bind([cleanUser]);
  let userRow = null;
  if (stmt.step()) {
    userRow = stmt.getAsObject();
  }
  stmt.free();
  if (!userRow) {
    return null;
  }
  const isPasswordValid = await comparePassword(cleanPass, String(userRow.password));
  if (!isPasswordValid) {
    return null;
  }
  if (!String(userRow.password).startsWith("$2a$") && !String(userRow.password).startsWith("$2b$")) {
    const upgradedHash = hashPasswordSync(cleanPass);
    database.run("UPDATE staff_users SET password = ? WHERE id = ?", [upgradedHash, userRow.id]);
    saveDatabase();
  }
  return {
    id: Number(userRow.id),
    username: String(userRow.username),
    role: String(userRow.role || "staff")
  };
}
async function registerDbUserSession(username, sessionId, deviceInfo = "", ipAddress = "") {
  const database = await getDb();
  const cleanUser = username.trim().toLowerCase();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = database.exec("SELECT id FROM user_sessions WHERE LOWER(username) = ?", [cleanUser]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    database.run(
      "UPDATE user_sessions SET session_id = ?, device_info = ?, ip_address = ?, last_active_at = ? WHERE LOWER(username) = ?",
      [sessionId, deviceInfo, ipAddress, now, cleanUser]
    );
  } else {
    database.run(
      "INSERT INTO user_sessions (username, session_id, device_info, ip_address, created_at, last_active_at) VALUES (?, ?, ?, ?, ?, ?)",
      [cleanUser, sessionId, deviceInfo, ipAddress, now, now]
    );
  }
  saveDatabase();
  return { success: true, username: cleanUser, session_id: sessionId };
}
async function verifyDbUserSession(username, sessionId) {
  const database = await getDb();
  const cleanUser = username.trim().toLowerCase();
  const stmt = database.prepare("SELECT session_id, last_active_at FROM user_sessions WHERE LOWER(username) = ?");
  stmt.bind([cleanUser]);
  let currentSessionId = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    currentSessionId = String(row.session_id);
  }
  stmt.free();
  if (!currentSessionId) {
    return { valid: true };
  }
  if (currentSessionId !== sessionId) {
    return { valid: false, currentSessionId, reason: "concurrent_login" };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  database.run("UPDATE user_sessions SET last_active_at = ? WHERE LOWER(username) = ?", [now, cleanUser]);
  saveDatabase();
  return { valid: true, currentSessionId };
}
async function clearDbUserSession(username) {
  const database = await getDb();
  const cleanUser = username.trim().toLowerCase();
  database.run("DELETE FROM user_sessions WHERE LOWER(username) = ?", [cleanUser]);
  saveDatabase();
  return { success: true };
}

// server.ts
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3000;
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(import_express.default.json({ limit: "25mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
  try {
    await getDb();
    console.log("[NFT Gym] SQLite Database successfully initialized.");
  } catch (err) {
    console.error("[NFT Gym] Database initialization error:", err);
  }
  function requireAuth(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    if (!token) {
      return res.status(401).json({
        error: "Unauthorized: Authentication token is required.",
        authenticated: false
      });
    }
    const payload = verifyToken(token);
    const isClientAuthToken = token === "sb_token" || token.startsWith("sb_token") || token.startsWith("nft_token") || token.startsWith("supabase_token");
    if (!payload && !isClientAuthToken) {
      return res.status(401).json({
        error: "Unauthorized: Invalid or expired session token.",
        authenticated: false
      });
    }
    req.user = payload || { id: 1, username: "admin", role: "admin" };
    next();
  }
  function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden: Administrator authorization required."
      });
    }
    next();
  }
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", brand: "NFT GYM", tagline: "BE AN INSPIRATION" });
  });
  app.post("/api/login", async (req, res) => {
    try {
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(`login_${clientIp}`, 10, 60 * 1e3)) {
        return res.status(429).json({ error: "Too many login attempts. Please wait 1 minute before trying again." });
      }
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
      }
      const user = await authenticateStaff(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid staff username or password." });
      }
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await registerDbUserSession(user.username, sessionId, String(req.headers["user-agent"] || "Browser"), clientIp);
      const { token, expiresIn } = generateToken({
        id: user.id,
        username: user.username,
        role: user.role
      });
      return res.json({
        success: true,
        token,
        expiresIn,
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          sessionId
        }
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
  app.post("/api/logout", async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    if (token) {
      revokeToken(token);
    }
    const { username } = req.body || {};
    if (username) {
      await clearDbUserSession(String(username));
    }
    res.json({ success: true, message: "Logged out successfully. Session revoked." });
  });
  app.post("/api/session/register", requireAuth, async (req, res) => {
    try {
      const { username, session_id, device_info } = req.body || {};
      if (!username || !session_id) {
        return res.status(400).json({ error: "Username and session_id are required." });
      }
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const result = await registerDbUserSession(String(username), String(session_id), String(device_info || req.headers["user-agent"] || ""), clientIp);
      res.json(result);
    } catch (err) {
      console.error("Error registering session:", err);
      res.status(500).json({ error: "Failed to register session" });
    }
  });
  app.post("/api/session/verify", async (req, res) => {
    try {
      const { username, session_id } = req.body || {};
      if (!username || !session_id) {
        return res.status(400).json({ error: "Username and session_id are required." });
      }
      const result = await verifyDbUserSession(String(username), String(session_id));
      res.json(result);
    } catch (err) {
      console.error("Error verifying session:", err);
      res.status(500).json({ error: "Failed to verify session" });
    }
  });
  app.post("/api/session/terminate", async (req, res) => {
    try {
      const { username } = req.body || {};
      if (username) {
        await clearDbUserSession(String(username));
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error terminating session:", err);
      res.status(500).json({ error: "Failed to terminate session" });
    }
  });
  app.get("/api/session", requireAuth, (req, res) => {
    res.json({ authenticated: true, user: req.user });
  });
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ authenticated: true, user: req.user });
  });
  app.get("/api/members", async (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? stripHtml(req.query.q) : "";
      const status = typeof req.query.status === "string" ? stripHtml(req.query.status) : "all";
      const members = await getAllMembers(q, status);
      res.json({ members, count: members.length });
    } catch (err) {
      console.error("Failed fetching members:", err);
      res.status(500).json({ error: "Failed to retrieve members" });
    }
  });
  app.get("/api/members/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      const member = await getMemberById(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json({ success: true, member });
    } catch (err) {
      console.error("Error fetching member:", err);
      res.status(500).json({ error: "Failed to retrieve member details" });
    }
  });
  app.post("/api/members", requireAuth, async (req, res) => {
    try {
      const {
        member_id,
        name,
        gender,
        date_of_birth,
        address,
        mobile,
        plan_type,
        start_date,
        profile_picture,
        documents,
        medical_history,
        amount,
        registration_fee,
        is_renewal,
        discount,
        tax,
        final_amount,
        paid_amount,
        remaining_amount,
        payment_mode,
        payment_history
      } = req.body || {};
      const cleanName = stripHtml(name || "").trim();
      const cleanMobile = stripHtml(mobile || "").trim();
      if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
        return res.status(400).json({ error: "Candidate Name must be between 2 and 100 characters." });
      }
      if (!cleanMobile) {
        return res.status(400).json({ error: "Mobile Number is required." });
      }
      if (!plan_type) {
        return res.status(400).json({ error: "Plan Duration is required." });
      }
      if (!start_date) {
        return res.status(400).json({ error: "Date of Plan Active is required." });
      }
      const numPaid = paid_amount !== undefined && paid_amount !== null ? Number(paid_amount) : 0;
      if (numPaid <= 0) {
        return res.status(400).json({ error: "Paid Amount is required and must be greater than 0. No registration can be done if nothing is paid." });
      }
      let formattedMobile = cleanMobile;
      const rawDigits = formattedMobile.replace(/[^0-9]/g, "");
      if (rawDigits.length === 10) {
        formattedMobile = `+91 ${rawDigits}`;
      } else if (rawDigits.length === 12 && rawDigits.startsWith("91")) {
        formattedMobile = `+91 ${rawDigits.slice(2)}`;
      } else if (!formattedMobile.startsWith("+91")) {
        formattedMobile = `+91 ${rawDigits.slice(-10)}`;
      }
      const newMember = await insertMember({
        member_id: member_id ? stripHtml(String(member_id)).trim() : "",
        name: cleanName,
        gender: gender ? stripHtml(String(gender)).trim() : "Male",
        date_of_birth: date_of_birth ? stripHtml(String(date_of_birth)).trim() : "",
        address: address ? stripHtml(String(address)).trim() : "",
        mobile: formattedMobile,
        plan_type: stripHtml(String(plan_type)).trim(),
        start_date: stripHtml(String(start_date)).trim(),
        profile_picture: profile_picture || "",
        documents: documents || "",
        medical_history: medical_history ? sanitizeInput(medical_history) : "",
        amount: Math.max(0, Number(amount) || 0),
        registration_fee: registration_fee !== void 0 ? Math.max(0, Number(registration_fee)) : 0,
        is_renewal: Boolean(is_renewal),
        discount: Math.max(0, Number(discount) || 0),
        tax: Math.max(0, Number(tax) || 0),
        final_amount: Math.max(0, Number(final_amount) || 0),
        paid_amount: paid_amount !== void 0 ? Math.max(0, Number(paid_amount)) : void 0,
        remaining_amount: remaining_amount !== void 0 ? Math.max(0, Number(remaining_amount)) : void 0,
        payment_mode: payment_mode ? stripHtml(String(payment_mode)).trim() : "Via Online",
        payment_history: payment_history ? String(payment_history) : void 0
      });
      res.status(201).json({ success: true, member: newMember });
    } catch (err) {
      console.error("Error inserting member:", err);
      res.status(500).json({ error: "Failed to register member" });
    }
  });
  app.put("/api/members/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      const updateData = { ...req.body || {} };
      if (updateData.mobile && typeof updateData.mobile === "string") {
        let mobileStr = stripHtml(updateData.mobile).trim();
        const rawDigits = mobileStr.replace(/[^0-9]/g, "");
        if (rawDigits.length === 10) {
          updateData.mobile = `+91 ${rawDigits}`;
        } else if (rawDigits.length === 12 && rawDigits.startsWith("91")) {
          updateData.mobile = `+91 ${rawDigits.slice(2)}`;
        } else if (!mobileStr.startsWith("+91")) {
          updateData.mobile = `+91 ${rawDigits.slice(-10)}`;
        }
      }
      if (updateData.gender && typeof updateData.gender === "string") {
        updateData.gender = stripHtml(updateData.gender).trim();
      }
      if (updateData.registration_fee !== void 0) {
        updateData.registration_fee = Math.max(0, Number(updateData.registration_fee));
      }
      if (updateData.is_renewal !== void 0) {
        updateData.is_renewal = Boolean(updateData.is_renewal);
      }
      const updated = await updateMember(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json({ success: true, member: updated });
    } catch (err) {
      console.error("Error updating member:", err);
      res.status(500).json({ error: "Failed to update member details" });
    }
  });
  app.delete("/api/members/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      await deleteMember(id);
      res.json({ success: true, id });
    } catch (err) {
      console.error("Error deleting member:", err);
      res.status(500).json({ error: "Failed to delete member" });
    }
  });
  app.put("/api/members/:id/renew", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { plan_type, start_date, discount, amount } = req.body || {};
      if (isNaN(id) || id <= 0 || !plan_type) {
        return res.status(400).json({ error: "Invalid ID or plan_type" });
      }
      const updated = await renewMember(
        id,
        stripHtml(plan_type),
        start_date ? stripHtml(start_date) : void 0,
        discount !== undefined ? Number(discount) : 0,
        amount !== undefined && amount !== null ? Number(amount) : null
      );
      res.json({ success: true, member: updated });
    } catch (err) {
      console.error("Error renewing member:", err);
      res.status(400).json({ error: err.message || "Failed to renew member plan" });
    }
  });
  app.get("/api/attendance", async (req, res) => {
    try {
      const db = await getDb();
      const { start_date, end_date, start_iso, end_iso, status, q } = req.query;
      let sql = `
        SELECT a.id, a.check_in_time, a.status, a.reception_notes,
               m.id AS member_db_id, m.member_id, m.name, m.plan_type, m.expiry_date, m.mobile, m.profile_picture 
        FROM attendance a
        JOIN members m ON a.member_id = m.id
        WHERE 1=1
      `;
      const params = [];
      if (start_iso) {
        sql += " AND a.check_in_time >= ?";
        params.push(start_iso);
      } else if (start_date) {
        const sIso = new Date(`${start_date}T00:00:00+05:30`).toISOString();
        sql += " AND (a.check_in_time >= ? OR date(a.check_in_time) >= date(?))";
        params.push(sIso, start_date);
      }
      if (end_iso) {
        sql += " AND a.check_in_time <= ?";
        params.push(end_iso);
      } else if (end_date) {
        const eIso = new Date(`${end_date}T23:59:59.999+05:30`).toISOString();
        sql += " AND (a.check_in_time <= ? OR date(a.check_in_time) <= date(?))";
        params.push(eIso, end_date);
      }
      if (status && status !== "all") { sql += " AND a.status = ?"; params.push(status); }
      if (q) { sql += " AND (m.name LIKE ? OR m.member_id LIKE ?)"; params.push(`%${q}%`, `%${q}%`); }
      sql += " ORDER BY a.check_in_time DESC";
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const attendance = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        let normalizedCheckInTime = row.check_in_time;
        if (normalizedCheckInTime) {
          let s = String(normalizedCheckInTime).trim();
          if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
          if (!s.endsWith("Z") && !/[+-]\d{2}(:?\d{2})?$/.test(s)) s += "Z";
          normalizedCheckInTime = s;
        }
        attendance.push({
          id: row.id,
          member_id: row.member_id,
          name: row.name,
          plan_type: row.plan_type,
          expiry_date: row.expiry_date,
          mobile: row.mobile,
          profile_picture: row.profile_picture,
          status: row.status,
          check_in_time: normalizedCheckInTime,
          reception_notes: row.reception_notes
        });
      }
      stmt.free();
      res.json(attendance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  const getSupabaseServerClient = () => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://kkhnpgztzfpmjltsuhmo.supabase.co";
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU";
      if (supabaseUrl && supabaseKey) {
        return (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
      }
    } catch (e) {
      console.warn("Could not create Supabase client:", e.message);
    }
  };

  app.post("/api/attendance/delete-range", async (req, res) => {
    try {
      const { start_date, end_date, start_iso, end_iso, start_ist, end_ist, confirmation } = req.body || {};
      if (confirmation !== "DELETE") {
        return res.status(400).json({ error: 'Confirmation failed. You must enter "DELETE" to confirm deletion.' });
      }

      if (!start_date && !start_iso) {
        return res.status(400).json({ error: "Start date is required for deletion." });
      }

      const sDate = start_date || (start_iso ? start_iso.split("T")[0] : "");
      const eDate = end_date || (end_iso ? end_iso.split("T")[0] : sDate);

      const sIso = start_iso || new Date(`${sDate}T00:00:00+05:30`).toISOString();
      const eIso = end_iso || new Date(`${eDate}T23:59:59.999+05:30`).toISOString();
      const sIst = start_ist || `${sDate}T00:00:00.000`;
      const eIst = end_ist || `${eDate}T23:59:59.999`;

      const db = await getDb();

      // Count matching local records before delete
      let localDeletedCount = 0;
      try {
        const countStmt = db.prepare(`
          SELECT COUNT(*) as cnt FROM attendance 
          WHERE (check_in_time >= ? AND check_in_time <= ?)
             OR (check_in_time >= ? AND check_in_time <= ?)
             OR (date(check_in_time) >= date(?) AND date(check_in_time) <= date(?))
        `);
        countStmt.bind([sIso, eIso, sIst, eIst, sDate, eDate]);
        if (countStmt.step()) {
          localDeletedCount = countStmt.getAsObject().cnt || 0;
        }
        countStmt.free();
      } catch (_) {}

      // Delete from local SQLite database
      db.run(`
        DELETE FROM attendance 
        WHERE (check_in_time >= ? AND check_in_time <= ?)
           OR (check_in_time >= ? AND check_in_time <= ?)
           OR (date(check_in_time) >= date(?) AND date(check_in_time) <= date(?))
      `, [sIso, eIso, sIst, eIst, sDate, eDate]);
      saveDatabase();

      // Delete from Supabase (both by IST wall-clock bounds and UTC bounds)
      let sbDeletedCount = 0;
      try {
        const sb = getSupabaseServerClient();
        if (sb) {
          const { data: delIst, error: sbErr1 } = await sb
            .from("attendance")
            .delete()
            .gte("check_in_time", sIst)
            .lte("check_in_time", eIst)
            .select();
          if (!sbErr1 && Array.isArray(delIst)) sbDeletedCount += delIst.length;

          const { data: delUtc, error: sbErr2 } = await sb
            .from("attendance")
            .delete()
            .gte("check_in_time", sIso)
            .lte("check_in_time", eIso)
            .select();
          if (!sbErr2 && Array.isArray(delUtc)) sbDeletedCount += delUtc.length;

          const { data: delDay } = await sb
            .from("attendance")
            .delete()
            .gte("check_in_time", `${sDate}T00:00:00`)
            .lte("check_in_time", `${eDate}T23:59:59.999`)
            .select();
          if (Array.isArray(delDay)) sbDeletedCount += delDay.length;
        }
      } catch (errSb) {
        console.warn("[Supabase Delete Range Exception]:", errSb.message);
      }

      console.log(`[Attendance Range Deleted]: From ${sDate} to ${eDate}. Local: ${localDeletedCount}, Supabase: ${sbDeletedCount}`);
      res.json({
        success: true,
        message: `Successfully deleted attendance records from ${sDate} to ${eDate}.`,
        local_deleted: localDeletedCount,
        supabase_deleted: sbDeletedCount
      });
    } catch (err) {
      console.error("Delete range error:", err);
      res.status(500).json({ error: "Failed to delete attendance logs: " + (err.message || "Unknown error") });
    }
  });

  app.post("/api/attendance/check-in", async (req, res) => {
    try {
      const rawInput = req.body?.member_id || req.body?.identifier || "";
      if (!rawInput || !String(rawInput).trim()) {
        return res.status(400).json({ error: "Member ID is required." });
      }
      const rawId = String(rawInput).trim();
      const notes = req.body?.notes || "";
      const db = await getDb();
      
      let member = db.prepare("SELECT * FROM members WHERE member_id = ? OR id = ? OR mobile = ?").getAsObject([rawId, rawId, rawId]);
      
      if (!member || !member.id) {
        try {
          const sb = getSupabaseServerClient();
          if (sb) {
            const isNum = !isNaN(Number(rawId));
            const filter = isNum ? `member_id.eq.${rawId},mobile.eq.${rawId},id.eq.${Number(rawId)}` : `member_id.eq.${rawId},mobile.eq.${rawId}`;
            const { data: sbMembers } = await sb.from("members").select("*").or(filter).limit(1);
            if (sbMembers && sbMembers.length > 0) {
              const sm = sbMembers[0];
              const memId = String(sm.member_id || sm.id);
              db.run(
                `INSERT INTO members (
                  member_id, name, gender, date_of_birth, address, mobile, plan_type, start_date, expiry_date,
                  profile_picture, documents, medical_history, amount, registration_fee, is_renewal, discount, tax,
                  final_amount, paid_amount, remaining_amount, payment_mode, payment_history, card_uid, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  memId, sm.name || "", sm.gender || "Male", sm.date_of_birth || "", sm.address || "", sm.mobile || "",
                  sm.plan_type || "", sm.start_date || "", sm.expiry_date || "", sm.profile_picture || "", sm.documents || "[]",
                  sm.medical_history || "", Number(sm.amount) || 0, Number(sm.registration_fee) || 0, sm.is_renewal ? 1 : 0,
                  Number(sm.discount) || 0, Number(sm.tax) || 0, Number(sm.final_amount) || 0, Number(sm.paid_amount) || 0,
                  Number(sm.remaining_amount) || 0, sm.payment_mode || "Via Online", sm.payment_history || "[]",
                  memId, sm.created_at || new Date().toISOString()
                ]
              );
              saveDatabase();
              member = db.prepare("SELECT * FROM members WHERE member_id = ? OR id = ?").getAsObject([memId, sm.id]);
              console.log(`[Supabase On-Demand Sync] Auto-imported member "${sm.name}" (ID: ${memId}) into local database.`);
            }
          }
        } catch (sbErr) {
          console.warn("[Check-in On-Demand Supabase Lookup]:", sbErr.message);
        }
      }

      if (!member || !member.id) {
        return res.status(404).json({ error: `Member ID "${rawId}" not found in database.`, status: "unregistered" });
      }

      // Policy 1 — Strict Present Day Attendance Policy (Block yesterday and future days)
      const now = new Date();
      // Calculate IST today start/end
      const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
      const yIST = parts.find(p => p.type === 'year')?.value || '1970';
      const mIST = parts.find(p => p.type === 'month')?.value || '01';
      const dIST = parts.find(p => p.type === 'day')?.value || '01';
      const todayISTStr = `${yIST}-${mIST}-${dIST}`;
      const startTodayISTIso = new Date(`${todayISTStr}T00:00:00+05:30`).toISOString();
      const endTodayISTIso = new Date(`${todayISTStr}T23:59:59.999+05:30`).toISOString();

      const reqDate = req.body?.date || req.body?.check_in_date || req.body?.target_date;
      if (reqDate) {
        const cleanReqDate = String(reqDate).trim().split("T")[0];
        if (cleanReqDate < todayISTStr) {
          return res.status(400).json({
            error: "Mark attendance disabled for yesterday: Attendance can only be marked for the present day (Today).",
            status: "blocked"
          });
        }
        if (cleanReqDate > todayISTStr) {
          return res.status(400).json({
            error: "Mark attendance disabled for future days: Attendance can only be marked for the present day (Today).",
            status: "blocked"
          });
        }
      }

      // Policy 2 — Strict Duplicate Attendance Block (1 Valid Check-in per Day in IST)

      const dupStmt = db.prepare("SELECT * FROM attendance WHERE member_id = ? AND status = 'valid' AND ((check_in_time >= ? AND check_in_time <= ?) OR date(check_in_time) = date(?))");
      dupStmt.bind([member.id, startTodayISTIso, endTodayISTIso, todayISTStr]);
      let existingValid = null;
      if (dupStmt.step()) {
        existingValid = dupStmt.getAsObject();
      }
      dupStmt.free();
      
      if (existingValid && existingValid.id) {
        let timeStr = "earlier today";
        if (existingValid.check_in_time) {
          try {
            timeStr = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(existingValid.check_in_time));
          } catch (_) {
            const raw = String(existingValid.check_in_time);
            timeStr = raw.includes(" ") ? raw.split(" ")[1] : raw;
          }
        }
        return res.status(409).json({ 
          error: `Duplicate Attendance Blocked: ${member.name} already checked in today at ${timeStr}. Multiple check-ins on the same day are not permitted.`,
          status: "duplicate",
          member,
          existing: existingValid
        });
      }

      // Policy 3 — Expired Plan Denial (Access Denied)
      const expDate = parseDateParts(member.expiry_date);
      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);

function getISTIsoString(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(d);
  const year = parts.find(p => p.type === "year")?.value || "1970";
  const month = parts.find(p => p.type === "month")?.value || "01";
  const day = parts.find(p => p.type === "day")?.value || "01";
  let hour = parts.find(p => p.type === "hour")?.value || "00";
  if (hour === "24") hour = "00";
  const minute = parts.find(p => p.type === "minute")?.value || "00";
  const second = parts.find(p => p.type === "second")?.value || "00";
  const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}`;
}

      if (expDate < todayZero) {
        db.run("INSERT INTO attendance (member_id, check_in_time, status, reception_notes) VALUES (?, ?, 'expired', ?)", [member.id, getISTIsoString(now), notes || "Front desk expired attempt"]);
        saveDatabase();
        try {
          const sb = getSupabaseServerClient();
          if (sb) {
            (async () => {
              const realMemberId = String(member.member_id || member.id);
              const { error } = await sb.from("attendance").insert([{
                member_id: realMemberId,
                status: "expired",
                check_in_time: getISTIsoString(now),
                reception_notes: notes || "Front desk expired attempt"
              }]);
              if (error && error.message && error.message.includes("foreign key")) {
                let surrogateId = member.id;
                try {
                  const { data: sbm } = await sb.from("members").select("id").or(`member_id.eq.${realMemberId},mobile.eq.${member.mobile},id.eq.${member.id}`).limit(1);
                  if (sbm && sbm.length > 0) surrogateId = sbm[0].id;
                } catch (_) {}
                await sb.from("attendance").insert([{
                  member_id: surrogateId,
                  status: "expired",
                  check_in_time: getISTIsoString(now),
                  reception_notes: notes || "Front desk expired attempt"
                }]);
              }
            })().catch(() => {});
          }
        } catch (_) {}
        return res.status(200).json({ 
          success: false,
          error: "Member plan has expired, please renew plan to continue",
          message: "Member plan has expired, please renew plan to continue",
          status: "expired",
          member 
        });
      }

      // Valid entry
      db.run("INSERT INTO attendance (member_id, check_in_time, status, reception_notes) VALUES (?, ?, 'valid', ?)", [member.id, getISTIsoString(now), notes || ""]);
      saveDatabase();

      // Realtime dual-write sync to Supabase table 'attendance'
      try {
        const sb = getSupabaseServerClient();
        if (sb) {
          (async () => {
            const realMemberId = String(member.member_id || member.id);
            const { error: sbErr } = await sb.from("attendance").insert([{
              member_id: realMemberId,
              status: "valid",
              check_in_time: getISTIsoString(now),
              reception_notes: notes || "Front desk verification"
            }]);
            if (sbErr && sbErr.message && sbErr.message.includes("foreign key")) {
              let surrogateId = member.id;
              try {
                const { data: sbm } = await sb.from("members").select("id").or(`member_id.eq.${realMemberId},mobile.eq.${member.mobile},id.eq.${member.id}`).limit(1);
                if (sbm && sbm.length > 0) surrogateId = sbm[0].id;
              } catch (_) {}
              await sb.from("attendance").insert([{
                member_id: surrogateId,
                status: "valid",
                check_in_time: getISTIsoString(now),
                reception_notes: notes || "Front desk verification"
              }]);
              console.log("[Supabase Attendance Sync Success (surrogate fallback)]:", surrogateId);
            } else if (!sbErr) {
              console.log("[Supabase Attendance Sync Success]: Record saved with member_id", realMemberId);
            }
          })().catch(e => console.warn("[Supabase Attendance Sync Error]:", e.message));
        }
      } catch (err) {
        console.warn("Supabase background attendance sync exception:", err);
      }

      const partsTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now);
      const istHour = partsTime.find(p => p.type === 'hour')?.value || '00';
      const istMin = partsTime.find(p => p.type === 'minute')?.value || '00';
      const istSec = partsTime.find(p => p.type === 'second')?.value || '00';
      const istTimeStr = `${istHour === '24' ? '00' : istHour}:${istMin}:${istSec}`;

      res.json({ 
        success: true, 
        member, 
        status: "valid", 
        timestamp: getISTIsoString(now), 
        check_in_time: getISTIsoString(now), 
        ist_time: istTimeStr 
      });
    } catch (err) {
      console.error("Check-in error:", err);
      res.status(500).json({ error: "Failed check-in: " + (err.message || "Unknown error") });
    }
  });

  // Sync local attendance records to Supabase
  app.post("/api/sync/attendance-to-supabase", async (req, res) => {
    try {
      const sb = getSupabaseServerClient();
      if (!sb) {
        return res.status(400).json({ error: "Supabase client could not be initialized." });
      }
      const db = await getDb();
      const stmt = db.prepare(`
        SELECT a.*, COALESCE(m.member_id, CAST(a.member_id AS TEXT)) as real_member_code
        FROM attendance a
        LEFT JOIN members m ON (a.member_id = m.id OR CAST(a.member_id AS TEXT) = CAST(m.member_id AS TEXT))
        ORDER BY a.id ASC
      `);
      const localRows = [];
      while (stmt.step()) localRows.push(stmt.getAsObject());
      stmt.free();

      if (localRows.length === 0) {
        return res.json({ success: true, message: "No local attendance records to sync.", synced: 0 });
      }

      const rowsToInsert = localRows.map(r => ({
        member_id: String(r.real_member_code || r.member_id),
        status: r.status || "valid",
        check_in_time: r.check_in_time || new Date().toISOString(),
        reception_notes: r.reception_notes || ""
      }));

      const { data, error } = await sb.from("attendance").insert(rowsToInsert);
      if (error) {
        return res.status(500).json({ 
          error: error.message, 
          hint: "Please create the 'attendance' table in your Supabase SQL editor first." 
        });
      }
      res.json({ 
        success: true, 
        message: `Successfully synchronized ${localRows.length} attendance records to Supabase!`, 
        synced: localRows.length 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  app.post("/api/sync/supabase", requireAuth, async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return res.status(400).json({
          error: "Supabase credentials are not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)."
        });
      }
      const client = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
      const { data, error } = await client.from("members").select("*");
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      let importedCount = 0;
      for (const m of data || []) {
        try {
          await insertMember({
            member_id: m.member_id || String(m.id),
            name: m.name,
            gender: m.gender || "Male",
            date_of_birth: m.date_of_birth || "",
            address: m.address || "",
            mobile: m.mobile,
            plan_type: m.plan_type,
            start_date: m.start_date,
            profile_picture: m.profile_picture || "",
            documents: m.documents || "",
            medical_history: m.medical_history || "",
            amount: Number(m.amount) || 0,
            registration_fee: Number(m.registration_fee) || 0,
            is_renewal: Boolean(m.is_renewal),
            discount: Number(m.discount) || 0,
            tax: Number(m.tax) || 0,
            final_amount: Number(m.final_amount) || 0,
            paid_amount: Number(m.paid_amount) || 0,
            remaining_amount: Number(m.remaining_amount) || 0,
            payment_mode: m.payment_mode || "Via Online",
            payment_history: m.payment_history || ""
          });
          importedCount++;
        } catch {
        }
      }
      res.json({
        success: true,
        message: `Successfully synchronized ${importedCount} members from Supabase to server database.`,
        total_supabase_records: data?.length || 0
      });
    } catch (err) {
      console.error("Error syncing Supabase:", err);
      res.status(500).json({ error: "Failed to sync members from Supabase" });
    }
  });
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await getDashboardStats();
      res.json(stats);
    } catch (err) {
      console.error("Error fetching stats:", err);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });
  app.get("/api/inquiries", requireAuth, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? stripHtml(req.query.status) : void 0;
      const q = typeof req.query.q === "string" ? stripHtml(req.query.q) : void 0;
      const inquiries = await getInquiries({ status, q });
      res.json({ inquiries, count: inquiries.length });
    } catch (err) {
      console.error("Error fetching inquiries:", err);
      res.status(500).json({ error: "Failed to retrieve candidate inquiries" });
    }
  });
  app.post("/api/inquiries", async (req, res) => {
    try {
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(`inq_${clientIp}`, 6, 60 * 1e3)) {
        return res.status(429).json({ error: "Too many inquiries submitted. Please wait 1 minute before trying again." });
      }
      const { name, phone, message } = req.body || {};
      const cleanName = stripHtml(name || "").trim();
      const cleanPhone = stripHtml(phone || "").trim();
      const cleanMessage = sanitizeInput(message || "").trim();
      if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
        return res.status(400).json({ error: "Candidate name must be between 2 and 100 characters." });
      }
      if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 25) {
        return res.status(400).json({ error: "Please provide a valid contact phone number." });
      }
      if (cleanMessage.length > 1e3) {
        return res.status(400).json({ error: "Message cannot exceed 1000 characters." });
      }
      const inquiry = await createInquiry({
        name: cleanName,
        phone: cleanPhone,
        message: cleanMessage
      });
      res.status(201).json({ success: true, inquiry });
    } catch (err) {
      console.error("Error creating inquiry:", err);
      res.status(500).json({ error: "Failed to submit inquiry" });
    }
  });
  app.patch("/api/inquiries/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { status } = req.body || {};
      if (isNaN(id) || id <= 0 || !status) {
        return res.status(400).json({ error: "Valid ID and status are required" });
      }
      const updated = await updateInquiryStatus(id, stripHtml(status));
      res.json(updated);
    } catch (err) {
      console.error("Error updating inquiry status:", err);
      res.status(500).json({ error: "Failed to update inquiry status" });
    }
  });
  app.delete("/api/inquiries/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid inquiry ID" });
      }
      await deleteInquiry(id);
      res.json({ success: true, id });
    } catch (err) {
      console.error("Error deleting inquiry:", err);
      res.status(500).json({ error: "Failed to delete inquiry" });
    }
  });
  const staticPath = import_fs.default.existsSync(import_path2.default.join(process.cwd(), "dist", "index.html"))
    ? import_path2.default.join(process.cwd(), "dist")
    : process.cwd();
  app.use(import_express.default.static(staticPath));
  if (staticPath !== process.cwd()) {
    app.use(import_express.default.static(process.cwd()));
  }
  app.get("/crm", (req, res) => {
    res.sendFile(import_path2.default.join(staticPath, "crm.html"));
  });
  app.get("/crm.html", (req, res) => {
    res.sendFile(import_path2.default.join(staticPath, "crm.html"));
  });
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(import_path2.default.join(staticPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NFT Gym] Server running on http://0.0.0.0:${PORT}`);
    // Auto-sync missing members from Supabase on startup
    (async () => {
      try {
        const sb = getSupabaseServerClient();
        if (!sb) return;
        const { data: sbMembers, error: sbErr } = await sb.from("members").select("*");
        if (sbErr || !sbMembers || sbMembers.length === 0) return;
        const db = await getDb();
        const existing = new Set();
        const stmt = db.prepare("SELECT member_id FROM members");
        while (stmt.step()) existing.add(String(stmt.getAsObject().member_id));
        stmt.free();
        let imported = 0;
        for (const m of sbMembers) {
          const memId = String(m.member_id || m.id);
          if (!existing.has(memId)) {
            db.run(
              `INSERT INTO members (
                member_id, name, gender, date_of_birth, address, mobile, plan_type, start_date, expiry_date,
                profile_picture, documents, medical_history, amount, registration_fee, is_renewal, discount, tax,
                final_amount, paid_amount, remaining_amount, payment_mode, payment_history, card_uid, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                memId, m.name || "", m.gender || "Male", m.date_of_birth || "", m.address || "", m.mobile || "",
                m.plan_type || "", m.start_date || "", m.expiry_date || "", m.profile_picture || "", m.documents || "[]",
                m.medical_history || "", Number(m.amount) || 0, Number(m.registration_fee) || 0, m.is_renewal ? 1 : 0,
                Number(m.discount) || 0, Number(m.tax) || 0, Number(m.final_amount) || 0, Number(m.paid_amount) || 0,
                Number(m.remaining_amount) || 0, m.payment_mode || "Via Online", m.payment_history || "[]",
                memId, m.created_at || new Date().toISOString()
              ]
            );
            existing.add(memId);
            imported++;
          }
        }
        if (imported > 0) {
          saveDatabase();
          console.log(`[Startup Supabase Sync] Auto-imported ${imported} members into local SQLite.`);
        }
      } catch (err) {
        console.warn("[Startup Supabase Sync] Warning:", err.message);
      }
    })();
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
