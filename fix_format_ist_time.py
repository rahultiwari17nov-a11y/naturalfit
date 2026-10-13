# fix_format_ist_time.py
import os
import subprocess

print("Fixing formatISTTime across all files...")

target_files = [
    'attendance_code.js',
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js',
    'dist/assets/index-BvAlUw77.js',
    'dist/assets/index-bvaluw77.js',
    'update_attendance_5bugs.py'
]

old_time_chunk = ''').format(d);
  let h = parts.find(p => p.type === "hour")?.value || "00";'''

new_time_chunk = ''').formatToParts(d);
  let h = parts.find(p => p.type === "hour")?.value || "00";'''

for filepath in target_files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if old_time_chunk in content:
        content = content.replace(old_time_chunk, new_time_chunk)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed formatISTTime in {filepath}")
    else:
        # Check if already formatToParts
        if new_time_chunk in content:
            print(f"Already using formatToParts in {filepath}")
        else:
            print(f"Target chunk not matched in {filepath}, searching pattern...")
            import re
            pattern = r'hour12:\s*false\s*\}\)\.format\(d\);'
            replacement = 'hour12: false }).formatToParts(d);'
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Regex replaced in {filepath}")

# Validate syntax
print("Validating bundle syntax...")
res = subprocess.run(['node', '--input-type=module', '-c'], input=open('assets/index-BvAlUw77.js').read(), capture_output=True, text=True)
if res.returncode != 0:
    print("Syntax error in assets/index-BvAlUw77.js:")
    print(res.stderr[:500])
else:
    print("Bundle syntax validation passed!")

print("All done!")
