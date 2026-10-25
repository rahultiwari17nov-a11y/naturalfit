with open('assets/index-BvAlUw77.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Target 1: o4 function
t1_sub = 'async function o4(t,e,r=0){const a=await qI(t);if(!a)throw new Error("Member not found");'
print('T1 (o4):', t1_sub in code)

idx = code.find(t1_sub)
end_o4 = code.find('async function ZI()', idx)
print('o4 full text:\n', code[idx:end_o4])
print('='*50)

# Target 2: me in parent
t2_sub = 'me=async(be,L,renDisc=0)=>{try{const $=f.find(j=>j.id===be);'
print('T2 (me):', t2_sub in code)
idx2 = code.find(t2_sub)
end_me = code.find('},ie=async', idx2)
print('me full text:\n', code[idx2:end_me])
print('='*50)

# Target 3: mB state hooks
t3_sub = '[xe,De]=fe.useState(null),[be,L]=fe.useState("Monthly"),[renDisc,setRenDisc]=fe.useState(0),'
print('T3 (mB state):', t3_sub in code)
print('='*50)

# Target 4: ft submit handler
t4_sub = 'ft=async()=>{if(xe){if(!Ol(xe)){ve(`Renewal of members can only perform when existing plan is expired.'
print('T4 (ft):', t4_sub in code)
idx4 = code.find('ft=async()=>{if(xe){')
end_ft = code.find('},tr=async()=>{if(Be){', idx4)
print('ft full text:\n', code[idx4:end_ft])
print('='*50)

# Target 5: De click handlers
t5_sub = 'onClick:()=>{De(Ae),L(Ae.plan_type),setRenDisc(0)}'
print('T5 (De click 1):', t5_sub in code)
print('='*50)

# Target 6: Renew modal JSX
t6_start = 'xe&&l.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",children:l.jsxs("div",{className:"relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white",children:[l.jsxs("div",{className:"flex items-center justify-between pb-3 border-b border-neutral-800 mb-4",children:[l.jsxs("h3",{className:"font-bold text-sm",children:["Renew Plan for ",xe.name]'
print('T6 (Renew modal start):', t6_start in code)

# Let's find end of renew modal
idx6 = code.find(t6_start)
end_modal = code.find('}),Be!==null&&', idx6)
print('T6 end found:', end_modal != -1)
print('T6 full modal text:\n', code[idx6:end_modal])
