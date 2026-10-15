# test_dmy_targets.py
with open('assets/index-BvAlUw77.js', 'r', encoding='utf-8') as f:
    c = f.read()

checks = [
    # 1. Receipt $1
    'c=new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})',
    'children:t.start_date',
    'children:t.expiry_date',
    'G.date||c',
    # 2. HTML Receipt gD
    '<div class="meta-line">Issue Date: <strong>${r}</strong></div>',
    '${t.start_date}',
    '${t.expiry_date}',
    # 3. Registration form pD
    'Calculated Expiry Date: ",l.jsx("strong",{children:Ce})',
    'Start: ",l.jsx("strong",{className:"text-white",children:q.start_date})',
    'Expiry: ",l.jsx("strong",{className:"text-emerald-400",children:q.expiry_date})',
    # 4. Search Member pB
    'DOB: ",h.date_of_birth',
    'children:h.start_date}),l.jsx("div",{className:"text-[11px] text-neutral-500 mt-0.5",children:"Start Date"})',
    'children:h.expiry_date}),l.jsx("div",{className:"text-[11px] text-neutral-600 font-medium mt-0.5",children:h.s',
    # 5. Members list mB
    'children:Ae.start_date}),l.jsx("td",{className:"py-3.5 px-4 font-mono text-xs font-semibold text-white",children:Ae.expiry_date})',
    # 6. Update Member bD
    'oldVal:zr||"N/A",newVal:Ye.trim()'
]

for item in checks:
    print('Found:', item[:45], '-->', item in c)
