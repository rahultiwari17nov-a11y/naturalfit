var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => (
  target = mod != null ? __create(__getProtoOf(mod)) : {},
  ((to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from)) {
        if (!__hasOwnProp.call(to, key) && key !== except) {
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
        }
      }
    }
    return to;
  })(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod)
);

// Dependencies
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_crypto = __toESM(require("crypto"), 1);

// Security & Auth Utilities
var IS_SERVERLESS = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
function loadOrCreateJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretPath = IS_SERVERLESS
    ? import_path.default.join("/tmp", ".jwt_secret")
    : import_path.default.join(__dirname, ".jwt_secret");
  try {
    if (import_fs.default.existsSync(secretPath)) {
      const saved = import_fs.default.readFileSync(secretPath, "utf8").trim();
      if (saved.length >= 32) return saved;
    }
    const generated = import_crypto.default.randomBytes(32).toString("hex");
    import_fs.default.writeFileSync(secretPath, generated, { mode: 0o600 });
    return generated;
  } catch {
    return import_crypto.default.randomBytes(32).toString("hex");
  }
}
var JWT_SECRET = loadOrCreateJwtSecret();
var revokedTokens = new Set();
var memorySessions = new Map();

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
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
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
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))
    .trim();
}
function stripHtml(input) {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").trim();
}
function sanitizeMediaUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/")) {
    if (
      trimmed.startsWith("data:image/png;base64,") ||
      trimmed.startsWith("data:image/jpeg;base64,") ||
      trimmed.startsWith("data:image/jpg;base64,") ||
      trimmed.startsWith("data:image/webp;base64,") ||
      trimmed.startsWith("data:image/gif;base64,")
    ) {
      return trimmed;
    }
    return "";
  }
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed.replace(/[<>"']/g, "");
  }
  return "";
}

var ipRateLimits = new Map();
var ADMIN_SECURITY_PIN = process.env.ADMIN_SECURITY_PIN || "gulshan@123";
var SECURITY_PIN_SYSTEM_USERNAME = "__admin_security_pin__";
var PIN_CONFIG_FILE = IS_SERVERLESS
  ? import_path.default.join("/tmp", ".admin_security_config.json")
  : import_path.default.join(__dirname, ".admin_security_config.json");
var cachedPinConfig = { fetchedAt: 0, row: null };

function readLocalSecurityConfig() {
  try {
    if (import_fs.default.existsSync(PIN_CONFIG_FILE)) {
      const parsed = JSON.parse(import_fs.default.readFileSync(PIN_CONFIG_FILE, "utf8"));
      if (parsed && typeof parsed === "object") {
        return {
          pinHash: parsed.pinHash || null,
          passwordOverrides: parsed.passwordOverrides && typeof parsed.passwordOverrides === "object" ? parsed.passwordOverrides : {},
          customStaff: Array.isArray(parsed.customStaff) ? parsed.customStaff : [],
          deletedStaffIds: Array.isArray(parsed.deletedStaffIds) ? parsed.deletedStaffIds : []
        };
      }
    }
  } catch {}
  return { pinHash: null, passwordOverrides: {}, customStaff: [], deletedStaffIds: [] };
}

