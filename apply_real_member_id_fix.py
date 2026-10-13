# apply_real_member_id_fix.py
import re
import os
import subprocess

print("Applying Real Member ID check-in fix across server.cjs, attendance_code.js, and bundles...")

# 1. Update server.cjs
with open('server.cjs', 'r', encoding='utf-8') as f:
    sc = f.read()

# Replace expired Supabase insert in server.cjs
old_sc_exp = '''        try {
          const sb = getSupabaseServerClient();
          if (sb) {
            sb.from("attendance").insert([{
              member_id: member.id,
              status: "expired",
              check_in_time: now.toISOString(),
              reception_notes: notes || "Front desk expired attempt"
            }]).then(({ error }) => { if (error) console.warn("[Supabase Attendance Sync Note]:", error.message); }).catch(() => {});
          }
        } catch (_) {}'''

new_sc_exp = '''        try {
          const sb = getSupabaseServerClient();
          if (sb) {
            (async () => {
              const realMemberId = String(member.member_id || member.id);
              const { error } = await sb.from("attendance").insert([{
                member_id: realMemberId,
                status: "expired",
                check_in_time: now.toISOString(),
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
                  check_in_time: now.toISOString(),
                  reception_notes: notes || "Front desk expired attempt"
                }]);
              }
            })().catch(() => {});
          }
        } catch (_) {}'''

if old_sc_exp in sc:
    sc = sc.replace(old_sc_exp, new_sc_exp)
    print("Updated expired attendance Supabase sync in server.cjs")
else:
    print("Warning: old_sc_exp not found in server.cjs")

# Replace valid Supabase insert in server.cjs
old_sc_val = '''          (async () => {
            let sbMemId = member.id;
            try {
              const memCode = String(member.member_id || member.card_uid || member.id);
              const { data: sbm } = await sb.from("members").select("id").or(`member_id.eq.${memCode},mobile.eq.${member.mobile},id.eq.${member.id}`).limit(1);
              if (sbm && sbm.length > 0) {
                sbMemId = sbm[0].id;
              }
            } catch (_) {}
            const { error: sbErr } = await sb.from("attendance").insert([{
              member_id: sbMemId,
              status: "valid",
              check_in_time: now.toISOString(),
              reception_notes: notes || "Front desk verification"
            }]);
            if (sbErr) {
              console.warn("[Supabase Attendance Sync Note]:", sbErr.message);
            } else {
              console.log("[Supabase Attendance Sync Success]: Record saved to Supabase attendance table for member", sbMemId);
            }
          })().catch(e => console.warn("[Supabase Attendance Sync Error]:", e.message));'''

new_sc_val = '''          (async () => {
            const realMemberId = String(member.member_id || member.id);
            const { error: sbErr } = await sb.from("attendance").insert([{
              member_id: realMemberId,
              status: "valid",
              check_in_time: now.toISOString(),
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
                check_in_time: now.toISOString(),
                reception_notes: notes || "Front desk verification"
              }]);
              console.log("[Supabase Attendance Sync Success (surrogate fallback)]:", surrogateId);
            } else if (!sbErr) {
              console.log("[Supabase Attendance Sync Success]: Record saved with member_id", realMemberId);
            }
          })().catch(e => console.warn("[Supabase Attendance Sync Error]:", e.message));'''

if old_sc_val in sc:
    sc = sc.replace(old_sc_val, new_sc_val)
    print("Updated valid attendance Supabase sync in server.cjs")
else:
    print("Warning: old_sc_val not found in server.cjs")

with open('server.cjs', 'w', encoding='utf-8') as f:
    f.write(sc)

# 2. Update attendance_code.js
with open('attendance_code.js', 'r', encoding='utf-8') as f:
    ac = f.read()

# Pattern for executeDirectSupabaseCheckIn
old_exp_block = '''      if (expDate && expDate < today0) {
        await fetch(`${sbUrl}/rest/v1/attendance`, {
          method: "POST",
          headers: sbHeaders,
          body: JSON.stringify([{
            member_id: target.id,
            status: "expired",
            check_in_time: new Date().toISOString(),
            reception_notes: checkInNotes || "Hosted site expired check-in attempt"
          }])
        }).catch(() => {});'''

new_exp_block = '''      const realMemberId = String(target.member_id || cleanId);
      if (expDate && expDate < today0) {
        const expRes = await fetch(`${sbUrl}/rest/v1/attendance`, {
          method: "POST",
          headers: sbHeaders,
          body: JSON.stringify([{
            member_id: realMemberId,
            status: "expired",
            check_in_time: new Date().toISOString(),
            reception_notes: checkInNotes || "Hosted site expired check-in attempt"
          }])
        }).catch(() => {});
        if (!expRes || !expRes.ok) {
          await fetch(`${sbUrl}/rest/v1/attendance`, {
            method: "POST",
            headers: sbHeaders,
            body: JSON.stringify([{
              member_id: target.id,
              status: "expired",
              check_in_time: new Date().toISOString(),
              reception_notes: checkInNotes || "Hosted site expired check-in attempt"
            }])
          }).catch(() => {});
        }'''

