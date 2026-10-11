import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generateAttendancePDF = (data: any[], range: { start: string, end: string }, summary: any) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text("ATTENDANCE AUDIT & CHECK-IN REPORT", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Range: ${range.start} to ${range.end}`, 105, 22, { align: "center" });

  // Summary
  const summaryText = `Total: ${summary.total} | Valid: ${summary.valid} | Expired: ${summary.expired} | Unique: ${summary.unique}`;
  doc.text(summaryText, 14, 35);

  // Table
  (doc as any).autoTable({
    head: [['Date', 'Time', 'Member Name', 'Member ID', 'Status', 'Notes']],
    body: data.map(item => [
      item.check_in_time.split(' ')[0],
      item.check_in_time.split(' ')[1],
      item.name,
      item.member_id,
      item.status.toUpperCase(),
      item.reception_notes || '-'
    ]),
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: { 4: { fillColor: item => item.cell.raw === 'VALID' ? [46, 204, 113] : [231, 76, 60] } }
  });

  doc.save(`attendance_report_${range.start}_to_${range.end}.pdf`);
};

export const downloadCSV = (data: any[], range: { start: string, end: string }) => {
  const headers = ["Check-In Date", "Check-In Time", "Member ID", "Member Name", "Status", "Reception Notes"];
  const csvContent = [
    headers.join(","),
    ...data.map(item => [
      item.check_in_time.split(' ')[0],
      item.check_in_time.split(' ')[1],
      item.member_id,
      item.name,
      item.status,
      item.reception_notes || ""
    ].join(","))
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `attendance_report_${range.start}_to_${range.end}.csv`;
  link.click();
};
