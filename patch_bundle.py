# patch_bundle.py
# Clean bundle patcher for NFT Gym CRM & Public App
# Arranges all main menus in responsive CSS Grid Layout
import zipfile
import subprocess
import os

print("Starting clean bundle patching with Grid Layout for Main Menus...")

# 1. Read pristine original bundle from deploy zip
with zipfile.ZipFile('deploy-6ab9efe2cdaaa0264bc5f618.zip') as z:
    with z.open('assets/index-bvaluw77.js') as f:
        clean_orig = f.read().decode('utf-8')

print("Pristine bundle loaded, length:", len(clean_orig))

# Save pristine backup so assets/index-bvaluw77.js.bak is never corrupted
with open('assets/index-bvaluw77.js.bak', 'w', encoding='utf-8') as f:
    f.write(clean_orig)
if os.path.exists('dist/assets'):
    with open('dist/assets/index-bvaluw77.js.bak', 'w', encoding='utf-8') as f:
        f.write(clean_orig)

code = clean_orig

# 1.5. Upgrade Total Collection (yD) with dynamic preset highlighter & Financial Report PDF export
with open('new_yd.txt', 'r', encoding='utf-8') as f:
    upgraded_yd = f.read().strip()

idx_yd_start = code.find(',yD=({members:t')
idx_yd_end = code.find(',BD=', idx_yd_start)
if idx_yd_start == -1 or idx_yd_end == -1:
    raise Exception("yD start or BD boundary not found in bundle!")
code = code[:idx_yd_start] + upgraded_yd + code[idx_yd_end:]
print("Total Collection (yD) upgraded with dynamic preset highlighter and Financial Report PDF export.")

# 2. Extract Attendance module code from attendance_code.js
with open('attendance_code.js', 'r', encoding='utf-8') as f:
    att_code = f.read()

# 3. Patch BD definition
target_comma_bd = ',BD=({currentTab:t,onNavigateTab:e,inquiries:r,onUpdateInquiryStatus:a,onDeleteInquiry:i,onRefreshInquiries:o,isLoadingInquiries:c,initialCandidate:d,onConvertToMember:h})=>'
if target_comma_bd not in code:
    raise Exception("target_comma_bd not found in original bundle!")

replacement_bd = ';\n' + att_code + '\nconst BD=({currentTab:t,onNavigateTab:e,inquiries:r,onUpdateInquiryStatus:a,onDeleteInquiry:i,onRefreshInquiries:o,isLoadingInquiries:c,initialCandidate:d,onConvertToMember:h})=>'
code = code.replace(target_comma_bd, replacement_bd)
print("BD & Attendance module successfully injected.")

# 4. Patch Desktop Navigation in hS to CSS Grid Layout (Search, Inquiry, Register, Member, Collection, Attendance)
target_desk_start = 'l.jsxs("nav",{className:"flex items-center rounded-xl p-1 shrink-0 transition-colors duration-200 bg-neutral-900 border border-neutral-800 shadow-inner",children:['
idx_d_start = code.find(target_desk_start)
target_desk_end = code.find(',l.jsxs("div",{className:"flex items-center gap-3 shrink-0"', idx_d_start)
if idx_d_start == -1 or target_desk_end == -1:
    raise Exception("Desktop nav boundaries not found!")

old_desk_nav = code[idx_d_start:target_desk_end]

desktop_grid_nav = 'l.jsxs("nav",{id:"crm-nav-desktop-grid",className:"grid grid-cols-6 gap-1.5 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner shrink-0",children:[' \
    + 'l.jsxs("button",{id:"crm-nav-search",onClick:()=>r("search"),className:`flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${e==="search"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(Ic,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Search"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-inquiries",onClick:()=>r("inquiries"),className:`relative flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${e==="inquiries"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(Cs,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Inquiry"}),d>0&&l.jsx("span",{className:`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${e==="inquiries"?"bg-black text-emerald-400":"bg-emerald-500 text-black animate-pulse shadow-sm"}`,children:d})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-registration",onClick:()=>r("registration"),className:`flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${e==="registration"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(mg,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Register"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-members",onClick:()=>r("members"),className:`flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${e==="members"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(pg,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Member"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-collection",onClick:()=>r("collection"),className:`flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${e==="collection"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(qs,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Collection"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-attendance",onClick:()=>r("attendance"),className:`flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${e==="attendance"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(rA,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Attendance"})]})' \
    + ']})'

code = code.replace(old_desk_nav, desktop_grid_nav)
print("Desktop navigation (Grid layout) successfully applied.")

# 5. Patch Mobile Navigation in hS to responsive CSS Grid Layout
target_mob_start = 'l.jsx("nav",{className:"w-full",children:l.jsxs("div",{className:"grid grid-cols-5 gap-1 rounded-xl p-1 w-full text-center transition-colors duration-200 bg-neutral-900 border border-neutral-800",children:['
idx_m_start = code.find(target_mob_start)
target_mob_end = code.find('children:"Collection"})]})]})})', idx_m_start) + len('children:"Collection"})]})]})})')
if idx_m_start == -1 or target_mob_end == -1:
    raise Exception("Mobile nav boundaries not found!")

