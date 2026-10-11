# update_grid_menus.py
# Implements responsive Grid Layout for Main Menus across the CRM
import subprocess
import os

print("Applying Grid Layout to Main Menus...")

with open('assets/index-BvAlUw77.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Desktop Navigation in hS to CSS Grid Layout
desk_old = 'l.jsxs("nav",{className:"flex items-center rounded-xl p-1 shrink-0 transition-colors duration-200 bg-neutral-900 border border-neutral-800 shadow-inner",children:['
desk_new = 'l.jsxs("nav",{className:"grid grid-cols-6 gap-1.5 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner shrink-0",children:['

if desk_old not in code:
    print("Warning: desk_old not directly found, checking if already grid...")
else:
    code = code.replace(desk_old, desk_new, 1)
    print("Desktop nav updated to grid-cols-6.")

# 2. Update Mobile Navigation in hS to responsive Grid Layout (3 cols on mobile, 6 cols on sm/tablet)
mob_old = 'l.jsx("nav",{className:"w-full mt-1.5",children:l.jsxs("div",{className:"grid grid-cols-6 gap-1 p-1 w-full text-center rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner",children:['
mob_new = 'l.jsx("nav",{className:"w-full mt-2",children:l.jsxs("div",{className:"grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 w-full text-center rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner",children:['

if mob_old not in code:
    print("Warning: mob_old not directly found, checking if already grid...")
else:
    code = code.replace(mob_old, mob_new, 1)
    print("Mobile nav updated to grid grid-cols-3 sm:grid-cols-6.")

# 3. Add Main Menus Grid Navigation Section in CRM Portal (component BD)
target_bd_header = 'Local Cache Mode (Supabase Setup Needed)"]})]})]})}),'

main_menus_grid_jsx = (
    'l.jsx("div",{id:"crm-main-menus-grid",className:"w-full pt-1 pb-3",children:'
    'l.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3",children:['
    # 1. Search Member
    'l.jsxs("button",{id:"main-menu-grid-search",onClick:()=>e("search"),className:`group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${t==="search"?"bg-emerald-500/15 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg shadow-emerald-950/40":"bg-neutral-900/90 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-800/60"}`,children:['
    'l.jsxs("div",{className:"flex items-center justify-between w-full",children:['
    'l.jsx("div",{className:`p-2 rounded-lg transition-colors ${t==="search"?"bg-emerald-500 text-black shadow-sm":"bg-neutral-800 text-emerald-400 group-hover:bg-neutral-700"}`,children:l.jsx(Ic,{className:"w-4 h-4"})}),'
    't==="search"?l.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",children:"Active"}):l.jsx("span",{className:"text-[10px] font-semibold text-neutral-500",children:"01"})'
    ']}),'
    'l.jsxs("div",{children:['
    'l.jsx("div",{className:`font-bold text-sm ${t==="search"?"text-emerald-400 font-extrabold":"text-white"}`,children:"Search Member"}),'
    'l.jsx("div",{className:"text-[11px] text-neutral-400 mt-0.5",children:"Details & Barcode"})'
    ']})'
    ']}),'
    # 2. Candidate Inquiries
    'l.jsxs("button",{id:"main-menu-grid-inquiries",onClick:()=>e("inquiries"),className:`group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 relative ${t==="inquiries"?"bg-emerald-500/15 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg shadow-emerald-950/40":"bg-neutral-900/90 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-800/60"}`,children:['
    'l.jsxs("div",{className:"flex items-center justify-between w-full",children:['
    'l.jsx("div",{className:`p-2 rounded-lg transition-colors ${t==="inquiries"?"bg-emerald-500 text-black shadow-sm":"bg-neutral-800 text-cyan-400 group-hover:bg-neutral-700"}`,children:l.jsx(Cs,{className:"w-4 h-4"})}),'
    'le.length>0?l.jsx("span",{className:"text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-black animate-pulse shadow-sm",children:`${le.length} New`}):t==="inquiries"?l.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",children:"Active"}):l.jsx("span",{className:"text-[10px] font-semibold text-neutral-500",children:"02"})'
    ']}),'
    'l.jsxs("div",{children:['
    'l.jsx("div",{className:`font-bold text-sm ${t==="inquiries"?"text-emerald-400 font-extrabold":"text-white"}`,children:"Web Inquiries"}),'
    'l.jsx("div",{className:"text-[11px] text-neutral-400 mt-0.5",children:`${r.length} Candidate Leads`})'
    ']})'
    ']}),'
    # 3. New Registration
    'l.jsxs("button",{id:"main-menu-grid-registration",onClick:()=>e("registration"),className:`group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${t==="registration"?"bg-emerald-500/15 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg shadow-emerald-950/40":"bg-neutral-900/90 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-800/60"}`,children:['
    'l.jsxs("div",{className:"flex items-center justify-between w-full",children:['
    'l.jsx("div",{className:`p-2 rounded-lg transition-colors ${t==="registration"?"bg-emerald-500 text-black shadow-sm":"bg-neutral-800 text-purple-400 group-hover:bg-neutral-700"}`,children:l.jsx(mg,{className:"w-4 h-4"})}),'
    't==="registration"?l.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",children:"Active"}):l.jsx("span",{className:"text-[10px] font-semibold text-neutral-500",children:"03"})'
    ']}),'
    'l.jsxs("div",{children:['
    'l.jsx("div",{className:`font-bold text-sm ${t==="registration"?"text-emerald-400 font-extrabold":"text-white"}`,children:"New Register"}),'
    'l.jsx("div",{className:"text-[11px] text-neutral-400 mt-0.5",children:"Onboard Member"})'
    ']})'
    ']}),'
    # 4. Member List
    'l.jsxs("button",{id:"main-menu-grid-members",onClick:()=>e("members"),className:`group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${t==="members"?"bg-emerald-500/15 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg shadow-emerald-950/40":"bg-neutral-900/90 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-850"}`,children:['
    'l.jsxs("div",{className:"flex items-center justify-between w-full",children:['
    'l.jsx("div",{className:`p-2 rounded-lg transition-colors ${t==="members"?"bg-emerald-500 text-black shadow-sm":"bg-neutral-800 text-blue-400 group-hover:bg-neutral-700"}`,children:l.jsx(pg,{className:"w-4 h-4"})}),'
    't==="members"?l.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",children:"Active"}):l.jsx("span",{className:"text-[10px] font-semibold text-neutral-500",children:"04"})'
    ']}),'
    'l.jsxs("div",{children:['
    'l.jsx("div",{className:`font-bold text-sm ${t==="members"?"text-emerald-400 font-extrabold":"text-white"}`,children:"Member List"}),'
    'l.jsx("div",{className:"text-[11px] text-neutral-400 mt-0.5",children:`${f.length} Members & Plans`})'
    ']})'
    ']}),'
    # 5. Total Collection
    'l.jsxs("button",{id:"main-menu-grid-collection",onClick:()=>e("collection"),className:`group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${t==="collection"?"bg-emerald-500/15 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg shadow-emerald-950/40":"bg-neutral-900/90 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-850"}`,children:['
    'l.jsxs("div",{className:"flex items-center justify-between w-full",children:['
    'l.jsx("div",{className:`p-2 rounded-lg transition-colors ${t==="collection"?"bg-emerald-500 text-black shadow-sm":"bg-neutral-800 text-emerald-400 group-hover:bg-neutral-700"}`,children:l.jsx(qs,{className:"w-4 h-4"})}),'
    't==="collection"?l.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",children:"Active"}):l.jsx("span",{className:"text-[10px] font-semibold text-neutral-500",children:"05"})'
    ']}),'
    'l.jsxs("div",{children:['
    'l.jsx("div",{className:`font-bold text-sm ${t==="collection"?"text-emerald-400 font-extrabold":"text-white"}`,children:"Collection"}),'
    'l.jsx("div",{className:"text-[11px] text-neutral-400 mt-0.5",children:"Revenue & Fees"})'
    ']})'
    ']}),'
    # 6. Daily Attendance
    'l.jsxs("button",{id:"main-menu-grid-attendance",onClick:()=>e("attendance"),className:`group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${t==="attendance"?"bg-emerald-500/15 border-emerald-500/80 ring-1 ring-emerald-500/60 shadow-lg shadow-emerald-950/40":"bg-neutral-900/90 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-850"}`,children:['
    'l.jsxs("div",{className:"flex items-center justify-between w-full",children:['
    'l.jsx("div",{className:`p-2 rounded-lg transition-colors ${t==="attendance"?"bg-emerald-500 text-black shadow-sm":"bg-neutral-800 text-amber-400 group-hover:bg-neutral-700"}`,children:l.jsx(rA,{className:"w-4 h-4"})}),'
    't==="attendance"?l.jsx("span",{className:"text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",children:"Active"}):l.jsx("span",{className:"text-[10px] font-semibold text-neutral-500",children:"06"})'
    ']}),'
    'l.jsxs("div",{children:['
    'l.jsx("div",{className:`font-bold text-sm ${t==="attendance"?"text-emerald-400 font-extrabold":"text-white"}`,children:"Attendance"}),'
    'l.jsx("div",{className:"text-[11px] text-neutral-400 mt-0.5",children:"RFID & Barcode Scans"})'
    ']})'
    ']})'
    ']})})'
)

if target_bd_header in code and 'id:"crm-main-menus-grid"' not in code:
    code = code.replace(target_bd_header, target_bd_header + main_menus_grid_jsx + ',', 1)
    print("Main Menus Grid section added to CRM Overview (BD).")
else:
    print("BD header target already patched or not found.")

# Verify syntax with node --input-type=module -c
res = subprocess.run(['node', '--input-type=module', '-c'], input=code, capture_output=True, text=True)
if res.returncode != 0:
    print("Syntax verification failed!")
    print(res.stderr[:600])
    exit(1)

print("Syntax verification succeeded!")

# Write out to all bundle files
targets = [
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js'
]
if os.path.exists('dist/assets'):
    targets.extend([
        'dist/assets/index-BvAlUw77.js',
        'dist/assets/index-bvaluw77.js'
    ])

for p in targets:
    with open(p, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Updated {p} ({len(code)} bytes)")

print("All bundles successfully updated with Grid Layout for Main Menus!")
