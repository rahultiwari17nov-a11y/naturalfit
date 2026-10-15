import os
import subprocess
import re
import zipfile

print("Starting Date Format update to DD-MM-YYYY in Attendance System...")

# =====================================================================
# 1. UPDATE ATTENDANCE_CODE.JS
# =====================================================================
with open('attendance_code.js', 'r', encoding='utf-8') as f:
    ac = f.read()

# Replace formatISTDate definition
old_format_date = """const formatISTDate = (val) => {
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
};"""

new_format_date = """const formatISTDate = (val) => {
  if (!val && val !== 0) return "";
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  if (/^\\d{2}-\\d{2}-\\d{4}$/.test(s)) return s;
  if (/^(\\d{2})[:\\/](\\d{2})[:\\/](\\d{4})$/.test(s)) return s.replace(/[:\\/]/g, "-");

  const m = s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  let d;
  if (val instanceof Date) d = val;
  else {
    let clean = s;
    if (clean.includes(" ") && !clean.includes("T")) clean = clean.replace(" ", "T");
    if (!clean.endsWith("Z") && !/[+-]\\d{2}(:?\\d{2})?$/.test(clean)) clean += "+05:30";
    d = new Date(clean);
  }

  if (isNaN(d.getTime())) d = new Date(s);
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
  return `${day}-${month}-${year}`;
};"""

if old_format_date in ac:
    ac = ac.replace(old_format_date, new_format_date)
    print("Replaced formatISTDate in attendance_code.js")
else:
    # Use regex replacement if needed
    ac = re.sub(
        r'const formatISTDate = \(val\) => \{.*?return `\$\{day\}:\$\{month\}:\$\{year\}`;?\s*\};',
        lambda m: new_format_date,
        ac,
        flags=re.DOTALL
    )
    print("Regex replaced formatISTDate in attendance_code.js")

# In table header, make sure it says Date & Time (IST)
old_th = 'l.jsx("th",{className:"py-3.5 px-4",children:timeframeMode==="single"?"Check-in Time (IST)":"Date & Time (IST)"})'
new_th = 'l.jsx("th",{className:"py-3.5 px-4",children:"Date & Time (IST)"})'
if old_th in ac:
    ac = ac.replace(old_th, new_th)
    print("Updated table header to always display 'Date & Time (IST)'")

# In table rows, always show both Date (DD-MM-YYYY) and Time (HH:MM:SS)
old_td = """                l.jsxs("td",{className:"py-3 px-4 font-mono",children:[
                  timeframeMode==="single"?l.jsx("span",{className:"font-bold text-white",children:timeStr}):
                  l.jsxs("div",{children:[
                    l.jsx("div",{className:"text-neutral-400 text-[11px]",children:dateStr}),
                    l.jsx("div",{className:"font-bold text-white",children:timeStr})
                  ]})
                ]}),"""

new_td = """                l.jsxs("td",{className:"py-3 px-4 font-mono",children:[
                  l.jsx("div",{className:"text-neutral-400 text-[11px]",children:dateStr}),
                  l.jsx("div",{className:"font-bold text-white",children:timeStr})
                ]}),"""

if old_td in ac:
    ac = ac.replace(old_td, new_td)
    print("Updated table row to display both DD-MM-YYYY date and check-in time")

# Also ensure PDF report header uses DD-MM-YYYY formatted dates
old_pdf_tf = 'const tfText = timeframeMode === "single" ? `Date: ${singleDate}` : `Timeframe: ${rangeStart} to ${rangeEnd}`;'
new_pdf_tf = 'const tfText = timeframeMode === "single" ? `Date: ${formatISTDate(singleDate)}` : `Timeframe: ${formatISTDate(rangeStart)} to ${formatISTDate(rangeEnd)}`;'
if old_pdf_tf in ac:
    ac = ac.replace(old_pdf_tf, new_pdf_tf)
    print("Updated PDF header timeframe format")

# Update expStr fallback in attendance_code.js to ensure DD-MM-YYYY
ac = ac.replace(
    'const expStr = target.expiry_date ? (window.__fmtDMY ? window.__fmtDMY(target.expiry_date) : target.expiry_date) : "--";',
    'const expStr = target.expiry_date ? (formatISTDate(target.expiry_date) || (window.__fmtDMY ? window.__fmtDMY(target.expiry_date) : target.expiry_date)) : "--";'
)
ac = ac.replace(
    'const expStr = memberObj?.expiry_date ? (window.__fmtDMY ? window.__fmtDMY(memberObj.expiry_date) : memberObj.expiry_date) : "--";',
    'const expStr = memberObj?.expiry_date ? (formatISTDate(memberObj.expiry_date) || (window.__fmtDMY ? window.__fmtDMY(memberObj.expiry_date) : memberObj.expiry_date)) : "--";'
)