old_mob_nav = code[idx_m_start:target_mob_end]

mobile_grid_nav = 'l.jsx("nav",{className:"w-full mt-2",children:l.jsxs("div",{id:"crm-nav-mobile-grid",className:"grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1.5 w-full text-center rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner",children:[' \
    + 'l.jsxs("button",{id:"crm-nav-search-mobile",onClick:()=>r("search"),className:`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 min-w-0 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${e==="search"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(Ic,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{className:"truncate",children:"Search"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-inquiries-mobile",onClick:()=>r("inquiries"),className:`relative flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 min-w-0 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${e==="inquiries"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsxs("div",{className:"relative",children:[l.jsx(Cs,{className:"w-3.5 h-3.5 shrink-0"}),d>0&&l.jsx("span",{className:"absolute -top-1.5 -right-2 px-1 rounded-full text-[9px] font-black bg-emerald-400 text-black sm:hidden",children:d})]}),l.jsx("span",{className:"truncate",children:"Inquiry"}),d>0&&l.jsx("span",{className:`hidden sm:inline ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${e==="inquiries"?"bg-black text-emerald-400":"bg-emerald-500 text-black"}`,children:d})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-registration-mobile",onClick:()=>r("registration"),className:`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 min-w-0 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${e==="registration"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(mg,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{className:"truncate",children:"Register"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-members-mobile",onClick:()=>r("members"),className:`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 min-w-0 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${e==="members"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(pg,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{className:"truncate",children:"Member"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-collection-mobile",onClick:()=>r("collection"),className:`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 min-w-0 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${e==="collection"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(qs,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{className:"truncate",children:"Collection"})]}),' \
    + 'l.jsxs("button",{id:"crm-nav-attendance-mobile",onClick:()=>r("attendance"),className:`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 min-w-0 text-[11px] sm:text-xs font-semibold rounded-lg transition-all cursor-pointer ${e==="attendance"?"bg-emerald-500 text-black shadow-md font-bold ring-1 ring-emerald-400":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(rA,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{className:"truncate",children:"Attendance"})]})' \
    + ']})})'

code = code.replace(old_mob_nav, mobile_grid_nav)
print("Mobile navigation (Grid layout) successfully applied.")

# 6. Patch BD Title
bd_title_old = 't==="inquiries"?"Candidate Inquiries from Website":t==="collection"?"Total Collection & Revenue":"Gym Management Overview"'
bd_title_new = 't==="attendance"?"Daily Attendance & RFID / Barcode Scanner":t==="inquiries"?"Candidate Inquiries from Website":t==="collection"?"Total Collection & Revenue":"Gym Management Overview"'
if bd_title_old not in code:
    raise Exception("bd_title_old not found in code!")
code = code.replace(bd_title_old, bd_title_new)

# 7. Patch BD View
bd_view_old = 't==="collection"?l.jsx(yD,{members:f,onRefreshMembers:ee}):'
bd_view_new = 't==="attendance"?l.jsx(AttendanceManager,{members:f,onRefreshMembers:ee,onNavigateTab:e}):t==="collection"?l.jsx(yD,{members:f,onRefreshMembers:ee}):'
if bd_view_old not in code:
    raise Exception("bd_view_old not found in code!")
code = code.replace(bd_view_old, bd_view_new)

# 8. Second menu grid in BD removed as requested (kept only the menu grid below logout button)

# 9. Staff Login -> Admin Login
code = code.replace("Staff Login", "Admin Login")

# 10. Add I-Card print button to Member Details in Main Menu:
# 10a. Member List (mB) table row action area
mB_old = 'l.jsx("button",{id:`update-member-btn-${Ae.id}`,type:"button",onClick:()=>K(Ae),title:"Update member details","aria-label":"Update member details",className:"w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700 hover:border-emerald-500/50 inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-xs",children:l.jsx(Vh,{size:16,className:"w-4 h-4 text-emerald-400 shrink-0"})}),'
mB_new = mB_old + 'l.jsx("button",{id:`print-icard-btn-${Ae.id}`,type:"button",onClick:()=>window.openMemberICard&&window.openMemberICard(Ae),title:"Print Attendance I-Card","aria-label":"Print Attendance I-Card",className:"w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg bg-neutral-800 hover:bg-neutral-700 text-blue-400 border border-neutral-700 hover:border-blue-500/50 inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-xs",children:l.jsx(EB,{size:16,className:"w-4 h-4 text-blue-400 shrink-0"})}),'
if mB_old not in code:
    raise Exception("mB_old not found in code!")
code = code.replace(mB_old, mB_new)
print("I-Card print button added to Member List row action area.")

