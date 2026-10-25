# apply_renewal_payment_breakdown.py
import re, subprocess

print("=== Applying Registration-Style Payment & Fee Breakdown to Renewal Area ===")

with open('assets/index-BvAlUw77.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update o4 function to handle payment breakdown data (paid_amount, remaining_amount, tax, payment_mode)
old_o4 = '''async function o4(t,e,r=0){const a=await qI(t);if(!a)throw new Error("Member not found");if(!Ol(a))throw new Error(`Renewal can only be performed when existing plan is expired. Current plan is active until ${(window.__fmtDMY?window.__fmtDMY(a.expiry_date):a.expiry_date)}.`);const i=new Date().toISOString().split("T")[0],o=i,c=Tl(o,e),d=yi.find(v=>v.value===e),h=d&&d.fee!==null?d.fee:a.amount||0,disc=typeof r==="number"?Math.max(0,r):(r&&typeof r.discount==="number"?Math.max(0,r.discount):(Number(r)||0)),finalAmt=Math.max(0,h-disc);let f=[];if(a.renewal_history)try{f=JSON.parse(a.renewal_history),Array.isArray(f)||(f=[])}catch{f=[]}const p={id:`ren_${Date.now()}`,renewal_date:i,previous_plan:a.plan_type,previous_expiry:a.expiry_date,plan_type:e,start_date:o,expiry_date:c,amount:h,discount:disc,final_amount:finalAmt,paid_amount:finalAmt,payment_mode:a.payment_mode||"Via Online",notes:`Renewed to ${e} plan${disc>0?` (Discount: ₹${disc})`:""}`};f.unshift(p);let payHist=[];if(a.payment_history)try{payHist=JSON.parse(a.payment_history),Array.isArray(payHist)||(payHist=[])}catch{payHist=[]}payHist.push({id:`pay_ren_${Date.now()}`,date:o,amount:finalAmt,payment_mode:a.payment_mode||"Via Online",notes:`Renewal for ${e}${disc>0?` (₹${h} - ₹${disc} discount)`:""}`});return await af(t,{plan_type:e,start_date:o,expiry_date:c,amount:h,registration_fee:0,is_renewal:!0,discount:disc,tax:0,final_amount:finalAmt,paid_amount:finalAmt,remaining_amount:0,renewal_history:JSON.stringify(f),payment_history:JSON.stringify(payHist)})}'''

new_o4 = '''async function o4(t,e,r=0){
  const a=await qI(t);
  if(!a) throw new Error("Member not found");
  if(!Ol(a)) throw new Error(`Renewal can only be performed when existing plan is expired. Current plan is active until ${(window.__fmtDMY?window.__fmtDMY(a.expiry_date):a.expiry_date)}.`);
  const i=new Date().toISOString().split("T")[0], o=i, c=Tl(o,e), d=yi.find(v=>v.value===e), h=d&&d.fee!==null?d.fee:a.amount||0;
  let disc=0, tax=0, payMode=a.payment_mode||"Via Online", paidAmt=null, remainingAmt=null, customNotes="";
  if(typeof r==="number"){
    disc=Math.max(0,r);
  } else if(r && typeof r==="object"){
    disc=Number(r.discount)||0;
    tax=Number(r.tax)||0;
    payMode=r.payment_mode||payMode;
    if(r.paid_amount!==undefined && r.paid_amount!==null && r.paid_amount!==""){
      paidAmt=Math.max(0,Number(r.paid_amount));
    }
    if(r.remaining_amount!==undefined && r.remaining_amount!==null){
      remainingAmt=Math.max(0,Number(r.remaining_amount));
    }
    customNotes=r.notes||"";
  }
  const finalAmt=Math.max(0, h - disc + tax);
  if(paidAmt===null) paidAmt=finalAmt;
  if(remainingAmt===null) remainingAmt=Math.max(0, finalAmt - paidAmt);
  let f=[];
  if(a.renewal_history) try{ f=JSON.parse(a.renewal_history); if(!Array.isArray(f)) f=[]; }catch{ f=[]; }
  const p={
    id:`ren_${Date.now()}`,
    renewal_date:i,
    previous_plan:a.plan_type,
    previous_expiry:a.expiry_date,
    plan_type:e,
    start_date:o,
    expiry_date:c,
    amount:h,
    discount:disc,
    tax,
    final_amount:finalAmt,
    paid_amount:paidAmt,
    remaining_amount:remainingAmt,
    payment_mode:payMode,
    notes:customNotes || `Renewed to ${e} plan${disc>0?` (Discount: ₹${disc})`:""}${remainingAmt>0?` (Due: ₹${remainingAmt})`:""}`
  };
  f.unshift(p);
  let payHist=[];
  if(a.payment_history) try{ payHist=JSON.parse(a.payment_history); if(!Array.isArray(payHist)) payHist=[]; }catch{ payHist=[]; }
  if(paidAmt>0){
    payHist.push({
      id:`pay_ren_${Date.now()}`,
      date:o,
      amount:paidAmt,
      payment_mode:payMode,
      notes:`Renewal for ${e}${disc>0?` (₹${h} - ₹${disc} discount)`:""}${remainingAmt>0?` [Part payment, Due: ₹${remainingAmt}]`:" [Fully Paid]"}`
    });
  }
  return await af(t,{
    plan_type:e,
    start_date:o,
    expiry_date:c,
    amount:h,
    registration_fee:0,
    is_renewal:!0,
    discount:disc,
    tax,
    final_amount:finalAmt,
    paid_amount:paidAmt,
    remaining_amount:remainingAmt,
    payment_mode:payMode,
    renewal_history:JSON.stringify(f),
    payment_history:JSON.stringify(payHist)
  });
}'''

assert old_o4 in code, "old_o4 not found in bundle!"
code = code.replace(old_o4, new_o4, 1)
print("1. o4 updated with part payment and full fee breakdown support.")

# 2. Update me callback to report part payment in toast
old_me = '''me=async(be,L,renDisc=0)=>{try{const $=f.find(j=>j.id===be);if($&&!Ol($)){R(`Renewal of members can only perform when existing plan is expired. (Current plan is active until ${$.expiry_date})`);return}await o4(be,L,renDisc),F(`Membership plan successfully renewed to ${L}!${Number(renDisc)>0?` (Discount: ₹${renDisc})`:""}`),ee()}catch($){R($.message||"Error renewing membership")}}'''

new_me = '''me=async(be,L,renPaymentData=0)=>{try{const $=f.find(j=>j.id===be);if($&&!Ol($)){R(`Renewal of members can only perform when existing plan is expired. (Current plan is active until ${$.expiry_date})`);return}await o4(be,L,renPaymentData);const paidNote=(renPaymentData&&typeof renPaymentData==="object"&&renPaymentData.remaining_amount>0)?` (Paid: ₹${renPaymentData.paid_amount}, Due: ₹${renPaymentData.remaining_amount})`:"";F(`Membership plan successfully renewed to ${L}!${paidNote}`),ee()}catch($){R($.message||"Error renewing membership")}}'''

assert old_me in code, "old_me not found in bundle!"
code = code.replace(old_me, new_me, 1)
print("2. me callback updated.")

# 3. In MembersList component, add state variables for breakdown
old_members_state = '[xe,De]=fe.useState(null),[be,L]=fe.useState("Monthly"),[renDisc,setRenDisc]=fe.useState(0),'
new_members_state = '[xe,De]=fe.useState(null),[be,L]=fe.useState("Monthly"),[renDisc,setRenDisc]=fe.useState(0),[renTax,setRenTax]=fe.useState(0),[renPaid,setRenPaid]=fe.useState(""),[isPaidPristine,setIsPaidPristine]=fe.useState(!0),[renPayMode,setRenPayMode]=fe.useState("Via Online"),'

assert old_members_state in code, "old_members_state not found in bundle!"
code = code.replace(old_members_state, new_members_state, 1)
print("3. MembersList state updated with renTax, renPaid, isPaidPristine, renPayMode.")

# 4. In MembersList table row Renew button onClick: initialize all fee breakdown states
old_renew_btn_click = 'onClick:()=>{De(Ae),L(Ae.plan_type),setRenDisc(0)}'
new_renew_btn_click = 'onClick:()=>{De(Ae),L(Ae.plan_type),setRenDisc(0),setRenTax(0),setRenPaid(""),setIsPaidPristine(!0),setRenPayMode(Ae.payment_mode||"Via Online")}'

assert old_renew_btn_click in code, "old_renew_btn_click not found in bundle!"
code = code.replace(old_renew_btn_click, new_renew_btn_click)
print("4. Renew button onClick updated.")

# 5. In ft (Confirm Renewal submit handler), support part payment validation and payload
old_ft = '''if(z.trim()!==Bd){ve("Incorrect security code. Admin authorization required.");return}j(!0);try{await c(xe.id,be,renDisc),De(null),W(""),ve(""),we(!1),setRenDisc(0)}finally{j(!1)}}'''

new_ft = '''const curPf=(()=>{const f=yi.find(Ae=>Ae.value===be);return f&&typeof f.fee==="number"?f.fee:(xe.amount||0)})();const discV=Number(renDisc)||0,taxV=Number(renTax)||0,finalV=Math.max(0,curPf-discV+taxV),paidV=renPaid!==""?Number(renPaid):finalV;if(paidV<=0&&finalV>0){ve("Paid Amount is required and must be greater than ₹0. Renewal cannot be completed if nothing is paid.");return}if(paidV>finalV){ve(`Paid Amount cannot exceed Net Fee of ₹${finalV.toLocaleString("en-IN")}.`);return}if(z.trim()!==Bd){ve("Incorrect security code. Admin authorization required.");return}const remV=Math.max(0,finalV-paidV);const renPayload={discount:discV,tax:taxV,paid_amount:paidV,remaining_amount:remV,payment_mode:renPayMode||"Via Online",notes:`Renewal for ${be} (${remV>0?`Part payment: ₹${paidV} of ₹${finalV}, Due: ₹${remV}`:"Fully Paid"})`};j(!0);try{await c(xe.id,be,renPayload),De(null),W(""),ve(""),we(!1),setRenDisc(0),setRenTax(0),setRenPaid(""),setIsPaidPristine(!0)}finally{j(!1)}}'''

assert old_ft in code, "old_ft not found in bundle!"
code = code.replace(old_ft, new_ft, 1)
print("5. ft submit handler updated with part payment validation.")

# 6. Replace Renewal Modal JSX body with Payment & Fee Breakdown matching New Member Registration
# Find the modal container and update width from max-w-md to max-w-2xl
old_modal_box = 'xe&&l.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",children:l.jsxs("div",{className:"relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white",'
new_modal_box = 'xe&&l.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200",children:l.jsxs("div",{className:"relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto",'

assert old_modal_box in code, "old_modal_box not found in bundle!"
code = code.replace(old_modal_box, new_modal_box, 1)

# Find the old discount section and replace with full Payment & Fee Breakdown
old_fee_section = '''(()=>{const pf=(()=>{const f=yi.find(Ae=>Ae.value===be);return f&&typeof f.fee==="number"?f.fee:(xe.amount||0)})(),netAmt=Math.max(0,pf-Number(renDisc||0));return l.jsxs("div",{className:"p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5",children:[l.jsxs("div",{className:"flex items-center justify-between text-xs",children:[l.jsx("span",{className:"text-neutral-400 font-medium",children:"Standard Plan Fee:"}),l.jsxs("span",{className:"font-mono font-bold text-white",children:["₹",pf.toLocaleString("en-IN")]})]}),l.jsxs("div",{className:"space-y-1",children:[l.jsxs("div",{className:"flex items-center justify-between",children:[l.jsxs("label",{htmlFor:"renew-discount-input",className:"text-xs font-semibold text-neutral-300 flex items-center gap-1",children:[l.jsx("span",{children:"Discount on Renewal (₹):"}),l.jsx("span",{className:"text-[10px] text-emerald-400 font-mono font-bold",children:Number(renDisc)>0?`-₹${Number(renDisc).toLocaleString("en-IN")}`:"(Optional)"})]}),l.jsx("span",{className:"text-[10px] text-neutral-500",children:`Max ₹${pf}`})]}),l.jsx("input",{id:"renew-discount-input",type:"number",min:"0",max:String(pf),value:renDisc===0?"":renDisc,onChange:Ae=>{const v=Ae.target.value===""?0:Math.max(0,Math.min(pf,Number(Ae.target.value)||0));setRenDisc(v)},placeholder:"Enter discount in ₹ (e.g. 100)",className:"w-full px-3 py-2 bg-neutral-900 border border-neutral-700 focus:border-emerald-500 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"})]}),l.jsxs("div",{className:"flex items-center justify-between pt-2 border-t border-neutral-800 text-xs font-bold",children:[l.jsx("span",{className:"text-emerald-300",children:"Net Payable Amount:"}),l.jsxs("span",{className:"text-base font-black font-mono text-emerald-400",children:["₹",netAmt.toLocaleString("en-IN")]})]})]})})()'''

new_fee_section = '''(()=>{
  const pf=(()=>{const f=yi.find(Ae=>Ae.value===be);return f&&typeof f.fee==="number"?f.fee:(xe.amount||0)})();
  const discV=Number(renDisc)||0, taxV=Number(renTax)||0;
  const netAmt=Math.max(0,pf-discV+taxV);
  const effectivePaid=renPaid!==""?Math.max(0,Number(renPaid)):netAmt;
  const remAmt=Math.max(0,netAmt-effectivePaid);
  const isPart=effectivePaid<netAmt;

  return l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3.5 shadow-inner",children:[
    // Header matching Registration New Member
    l.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-neutral-800 gap-2.5",children:[
      l.jsxs("div",{className:"flex items-center gap-2",children:[
        l.jsx(qs,{className:"w-4 h-4 text-emerald-400"}),
        l.jsx("span",{className:"text-xs font-bold uppercase tracking-wider text-emerald-400",children:"Payment & Fee Breakdown"})
      ]}),
      l.jsxs("div",{className:"flex flex-wrap items-center gap-2.5",children:[
        l.jsxs("div",{className:"flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px]",children:[
          l.jsx("span",{className:"text-neutral-500 font-medium",children:"Type:"}),
          l.jsx("span",{className:"font-bold text-emerald-400 font-mono",children:"Renewal (Reg. Fee Waived)"})
        ]}),
        l.jsxs("div",{className:"flex items-center gap-1.5",children:[
          l.jsxs("span",{className:"text-[11px] text-neutral-300 font-medium",children:["Payment Mode ",l.jsx("span",{className:"text-red-400",children:"*"}),":"]}),
          l.jsxs("select",{
            id:"renew-payment-mode-select",
            value:renPayMode,
            onChange:Ae=>setRenPayMode(Ae.target.value),
            className:"px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white font-semibold cursor-pointer focus:border-emerald-500 focus:outline-none",
            children:[
              l.jsx("option",{value:"Via Online",children:"Via Online"}),
              l.jsx("option",{value:"Cash",children:"Cash"}),
              l.jsx("option",{value:"UPI",children:"UPI"}),
              l.jsx("option",{value:"Card",children:"Card"})
            ]
          })
        ]})
      ]})
    ]}),

    // 6-Field Grid exactly matching Payment & Fee Breakdown of registration
    l.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",children:[
      // 1. Total Amount (Locked from Plan)
      l.jsxs("div",{children:[
        l.jsxs("div",{className:"flex items-center justify-between mb-1",children:[
          l.jsxs("label",{className:"block text-xs font-bold text-neutral-300",children:["Total Amount (₹) ",l.jsx("span",{className:"text-red-400",children:"*"})]}),
          l.jsx("span",{className:"text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold font-mono",children:"Derived from Plan"})
        ]}),
        l.jsxs("div",{className:"relative",children:[
          l.jsx("span",{className:"absolute left-3 top-2 text-neutral-500 font-bold text-xs",children:"₹"}),
          l.jsx("input",{
            id:"renew-total-amount-input",
            type:"number",
            readOnly:!0,
            tabIndex:-1,
            value:pf,
            className:"w-full pl-7 pr-3 py-2 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs font-mono font-bold text-neutral-300 cursor-not-allowed select-none"
          })
        ]}),
        l.jsx("span",{className:"text-[10px] text-neutral-500 mt-0.5 block",children:`Standard fee for ${be}.`})
      ]}),

      // 2. Registration Fee (Waived)
      l.jsxs("div",{children:[
        l.jsxs("div",{className:"flex items-center justify-between mb-1",children:[
          l.jsx("label",{className:"block text-xs font-bold text-neutral-300",children:"Registration Fee (₹)"}),
          l.jsx("span",{className:"text-[10px] text-neutral-400 bg-neutral-800 border border-neutral-700 px-1.5 py-0.2 rounded font-bold font-mono",children:"Waived ₹0"})
        ]}),
        l.jsxs("div",{className:"relative",children:[
          l.jsx("span",{className:"absolute left-3 top-2 text-neutral-500 font-bold text-xs",children:"₹"}),
          l.jsx("input",{
            id:"renew-registration-fee-input",
            type:"number",
            disabled:!0,
            value:0,
            className:"w-full pl-7 pr-3 py-2 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs font-mono font-bold text-neutral-500 cursor-not-allowed select-none"
          })
        ]}),
        l.jsx("span",{className:"text-[10px] text-neutral-500 mt-0.5 block",children:"Waived for all renewals."})
      ]}),

      // 3. Discount (₹)
      l.jsxs("div",{children:[
        l.jsxs("div",{className:"flex items-center justify-between mb-1",children:[
          l.jsx("label",{htmlFor:"renew-discount-input",className:"block text-xs font-bold text-neutral-300",children:"Discount (₹)"}),
          discV>0&&l.jsxs("span",{className:"text-[10px] text-emerald-400 font-mono font-bold",children:["-₹",discV.toLocaleString("en-IN")]})
        ]}),
        l.jsxs("div",{className:"relative",children:[
          l.jsx("span",{className:"absolute left-3 top-2 text-neutral-500 font-bold text-xs",children:"₹"}),
          l.jsx("input",{
            id:"renew-discount-input",
            type:"number",
            min:"0",
            max:String(pf),
            value:renDisc===0?"":renDisc,
            onChange:Ae=>{
              const v=Ae.target.value===""?0:Math.max(0,Math.min(pf,Number(Ae.target.value)||0));
              setRenDisc(v);
              if(isPaidPristine) setRenPaid("");
            },
            placeholder:"0",
            className:"w-full pl-7 pr-3 py-2 bg-neutral-900 border border-neutral-700 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-emerald-400 placeholder-neutral-500 focus:outline-none"
          })
        ]}),
        l.jsx("span",{className:"text-[10px] text-neutral-500 mt-0.5 block",children:`Max discount: ₹${pf}.`})
      ]}),

      // 4. Tax (₹)
      l.jsxs("div",{children:[
        l.jsxs("div",{className:"flex items-center justify-between mb-1",children:[
          l.jsx("label",{className:"block text-xs font-bold text-neutral-300",children:"Tax (₹)"}),
          l.jsx("span",{className:"text-[10px] text-neutral-500",children:"Optional"})
        ]}),
        l.jsxs("div",{className:"relative",children:[
          l.jsx("span",{className:"absolute left-3 top-2 text-neutral-500 font-bold text-xs",children:"₹"}),
          l.jsx("input",{
            id:"renew-tax-input",
            type:"number",
            min:"0",
            value:renTax===0?"":renTax,
            onChange:Ae=>{
              const v=Ae.target.value===""?0:Math.max(0,Number(Ae.target.value)||0);
              setRenTax(v);
              if(isPaidPristine) setRenPaid("");
            },
            placeholder:"0",
            className:"w-full pl-7 pr-3 py-2 bg-neutral-900 border border-neutral-700 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-red-400 placeholder-neutral-500 focus:outline-none"
          })
        ]}),
        l.jsx("span",{className:"text-[10px] text-neutral-500 mt-0.5 block",children:"Applicable GST / Taxes."})
      ]}),

      // 5. Paid Amount (₹) - PART PAYMENT SUPPORT
      l.jsxs("div",{children:[
        l.jsxs("div",{className:"flex items-center justify-between mb-1",children:[
          l.jsxs("label",{className:"block text-xs font-bold text-neutral-300",children:["Paid Amount (₹) ",l.jsx("span",{className:"text-red-400",children:"*"})]}),
          isPart?l.jsx("span",{className:"text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold",children:"Part Payment"}):l.jsx("span",{className:"text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold",children:"Full Payment"})
        ]}),
        l.jsxs("div",{className:"relative",children:[
          l.jsx("span",{className:"absolute left-3 top-2 text-neutral-500 font-bold text-xs",children:"₹"}),
          l.jsx("input",{
            id:"renew-paid-amount-input",
            type:"number",
            required:!0,
            min:"1",
            max:String(netAmt),
            value:effectivePaid,
            onChange:Ae=>{
              setIsPaidPristine(!1);
              const raw=Ae.target.value;
              if(raw===""){
                setRenPaid("");
              } else {
                const num=Math.max(0,Math.min(netAmt,Number(raw)||0));
                setRenPaid(num);
              }
            },
            placeholder:`Enter paid amount (e.g. ${netAmt})`,
            className:"w-full pl-7 pr-3 py-2 bg-neutral-900 border border-neutral-700 focus:border-emerald-500 rounded-xl text-xs font-mono font-bold text-emerald-400 placeholder-neutral-500 focus:outline-none"
          })
        ]}),
        l.jsx("span",{className:"text-[10px] text-neutral-400 mt-0.5 block",children:"Member can pay full or part payment (min ₹1)."})
      ]}),

      // 6. Remaining Amount (₹) - DUE
      l.jsxs("div",{children:[
        l.jsxs("div",{className:"flex items-center justify-between mb-1",children:[
          l.jsx("label",{className:"block text-xs font-bold text-neutral-300",children:"Remaining Amount (₹)"}),
          l.jsx("span",{className:`text-[10px] px-1.5 py-0.2 rounded font-bold font-mono ${remAmt>0?"text-amber-400 bg-amber-500/15 border border-amber-500/30":"text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"}`,children:remAmt>0?`Due: ₹${remAmt}`:"Nil Due"})
        ]}),
        l.jsxs("div",{className:"relative",children:[
          l.jsx("span",{className:"absolute left-3 top-2 text-neutral-500 font-bold text-xs",children:"₹"}),
          l.jsx("input",{
            id:"renew-remaining-amount-input",
            type:"number",
            readOnly:!0,
            tabIndex:-1,
            value:remAmt,
            className:`w-full pl-7 pr-3 py-2 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none ${remAmt>0?"text-amber-400 font-bold":"text-neutral-400"}`
          })
        ]}),
        l.jsx("span",{className:"text-[10px] text-neutral-500 mt-0.5 block",children:remAmt>0?"Pending due balance for next installment.":"Plan will be fully cleared."})
      ]})
    ]}),

    // Net Summary Bar
    l.jsxs("div",{className:"p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs",children:[
      l.jsxs("div",{children:[
        l.jsx("span",{className:"text-neutral-400",children:"Net Fee: "}),
        l.jsxs("strong",{className:"text-white font-mono",children:["₹",netAmt.toLocaleString("en-IN")]})
      ]}),
      l.jsxs("div",{children:[
        l.jsx("span",{className:"text-neutral-400",children:"Paid Now: "}),
        l.jsxs("strong",{className:"text-emerald-400 font-mono",children:["₹",effectivePaid.toLocaleString("en-IN")]}),
        l.jsxs("span",{className:"text-[10px] text-neutral-500 ml-1 font-mono",children:["(",renPayMode,")"]})
      ]}),
      l.jsxs("div",{children:[
        l.jsx("span",{className:"text-neutral-400",children:"Balance Due: "}),
        l.jsxs("strong",{className:`font-mono ${remAmt>0?"text-amber-400 font-bold":"text-emerald-400"}`,children:[remAmt>0?`₹${remAmt.toLocaleString("en-IN")}`:"Nil Due"]})
      ]})
    ]})
  ]})
})()'''

assert old_fee_section in code, "old_fee_section not found in bundle!"
code = code.replace(old_fee_section, new_fee_section, 1)
print("6. Renewal Modal JSX updated with full Payment & Fee Breakdown.")

# 7. Check syntax with node
with open('test_renew_syntax.mjs', 'w', encoding='utf-8') as f:
    f.write(code)

res = subprocess.run(['node', '--check', 'test_renew_syntax.mjs'], capture_output=True, text=True)
subprocess.run(['rm', '-f', 'test_renew_syntax.mjs'])
print('Node syntax check returncode:', res.returncode)
assert res.returncode == 0, f"Syntax Error: {res.stderr}"

# 8. Sync across all bundle files
targets = [
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js',
    'dist/assets/index-BvAlUw77.js',
    'dist/assets/index-bvaluw77.js'
]

for t in targets:
    with open(t, 'w', encoding='utf-8') as f:
        f.write(code)
    test_file = t + '.test.mjs'
    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(code)
    res = subprocess.run(['node', '--check', test_file], capture_output=True, text=True)
    subprocess.run(['rm', '-f', test_file])
    assert res.returncode == 0, f"Error in {t}: {res.stderr}"
    print(f"Verified {t}: OK")

print("SUCCESS: Payment & Fee Breakdown with Part Payment successfully implemented in Renewal!")
