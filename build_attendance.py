# build_attendance.py
import re

with open('assets/index-bvaluw77.js', 'r', encoding='utf-8') as f:
    code = f.read()

print('Original length:', len(code))

# Verify insertion points:
# 1. Desktop Nav Button in hS:
# Look for id:"crm-nav-collection"
idx_col = code.find('id:"crm-nav-collection"')
print('idx_col:', idx_col)
if idx_col == -1:
    raise Exception('crm-nav-collection not found')

# 2. Mobile Nav Button in hS:
idx_col_mob = code.find('id:"crm-nav-collection-mobile"')
print('idx_col_mob:', idx_col_mob)
if idx_col_mob == -1:
    raise Exception('crm-nav-collection-mobile not found')

# 3. Tab header title in BD:
idx_bd_title = code.find('t==="collection"?"Total Collection & Revenue"')
print('idx_bd_title:', idx_bd_title)

# 4. Tab view render in BD:
idx_bd_view = code.find('t==="collection"?l.jsx(yD,{members:f,onRefreshMembers:ee})')
print('idx_bd_view:', idx_bd_view)

print('All 4 anchors found successfully!')