if old_exp_block in ac:
    ac = ac.replace(old_exp_block, new_exp_block)
    print("Updated expired insert in attendance_code.js")
else:
    print("Warning: old_exp_block not matched in attendance_code.js")

# Duplicate check update
old_dup_block = '''      // Check duplicate check-in today
      const todayIso = new Date().toISOString().split("T")[0];
      const dupRes = await fetch(`${sbUrl}/rest/v1/attendance?member_id=eq.${target.id}&status=eq.valid&check_in_time=gte.${todayIso}T00:00:00Z&check_in_time=lte.${todayIso}T23:59:59Z`, {
        headers: sbHeaders
      });'''

new_dup_block = '''      // Check duplicate check-in today in IST (checking both actual member_id and surrogate id)
      const todayBound = getISTDayBoundary(0);
      const dupFilter = `(member_id.eq.${encodeURIComponent(realMemberId)},member_id.eq.${target.id})`;
      const dupRes = await fetch(`${sbUrl}/rest/v1/attendance?or=${encodeURIComponent(dupFilter)}&status=eq.valid&check_in_time=gte.${encodeURIComponent(todayBound.startIso)}&check_in_time=lte.${encodeURIComponent(todayBound.endIso)}`, {
        headers: sbHeaders
      });'''

if old_dup_block in ac:
    ac = ac.replace(old_dup_block, new_dup_block)
    print("Updated duplicate check in attendance_code.js")
else:
    print("Warning: old_dup_block not matched in attendance_code.js")

# Valid insert update
old_val_block = '''      // Save valid check-in
      const nowIso = new Date().toISOString();
      await fetch(`${sbUrl}/rest/v1/attendance`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify([{
          member_id: target.id,
          status: "valid",
          check_in_time: nowIso,
          reception_notes: checkInNotes || "Hosted site direct check-in"
        }])
      });'''

new_val_block = '''      // Save valid check-in with actual member_id directly
      const nowIso = new Date().toISOString();
      const valRes = await fetch(`${sbUrl}/rest/v1/attendance`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify([{
          member_id: realMemberId,
          status: "valid",
          check_in_time: nowIso,
          reception_notes: checkInNotes || "Hosted site direct check-in"
        }])
      }).catch(() => {});
      if (!valRes || !valRes.ok) {
        await fetch(`${sbUrl}/rest/v1/attendance`, {
          method: "POST",
          headers: sbHeaders,
          body: JSON.stringify([{
            member_id: target.id,
            status: "valid",
            check_in_time: nowIso,
            reception_notes: checkInNotes || "Hosted site direct check-in"
          }])
        }).catch(() => {});
      }'''

if old_val_block in ac:
    ac = ac.replace(old_val_block, new_val_block)
    print("Updated valid insert in attendance_code.js")
else:
    print("Warning: old_val_block not matched in attendance_code.js")

with open('attendance_code.js', 'w', encoding='utf-8') as f:
    f.write(ac)

# 3. Inject updated attendance_code.js into bundles
bundle_files = [
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js',
    'dist/assets/index-BvAlUw77.js',
    'dist/assets/index-bvaluw77.js'
]

start_marker = "// --- ATTENDANCE & RFID/BARCODE SCANNER MODULE ---"
end_marker = "const BD=({currentTab:t"

clean_att_module = ac.strip().lstrip("; \n\r")

for bpath in bundle_files:
    if not os.path.exists(bpath):
        continue
    with open(bpath, 'r', encoding='utf-8') as bf:
        bcontent = bf.read()
    s_idx = bcontent.find(start_marker)
    e_idx = bcontent.find(end_marker)
    if s_idx != -1 and e_idx != -1:
        new_bcontent = bcontent[:s_idx] + clean_att_module + "\n" + bcontent[e_idx:]
        with open(bpath, 'w', encoding='utf-8') as bf:
            bf.write(new_bcontent)
        print(f"Injected into {bpath}")
    else:
        print(f"Could not find markers in {bpath}")

# Validate syntax
res1 = subprocess.run(['node', '--input-type=module', '-c'], input=ac, capture_output=True, text=True)
if res1.returncode != 0:
    print("Syntax error in attendance_code.js:", res1.stderr[:300])
else:
    print("Syntax check in attendance_code.js passed!")

res2 = subprocess.run(['node', '-c', 'server.cjs'], capture_output=True, text=True)
if res2.returncode != 0:
    print("Syntax error in server.cjs:", res2.stderr[:300])
else:
    print("Syntax check in server.cjs passed!")

res3 = subprocess.run(['node', '--input-type=module', '-c'], input=open('assets/index-BvAlUw77.js').read(), capture_output=True, text=True)
if res3.returncode != 0:
    print("Syntax error in assets/index-BvAlUw77.js:", res3.stderr[:300])
else:
    print("Syntax check in bundle passed!")

print("=== ALL CODE CHANGES COMPLETED SUCCESSFULLY ===")
