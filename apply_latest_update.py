# apply_latest_update.py
import re
import subprocess
import os

print("--- Step 1: Update attendance_code.js ---")
with open('attendance_code.js', 'r', encoding='utf-8') as f:
    att_code = f.read()

# 1. Remove Actions column header from attendance table
old_th = 'l.jsx("th",{className:"py-3.5 px-4",children:"Desk Notes"}),              l.jsx("th",{className:"py-3.5 px-4 text-right",children:"Actions"})'
new_th = 'l.jsx("th",{className:"py-3.5 px-4",children:"Desk Notes"})'
if old_th in att_code:
    att_code = att_code.replace(old_th, new_th)
    print("Actions table header removed from attendance log.")
else:
    print("Warning: old_th not matched exactly, checking regex...")
    att_code = re.sub(
        r'l\.jsx\("th",\{className:"py-3\.5 px-4 text-right",children:"Actions"\}\)',
        '',
        att_code
    )

# 2. Change colSpan:7 to colSpan:6 in empty state
att_code = att_code.replace('colSpan:7,', 'colSpan:6,')

# 3. Remove Profile action button td from attendance log rows
# Pattern: l.jsx("td",{className:"py-3 px-4 text-right",children:\s*l.jsx\("button",\{\s*onClick:\(\)=>onNavigateTab\("search"\),[\s\S]*?children:"Profile"\s*\}\)\s*\}\)
profile_td_pattern = r',\s*l\.jsx\("td",\{className:"py-3 px-4 text-right",children:\s*l\.jsx\("button",\{\s*onClick:\(\)=>onNavigateTab\("search"\),[\s\S]*?children:"Profile"\s*\}\)\s*\}\)'
if re.search(profile_td_pattern, att_code):
    att_code = re.sub(profile_td_pattern, '', att_code)
    print("Profile action button td removed from attendance log rows.")
else:
    print("Warning: profile_td_pattern not found via regex, trying literal match")
    # let's find Profile in att_code
    idx = att_code.find('children:"Profile"')
    if idx != -1:
        start_td = att_code.rfind('l.jsx("td",', 0, idx)
        end_td = att_code.find('})', idx) + 2
        print("Literal found td at:", start_td, end_td)
        # remove with leading comma
        comma_start = att_code.rfind(',', 0, start_td)
        att_code = att_code[:comma_start] + att_code[end_td:]
        print("Removed Profile td literally.")

