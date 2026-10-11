# inject_attendance.py
import re, json

with open('assets/index-bvaluw77.js.bak', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's prepare the AttendanceManager component code using const arrow functions:
attendance_code = r''';
// --- ATTENDANCE & RFID/BARCODE SCANNER MODULE ---
const drawBarcode128 = (canvas, text) => {
  if (!canvas || !text) return;
  try {
    const ctx = canvas.getContext('2d');
    const clean = String(text).trim().toUpperCase();
    const width = canvas.width || 320;
    const height = canvas.height || 80;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    const padding = 16;
    const usableW = width - (padding * 2);
    const bitPatterns = [
      "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
      "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
      "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
      "10111001100", "10011101100", "10011100110", "11001110010", "11001011100"
    ];
    let fullBits = "11010010000";
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i) % bitPatterns.length;
      fullBits += bitPatterns[charCode];
    }
    fullBits += "1100011101011";
    const unitW = usableW / fullBits.length;
    for (let b = 0; b < fullBits.length; b++) {
      if (fullBits[b] === '1') {
        ctx.fillRect(padding + (b * unitW), 8, Math.max(1, unitW), height - 26);
      }
    }
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(clean, width / 2, height - 6);
  } catch(e) {
    console.error("Barcode canvas error:", e);
  }
};

const playSynthesizedTone = (type, muted) => {
  if (muted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'valid') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'duplicate') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch(e) {
    console.warn("Audio synthesizer error:", e);
  }
};

const AttendanceManager = ({ members = [], onRefreshMembers, onNavigateTab }) => {
  const [logs, setLogs] = fe.useState([]);
  const [isLoading, setIsLoading] = fe.useState(!1);
  const [isMuted, setIsMuted] = fe.useState(() => localStorage.getItem("gym_attendance_muted") === "true");
  
  const [timeframeMode, setTimeframeMode] = fe.useState("single");
  const todayStr = fe.useMemo(() => new Date().toISOString().split("T")[0], []);
  const yesterdayStr = fe.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, []);
  
  const [singleDate, setSingleDate] = fe.useState(todayStr);
  const [rangeStart, setRangeStart] = fe.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [rangeEnd, setRangeEnd] = fe.useState(todayStr);

  const [statusFilter, setStatusFilter] = fe.useState("all");
  const [searchQuery, setSearchQuery] = fe.useState("");

  const [showManualModal, setShowManualModal] = fe.useState(!1);
  const [showReportModal, setShowReportModal] = fe.useState(!1);
  const [selectedCardMember, setSelectedCardMember] = fe.useState(null);

  const [manualSearch, setManualSearch] = fe.useState("");
  const [selectedMember, setSelectedMember] = fe.useState(null);
  const [manualNotes, setManualNotes] = fe.useState("");
  const [manualSubmitting, setManualSubmitting] = fe.useState(!1);

  const [alertBanner, setAlertBanner] = fe.useState(null);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem("gym_attendance_muted", String(next));
  };

  const fetchLogs = fe.useCallback(async () => {
    setIsLoading(!0);
    try {
      let url = "/api/attendance?";
      if (timeframeMode === "single") {
        url += `start_date=${singleDate}&end_date=${singleDate}`;
      } else {
        url += `start_date=${rangeStart}&end_date=${rangeEnd}`;
      }
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch(e) {
      console.error("Error fetching attendance logs:", e);
    } finally {
      setIsLoading(!1);
    }
  }, [timeframeMode, singleDate, rangeStart, rangeEnd, statusFilter, searchQuery]);

  fe.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const executeCheckIn = async (rawIdentifier, notes = "") => {
    if (!rawIdentifier || !String(rawIdentifier).trim()) return;
    const identifier = String(rawIdentifier).trim();

    // Check local member state
    const localMember = (allMembersList || []).find(m => 
      String(m.card_uid || "").trim().toLowerCase() === identifier.toLowerCase() ||
      String(m.member_id || "").trim().toLowerCase() === identifier.toLowerCase() ||
      String(m.id || "").trim() === identifier ||
      (m.mobile && String(m.mobile).replace(/\D/g, "").endsWith(identifier.replace(/\D/g, "")))
    );

    let isLocallyExpired = false;
    if (localMember && localMember.expiry_date) {
      try {
        const cleanExp = String(localMember.expiry_date).trim().split("T")[0].split(" ")[0];
        const parts = cleanExp.split("-");
        let expD;
        if (parts.length === 3) {
          if (parts[0].length === 4) expD = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          else if (parts[2].length === 4) expD = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
          expD = new Date(localMember.expiry_date);
        }
        if (expD) {
          const t0 = new Date();
          t0.setHours(0, 0, 0, 0);
          expD.setHours(0, 0, 0, 0);
          if (expD < t0) {
            isLocallyExpired = true;
          }
        }
      } catch (_) {}
    }

    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, notes })
      });
      
      let data = {};
      let responseText = "";
      try {
        responseText = await res.text();
        data = JSON.parse(responseText);
      } catch (parseErr) {
        data = {};
      }

      const isExpired = 
        res.status === 403 || 
        data.status === "expired" || 
        (data.error && data.error.toLowerCase().includes("expired")) ||
        (responseText && responseText.toLowerCase().includes("expired")) ||
        (isLocallyExpired && (!res.ok || data.status === "expired" || data.success === false));

      if (isExpired) {
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "expired",
          title: "Membership Expired",
          message: "Member plan has expired, please renew plan to continue",
          time: new Date().toLocaleTimeString("en-IN")
        });
        fetchLogs();
        return { success: !1, error: "Member plan has expired, please renew plan to continue", status: "expired" };
      } else if (res.status === 409 || data.status === "duplicate") {
        playSynthesizedTone("duplicate", isMuted);
        setAlertBanner({
          type: "duplicate",
          title: "Duplicate Attendance Blocked",
          message: data.error || `Duplicate Attendance Blocked: Member already checked in today. Multiple check-ins on the same day are not permitted.`,
          time: new Date().toLocaleTimeString("en-IN")
        });
        return { success: !1, error: data.error };
      } else if (res.ok && data.status === "valid" && data.success !== false) {
        playSynthesizedTone("valid", isMuted);
        const memberObj = data.member || localMember;
        const expStr = memberObj?.expiry_date ? (window.__fmtDMY ? window.__fmtDMY(memberObj.expiry_date) : memberObj.expiry_date) : "--";
        setAlertBanner({
          type: "valid",
          title: "Check-in Approved (24/7 Access Granted)",
          message: `Welcome ${memberObj?.name || "Member"}! Plan active till ${expStr}.`,
          time: new Date().toLocaleTimeString("en-IN")
        });
        fetchLogs();
        return { success: !0, data };
      } else if (res.status === 404 || data.status === "unregistered") {
        if (isLocallyExpired) {
          playSynthesizedTone("denied", isMuted);
          setAlertBanner({
            type: "expired",
            title: "Membership Expired",
            message: "Member plan has expired, please renew plan to continue",
            time: new Date().toLocaleTimeString("en-IN")
          });
          return { success: !1, error: "Member plan has expired, please renew plan to continue" };
        }
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "unregistered",
          title: "ACCESS DENIED (Unregistered Card)",
          message: data.error || `ACCESS DENIED: Card UID "${identifier}" not found in database.`,
          time: new Date().toLocaleTimeString("en-IN")
        });
        return { success: !1, error: data.error };
      } else {
        if (isLocallyExpired) {
          playSynthesizedTone("denied", isMuted);
          setAlertBanner({
            type: "expired",
            title: "Membership Expired",
            message: "Member plan has expired, please renew plan to continue",
            time: new Date().toLocaleTimeString("en-IN")
          });
          fetchLogs();
          return { success: !1, error: "Member plan has expired, please renew plan to continue" };
        }
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "error",
          title: "Scanner Notice",
          message: data.error || "Unable to complete check-in. Please verify member status.",
          time: new Date().toLocaleTimeString("en-IN")
        });
        return { success: !1, error: data.error };
      }
    } catch(err) {
      if (isLocallyExpired || (err && err.message && (err.message.includes("Unexpected token") || err.message.includes("is not valid JSON") || err.message.includes("403")))) {
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "expired",
          title: "Membership Expired",
          message: "Member plan has expired, please renew plan to continue",
          time: new Date().toLocaleTimeString("en-IN")
        });
        return { success: !1, error: "Member plan has expired, please renew plan to continue" };
      }
      setAlertBanner({
        type: "error",
        title: "Scanner Notice",
        message: "Failed to communicate with attendance server: " + err.message,
        time: new Date().toLocaleTimeString("en-IN")
      });
      return { success: !1, error: err.message };
    }
  };

  fe.useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;
    let lastScannedCode = "";
    let lastScanTimestamp = 0;

    const handleKeyDown = (e) => {
      const target = e.target;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isInput && target.id !== "scanner-dummy-input") {
        if (target.type === "text" || target.type === "tel" || target.type === "search") {
          return;
        }
      }

      const now = Date.now();
      const interval = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 2) {
          const scanned = buffer.trim();
          buffer = "";
          if (scanned === lastScannedCode && (now - lastScanTimestamp < 3000)) {
            return;
          }
          lastScannedCode = scanned;
          lastScanTimestamp = now;
          executeCheckIn(scanned, "USB Hardware Scanner");
        }
        buffer = "";
        return;
      }

      if (e.key.length === 1) {
        if (interval > 80 && buffer.length > 0) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMuted]);

  const kpiTotal = logs.length;
  const kpiValid = logs.filter(l => l.status === "valid").length;
  const kpiValidRate = kpiTotal > 0 ? Math.round((kpiValid / kpiTotal) * 100) : 0;
  const kpiExpired = logs.filter(l => l.status === "expired").length;
  const kpiUnique = fe.useMemo(() => {
    const set = new Set();
    logs.forEach(l => { if (l.member_id) set.add(String(l.member_id)); });
    return set.size;
  }, [logs]);

  const handleQuickCSV = (recordsToExport = logs) => {
    const headers = [
      "Check-In Date",
      "Check-In Time",
      "Member ID",
      "Card UID",
      "Member Name",
      "Membership Plan",
      "Plan Expiry Date",
      "Check-In Status",
      "Reception Notes"
    ];
    const rows = recordsToExport.map(r => {
      let dStr = "";
      let tStr = "";
      if (r.check_in_time) {
        const parts = String(r.check_in_time).replace("T", " ").split(" ");
        dStr = window.__fmtDMY ? window.__fmtDMY(parts[0]) : parts[0];
        tStr = parts[1] ? parts[1].split(".")[0] : "";
      }
      return [
        `"${dStr}"`,
        `"${tStr}"`,
        `"${r.member_id || ""}"`,
        `"${r.card_uid || ""}"`,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${r.plan_type || ""}"`,
        `"${window.__fmtDMY ? window.__fmtDMY(r.expiry_date) : (r.expiry_date || "")}"`,
        `"${(r.status || "").toUpperCase()}"`,
        `"${(r.reception_notes || "").replace(/"/g, '""')}"`
      ].join(",");
    });
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const sDate = timeframeMode === "single" ? singleDate : rangeStart;
    const eDate = timeframeMode === "single" ? singleDate : rangeEnd;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${sDate}_to_${eDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = (recordsToExport = logs) => {
    try {
      const doc = new jt({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      doc.setFillColor(10, 16, 12);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(16);
      doc.text("NFT GYM - BE AN INSPIRATION", margin, 12);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("ATTENDANCE AUDIT & CHECK-IN REPORT", margin, 18);
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(7.5);
      const tfText = timeframeMode === "single" ? `Date: ${singleDate}` : `Timeframe: ${rangeStart} to ${rangeEnd}`;
      doc.text(`${tfText}  |  Generated on: ${new Date().toLocaleString("en-IN")}`, margin, 24);

      doc.setFillColor(243, 244, 246);
      doc.rect(margin, 32, pageWidth - margin * 2, 14, "F");
      doc.setTextColor(31, 41, 55);
      doc.setFontSize(8.5);
      doc.text(`Total Scans: ${recordsToExport.length}  |  Valid: ${kpiValid} (${kpiValidRate}%)  |  Expired Denials: ${kpiExpired}  |  Unique Attendees: ${kpiUnique}`, margin + 3, 41);

      let y = 52;
      const drawTableHeader = () => {
        doc.setFillColor(17, 24, 39);
        doc.rect(margin, y, pageWidth - margin * 2, 7.5, "F");
        doc.setTextColor(34, 197, 94);
        doc.setFontSize(7.5);
        doc.text("TIME / DATE", margin + 2, y + 5);
        doc.text("MEMBER ID", margin + 32, y + 5);
        doc.text("MEMBER NAME", margin + 54, y + 5);
        doc.text("PLAN", margin + 98, y + 5);
        doc.text("EXPIRY", margin + 122, y + 5);
        doc.text("STATUS", margin + 146, y + 5);
        doc.text("NOTES", margin + 166, y + 5);
        y += 7.5;
      };

      drawTableHeader();
      let page = 1;

      recordsToExport.forEach((r, idx) => {
        if (y > pageHeight - 18) {
          doc.setTextColor(156, 163, 175);
          doc.setFontSize(7.5);
          doc.text(`Page ${page}  •  NFT GYM FRONT-DESK ERP`, pageWidth / 2, pageHeight - 7, { align: "center" });
          doc.addPage();
          page++;
          y = 14;
          drawTableHeader();
        }

        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y, pageWidth - margin * 2, 6.5, "F");
        }

        doc.setTextColor(55, 65, 81);
        doc.setFontSize(7);
        let timeLabel = "";
        if (r.check_in_time) {
          const parts = String(r.check_in_time).replace("T", " ").split(" ");
          const dPart = window.__fmtDMY ? window.__fmtDMY(parts[0]) : parts[0];
          const tPart = parts[1] ? parts[1].split(".")[0] : "";
          timeLabel = timeframeMode === "single" ? tPart : `${dPart} ${tPart}`;
        }
        doc.text(String(timeLabel).substring(0, 19), margin + 2, y + 4.5);
        doc.text(String(r.member_id || "").substring(0, 10), margin + 32, y + 4.5);
        doc.text(String(r.name || "").substring(0, 24), margin + 54, y + 4.5);
        doc.text(String(r.plan_type || "").substring(0, 13), margin + 98, y + 4.5);
        const expFormatted = window.__fmtDMY ? window.__fmtDMY(r.expiry_date) : (r.expiry_date || "--");
        doc.text(String(expFormatted).substring(0, 12), margin + 122, y + 4.5);

        if (r.status === "valid") {
          doc.setTextColor(22, 163, 74);
          doc.text("VALID", margin + 146, y + 4.5);
        } else if (r.status === "expired") {
          doc.setTextColor(220, 38, 38);
          doc.text("EXPIRED", margin + 146, y + 4.5);
        } else {
          doc.setTextColor(107, 114, 128);
          doc.text((r.status || "OTHER").toUpperCase(), margin + 146, y + 4.5);
        }

        doc.setTextColor(107, 114, 128);
        doc.text(String(r.reception_notes || "-").substring(0, 15), margin + 166, y + 4.5);
        y += 6.5;
      });

      doc.setTextColor(156, 163, 175);
      doc.setFontSize(7.5);
      doc.text(`Page ${page}  •  NFT GYM FRONT-DESK ERP AUDIT REPORT`, pageWidth / 2, pageHeight - 7, { align: "center" });

      const sDate = timeframeMode === "single" ? singleDate : rangeStart;
      const eDate = timeframeMode === "single" ? singleDate : rangeEnd;
      doc.save(`attendance_report_${sDate}_to_${eDate}.pdf`);
    } catch(err) {
      alert("Failed to export PDF: " + err.message);
    }
  };

  const filteredCandidates = fe.useMemo(() => {
    if (!manualSearch.trim()) return members.slice(0, 15);
    const q = manualSearch.toLowerCase();
    return members.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.member_id && String(m.member_id).toLowerCase().includes(q)) ||
      (m.mobile && m.mobile.includes(q)) ||
      (m.card_uid && m.card_uid.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [members, manualSearch]);

  const selectedMemberCheckedInToday = fe.useMemo(() => {
    if (!selectedMember) return null;
    return logs.find(l => String(l.member_id) === String(selectedMember.member_id) && l.status === "valid");
  }, [selectedMember, logs]);

  const isSelectedMemberExpired = fe.useMemo(() => {
    if (!selectedMember || !selectedMember.expiry_date) return !1;
    const exp = new Date(selectedMember.expiry_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp < now;
  }, [selectedMember]);

  fe.useEffect(() => {
    if (selectedCardMember) {
      setTimeout(() => {
        const canvas = document.getElementById("card-barcode-canvas");
        if (canvas) {
          drawBarcode128(canvas, selectedCardMember.card_uid || `NFT-${selectedCardMember.member_id || selectedCardMember.id}`);
        }
      }, 100);
    }
  }, [selectedCardMember]);

  return l.jsxs("div",{className:"space-y-6 animate-in fade-in duration-200",children:[
    l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl",children:[
      l.jsxs("div",{className:"flex items-center gap-3",children:[
        l.jsxs("div",{className:"p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 relative",children:[
          l.jsx(rA,{className:"w-6 h-6 animate-pulse"}),
          l.jsx("span",{className:"absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"})
        ]}),
        l.jsxs("div",{children:[
          l.jsxs("div",{className:"flex items-center gap-2",children:[
            l.jsx("h2",{className:"text-base font-bold text-white",children:"Front-Desk RFID & Barcode Hardware Scanner"}),
            l.jsx("span",{className:"px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500 text-black",children:"24/7 ACTIVE"})
          ]}),
          l.jsx("p",{className:"text-xs text-neutral-400 mt-0.5",children:"Global USB keyboard-wedge hook listening. Scan RFID card or Laser barcode anytime without clicking input."})
        ]})
      ]}),
      l.jsxs("div",{className:"flex items-center gap-2.5 w-full md:w-auto shrink-0",children:[
        l.jsxs("button",{
          onClick:toggleMute,
          className:`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${isMuted?"bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white":"bg-emerald-950/60 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900/60"}`,
          title:isMuted?"Audio Alert Chimes Muted (Click to Unmute)":"Audio Alert Chimes Active (Click to Mute)",
          children:[
            l.jsx("span",{children:isMuted?"🔇 Sound Muted":"🔊 Chimes Active"})
          ]
        }),
        l.jsxs("button",{
          onClick:()=>setShowManualModal(!0),
          className:"px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors shadow-sm cursor-pointer flex items-center gap-1.5",
          children:[
            l.jsx("span",{className:"text-sm leading-none",children:"+"}),
            l.jsx("span",{children:"Manual Check-in"})
          ]
        })
      ]})
    ]}),

    alertBanner&&l.jsxs("div",{
      className:`p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2 duration-200 ${
        alertBanner.type==="valid"?"bg-emerald-950/90 border-emerald-500 text-emerald-200":
        alertBanner.type==="duplicate"?"bg-amber-950/90 border-amber-500 text-amber-200":
        "bg-red-950/90 border-red-500 text-red-200"
      }`,
      children:[
        l.jsxs("div",{className:"flex items-start gap-3",children:[
          l.jsx("span",{className:"text-2xl shrink-0 mt-0.5",children:
            alertBanner.type==="valid"?"✓":
            alertBanner.type==="duplicate"?"⚠":
            "⛔"
          }),
          l.jsxs("div",{children:[
            l.jsxs("div",{className:"flex items-center gap-2",children:[
              l.jsx("strong",{className:"text-sm font-bold",children:alertBanner.title}),
              l.jsxs("span",{className:"text-[11px] opacity-75 font-mono",children:["[",alertBanner.time,"]"]})
            ]}),
            l.jsx("p",{className:"text-xs mt-1 font-medium leading-relaxed",children:alertBanner.message})
          ]})
        ]}),
        l.jsx("button",{
          onClick:()=>setAlertBanner(null),
          className:"text-lg opacity-70 hover:opacity-100 px-2 cursor-pointer",
          children:"×"
        })
      ]
    }),

    l.jsxs("div",{className:"grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",children:[
      l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md",children:[
        l.jsx("span",{className:"text-[11px] uppercase tracking-wider text-neutral-400 font-bold",children:"Total Scans"}),
        l.jsx("div",{className:"text-2xl sm:text-3xl font-black text-white font-display mt-1",children:kpiTotal}),
        l.jsx("span",{className:"text-[10px] text-neutral-500",children:"Active Timeframe Window"})
      ]}),
      l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md",children:[
        l.jsxs("div",{className:"flex items-center justify-between",children:[
          l.jsx("span",{className:"text-[11px] uppercase tracking-wider text-emerald-400 font-bold",children:"Valid Entries"}),
          l.jsxs("span",{className:"px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",children:[kpiValidRate,"% Rate"]})
        ]}),
        l.jsx("div",{className:"text-2xl sm:text-3xl font-black text-emerald-400 font-display mt-1",children:kpiValid}),
        l.jsx("span",{className:"text-[10px] text-neutral-500",children:"Permitted Front-Desk Visits"})
      ]}),
      l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md",children:[
        l.jsx("span",{className:"text-[11px] uppercase tracking-wider text-amber-400 font-bold",children:"Expired Attempts"}),
        l.jsx("div",{className:"text-2xl sm:text-3xl font-black text-amber-400 font-display mt-1",children:kpiExpired}),
        l.jsx("span",{className:"text-[10px] text-neutral-500",children:"Policy 3 Blocked Entries"})
      ]}),
      l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md",children:[
        l.jsx("span",{className:"text-[11px] uppercase tracking-wider text-blue-400 font-bold",children:"Unique Attendees"}),
        l.jsx("div",{className:"text-2xl sm:text-3xl font-black text-blue-400 font-display mt-1",children:kpiUnique}),
        l.jsx("span",{className:"text-[10px] text-neutral-500",children:"Distinct Members Scanned"})
      ]})
    ]}),

    l.jsxs("div",{className:"p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl",children:[
      l.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[
        l.jsxs("div",{className:"flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800 shrink-0",children:[
          l.jsx("button",{
            onClick:()=>setTimeframeMode("single"),
            className:`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${timeframeMode==="single"?"bg-emerald-500 text-black":"text-neutral-400 hover:text-white"}`,
            children:"Single Day"
          }),
          l.jsx("button",{
            onClick:()=>setTimeframeMode("range"),
            className:`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${timeframeMode==="range"?"bg-emerald-500 text-black":"text-neutral-400 hover:text-white"}`,
            children:"Date Range Timeframe"
          })
        ]}),

        l.jsxs("div",{className:"flex items-center gap-2",children:[
          l.jsxs("button",{
            onClick:()=>handleQuickCSV(logs),
            className:"px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer",
            title:"Download currently filtered entries to Excel-compatible CSV",
            children:[
              l.jsx("span",{children:"Quick CSV"})
            ]
          }),
          l.jsxs("button",{
            onClick:()=>setShowReportModal(!0),
            className:"px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"Download Report"})
            ]
          })
        ]})
      ]}),

      timeframeMode==="single"?l.jsxs("div",{className:"flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60",children:[
        l.jsx("span",{className:"text-xs text-neutral-400 font-medium",children:"Preset:"}),
        l.jsx("button",{
          onClick:()=>setSingleDate(todayStr),
          className:`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${singleDate===todayStr?"bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold":"bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"}`,
          children:"Today"
        }),
        l.jsx("button",{
          onClick:()=>setSingleDate(yesterdayStr),
          className:`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${singleDate===yesterdayStr?"bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold":"bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"}`,
          children:"Yesterday"
        }),
        l.jsxs("div",{className:"flex items-center gap-2 ml-auto",children:[
          l.jsx("span",{className:"text-xs text-neutral-400",children:"Select Date:"}),
          l.jsx("input",{
            type:"date",
            value:singleDate,
            onChange:e=>setSingleDate(e.target.value),
            className:"px-3 py-1.5 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"
          })
        ]})
      ]}):l.jsxs("div",{className:"flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/60",children:[
        l.jsx("span",{className:"text-xs text-neutral-400 font-medium",children:"Range Presets:"}),
        l.jsx("button",{
          onClick:()=>{
            const d = new Date(); d.setDate(d.getDate() - 7);
            setRangeStart(d.toISOString().split("T")[0]);
            setRangeEnd(todayStr);
          },
          className:"px-2.5 py-1 text-xs rounded-lg border bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white cursor-pointer",
          children:"Last 7 Days"
        }),
        l.jsx("button",{
          onClick:()=>{
            const d = new Date(); d.setDate(d.getDate() - 30);
            setRangeStart(d.toISOString().split("T")[0]);
            setRangeEnd(todayStr);
          },
          className:"px-2.5 py-1 text-xs rounded-lg border bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white cursor-pointer",
          children:"Last 30 Days"
        }),
        l.jsx("button",{
          onClick:()=>{
            const d = new Date();
            const first = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
            setRangeStart(first);
            setRangeEnd(todayStr);
          },
          className:"px-2.5 py-1 text-xs rounded-lg border bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white cursor-pointer",
          children:"This Month"
        }),
        l.jsxs("div",{className:"flex items-center gap-2 ml-auto",children:[
          l.jsx("span",{className:"text-xs text-neutral-400",children:"From:"}),
          l.jsx("input",{
            type:"date",
            value:rangeStart,
            onChange:e=>setRangeStart(e.target.value),
            className:"px-2.5 py-1 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"
          }),
          l.jsx("span",{className:"text-xs text-neutral-400",children:"To:"}),
          l.jsx("input",{
            type:"date",
            value:rangeEnd,
            onChange:e=>setRangeEnd(e.target.value),
            className:"px-2.5 py-1 text-xs rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none"
          })
        ]})
      ]}),

      l.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-neutral-800/60",children:[
        l.jsx("div",{className:"md:col-span-2",children:
          l.jsx("input",{
            type:"text",
            placeholder:"Search real-time by Member Name, Member ID, or Card UID...",
            value:searchQuery,
            onChange:e=>setSearchQuery(e.target.value),
            className:"w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
          })
        }),
        l.jsx("div",{children:
          l.jsxs("select",{
            value:statusFilter,
            onChange:e=>setStatusFilter(e.target.value),
            className:"w-full px-3.5 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-emerald-500 focus:outline-none",
            children:[
              l.jsx("option",{value:"all",children:"Status: All Scans"}),
              l.jsx("option",{value:"valid",children:"Status: Valid Entries Only"}),
              l.jsx("option",{value:"expired",children:"Status: Expired Attempts Only"}),
              l.jsx("option",{value:"unregistered",children:"Status: Unregistered Cards"})
            ]
          })
        })
      ]})
    ]}),

    l.jsxs("div",{className:"rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl",children:[
      l.jsx("div",{className:"overflow-x-auto",children:
        l.jsxs("table",{className:"w-full text-left border-collapse",children:[
          l.jsx("thead",{className:"bg-neutral-950/80 border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-400",children:
            l.jsxs("tr",{children:[
              l.jsx("th",{className:"py-3.5 px-4",children:timeframeMode==="single"?"Check-in Time":"Date & Time"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Member"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Card UID"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Plan & Validity"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Status"}),
              l.jsx("th",{className:"py-3.5 px-4",children:"Desk Notes"}),
              l.jsx("th",{className:"py-3.5 px-4 text-right",children:"Actions"})
            ]})
          }),
          l.jsx("tbody",{className:"divide-y divide-neutral-800/60 text-xs text-neutral-300",children:
            logs.length===0?l.jsx("tr",{children:
              l.jsx("td",{colSpan:7,className:"py-12 text-center text-neutral-500 font-medium",children:
                isLoading?"Loading attendance logs...":"No attendance records found for this timeframe."
              })
            }):logs.map(log=>{
              let timeStr = "--";
              let dateStr = "--";
              if (log.check_in_time) {
                const parts = String(log.check_in_time).replace("T", " ").split(" ");
                dateStr = window.__fmtDMY ? window.__fmtDMY(parts[0]) : parts[0];
                timeStr = parts[1] ? parts[1].split(".")[0] : "--";
              }
              const expDateStr = window.__fmtDMY ? window.__fmtDMY(log.expiry_date) : (log.expiry_date || "--");

              return l.jsxs("tr",{key:log.id,className:"hover:bg-neutral-800/40 transition-colors",children:[
                l.jsxs("td",{className:"py-3 px-4 font-mono",children:[
                  timeframeMode==="single"?l.jsx("span",{className:"font-bold text-white",children:timeStr}):
                  l.jsxs("div",{children:[
                    l.jsx("div",{className:"text-neutral-400 text-[11px]",children:dateStr}),
                    l.jsx("div",{className:"font-bold text-white",children:timeStr})
                  ]})
                ]}),
                l.jsxs("td",{className:"py-3 px-4",children:[
                  l.jsxs("div",{className:"flex items-center gap-2.5",children:[
                    l.jsx("div",{className:"w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-xs",children:
                      (log.name||"M")[0].toUpperCase()
                    }),
                    l.jsxs("div",{children:[
                      l.jsx("div",{className:"font-semibold text-white",children:log.name||"Unknown Member"}),
                      l.jsxs("div",{className:"text-[10px] text-neutral-400 font-mono",children:["ID: ",log.member_id||"--"]})
                    ]})
                  ]})
                ]}),
                l.jsx("td",{className:"py-3 px-4 font-mono text-[11px] text-neutral-400",children:log.card_uid||`RFID-${log.member_id||""}`}),
                l.jsxs("td",{className:"py-3 px-4",children:[
                  l.jsx("div",{className:"font-medium text-white",children:log.plan_type||"Regular"}),
                  l.jsxs("div",{className:"text-[10px] text-neutral-400",children:["Exp: ",expDateStr]})
                ]}),
                l.jsx("td",{className:"py-3 px-4",children:
                  log.status==="valid"?l.jsx("span",{className:"px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",children:"VALID"}):
                  log.status==="expired"?l.jsx("span",{className:"px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40",children:"EXPIRED"}):
                  l.jsx("span",{className:"px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-neutral-800 text-neutral-400 border border-neutral-700",children:log.status||"OTHER"})
                }),
                l.jsx("td",{className:"py-3 px-4 text-neutral-400 italic text-[11px]",children:log.reception_notes||"-"}),
                l.jsx("td",{className:"py-3 px-4 text-right",children:
                  l.jsxs("div",{className:"flex items-center justify-end gap-1.5",children:[
                    l.jsx("button",{
                      onClick:()=>{
                        const m = members.find(x => String(x.member_id) === String(log.member_id) || x.id === log.member_id);
                        if (m) setSelectedCardMember(m);
                        else setSelectedCardMember({ id: log.member_id, member_id: log.member_id, name: log.name, card_uid: log.card_uid, plan_type: log.plan_type, mobile: "" });
                      },
                      className:"p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 transition-colors cursor-pointer",
                      title:"Print Member ID Card / Barcode (No Expiry Date)",
                      children:l.jsx(Do,{className:"w-3.5 h-3.5"})
                    }),
                    l.jsx("button",{
                      onClick:()=>onNavigateTab("search"),
                      className:"px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold transition-colors cursor-pointer",
                      children:"Profile"
                    }),
                    log.status==="expired"&&l.jsx("button",{
                      onClick:()=>onNavigateTab("members"),
                      className:"px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 transition-colors cursor-pointer",
                      children:"Renew"
                    })
                  ]})
                })
              ]});
            })
          })
        ]})
      })
    ]}),

    showManualModal&&l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",children:[
      l.jsxs("div",{className:"w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 text-white",children:[
        l.jsxs("div",{className:"flex items-center justify-between pb-3 border-b border-neutral-800",children:[
          l.jsxs("div",{children:[
            l.jsx("h3",{className:"text-lg font-bold",children:"Reception Desk Manual Check-in"}),
            l.jsx("p",{className:"text-xs text-neutral-400",children:"Select registered candidate to check-in with live plan validation."})
          ]}),
          l.jsx("button",{onClick:()=>setShowManualModal(!1),className:"text-neutral-400 hover:text-white text-xl cursor-pointer",children:"×"})
        ]}),

        l.jsxs("div",{className:"space-y-4",children:[
          l.jsxs("div",{children:[
            l.jsx("label",{className:"block text-xs font-semibold text-neutral-300 mb-1.5",children:"Search Candidate / Member"}),
            l.jsx("input",{
              type:"text",
              placeholder:"Type name, mobile number, or member ID...",
              value:manualSearch,
              onChange:e=>setManualSearch(e.target.value),
              className:"w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
            })
          ]}),

          l.jsxs("div",{className:"max-h-40 overflow-y-auto space-y-1.5 pr-1",children:[
            filteredCandidates.map(c=>{
              const isSelected = selectedMember && selectedMember.id === c.id;
              const isExp = c.expiry_date ? (new Date(c.expiry_date) < new Date(new Date().setHours(0,0,0,0))) : !1;
              return l.jsxs("div",{
                key:c.id,
                onClick:()=>setSelectedMember(c),
                className:`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected?"bg-emerald-950/80 border-emerald-500 text-emerald-200":"bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/60"
                }`,
                children:[
                  l.jsxs("div",{children:[
                    l.jsx("div",{className:"font-bold text-white",children:c.name}),
                    l.jsxs("div",{className:"text-[10px] text-neutral-400",children:["ID: ",c.member_id||c.id,"  •  ",c.mobile||""]})
                  ]}),
                  l.jsxs("div",{className:"text-right",children:[
                    l.jsx("span",{className:`px-2 py-0.5 rounded text-[10px] font-bold ${isExp?"bg-red-500/20 text-red-400":"bg-emerald-500/20 text-emerald-400"}`,children:isExp?"EXPIRED":"ACTIVE"}),
                    l.jsxs("div",{className:"text-[10px] text-neutral-500 mt-0.5",children:["Exp: ",window.__fmtDMY?window.__fmtDMY(c.expiry_date):c.expiry_date]})
                  ]})
                ]
              });
            })
          ]}),

          selectedMember&&l.jsxs("div",{className:"p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2",children:[
            l.jsxs("div",{className:"flex items-center justify-between",children:[
              l.jsxs("span",{className:"text-xs text-neutral-400 font-semibold",children:["Selected: ",l.jsx("strong",{className:"text-white",children:selectedMember.name})]}),
              l.jsx("span",{className:`text-xs font-bold ${isSelectedMemberExpired?"text-red-400":"text-emerald-400"}`,children:isSelectedMemberExpired?"Membership Expired":"Membership Valid"})
            ]}),
            l.jsxs("div",{className:"text-[11px] text-neutral-400 flex items-center justify-between",children:[
              l.jsxs("span",{children:["Plan: ",selectedMember.plan_type]}),
              l.jsxs("span",{children:["Expires: ",window.__fmtDMY?window.__fmtDMY(selectedMember.expiry_date):selectedMember.expiry_date]})
            ]}),
            selectedMemberCheckedInToday&&l.jsxs("div",{className:"p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[11px] font-semibold",children:[
              "⚠ Already checked in today at ",
              selectedMemberCheckedInToday.check_in_time?selectedMemberCheckedInToday.check_in_time.split(" ")[1]:"earlier",
              ". Duplicate check-ins are strictly blocked."
            ]}),
            isSelectedMemberExpired&&l.jsx("div",{className:"p-2 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-[11px] font-semibold",children:
              `⛔ Membership expired on ${window.__fmtDMY?window.__fmtDMY(selectedMember.expiry_date):selectedMember.expiry_date}. Must be renewed at front desk.`
            })
          ]}),

          l.jsxs("div",{children:[
            l.jsx("label",{className:"block text-xs font-semibold text-neutral-300 mb-1.5",children:"Reception Desk Notes (Optional)"}),
            l.jsx("input",{
              type:"text",
              placeholder:"e.g. Forgot RFID tag at home, verified identity manually",
              value:manualNotes,
              onChange:e=>setManualNotes(e.target.value),
              className:"w-full px-3.5 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
            })
          ]})
        ]}),

        l.jsxs("div",{className:"flex items-center justify-end gap-3 pt-3 border-t border-neutral-800",children:[
          l.jsx("button",{
            onClick:()=>setShowManualModal(!1),
            className:"px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer",
            children:"Cancel"
          }),
          l.jsx("button",{
            disabled:!selectedMember||!!selectedMemberCheckedInToday||manualSubmitting,
            onClick:async()=>{
              if (!selectedMember) return;
              setManualSubmitting(!0);
              await executeCheckIn(selectedMember.card_uid || selectedMember.member_id || selectedMember.id, manualNotes || "Manual Check-in at Desk");
              setManualSubmitting(!1);
              setShowManualModal(!1);
            },
            className:`px-5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              !selectedMember||!!selectedMemberCheckedInToday||manualSubmitting?
              "bg-neutral-800 text-neutral-500 cursor-not-allowed":
              "bg-emerald-500 hover:bg-emerald-400 text-black shadow-md"
            }`,
            children:manualSubmitting?"Checking in...":selectedMemberCheckedInToday?"Check-in Blocked (Duplicate)":"Confirm Check-in"
          })
        ]})
      ]})
    ]}),

    showReportModal&&l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",children:[
      l.jsxs("div",{className:"w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5 text-white",children:[
        l.jsxs("div",{className:"flex items-center justify-between pb-3 border-b border-neutral-800",children:[
          l.jsxs("div",{children:[
            l.jsx("h3",{className:"text-lg font-bold",children:"Attendance Audit & Report Generator"}),
            l.jsx("p",{className:"text-xs text-neutral-400",children:"Generate and export attendance audit records in multiple formats."})
          ]}),
          l.jsx("button",{onClick:()=>setShowReportModal(!1),className:"text-neutral-400 hover:text-white text-xl cursor-pointer",children:"×"})
        ]}),

        l.jsxs("div",{className:"p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2",children:[
          l.jsxs("div",{className:"flex justify-between",children:[
            l.jsx("span",{className:"text-neutral-400",children:"Selected Timeframe:"}),
            l.jsx("strong",{className:"text-white font-mono",children:timeframeMode==="single"?singleDate:`${rangeStart} to ${rangeEnd}`})
          ]}),
          l.jsxs("div",{className:"flex justify-between",children:[
            l.jsx("span",{className:"text-neutral-400",children:"Total Filtered Scans:"}),
            l.jsx("strong",{className:"text-white",children:logs.length})
          ]}),
          l.jsxs("div",{className:"flex justify-between",children:[
            l.jsx("span",{className:"text-neutral-400",children:"Valid Entrance Rate:"}),
            l.jsxs("strong",{className:"text-emerald-400",children:[kpiValidRate,"% (",kpiValid," entries)"]})
          ]}),
          l.jsxs("div",{className:"flex justify-between",children:[
            l.jsx("span",{className:"text-neutral-400",children:"Expired Denial Audits:"}),
            l.jsxs("strong",{className:"text-amber-400",children:[kpiExpired," attempts"]})
          ]})
        ]}),

        l.jsxs("div",{className:"space-y-3 pt-2",children:[
          l.jsxs("button",{
            onClick:()=>{ handleDownloadPDF(logs); setShowReportModal(!1); },
            className:"w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"📄 Download PDF Audit Report (A4 Format)"})
            ]
          }),
          l.jsxs("button",{
            onClick:()=>{ handleQuickCSV(logs); setShowReportModal(!1); },
            className:"w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"📊 Download Excel-Compatible CSV (UTF-8 BOM)"})
            ]
          }),
          l.jsxs("button",{
            onClick:()=>{ window.print(); setShowReportModal(!1); },
            className:"w-full py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-medium text-xs flex items-center justify-center gap-2 border border-neutral-800 transition-colors cursor-pointer",
            children:[
              l.jsx("span",{children:"🖨 Open Print Preview"})
            ]
          })
        ]})
      ]})
    ]}),

    selectedCardMember&&l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",children:[
      l.jsxs("div",{className:"w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white",children:[
        l.jsxs("div",{className:"flex items-center justify-between pb-2 border-b border-neutral-800",children:[
          l.jsx("h3",{className:"text-sm font-bold",children:"Member ID Card & Barcode"}),
          l.jsx("button",{onClick:()=>setSelectedCardMember(null),className:"text-neutral-400 hover:text-white text-xl cursor-pointer",children:"×"})
        ]}),

        l.jsxs("div",{id:"printable-id-card-element",className:"rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-black border-2 border-emerald-500/40 p-5 shadow-2xl relative overflow-hidden",children:[
          l.jsxs("div",{className:"flex items-center justify-between pb-3 border-b border-neutral-800/80",children:[
            l.jsxs("div",{className:"flex items-center gap-2",children:[
              l.jsx("div",{className:"w-3 h-3 rounded-full bg-emerald-400 animate-pulse"}),
              l.jsx("span",{className:"font-display font-extrabold text-sm tracking-wider text-emerald-400",children:"NFT GYM"})
            ]}),
            l.jsx("span",{className:"text-[10px] uppercase font-bold tracking-widest text-neutral-400",children:"OFFICIAL CARD"})
          ]}),

          l.jsxs("div",{className:"flex items-center gap-3.5 my-4",children:[
            l.jsx("div",{className:"w-14 h-14 rounded-xl bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center border-2 border-emerald-500/40 text-xl shrink-0 font-display",children:
              (selectedCardMember.name||"M")[0].toUpperCase()
            }),
            l.jsxs("div",{children:[
              l.jsx("h4",{className:"font-bold text-sm text-white",children:selectedCardMember.name}),
              l.jsxs("div",{className:"text-[11px] font-mono text-emerald-400 font-bold",children:["ID: ",selectedCardMember.member_id||selectedCardMember.id]}),
              l.jsxs("div",{className:"text-[10px] text-neutral-400",children:["Plan: ",selectedCardMember.plan_type||"Regular"]})
            ]})
          ]}),

          l.jsx("div",{className:"rounded-xl bg-white p-2 flex items-center justify-center shadow-inner",children:
            l.jsx("canvas",{id:"card-barcode-canvas",width:280,height:70,className:"w-full h-auto max-h-16"})
          }),

          l.jsx("p",{className:"text-[9px] text-neutral-500 text-center mt-3 tracking-wide uppercase",children:
            "Permanent Membership ID • No renewal reprint needed"
          })
        ]}),

        l.jsxs("div",{className:"flex items-center gap-2 pt-2",children:[
          l.jsxs("button",{
            onClick:()=>{
              window.print();
            },
            className:"flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
            children:[
              l.jsx(Do,{className:"w-3.5 h-3.5"}),
              l.jsx("span",{children:"Direct Print Card"})
            ]
          }),
          l.jsxs("button",{
            onClick:()=>{
              try {
                const doc = new jt({ orientation: "landscape", unit: "mm", format: [85.6, 53.98] });
                doc.setFillColor(10, 16, 12);
                doc.rect(0, 0, 85.6, 53.98, "F");
                doc.setFillColor(34, 197, 94);
                doc.rect(0, 0, 85.6, 10, "F");
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(9);
                doc.text("NFT GYM - OFFICIAL MEMBER CARD", 42.8, 7, { align: "center" });

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.text(selectedCardMember.name || "Member", 6, 18);
                doc.setTextColor(34, 197, 94);
                doc.setFontSize(8);
                doc.text(`ID: ${selectedCardMember.member_id || selectedCardMember.id}`, 6, 23);
                doc.setTextColor(156, 163, 175);
                doc.setFontSize(7);
                doc.text(`Plan: ${selectedCardMember.plan_type || "Standard"}`, 6, 28);

                const canvas = document.getElementById("card-barcode-canvas");
                if (canvas) {
                  const dataUrl = canvas.toDataURL("image/png");
                  doc.addImage(dataUrl, "PNG", 6, 32, 73.6, 14);
                }
                doc.save(`Member_Card_${selectedCardMember.member_id || selectedCardMember.id}.pdf`);
              } catch(e) {
                alert("Error downloading card PDF: " + e.message);
              }
            },
            className:"px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer",
            children:"Download PDF"
          })
        ]})
      ]})
    ]})
  ]});
};
const '''

# Replace `,BD=` with attendance_code + `BD=`
target_comma_bd = ',BD=({currentTab:t,onNavigateTab:e,inquiries:r,onUpdateInquiryStatus:a,onDeleteInquiry:i,onRefreshInquiries:o,isLoadingInquiries:c,initialCandidate:d,onConvertToMember:h})=>'
if target_comma_bd not in code:
    raise Exception("target_comma_bd not found in code")

code = code.replace(target_comma_bd, attendance_code + target_comma_bd[1:])

# 2. Add Attendance button to Desktop navigation in hS
desktop_col_btn = 'l.jsxs("button",{id:"crm-nav-collection",onClick:()=>r("collection"),className:`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${e==="collection"?"bg-emerald-500 text-black shadow-sm font-bold":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(qs,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Total Collection"})]})'
desktop_att_btn = 'l.jsxs("button",{id:"crm-nav-attendance",onClick:()=>r("attendance"),className:`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer ${e==="attendance"?"bg-emerald-500 text-black shadow-sm font-bold":"text-neutral-400 hover:text-white hover:bg-neutral-800/80"}`,children:[l.jsx(rA,{className:"w-4 h-4 shrink-0"}),l.jsx("span",{children:"Attendance & Scanner"})]})'

if desktop_col_btn not in code:
    raise Exception("desktop_col_btn not found in code")
code = code.replace(desktop_col_btn, desktop_col_btn + "," + desktop_att_btn)

# 3. Add Attendance button to Mobile navigation in hS
mobile_grid = 'className:"grid grid-cols-5 gap-1 rounded-xl p-1 w-full text-center transition-colors duration-200 bg-neutral-900 border border-neutral-800"'
mobile_grid_6 = 'className:"grid grid-cols-6 gap-1 rounded-xl p-1 w-full text-center transition-colors duration-200 bg-neutral-900 border border-neutral-800"'

if mobile_grid in code:
    code = code.replace(mobile_grid, mobile_grid_6)

mobile_col_btn = 'l.jsxs("button",{id:"crm-nav-collection-mobile",onClick:()=>r("collection"),className:`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 min-w-0 text-[10px] sm:text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${e==="collection"?"bg-emerald-500 text-black shadow-sm font-bold":"text-neutral-400 hover:text-white"}`,children:[l.jsx(qs,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{children:"Collection"})]})'
mobile_att_btn = 'l.jsxs("button",{id:"crm-nav-attendance-mobile",onClick:()=>r("attendance"),className:`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-0.5 min-w-0 text-[10px] sm:text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${e==="attendance"?"bg-emerald-500 text-black shadow-sm font-bold":"text-neutral-400 hover:text-white"}`,children:[l.jsx(rA,{className:"w-3.5 h-3.5 shrink-0"}),l.jsx("span",{children:"Attendance"})]})'

if mobile_col_btn not in code:
    raise Exception("mobile_col_btn not found in code")
code = code.replace(mobile_col_btn, mobile_col_btn + "," + mobile_att_btn)

# 4. In BD Title:
bd_title_old = 't==="inquiries"?"Candidate Inquiries from Website":t==="collection"?"Total Collection & Revenue":"Gym Management Overview"'
bd_title_new = 't==="attendance"?"Daily Attendance & RFID / Barcode Scanner":t==="inquiries"?"Candidate Inquiries from Website":t==="collection"?"Total Collection & Revenue":"Gym Management Overview"'
if bd_title_old not in code:
    raise Exception("bd_title_old not found in code")
code = code.replace(bd_title_old, bd_title_new)

# 5. In BD View:
bd_view_old = 't==="collection"?l.jsx(yD,{members:f,onRefreshMembers:ee}):'
bd_view_new = 't==="attendance"?l.jsx(AttendanceManager,{members:f,onRefreshMembers:ee,onNavigateTab:e}):t==="collection"?l.jsx(yD,{members:f,onRefreshMembers:ee}):'
if bd_view_old not in code:
    raise Exception("bd_view_old not found in code")
code = code.replace(bd_view_old, bd_view_new)

# Replace all occurrences of "Staff Login" with "Admin Login"
code = code.replace("Staff Login", "Admin Login")

# Write out modified files
with open('assets/index-bvaluw77.js', 'w', encoding='utf-8') as f:
    f.write(code)

with open('assets/index-BvAlUw77.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Successfully injected clean Attendance module into both bundles!")