# 10b. Member Details (xD) top action bar
xD_top_old = 'l.jsxs("button",{id:"details-edit-member-btn",type:"button",onClick:()=>r(h),className:"flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 text-xs font-bold border border-neutral-300 transition-colors shadow-sm cursor-pointer",title:"Update Member Details",children:[l.jsx(Vh,{className:"w-3.5 h-3.5 text-red-600"}),l.jsx("span",{children:"Update Details"})]}),'
xD_top_new = xD_top_old + 'l.jsxs("button",{id:"details-print-icard-btn",type:"button",onClick:()=>window.openMemberICard&&window.openMemberICard(h),className:"flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer",title:"Print Attendance I-Card",children:[l.jsx(EB,{className:"w-3.5 h-3.5"}),l.jsx("span",{children:"Print I-Card"})]}),'
if xD_top_old not in code:
    raise Exception("xD_top_old not found in code!")
code = code.replace(xD_top_old, xD_top_new)
print("I-Card print button added to Member Details top action bar.")

# 10c. Member Details (xD) bottom action bar
xD_bot_old = 'l.jsxs("button",{id:"bottom-update-details-btn",type:"button",onClick:()=>r(h),className:"flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02]",title:"Update Member Details",children:[l.jsx(Vh,{className:"w-3.5 h-3.5 text-emerald-400"}),l.jsx("span",{children:"Update Details"})]}),'
xD_bot_new = xD_bot_old + 'l.jsxs("button",{id:"bottom-print-icard-btn",type:"button",onClick:()=>window.openMemberICard&&window.openMemberICard(h),className:"flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer hover:scale-[1.02]",title:"Print Attendance I-Card",children:[l.jsx(EB,{className:"w-3.5 h-3.5"}),l.jsx("span",{children:"Print I-Card"})]}),'
if xD_bot_old not in code:
    raise Exception("xD_bot_old not found in code!")
code = code.replace(xD_bot_old, xD_bot_new)
print("I-Card print button added to Member Details bottom action bar.")

# 10d. Search Member Details (vD) header action bar
vD_old = 'l.jsxs("button",{type:"button",onClick:()=>o(t),className:"flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors border border-neutral-700 shadow-sm cursor-pointer",title:"Print Receipt",children:[l.jsx(Do,{className:"w-3.5 h-3.5 text-emerald-400"}),l.jsx("span",{children:"Print Receipt"})]}),'
vD_new = vD_old + 'l.jsxs("button",{id:"search-member-print-icard-btn",type:"button",onClick:()=>window.openMemberICard&&window.openMemberICard(t),className:"flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer",title:"Print Attendance I-Card",children:[l.jsx(EB,{className:"w-3.5 h-3.5"}),l.jsx("span",{children:"Print I-Card"})]}),'
if vD_old not in code:
    raise Exception("vD_old not found in code!")
code = code.replace(vD_old, vD_new)
print("I-Card print button added to Search Member Details action area.")

# 10e. Hook up globalCardMember state and effect in BD
bd_state_old = 'const[f,p]=fe.useState([]),'
bd_state_new = 'const[f,p]=fe.useState([]),[globalCardMember,setGlobalCardMember]=fe.useState(null),'
if bd_state_old not in code:
    raise Exception("bd_state_old not found in code!")
code = code.replace(bd_state_old, bd_state_new)

bd_effect_old = 'fe.useEffect(()=>{ee()},[ee]);'
bd_effect_new = 'fe.useEffect(()=>{ee()},[ee]);fe.useEffect(()=>{window.__setGlobalCardMember=setGlobalCardMember;window.openMemberICard=be=>setGlobalCardMember(be);return()=>{window.__setGlobalCardMember=null;window.openMemberICard=null;}},[]);'
if bd_effect_old not in code:
    raise Exception("bd_effect_old not found in code!")
code = code.replace(bd_effect_old, bd_effect_new)

# Place MemberICardModal directly in root children array of BD (target BD specifically so wD is not touched)
bd_modal_old = 'elete"})]})})]})]})})]})},_d="nft_gym_token"'
bd_modal_new = 'elete"})]})})]})]})}),globalCardMember&&l.jsx(MemberICardModal,{member:globalCardMember,onClose:()=>setGlobalCardMember(null)})]})},_d="nft_gym_token"'
if bd_modal_old not in code:
    raise Exception("bd_modal_old not found in code!")
code = code.replace(bd_modal_old, bd_modal_new, 1)
print("Global MemberICardModal state and renderer successfully added to BD root.")

# 10. Write out to assets and dist
targets = [
    'assets/index-bvaluw77.js',
    'assets/index-BvAlUw77.js'
]
if os.path.exists('dist/assets'):
    targets.extend([
        'dist/assets/index-bvaluw77.js',
        'dist/assets/index-BvAlUw77.js'
    ])

for p in targets:
    with open(p, 'w', encoding='utf-8') as f:
        f.write(code)
    print(f"Written {p} ({len(code)} bytes)")

# 11. Verify syntax with node --input-type=module -c
res = subprocess.run(['node', '--input-type=module', '-c'], input=code, capture_output=True, text=True)
if res.returncode != 0:
    print("FATAL: Syntax validation failed!")
    print(res.stderr[:600])
    exit(1)

print("SUCCESS: Clean bundle patched with Grid Layout for Main Menus! Zero errors!")