# 4. Create standalone MemberICardModal component at top of attendance_code.js
member_icard_component = '''
const MemberICardModal = ({ member, onClose }) => {
  fe.useEffect(() => {
    if (member) {
      setTimeout(() => {
        const canvas = document.getElementById("card-barcode-canvas");
        if (canvas) {
          drawBarcode128(canvas, member.card_uid || `NFT-${member.member_id || member.id}`);
        }
      }, 100);
    }
  }, [member]);

  if (!member) return null;

  return l.jsxs("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",
    children: [
      l.jsxs("div", {
        className: "w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white",
        children: [
          l.jsxs("div", {
            className: "flex items-center justify-between pb-2 border-b border-neutral-800",
            children: [
              l.jsx("h3", { className: "text-sm font-bold text-white", children: "Member I-Card & Barcode" }),
              l.jsx("button", { onClick: onClose, className: "text-neutral-400 hover:text-white text-xl cursor-pointer", children: "×" })
            ]
          }),
          l.jsxs("div", {
            id: "printable-id-card-element",
            className: "rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-black border-2 border-emerald-500/40 p-5 shadow-2xl relative overflow-hidden",
            children: [
              l.jsxs("div", {
                className: "flex items-center justify-between pb-3 border-b border-neutral-800/80",
                children: [
                  l.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [
                      l.jsx("div", { className: "w-3 h-3 rounded-full bg-emerald-400 animate-pulse" }),
                      l.jsx("span", { className: "font-display font-extrabold text-sm tracking-wider text-emerald-400", children: "NFT GYM" })
                    ]
                  }),
                  l.jsx("span", { className: "text-[10px] uppercase font-bold tracking-widest text-neutral-400", children: "OFFICIAL CARD" })
                ]
              }),
              l.jsxs("div", {
                className: "flex items-center gap-3.5 my-4",
                children: [
                  member.profile_picture ?
                    l.jsx("img", { src: member.profile_picture, alt: member.name, className: "w-14 h-14 rounded-xl object-cover border-2 border-emerald-500/40 shrink-0" }) :
                    l.jsx("div", {
                      className: "w-14 h-14 rounded-xl bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center border-2 border-emerald-500/40 text-xl shrink-0 font-display",
                      children: (member.name || "M")[0].toUpperCase()
                    }),
                  l.jsxs("div", {
                    children: [
                      l.jsx("h4", { className: "font-bold text-sm text-white", children: member.name }),
                      l.jsxs("div", { className: "text-[11px] font-mono text-emerald-400 font-bold", children: ["ID: ", member.member_id || member.id] })
                    ]
                  })
                ]
              }),
              l.jsx("div", {
                className: "rounded-xl bg-white p-2 flex items-center justify-center shadow-inner",
                children: l.jsx("canvas", { id: "card-barcode-canvas", width: 280, height: 70, className: "w-full h-auto max-h-16" })
              }),
              l.jsx("p", {
                className: "text-[9px] text-neutral-500 text-center mt-3 tracking-wide uppercase",
                children: "Permanent Membership ID • Attendance & Access"
              })
            ]
          }),
          l.jsxs("div", {
            className: "flex items-center gap-2 pt-2",
            children: [
              l.jsxs("button", {
                onClick: () => { window.print(); },
                className: "flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                children: [
                  l.jsx(Do, { className: "w-3.5 h-3.5" }),
                  l.jsx("span", { children: "Direct Print Card" })
                ]
              }),
              l.jsxs("button", {
                onClick: () => {
                  try {
                    const { jsPDF } = window.jspdf || {};
                    if (!jsPDF) { window.print(); return; }
                    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [54, 85] });
                    doc.setFillColor(15, 23, 42);
                    doc.rect(0, 0, 54, 85, "F");
                    doc.setDrawColor(16, 185, 129);
                    doc.setLineWidth(0.8);
                    doc.rect(2, 2, 50, 81);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.setTextColor(52, 211, 153);
                    doc.text("NFT GYM", 6, 9);
                    doc.setFontSize(6);
                    doc.setTextColor(148, 163, 184);
                    doc.text("OFFICIAL CARD", 32, 9);
                    doc.setDrawColor(51, 65, 85);
                    doc.setLineWidth(0.3);
                    doc.line(6, 11, 48, 11);
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(10);
                    doc.text(member.name || "Member", 6, 18);
                    doc.setTextColor(34, 197, 94);
                    doc.setFontSize(8);
                    doc.text(`ID: ${member.member_id || member.id}`, 6, 23);
                    const canvas = document.getElementById("card-barcode-canvas");
                    if (canvas) {
                      const imgData = canvas.toDataURL("image/png");
                      doc.setFillColor(255, 255, 255);
                      doc.roundedRect(5, 28, 44, 28, 2, 2, "F");
                      doc.addImage(imgData, "PNG", 7, 30, 40, 24);
                    }
                    doc.setFontSize(6);
                    doc.setTextColor(100, 116, 139);
                    doc.text("Scan barcode for instant attendance", 27, 62, { align: "center" });
                    doc.save(`Member_Card_${member.member_id || member.id}.pdf`);
                  } catch(e) {
                    window.print();
                  }
                },
                className: "flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                children: [
                  l.jsx(xd, { className: "w-3.5 h-3.5" }),
                  l.jsx("span", { children: "Download Card PDF" })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
};
window.MemberICardModal = MemberICardModal;
'''

if 'const MemberICardModal' not in att_code:
    # insert before AttendanceManager
    idx_att = att_code.find('const AttendanceManager')
    att_code = att_code[:idx_att] + member_icard_component + '\n' + att_code[idx_att:]
    print("MemberICardModal component inserted into attendance_code.js.")

with open('attendance_code.js', 'w', encoding='utf-8') as f:
    f.write(att_code)

print("attendance_code.js updated successfully.")
