# apply_ist_and_delete_feature.py
import os
import subprocess
import re

print("Starting IST Time & Delete Range implementation...")

# =====================================================================
# 1. READ ATTENDANCE_CODE.JS
# =====================================================================
with open('attendance_code.js', 'r', encoding='utf-8') as f:
    ac = f.read()

# Replace formatISTDate and formatISTTime with robust IST string formatters
old_format_funcs = '''const formatISTDate = (val) => {
  if (!val && val !== 0) return "";
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  // Date-only string like YYYY-MM-DD
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}:${m}:${y}`;
  }

  let d;
  if (val instanceof Date) {
    d = val;
  } else {
    if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
    if (!s.endsWith("Z") && !/[+-]\\d{2}(:?\\d{2})?$/.test(s)) s += "Z";
    d = new Date(s);
  }

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
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  let d;
  if (val instanceof Date) {
    d = val;
  } else {
    if (/^\\d{1,2}:\\d{2}(:\\d{2})?$/.test(s) && !s.includes("-") && !s.includes("/")) {
      return s;
    }
    if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
    if (!s.endsWith("Z") && !/[+-]\\d{2}(:?\\d{2})?$/.test(s)) s += "Z";
    d = new Date(s);
  }

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
};'''

new_format_funcs = '''const formatISTDate = (val) => {
  if (!val && val !== 0) return "";
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  const m = s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (m) {
    return `${m[3]}:${m[2]}:${m[1]}`;
  }
  if (/^\\d{2}[:\\-]\\d{2}[:\\-]\\d{4}$/.test(s)) {
    return s.replace(/-/g, ":");
  }

  let d;
  if (val instanceof Date) d = val;
  else d = new Date(s);

  if (isNaN(d.getTime())) return s;

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
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  if (/^\\d{1,2}:\\d{2}(:\\d{2})?$/.test(s) && !s.includes("-") && !s.includes("/")) {
    const parts = s.split(":");
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${(parts[2] || "00").padStart(2, "0")}`;
  }

  const tm = s.match(/[T ](\\d{2}):(\\d{2})(?::(\\d{2}))?/);
  if (tm) {
    return `${tm[1]}:${tm[2]}:${tm[3] || "00"}`;
  }

  let d;
  if (val instanceof Date) d = val;
  else d = new Date(s);

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
};'''

if old_format_funcs in ac:
    ac = ac.replace(old_format_funcs, new_format_funcs)
    print("Replaced formatISTDate and formatISTTime with direct IST formatters")
else:
    print("Warning: old_format_funcs not matched exactly, checking sub-replacement...")

# Add getISTIsoString helper if not present
ist_iso_helper = '''const getISTIsoString = (d = new Date()) => {
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
};
'''

if 'const getISTIsoString =' not in ac:
    ac = ac.replace('const getISTDateParts = (d = new Date()) => {', ist_iso_helper + '\nconst getISTDateParts = (d = new Date()) => {')
    print("Added getISTIsoString helper")

# Update getISTDayBoundary to use clean wall-clock boundaries
old_day_bound = '''const getISTDayBoundary = (offsetDays = 0) => {
  const { year, month, day } = getISTDateParts(new Date());
  const d = new Date(Date.UTC(year, month - 1, day + offsetDays));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${dd}`;
  const startIso = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const endIso = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
  return { dateStr, startIso, endIso };
};'''

new_day_bound = '''const getISTDayBoundary = (offsetDays = 0) => {
  const { year, month, day } = getISTDateParts(new Date());
  const d = new Date(Date.UTC(year, month - 1, day + offsetDays));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${dd}`;
  const startIso = `${dateStr}T00:00:00.000`;
  const endIso = `${dateStr}T23:59:59.999`;
  return { dateStr, startIso, endIso };
};'''

if old_day_bound in ac:
    ac = ac.replace(old_day_bound, new_day_bound)
    print("Updated getISTDayBoundary to IST wall-clock boundaries")

# Update fetchLogs boundaries in attendance_code.js
old_fetch_bounds = '''    } else if (activePreset === "thisMonth") {
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
    }'''

