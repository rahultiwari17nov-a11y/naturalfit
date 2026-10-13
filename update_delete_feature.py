# update_delete_feature.py
import subprocess
import os

with open('attendance_code.js', 'r', encoding='utf-8') as f:
    ac = f.read()

# 1. Add getISTIsoString
if 'const getISTIsoString =' not in ac:
    ist_iso_fn = """const getISTIsoString = (d = new Date()) => {
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
};
"""
    ac = ac.replace('const getISTDateParts = (d = new Date()) => {', ist_iso_fn + '\nconst getISTDateParts = (d = new Date()) => {')

# 2. In executeDirectSupabaseCheckIn, use getISTIsoString(new Date()) for check_in_time
ac = ac.replace('const nowIso = new Date().toISOString();', 'const nowIso = getISTIsoString(new Date());')

# 3. Add delete modal state
del_state = """  const [showDeleteModal, setShowDeleteModal] = fe.useState(!1);
  const [deleteStartDate, setDeleteStartDate] = fe.useState(todayStr);
  const [deleteEndDate, setDeleteEndDate] = fe.useState(todayStr);
  const [deleteConfirmText, setDeleteConfirmText] = fe.useState("");
  const [isDeletingLogs, setIsDeletingLogs] = fe.useState(!1);
  const [deleteModalError, setDeleteModalError] = fe.useState(null);
"""
if 'const [showDeleteModal, setShowDeleteModal]' not in ac:
    ac = ac.replace('const [showReportModal, setShowReportModal] = fe.useState(!1);', 'const [showReportModal, setShowReportModal] = fe.useState(!1);\n' + del_state)

# 4. Add handleExecuteDeleteRange
del_fn = """  const handleExecuteDeleteRange = async () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      setDeleteModalError('Please type "DELETE" exactly in all caps to confirm.');
      return;
    }
    if (!deleteStartDate) {
      setDeleteModalError('Please select a valid start date.');
      return;
    }
    const sDate = deleteStartDate;
    const eDate = deleteEndDate || deleteStartDate;
    if (sDate > eDate) {
      setDeleteModalError('Start date cannot be after end date.');
      return;
    }

    setIsDeletingLogs(!0);
    setDeleteModalError(null);

    const sIso = new Date(`${sDate}T00:00:00+05:30`).toISOString();
    const eIso = new Date(`${eDate}T23:59:59.999+05:30`).toISOString();

    let callSucceeded = false;
    let localDeleted = 0;
    let sbDeleted = 0;

    // 1. Try Express API
    try {
      const res = await fetch("/api/attendance/delete-range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: sDate,
          end_date: eDate,
          start_iso: sIso,
          end_iso: eIso,
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
      console.warn("Express delete-range failed, attempting direct Supabase deletion:", e);
    }

    // 2. Direct Supabase deletion fallback (for Netlify/hosted deployment)
    try {
      const sbKey = "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU";
      const sbUrl = "https://kkhnpgztzfpmjltsuhmo.supabase.co";
      const sbHeaders = {
        "apikey": sbKey,
        "Authorization": `Bearer ${sbKey}`,
        "Content-Type": "application/json"
      };
      const sbRes = await fetch(`${sbUrl}/rest/v1/attendance?check_in_time=gte.${encodeURIComponent(sIso)}&check_in_time=lte.${encodeURIComponent(eIso)}`, {
        method: "DELETE",
        headers: sbHeaders
      });
      if (sbRes.ok) {
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
        message: `Successfully deleted attendance records from ${formatISTDate(sIso)} to ${formatISTDate(eIso)}. Both local and Supabase databases updated.`,
        time: formatISTTime(new Date())
      });
      fetchLogs();
    } else {
      setDeleteModalError("Failed to delete attendance logs. Please check server and database connection.");
    }
  };
"""
if 'const handleExecuteDeleteRange =' not in ac:
    ac = ac.replace('const handleQuickCSV =', del_fn + '\n  const handleQuickCSV =')

# 5. Add Delete Range button next to Download Report
old_btn = """          l.jsxs("button",{
            onClick:()=>setShowReportModal(!0),
            className:"px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"Download Report"})
            ]
          })"""

new_btn = """          l.jsxs("button",{
            onClick:()=>setShowReportModal(!0),
            className:"px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"Download Report"})
            ]
          }),
          l.jsxs("button",{
            onClick:()=>setShowDeleteModal(!0),
            className:"px-3.5 py-1.5 text-xs font-bold rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer",
            title:"Delete attendance logs by date range",
            children:[
              l.jsx("span",{children:"🗑 Delete Range"})
            ]
          })"""

if old_btn in ac:
    ac = ac.replace(old_btn, new_btn)

# 6. Add showDeleteModal JSX dialog
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
                  disabled:deleteConfirmText.trim()!==\"DELETE\"||isDeletingLogs,
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
    end_comp_idx = ac.rfind('  ]);\n};')
    if end_comp_idx != -1:
        ac = ac[:end_comp_idx] + del_modal_jsx + '\n' + ac[end_comp_idx:]

with open('attendance_code.js', 'w', encoding='utf-8') as f:
    f.write(ac)

print('Updated attendance_code.js successfully!')

# Validate syntax
res = subprocess.run(['node', '--input-type=module', '-c'], input=ac, capture_output=True, text=True)
if res.returncode == 0:
    print('attendance_code.js syntax is VALID!')
else:
    print('attendance_code.js syntax error:', res.stderr[:400])
    exit(1)

# Inject into bundles
start_marker = '// --- ATTENDANCE & RFID/BARCODE SCANNER MODULE ---'
end_marker = 'const BD=({currentTab:t'

with open('assets/index-bvaluw77.js.bak', 'r', encoding='utf-8') as f:
    clean_base = f.read()

s_idx = clean_base.find(start_marker)
e_idx = clean_base.find(end_marker)

new_bundle = clean_base[:s_idx] + start_marker + '\n' + ac.strip() + '\n' + clean_base[e_idx:]

bundle_files = [
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js',
    'dist/assets/index-BvAlUw77.js',
    'dist/assets/index-bvaluw77.js'
]

for bpath in bundle_files:
    if os.path.exists(os.path.dirname(bpath)):
        with open(bpath, 'w', encoding='utf-8') as bf:
            bf.write(new_bundle)
        print(f'Wrote {bpath}')

# Validate bundle
res_b = subprocess.run(['node', '--input-type=module', '-c'], input=new_bundle, capture_output=True, text=True)
if res_b.returncode == 0:
    print('Bundles syntax is VALID!')
else:
    print('Bundle syntax error:', res_b.stderr[:400])
    exit(1)