with open('attendance_code.js', 'w', encoding='utf-8') as f:
    f.write(ac)

res_ac = subprocess.run(['node', '-c', 'attendance_code.js'], capture_output=True, text=True)
if res_ac.returncode != 0:
    print("FATAL: Syntax error in attendance_code.js:", res_ac.stderr)
    exit(1)
print("attendance_code.js updated and syntax verified!")


# =====================================================================
# 2. UPDATE SRC/COMPONENTS/ATTENDANCE/REPORTGENERATOR.TS
# =====================================================================
rg_path = 'src/components/attendance/ReportGenerator.ts'
if os.path.exists(rg_path):
    with open(rg_path, 'r', encoding='utf-8') as f:
        rg = f.read()

    new_rg_func = """/**
 * Format any date into strict IST (Asia/Kolkata) DD-MM-YYYY
 */
export const formatISTDate = (val: any): string => {
  if (!val && val !== 0) return "";
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  if (/^\\d{2}-\\d{2}-\\d{4}$/.test(s)) return s;
  if (/^(\\d{2})[:\\/](\\d{2})[:\\/](\\d{4})$/.test(s)) return s.replace(/[:\\/]/g, "-");

  const m = s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else {
    let clean = s;
    if (clean.includes(" ") && !clean.includes("T")) clean = clean.replace(" ", "T");
    if (!clean.endsWith("Z") && !/[+-]\\d{2}(:?\\d{2})?$/.test(clean)) clean += "+05:30";
    d = new Date(clean);
  }

  if (isNaN(d.getTime())) d = new Date(s);
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
  return `${day}-${month}-${year}`;
};"""

    rg = re.sub(
        r'/\*\*\s*\* Format any date into strict IST.*?export const formatISTDate = \(val: any\): string => \{.*?return `\$\{day\}:\$\{month\}:\$\{year\}`;?\s*\};',
        lambda m: new_rg_func,
        rg,
        flags=re.DOTALL
    )
    with open(rg_path, 'w', encoding='utf-8') as f:
        f.write(rg)
    print("ReportGenerator.ts updated with DD-MM-YYYY format!")


# =====================================================================
# 3. UPDATE INDEX.HTML AND DIST/INDEX.HTML
# =====================================================================
for html_path in ['index.html', 'dist/index.html']:
    if not os.path.exists(html_path):
        continue
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    # Enhance __fmtDMY to handle colon and slash formats to DD-MM-YYYY
    old_fmt_snippet = """        if (/^\\d{1,2}-\\d{1,2}-\\d{4}$/.test(s)) {
          var p = s.split("-");
          return p[0].padStart(2, "0") + "-" + p[1].padStart(2, "0") + "-" + p[2];
        }"""

    new_fmt_snippet = """        if (/^\\d{1,2}-\\d{1,2}-\\d{4}$/.test(s)) {
          var p = s.split("-");
          return p[0].padStart(2, "0") + "-" + p[1].padStart(2, "0") + "-" + p[2];
        }
        if (/^\\d{1,2}[:\\/]\\d{1,2}[:\\/]\\d{4}$/.test(s)) {
          var p = s.split(/[:\\/]/);
          return p[0].padStart(2, "0") + "-" + p[1].padStart(2, "0") + "-" + p[2];
        }"""

    if old_fmt_snippet in html and '[:\\/]' not in html:
        html = html.replace(old_fmt_snippet, new_fmt_snippet)
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"Updated {html_path} __fmtDMY helper")


# =====================================================================
# 4. INJECT INTO BUNDLES
# =====================================================================
bundle_files = [
    'assets/index-BvAlUw77.js',
    'assets/index-bvaluw77.js',
    'dist/assets/index-BvAlUw77.js',
    'dist/assets/index-bvaluw77.js'
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
        print(f"Warning: Markers not found in {bpath}")

# Validate main bundle
if os.path.exists('assets/index-BvAlUw77.js'):
    res_b = subprocess.run(['node', '--input-type=module', '-c'], input=open('assets/index-BvAlUw77.js').read(), capture_output=True, text=True)
    if res_b.returncode != 0:
        print("FATAL: Syntax error in assets/index-BvAlUw77.js:", res_b.stderr[:500])
        exit(1)
    print("Bundle syntax validation passed!")

# Update deploy-netlify.zip if it exists
if os.path.exists('deploy-netlify.zip'):
    with zipfile.ZipFile('deploy-netlify.zip', 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk('.'):
            if any(p in root for p in ['node_modules', '.git', '.aistudio', '__pycache__']):
                continue
            for f in files:
                if f.endswith('.zip') or f.endswith('.pyc'):
                    continue
                fp = os.path.join(root, f)
                arcname = os.path.relpath(fp, '.')
                z.write(fp, arcname)
    print("Updated deploy-netlify.zip")

print("ALL DD-MM-YYYY UPDATES APPLIED SUCCESSFULLY!")
