# update_attendance_and_icard.py
import subprocess
import os

print("Applying updates to attendance_code.js...")

with open('attendance_code.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update State Declarations around manual check-in
old_state = '''  // Manual Check-in Form state with full search bar
  const [manualSearch, setManualSearch] = fe.useState("");
  const [selectedMember, setSelectedMember] = fe.useState(null);
  const [manualNotes, setManualNotes] = fe.useState("");
  const [manualSubmitting, setManualSubmitting] = fe.useState(!1);
  const searchInputRef = fe.useRef(null);
  fe.useEffect(() => {
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

new_state = '''  // Manual Check-in Form state matching ERP home page pB
  const [manualSearch, setManualSearch] = fe.useState("");
  const [showSuggestions, setShowSuggestions] = fe.useState(!1);
  const [selectedMember, setSelectedMember] = fe.useState(null);
  const [searchError, setSearchError] = fe.useState(null);
  const [manualNotes, setManualNotes] = fe.useState("");
  const [manualSubmitting, setManualSubmitting] = fe.useState(!1);
  const searchInputRef = fe.useRef(null);
  const searchContainerRef = fe.useRef(null);

  // Click outside to dismiss hints dropdown
  fe.useEffect(() => {
    const handleOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(!1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  fe.useEffect(() => {
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

if old_state not in code:
    raise Exception("old_state not found in attendance_code.js!")
code = code.replace(old_state, new_state, 1)
print("1. Manual state updated successfully.")

# 2. Update search helpers: isSearchLetter, searchSuggestions, handleMemberSearch, selectSuggestion, clearManualSearch, handleRecordCheckIn
old_helpers_target = '''  // Comprehensive Member Search matching CRM Member Search (pB) - NO SLICING, ALL MEMBERS
  const filteredCandidates = fe.useMemo(() => {
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;
    const q = manualSearch.trim().toLowerCase();
    if (!q) return list;
    const cleanDigits = q.replace(/[^0-9]/g, "");
    return list.filter(m => {
      const name = (m.name || "").toLowerCase();
      const memId = String(m.member_id || m.id || "").toLowerCase();
      const cardUid = String(m.card_uid || "").toLowerCase();
      const mobile = String(m.mobile || "").replace(/[^0-9]/g, "");
      if (name.includes(q)) return !0;
      if (memId === q || memId.includes(q)) return !0;
      if (cleanDigits && memId.replace(/[^0-9]/g, "").includes(cleanDigits)) return !0;
      if (cardUid.includes(q)) return !0;
      if (cleanDigits && cleanDigits.length >= 3 && mobile.includes(cleanDigits)) return !0;
      return !1;
    });
  }, [allMembersList, members, manualSearch]);'''

new_helpers = '''  // ERP Home page (pB) search logic & live hints
  const isSearchLetter = fe.useMemo(() => {
    const q = manualSearch.trim();
    return q ? /[a-zA-Z]/.test(q) : !1;
  }, [manualSearch]);

  const searchSuggestions = fe.useMemo(() => {
    if (!isSearchLetter || !manualSearch.trim()) return [];
    const q = manualSearch.trim().toLowerCase();
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;
    return list.filter(m => m.name && m.name.toLowerCase().includes(q)).slice(0, 8);
  }, [isSearchLetter, manualSearch, allMembersList, members]);

  const handleMemberSearch = (e) => {
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
  };

  const selectSuggestion = (m) => {
    setSelectedMember(m);
    setManualSearch(m.name || "");
    setShowSuggestions(!1);
    setSearchError(null);
  };

  const clearManualSearch = () => {
    setManualSearch("");
    setShowSuggestions(!1);
    setSelectedMember(null);
    setSearchError(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleRecordCheckIn = async (e) => {
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

if old_helpers_target not in code:
    raise Exception("old_helpers_target not found in attendance_code.js!")
code = code.replace(old_helpers_target, new_helpers, 1)
print("2. Search helpers updated successfully.")

# 3. Update Manual Check-in trigger button to reset search states
old_btn = '''        l.jsxs("button",{
          onClick:()=>{ setSelectedMember(null); setManualSearch(""); setShowManualModal(!0); if (onRefreshMembers) onRefreshMembers(); fetch("/api/members").then(r=>r.json()).then(d=>{if(d&&Array.isArray(d.members))setAllMembersList(d.members);}); },
          className:"px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors shadow-sm cursor-pointer flex items-center gap-1.5",
          children:[
            l.jsx("span",{className:"text-sm leading-none",children:"+"}),
            l.jsx("span",{children:"Manual Check-in"})
          ]
        })'''

new_btn = '''        l.jsxs("button",{
          id:"open-manual-checkin-modal-btn",
          onClick:()=>{
            setSelectedMember(null);
            setManualSearch("");
            setManualNotes("");
            setSearchError(null);
            setShowSuggestions(!1);
            setShowManualModal(!0);
            if (onRefreshMembers) onRefreshMembers();
            fetch("/api/members").then(r=>r.json()).then(d=>{
              const list = Array.isArray(d) ? d : (d && Array.isArray(d.members) ? d.members : []);
              if (list.length > 0) setAllMembersList(list);
            });
          },
          className:"px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors shadow-sm cursor-pointer flex items-center gap-1.5",
          children:[
            l.jsx("span",{className:"text-sm leading-none",children:"+"}),
            l.jsx("span",{children:"Manual Check-in"})
          ]
        })'''

if old_btn not in code:
    raise Exception("old_btn not found in attendance_code.js!")
code = code.replace(old_btn, new_btn, 1)
print("3. Manual Check-in button updated.")

# 4. Remove renewal option and i-card option from Attendance Log Entry table
old_log_actions = '''                l.jsx("td",{className:"py-3 px-4 text-right",children:
                  l.jsxs("div",{className:"flex items-center justify-end gap-1.5",children:[
                    l.jsx("button",{
                      onClick:()=>{
                        const m = (allMembersList && allMembersList.length > 0 ? allMembersList : members).find(x => String(x.member_id) === String(log.member_id) || x.id === log.member_id);
                        if (m) setSelectedCardMember(m);
                        else setSelectedCardMember({ id: log.member_id, member_id: log.member_id, name: log.name, card_uid: log.card_uid, plan_type: log.plan_type, mobile: "" });
                      },
                      className:"p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 transition-colors cursor-pointer",
                      title:"Print Member ID Card / Barcode (No Expiry Date)",
                      children:l.jsx(Do,{className:"w-3.5 h-3.5"})
                    }),
                    l.jsx("button",{
                      onClick:()=>onNavigateTab("search"),
                      className:"px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold transition-colors cursor-pointer",
                      children:"Profile"
                    }),
                    log.status==="expired"&&l.jsx("button",{
                      onClick:()=>onNavigateTab("members"),
                      className:"px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 transition-colors cursor-pointer",
                      children:"Renew"
                    })
                  ]})
                })'''

new_log_actions = '''                l.jsx("td",{className:"py-3 px-4 text-right",children:
                  l.jsx("button",{
                    onClick:()=>onNavigateTab("search"),
                    className:"px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold transition-colors cursor-pointer",
                    children:"Profile"
                  })
                })'''

if old_log_actions not in code:
    raise Exception("old_log_actions not found in attendance_code.js!")
code = code.replace(old_log_actions, new_log_actions, 1)
print("4. Removed renewal option & i-card option from attendance log entry.")

# 5. Update Manual Check-in Modal with:
#    1 - member search bar & member search button (exact same action as ERP home page pB)
#    2 - Along with member search button a desk note field (optional)
#    3 - a "record check-in" button
idx_modal_start = code.find('// MANUAL CHECK-IN MODAL (With Comprehensive Member Search bar same as CRM Member Search pB)')
if idx_modal_start == -1:
    idx_modal_start = code.find('showManualModal&&l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center')
idx_modal_end = code.find('showReportModal&&l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center', idx_modal_start)

if idx_modal_start == -1 or idx_modal_end == -1:
    raise Exception("Modal boundaries not found in attendance_code.js!")

old_modal_chunk = code[idx_modal_start:idx_modal_end]

new_modal_chunk = '''// MANUAL CHECK-IN POPUP MODAL
    showManualModal&&l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",children:[
      l.jsxs("div",{className:"w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-white max-h-[92vh] flex flex-col",children:[
        // Modal Header
        l.jsxs("div",{className:"flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0",children:[
          l.jsxs("div",{className:"flex items-center gap-2.5",children:[
            l.jsx("div",{className:"p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",children:l.jsx(Ic,{className:"w-4 h-4"})}),
            l.jsxs("div",{children:[
              l.jsx("h3",{className:"text-base sm:text-lg font-bold text-white",children:"Reception Desk Manual Check-in"}),
              l.jsx("p",{className:"text-xs text-neutral-400",children:"Search member, enter optional desk note, and click Record Check-in."})
            ]})
          ]}),
          l.jsx("button",{type:"button",onClick:()=>setShowManualModal(!1),className:"text-neutral-400 hover:text-white text-2xl font-light leading-none cursor-pointer p-1",children:"×"})
        ]}),

        // Scrollable Body
        l.jsxs("div",{className:"space-y-4 overflow-y-auto pr-1 flex-1",children:[
          // 1 - Member Search Bar & Search Button (same action exactly as member search button available and perform on ERP home page)
          l.jsxs("div",{ref:searchContainerRef,className:"space-y-1.5 relative",children:[
            l.jsx("label",{className:"block text-xs font-semibold text-neutral-300",children:"1. Member Search Bar"}),
            l.jsxs("form",{
              onSubmit:handleMemberSearch,
              className:"relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2",
              children:[
                l.jsxs("div",{className:"relative flex-1",children:[
                  l.jsx("div",{className:"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400",children:l.jsx(Ic,{className:"w-4 h-4"})}),
                  l.jsx("input",{
                    ref:searchInputRef,
                    id:"manual-member-search-input",
                    type:"text",
                    autoComplete:"off",
                    placeholder:"Search by Member Name (with live hints) or Member ID (e.g. Rahul or 329)...",
                    value:manualSearch,
                    onChange:e=>{ setManualSearch(e.target.value); setShowSuggestions(!0); if(searchError) setSearchError(null); },
                    onFocus:()=>{ if(manualSearch.trim() && isSearchLetter) setShowSuggestions(!0); },
                    className:"w-full pl-10 pr-9 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  }),
                  manualSearch&&l.jsx("button",{
                    type:"button",
                    onClick:clearManualSearch,
                    className:"absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white cursor-pointer text-base leading-none",
                    title:"Clear search",
                    children:"×"
                  }),
                  // Live dropdown suggestions matching ERP home page pB
                  showSuggestions&&isSearchLetter&&searchSuggestions.length>0&&l.jsxs("div",{
                    id:"manual-member-search-hints-dropdown",
                    className:"absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-neutral-900 border-2 border-emerald-500/60 shadow-2xl overflow-hidden backdrop-blur-lg divide-y divide-neutral-800 animate-in fade-in zoom-in-95 duration-150",
                    children:[
                      l.jsxs("div",{className:"px-3.5 py-1.5 bg-neutral-950/90 text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between",children:[
                        l.jsxs("span",{children:["Matching Member Names (",searchSuggestions.length," suggestions)"]}),
                        l.jsx("span",{className:"text-neutral-500 font-normal text-[10px]",children:"Click to select"})
                      ]}),
                      l.jsx("div",{className:"max-h-52 overflow-y-auto",children:searchSuggestions.map(s=>{
                        const sId = s.member_id || `ID: ${s.id}`;
                        const isExp = s.expiry_date ? (new Date(s.expiry_date) < new Date(new Date().setHours(0,0,0,0))) : !1;
                        return l.jsxs("button",{
                          key:s.id,
                          type:"button",
                          onClick:()=>selectSuggestion(s),
                          className:"w-full px-3 py-2 text-left hover:bg-neutral-800/90 transition-colors flex items-center justify-between gap-2.5 cursor-pointer",
                          children:[
                            l.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[
                              l.jsx("div",{className:"w-7 h-7 rounded-lg bg-neutral-800 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-neutral-700",children:(s.name||"M")[0].toUpperCase()}),
                              l.jsxs("div",{className:"min-w-0",children:[
                                l.jsxs("div",{className:"flex items-center gap-2",children:[
                                  l.jsx("span",{className:"text-xs font-bold text-white truncate",children:s.name}),
                                  l.jsx("span",{className:"px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700",children:sId})
                                ]}),
                                l.jsxs("div",{className:"text-[10px] text-neutral-400 mt-0.5",children:[s.mobile||"No mobile"," • ",s.plan_type||"Plan"]})
                              ]})
                            ]}),
                            isExp?l.jsx("span",{className:"px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0",children:"Expired"}):
                            l.jsx("span",{className:"px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0",children:"Active"})
                          ]
                        });
                      })})
                    ]
                  })
                ]}),
                // Member search button (same action exactly as member search button available and perform on ERP home page)
                l.jsxs("button",{
                  type:"submit",
                  id:"manual-member-search-btn",
                  className:"px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer",
                  children:[
                    l.jsx(Ic,{className:"w-3.5 h-3.5 shrink-0"}),
                    l.jsx("span",{children:"Search Member"})
                  ]
                })
              ]
            }),
            searchError&&l.jsxs("div",{className:"p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 mt-2",children:[
              l.jsx("span",{className:"text-sm",children:"⚠"}),
              l.jsx("span",{children:searchError})
            ]})
          ]}),

          // Selected Member Preview Card (Displays details when member is selected/found)
          selectedMember&&l.jsxs("div",{className:"p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 shadow-inner",children:[
            l.jsxs("div",{className:"flex items-start justify-between gap-3 pb-2 border-b border-neutral-800/80",children:[
              l.jsxs("div",{className:"flex items-center gap-2.5",children:[
                l.jsx("div",{className:"w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/30 text-sm shrink-0",children:
                  (selectedMember.name||"M")[0].toUpperCase()
                }),
                l.jsxs("div",{children:[
                  l.jsx("h4",{className:"text-sm font-bold text-white",children:selectedMember.name}),
                  l.jsxs("div",{className:"text-[11px] text-neutral-400 flex items-center gap-2",children:[
                    l.jsxs("span",{className:"text-emerald-400 font-mono font-bold",children:["ID: ",selectedMember.member_id||selectedMember.id]}),
                    l.jsx("span",{children:"•"}),
                    l.jsx("span",{children:selectedMember.mobile||"No mobile"})
                  ]})
                ]})
              ]}),
              l.jsxs("div",{className:"flex items-center gap-2",children:[
                l.jsx("span",{className:`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isSelectedMemberExpired?"bg-red-500/20 text-red-400 border border-red-500/30":"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`,children:isSelectedMemberExpired?"Membership Expired":"Membership Active"}),
                l.jsx("button",{type:"button",onClick:clearManualSearch,className:"text-neutral-400 hover:text-white text-xs underline cursor-pointer",children:"Change"})
              ]})
            ]}),

            l.jsxs("div",{className:"grid grid-cols-2 gap-2 text-xs",children:[
              l.jsxs("div",{className:"p-2 rounded-lg bg-neutral-900 border border-neutral-800/80",children:[
                l.jsx("span",{className:"text-[10px] uppercase text-neutral-500 block font-semibold",children:"Membership Plan"}),
                l.jsx("span",{className:"font-bold text-white",children:selectedMember.plan_type||"Regular"})
              ]}),
              l.jsxs("div",{className:"p-2 rounded-lg bg-neutral-900 border border-neutral-800/80",children:[
                l.jsx("span",{className:"text-[10px] uppercase text-neutral-500 block font-semibold",children:"Plan Expiry Date"}),
                l.jsx("span",{className:`font-bold font-mono ${isSelectedMemberExpired?"text-red-400":"text-emerald-400"}`,children:
                  window.__fmtDMY?window.__fmtDMY(selectedMember.expiry_date):(selectedMember.expiry_date||"--")
                })
              ]})
            ]}),

            selectedMemberCheckedInToday&&l.jsxs("div",{className:"p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center gap-2",children:[
              l.jsx("span",{className:"text-base",children:"⚠"}),
              l.jsxs("span",{children:[
                "Already checked in today at ",
                selectedMemberCheckedInToday.check_in_time?selectedMemberCheckedInToday.check_in_time.split(" ")[1]:"earlier",
                "."
              ]})
            ]}),

            isSelectedMemberExpired&&l.jsxs("div",{className:"p-2 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-semibold flex items-center gap-2",children:[
              l.jsx("span",{className:"text-base",children:"⛔"}),
              l.jsxs("span",{children:[
                "Membership expired on ",
                window.__fmtDMY?window.__fmtDMY(selectedMember.expiry_date):selectedMember.expiry_date,
                "."
              ]})
            ]})
          ]}),

          // 2 - Along with member search button a desk note field (optional) should be available
          l.jsxs("div",{className:"space-y-1.5",children:[
            l.jsx("label",{className:"block text-xs font-semibold text-neutral-300",children:"2. Desk Note (Optional)"}),
            l.jsx("input",{
              id:"manual-desk-note-input",
              type:"text",
              placeholder:"e.g. Verified at reception desk, forgot RFID tag at home",
              value:manualNotes,
              onChange:e=>setManualNotes(e.target.value),
              className:"w-full px-3 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
            })
          ]})
        ]}),

        // 3 - A "record check-in" button (submit the attendance by clicking on it)
        l.jsxs("div",{className:"flex items-center justify-end gap-3 pt-3 border-t border-neutral-800 shrink-0",children:[
          l.jsx("button",{
            type:"button",
            onClick:()=>setShowManualModal(!1),
            className:"px-4 py-2.5 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer transition-colors",
            children:"Cancel"
          }),
          l.jsxs("button",{
            id:"record-checkin-submit-btn",
            type:"button",
            disabled:manualSubmitting,
            onClick:handleRecordCheckIn,
            className:`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              manualSubmitting?
              "bg-neutral-800 text-neutral-500 cursor-not-allowed":
              "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95"
            }`,
            children:[
              l.jsx("span",{children:"✓"}),
              l.jsx("span",{children:manualSubmitting?"Recording Check-in...":"Record Check-in"})
            ]
          })
        ]})
      ]})
    ]}),

    '''

code = code.replace(old_modal_chunk, new_modal_chunk, 1)
print("5. Manual Check-in Modal updated with member search bar, desk note field, and record check-in button.")

# 6. ID CARD: "dont show plan details on i card ."
old_card_plan_html = '''              l.jsx("h4",{className:"font-bold text-sm text-white",children:selectedCardMember.name}),
              l.jsxs("div",{className:"text-[11px] font-mono text-emerald-400 font-bold",children:["ID: ",selectedCardMember.member_id||selectedCardMember.id]}),
              l.jsxs("div",{className:"text-[10px] text-neutral-400",children:["Plan: ",selectedCardMember.plan_type||"Regular"]})'''

new_card_plan_html = '''              l.jsx("h4",{className:"font-bold text-sm text-white",children:selectedCardMember.name}),
              l.jsxs("div",{className:"text-[11px] font-mono text-emerald-400 font-bold",children:["ID: ",selectedCardMember.member_id||selectedCardMember.id]})'''

if old_card_plan_html not in code:
    raise Exception("old_card_plan_html not found in attendance_code.js!")
code = code.replace(old_card_plan_html, new_card_plan_html, 1)

old_card_pdf_plan = '''                doc.setTextColor(34, 197, 94);
                doc.setFontSize(8);
                doc.text(`ID: ${selectedCardMember.member_id || selectedCardMember.id}`, 6, 23);
                doc.setTextColor(156, 163, 175);
                doc.setFontSize(7);
                doc.text(`Plan: ${selectedCardMember.plan_type || "Standard"}`, 6, 28);

                const canvas = document.getElementById("card-barcode-canvas");
                if (canvas) {
                  const dataUrl = canvas.toDataURL("image/png");
                  doc.addImage(dataUrl, "PNG", 6, 32, 73.6, 14);
                }'''

new_card_pdf_plan = '''                doc.setTextColor(34, 197, 94);
                doc.setFontSize(8);
                doc.text(`ID: ${selectedCardMember.member_id || selectedCardMember.id}`, 6, 23);

                const canvas = document.getElementById("card-barcode-canvas");
                if (canvas) {
                  const dataUrl = canvas.toDataURL("image/png");
                  doc.addImage(dataUrl, "PNG", 6, 28, 73.6, 16);
                }'''

if old_card_pdf_plan not in code:
    raise Exception("old_card_pdf_plan not found in attendance_code.js!")
code = code.replace(old_card_pdf_plan, new_card_pdf_plan, 1)
print("6. Removed plan details from i-card preview and PDF.")

# Save updated attendance_code.js
with open('attendance_code.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("attendance_code.js saved successfully! Length:", len(code))
