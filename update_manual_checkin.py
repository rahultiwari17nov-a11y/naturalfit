# update_manual_checkin.py
import re

for filepath in ['attendance_code.js', 'assets/index-BvAlUw77.js', 'assets/index-bvaluw77.js']:
    print(f"Updating {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Update searchSuggestions to support letters AND numbers (Member ID / mobile)
    old_suggestions = '''  // ERP Home page (pB) search logic & live hints
  const isSearchLetter = fe.useMemo(() => {
    const q = manualSearch.trim();
    return q ? /[a-zA-Z]/.test(q) : !1;
  }, [manualSearch]);

  const searchSuggestions = fe.useMemo(() => {
    if (!isSearchLetter || !manualSearch.trim()) return [];
    const q = manualSearch.trim().toLowerCase();
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;
    return list.filter(m => m.name && m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [isSearchLetter, manualSearch, allMembersList, members]);'''

    new_suggestions = '''  // ERP Home page (pB) search logic & live hints (supports Name, Member ID, and Mobile)
  const isSearchLetter = fe.useMemo(() => {
    return !!manualSearch.trim();
  }, [manualSearch]);

  const searchSuggestions = fe.useMemo(() => {
    const raw = manualSearch.trim();
    if (!raw) return [];
    const q = raw.toLowerCase().replace(/\\s+/g, " ");
    const cleanDigits = raw.replace(/[^0-9]/g, "");
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;
    return list.filter(m => {
      const name = (m.name || "").replace(/\\s+/g, " ").toLowerCase();
      if (name.includes(q)) return true;
      const memId = String(m.member_id || "").toLowerCase().trim();
      if (memId.includes(q)) return true;
      if (cleanDigits && String(m.id) === cleanDigits) return true;
      if (cleanDigits && cleanDigits.length >= 3 && m.mobile && String(m.mobile).replace(/[^0-9]/g, "").includes(cleanDigits)) return true;
      return false;
    }).slice(0, 8);
  }, [manualSearch, allMembersList, members]);'''

    if old_suggestions in code:
        code = code.replace(old_suggestions, new_suggestions, 1)
        print(f"  [1] Updated searchSuggestions in {filepath}")
    else:
        print(f"  [!] old_suggestions not found in {filepath}")

    # 2. Update handleMemberSearch for whitespace normalization and robust lookup
    old_member_search = '''  const handleMemberSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowSuggestions(!1);
    setSearchError(null);
    const q = manualSearch.trim();
    if (!q) {
      setSearchError("Please enter a Member Name or Member ID to search.");
      return null;
    }
    const qLower = q.toLowerCase();
    const cleanDigits = q.replace(/[^0-9]/g, "");
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;

    let matched = list.find(m => {
      if (!m.member_id) return !1;
      const memIdLower = String(m.member_id).toLowerCase().trim();
      if (memIdLower === qLower) return !0;
      const memDigits = memIdLower.replace(/[^0-9]/g, "");
      return !!(cleanDigits && memDigits === cleanDigits);
    });

    if (!matched && cleanDigits) {
      matched = list.find(m => m.id === Number(cleanDigits));
    }
    if (!matched) {
      matched = list.find(m => (m.name || "").toLowerCase().trim() === qLower);
    }
    if (!matched) {
      matched = list.find(m => (m.name || "").toLowerCase().includes(qLower));
    }
    if (!matched && cleanDigits.length >= 4) {
      matched = list.find(m => m.mobile && String(m.mobile).replace(/[^0-9]/g, "").includes(cleanDigits));
    }
    if (!matched) {
      matched = list.find(m => m.card_uid && String(m.card_uid).toLowerCase().trim() === qLower);
    }

    if (matched) {
      setSelectedMember(matched);
      setSearchError(null);
      return matched;
    } else {
      setSelectedMember(null);
      setSearchError(`No member found matching "${q}". Please check the Member ID or Member Name.`);
      return null;
    }
  };'''

    new_member_search = '''  const handleMemberSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowSuggestions(!1);
    setSearchError(null);
    const q = manualSearch.trim();
    if (!q) {
      setSearchError("Please enter a Member Name or Member ID to search.");
      return null;
    }
    const qNorm = q.replace(/\\s+/g, " ").toLowerCase();
    const cleanDigits = q.replace(/[^0-9]/g, "");
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;

    // 1. Exact match on member_id (e.g. 608, 27)
    let matched = list.find(m => {
      if (!m.member_id) return !1;
      const memIdLower = String(m.member_id).toLowerCase().trim();
      if (memIdLower === qNorm) return !0;
      const memDigits = memIdLower.replace(/[^0-9]/g, "");
      return !!(cleanDigits && memDigits === cleanDigits);
    });

    // 2. Exact match on database id
    if (!matched && cleanDigits) {
      matched = list.find(m => m.id === Number(cleanDigits));
    }
    // 3. Exact normalized name match (handles spaces like 'Prince  soni')
    if (!matched) {
      matched = list.find(m => (m.name || "").replace(/\\s+/g, " ").toLowerCase().trim() === qNorm);
    }
    // 4. Partial normalized name match
    if (!matched) {
      matched = list.find(m => (m.name || "").replace(/\\s+/g, " ").toLowerCase().includes(qNorm));
    }
    // 5. Mobile match
    if (!matched && cleanDigits.length >= 4) {
      matched = list.find(m => m.mobile && String(m.mobile).replace(/[^0-9]/g, "").includes(cleanDigits));
    }
    // 6. Card UID match
    if (!matched) {
      matched = list.find(m => m.card_uid && String(m.card_uid).toLowerCase().trim() === qNorm);
    }

    if (matched) {
      setSelectedMember(matched);
      setSearchError(null);
      return matched;
    } else {
      setSelectedMember(null);
      setSearchError(`No member found matching "${q}". Please check the Member ID or Member Name.`);
      return null;
    }
  };'''

    if old_member_search in code:
        code = code.replace(old_member_search, new_member_search, 1)
        print(f"  [2] Updated handleMemberSearch in {filepath}")
    else:
        print(f"  [!] old_member_search not found in {filepath}")

    # 3. Update handleRecordCheckIn so errors (like Expired, Duplicate, Not Found) stay visible in the modal
    old_record_checkin = '''  const handleRecordCheckIn = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    let target = selectedMember;
    if (!target && manualSearch.trim()) {
      target = handleMemberSearch();
    }
    if (!target) {
      setSearchError("Please search and select a member to record check-in.");
      return;
    }
    setManualSubmitting(!0);
    try {
      const identifier = target.card_uid || target.member_id || target.id;
      const notes = manualNotes.trim() || "Manual Check-in at Desk";
      await executeCheckIn(identifier, notes);
      setShowManualModal(!1);
      setSelectedMember(null);
      setManualSearch("");
      setManualNotes("");
      setSearchError(null);
    } catch(err) {
      console.error("Check-in error:", err);
    } finally {
      setManualSubmitting(!1);
    }
  };'''

    new_record_checkin = '''  const handleRecordCheckIn = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    let target = selectedMember;
    if (!target && manualSearch.trim()) {
      target = handleMemberSearch();
    }
    if (!target) {
      setSearchError("Please search and select a member to record check-in.");
      return;
    }
    setManualSubmitting(!0);
    try {
      const identifier = target.card_uid || target.member_id || target.id;
      const notes = manualNotes.trim() || "Manual Check-in at Desk";
      const result = await executeCheckIn(identifier, notes);
      if (result && result.success) {
        setShowManualModal(!1);
        setSelectedMember(null);
        setManualSearch("");
        setManualNotes("");
        setSearchError(null);
      } else {
        // Show exact rejection / validation reason right inside the modal
        const errMsg = (result && result.error) || "Check-in could not be completed.";
        setSearchError(errMsg);
      }
    } catch(err) {
      console.error("Check-in error:", err);
      setSearchError(err.message || "Failed to communicate with attendance server");
    } finally {
      setManualSubmitting(!1);
    }
  };'''

    if old_record_checkin in code:
        code = code.replace(old_record_checkin, new_record_checkin, 1)
        print(f"  [3] Updated handleRecordCheckIn in {filepath}")
    else:
        print(f"  [!] old_record_checkin not found in {filepath}")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)

print("Done! Running npm run build...")