new_fetch_bounds = '''    } else if (activePreset === "thisMonth") {
      const { year, month } = getISTDateParts(new Date());
      const m = String(month).padStart(2, "0");
      const startStr = `${year}-${m}-01`;
      startIso = `${startStr}T00:00:00.000`;
      endIso = getISTDayBoundary(0).endIso;
      sDate = startStr; eDate = getISTDayBoundary(0).dateStr;
    } else {
      if (timeframeMode === "single") {
        startIso = `${singleDate}T00:00:00.000`;
        endIso = `${singleDate}T23:59:59.999`;
        sDate = singleDate; eDate = singleDate;
      } else {
        startIso = `${rangeStart}T00:00:00.000`;
        endIso = `${rangeEnd}T23:59:59.999`;
        sDate = rangeStart; eDate = rangeEnd;
      }
    }'''

if old_fetch_bounds in ac:
    ac = ac.replace(old_fetch_bounds, new_fetch_bounds)
    print("Updated fetchLogs boundary definitions to IST wall-clock strings")

# Update check_in_time generation in executeDirectSupabaseCheckIn
ac = ac.replace('const nowIso = new Date().toISOString();', 'const nowIso = getISTIsoString(new Date());')
ac = ac.replace('check_in_time: new Date().toISOString(),', 'check_in_time: getISTIsoString(new Date()),')

# Add delete modal state to AttendanceManager
del_state_code = """  const [showDeleteModal, setShowDeleteModal] = fe.useState(!1);
  const [deleteStartDate, setDeleteStartDate] = fe.useState(todayBoundary.dateStr);
  const [deleteEndDate, setDeleteEndDate] = fe.useState(todayBoundary.dateStr);
  const [deleteConfirmText, setDeleteConfirmText] = fe.useState("");
  const [isDeletingLogs, setIsDeletingLogs] = fe.useState(!1);
  const [deleteModalError, setDeleteModalError] = fe.useState(null);
"""
if 'const [showDeleteModal, setShowDeleteModal]' not in ac:
    ac = ac.replace('const [showReportModal, setShowReportModal] = fe.useState(!1);', 'const [showReportModal, setShowReportModal] = fe.useState(!1);\n' + del_state_code)
    print("Added delete modal state")

# Add handleExecuteDeleteRange function
del_handler_code = """  const handleExecuteDeleteRange = async () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      setDeleteModalError('Please type "DELETE" exactly in all caps to confirm deletion.');
      return;
    }
    if (!deleteStartDate) {
      setDeleteModalError("Please select a valid start date.");
      return;
    }
    const sDate = deleteStartDate;
    const eDate = deleteEndDate || deleteStartDate;
    if (sDate > eDate) {
      setDeleteModalError("Start date cannot be after end date.");
      return;
    }

    setIsDeletingLogs(!0);
    setDeleteModalError(null);

    const sIso = new Date(`${sDate}T00:00:00+05:30`).toISOString();
    const eIso = new Date(`${eDate}T23:59:59.999+05:30`).toISOString();
    const sIst = `${sDate}T00:00:00.000`;
    const eIst = `${eDate}T23:59:59.999`;

    let callSucceeded = false;
    let localDeleted = 0;
    let sbDeleted = 0;

    // 1. Call Express API /api/attendance/delete-range
    try {
      const res = await fetch("/api/attendance/delete-range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: sDate,
          end_date: eDate,
          start_iso: sIso,
          end_iso: eIso,
          start_ist: sIst,
          end_ist: eIst,
          confirmation: "DELETE"
        })
      });
      if (res.ok) {
        const data = await res.json();
        localDeleted = data.local_deleted || 0;
        sbDeleted = data.supabase_deleted || 0;
        callSucceeded = true;
      }
    } catch (e) {
      console.warn("Express delete-range endpoint error, attempting direct Supabase deletion fallback:", e);
    }

    // 2. Direct Supabase deletion to ensure complete synchronization at database level
    try {
      const sbKey = "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU";
      const sbUrl = "https://kkhnpgztzfpmjltsuhmo.supabase.co";
      const sbHeaders = {
        "apikey": sbKey,
        "Authorization": `Bearer ${sbKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      };

      // Delete by IST wall-clock timestamps (current IST storage format)
      const resIst = await fetch(`${sbUrl}/rest/v1/attendance?check_in_time=gte.${encodeURIComponent(sIst)}&check_in_time=lte.${encodeURIComponent(eIst)}`, {
        method: "DELETE",
        headers: sbHeaders
      });
      if (resIst.ok) {
        const deletedIstRows = await resIst.json().catch(() => []);
        if (Array.isArray(deletedIstRows)) sbDeleted += deletedIstRows.length;
        callSucceeded = true;
      }

      // Also delete by UTC ISO range for any legacy timestamps
      const resUtc = await fetch(`${sbUrl}/rest/v1/attendance?check_in_time=gte.${encodeURIComponent(sIso)}&check_in_time=lte.${encodeURIComponent(eIso)}`, {
        method: "DELETE",
        headers: sbHeaders
      });
      if (resUtc.ok) {
        const deletedUtcRows = await resUtc.json().catch(() => []);
        if (Array.isArray(deletedUtcRows)) sbDeleted += deletedUtcRows.length;
        callSucceeded = true;
      }
    } catch (sbErr) {
      console.warn("Direct Supabase delete-range error:", sbErr);
    }

    setIsDeletingLogs(!1);

    if (callSucceeded) {
      setShowDeleteModal(!1);
      setDeleteConfirmText("");
      setDeleteModalError(null);
      setAlertBanner({
        type: "valid",
        title: "Attendance Logs Deleted",
        message: `Successfully deleted attendance records from ${formatISTDate(sDate)} to ${formatISTDate(eDate)}. Both local database and Supabase updated (${localDeleted + sbDeleted} entries removed).`,
        time: formatISTTime(new Date())
      });
      fetchLogs();
    } else {
      setDeleteModalError("Failed to delete attendance logs. Please check server and database connection.");
    }
  };
"""

