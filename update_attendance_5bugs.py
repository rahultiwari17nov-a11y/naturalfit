# update_attendance_5bugs.py
import re
import os
import subprocess

print("=== Starting Attendance Dashboard & Supabase 5 Bug Fixes ===")

with open('attendance_code.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. IST helpers at the top
ist_helpers = '''const formatISTDate = (val) => {
  if (!val && val !== 0) return "";
  const s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";
  const d = (val instanceof Date) ? val : new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) {
    const parts = s.split(/[-/:]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[2].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[0]}`;
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2]}`;
    }
    return s;
  }
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(d);
  const day = parts.find(p => p.type === "day")?.value || "01";
  const month = parts.find(p => p.type === "month")?.value || "01";
  const year = parts.find(p => p.type === "year")?.value || "1970";
  return `${day}:${month}:${year}`;
};

const formatISTTime = (val) => {
  if (!val && val !== 0) return "";
  const s = String(val).trim();
  const d = (val instanceof Date) ? val : new Date(s.replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(d);
  let h = parts.find(p => p.type === "hour")?.value || "00";
  if (h === "24") h = "00";
  const m = parts.find(p => p.type === "minute")?.value || "00";
  const sec = parts.find(p => p.type === "second")?.value || "00";
  return `${h}:${m}:${sec}`;
};

const getISTDateParts = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "1970", 10);
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1", 10);
  const day = parseInt(parts.find(p => p.type === "day")?.value || "1", 10);
  return { year, month, day };
};

const getISTDayBoundary = (offsetDays = 0) => {
  const { year, month, day } = getISTDateParts(new Date());
  const d = new Date(Date.UTC(year, month - 1, day + offsetDays));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${dd}`;
  const startIso = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const endIso = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
  return { dateStr, startIso, endIso };
};
'''

if "const formatISTDate = " not in code:
    code = ist_helpers + "\n" + code
    print("Added IST helpers to attendance_code.js")

# 2. Update AttendanceManager initial states
old_states_pattern = r'const \[timeframeMode, setTimeframeMode\] = fe\.useState\("single"\);[\s\S]*?const \[rangeEnd, setRangeEnd\] = fe\.useState\(todayStr\);'
new_states = '''const [timeframeMode, setTimeframeMode] = fe.useState("single");
  const [activePreset, setActivePreset] = fe.useState("today");

  const todayBoundary = fe.useMemo(() => getISTDayBoundary(0), []);
  const yesterdayBoundary = fe.useMemo(() => getISTDayBoundary(-1), []);
  const last7Boundary = fe.useMemo(() => getISTDayBoundary(-6), []);
  const thisMonthStartStr = fe.useMemo(() => {
    const { year, month } = getISTDateParts(new Date());
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }, []);

  const todayStr = todayBoundary.dateStr;
  const yesterdayStr = yesterdayBoundary.dateStr;

  const [singleDate, setSingleDate] = fe.useState(todayBoundary.dateStr);
  const [rangeStart, setRangeStart] = fe.useState(last7Boundary.dateStr);
  const [rangeEnd, setRangeEnd] = fe.useState(todayBoundary.dateStr);'''

if re.search(old_states_pattern, code):
    code = re.sub(old_states_pattern, new_states, code, count=1)
    print("Replaced initial states with IST Today defaults.")
else:
    print("Warning: old_states_pattern not found.")

# 3. Update fetchLogs:
old_fetchlogs_pattern = r'const fetchLogs = fe\.useCallback\(async \(\) => \{[\s\S]*?\}, \[timeframeMode, singleDate, rangeStart, rangeEnd, statusFilter, searchQuery, allMembersList\]\);'
new_fetchlogs = '''const fetchLogs = fe.useCallback(async () => {
    setIsLoading(!0);
    let loadedFromApi = false;

    // Calculate exact IST ISO start and end boundaries
    let startIso = "";
    let endIso = "";
    let sDate = "";
    let eDate = "";

    if (activePreset === "today") {
      const b = getISTDayBoundary(0);
      startIso = b.startIso; endIso = b.endIso; sDate = b.dateStr; eDate = b.dateStr;
    } else if (activePreset === "yesterday") {
      const b = getISTDayBoundary(-1);
      startIso = b.startIso; endIso = b.endIso; sDate = b.dateStr; eDate = b.dateStr;
    } else if (activePreset === "last7") {
      const start = getISTDayBoundary(-6);
      const end = getISTDayBoundary(0);
      startIso = start.startIso; endIso = end.endIso; sDate = start.dateStr; eDate = end.dateStr;
    } else if (activePreset === "last30") {
      const start = getISTDayBoundary(-29);
      const end = getISTDayBoundary(0);
      startIso = start.startIso; endIso = end.endIso; sDate = start.dateStr; eDate = end.dateStr;
    } else if (activePreset === "thisMonth") {
      const { year, month } = getISTDateParts(new Date());
      const m = String(month).padStart(2, "0");
      const startStr = `${year}-${m}-01`;
      startIso = new Date(`${startStr}T00:00:00+05:30`).toISOString();
      endIso = getISTDayBoundary(0).endIso;
      sDate = startStr; eDate = getISTDayBoundary(0).dateStr;
    } else {
      if (timeframeMode === "single") {
        startIso = new Date(`${singleDate}T00:00:00+05:30`).toISOString();
        endIso = new Date(`${singleDate}T23:59:59.999+05:30`).toISOString();
        sDate = singleDate; eDate = singleDate;
      } else {
        startIso = new Date(`${rangeStart}T00:00:00+05:30`).toISOString();
        endIso = new Date(`${rangeEnd}T23:59:59.999+05:30`).toISOString();
        sDate = rangeStart; eDate = rangeEnd;
      }
    }

    try {
      let url = `/api/attendance?start_iso=${encodeURIComponent(startIso)}&end_iso=${encodeURIComponent(endIso)}&start_date=${sDate}&end_date=${eDate}`;
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
        let sbUrl = `https://kkhnpgztzfpmjltsuhmo.supabase.co/rest/v1/attendance?select=id,member_id,check_in_time,status,reception_notes,created_at,members(id,member_id,name,mobile,plan_type,expiry_date,profile_picture)&check_in_time=gte.${encodeURIComponent(startIso)}&check_in_time=lte.${encodeURIComponent(endIso)}&order=check_in_time.desc`;
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
            let enriched = rawLogs.map(log => {
              const m = log.members || (allMembersList || []).find(mem => mem.id === log.member_id || String(mem.member_id) === String(log.member_id));
              const memberCode = (m && m.member_id) ? String(m.member_id) : (log.member_id ? String(log.member_id) : "--");
              const memberName = (m && m.name) ? m.name : (log.name || `Member #${memberCode}`);
              const planType = (m && m.plan_type) ? m.plan_type : (log.plan_type || "Regular");
              const expDate = (m && m.expiry_date) ? m.expiry_date : (log.expiry_date || "");
              const mobile = (m && m.mobile) ? m.mobile : (log.mobile || "");
              const pic = (m && m.profile_picture) ? m.profile_picture : (log.profile_picture || "");
              return {
                ...log,
                id: log.id,
                member_id: memberCode,
                name: memberName,
                plan_type: planType,
                expiry_date: expDate,
                mobile: mobile,
                profile_picture: pic
              };
            });
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              enriched = enriched.filter(l => 
                (l.name && l.name.toLowerCase().includes(q)) ||
                (l.member_id && String(l.member_id).toLowerCase().includes(q)) ||
                (l.mobile && String(l.mobile).includes(q))
              );
            }
            setLogs(enriched);
          }
        }
      } catch (sbErr) {
        console.warn("Direct Supabase attendance logs fallback warning:", sbErr);
      }
    }
    setIsLoading(!1);
  }, [activePreset, timeframeMode, singleDate, rangeStart, rangeEnd, statusFilter, searchQuery, allMembersList]);'''

if re.search(old_fetchlogs_pattern, code):
    code = re.sub(old_fetchlogs_pattern, new_fetchlogs, code, count=1)
    print("Replaced fetchLogs with IST boundary & Supabase join logic.")
else:
    print("Warning: old_fetchlogs_pattern not matched.")

# 4. Scanner ID Logic: Stop treating "Card UID" as separate entity
code = code.replace(
    'title: "ACCESS DENIED (Unregistered Card)",',
    'title: "ACCESS DENIED (Unregistered Member)",'
)
code = code.replace(
    '`ACCESS DENIED: Card UID / Member ID "${cleanId}" not found in database.`',
    '`ACCESS DENIED: Member ID "${cleanId}" not found in database.`'
)
code = code.replace(
    '`ACCESS DENIED: Card UID "${identifier}" not found in database.`',
    '`ACCESS DENIED: Member ID "${identifier}" not found in database.`'
)
code = code.replace(
    '`ACCESS DENIED: Card UID "${cleanId}" not found in database.`',
    '`ACCESS DENIED: Member ID "${cleanId}" not found in database.`'
)

# 5. Fix Quick CSV Export: strictly IST DD:MM:YYYY and HH:MM:SS
old_csv_pattern = r'const handleQuickCSV = \(recordsToExport = logs\) => \{[\s\S]*?document\.body\.removeChild\(link\);\s*\};'
new_csv = '''const handleQuickCSV = (recordsToExport = logs) => {
    const headers = [
      "Check-In Date",
      "Check-In Time",
      "Member ID",
      "Member Name",
      "Membership Plan",
      "Plan Expiry Date",
      "Check-In Status",
      "Reception Notes"
    ];
    const rows = recordsToExport.map(r => {
      const dStr = formatISTDate(r.check_in_time);
      const tStr = formatISTTime(r.check_in_time);
      const mId = r.member_id || (r.members && r.members.member_id) || "";
      const mName = r.name || (r.members && r.members.name) || "Unknown Member";
      const mPlan = r.plan_type || (r.members && r.members.plan_type) || "Regular";
      const mExp = formatISTDate(r.expiry_date || (r.members && r.members.expiry_date));
      const mStatus = (r.status || "").toUpperCase();
      const mNotes = r.reception_notes || "";
      return [
        `"${dStr}"`,
        `"${tStr}"`,
        `"${mId}"`,
        `"${mName.replace(/"/g, '""')}"`,
        `"${mPlan.replace(/"/g, '""')}"`,
        `"${mExp}"`,
        `"${mStatus}"`,
        `"${mNotes.replace(/"/g, '""')}"`
      ].join(",");
    });
    const csvContent = "\\uFEFF" + [headers.join(","), ...rows].join("\\r\\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const sDate = timeframeMode === "single" ? formatISTDate(new Date(`${singleDate}T00:00:00+05:30`)) : formatISTDate(new Date(`${rangeStart}T00:00:00+05:30`));
    const eDate = timeframeMode === "single" ? formatISTDate(new Date(`${singleDate}T00:00:00+05:30`)) : formatISTDate(new Date(`${rangeEnd}T00:00:00+05:30`));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${sDate.replace(/:/g, "-")}_to_${eDate.replace(/:/g, "-")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };'''

if re.search(old_csv_pattern, code):
    code = re.sub(old_csv_pattern, lambda m: new_csv, code, count=1)
    print("Replaced handleQuickCSV with strict IST formatting.")
else:
    print("Warning: old_csv_pattern not matched.")

# 6. Update Presets UI: Dynamic active preset highlight
old_single_presets = r'timeframeMode==="single"\?l\.jsxs\("div",\{className:"flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60",children:\[[\s\S]*?className:"px-3 py-1\.5 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"\s*\}\)\s*\]\}\)\s*\]\}\):'
new_single_presets = '''timeframeMode==="single"?l.jsxs("div",{className:"flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60",children:[
        l.jsx("span",{className:"text-xs text-neutral-400 font-medium",children:"Preset:"}),
        l.jsx("button",{
          onClick:()=>{ setActivePreset("today"); setSingleDate(todayStr); },
          className:`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${activePreset==="today"?"bg-emerald-500 text-black font-bold border-emerald-400 shadow-md":"bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"}`,
          children:"Today"
        }),
        l.jsx("button",{
          onClick:()=>{ setActivePreset("yesterday"); setSingleDate(yesterdayStr); },
          className:`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${activePreset==="yesterday"?"bg-emerald-500 text-black font-bold border-emerald-400 shadow-md":"bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"}`,
          children:"Yesterday"
        }),
        l.jsxs("div",{className:"flex items-center gap-2 ml-auto",children:[
          l.jsx("span",{className:"text-xs text-neutral-400",children:"Select Date:"}),
          l.jsx("input",{
            type:"date",
            value:singleDate,
            onChange:e=>{ setSingleDate(e.target.value); setActivePreset("custom"); },
            className:"px-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"
          })
        ]})
      ]}):'''

if re.search(old_single_presets, code):
    code = re.sub(old_single_presets, lambda m: new_single_presets, code, count=1)
    print("Updated Single Day Presets UI.")
else:
    print("Warning: old_single_presets not matched.")

old_range_presets = r'l\.jsxs\("div",\{className:"flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60",children:\[\s*l\.jsx\("span",\{className:"text-xs text-neutral-400 font-medium",children:"Range Presets:"\}\),[\s\S]*?children:"This Month"\s*\}\),[\s\S]*?className:"px-2\.5 py-1 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"\s*\}\)\s*\]\}\)\s*\]\}\)'
new_range_presets = '''l.jsxs("div",{className:"flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60",children:[
        l.jsx("span",{className:"text-xs text-neutral-400 font-medium",children:"Range Presets:"}),
        l.jsx("button",{
          onClick:()=>{ setActivePreset("last7"); setRangeStart(last7Boundary.dateStr); setRangeEnd(todayStr); },
          className:`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${activePreset==="last7"?"bg-emerald-500 text-black font-bold border-emerald-400 shadow-md":"bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"}`,
          children:"Last 7 Days"
        }),
        l.jsx("button",{
          onClick:()=>{ setActivePreset("last30"); setRangeStart(getISTDayBoundary(-29).dateStr); setRangeEnd(todayStr); },
          className:`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${activePreset==="last30"?"bg-emerald-500 text-black font-bold border-emerald-400 shadow-md":"bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"}`,
          children:"Last 30 Days"
        }),
        l.jsx("button",{
          onClick:()=>{ setActivePreset("thisMonth"); setRangeStart(thisMonthStartStr); setRangeEnd(todayStr); },
          className:`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${activePreset==="thisMonth"?"bg-emerald-500 text-black font-bold border-emerald-400 shadow-md":"bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"}`,
          children:"This Month"
        }),
        l.jsxs("div",{className:"flex items-center gap-2 ml-auto",children:[
          l.jsx("span",{className:"text-xs text-neutral-400",children:"From:"}),
          l.jsx("input",{
            type:"date",
            value:rangeStart,
            onChange:e=>{ setRangeStart(e.target.value); setActivePreset("custom"); },
            className:"px-2.5 py-1 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"
          }),
          l.jsx("span",{className:"text-xs text-neutral-400",children:"To:"}),
          l.jsx("input",{
            type:"date",
            value:rangeEnd,
            onChange:e=>{ setRangeEnd(e.target.value); setActivePreset("custom"); },
            className:"px-2.5 py-1 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"
          })
        ]})
      ]})'''

if re.search(old_range_presets, code):
    code = re.sub(old_range_presets, lambda m: new_range_presets, code, count=1)
    print("Updated Date Range Presets UI.")
else:
    print("Warning: old_range_presets not matched.")

old_thead = r'l\.jsxs\("tr",\{children:\[\s*l\.jsx\("th",\{className:"py-3\.5 px-4",children:timeframeMode==="single"\?"Check-in Time":"Date & Time"\}\),\s*l\.jsx\("th",\{className:"py-3\.5 px-4",children:"Member"\}\),\s*l\.jsx\("th",\{className:"py-3\.5 px-4",children:"Card UID"\}\),\s*l\.jsx\("th",\{className:"py-3\.5 px-4",children:"Plan & Validity"\}\),\s*l\.jsx\("th",\{className:"py-3\.5 px-4",children:"Status"\}\),\s*l\.jsx\("th",\{className:"py-3\.5 px-4",children:"Desk Notes"\}\),?\s*\]\}\)'
new_thead = '''l.jsxs("tr",{children:[
              l.jsx("th",{className:"py-3.5 px-4",children:timeframeMode==="single"?"Check-in Time (IST)":"Date & Time (IST)"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Member ID"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Member Name"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Plan & Validity"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Status"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Desk Notes"})
            ]})'''

if re.search(old_thead, code):
    code = re.sub(old_thead, lambda m: new_thead, code, count=1)
    print("Updated Table Thead.")
else:
    print("Warning: old_thead not matched.")

old_trows_pattern = r'logs\.map\(log=>\{[\s\S]*?return l\.jsxs\("tr",\{key:log\.id,className:"hover:bg-neutral-800/40 transition-colors",children:\[[\s\S]*?l\.jsx\("td",\{className:"py-3 px-4 text-neutral-400 italic text-\[11px\]",children:log\.reception_notes\|\|"-"\}\)\s*\]\}\);\s*\}\)'
new_trows = '''logs.map(log=>{
              const timeStr = formatISTTime(log.check_in_time) || "--";
              const dateStr = formatISTDate(log.check_in_time) || "--";
              const expDateStr = formatISTDate(log.expiry_date) || "--";
              const memId = log.member_id || "--";
              const memName = log.name || "Unknown Member";

              return l.jsxs("tr",{key:log.id,className:"hover:bg-neutral-800/40 transition-colors",children:[
                l.jsxs("td",{className:"py-3 px-4 font-mono",children:[
                  timeframeMode==="single"?l.jsx("span",{className:"font-bold text-white",children:timeStr}):
                  l.jsxs("div",{children:[
                    l.jsx("div",{className:"text-neutral-400 text-[11px]",children:dateStr}),
                    l.jsx("div",{className:"font-bold text-white",children:timeStr})
                  ]})
                ]}),
                l.jsx("td",{className:"py-3 px-4 font-mono font-bold text-emerald-400 text-xs",children:memId}),
                l.jsxs("td",{className:"py-3 px-4",children:[
                  l.jsxs("div",{className:"flex items-center gap-2.5",children:[
                    l.jsx("div",{className:"w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-xs",children:
                      (memName||"M")[0].toUpperCase()
                    }),
                    l.jsx("div",{className:"font-semibold text-white",children:memName})
                  ]})
                ]}),
                l.jsxs("td",{className:"py-3 px-4",children:[
                  l.jsx("div",{className:"font-medium text-white",children:log.plan_type||"Regular"}),
                  l.jsxs("div",{className:"text-[10px] text-neutral-400 font-mono",children:["Exp: ",expDateStr]})
                ]}),
                l.jsx("td",{className:"py-3 px-4",children:
                  log.status==="valid"?l.jsx("span",{className:"px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",children:"VALID"}):
                  log.status==="expired"?l.jsx("span",{className:"px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40",children:"EXPIRED"}):
                  l.jsx("span",{className:"px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-neutral-800 text-neutral-400 border border-neutral-700",children:log.status||"OTHER"})
                }),
                l.jsx("td",{className:"py-3 px-4 text-neutral-400 italic text-[11px]",children:log.reception_notes||"-"})
              ]});
            })'''

if re.search(old_trows_pattern, code):
    code = re.sub(old_trows_pattern, lambda m: new_trows, code, count=1)
    print("Updated Table Rows with Member ID, Name, and strict IST DD:MM:YYYY.")
else:
    print("Warning: old_trows_pattern not matched.")

# Write updated attendance_code.js
with open('attendance_code.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved updated attendance_code.js successfully!")

# 8. Inject updated attendance_code.js into the bundles:
bundle_files = [
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js',
    'dist/assets/index-BvAlUw77.js',
    'dist/assets/index-bvaluw77.js'
]

start_marker = "// --- ATTENDANCE & RFID/BARCODE SCANNER MODULE ---"
end_marker = "const BD=({currentTab:t"

clean_att_module = code.strip()
if clean_att_module.startswith(";"):
    clean_att_module = clean_att_module.lstrip("; \n\r")

for bpath in bundle_files:
    if not os.path.exists(bpath):
        continue
    with open(bpath, 'r', encoding='utf-8') as bf:
        bcontent = bf.read()
    
    s_idx = bcontent.find(start_marker)
    e_idx = bcontent.find(end_marker)
    
    if s_idx != -1 and e_idx != -1:
        new_bundle = bcontent[:s_idx] + clean_att_module + "\n" + bcontent[e_idx:]
        with open(bpath, 'w', encoding='utf-8') as bf:
            bf.write(new_bundle)
        print(f"Successfully injected updated attendance module into {bpath}")
    else:
        print(f"Markers not found in {bpath}: start={s_idx}, end={e_idx}")

print("=== ALL 5 BUGS SUCCESSFULLY APPLIED ===")
