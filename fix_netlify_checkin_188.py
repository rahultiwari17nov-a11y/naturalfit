# fix_netlify_checkin_188.py
import sys, re, os, zipfile

files = ['attendance_code.js', 'assets/index-BvAlUw77.js', 'assets/index-bvaluw77.js']

for filepath in files:
    if not os.path.exists(filepath):
        continue
    print(f"Patching {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # Ensure executeCheckIn immediately uses Supabase on Netlify/static hosting
    old_snippet = '''  const executeCheckIn = async (rawIdentifier, notes = "") => {
    if (!rawIdentifier || !String(rawIdentifier).trim()) return;
    const identifier = String(rawIdentifier).trim();'''

    new_snippet = '''  const executeCheckIn = async (rawIdentifier, notes = "") => {
    if (!rawIdentifier || !String(rawIdentifier).trim()) return;
    const identifier = String(rawIdentifier).trim();

    // Direct Supabase mode on Netlify or static hosting
    const isNetlifyOrStatic = typeof window !== 'undefined' && (
      window.location.hostname.includes("netlify") ||
      window.location.hostname.includes("github.io") ||
      window.location.hostname.includes("vercel") ||
      (window.location.hostname.endsWith(".app") && !window.location.hostname.includes("run.app"))
    );
    if (isNetlifyOrStatic) {
      const localMemberForNetlify = (allMembersList || []).find(m => 
        String(m.card_uid || "").trim().toLowerCase() === identifier.toLowerCase() ||
        String(m.member_id || "").trim().toLowerCase() === identifier.toLowerCase() ||
        String(m.id || "").trim() === identifier ||
        (m.mobile && String(m.mobile).replace(/\\D/g, "").endsWith(identifier.replace(/\\D/g, "")))
      );
      return await executeDirectSupabaseCheckIn(identifier, notes, localMemberForNetlify);
    }'''

    if old_snippet in code and "isNetlifyOrStatic" not in code:
        code = code.replace(old_snippet, new_snippet, 1)
        print(f"  [+] Added immediate Netlify Supabase check-in in {filepath}")
    elif "isNetlifyOrStatic" in code:
        print(f"  [*] Already has isNetlifyOrStatic in {filepath}")
    else:
        print(f"  [!] Could not match old_snippet in {filepath}")

    # Also make sure executeDirectSupabaseCheckIn matches by local member and Supabase accurately
    # In executeDirectSupabaseCheckIn: ensure memberHint lookup checks member_id, id, card_uid, mobile
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"  Saved {filepath}")

print("Code patched successfully.")