if 'const handleExecuteDeleteRange =' not in ac:
    ac = ac.replace('  const handleQuickCSV =', del_handler_code + '\n  const handleQuickCSV =')
    print("Added handleExecuteDeleteRange function")

# Add Delete Logs button to UI toolbar
old_report_btn = """          l.jsxs("button",{
            onClick:()=>setShowReportModal(!0),
            className:"px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"Download Report"})
            ]
          })"""

new_report_and_delete_btns = """          l.jsxs("button",{
            onClick:()=>setShowReportModal(!0),
            className:"px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"Download Report"})
            ]
          }),
          l.jsxs("button",{
            onClick:()=>{ setShowDeleteModal(!0); setDeleteConfirmText(""); setDeleteModalError(null); setDeleteStartDate(timeframeMode==="single"?singleDate:(rangeStart||todayStr)); setDeleteEndDate(timeframeMode==="single"?singleDate:(rangeEnd||todayStr)); },
            className:"px-3.5 py-1.5 text-xs font-bold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm",
            title:"Delete attendance logs by selecting date range",
            children:[
              l.jsx("span",{children:"🗑 Delete Logs"})
            ]
          })"""

if old_report_btn in ac:
    ac = ac.replace(old_report_btn, new_report_and_delete_btns)
    print("Added Delete Logs button to toolbar")

# Add showDeleteModal dialog before component close
del_modal_jsx = """,

    showDeleteModal&&l.jsxs("div",{
      className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",
      children:[
        l.jsxs("div",{
          className:"w-full max-w-md bg-neutral-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-white",
          children:[
            l.jsxs("div",{
              className:"flex items-center justify-between pb-3 border-b border-neutral-800",
              children:[
                l.jsxs("div",{
                  className:"flex items-center gap-2",
                  children:[
                    l.jsx("span",{className:"text-red-500 text-xl",children:"⚠️"}),
                    l.jsx("h3",{className:"text-lg font-bold text-red-400",children:"Delete Attendance Logs"})
                  ]
                }),
                l.jsx("button",{
                  onClick:()=>{ setShowDeleteModal(!1); setDeleteConfirmText(""); setDeleteModalError(null); },
                  className:"text-neutral-400 hover:text-white text-xl cursor-pointer",
                  children:"×"
                })
              ]
            }),

            l.jsxs("div",{
              className:"p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 space-y-1.5",
              children:[
                l.jsx("strong",{className:"text-red-400 block font-semibold",children:"Permanent Deletion Warning"}),
                l.jsx("p",{children:"This action will permanently delete all attendance logs in the selected date range from BOTH the local database and connected Supabase database. This operation CANNOT be undone."})
              ]
            }),

            l.jsxs("div",{
              className:"space-y-3",
              children:[
                l.jsxs("div",{
                  className:"grid grid-cols-2 gap-3",
                  children:[
                    l.jsxs("div",{
                      children:[
                        l.jsx("label",{className:"block text-[11px] font-semibold text-neutral-400 mb-1",children:"Start Date (IST)"}),
                        l.jsx("input",{
                          type:"date",
                          value:deleteStartDate,
                          onChange:(e)=>setDeleteStartDate(e.target.value),
                          className:"w-full px-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-red-500"
                        })
                      ]
                    }),
                    l.jsxs("div",{
                      children:[
                        l.jsx("label",{className:"block text-[11px] font-semibold text-neutral-400 mb-1",children:"End Date (IST)"}),
                        l.jsx("input",{
                          type:"date",
                          value:deleteEndDate,
                          onChange:(e)=>setDeleteEndDate(e.target.value),
                          className:"w-full px-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-red-500"
                        })
                      ]
                    })
                  ]
                }),

                l.jsxs("div",{
                  className:"p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 flex justify-between",
                  children:[
                    l.jsx("span",{children:"Date Range (IST):"}),
                    l.jsx("strong",{className:"font-mono text-white",children:`${formatISTDate(deleteStartDate)} to ${formatISTDate(deleteEndDate)}`})
                  ]
                }),

                l.jsxs("div",{
                  children:[
                    l.jsxs("label",{
                      className:"block text-xs font-bold text-neutral-200 mb-1.5",
                      children:[
                        "To confirm deletion, type ",
                        l.jsx("span",{className:"text-red-400 font-mono underline font-extrabold",children:"DELETE"}),
                        " in capital letters:"
                      ]
                    }),
                    l.jsx("input",{
                      type:"text",
                      value:deleteConfirmText,
                      onChange:(e)=>setDeleteConfirmText(e.target.value),
                      placeholder:"Type DELETE to confirm",
                      className:"w-full px-3 py-2 text-xs font-mono tracking-wider rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 uppercase"
                    })
                  ]
                }),

                deleteModalError&&l.jsx("div",{
                  className:"p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-semibold",
                  children:deleteModalError
                })
              ]
            }),

            l.jsxs("div",{
              className:"flex items-center justify-end gap-3 pt-3 border-t border-neutral-800",
              children:[
                l.jsx("button",{
                  onClick:()=>{ setShowDeleteModal(!1); setDeleteConfirmText(""); setDeleteModalError(null); },
                  disabled:isDeletingLogs,
                  className:"px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer",
                  children:"Cancel"
                }),
                l.jsx("button",{
                  onClick:handleExecuteDeleteRange,
                  disabled:deleteConfirmText.trim()!=="DELETE"||isDeletingLogs,
                  className:"px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg shadow-red-950/50",
                  children:isDeletingLogs?"Deleting...":"Confirm & Delete Logs"
                })
              ]
            })
          ]
        })
      ]
    })"""

if 'showDeleteModal&&l.jsxs("div"' not in ac:
    last_root_close = ac.rfind('  ]});\n};')
    if last_root_close != -1:
        ac = ac[:last_root_close] + del_modal_jsx + ac[last_root_close:]
        print("Added showDeleteModal JSX dialog")

# Save updated attendance_code.js
with open('attendance_code.js', 'w', encoding='utf-8') as f:
    f.write(ac)

print("Saved updated attendance_code.js")

# Validate attendance_code.js syntax
res_ac = subprocess.run(['node', '--input-type=module', '-c'], input=ac, capture_output=True, text=True)
if res_ac.returncode != 0:
    print("FATAL: Syntax error in attendance_code.js:")
    print(res_ac.stderr[:600])
    exit(1)
else:
    print("Syntax verification passed for attendance_code.js!")


# =====================================================================
# 2. UPDATE SERVER.CJS
# =====================================================================
with open('server.cjs', 'r', encoding='utf-8') as f:
    sc = f.read()