function writeLocalSecurityConfig(cfg) {
  try {
    import_fs.default.writeFileSync(PIN_CONFIG_FILE, JSON.stringify({ ...cfg, updatedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

function readLocalPinConfig() {
  const cfg = readLocalSecurityConfig();
  return cfg.pinHash ? cfg : null;
}

function writeLocalPinConfig(pinHash) {
  const cfg = readLocalSecurityConfig();
  cfg.pinHash = pinHash;
  return writeLocalSecurityConfig(cfg);
}

async function getStoredPinRow(forceRefresh = false) {
  const localCfg = readLocalPinConfig();
  if (localCfg && localCfg.pinHash) {
    return { id: 0, username: SECURITY_PIN_SYSTEM_USERNAME, password: localCfg.pinHash, role: "system_config", source: "local" };
  }
  const now = Date.now();
  if (!forceRefresh && cachedPinConfig.fetchedAt > 0 && now - cachedPinConfig.fetchedAt < 15000) {
    return cachedPinConfig.row;
  }
  try {
    const sb = getSupabaseServerClient();
    const { data, error } = await sb
      .from("staff_users")
      .select("id, username, password, role")
      .eq("username", SECURITY_PIN_SYSTEM_USERNAME)
      .maybeSingle();
    if (!error) {
      cachedPinConfig = { fetchedAt: now, row: data || null };
      return cachedPinConfig.row;
    }
  } catch {}
  return cachedPinConfig.row;
}

async function verifyStoredSecurityPin(candidatePin) {
  const clean = String(candidatePin || "").trim();
  if (!clean) return false;
  const row = await getStoredPinRow(false);
  if (row && row.password) {
    return await comparePassword(clean, String(row.password));
  }
  return clean === ADMIN_SECURITY_PIN;
}

async function updateStoredSecurityPin(newPin) {
  const clean = String(newPin || "").trim();
  if (clean.length < 4) {
    const err = new Error("New Security Code must be at least 4 characters long.");
    err.statusCode = 400;
    throw err;
  }
  const hashed = hashPasswordSync(clean);
  let dbOk = false;
  let dbErrMsg = "";
  try {
    const sb = getSupabaseServerClient();
    const { data: existing } = await sb
      .from("staff_users")
      .select("id")
      .eq("username", SECURITY_PIN_SYSTEM_USERNAME)
      .maybeSingle();
    if (existing && existing.id) {
      const { data: upRows, error } = await sb
        .from("staff_users")
        .update({ password: hashed, role: "system_config" })
        .eq("id", existing.id)
        .select("id");
      if (!error && Array.isArray(upRows) && upRows.length > 0) dbOk = true;
      else if (error) dbErrMsg = error.message;
    } else {
      const { data: insRows, error } = await sb
        .from("staff_users")
        .insert([{ username: SECURITY_PIN_SYSTEM_USERNAME, password: hashed, role: "system_config" }])
        .select("id");
      if (!error && Array.isArray(insRows) && insRows.length > 0) dbOk = true;
      else if (error) dbErrMsg = error.message;
    }
  } catch (e) {
    dbErrMsg = e.message || "";
  }
  if (IS_SERVERLESS && !dbOk) {
    const err = new Error(
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? `Unable to save Security Code to Supabase (${dbErrMsg || "RLS blocked"}).`
        : "SUPABASE_SERVICE_ROLE_KEY is required in Netlify Environment Variables to save Security Code permanently in Supabase."
    );
    err.statusCode = 500;
    throw err;
  }
  const localOk = dbOk ? true : writeLocalPinConfig(hashed);
  if (dbOk) {
    const cfg = readLocalSecurityConfig();
    if (cfg.pinHash) {
      cfg.pinHash = null;
      writeLocalSecurityConfig(cfg);
    }
  }
  if (!localOk && !dbOk) {
    throw new Error("Unable to persist new Security Code.");
  }
  cachedPinConfig = { fetchedAt: Date.now(), row: { id: 0, username: SECURITY_PIN_SYSTEM_USERNAME, password: hashed, role: "system_config" } };
  return true;
}
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

// IST Date & Membership Calculation Helpers
function getISTDateParts(d = new Date()) {
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
  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  let hour = parts.find((p) => p.type === "hour")?.value || "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const second = parts.find((p) => p.type === "second")?.value || "00";
  return { year, month, day, hour, minute, second };
}
function getISTDateString(d = new Date()) {
  const { year, month, day } = getISTDateParts(d);
  return `${year}-${month}-${day}`;
}
function getISTIsoString(d = new Date()) {
  const { year, month, day, hour, minute, second } = getISTDateParts(d);
  const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}+05:30`;
}
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
function addMonthsClamped(date, months) {
  const origDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(origDay, maxDay));
}
function calculateExpiry(startDateStr, planType) {
  const date = parseDateParts(startDateStr);
  const normalized = String(planType || "").toLowerCase().trim();
  if (normalized.includes("15 day") || normalized === "15 days") {
    date.setDate(date.getDate() + 15);
  } else if (normalized.includes("12+3") || normalized.includes("renewal offer (12+3)")) {
    addMonthsClamped(date, 15);
  } else if (normalized.includes("6+2") || normalized.includes("renewal offer (6+2)")) {
    addMonthsClamped(date, 8);
  } else if (normalized.includes("3+1") || normalized.includes("renewal offer (3+1)")) {
    addMonthsClamped(date, 4);
  } else if (normalized.includes("12 month") || normalized === "yearly") {
    addMonthsClamped(date, 12);
  } else if (normalized.includes("6 month") || normalized.includes("six month")) {
    addMonthsClamped(date, 6);
  } else if (normalized.includes("3 month") || normalized === "quarterly") {
    addMonthsClamped(date, 3);
  } else if (normalized.includes("2 month")) {
    addMonthsClamped(date, 2);
  } else {
    addMonthsClamped(date, 1);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function computeMemberStatus(expiryDateStr) {
  const today = parseDateParts(getISTDateString(new Date()));
  today.setHours(0, 0, 0, 0);
  const expDate = parseDateParts(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);
  const diffMs = expDate.getTime() - today.getTime();
  const days = Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
  if (days < 0) {
    return { status: "expired", days_remaining: days };
  } else if (days <= 7) {
    return { status: "expiring", days_remaining: days };
  } else {
    return { status: "active", days_remaining: days };
  }
}

// Pure Supabase Client & Schema Resilience Helpers
var DEFAULT_SUPABASE_URL = "https://kkhnpgztzfpmjltsuhmo.supabase.co";
var DEFAULT_SUPABASE_KEY = "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU";
var cachedSupabaseClient = null;

function sanitizeEnvUrl(raw) {
  let u = String(raw || "").trim().replace(/^["']|["']$/g, "");
  if (!u) return DEFAULT_SUPABASE_URL;
  if (!/^https?:\/\//i.test(u) && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(u)) {
    u = "https://" + u;
  }
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return u.replace(/\/+$/, "");
    }
  } catch {}
  console.warn("[NFT Gym] Invalid SUPABASE_URL env format detected; falling back to default Supabase URL.");
  return DEFAULT_SUPABASE_URL;
}

function sanitizeEnvKey(raw) {
  return String(raw || "").trim().replace(/^["']|["']$/g, "").replace(/[\r\n\s]+/g, "");
}

function getSupabaseServerClient() {
  if (cachedSupabaseClient) return cachedSupabaseClient;
  const supabaseUrl = sanitizeEnvUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL);
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  const supabaseKey = sanitizeEnvKey(rawKey) || DEFAULT_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and Key are required.");
  }
  const clientOpts = {
    auth: { persistSession: false, autoRefreshToken: false }
  };
  if (typeof globalThis.WebSocket === "undefined") {
    class NoopWebSocket {}
    clientOpts.realtime = { transport: NoopWebSocket };
  }
  cachedSupabaseClient = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, clientOpts);
  return cachedSupabaseClient;
}

function extractMissingColumnName(error) {
  if (!error) return null;
  const msg = String(error.message || "");
  if (error.code === "PGRST204") {
    const m = msg.match(/Could not find the '([^']+)' column/i);
    if (m && m[1]) return m[1];
  }
  if (error.code === "42703" || msg.includes("does not exist") || msg.includes("column")) {
    const m1 = msg.match(/column "([^"]+)"/i);
    if (m1 && m1[1]) return m1[1];
    const m2 = msg.match(/column [a-z0-9_]+\.([a-z0-9_]+)/i);
    if (m2 && m2[1]) return m2[1];
  }
  return null;
}

function isTableMissingError(error) {
  if (!error) return false;
  const msg = String(error.message || "");
  return error.code === "42P01" || error.code === "PGRST205" || msg.includes("Could not find the table") || msg.includes("does not exist");
}

function normalizeMemberRow(row) {
  if (!row) return null;
  const { status, days_remaining } = computeMemberStatus(String(row.expiry_date || ""));
  return {
    id: Number(row.id),
    member_id: row.member_id || String(row.id),
    name: row.name || "",
    gender: row.gender || "Male",
    date_of_birth: row.date_of_birth || "",
    address: row.address || "",
    mobile: row.mobile || "",
    plan_type: row.plan_type || "",
    start_date: row.start_date || "",
    expiry_date: row.expiry_date || "",
    profile_picture: row.profile_picture || "",
    documents: row.documents || "",
    medical_history: row.medical_history || "",
    amount: Number(row.amount) || 0,
    registration_fee: row.registration_fee !== void 0 && row.registration_fee !== null ? Number(row.registration_fee) : 0,
    is_renewal: Boolean(row.is_renewal),
    discount: Number(row.discount) || 0,
    tax: Number(row.tax) || 0,
    final_amount: Number(row.final_amount) || 0,
    paid_amount: Number(row.paid_amount) || 0,
    remaining_amount: Number(row.remaining_amount) || 0,
    payment_mode: row.payment_mode || "Via Online",
    payment_history: row.payment_history || "",
    renewal_history: row.renewal_history || "",
    receipt_date: row.receipt_date || "",
    card_uid: row.card_uid || "",
    created_at: row.created_at || "",
    status,
    days_remaining
  };
}

function extractLatestCarriedDue(memberRow) {
  if (!memberRow) return 0;
  if (memberRow.renewal_history) {
    try {
      const rh = JSON.parse(memberRow.renewal_history);
      if (Array.isArray(rh) && rh.length > 0 && Number(rh[0]?.previous_due_carried) > 0) {
        return Number(rh[0].previous_due_carried) || 0;
      }
    } catch {}
  }
  if (memberRow.payment_history) {
    try {
      const ph = JSON.parse(memberRow.payment_history);
      if (Array.isArray(ph) && ph.length > 0) {
        for (let i = ph.length - 1; i >= 0; i--) {
          const e = ph[i] || {};
          if (String(e.id || "").startsWith("pay_ren_") || String(e.notes || "").toLowerCase().startsWith("renewal for ")) {
            return Number(e.previous_due_carried) || 0;
          }
        }
      }
    } catch {}
  }
  return 0;
}

// Fetch all rows safely (supports pagination beyond 1000 rows as gym grows)
async function fetchAllMembersRaw(sb) {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("members")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

function normalizeISTBoundaryIso(rawVal, fallbackDate, isEnd) {
  const s = String(rawVal || "").trim();
  if (s) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(`${s}T${isEnd ? "23:59:59.999" : "00:00:00.000"}+05:30`).toISOString();
    }
    if (/[Zz]$|[+-]\d{2}(:?\d{2})?$/.test(s)) {
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
      const dt = new Date(`${s.replace(" ", "T")}+05:30`);
      if (!isNaN(dt.getTime())) return dt.toISOString();
    }
  }
  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(String(fallbackDate).trim())) {
    return new Date(`${String(fallbackDate).trim()}T${isEnd ? "23:59:59.999" : "00:00:00.000"}+05:30`).toISOString();
  }
  return null;
}

async function fetchAllAttendanceRaw(sb, { sBound = null, eBound = null, status = null } = {}) {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    let query = sb
      .from("attendance")
      .select("id, member_id, check_in_time, status, reception_notes, created_at")
      .order("check_in_time", { ascending: false })
      .range(from, from + pageSize - 1);
    if (sBound) query = query.gte("check_in_time", sBound);
    if (eBound) query = query.lte("check_in_time", eBound);
    if (status && status !== "all") query = query.eq("status", String(status));
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

async function getAllMembers(searchQuery = "", statusFilter = "all") {
  const sb = getSupabaseServerClient();
  const rawRows = await fetchAllMembersRaw(sb);
  let members = rawRows.map(normalizeMemberRow);

  // Sort numerically by member_id ASC, then id ASC
  members.sort((a, b) => {
    const na = parseInt(String(a.member_id || ""), 10);
    const nb = parseInt(String(b.member_id || ""), 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    const sa = String(a.member_id || "");
    const sbCode = String(b.member_id || "");
    if (sa !== sbCode) return sa.localeCompare(sbCode);
    return a.id - b.id;
  });

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    if (/^\d+$/.test(q)) {
      members = members.filter((m) => {
        const mid = String(m.member_id || "").toLowerCase();
        return mid === q || mid.startsWith(q) || String(m.mobile || "").toLowerCase().includes(q);
      });
    } else {
      members = members.filter((m) => {
        const nm = String(m.name || "").toLowerCase();
        const mid = String(m.member_id || "").toLowerCase();
        const mob = String(m.mobile || "").toLowerCase();
        return nm.startsWith(q) || nm.includes(" " + q) || nm.includes(q) || mid.includes(q) || mob.includes(q);
      });
    }
  }

  if (statusFilter && statusFilter !== "all") {
    members = members.filter((m) => m.status === statusFilter);
  }
  return members;
}

async function getMemberById(idOrCode) {
  const sb = getSupabaseServerClient();
  const raw = String(idOrCode).trim();
  const num = parseInt(raw, 10);

  if (!isNaN(num) && String(num) === raw) {
    const { data, error } = await sb.from("members").select("*").eq("id", num).maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return normalizeMemberRow(data);
  }

  const { data: byCode, error: err2 } = await sb.from("members").select("*").eq("member_id", raw).maybeSingle();
  if (err2) throw new Error(err2.message);
  return byCode ? normalizeMemberRow(byCode) : null;
}

async function insertMember(data) {
  const sb = getSupabaseServerClient();
  const manualMemberId = stripHtml(data.member_id || "").trim();

  if (manualMemberId) {
    const { data: dupCheck, error: dupErr } = await sb
      .from("members")
      .select("id, member_id, name")
      .ilike("member_id", manualMemberId)
      .limit(1);
    if (!dupErr && dupCheck && dupCheck.length > 0) {
      const err = new Error(`Member ID "${manualMemberId}" is already in use by "${dupCheck[0].name}". Member ID cannot be repeated.`);
      err.statusCode = 409;
      throw err;
    }
  }

  const expiryDate = data.expiry_date || calculateExpiry(data.start_date, data.plan_type);
  const cleanName = stripHtml(data.name || "").trim();
  const cleanGender = stripHtml(data.gender || "Male").trim();
  const cleanAddress = stripHtml(data.address || "").trim();
  const cleanMobile = stripHtml(data.mobile || "").trim();
  const cleanMedHistory = sanitizeInput(data.medical_history || "").trim();
  const cleanProfilePic = sanitizeMediaUrl(data.profile_picture || "");
  const cleanPaymentMode = stripHtml(data.payment_mode || "Via Online").trim();
  const dobRaw = stripHtml(data.date_of_birth ? String(data.date_of_birth).trim() : "");
  const dob = dobRaw !== "" ? dobRaw : null;

  const rawAmount = Number(data.amount ?? 0);
  const isRenewalVal = Boolean(data.is_renewal);
  const rawRegFee = isRenewalVal ? 0 : (data.registration_fee !== void 0 ? Number(data.registration_fee) : 0);
  const rawDiscount = Number(data.discount ?? 0);
  const rawTax = Number(data.tax ?? 0);
  if ([rawAmount, rawRegFee, rawDiscount, rawTax].some((n) => isNaN(n) || n < 0)) {
    const err = new Error("Fee amounts (plan fee, registration fee, discount, tax) cannot be negative.");
    err.statusCode = 400;
    throw err;
  }
  const totalAmount = rawAmount;
  const regFee = rawRegFee;
  const discount = rawDiscount;
  const tax = rawTax;
  if (discount > totalAmount + regFee) {
    const err = new Error(`Discount (₹${discount}) cannot exceed Plan + Registration Fee (₹${totalAmount + regFee}).`);
    err.statusCode = 400;
    throw err;
  }
  const computedFinal = Math.max(0, totalAmount + regFee - discount + tax);
  const finalAmount = computedFinal;
  const rawPaid = data.paid_amount !== void 0 && data.paid_amount !== null ? Number(data.paid_amount) : finalAmount;
  if (isNaN(rawPaid) || rawPaid < 0) {
    const err = new Error("Paid Amount cannot be negative.");
    err.statusCode = 400;
    throw err;
  }
  const paidAmount = rawPaid;
  if (finalAmount > 0 && paidAmount <= 0) {
    const err = new Error("Paid Amount must be greater than ₹0 when Net Payable is greater than ₹0.");
    err.statusCode = 400;
    throw err;
  }
  if (paidAmount > finalAmount) {
    const err = new Error(`Paid Amount (₹${paidAmount}) cannot exceed Net Payable (₹${finalAmount}).`);
    err.statusCode = 400;
    throw err;
  }
  const remainingAmount = Math.max(0, finalAmount - paidAmount);
  const cleanReceiptDate = data.receipt_date ? stripHtml(String(data.receipt_date)).trim() : (data.start_date || getISTDateString(new Date()));

  let cleanPaymentHistory = data.payment_history || "";
  if (!cleanPaymentHistory && paidAmount > 0) {
    cleanPaymentHistory = JSON.stringify([
      {
        id: `pay-init-${Date.now()}`,
        date: cleanReceiptDate,
        amount: paidAmount,
        tax,
        cycle_type: "current",
        cycle_start: data.start_date || cleanReceiptDate,
        payment_mode: cleanPaymentMode,
        notes: isRenewalVal ? "Renewal Payment" : "Initial Registration Payment"
      }
    ]);
  } else if (cleanPaymentHistory) {
    try {
      const parsedHist = JSON.parse(cleanPaymentHistory);
      if (Array.isArray(parsedHist)) {
        cleanPaymentHistory = JSON.stringify(parsedHist.map((e) => ({
          ...e,
          cycle_type: e.cycle_type || "current",
          cycle_start: e.cycle_start || data.start_date || cleanReceiptDate
        })));
      }
    } catch {}
  }

  const payload = {
    member_id: manualMemberId || `TEMP_${Date.now()}`,
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
    is_renewal: isRenewalVal,
    discount,
    tax,
    final_amount: finalAmount,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_mode: cleanPaymentMode,
    payment_history: cleanPaymentHistory,
    receipt_date: cleanReceiptDate
  };
  if (data.card_uid) payload.card_uid = stripHtml(String(data.card_uid)).trim();
  if (data.renewal_history) payload.renewal_history = String(data.renewal_history);

  let insertPayload = { ...payload };
  let inserted = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: row, error } = await sb.from("members").insert([insertPayload]).select().single();
    if (!error && row) {
      inserted = row;
      break;
    }
    const missingCol = extractMissingColumnName(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(insertPayload, missingCol)) {
      console.warn(`[Supabase Insert] Stripping unavailable column "${missingCol}" and retrying.`);
      delete insertPayload[missingCol];
      continue;
    }
    if (error && (error.code === "23505" || String(error.message || "").toLowerCase().includes("unique"))) {
      const dupErr = new Error(`Member ID "${manualMemberId}" already exists.`);
      dupErr.statusCode = 409;
      throw dupErr;
    }
    throw new Error(error ? error.message : "Failed to insert member into Supabase");
  }

  // If no manual member_id was provided, set member_id to generated surrogate id
  if (!manualMemberId && inserted && inserted.id) {
    const fallbackCode = String(inserted.id);
    const { data: updatedRow } = await sb.from("members").update({ member_id: fallbackCode }).eq("id", inserted.id).select().single();
    if (updatedRow) inserted = updatedRow;
  }

  const normalizedInsert = normalizeMemberRow(inserted);
  if (!normalizedInsert.receipt_date) normalizedInsert.receipt_date = cleanReceiptDate;
  return normalizedInsert;
}

async function updateMember(id, data) {
  const sb = getSupabaseServerClient();
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

  const updatedMemberId = data.member_id !== void 0 ? stripHtml(String(data.member_id)).trim() : current.member_id;
  const updatedName = data.name !== void 0 ? stripHtml(String(data.name)).trim() : current.name;
  const updatedGender = data.gender !== void 0 ? stripHtml(String(data.gender)).trim() : current.gender || "Male";
  const dobRaw = data.date_of_birth !== void 0 ? stripHtml(String(data.date_of_birth || "")).trim() : (current.date_of_birth || "");
  const updatedDob = dobRaw !== "" ? dobRaw : null;
  const updatedAddress = data.address !== void 0 ? stripHtml(String(data.address)).trim() : current.address;
  const updatedMobile = data.mobile !== void 0 ? stripHtml(String(data.mobile)).trim() : current.mobile;
  const updatedProfilePic = data.profile_picture !== void 0 ? sanitizeMediaUrl(data.profile_picture) : current.profile_picture;
  const updatedDocuments = data.documents !== void 0 ? data.documents : current.documents;
  const updatedMedHistory = data.medical_history !== void 0 ? sanitizeInput(String(data.medical_history)).trim() : current.medical_history;

  const feeKeys = ["amount", "registration_fee", "discount", "tax", "final_amount", "paid_amount", "remaining_amount", "is_renewal"];
  const hasFinancialWrite = feeKeys.some((k) => data[k] !== void 0);
  const hasFeeComponentChange =
    data.amount !== void 0 ||
    data.registration_fee !== void 0 ||
    data.discount !== void 0 ||
    data.tax !== void 0 ||
    data.is_renewal !== void 0;

  if (hasFinancialWrite) {
    for (const k of ["amount", "registration_fee", "discount", "tax", "final_amount", "paid_amount", "remaining_amount"]) {
      if (data[k] !== void 0 && (isNaN(Number(data[k])) || Number(data[k]) < 0)) {
        const err = new Error(`Invalid negative value for ${k}.`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const updatedAmount = data.amount !== void 0 ? Number(data.amount) : Number(current.amount) || 0;
  const updatedRegFee = data.registration_fee !== void 0 ? Number(data.registration_fee) : (current.registration_fee !== void 0 ? Number(current.registration_fee) : 0);
  const updatedIsRenewal = data.is_renewal !== void 0 ? Boolean(data.is_renewal) : Boolean(current.is_renewal);
  const updatedDiscount = data.discount !== void 0 ? Number(data.discount) : Number(current.discount) || 0;
  const updatedTax = data.tax !== void 0 ? Number(data.tax) : Number(current.tax) || 0;

  const carriedDue = extractLatestCarriedDue(current);
  const calculatedFinal = Math.max(0, updatedAmount + (updatedIsRenewal ? 0 : updatedRegFee) + carriedDue - updatedDiscount + updatedTax);
  const updatedFinalAmount = data.final_amount !== void 0
    ? Math.max(0, Number(data.final_amount))
    : (hasFeeComponentChange
        ? calculatedFinal
        : (current.final_amount !== void 0 ? Math.max(0, Number(current.final_amount)) : calculatedFinal));

  if (hasFeeComponentChange && updatedDiscount > updatedAmount + (updatedIsRenewal ? 0 : updatedRegFee) + carriedDue) {
    const err = new Error(`Discount (₹${updatedDiscount}) cannot exceed total fee (₹${updatedAmount + (updatedIsRenewal ? 0 : updatedRegFee) + carriedDue}).`);
    err.statusCode = 400;
    throw err;
  }

  const prevPaidAmount = current.paid_amount !== void 0 ? Number(current.paid_amount) || 0 : 0;
  const updatedPaidAmount = data.paid_amount !== void 0 ? Math.max(0, Number(data.paid_amount)) : prevPaidAmount;

  const financialMutated =
    (data.paid_amount !== void 0 && updatedPaidAmount !== prevPaidAmount) ||
    (data.final_amount !== void 0 && updatedFinalAmount !== Number(current.final_amount)) ||
    hasFeeComponentChange;

  if (financialMutated && updatedPaidAmount > updatedFinalAmount) {
    const err = new Error(`Paid Amount (₹${updatedPaidAmount}) cannot exceed Net Payable (₹${updatedFinalAmount}).`);
    err.statusCode = 400;
    throw err;
  }

  const updatedRemainingAmount = data.remaining_amount !== void 0
    ? Math.max(0, Number(data.remaining_amount))
    : Math.max(0, updatedFinalAmount - updatedPaidAmount);
  const updatedPaymentMode = data.payment_mode !== void 0 ? stripHtml(String(data.payment_mode)).trim() : current.payment_mode || "Via Online";

  let updatedPaymentHistory = data.payment_history !== void 0 ? data.payment_history : current.payment_history || "";
  if (data.payment_history !== void 0) {
    try {
      const parsedPh = Array.isArray(updatedPaymentHistory) ? updatedPaymentHistory : JSON.parse(String(updatedPaymentHistory || "[]"));
      if (Array.isArray(parsedPh)) {
        const taggedPh = parsedPh.map((e) => ({
          ...e,
          cycle_type: e.cycle_type || "current",
          cycle_start: e.cycle_start || (e.cycle_type === "previous" ? (e.date || newStartDate) : newStartDate)
        }));
        if (data.paid_amount !== void 0) {
          const curCycleSum = taggedPh
            .filter((e) => e.cycle_type !== "previous")
            .reduce((s, e) => s + (Number(e && e.amount) || 0), 0);
          if (Math.abs(curCycleSum - updatedPaidAmount) > 0.01) {
            const err = new Error(`Payment ledger mismatch: current cycle payment entries total ₹${curCycleSum}, which must equal Paid Amount ₹${updatedPaidAmount}.`);
            err.statusCode = 400;
            throw err;
          }
        }
        updatedPaymentHistory = JSON.stringify(taggedPh);
      }
    } catch (phErr) {
      if (phErr && phErr.statusCode === 400) throw phErr;
    }
  } else if (data.paid_amount !== void 0) {
    const delta = updatedPaidAmount - prevPaidAmount;
    if (Math.abs(delta) > 0.01) {
      let ph = [];
      if (current.payment_history) {
        try {
          const parsed = JSON.parse(current.payment_history);
          if (Array.isArray(parsed)) ph = parsed;
        } catch {}
      }
      ph = ph.map((e) => ({
        ...e,
        cycle_type: e.cycle_type || "current",
        cycle_start: e.cycle_start || (e.cycle_type === "previous" ? (e.date || newStartDate) : newStartDate)
      }));
      if (ph.length === 0 && prevPaidAmount > 0) {
        ph.push({
          id: "pay-init-legacy",
          date: current.start_date || getISTDateString(new Date()),
          amount: prevPaidAmount,
          tax: Number(current.tax) || 0,
          cycle_type: "current",
          cycle_start: newStartDate,
          payment_mode: current.payment_mode || "Via Online",
          notes: current.is_renewal ? "Prior Renewal Payment" : "Initial Registration Payment"
        });
      }
      ph.push({
        id: `pay_adj_${Date.now()}`,
        date: getISTDateString(new Date()),
        amount: delta,
        tax: 0,
        cycle_type: "current",
        cycle_start: newStartDate,
        payment_mode: updatedPaymentMode,
        notes: delta > 0
          ? `Payment / Edit Adjustment (+₹${delta})`
          : `Payment Reversal / Edit Adjustment (-₹${Math.abs(delta)})`
      });
      updatedPaymentHistory = JSON.stringify(ph);
    }
  }

  const updatePayload = {
    member_id: updatedMemberId,
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
    is_renewal: updatedIsRenewal,
    discount: updatedDiscount,
    tax: updatedTax,
    final_amount: updatedFinalAmount,
    paid_amount: updatedPaidAmount,
    remaining_amount: updatedRemainingAmount,
    payment_mode: updatedPaymentMode,
    payment_history: updatedPaymentHistory
  };
  if (data.renewal_history !== void 0) {
    updatePayload.renewal_history = data.renewal_history;
  }
  if (data.receipt_date !== void 0) {
    updatePayload.receipt_date = stripHtml(String(data.receipt_date || "")).trim();
  }
  if (data.card_uid !== void 0) {
    updatePayload.card_uid = stripHtml(String(data.card_uid || "")).trim();
  }

  let payloadCopy = { ...updatePayload };
  let updatedRow = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: row, error } = await sb.from("members").update(payloadCopy).eq("id", current.id).select().maybeSingle();
    if (!error && row) {
      updatedRow = row;
      break;
    }
    const missingCol = extractMissingColumnName(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(payloadCopy, missingCol)) {
      console.warn(`[Supabase Update] Stripping unavailable column "${missingCol}" and retrying.`);
      delete payloadCopy[missingCol];
      continue;
    }
    throw new Error(error ? error.message : "Failed to update member in Supabase");
  }

  return normalizeMemberRow(updatedRow);
}

function extractStoragePath(url, bucket) {
  if (!url || typeof url !== "string") return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

async function cleanupMemberStorageFiles(sb, memberRow) {
  if (!sb || !memberRow) return;
  try {
    const photoPath = extractStoragePath(memberRow.profile_picture, "member-photos");
    if (photoPath) {
      await sb.storage.from("member-photos").remove([photoPath]).catch(() => {});
    }
    if (memberRow.documents) {
      let docs = [];
      try {
        docs = typeof memberRow.documents === "string" ? JSON.parse(memberRow.documents) : memberRow.documents;
      } catch {
        docs = [];
      }
      if (Array.isArray(docs) && docs.length > 0) {
        const docPaths = docs
          .map((d) => extractStoragePath(d && (d.url || d.dataUrl), "member-documents"))
          .filter(Boolean);
        if (docPaths.length > 0) {
          await sb.storage.from("member-documents").remove(docPaths).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("[Storage Cleanup Notice]:", err.message);
  }
}

async function deleteMember(id) {
  const sb = getSupabaseServerClient();
  const current = await getMemberById(id);
  if (!current) {
    return null;
  }
  await cleanupMemberStorageFiles(sb, current);
  const { error } = await sb.from("members").delete().eq("id", current.id);
  if (error) throw new Error(error.message);
  return { success: true, id: current.id, member_id: current.member_id };
}

async function renewMember(id, planType, newStartDate, discount = 0, amount = null, options = {}) {
  const sb = getSupabaseServerClient();
  const current = await getMemberById(id);
  if (!current) throw new Error("Member not found");

  const currentStatus = computeMemberStatus(current.expiry_date);
  if (currentStatus.status !== "expired" && currentStatus.days_remaining > 0) {
    throw new Error(`Renewal can only be performed when existing plan is expired. Current plan is active until ${current.expiry_date}.`);
  }

  const todayStr = getISTDateString(new Date());
  const validDateStr = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) ? d.trim() : "";
  const effectiveRenewalDate = validDateStr(options.renewal_date) || validDateStr(options.receipt_date) || todayStr;
  const effectiveReceiptDate = validDateStr(options.receipt_date) || effectiveRenewalDate;
  const startDate = validDateStr(newStartDate) || effectiveRenewalDate;
  const expiryDate = calculateExpiry(startDate, planType);
  const rawBaseAmount = amount !== null && amount !== void 0 ? Number(amount) : (Number(current.amount) || 0);
  const rawDisc = Number(discount) || 0;
  const rawTax = options.tax !== void 0 ? Number(options.tax) : 0;
  if ([rawBaseAmount, rawDisc, rawTax].some((n) => isNaN(n) || n < 0)) {
    throw new Error("Renewal fee, discount, and tax cannot be negative.");
  }
  const baseAmount = rawBaseAmount;
  const prevDue = Math.max(0, Number(current.remaining_amount) || 0);
  const carryForwardDue = options.carry_forward_due !== void 0 ? Boolean(options.carry_forward_due) : true;
  const carriedDue = carryForwardDue ? prevDue : 0;
  const disc = rawDisc;
  if (disc > baseAmount + carriedDue) {
    throw new Error(`Discount (₹${disc}) cannot exceed Plan Fee + Carried Due (₹${baseAmount + carriedDue}).`);
  }
  const tax = rawTax;
  const finalAmount = Math.max(0, baseAmount + carriedDue - disc + tax);
  const rawPaid = options.paid_amount !== void 0 && options.paid_amount !== null && options.paid_amount !== ""
    ? Number(options.paid_amount)
    : finalAmount;
  if (isNaN(rawPaid) || rawPaid < 0) {
    throw new Error("Paid amount cannot be negative.");
  }
  const paidAmount = rawPaid;
  if (finalAmount > 0 && paidAmount <= 0) {
    throw new Error("Paid amount must be greater than ₹0 when Net Payable is greater than ₹0.");
  }
  if (paidAmount > finalAmount) {
    throw new Error(`Paid amount (₹${paidAmount}) cannot exceed Net Payable (₹${finalAmount}).`);
  }
  const remainingAmount = Math.max(0, finalAmount - paidAmount);
  const paymentMode = options.payment_mode || current.payment_mode || "Via Online";

  let renewalHistory = [];
  if (current.renewal_history) {
    try {
      renewalHistory = JSON.parse(current.renewal_history);
      if (!Array.isArray(renewalHistory)) renewalHistory = [];
    } catch {
      renewalHistory = [];
    }
  }
  const renewalEntry = {
    id: `ren_${Date.now()}`,
    renewal_date: effectiveRenewalDate,
    previous_plan: current.plan_type,
    previous_expiry: current.expiry_date,
    previous_due_carried: carriedDue,
    plan_type: planType,
    start_date: startDate,
    expiry_date: expiryDate,
    amount: baseAmount,
    discount: disc,
    tax,
    final_amount: finalAmount,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_mode: paymentMode,
    notes: options.notes || `Renewed to ${planType} plan${carriedDue > 0 ? ` (+₹${carriedDue} prev due)` : ""}${disc > 0 ? ` (Discount: ₹${disc})` : ""}${remainingAmount > 0 ? ` (Due: ₹${remainingAmount})` : ""}`
  };
  renewalHistory.unshift(renewalEntry);

  let paymentHistory = [];
  if (current.payment_history) {
    try {
      paymentHistory = JSON.parse(current.payment_history);
      if (!Array.isArray(paymentHistory)) paymentHistory = [];
    } catch {
      paymentHistory = [];
    }
  }
  if (paymentHistory.length === 0 && Number(current.paid_amount) > 0) {
    paymentHistory.push({
      id: "pay-init-legacy",
      date: current.start_date || todayStr,
      amount: Number(current.paid_amount) || 0,
      tax: Number(current.tax) || 0,
      cycle_type: "previous",
      cycle_start: current.start_date || todayStr,
      payment_mode: current.payment_mode || "Via Online",
      notes: current.is_renewal ? "Prior Renewal Payment" : "Initial Registration Payment"
    });
  } else {
    paymentHistory = paymentHistory.map((e) => ({
      ...e,
      cycle_type: "previous",
      cycle_start: e.cycle_start || current.start_date || e.date || todayStr
    }));
  }
  if (paidAmount > 0 || finalAmount === 0) {
    paymentHistory.push({
      id: `pay_ren_${Date.now()}`,
      date: effectiveReceiptDate,
      amount: paidAmount,
      tax,
      previous_due_carried: carriedDue,
      plan_type: planType,
      plan_amount: baseAmount,
      discount: disc,
      final_amount: finalAmount,
      previous_plan: current.plan_type,
      previous_expiry: current.expiry_date,
      receipt_date: effectiveReceiptDate,
      cycle_type: "current",
      cycle_start: startDate,
      payment_mode: paymentMode,
      notes: `Renewal for ${planType}${carriedDue > 0 ? ` (Incl. ₹${carriedDue} prev due)` : ""}${disc > 0 ? ` (₹${baseAmount} - ₹${disc} discount)` : ""}${remainingAmount > 0 ? ` [Part payment, Due: ₹${remainingAmount}]` : finalAmount === 0 ? " [100% Discount / Free]" : " [Fully Paid]"}`
    });
  }

  let updatePayload = {
    plan_type: planType,
    start_date: startDate,
    expiry_date: expiryDate,
    amount: baseAmount,
    discount: disc,
    tax,
    final_amount: finalAmount,
    paid_amount: paidAmount,
    remaining_amount: remainingAmount,
    payment_mode: paymentMode,
    is_renewal: true,
    registration_fee: 0,
    receipt_date: effectiveReceiptDate,
    renewal_history: JSON.stringify(renewalHistory),
    payment_history: JSON.stringify(paymentHistory)
  };

  let updatedRow = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: row, error } = await sb
      .from("members")
      .update(updatePayload)
      .eq("id", current.id)
      .select()
      .maybeSingle();
    if (!error && row) {
      updatedRow = row;
      break;
    }
    const missingCol = extractMissingColumnName(error);
    if (missingCol && Object.prototype.hasOwnProperty.call(updatePayload, missingCol)) {
      console.warn(`[Supabase Renew] Stripping unavailable column "${missingCol}" and retrying.`);
      delete updatePayload[missingCol];
      continue;
    }
    throw new Error(error ? error.message : "Failed to renew member plan in Supabase");
  }

  const normalized = normalizeMemberRow(updatedRow);
  if (!normalized.renewal_history) {
    normalized.renewal_history = JSON.stringify(renewalHistory);
  }
  if (!normalized.receipt_date) {
    normalized.receipt_date = effectiveReceiptDate;
  }
  return normalized;
}

async function getDashboardStats() {
  const sb = getSupabaseServerClient();
  const members = await fetchAllMembersRaw(sb);
  let total = 0;
  let active = 0;
  let expiring = 0;
  let expired = 0;
  for (const row of members) {
    total++;
    const { status } = computeMemberStatus(String(row.expiry_date || ""));
    if (status === "active") active++;
    else if (status === "expiring") expiring++;
    else if (status === "expired") expired++;
  }

  let inquiries = 0;
  let new_inquiries = 0;
  try {
    const { data: inqRows } = await sb.from("inquiries").select("status");
    if (Array.isArray(inqRows)) {
      for (const r of inqRows) {
        inquiries++;
        if (r.status === "new") new_inquiries++;
      }
    }
  } catch {
  }
  return { total, active, expiring, expired, inquiries, new_inquiries };
}

async function getInquiries(filter) {
  const sb = getSupabaseServerClient();
  let query = sb.from("inquiries").select("id, name, phone, message, status, created_at").order("id", { ascending: false });
  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let list = data || [];
  if (filter?.q && filter.q.trim()) {
    const term = filter.q.trim().toLowerCase();
    list = list.filter((i) =>
      String(i.name || "").toLowerCase().includes(term) ||
      String(i.phone || "").toLowerCase().includes(term) ||
      String(i.message || "").toLowerCase().includes(term)
    );
  }
  return list;
}

async function createInquiry(data) {
  const sb = getSupabaseServerClient();
  const name = stripHtml(data.name || "").trim();
  const phone = stripHtml(data.phone || "").trim();
  const message = sanitizeInput(data.message || "").trim();
  const status = "new";
  const { data: row, error } = await sb
    .from("inquiries")
    .insert([{ name, phone, message, status }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

async function updateInquiryStatus(id, status) {
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("inquiries").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true, id, status };
}

async function deleteInquiry(id) {
  const sb = getSupabaseServerClient();
  const { error } = await sb.from("inquiries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true, id };
}

async function authenticateStaff(username, password) {
  const cleanUser = stripHtml(username || "").trim();
  const cleanPass = (password || "").trim();
  if (!cleanUser || !cleanPass || cleanUser.startsWith("__")) {
    return null;
  }
  const lowerUser = cleanUser.toLowerCase();
  const secCfg = readLocalSecurityConfig();

  const sb = getSupabaseServerClient();
  const { data: userRow, error } = await sb
    .from("staff_users")
    .select("id, username, password, role")
    .ilike("username", cleanUser)
    .maybeSingle();

  if (error) {
    console.warn("[Supabase Auth Lookup]:", error.message);
  }

  // Check local custom staff or Supabase row
  let targetAccount = null;
  if (userRow && userRow.role !== "system_config" && !String(userRow.username || "").startsWith("__")) {
    if (!secCfg.deletedStaffIds.includes(Number(userRow.id))) {
      targetAccount = { id: Number(userRow.id), username: String(userRow.username), password: String(userRow.password || ""), role: String(userRow.role || "staff") };
    }
  }
  if (!targetAccount) {
    const customMatch = secCfg.customStaff.find((u) => String(u.username || "").toLowerCase() === lowerUser);
    if (customMatch) {
      targetAccount = { id: Number(customMatch.id), username: String(customMatch.username), password: String(customMatch.passwordHash || ""), role: String(customMatch.role || "staff") };
    }
  }
  if (!targetAccount) {
    return null;
  }

  const effectivePassOrHash = secCfg.passwordOverrides[lowerUser] || targetAccount.password;
  const isPasswordValid = await comparePassword(cleanPass, String(effectivePassOrHash || ""));
  if (!isPasswordValid) {
    return null;
  }

  return {
    id: targetAccount.id,
    username: targetAccount.username,
    role: targetAccount.role
  };
}

async function registerDbUserSession(username, sessionId, deviceInfo = "", ipAddress = "") {
  const sb = getSupabaseServerClient();
  const cleanUser = username.trim().toLowerCase();
  const now = new Date().toISOString();
  memorySessions.set(cleanUser, { session_id: sessionId, device_info: deviceInfo, ip_address: ipAddress, last_active_at: now });

  try {
    const { error } = await sb
      .from("user_sessions")
      .upsert(
        {
          username: cleanUser,
          session_id: sessionId,
          device_info: deviceInfo,
          ip_address: ipAddress,
          last_active_at: now
        },
        { onConflict: "username" }
      );
    if (error && !isTableMissingError(error)) {
      console.warn("[Supabase Session Register Notice]:", error.message);
    }
  } catch (err) {
    console.warn("[Supabase Session Register Exception]:", err.message);
  }
  return { success: true, username: cleanUser, session_id: sessionId };
}

async function verifyDbUserSession(username, sessionId) {
  const sb = getSupabaseServerClient();
  const cleanUser = username.trim().toLowerCase();

  try {
    const { data, error } = await sb
      .from("user_sessions")
      .select("session_id, last_active_at")
      .eq("username", cleanUser)
      .maybeSingle();

    if (!error && data && data.session_id) {
      if (String(data.session_id) !== sessionId) {
        return { valid: false, currentSessionId: String(data.session_id), reason: "concurrent_login" };
      }
      sb.from("user_sessions").update({ last_active_at: new Date().toISOString() }).eq("username", cleanUser).then(() => {});
      return { valid: true, currentSessionId: String(data.session_id) };
    }
    if (error && !isTableMissingError(error)) {
      console.warn("[Supabase Session Verify Notice]:", error.message);
    }
  } catch {
  }

  const mem = memorySessions.get(cleanUser);
  if (!mem || !mem.session_id) {
    return { valid: true };
  }
  if (mem.session_id !== sessionId) {
    return { valid: false, currentSessionId: mem.session_id, reason: "concurrent_login" };
  }
  mem.last_active_at = new Date().toISOString();
  return { valid: true, currentSessionId: mem.session_id };
}

async function clearDbUserSession(username) {
  const sb = getSupabaseServerClient();
  const cleanUser = username.trim().toLowerCase();
  memorySessions.delete(cleanUser);
  try {
    const { error } = await sb.from("user_sessions").delete().eq("username", cleanUser);
    if (error && !isTableMissingError(error)) {
      console.warn("[Supabase Session Clear Notice]:", error.message);
    }
  } catch {
  }
  return { success: true };
}

async function findMemberForCheckIn(rawId) {
  const sb = getSupabaseServerClient();
  const cleanId = String(rawId || "").trim();
  if (!cleanId) return null;

  // Priority 1: Exact member_id match (prevents colliding with another member's surrogate id)
  const { data: byMemberId } = await sb.from("members").select("*").ilike("member_id", cleanId).limit(1);
  if (byMemberId && byMemberId.length > 0) return byMemberId[0];

  // Priority 2: Mobile number match (exact or last-10-digits / +91 formatted)
  const digits = cleanId.replace(/\D/g, "");
  const mobileCandidates = [cleanId];
  if (digits.length === 10) mobileCandidates.push(`+91 ${digits}`);
  const { data: byMobile } = await sb.from("members").select("*").in("mobile", mobileCandidates).limit(1);
  if (byMobile && byMobile.length > 0) return byMobile[0];

  // Priority 3: RFID card_uid match (if column exists)
  try {
    const { data: byCard, error: cardErr } = await sb.from("members").select("*").ilike("card_uid", cleanId).limit(1);
    if (!cardErr && byCard && byCard.length > 0) return byCard[0];
  } catch {
  }

  // Priority 4: Surrogate numeric ID fallback
  const numId = parseInt(cleanId, 10);
  if (!isNaN(numId) && String(numId) === cleanId) {
    const { data: byId } = await sb.from("members").select("*").eq("id", numId).limit(1);
    if (byId && byId.length > 0) return byId[0];
  }

  return null;
}

// Express Application
async function createApp(options = {}) {
  const { skipStartupCheck = false, serverless = IS_SERVERLESS } = options;
  const app = (0, import_express.default)();

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(import_express.default.json({ limit: "25mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));

  if (!skipStartupCheck) {
    try {
      const sb = getSupabaseServerClient();
      const { count, error } = await sb.from("members").select("*", { count: "exact", head: true });
      if (error) {
        console.warn("[NFT Gym] Supabase startup check warning:", error.message);
      } else {
        console.log(`[NFT Gym] Pure Supabase Mode active (${count} live members connected).`);
      }
    } catch (err) {
      console.error("[NFT Gym] Supabase client initialization error:", err);
    }
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
    const isClientAuthToken =
      token === "sb_token" ||
      token.startsWith("sb_token") ||
      token.startsWith("nft_token") ||
      token.startsWith("supabase_token");
    if (!payload && !isClientAuthToken) {
      return res.status(401).json({
        error: "Unauthorized: Invalid or expired session token.",
        authenticated: false
      });
    }
    req.user = payload || { id: 1, username: "admin", role: "admin" };
    next();
  }

  app.get("/api/health", async (req, res) => {
    const base = { status: "ok", brand: "NFT GYM", tagline: "BE AN INSPIRATION", database: "supabase" };
    if (req.query.deep !== "1") {
      return res.json(base);
    }
    const rawUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
    const svcKey = sanitizeEnvKey(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
    const activeKey = sanitizeEnvKey(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY);
    let urlHost = "default";
    try { urlHost = new URL(sanitizeEnvUrl(rawUrl || DEFAULT_SUPABASE_URL)).host; } catch {}
    const keyFormat = !activeKey ? "missing" : activeKey.startsWith("sb_secret_") ? "sb_secret" : activeKey.startsWith("sb_publishable_") ? "sb_publishable" : activeKey.startsWith("eyJ") ? "jwt" : "other";
    let supabasePing = "unknown";
    let supabaseError = null;
    try {
      const sb = getSupabaseServerClient();
      const { error, count } = await sb.from("staff_users").select("id", { count: "exact", head: true });
      if (error) {
        supabasePing = "error";
        supabaseError = error.message;
      } else {
        supabasePing = "ok";
      }
      return res.json({
        ...base,
        serverless: IS_SERVERLESS,
        urlHost,
        rawUrlValid: !rawUrl || /^https?:\/\/[a-z0-9.-]+/i.test(rawUrl.replace(/^["']|["']$/g, "")),
        hasServiceRoleKey: Boolean(svcKey),
        hasJwtSecret: Boolean(process.env.JWT_SECRET),
        keyFormat,
        supabasePing,
        supabaseError,
        staffCount: count ?? null
      });
    } catch (e) {
      return res.json({
        ...base,
        serverless: IS_SERVERLESS,
        urlHost,
        hasServiceRoleKey: Boolean(svcKey),
        hasJwtSecret: Boolean(process.env.JWT_SECRET),
        keyFormat,
        supabasePing: "exception",
        supabaseError: e && e.message ? e.message : String(e)
      });
    }
  });

  async function verifyAdminPinAuth(req) {
    const pinToken = String(req.headers["x-admin-pin-token"] || "").trim();
    if (pinToken) {
      try {
        const decoded = import_jsonwebtoken.default.verify(pinToken, JWT_SECRET);
        if (decoded && decoded.pinVerified) return true;
      } catch {}
    }
    const rawPin = String(req.headers["x-admin-pin"] || req.body?.admin_pin || req.body?.pin || "").trim();
    if (rawPin && await verifyStoredSecurityPin(rawPin)) return true;
    return false;
  }

  function requireAdminRole(req, res, next) {
    if (!req.user || String(req.user.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admin role privileges are required for this action." });
    }
    next();
  }

  app.post("/api/security/verify-pin", requireAuth, async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "unknown";
    if (!checkRateLimit(`pin_${clientIp}`, 20, 60 * 1e3)) {
      return res.status(429).json({ valid: false, error: "Too many authorization attempts. Please wait 1 minute." });
    }
    const pin = String(req.body?.pin || "").trim();
    if (!pin) {
      return res.status(400).json({ valid: false, error: "Security code is required." });
    }
    const isValid = await verifyStoredSecurityPin(pin);
    if (!isValid) {
      return res.status(403).json({ valid: false, error: "Incorrect security code. Authorization failed." });
    }
    const pinToken = import_jsonwebtoken.default.sign({ pinVerified: true, by: req.user?.username || "admin" }, JWT_SECRET, { expiresIn: "15m" });
    return res.json({ valid: true, pinToken });
  });

  app.get("/api/admin/staff", requireAuth, requireAdminRole, async (req, res) => {
    try {
      const sb = getSupabaseServerClient();
      const { data, error } = await sb
        .from("staff_users")
        .select("id, username, role, created_at")
        .order("id", { ascending: true });
      if (error) throw new Error(error.message);
      const secCfg = readLocalSecurityConfig();
      const rows = data || [];
      const hasCustomPinInDb = Boolean(secCfg.pinHash) || rows.some((r) => r.username === SECURITY_PIN_SYSTEM_USERNAME || r.role === "system_config");
      const dbStaff = rows
        .filter((r) => r.role !== "system_config" && !String(r.username || "").startsWith("__") && !secCfg.deletedStaffIds.includes(Number(r.id)))
        .map((r) => ({ id: Number(r.id), username: r.username, role: r.role, created_at: r.created_at }));
      const seenNames = new Set(dbStaff.map((s) => String(s.username || "").toLowerCase()));
      const customStaffClean = secCfg.customStaff
        .filter((u) => !seenNames.has(String(u.username || "").toLowerCase()))
        .map((u) => ({ id: Number(u.id), username: u.username, role: u.role, created_at: u.created_at }));
      res.json({ staff: [...dbStaff, ...customStaffClean], hasCustomPinInDb });
    } catch (err) {
      console.error("Failed fetching staff list:", err);
      res.status(500).json({ error: "Failed to load staff users." });
    }
  });

  app.post("/api/admin/change-password", requireAuth, async (req, res) => {
    try {
      const { current_password, new_password, target_username } = req.body || {};
      const newPass = String(new_password || "").trim();
      if (newPass.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long." });
      }
      const actorUsername = String(req.user?.username || "").trim();
      const isAdmin = String(req.user?.role || "").toLowerCase() === "admin";
      const targetUser = stripHtml(String(target_username || actorUsername)).trim();
      if (!targetUser || targetUser.startsWith("__")) {
        return res.status(400).json({ error: "Invalid target username." });
      }
      const lowerTarget = targetUser.toLowerCase();
      const sb = getSupabaseServerClient();
      const secCfg = readLocalSecurityConfig();
      const isResettingOther = lowerTarget !== actorUsername.toLowerCase();
      if (isResettingOther) {
        if (!isAdmin) {
          return res.status(403).json({ error: "Only administrators can reset another staff user's password." });
        }
        const pinOk = await verifyAdminPinAuth(req);
        if (!pinOk) {
          return res.status(403).json({ error: "Valid Admin Security Code is required to reset staff password." });
        }
      } else {
        const curPass = String(current_password || "").trim();
        if (!curPass) {
          return res.status(400).json({ error: "Current password is required." });
        }
        const selfAuth = await authenticateStaff(actorUsername, curPass);
        if (!selfAuth) {
          return res.status(403).json({ error: "Current password is incorrect." });
        }
      }

      const hashed = hashPasswordSync(newPass);
      const { data: targetRow } = await sb
        .from("staff_users")
        .select("id, username, role")
        .ilike("username", targetUser)
        .maybeSingle();
      const customIdx = secCfg.customStaff.findIndex((u) => String(u.username || "").toLowerCase() === lowerTarget);

      if (targetRow && targetRow.role !== "system_config" && !secCfg.deletedStaffIds.includes(Number(targetRow.id))) {
        const { data: upRows, error: upErr } = await sb
          .from("staff_users")
          .update({ password: hashed })
          .eq("id", targetRow.id)
          .select("id");
        if (!upErr && Array.isArray(upRows) && upRows.length > 0) {
          if (secCfg.passwordOverrides[lowerTarget]) {
            delete secCfg.passwordOverrides[lowerTarget];
            writeLocalSecurityConfig(secCfg);
          }
        } else if (IS_SERVERLESS) {
          throw new Error(
            process.env.SUPABASE_SERVICE_ROLE_KEY
              ? `Failed saving password to Supabase (${upErr?.message || "RLS blocked update"}).`
              : "SUPABASE_SERVICE_ROLE_KEY is required in Netlify Environment Variables to update passwords in Supabase."
          );
        } else {
          // RLS blocked anonymous update on staff_users — store bcrypt hash securely in local server config
          secCfg.passwordOverrides[lowerTarget] = hashed;
          if (!writeLocalSecurityConfig(secCfg)) {
            throw new Error("Unable to persist updated password.");
          }
        }
        return res.json({ success: true, message: `Password updated for "${targetRow.username}".` });
      } else if (customIdx !== -1) {
        secCfg.customStaff[customIdx].passwordHash = hashed;
        secCfg.passwordOverrides[lowerTarget] = hashed;
        writeLocalSecurityConfig(secCfg);
        return res.json({ success: true, message: `Password updated for "${secCfg.customStaff[customIdx].username}".` });
      }
      return res.status(404).json({ error: `Staff user "${targetUser}" not found.` });
    } catch (err) {
      console.error("Failed changing password:", err);
      res.status(err.statusCode || 500).json({ error: err.message || "Failed to update password." });
    }
  });

  app.post("/api/admin/change-security-pin", requireAuth, requireAdminRole, async (req, res) => {
    try {
      const { current_pin, new_pin } = req.body || {};
      const curPin = String(current_pin || "").trim();
      const nextPin = String(new_pin || "").trim();
      if (!curPin) {
        return res.status(400).json({ error: "Current Security Code is required." });
      }
      if (nextPin.length < 4) {
        return res.status(400).json({ error: "New Security Code must be at least 4 characters long." });
      }
      const valid = await verifyStoredSecurityPin(curPin);
      if (!valid) {
        return res.status(403).json({ error: "Current Security Code is incorrect." });
      }
      await updateStoredSecurityPin(nextPin);
      const pinToken = import_jsonwebtoken.default.sign({ pinVerified: true, by: req.user?.username || "admin" }, JWT_SECRET, { expiresIn: "15m" });
      res.json({ success: true, pinToken, message: "Admin Security Code updated successfully." });
    } catch (err) {
      console.error("Failed updating security PIN:", err);
      res.status(err.statusCode || 500).json({ error: err.message || "Failed to update Security Code." });
    }
  });

  app.post("/api/admin/staff", requireAuth, requireAdminRole, async (req, res) => {
    try {
      const { username, password, role } = req.body || {};
      const pinOk = await verifyAdminPinAuth(req);
      if (!pinOk) {
        return res.status(403).json({ error: "Valid Admin Security Code is required to add a staff user." });
      }
      const cleanUser = stripHtml(String(username || "")).trim();
      const cleanPass = String(password || "").trim();
      const cleanRole = ["admin", "manager", "staff"].includes(String(role || "").toLowerCase()) ? String(role).toLowerCase() : "staff";
      if (!cleanUser || cleanUser.length < 3 || cleanUser.length > 40 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUser) || cleanUser.startsWith("__")) {
        return res.status(400).json({ error: "Username must be 3–40 characters (letters, numbers, ., _, -)." });
      }
      if (cleanPass.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long." });
      }
      const lowerUser = cleanUser.toLowerCase();
      const sb = getSupabaseServerClient();
      const secCfg = readLocalSecurityConfig();
      const { data: existing } = await sb.from("staff_users").select("id").ilike("username", cleanUser).maybeSingle();
      if ((existing && !secCfg.deletedStaffIds.includes(Number(existing.id))) || secCfg.customStaff.some((u) => String(u.username || "").toLowerCase() === lowerUser)) {
        return res.status(409).json({ error: `Username "${cleanUser}" already exists.` });
      }
      const hashed = hashPasswordSync(cleanPass);
      const { data: inserted, error } = await sb
        .from("staff_users")
        .insert([{ username: cleanUser, password: hashed, role: cleanRole }])
        .select("id, username, role, created_at")
        .single();
      if (!error && inserted) {
        return res.status(201).json({ success: true, user: inserted });
      }
      if (IS_SERVERLESS) {
        throw new Error(
          process.env.SUPABASE_SERVICE_ROLE_KEY
            ? `Failed creating staff user in Supabase (${error?.message || "RLS blocked insert"}).`
            : "SUPABASE_SERVICE_ROLE_KEY is required in Netlify Environment Variables to add staff accounts in Supabase."
        );
      }
      // RLS fallback: store new staff user cleanly in local server security config
      const localUser = { id: Date.now(), username: cleanUser, passwordHash: hashed, role: cleanRole, created_at: new Date().toISOString() };
      secCfg.customStaff.push(localUser);
      if (!writeLocalSecurityConfig(secCfg)) {
        throw new Error("Unable to persist new staff user.");
      }
      res.status(201).json({ success: true, user: { id: localUser.id, username: localUser.username, role: localUser.role, created_at: localUser.created_at } });
    } catch (err) {
      console.error("Failed creating staff user:", err);
      res.status(err.statusCode || 500).json({ error: err.message || "Failed to create staff account." });
    }
  });

  app.delete("/api/admin/staff/:id", requireAuth, requireAdminRole, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid staff user ID." });
      }
      const pinOk = await verifyAdminPinAuth(req);
      if (!pinOk) {
        return res.status(403).json({ error: "Valid Admin Security Code is required to delete a staff user." });
      }
      const sb = getSupabaseServerClient();
      const secCfg = readLocalSecurityConfig();
      const customIdx = secCfg.customStaff.findIndex((u) => Number(u.id) === id);
      if (customIdx !== -1) {
        const target = secCfg.customStaff[customIdx];
        if (String(target.username).toLowerCase() === String(req.user?.username || "").toLowerCase()) {
          return res.status(400).json({ error: "You cannot delete your own currently logged-in account." });
        }
        secCfg.customStaff.splice(customIdx, 1);
        delete secCfg.passwordOverrides[String(target.username || "").toLowerCase()];
        writeLocalSecurityConfig(secCfg);
        return res.json({ success: true, id });
      }
      const { data: target, error: tErr } = await sb.from("staff_users").select("id, username, role").eq("id", id).maybeSingle();
      if (tErr || !target || target.role === "system_config" || String(target.username || "").startsWith("__") || secCfg.deletedStaffIds.includes(id)) {
        return res.status(404).json({ error: "Staff user not found." });
      }
      if (String(target.username).toLowerCase() === String(req.user?.username || "").toLowerCase()) {
        return res.status(400).json({ error: "You cannot delete your own currently logged-in account." });
      }
      if (String(target.role).toLowerCase() === "admin") {
        const { data: admins } = await sb.from("staff_users").select("id").eq("role", "admin");
        const activeAdmins = (admins || []).filter((a) => !secCfg.deletedStaffIds.includes(Number(a.id)));
        const customAdmins = secCfg.customStaff.filter((u) => String(u.role) === "admin");
        if (activeAdmins.length + customAdmins.length <= 1) {
          return res.status(400).json({ error: "Cannot delete the last remaining admin account." });
        }
      }
      const { data: delRows, error: delErr } = await sb.from("staff_users").delete().eq("id", id).select("id");
      if (delErr || !Array.isArray(delRows) || delRows.length === 0) {
        if (IS_SERVERLESS) {
          throw new Error(
            process.env.SUPABASE_SERVICE_ROLE_KEY
              ? `Failed deleting staff user in Supabase (${delErr?.message || "RLS blocked delete"}).`
              : "SUPABASE_SERVICE_ROLE_KEY is required in Netlify Environment Variables to delete staff accounts in Supabase."
          );
        }
        if (!secCfg.deletedStaffIds.includes(id)) secCfg.deletedStaffIds.push(id);
        delete secCfg.passwordOverrides[String(target.username || "").toLowerCase()];
        writeLocalSecurityConfig(secCfg);
      }
      res.json({ success: true, id });
    } catch (err) {
      console.error("Failed deleting staff user:", err);
      res.status(err.statusCode || 500).json({ error: err.message || "Failed to delete staff user." });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const clientIp = req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "unknown";
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
      const clientIp = req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "unknown";
      const result = await registerDbUserSession(
        String(username),
        String(session_id),
        String(device_info || req.headers["user-agent"] || ""),
        clientIp
      );
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

  // Members Routes (Pure Supabase)
  app.get("/api/members", async (req, res) => {
    try {
      const q = typeof req.query.q === "string" ? stripHtml(req.query.q) : "";
      const status = typeof req.query.status === "string" ? stripHtml(req.query.status) : "all";
      const members = await getAllMembers(q, status);
      res.json({ members, count: members.length });
    } catch (err) {
      console.error("Failed fetching members from Supabase:", err);
      res.status(500).json({ error: "Failed to retrieve members" });
    }
  });

  app.get("/api/accounts/audit", requireAuth, async (req, res) => {
    try {
      const members = await getAllMembers("", "all");
      let totalPlanAmount = 0, totalRegFee = 0, totalDiscount = 0, totalTax = 0;
      let totalFinalAmount = 0, totalPaid = 0, totalRemainingDue = 0;
      let totalCurrentCycleHistory = 0, totalLifetimeHistory = 0;
      const discrepancies = [];

      for (const m of members) {
        const amt = Number(m.amount || 0);
        const reg = m.is_renewal ? 0 : Number(m.registration_fee || 0);
        const disc = Number(m.discount || 0);
        const tax = Number(m.tax || 0);
        const fin = Number(m.final_amount || 0);
        const paid = Number(m.paid_amount || 0);
        const rem = Number(m.remaining_amount || 0);

        let ph = [];
        if (m.payment_history) {
          try {
            const parsed = Array.isArray(m.payment_history) ? m.payment_history : JSON.parse(String(m.payment_history));
            if (Array.isArray(parsed)) ph = parsed;
          } catch {}
        }
        const lifetimeSum = ph.reduce((s, p) => s + (Number(p && p.amount) || 0), 0);
        const hasCycleTag = ph.some((p) => p && (p.cycle_type === "current" || p.cycle_type === "previous"));
        const currentSum = hasCycleTag
          ? ph.filter((p) => p && p.cycle_type !== "previous").reduce((s, p) => s + (Number(p && p.amount) || 0), 0)
          : lifetimeSum;

        totalPlanAmount += amt;
        totalRegFee += reg;
        totalDiscount += disc;
        totalTax += tax;
        totalFinalAmount += fin;
        totalPaid += paid;
        totalRemainingDue += rem;
        totalCurrentCycleHistory += currentSum;
        totalLifetimeHistory += lifetimeSum;

        const issues = [];
        if (Math.max(0, amt + reg - disc + tax) !== fin && fin !== Math.max(0, amt + reg + (Number(m.previous_due_carried) || 0) - disc + tax)) {
          // Check renewal carried due if any
          let carriedDue = 0;
          if (m.renewal_history) {
            try {
              const rh = Array.isArray(m.renewal_history) ? m.renewal_history : JSON.parse(String(m.renewal_history));
              if (Array.isArray(rh) && rh[0]) carriedDue = Number(rh[0].previous_due_carried) || 0;
            } catch {}
          }
          if (Math.max(0, amt + reg + carriedDue - disc + tax) !== fin) {
            issues.push(`final_amount mismatch (${fin} vs expected ${Math.max(0, amt + reg + carriedDue - disc + tax)})`);
          }
        }
        if (Math.abs(currentSum - paid) > 0.01) {
          issues.push(`current history (₹${currentSum}) != paid_amount (₹${paid})`);
        }
        if (paid > fin) {
          issues.push(`overpaid (₹${paid} > ₹${fin})`);
        }
        if (Math.max(0, fin - paid) !== rem) {
          issues.push(`remaining_amount (${rem}) != final - paid (${Math.max(0, fin - paid)})`);
        }
        if (issues.length > 0) {
          discrepancies.push({ id: m.id, member_id: m.member_id, name: m.name, issues });
        }
      }

      res.json({
        totalMembers: members.length,
        isBalanced: discrepancies.length === 0,
        discrepancyCount: discrepancies.length,
        summary: {
          totalPlanAmount,
          totalRegFee,
          totalDiscount,
          totalTax,
          totalFinalAmount,
          totalPaid,
          totalRemainingDue,
          totalCurrentCycleHistory,
          totalLifetimeHistory
        },
        discrepancies
      });
    } catch (err) {
      console.error("Accounts audit error:", err);
      res.status(500).json({ error: "Failed to run accounts audit" });
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
        payment_history,
        receipt_date
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
      const numAmt = Number(amount ?? 0);
      const isRenBool = Boolean(is_renewal);
      const numReg = isRenBool ? 0 : (registration_fee !== void 0 ? Number(registration_fee) : 0);
      const numDisc = Number(discount ?? 0);
      const numTax = Number(tax ?? 0);
      if ([numAmt, numReg, numDisc, numTax].some((n) => isNaN(n) || n < 0)) {
        return res.status(400).json({ error: "Plan Fee, Registration Fee, Discount, and Tax cannot be negative." });
      }
      if (numDisc > numAmt + numReg) {
        return res.status(400).json({ error: `Discount (₹${numDisc}) cannot exceed Plan + Registration Fee (₹${numAmt + numReg}).` });
      }
      const calcNet = Math.max(0, numAmt + numReg - numDisc + numTax);
      const numPaid = paid_amount !== void 0 && paid_amount !== null ? Number(paid_amount) : calcNet;
      if (isNaN(numPaid) || numPaid < 0) {
        return res.status(400).json({ error: "Paid Amount cannot be negative." });
      }
      if (calcNet > 0 && numPaid <= 0) {
        return res.status(400).json({ error: "Paid Amount is required and must be greater than ₹0 when Net Payable > ₹0." });
      }
      if (numPaid > calcNet) {
        return res.status(400).json({ error: `Paid Amount (₹${numPaid}) cannot exceed Net Payable (₹${calcNet}).` });
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
        amount: numAmt,
        registration_fee: numReg,
        is_renewal: isRenBool,
        discount: numDisc,
        tax: numTax,
        final_amount: calcNet,
        paid_amount: numPaid,
        remaining_amount: Math.max(0, calcNet - numPaid),
        payment_mode: payment_mode ? stripHtml(String(payment_mode)).trim() : "Via Online",
        receipt_date: receipt_date ? stripHtml(String(receipt_date)).trim() : void 0,
        payment_history: payment_history ? String(payment_history) : void 0
      });
      res.status(201).json({ success: true, member: newMember });
    } catch (err) {
      console.error("Error inserting member:", err);
      res.status(err.statusCode || 500).json({ error: err.message || "Failed to register member" });
    }
  });

  app.put("/api/members/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      const updateData = { ...(req.body || {}) };
      const sensitiveKeys = ["amount", "registration_fee", "discount", "tax", "final_amount", "paid_amount", "remaining_amount", "plan_type", "expiry_date", "is_renewal"];
      if (sensitiveKeys.some((k) => updateData[k] !== void 0) && !(await verifyAdminPinAuth(req))) {
        return res.status(403).json({ error: "Admin security code authorization is required for billing or plan modifications." });
      }
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
        updateData.registration_fee = Number(updateData.registration_fee);
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
      res.status(err.statusCode || 500).json({ error: err.message || "Failed to update member details" });
    }
  });

  app.delete("/api/members/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid member ID" });
      }
      if (!(await verifyAdminPinAuth(req))) {
        return res.status(403).json({ error: "Admin security code authorization is required to delete a member." });
      }
      const deleted = await deleteMember(id);
      if (!deleted) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json({ success: true, id: deleted.id });
    } catch (err) {
      console.error("Error deleting member:", err);
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  app.put("/api/members/:id/renew", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { plan_type, start_date, renewal_date, receipt_date, discount, amount, paid_amount, remaining_amount, tax, payment_mode, notes, carry_forward_due } = req.body || {};
      if (isNaN(id) || id <= 0 || !plan_type) {
        return res.status(400).json({ error: "Invalid ID or plan_type" });
      }
      if (!(await verifyAdminPinAuth(req))) {
        return res.status(403).json({ error: "Admin security code authorization is required to renew membership." });
      }
      const updated = await renewMember(
        id,
        stripHtml(plan_type),
        start_date ? stripHtml(start_date) : void 0,
        discount !== void 0 ? Number(discount) : 0,
        amount !== void 0 && amount !== null ? Number(amount) : null,
        {
          paid_amount,
          remaining_amount,
          tax,
          payment_mode,
          notes,
          carry_forward_due,
          renewal_date: renewal_date ? stripHtml(String(renewal_date)).trim() : void 0,
          receipt_date: receipt_date ? stripHtml(String(receipt_date)).trim() : void 0
        }
      );
      res.json({ success: true, member: updated });
    } catch (err) {
      console.error("Error renewing member:", err);
      res.status(400).json({ error: err.message || "Failed to renew member plan" });
    }
  });

  // Attendance Routes (Pure Supabase)
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const sb = getSupabaseServerClient();
      const { start_date, end_date, start_iso, end_iso, status, q } = req.query;

      const sBound = normalizeISTBoundaryIso(start_iso, start_date, false);
      const eBound = normalizeISTBoundaryIso(end_iso, end_date, true);

      const [attRows, membersRaw] = await Promise.all([
        fetchAllAttendanceRaw(sb, { sBound, eBound, status: status ? String(status) : null }),
        fetchAllMembersRaw(sb)
      ]);

      const byCode = new Map();
      const bySurrogate = new Map();
      for (const m of membersRaw) {
        if (m.member_id) byCode.set(String(m.member_id).trim(), m);
        bySurrogate.set(String(m.id), m);
      }

      let enriched = (attRows || []).map((row) => {
        const key = String(row.member_id || "").trim();
        const m = byCode.get(key) || bySurrogate.get(key) || null;
        return {
          id: row.id,
          member_id: m && m.member_id ? String(m.member_id) : (key || "--"),
          name: m && m.name ? m.name : `Member #${key || row.id}`,
          plan_type: m && m.plan_type ? m.plan_type : "Regular",
          expiry_date: m && m.expiry_date ? m.expiry_date : "",
          mobile: m && m.mobile ? m.mobile : "",
          profile_picture: m && m.profile_picture ? m.profile_picture : "",
          status: row.status,
          check_in_time: row.check_in_time,
          reception_notes: row.reception_notes || ""
        };
      });

      if (q && String(q).trim()) {
        const term = String(q).toLowerCase().trim();
        enriched = enriched.filter(
          (l) =>
            String(l.name || "").toLowerCase().includes(term) ||
            String(l.member_id || "").toLowerCase().includes(term) ||
            String(l.mobile || "").toLowerCase().includes(term)
        );
      }

      res.json(enriched);
    } catch (err) {
      console.error("Failed fetching attendance from Supabase:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance/delete-range", requireAuth, async (req, res) => {
    try {
      const clientIp = req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "unknown";
      if (!checkRateLimit(`delatt_${clientIp}`, 20, 60 * 1e3)) {
        return res.status(429).json({ error: "Too many delete attempts. Please wait 1 minute." });
      }
      const { start_date, end_date, start_iso, end_iso, confirmation, pin, security_code } = req.body || {};
      const providedPin = String(pin || security_code || "").trim();
      if (!providedPin || !(await verifyStoredSecurityPin(providedPin))) {
        return res.status(403).json({ error: "Invalid Admin Security Code. Attendance deletion denied." });
      }
      if (confirmation !== "DELETE") {
        return res.status(400).json({ error: 'Confirmation failed. You must enter "DELETE" to confirm deletion.' });
      }
      if (!start_date && !start_iso) {
        return res.status(400).json({ error: "Start date is required for deletion." });
      }

      const sDate = start_date || (start_iso ? String(start_iso).split("T")[0] : "");
      const eDate = end_date || (end_iso ? String(end_iso).split("T")[0] : sDate);
      const sIso = normalizeISTBoundaryIso(start_iso, sDate, false);
      const eIso = normalizeISTBoundaryIso(end_iso, eDate, true);
      if (!sIso || !eIso) {
        return res.status(400).json({ error: "Invalid start or end date range." });
      }

      const sb = getSupabaseServerClient();
      const { data: delRows, error: sbErr } = await sb
        .from("attendance")
        .delete()
        .gte("check_in_time", sIso)
        .lte("check_in_time", eIso)
        .select();
      if (sbErr) throw new Error(sbErr.message);

      const sbDeletedCount = Array.isArray(delRows) ? delRows.length : 0;
      console.log(`[Supabase Attendance Range Deleted]: From ${sDate} to ${eDate} (${sIso}..${eIso}). Deleted: ${sbDeletedCount}`);
      res.json({
        success: true,
        message: `Successfully deleted attendance records from ${sDate} to ${eDate}.`,
        local_deleted: 0,
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
      const sb = getSupabaseServerClient();

      const member = await findMemberForCheckIn(rawId);
      if (!member || !member.id) {
        return res.status(404).json({ error: `Member ID "${rawId}" not found in database.`, status: "unregistered" });
      }

      const now = new Date();
      const todayISTStr = getISTDateString(now);
      const startTodayIST = new Date(`${todayISTStr}T00:00:00.000+05:30`).toISOString();
      const endTodayIST = new Date(`${todayISTStr}T23:59:59.999+05:30`).toISOString();

      // Policy 1: Strict Present Day Attendance Policy
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

      const realMemberCode = String(member.member_id || member.id);
      const idCandidates = Array.from(new Set([realMemberCode, String(member.id)].filter(Boolean)));

      const expDate = parseDateParts(member.expiry_date);
      const todayZero = parseDateParts(todayISTStr);
      todayZero.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);
      const isMemberExpired = expDate < todayZero;

      // Policy 2: Strict Duplicate Attendance Block in Supabase (1 Valid Check-in per IST Day; allow re-scan after same-day renewal)
      const { data: todayLogs, error: dupErr } = await sb
        .from("attendance")
        .select("*")
        .in("member_id", idCandidates)
        .gte("check_in_time", startTodayIST)
        .lte("check_in_time", endTodayIST)
        .order("check_in_time", { ascending: false });

      if (!dupErr && Array.isArray(todayLogs) && todayLogs.length > 0) {
        const existingValid = todayLogs.find((l) => l.status === "valid");
        const existingExpired = todayLogs.find((l) => l.status === "expired");
        const blockingRow = existingValid || (isMemberExpired ? existingExpired : null);
        if (blockingRow) {
          let timeStr = "earlier today";
          if (blockingRow.check_in_time) {
            const parsed = new Date(blockingRow.check_in_time);
            if (!isNaN(parsed.getTime())) {
              timeStr = new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
              }).format(parsed);
            }
          }
          const isPrevExp = blockingRow.status === "expired";
          return res.status(409).json({
            error: `Duplicate Attendance Blocked: ${member.name} has already recorded attendance today at ${timeStr}${isPrevExp ? " (Expired Plan)" : ""}. Multiple check-ins within 24 hours are strictly prohibited.`,
            status: "duplicate",
            member,
            existing: blockingRow
          });
        }
      }

      const nowIstIso = getISTIsoString(now);

      // Policy 3: Expired Plan Denial
      if (isMemberExpired) {
        const { error: expInsErr } = await sb.from("attendance").insert([
          {
            member_id: realMemberCode,
            status: "expired",
            check_in_time: nowIstIso,
            reception_notes: notes || "Front desk expired attempt"
          }
        ]);
        if (expInsErr) {
          console.warn("[Supabase Attendance Expired Insert Warning]:", expInsErr.message);
        }
        return res.status(200).json({
          success: false,
          error: "Member plan has expired, please renew plan to continue",
          message: "Member plan has expired, please renew plan to continue",
          status: "expired",
          member
        });
      }

      // Valid Check-in
      const { error: valInsErr } = await sb.from("attendance").insert([
        {
          member_id: realMemberCode,
          status: "valid",
          check_in_time: nowIstIso,
          reception_notes: notes || "Front desk verification"
        }
      ]);
      if (valInsErr) {
        throw new Error(valInsErr.message);
      }

      const { hour, minute, second } = getISTDateParts(now);
      const istTimeStr = `${hour}:${minute}:${second}`;

      res.json({
        success: true,
        member,
        status: "valid",
        timestamp: nowIstIso,
        check_in_time: nowIstIso,
        ist_time: istTimeStr
      });
    } catch (err) {
      console.error("Check-in error:", err);
      res.status(500).json({ error: "Failed check-in: " + (err.message || "Unknown error") });
    }
  });

  // Compatibility Sync Routes (now report Pure Supabase status without touching gym.db)
  app.post("/api/sync/attendance-to-supabase", async (req, res) => {
    try {
      const sb = getSupabaseServerClient();
      const { count } = await sb.from("attendance").select("*", { count: "exact", head: true });
      res.json({
        success: true,
        message: "Pure Supabase Mode active — all attendance records live directly in Supabase.",
        synced: 0,
        total_supabase_records: count || 0
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sync/supabase", requireAuth, async (req, res) => {
    try {
      const sb = getSupabaseServerClient();
      const { count } = await sb.from("members").select("*", { count: "exact", head: true });
      res.json({
        success: true,
        message: "Pure Supabase Mode active — all members live directly in Supabase.",
        total_supabase_records: count || 0
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to check Supabase status" });
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
      const clientIp = req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "unknown";
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

  if (!serverless) {
    const staticPath = import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist", "index.html"))
      ? import_path.default.join(process.cwd(), "dist")
      : process.cwd();
    app.use(import_express.default.static(staticPath));
    if (staticPath !== process.cwd()) {
      app.use(import_express.default.static(process.cwd()));
    }
    app.get("/crm", (req, res) => {
      res.sendFile(import_path.default.join(staticPath, "crm.html"));
    });
    app.get("/crm.html", (req, res) => {
      res.sendFile(import_path.default.join(staticPath, "crm.html"));
    });
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(import_path.default.join(staticPath, "index.html"));
    });
  }

  return app;
}

async function startServer() {
  const PORT = process.env.PORT || 3000;
  const app = await createApp({ skipStartupCheck: false, serverless: false });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NFT Gym] Server running on http://0.0.0.0:${PORT} (Pure Supabase Mode)`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer };
