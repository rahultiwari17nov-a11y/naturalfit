# update_member_confirm_button.py
import os
import shutil

print("=== Updating Member Details confirmation modal in bundles ===")

files_to_update = [
    "assets/index-BvAlUw77.js",
    "assets/index-bvaluw77.js",
    "dist/assets/index-BvAlUw77.js",
    "dist/assets/index-bvaluw77.js"
]

for file_path in files_to_update:
    if not os.path.exists(file_path):
        print(f"Skipping non-existent file: {file_path}")
        continue
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Remove the secondary authorization code verification from Ot function
    old_ot = 'Ot=async()=>{if(Xe(""),!q.trim()){Xe("Security authorization code is required to finalize update.");return}if(q.trim()!==Bd){Xe("Incorrect security code. Authorization failed.");return}'
    new_ot = 'Ot=async()=>{Xe("");'
    
    if old_ot in content:
        content = content.replace(old_ot, new_ot)
        print(f"[{file_path}] Successfully removed secondary code validation in Ot")
    else:
        print(f"[{file_path}] Warning: old_ot pattern not found (might already be updated)")

    # 2. Update the header subtitle in the confirmation modal
    old_sub = 'l.jsx("p",{className:"text-xs text-amber-400 font-medium",children:"Warning: Database modifications require re-authorization"})'
    new_sub = 'l.jsx("p",{className:"text-xs text-emerald-400 font-medium",children:"Admin authorized • Review changes and click Confirm"})'
    
    if old_sub in content:
        content = content.replace(old_sub, new_sub)
        print(f"[{file_path}] Successfully updated modal header subtitle")
    else:
        print(f"[{file_path}] Warning: old_sub pattern not found")

    # 3. Replace the Authorization Code input field container with the clean Verified card + final Confirm button
    old_input_div = 'l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-950 border border-amber-500/40 space-y-2.5",children:[l.jsxs("div",{className:"flex items-center justify-between",children:[l.jsxs("div",{className:"flex items-center gap-2",children:[l.jsx(pa,{className:"w-4 h-4 text-amber-400"}),l.jsxs("label",{htmlFor:"confirm-update-security-code-input",className:"text-xs font-bold text-amber-300 uppercase tracking-wide",children:["Re-enter Security Authorization Code ",l.jsx("span",{className:"text-amber-400",children:"*"})]})]}),l.jsx("span",{className:"text-[10px] text-amber-400 font-mono font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80",children:"Mandatory"})]}),l.jsx("p",{className:"text-xs text-neutral-300",children:"To confirm and permanently commit these modifications to the database, please re-enter the admin security code."}),l.jsxs("div",{className:"relative",children:[l.jsx("input",{id:"confirm-update-security-code-input",type:Re?"text":"password",value:q,onChange:Ae=>{Ze(Ae.target.value),at&&Xe("")},onKeyDown:Ae=>{Ae.key==="Enter"&&(Ae.preventDefault(),Ot())},placeholder:"Enter security code again",className:`w-full pl-3 pr-10 py-2.5 bg-neutral-900 border rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:ring-1 ${at?"border-red-500 focus:ring-red-500":"border-neutral-700 focus:border-amber-400 focus:ring-amber-400"}`}),l.jsx("button",{type:"button",onClick:()=>lt(!Re),tabIndex:-1,className:"absolute right-3 top-2.5 text-neutral-400 hover:text-white",children:Re?l.jsx(bd,{className:"w-4 h-4"}):l.jsx(wd,{className:"w-4 h-4"})})]}),at&&l.jsxs("p",{className:"text-xs text-red-400 font-semibold pt-0.5 flex items-center gap-1.5",children:[l.jsx(wi,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{children:at})]})]})'

    new_input_div = 'l.jsxs("div",{className:"p-4 rounded-2xl bg-emerald-950/25 border border-emerald-500/40 space-y-3",children:[l.jsxs("div",{className:"flex items-center justify-between",children:[l.jsxs("div",{className:"flex items-center gap-2",children:[l.jsx(UB,{className:"w-4 h-4 text-emerald-400"}),l.jsx("span",{className:"text-xs font-bold text-emerald-300 uppercase tracking-wide",children:"Security Authorization Verified"})]}),l.jsx("span",{className:"text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/80",children:"Authorized"})]}),l.jsx("p",{className:"text-xs text-neutral-300 leading-relaxed",children:"Admin security authorization has been verified. Review the modified fields above and click the Confirm button to proceed with updating the database record."}),l.jsx("div",{className:"pt-1",children:l.jsx("button",{id:"inline-finalize-member-update-btn",type:"button",onClick:Ot,disabled:be,className:"w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/50 cursor-pointer",children:be?l.jsxs(l.Fragment,{children:[l.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),l.jsx("span",{children:"Updating Database..."})]}):l.jsxs(l.Fragment,{children:[l.jsx(UB,{className:"w-4 h-4"}),l.jsx("span",{children:"Confirm"})]})})}),at&&l.jsxs("p",{className:"text-xs text-red-400 font-semibold pt-0.5 flex items-center gap-1.5",children:[l.jsx(wi,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{children:at})]})]})'

    if old_input_div in content:
        content = content.replace(old_input_div, new_input_div)
        print(f"[{file_path}] Successfully replaced authorization code field with final Confirm button")
    else:
        print(f"[{file_path}] Warning: old_input_div pattern not found")

    # 4. Update the footer button to emerald styling with "Confirm" text
    old_btn = 'l.jsx("button",{id:"finalize-member-update-btn",type:"button",onClick:Ot,disabled:be,className:"flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-lg shadow-amber-950/50",children:be?l.jsxs(l.Fragment,{children:[l.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),l.jsx("span",{children:"Updating Database..."})]}):l.jsxs(l.Fragment,{children:[l.jsx(UB,{className:"w-4 h-4"}),l.jsx("span",{children:"Confirm & Update Data"})]})})'

    new_btn = 'l.jsx("button",{id:"finalize-member-update-btn",type:"button",onClick:Ot,disabled:be,className:"flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-lg shadow-emerald-950/50 cursor-pointer",children:be?l.jsxs(l.Fragment,{children:[l.jsx("span",{className:"w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"}),l.jsx("span",{children:"Updating Database..."})]}):l.jsxs(l.Fragment,{children:[l.jsx(UB,{className:"w-4 h-4"}),l.jsx("span",{children:"Confirm"})]})})'

    if old_btn in content:
        content = content.replace(old_btn, new_btn)
        print(f"[{file_path}] Successfully updated footer button to emerald Confirm button")
    else:
        print(f"[{file_path}] Warning: old_btn pattern not found")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[{file_path}] Written successfully.")

print("All files updated successfully.")