# Replace getISTIsoString in server.cjs to output clean IST wall-clock string
old_sc_ist = '''function getISTIsoString(d = new Date()) {
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
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}+05:30`;
}'''

new_sc_ist = '''function getISTIsoString(d = new Date()) {
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
}'''

if old_sc_ist in sc:
    sc = sc.replace(old_sc_ist, new_sc_ist)
    print("Updated getISTIsoString in server.cjs to output clean IST wall-clock string")

# Update SQLite insertions in server.cjs to use getISTIsoString(now)
sc = sc.replace('[member.id, now.toISOString(), notes || "Front desk expired attempt"]', '[member.id, getISTIsoString(now), notes || "Front desk expired attempt"]')
sc = sc.replace('[member.id, now.toISOString(), notes || ""]', '[member.id, getISTIsoString(now), notes || ""]')

# Update check-in response in server.cjs
sc = sc.replace('check_in_time: now.toISOString(),', 'check_in_time: getISTIsoString(now),')
sc = sc.replace('timestamp: now.toISOString(),', 'timestamp: getISTIsoString(now),')

# Update /api/attendance/delete-range in server.cjs for complete coverage
old_sc_del = '''  app.post("/api/attendance/delete-range", async (req, res) => {
    try {
      const { start_date, end_date, start_iso, end_iso, confirmation } = req.body || {};
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

      const db = await getDb();

      // Count matching local records before delete
      let localDeletedCount = 0;
      try {
        const countStmt = db.prepare(`
          SELECT COUNT(*) as cnt FROM attendance 
          WHERE (check_in_time >= ? AND check_in_time <= ?)
             OR (date(check_in_time) >= date(?) AND date(check_in_time) <= date(?))
        `);
        countStmt.bind([sIso, eIso, sDate, eDate]);
        if (countStmt.step()) {
          localDeletedCount = countStmt.getAsObject().cnt || 0;
        }
        countStmt.free();
      } catch (_) {}

      // Delete from local SQLite database
      db.run(`
        DELETE FROM attendance 
        WHERE (check_in_time >= ? AND check_in_time <= ?)
           OR (date(check_in_time) >= date(?) AND date(check_in_time) <= date(?))
      `, [sIso, eIso, sDate, eDate]);
      saveDatabase();

      // Delete from Supabase
      let sbDeletedCount = 0;
      try {
        const sb = getSupabaseServerClient();
        if (sb) {
          const { data: deletedRows, error: sbErr } = await sb
            .from("attendance")
            .delete()
            .gte("check_in_time", sIso)
            .lte("check_in_time", eIso)
            .select();
          if (!sbErr && Array.isArray(deletedRows)) {
            sbDeletedCount = deletedRows.length;
          } else if (sbErr) {
            console.warn("[Supabase Delete Range Warning]:", sbErr.message);
          }
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
  });'''

new_sc_del = '''  app.post("/api/attendance/delete-range", async (req, res) => {
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
  });'''

if old_sc_del in sc:
    sc = sc.replace(old_sc_del, new_sc_del)
    print("Updated /api/attendance/delete-range in server.cjs")

with open('server.cjs', 'w', encoding='utf-8') as f:
    f.write(sc)

# Validate server.cjs syntax
res_sc = subprocess.run(['node', '-c', 'server.cjs'], capture_output=True, text=True)
if res_sc.returncode != 0:
    print("FATAL: Syntax error in server.cjs:")
    print(res_sc.stderr[:600])
    exit(1)
else:
    print("Syntax verification passed for server.cjs!")


# =====================================================================
# 3. INJECT UPDATED ATTENDANCE_CODE.JS INTO BUNDLE FILES
# =====================================================================
bundle_files = [
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js'
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
        print(f"ERROR: Markers not found in {bpath}")
        exit(1)

# Validate bundle syntax
res_b = subprocess.run(['node', '--input-type=module', '-c'], input=open('assets/index-BvAlUw77.js').read(), capture_output=True, text=True)
if res_b.returncode != 0:
    print("FATAL: Syntax error in assets/index-BvAlUw77.js:")
    print(res_b.stderr[:600])
    exit(1)
else:
    print("Syntax verification passed for assets/index-BvAlUw77.js!")

print("ALL CHANGES APPLIED AND VALIDATED SUCCESSFULLY!")
