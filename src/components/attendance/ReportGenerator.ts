import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Format any date into strict IST (Asia/Kolkata) DD-MM-YYYY
 */
export const formatISTDate = (val: any): string => {
  if (!val && val !== 0) return "";
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (/^(\d{2})[:\/](\d{2})[:\/](\d{4})$/.test(s)) return s.replace(/[:\/]/g, "-");

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return `${m[3]}-${m[2]}-${m[1]}`;
  }

  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else {
    let clean = s;
    if (clean.includes(" ") && !clean.includes("T")) clean = clean.replace(" ", "T");
    if (!clean.endsWith("Z") && !/[+-]\d{2}(:?\d{2})?$/.test(clean)) clean += "+05:30";
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
};

/**
 * Format any time into strict IST (Asia/Kolkata) HH:MM:SS (24-hour)
 */
export const formatISTTime = (val: any): string => {
  if (!val && val !== 0) return "";
  let s = String(val).trim();
  if (!s || s === "N/A" || s === "--" || s === "undefined" || s === "null") return "";

  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s) && !s.includes("-") && !s.includes("/")) {
      return s;
    }
    if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
    if (!s.endsWith("Z") && !/[+-]\d{2}(:?\d{2})?$/.test(s)) s += "Z";
    d = new Date(s);
  }

  if (isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(d);
  let hour = parts.find(p => p.type === "hour")?.value || "00";
  if (hour === "24") hour = "00";
  const minute = parts.find(p => p.type === "minute")?.value || "00";
  const second = parts.find(p => p.type === "second")?.value || "00";
  return `${hour}:${minute}:${second}`;
};

export const generateAttendancePDF = (data: any[], range: { start: string, end: string }, summary: any) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text("ATTENDANCE AUDIT & CHECK-IN REPORT (IST)", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Timeframe (IST): ${range.start} to ${range.end}`, 105, 22, { align: "center" });

  // Summary
  const summaryText = `Total: ${summary.total} | Valid: ${summary.valid} | Expired: ${summary.expired} | Unique: ${summary.unique}`;
  doc.text(summaryText, 14, 32);

  // Table
  (doc as any).autoTable({
    head: [['Date (IST)', 'Time (IST)', 'Member ID', 'Member Name', 'Plan', 'Status', 'Notes']],
    body: data.map(item => {
      const memId = item.members?.member_id || item.member_id || "--";
      const memName = item.members?.name || item.name || "Unknown Member";
      const plan = item.members?.plan_type || item.plan_type || "Regular";
      return [
        formatISTDate(item.check_in_time),
        formatISTTime(item.check_in_time),
        memId,
        memName,
        plan,
        String(item.status || "").toUpperCase(),
        item.reception_notes || '-'
      ];
    }),
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: { 5: { fillColor: (item: any) => item.cell.raw === 'VALID' ? [46, 204, 113] : [231, 76, 60] } }
  });

  doc.save(`attendance_report_${range.start.replace(/:/g, "-")}_to_${range.end.replace(/:/g, "-")}.pdf`);
};

export const downloadCSV = (data: any[], range: { start: string, end: string }) => {
  const headers = [
    "Check-In Date",
    "Check-In Time",
    "Member ID",
    "Member Name",
    "Membership Plan",
    "Plan Expiry Date",
    "Check-In Status",
    "Reception Notes"
  ];
  const csvContent = [
    headers.join(","),
    ...data.map(item => {
      const memId = item.members?.member_id || item.member_id || "";
      const memName = item.members?.name || item.name || "Unknown Member";
      const plan = item.members?.plan_type || item.plan_type || "Regular";
      const expDate = formatISTDate(item.members?.expiry_date || item.expiry_date);
      const status = String(item.status || "").toUpperCase();
      const notes = item.reception_notes || "";
      return [
        `"${formatISTDate(item.check_in_time)}"`,
        `"${formatISTTime(item.check_in_time)}"`,
        `"${memId}"`,
        `"${memName.replace(/"/g, '""')}"`,
        `"${plan.replace(/"/g, '""')}"`,
        `"${expDate}"`,
        `"${status}"`,
        `"${notes.replace(/"/g, '""')}"`
      ].join(",");
    })
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `attendance_report_${range.start.replace(/:/g, "-")}_to_${range.end.replace(/:/g, "-")}.csv`;
  link.click();
};
