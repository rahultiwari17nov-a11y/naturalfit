-- ==============================================================================
-- GYM MANAGEMENT & ATTENDANCE SYSTEM - COMPLETE DATABASE SCHEMA
-- Compatible with PostgreSQL / Supabase SQL Editor and SQLite
-- ==============================================================================

-- 1. MEMBERS TABLE
-- Stores full member profile, subscription plan, fees, and RFID/Barcode credentials
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    member_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) DEFAULT 'Male',
    date_of_birth DATE,
    address TEXT,
    mobile VARCHAR(25) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    card_uid VARCHAR(100),
    registration_fee NUMERIC(10, 2) DEFAULT 0,
    amount NUMERIC(10, 2) DEFAULT 0,
    discount NUMERIC(10, 2) DEFAULT 0,
    tax NUMERIC(10, 2) DEFAULT 0,
    final_amount NUMERIC(10, 2) DEFAULT 0,
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    remaining_amount NUMERIC(10, 2) DEFAULT 0,
    payment_mode VARCHAR(50) DEFAULT 'Via Online',
    payment_history TEXT,
    is_renewal INTEGER DEFAULT 0,
    profile_picture TEXT,
    documents TEXT,
    medical_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast member lookup & scanner recognition
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_card_uid ON members(card_uid);
CREATE INDEX IF NOT EXISTS idx_members_mobile ON members(mobile);
CREATE INDEX IF NOT EXISTS idx_members_expiry_date ON members(expiry_date);


-- 2. ATTENDANCE TABLE
-- Stores real-time check-in logs, status (valid, expired, duplicate, denied), and timestamps
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- 'valid', 'expired', 'duplicate', 'denied'
    reception_notes TEXT
);

-- Indexes for attendance queries, monthly reports, and daily duplicate prevention
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);


-- 3. STAFF USERS TABLE
-- Authentication and access management for receptionists, trainers, and administrators
CREATE TABLE IF NOT EXISTS staff_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff', -- 'admin', 'staff', 'manager'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 4. INQUIRIES TABLE
-- Front desk leads, phone queries, and visitor registrations
CREATE TABLE IF NOT EXISTS inquiries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    message TEXT,
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'converted', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON inquiries(phone);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);


-- 5. USER SESSIONS TABLE
-- Active multi-device login sessions and authentication tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);


-- ==============================================================================
-- OPTIONAL: ROW LEVEL SECURITY (RLS) FOR SUPABASE
-- Run these if you are enabling Supabase client-side public access
-- ==============================================================================
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read and write for authenticated users" ON members FOR ALL USING (true);
-- CREATE POLICY "Allow read and write for authenticated users" ON attendance FOR ALL USING (true);
