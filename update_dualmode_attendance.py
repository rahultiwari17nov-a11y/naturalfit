# update_dualmode_attendance.py
import sys

files = ['attendance_code.js', 'assets/index-BvAlUw77.js', 'assets/index-bvaluw77.js']

for filepath in files:
    print(f"Processing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Update Member Fetching on modal open and startup
    old_member_fetch = '''  fe.useEffect(() => {
    if (showManualModal) {
      fetch("/api/members")
        .then(r => r.json())
        .then(d => {
          const list = Array.isArray(d) ? d : (d && Array.isArray(d.members) ? d.members : []);
          if (list.length > 0) setAllMembersList(list);
        })
        .catch(e => console.warn("Failed fetching /api/members on modal open:", e));
    }
  }, [showManualModal]);'''

    new_member_fetch = '''  const loadMembers = fe.useCallback(async () => {
    try {
      const r = await fetch("/api/members");
      if (r.ok) {
        const text = await r.text();
        if (text && !text.trim().startsWith("<")) {
          const d = JSON.parse(text);
          const list = Array.isArray(d) ? d : (d && Array.isArray(d.members) ? d.members : []);
          if (list.length > 0) {
            setAllMembersList(list);
            return;
          }
        }
      }
    } catch (_) {}
    // Fallback: Direct Supabase REST API fetch (works on Netlify and static deployments)
    try {
      const sbRes = await fetch("https://kkhnpgztzfpmjltsuhmo.supabase.co/rest/v1/members?select=*&order=id.desc", {
        headers: {
          "apikey": "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU",
          "Authorization": "Bearer sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU"
        }
      });
      if (sbRes.ok) {
        const list = await sbRes.json();
        if (Array.isArray(list) && list.length > 0) {
          setAllMembersList(list);
        }
      }
    } catch (e) {
      console.warn("Direct Supabase members load fallback warning:", e);
    }
  }, []);

  fe.useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  fe.useEffect(() => {
    if (showManualModal) {
      loadMembers();
    }
  }, [showManualModal, loadMembers]);'''

    if old_member_fetch in code:
        code = code.replace(old_member_fetch, new_member_fetch, 1)
        print(f"  [1] Updated member fetching in {filepath}")
    else:
        print(f"  [!] old_member_fetch not matched in {filepath}")

    # 2. Update fetchLogs to support direct Supabase fallback
    old_fetch_logs = '''  const fetchLogs = fe.useCallback(async () => {
    setIsLoading(!0);
    try {
      let url = "/api/attendance?";
      if (timeframeMode === "single") {
        url += `start_date=${singleDate}&end_date=${singleDate}`;
      } else {
        url += `start_date=${rangeStart}&end_date=${rangeEnd}`;
      }
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch(e) {
      console.error("Error fetching attendance logs:", e);
    } finally {
      setIsLoading(!1);
    }
  }, [timeframeMode, singleDate, rangeStart, rangeEnd, statusFilter, searchQuery]);'''

    new_fetch_logs = '''  const fetchLogs = fe.useCallback(async () => {
    setIsLoading(!0);
    let loadedFromApi = false;
    try {
      let url = "/api/attendance?";
      if (timeframeMode === "single") {
        url += `start_date=${singleDate}&end_date=${singleDate}`;
      } else {
        url += `start_date=${rangeStart}&end_date=${rangeEnd}`;
      }
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith("<")) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            setLogs(data);
            loadedFromApi = true;
          }
        }
      }
    } catch(e) {
      console.warn("Express /api/attendance call failed, trying direct Supabase fallback:", e);
    }
    if (!loadedFromApi) {
      try {
        let sbUrl = "https://kkhnpgztzfpmjltsuhmo.supabase.co/rest/v1/attendance?select=id,member_id,check_in_time,status,reception_notes&order=id.desc&limit=50";
        if (statusFilter !== "all") {
          sbUrl += `&status=eq.${encodeURIComponent(statusFilter)}`;
        }
        const sbRes = await fetch(sbUrl, {
          headers: {
            "apikey": "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU",
            "Authorization": "Bearer sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU"
          }
        });
        if (sbRes.ok) {
          const rawLogs = await sbRes.json();
          if (Array.isArray(rawLogs)) {
            const enriched = rawLogs.map(log => {
              const m = (allMembersList || []).find(mem => mem.id === log.member_id || String(mem.member_id) === String(log.member_id));
              return {
                ...log,
                member_name: m ? m.name : `Member #${log.member_id}`,
                member_code: m ? (m.member_id || m.card_uid) : String(log.member_id),
                plan_type: m ? m.plan_type : "Standard",
                profile_picture: m ? m.profile_picture : "",
                mobile: m ? m.mobile : ""
              };
            });
            setLogs(enriched);
          }
        }
      } catch (sbErr) {
        console.warn("Direct Supabase attendance logs fallback warning:", sbErr);
      }
    }
    setIsLoading(!1);
  }, [timeframeMode, singleDate, rangeStart, rangeEnd, statusFilter, searchQuery, allMembersList]);'''

    if old_fetch_logs in code:
        code = code.replace(old_fetch_logs, new_fetch_logs, 1)
        print(f"  [2] Updated fetchLogs in {filepath}")
    else:
        print(f"  [!] old_fetch_logs not matched in {filepath}")

    # 3. Update executeCheckIn with direct Supabase fallback
    old_execute_checkin_head = '''  const executeCheckIn = async (rawIdentifier, notes = "") => {'''
    
    # We will define executeDirectSupabaseCheckIn right above executeCheckIn
    direct_supabase_checkin_func = '''  const executeDirectSupabaseCheckIn = async (cleanIdentifier, checkInNotes, memberHint) => {
    const sbKey = "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU";
    const sbUrl = "https://kkhnpgztzfpmjltsuhmo.supabase.co";
    const sbHeaders = {
      "apikey": sbKey,
      "Authorization": `Bearer ${sbKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    try {
      const cleanId = String(cleanIdentifier).trim();
      let target = memberHint;
      if (!target) {
        const isNum = !isNaN(Number(cleanId));
        const filter = isNum ? `(member_id.eq.${cleanId},mobile.eq.${cleanId},id.eq.${cleanId})` : `(member_id.eq.${cleanId},mobile.eq.${cleanId})`;
        const mRes = await fetch(`${sbUrl}/rest/v1/members?or=${encodeURIComponent(filter)}`, { headers: sbHeaders });
        if (mRes.ok) {
          const list = await mRes.json();
          if (Array.isArray(list) && list.length > 0) target = list[0];
        }
      }

      if (!target || !target.id) {
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "unregistered",
          title: "ACCESS DENIED (Unregistered Card)",
          message: `ACCESS DENIED: Card UID / Member ID "${cleanId}" not found in database.`,
          time: new Date().toLocaleTimeString("en-IN")
        });
        return { success: !1, error: `Member ID "${cleanId}" not found in database.` };
      }

      // Check Expiry
      let expDate = null;
      if (target.expiry_date) {
        const cleanExp = String(target.expiry_date).trim().split("T")[0].split(" ")[0];
        const parts = cleanExp.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          else if (parts[2].length === 4) expDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
      const today0 = new Date();
      today0.setHours(0, 0, 0, 0);
      if (expDate) expDate.setHours(0, 0, 0, 0);

      if (expDate && expDate < today0) {
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
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "expired",
          title: "Membership Expired",
          message: "Member plan has expired, please renew plan to continue",
          time: new Date().toLocaleTimeString("en-IN")
        });
        fetchLogs();
        return { success: !1, error: "Member plan has expired, please renew plan to continue", status: "expired" };
      }

      // Check duplicate check-in today
      const todayIso = new Date().toISOString().split("T")[0];
      const dupRes = await fetch(`${sbUrl}/rest/v1/attendance?member_id=eq.${target.id}&status=eq.valid&check_in_time=gte.${todayIso}T00:00:00Z&check_in_time=lte.${todayIso}T23:59:59Z`, {
        headers: sbHeaders
      });
      if (dupRes.ok) {
        const dups = await dupRes.json();
        if (Array.isArray(dups) && dups.length > 0) {
          let timeStr = "earlier today";
          if (dups[0].check_in_time) {
            try { timeStr = new Date(dups[0].check_in_time).toLocaleTimeString("en-IN"); } catch (_) {}
          }
          playSynthesizedTone("duplicate", isMuted);
          setAlertBanner({
            type: "duplicate",
            title: "Duplicate Attendance Blocked",
            message: `Duplicate Attendance Blocked: ${target.name} already checked in today at ${timeStr}. Multiple check-ins on the same day are not permitted.`,
            time: new Date().toLocaleTimeString("en-IN")
          });
          return { success: !1, error: `Duplicate Attendance Blocked: ${target.name} already checked in today at ${timeStr}.` };
        }
      }

      // Save valid check-in
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
      });

      playSynthesizedTone("valid", isMuted);
      const expStr = target.expiry_date ? (window.__fmtDMY ? window.__fmtDMY(target.expiry_date) : target.expiry_date) : "--";
      setAlertBanner({
        type: "valid",
        title: "Check-in Approved (24/7 Access Granted)",
        message: `Welcome ${target.name}! Plan active till ${expStr}.`,
        time: new Date().toLocaleTimeString("en-IN")
      });
      fetchLogs();
      return { success: !0, data: { success: !0, member: target, status: "valid" } };
    } catch (e) {
      console.error("Direct Supabase check-in error:", e);
      playSynthesizedTone("denied", isMuted);
      setAlertBanner({
        type: "error",
        title: "Check-in Error",
        message: "Failed to communicate with attendance server or Supabase: " + e.message,
        time: new Date().toLocaleTimeString("en-IN")
      });
      return { success: !1, error: e.message };
    }
  };

  const executeCheckIn = async (rawIdentifier, notes = "") => {'''

    if direct_supabase_checkin_func not in code:
        code = code.replace(old_execute_checkin_head, direct_supabase_checkin_func, 1)
        print(f"  [3] Injected executeDirectSupabaseCheckIn in {filepath}")

    # Now inside executeCheckIn, update response handling to trigger direct Supabase fallback if Netlify / static 404 / HTML occurs
    old_res_handling = '''      let data = {};
      let responseText = "";
      try {
        responseText = await res.text();
        data = JSON.parse(responseText);
      } catch (parseErr) {
        data = {};
      }'''

    new_res_handling = '''      let data = {};
      let responseText = "";
      try {
        responseText = await res.text();
        data = JSON.parse(responseText);
      } catch (parseErr) {
        data = {};
      }

      // If backend returns HTML or static 404 (e.g. on Netlify where Express is not running):
      const isHtml = !responseText || responseText.trim().startsWith("<") || responseText.includes("<!DOCTYPE");
      if ((isHtml || res.status === 404 || res.status === 405) && !data.status) {
        return await executeDirectSupabaseCheckIn(identifier, notes, localMember);
      }'''

    if old_res_handling in code:
        code = code.replace(old_res_handling, new_res_handling, 1)
        print(f"  [4] Added fallback trigger to executeCheckIn in {filepath}")
    else:
        print(f"  [!] old_res_handling not matched in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Saved {filepath}")

print("All files updated successfully.")
