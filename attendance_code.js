;
;
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

  const handlePrintCard = () => {
    try {
      const canvas = document.getElementById("card-barcode-canvas");
      const barcodeImg = canvas ? canvas.toDataURL("image/png") : "";
      let printFrame = document.getElementById("icard-isolated-print-frame");
      if (!printFrame) {
        printFrame = document.createElement("iframe");
        printFrame.id = "icard-isolated-print-frame";
        printFrame.style.position = "fixed";
        printFrame.style.right = "0";
        printFrame.style.bottom = "0";
        printFrame.style.width = "0";
        printFrame.style.height = "0";
        printFrame.style.border = "none";
        document.body.appendChild(printFrame);
      }
      const idNum = member.member_id || member.id;
      const name = member.name || "Member";
      const phone = member.phone || "";
      const photo = member.profile_picture || "";
      const doc = printFrame.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NFT GYM - I-Card - ${name}</title>
  <style>
    @page { size: 85.6mm 53.98mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body {
      width: 85.6mm;
      height: 53.98mm;
      margin: 0;
      padding: 3mm;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .card {
      width: 79.6mm;
      height: 47.98mm;
      background: #09090b;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 7px 9px;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #27272a;
      padding-bottom: 3px;
    }
    .brand {
      font-size: 11px;
      font-weight: 900;
      color: #34d399;
      letter-spacing: 0.5px;
    }
    .badge {
      font-size: 7px;
      font-weight: 700;
      color: #a1a1aa;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .mid {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 3px 0;
    }
    .photo {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      object-fit: cover;
      border: 1.5px solid #10b981;
    }
    .avatar-placeholder {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #064e3b;
      color: #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 13px;
      border: 1.5px solid #10b981;
    }
    .details {
      flex: 1;
      min-width: 0;
    }
    .name {
      font-size: 11px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .id {
      font-size: 8.5px;
      font-family: monospace;
      color: #34d399;
      font-weight: 700;
    }
    .phone {
      font-size: 7.5px;
      color: #a1a1aa;
    }
    .barcode-box {
      background: #ffffff;
      border-radius: 5px;
      padding: 3px 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 24px;
    }
    .barcode-box img {
      max-width: 100%;
      height: 20px;
      object-fit: contain;
      display: block;
    }
    .footer {
      font-size: 6px;
      text-align: center;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-top">
      <div class="brand">NFT GYM</div>
      <div class="badge">OFFICIAL ATTENDANCE I-CARD</div>
    </div>
    <div class="mid">
      ${photo ? `<img class="photo" src="${photo}" />` : `<div class="avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`}
      <div class="details">
        <div class="name">${name}</div>
        <div class="id">ID: ${idNum}</div>
        ${phone ? `<div class="phone">📱 ${phone}</div>` : ''}
      </div>
    </div>
    <div class="barcode-box">
      ${barcodeImg ? `<img src="${barcodeImg}" />` : ''}
    </div>
    <div class="footer">Permanent Member Barcode • Attendance & Access</div>
  </div>
</body>
</html>`);
      doc.close();
      setTimeout(() => {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      }, 250);
    } catch(err) {
      console.warn("Iframe print error, falling back to window.print", err);
      window.print();
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jt({ orientation: "landscape", unit: "mm", format: [85.6, 53.98] });
      doc.setFillColor(9, 9, 11);
      doc.rect(0, 0, 85.6, 53.98, "F");
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 85.6, 9, "F");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("NFT GYM - OFFICIAL ATTENDANCE I-CARD", 42.8, 6.2, { align: "center" });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(member.name || "Member", 6, 16);
      doc.setTextColor(52, 211, 153);
      doc.setFontSize(8.5);
      doc.text(`ID: ${member.member_id || member.id}`, 6, 21.5);
      if (member.phone) {
        doc.setTextColor(161, 161, 170);
        doc.setFontSize(7.5);
        doc.text(`Mobile: ${member.phone}`, 6, 26);
      }
      const canvas = document.getElementById("card-barcode-canvas");
      if (canvas) {
        const imgData = canvas.toDataURL("image/png");
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(5, 29, 75.6, 17, 1.5, 1.5, "F");
        doc.addImage(imgData, "PNG", 7, 30, 71.6, 15);
      }
      doc.setTextColor(113, 113, 122);
      doc.setFontSize(6);
      doc.text("Permanent Member Barcode • Attendance & Access", 42.8, 50, { align: "center" });
      doc.save(`Member_ICard_${member.member_id || member.id}.pdf`);
    } catch(err) {
      console.error("PDF generation failed, falling back to window.print", err);
      window.print();
    }
  };

  return l.jsxs("div", {
    className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200",
    children: [
      l.jsxs("div", {
        className: "w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 text-white",
        children: [
          l.jsxs("div", {
            className: "flex items-center justify-between pb-2 border-b border-neutral-800",
            children: [
              l.jsx("h3", { className: "text-sm font-bold text-white", children: "Member I-Card & Barcode" }),
              l.jsx("button", { onClick: onClose, className: "text-neutral-400 hover:text-white text-xl cursor-pointer p-1", children: "×" })
            ]
          }),
          l.jsxs("div", {
            id: "printable-id-card-element",
            className: "rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-black border-2 border-emerald-500/50 p-5 shadow-2xl relative overflow-hidden",
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
                    className: "space-y-0.5",
                    children: [
                      l.jsx("h4", { className: "font-bold text-sm text-white", children: member.name || "Member" }),
                      l.jsxs("div", { className: "text-[11px] font-mono text-emerald-400 font-bold", children: ["ID: ", member.member_id || member.id] }),
                      member.phone ? l.jsxs("div", { className: "text-[10px] text-neutral-400", children: ["📱 ", member.phone] }) : null
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
                onClick: handlePrintCard,
                id: "direct-print-card-btn",
                className: "flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm",
                children: [
                  l.jsx(Do, { className: "w-3.5 h-3.5" }),
                  l.jsx("span", { children: "Direct Print Card" })
                ]
              }),
              l.jsxs("button", {
                onClick: handleDownloadPDF,
                id: "download-card-pdf-btn",
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


const AttendanceManager = ({ members = [], onRefreshMembers, onNavigateTab }) => {
  const [logs, setLogs] = fe.useState([]);
  const [isLoading, setIsLoading] = fe.useState(!1);
  const [isMuted, setIsMuted] = fe.useState(() => localStorage.getItem("gym_attendance_muted") === "true");
  
  // Dynamic pool of ALL registered members loaded from CRM state + API
  const [allMembersList, setAllMembersList] = fe.useState(members);
  fe.useEffect(() => {
    if (members && members.length > 0) {
      setAllMembersList(members);
    }
    // Fetch directly from /api/members to ensure 100% of registered members in database are loaded
    fetch("/api/members")
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.members) && d.members.length > 0) {
          setAllMembersList(prev => {
            const map = new Map();
            prev.forEach(m => map.set(String(m.member_id || m.id), m));
            d.members.forEach(m => map.set(String(m.member_id || m.id), { ...map.get(String(m.member_id || m.id)), ...m }));
            return Array.from(map.values());
          });
        }
      })
      .catch(e => console.warn("Failed fetching /api/members in AttendanceManager:", e));
  }, [members]);

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

  // Manual Check-in Form state matching ERP home page pB
  const [manualSearch, setManualSearch] = fe.useState("");
  const [showSuggestions, setShowSuggestions] = fe.useState(!1);
  const [selectedMember, setSelectedMember] = fe.useState(null);
  const [searchError, setSearchError] = fe.useState(null);
  const [manualNotes, setManualNotes] = fe.useState("");
  const [manualSubmitting, setManualSubmitting] = fe.useState(!1);
  const searchInputRef = fe.useRef(null);
  const searchContainerRef = fe.useRef(null);

  // Click outside to dismiss hints dropdown
  fe.useEffect(() => {
    const handleOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(!1);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const loadMembers = fe.useCallback(async () => {
    try {
      const r = await fetch("/api/members");
      if (r.ok) {
        const text = await r.text();
        if (text && !text.trim().startsWith("<")) {
          const d = JSON.parse(text);
          const list = Array.isArray(d) ? d : (d && Array.isArray(d.members) ? d.members : []);
          if (list.length > 0) {
            setAllMembersList(list);
            return;
          }
        }
      }
    } catch (_) {}
    // Fallback: Direct Supabase REST API fetch (works on Netlify and static deployments)
    try {
      const sbRes = await fetch("https://kkhnpgztzfpmjltsuhmo.supabase.co/rest/v1/members?select=*&order=id.desc", {
        headers: {
          "apikey": "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU",
          "Authorization": "Bearer sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU"
        }
      });
      if (sbRes.ok) {
        const list = await sbRes.json();
        if (Array.isArray(list) && list.length > 0) {
          setAllMembersList(list);
        }
      }
    } catch (e) {
      console.warn("Direct Supabase members load fallback warning:", e);
    }
  }, []);

  fe.useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  fe.useEffect(() => {
    if (showManualModal) {
      loadMembers();
    }
  }, [showManualModal, loadMembers]);

  const [alertBanner, setAlertBanner] = fe.useState(null);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem("gym_attendance_muted", String(next));
  };

  const fetchLogs = fe.useCallback(async () => {
    setIsLoading(!0);
    let loadedFromApi = false;
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
        const text = await res.text();
        if (text && !text.trim().startsWith("<")) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            setLogs(data);
            loadedFromApi = true;
          }
        }
      }
    } catch(e) {
      console.warn("Express /api/attendance call failed, trying direct Supabase fallback:", e);
    }
    if (!loadedFromApi) {
      try {
        let sbUrl = "https://kkhnpgztzfpmjltsuhmo.supabase.co/rest/v1/attendance?select=id,member_id,check_in_time,status,reception_notes&order=id.desc&limit=50";
        if (statusFilter !== "all") {
          sbUrl += `&status=eq.${encodeURIComponent(statusFilter)}`;
        }
        const sbRes = await fetch(sbUrl, {
          headers: {
            "apikey": "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU",
            "Authorization": "Bearer sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU"
          }
        });
        if (sbRes.ok) {
          const rawLogs = await sbRes.json();
          if (Array.isArray(rawLogs)) {
            const enriched = rawLogs.map(log => {
              const m = (allMembersList || []).find(mem => mem.id === log.member_id || String(mem.member_id) === String(log.member_id));
              return {
                ...log,
                member_name: m ? m.name : `Member #${log.member_id}`,
                member_code: m ? (m.member_id || m.card_uid) : String(log.member_id),
                plan_type: m ? m.plan_type : "Standard",
                profile_picture: m ? m.profile_picture : "",
                mobile: m ? m.mobile : ""
              };
            });
            setLogs(enriched);
          }
        }
      } catch (sbErr) {
        console.warn("Direct Supabase attendance logs fallback warning:", sbErr);
      }
    }
    setIsLoading(!1);
  }, [timeframeMode, singleDate, rangeStart, rangeEnd, statusFilter, searchQuery, allMembersList]);

  fe.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const executeDirectSupabaseCheckIn = async (cleanIdentifier, checkInNotes, memberHint) => {
    const sbKey = "sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU";
    const sbUrl = "https://kkhnpgztzfpmjltsuhmo.supabase.co";
    const sbHeaders = {
      "apikey": sbKey,
      "Authorization": `Bearer ${sbKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };

    try {
      const cleanId = String(cleanIdentifier).trim();
      let target = memberHint;
      if (!target) {
        const isNum = !isNaN(Number(cleanId));
        const filter = isNum ? `(member_id.eq.${cleanId},mobile.eq.${cleanId},id.eq.${cleanId})` : `(member_id.eq.${cleanId},mobile.eq.${cleanId})`;
        const mRes = await fetch(`${sbUrl}/rest/v1/members?or=${encodeURIComponent(filter)}`, { headers: sbHeaders });
        if (mRes.ok) {
          const list = await mRes.json();
          if (Array.isArray(list) && list.length > 0) target = list[0];
        }
      }

      if (!target || !target.id) {
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "unregistered",
          title: "ACCESS DENIED (Unregistered Card)",
          message: `ACCESS DENIED: Card UID / Member ID "${cleanId}" not found in database.`,
          time: new Date().toLocaleTimeString("en-IN")
        });
        return { success: !1, error: `Member ID "${cleanId}" not found in database.` };
      }

      // Check Expiry
      let expDate = null;
      if (target.expiry_date) {
        const cleanExp = String(target.expiry_date).trim().split("T")[0].split(" ")[0];
        const parts = cleanExp.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) expDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          else if (parts[2].length === 4) expDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
      const today0 = new Date();
      today0.setHours(0, 0, 0, 0);
      if (expDate) expDate.setHours(0, 0, 0, 0);

      if (expDate && expDate < today0) {
        await fetch(`${sbUrl}/rest/v1/attendance`, {
          method: "POST",
          headers: sbHeaders,
          body: JSON.stringify([{
            member_id: target.id,
            status: "expired",
            check_in_time: new Date().toISOString(),
            reception_notes: checkInNotes || "Hosted site expired check-in attempt"
          }])
        }).catch(() => {});
        playSynthesizedTone("denied", isMuted);
        setAlertBanner({
          type: "expired",
          title: "Membership Expired",
          message: "Member plan has expired, please renew plan to continue",
          time: new Date().toLocaleTimeString("en-IN")
        });
        fetchLogs();
        return { success: !1, error: "Member plan has expired, please renew plan to continue", status: "expired" };
      }

      // Check duplicate check-in today
      const todayIso = new Date().toISOString().split("T")[0];
      const dupRes = await fetch(`${sbUrl}/rest/v1/attendance?member_id=eq.${target.id}&status=eq.valid&check_in_time=gte.${todayIso}T00:00:00Z&check_in_time=lte.${todayIso}T23:59:59Z`, {
        headers: sbHeaders
      });
      if (dupRes.ok) {
        const dups = await dupRes.json();
        if (Array.isArray(dups) && dups.length > 0) {
          let timeStr = "earlier today";
          if (dups[0].check_in_time) {
            try { timeStr = new Date(dups[0].check_in_time).toLocaleTimeString("en-IN"); } catch (_) {}
          }
          playSynthesizedTone("duplicate", isMuted);
          setAlertBanner({
            type: "duplicate",
            title: "Duplicate Attendance Blocked",
            message: `Duplicate Attendance Blocked: ${target.name} already checked in today at ${timeStr}. Multiple check-ins on the same day are not permitted.`,
            time: new Date().toLocaleTimeString("en-IN")
          });
          return { success: !1, error: `Duplicate Attendance Blocked: ${target.name} already checked in today at ${timeStr}.` };
        }
      }

      // Save valid check-in
      const nowIso = new Date().toISOString();
      await fetch(`${sbUrl}/rest/v1/attendance`, {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify([{
          member_id: target.id,
          status: "valid",
          check_in_time: nowIso,
          reception_notes: checkInNotes || "Hosted site direct check-in"
        }])
      });

      playSynthesizedTone("valid", isMuted);
      const expStr = target.expiry_date ? (window.__fmtDMY ? window.__fmtDMY(target.expiry_date) : target.expiry_date) : "--";
      setAlertBanner({
        type: "valid",
        title: "Check-in Approved (24/7 Access Granted)",
        message: `Welcome ${target.name}! Plan active till ${expStr}.`,
        time: new Date().toLocaleTimeString("en-IN")
      });
      fetchLogs();
      return { success: !0, data: { success: !0, member: target, status: "valid" } };
    } catch (e) {
      console.error("Direct Supabase check-in error:", e);
      playSynthesizedTone("denied", isMuted);
      setAlertBanner({
        type: "error",
        title: "Check-in Error",
        message: "Failed to communicate with attendance server or Supabase: " + e.message,
        time: new Date().toLocaleTimeString("en-IN")
      });
      return { success: !1, error: e.message };
    }
  };

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

      // If backend returns HTML or static 404 (e.g. on Netlify where Express is not running):
      const isHtml = !responseText || responseText.trim().startsWith("<") || responseText.includes("<!DOCTYPE");
      if ((isHtml || res.status === 404 || res.status === 405) && !data.status) {
        return await executeDirectSupabaseCheckIn(identifier, notes, localMember);
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

  // ERP Home page (pB) search logic & live hints (supports Name, Member ID, and Mobile)
  const isSearchLetter = fe.useMemo(() => {
    return !!manualSearch.trim();
  }, [manualSearch]);

  const searchSuggestions = fe.useMemo(() => {
    const raw = manualSearch.trim();
    if (!raw) return [];
    const q = raw.toLowerCase().replace(/\s+/g, " ");
    const cleanDigits = raw.replace(/[^0-9]/g, "");
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;
    return list.filter(m => {
      const name = (m.name || "").replace(/\s+/g, " ").toLowerCase();
      if (name.includes(q)) return true;
      const memId = String(m.member_id || "").toLowerCase().trim();
      if (memId.includes(q)) return true;
      if (cleanDigits && String(m.id) === cleanDigits) return true;
      if (cleanDigits && cleanDigits.length >= 3 && m.mobile && String(m.mobile).replace(/[^0-9]/g, "").includes(cleanDigits)) return true;
      return false;
    }).slice(0, 8);
  }, [manualSearch, allMembersList, members]);

  const handleMemberSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowSuggestions(!1);
    setSearchError(null);
    const q = manualSearch.trim();
    if (!q) {
      setSearchError("Please enter a Member Name or Member ID to search.");
      return null;
    }
    const qNorm = q.replace(/\s+/g, " ").toLowerCase();
    const cleanDigits = q.replace(/[^0-9]/g, "");
    const list = (allMembersList && allMembersList.length > 0) ? allMembersList : members;

    // 1. Exact match on member_id (e.g. 608, 27)
    let matched = list.find(m => {
      if (!m.member_id) return !1;
      const memIdLower = String(m.member_id).toLowerCase().trim();
      if (memIdLower === qNorm) return !0;
      const memDigits = memIdLower.replace(/[^0-9]/g, "");
      return !!(cleanDigits && memDigits === cleanDigits);
    });

    // 2. Exact match on database id
    if (!matched && cleanDigits) {
      matched = list.find(m => m.id === Number(cleanDigits));
    }
    // 3. Exact normalized name match (handles spaces like 'Prince  soni')
    if (!matched) {
      matched = list.find(m => (m.name || "").replace(/\s+/g, " ").toLowerCase().trim() === qNorm);
    }
    // 4. Partial normalized name match
    if (!matched) {
      matched = list.find(m => (m.name || "").replace(/\s+/g, " ").toLowerCase().includes(qNorm));
    }
    // 5. Mobile match
    if (!matched && cleanDigits.length >= 4) {
      matched = list.find(m => m.mobile && String(m.mobile).replace(/[^0-9]/g, "").includes(cleanDigits));
    }
    // 6. Card UID match
    if (!matched) {
      matched = list.find(m => m.card_uid && String(m.card_uid).toLowerCase().trim() === qNorm);
    }

    if (matched) {
      setSelectedMember(matched);
      setSearchError(null);
      return matched;
    } else {
      setSelectedMember(null);
      setSearchError(`No member found matching "${q}". Please check the Member ID or Member Name.`);
      return null;
    }
  };

  const selectSuggestion = (m) => {
    setSelectedMember(m);
    setManualSearch(m.name || "");
    setShowSuggestions(!1);
    setSearchError(null);
  };

  const clearManualSearch = () => {
    setManualSearch("");
    setShowSuggestions(!1);
    setSelectedMember(null);
    setSearchError(null);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleRecordCheckIn = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    let target = selectedMember;
    if (!target && manualSearch.trim()) {
      target = handleMemberSearch();
    }
    if (!target) {
      setSearchError("Please search and select a member to record check-in.");
      return;
    }
    setManualSubmitting(!0);
    try {
      const identifier = target.card_uid || target.member_id || target.id;
      const notes = manualNotes.trim() || "Manual Check-in at Desk";
      const result = await executeCheckIn(identifier, notes);
      if (result && result.success) {
        setShowManualModal(!1);
        setSelectedMember(null);
        setManualSearch("");
        setManualNotes("");
        setSearchError(null);
      } else {
        // Show exact rejection / validation reason right inside the modal
        const errMsg = (result && result.error) || "Check-in could not be completed.";
        setSearchError(errMsg);
      }
    } catch(err) {
      console.error("Check-in error:", err);
      setSearchError(err.message || "Failed to communicate with attendance server");
    } finally {
      setManualSubmitting(!1);
    }
  };

  const selectedMemberCheckedInToday = fe.useMemo(() => {
    if (!selectedMember) return null;
    return logs.find(l => String(l.member_id) === String(selectedMember.member_id || selectedMember.id) && l.status === "valid");
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
          id:"open-manual-checkin-modal-btn",
          onClick:()=>{
            setSelectedMember(null);
            setManualSearch("");
            setManualNotes("");
            setSearchError(null);
            setShowSuggestions(!1);
            setShowManualModal(!0);
            if (onRefreshMembers) onRefreshMembers();
            fetch("/api/members").then(r=>r.json()).then(d=>{
              const list = Array.isArray(d) ? d : (d && Array.isArray(d.members) ? d.members : []);
              if (list.length > 0) setAllMembersList(list);
            });
          },
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
              
            ]})
          }),
          l.jsx("tbody",{className:"divide-y divide-neutral-800/60 text-xs text-neutral-300",children:
            logs.length===0?l.jsx("tr",{children:
              l.jsx("td",{colSpan:6,className:"py-12 text-center text-neutral-500 font-medium",children:
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
                l.jsx("td",{className:"py-3 px-4 text-neutral-400 italic text-[11px]",children:log.reception_notes||"-"})
              ]});
            })
          })
        ]})
      })
    ]}),

    // MANUAL CHECK-IN POPUP MODAL
    showManualModal&&l.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200",children:[
      l.jsxs("div",{className:"w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-white max-h-[92vh] flex flex-col",children:[
        // Modal Header
        l.jsxs("div",{className:"flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0",children:[
          l.jsxs("div",{className:"flex items-center gap-2.5",children:[
            l.jsx("div",{className:"p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",children:l.jsx(Ic,{className:"w-4 h-4"})}),
            l.jsxs("div",{children:[
              l.jsx("h3",{className:"text-base sm:text-lg font-bold text-white",children:"Reception Desk Manual Check-in"}),
              l.jsx("p",{className:"text-xs text-neutral-400",children:"Search member, enter optional desk note, and click Record Check-in."})
            ]})
          ]}),
          l.jsx("button",{type:"button",onClick:()=>setShowManualModal(!1),className:"text-neutral-400 hover:text-white text-2xl font-light leading-none cursor-pointer p-1",children:"×"})
        ]}),

        // Scrollable Body
        l.jsxs("div",{className:"space-y-4 overflow-y-auto pr-1 flex-1",children:[
          // 1 - Member Search Bar & Search Button (same action exactly as member search button available and perform on ERP home page)
          l.jsxs("div",{ref:searchContainerRef,className:"space-y-1.5 relative",children:[
            l.jsx("label",{className:"block text-xs font-semibold text-neutral-300",children:"1. Member Search Bar"}),
            l.jsxs("form",{
              onSubmit:handleMemberSearch,
              className:"relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2",
              children:[
                l.jsxs("div",{className:"relative flex-1",children:[
                  l.jsx("div",{className:"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400",children:l.jsx(Ic,{className:"w-4 h-4"})}),
                  l.jsx("input",{
                    ref:searchInputRef,
                    id:"manual-member-search-input",
                    type:"text",
                    autoComplete:"off",
                    placeholder:"Search by Member Name (with live hints) or Member ID (e.g. Rahul or 329)...",
                    value:manualSearch,
                    onChange:e=>{ setManualSearch(e.target.value); setShowSuggestions(!0); if(searchError) setSearchError(null); },
                    onFocus:()=>{ if(manualSearch.trim() && isSearchLetter) setShowSuggestions(!0); },
                    className:"w-full pl-10 pr-9 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
                  }),
                  manualSearch&&l.jsx("button",{
                    type:"button",
                    onClick:clearManualSearch,
                    className:"absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white cursor-pointer text-base leading-none",
                    title:"Clear search",
                    children:"×"
                  }),
                  // Live dropdown suggestions matching ERP home page pB
                  showSuggestions&&isSearchLetter&&searchSuggestions.length>0&&l.jsxs("div",{
                    id:"manual-member-search-hints-dropdown",
                    className:"absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-neutral-900 border-2 border-emerald-500/60 shadow-2xl overflow-hidden backdrop-blur-lg divide-y divide-neutral-800 animate-in fade-in zoom-in-95 duration-150",
                    children:[
                      l.jsxs("div",{className:"px-3.5 py-1.5 bg-neutral-950/90 text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between",children:[
                        l.jsxs("span",{children:["Matching Member Names (",searchSuggestions.length," suggestions)"]}),
                        l.jsx("span",{className:"text-neutral-500 font-normal text-[10px]",children:"Click to select"})
                      ]}),
                      l.jsx("div",{className:"max-h-52 overflow-y-auto",children:searchSuggestions.map(s=>{
                        const sId = s.member_id || `ID: ${s.id}`;
                        const isExp = s.expiry_date ? (new Date(s.expiry_date) < new Date(new Date().setHours(0,0,0,0))) : !1;
                        return l.jsxs("button",{
                          key:s.id,
                          type:"button",
                          onClick:()=>selectSuggestion(s),
                          className:"w-full px-3 py-2 text-left hover:bg-neutral-800/90 transition-colors flex items-center justify-between gap-2.5 cursor-pointer",
                          children:[
                            l.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[
                              l.jsx("div",{className:"w-7 h-7 rounded-lg bg-neutral-800 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-neutral-700",children:(s.name||"M")[0].toUpperCase()}),
                              l.jsxs("div",{className:"min-w-0",children:[
                                l.jsxs("div",{className:"flex items-center gap-2",children:[
                                  l.jsx("span",{className:"text-xs font-bold text-white truncate",children:s.name}),
                                  l.jsx("span",{className:"px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700",children:sId})
                                ]}),
                                l.jsxs("div",{className:"text-[10px] text-neutral-400 mt-0.5",children:[s.mobile||"No mobile"," • ",s.plan_type||"Plan"]})
                              ]})
                            ]}),
                            isExp?l.jsx("span",{className:"px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0",children:"Expired"}):
                            l.jsx("span",{className:"px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0",children:"Active"})
                          ]
                        });
                      })})
                    ]
                  })
                ]}),
                // Member search button (same action exactly as member search button available and perform on ERP home page)
                l.jsxs("button",{
                  type:"submit",
                  id:"manual-member-search-btn",
                  className:"px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm cursor-pointer",
                  children:[
                    l.jsx(Ic,{className:"w-3.5 h-3.5 shrink-0"}),
                    l.jsx("span",{children:"Search Member"})
                  ]
                })
              ]
            }),
            searchError&&l.jsxs("div",{className:"p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 mt-2",children:[
              l.jsx("span",{className:"text-sm",children:"⚠"}),
              l.jsx("span",{children:searchError})
            ]})
          ]}),

          // Selected Member Preview Card (Displays details when member is selected/found)
          selectedMember&&l.jsxs("div",{className:"p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5 shadow-inner",children:[
            l.jsxs("div",{className:"flex items-start justify-between gap-3 pb-2 border-b border-neutral-800/80",children:[
              l.jsxs("div",{className:"flex items-center gap-2.5",children:[
                l.jsx("div",{className:"w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/30 text-sm shrink-0",children:
                  (selectedMember.name||"M")[0].toUpperCase()
                }),
                l.jsxs("div",{children:[
                  l.jsx("h4",{className:"text-sm font-bold text-white",children:selectedMember.name}),
                  l.jsxs("div",{className:"text-[11px] text-neutral-400 flex items-center gap-2",children:[
                    l.jsxs("span",{className:"text-emerald-400 font-mono font-bold",children:["ID: ",selectedMember.member_id||selectedMember.id]}),
                    l.jsx("span",{children:"•"}),
                    l.jsx("span",{children:selectedMember.mobile||"No mobile"})
                  ]})
                ]})
              ]}),
              l.jsxs("div",{className:"flex items-center gap-2",children:[
                l.jsx("span",{className:`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isSelectedMemberExpired?"bg-red-500/20 text-red-400 border border-red-500/30":"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`,children:isSelectedMemberExpired?"Membership Expired":"Membership Active"}),
                l.jsx("button",{type:"button",onClick:clearManualSearch,className:"text-neutral-400 hover:text-white text-xs underline cursor-pointer",children:"Change"})
              ]})
            ]}),

            l.jsxs("div",{className:"grid grid-cols-2 gap-2 text-xs",children:[
              l.jsxs("div",{className:"p-2 rounded-lg bg-neutral-900 border border-neutral-800/80",children:[
                l.jsx("span",{className:"text-[10px] uppercase text-neutral-500 block font-semibold",children:"Membership Plan"}),
                l.jsx("span",{className:"font-bold text-white",children:selectedMember.plan_type||"Regular"})
              ]}),
              l.jsxs("div",{className:"p-2 rounded-lg bg-neutral-900 border border-neutral-800/80",children:[
                l.jsx("span",{className:"text-[10px] uppercase text-neutral-500 block font-semibold",children:"Plan Expiry Date"}),
                l.jsx("span",{className:`font-bold font-mono ${isSelectedMemberExpired?"text-red-400":"text-emerald-400"}`,children:
                  window.__fmtDMY?window.__fmtDMY(selectedMember.expiry_date):(selectedMember.expiry_date||"--")
                })
              ]})
            ]}),

            selectedMemberCheckedInToday&&l.jsxs("div",{className:"p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center gap-2",children:[
              l.jsx("span",{className:"text-base",children:"⚠"}),
              l.jsxs("span",{children:[
                "Already checked in today at ",
                selectedMemberCheckedInToday.check_in_time?selectedMemberCheckedInToday.check_in_time.split(" ")[1]:"earlier",
                "."
              ]})
            ]}),

            isSelectedMemberExpired&&l.jsxs("div",{className:"p-2.5 rounded-lg bg-red-950/80 border border-red-500/60 text-red-300 text-xs font-semibold flex items-center gap-2",children:[
              l.jsx("span",{className:"text-base shrink-0",children:"⛔"}),
              l.jsxs("span",{children:[
                "Member plan has expired, please renew plan to continue (Expired: ",
                window.__fmtDMY?window.__fmtDMY(selectedMember.expiry_date):selectedMember.expiry_date,
                ")"
              ]})
            ]})
          ]}),

          // 2 - Along with member search button a desk note field (optional) should be available
          l.jsxs("div",{className:"space-y-1.5",children:[
            l.jsx("label",{className:"block text-xs font-semibold text-neutral-300",children:"2. Desk Note (Optional)"}),
            l.jsx("input",{
              id:"manual-desk-note-input",
              type:"text",
              placeholder:"e.g. Verified at reception desk, forgot RFID tag at home",
              value:manualNotes,
              onChange:e=>setManualNotes(e.target.value),
              className:"w-full px-3 py-2.5 text-xs rounded-xl bg-neutral-950 border border-neutral-700 text-white placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
            })
          ]})
        ]}),

        // 3 - A "record check-in" button (submit the attendance by clicking on it)
        l.jsxs("div",{className:"flex items-center justify-end gap-3 pt-3 border-t border-neutral-800 shrink-0",children:[
          l.jsx("button",{
            type:"button",
            onClick:()=>setShowManualModal(!1),
            className:"px-4 py-2.5 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer transition-colors",
            children:"Cancel"
          }),
          l.jsxs("button",{
            id:"record-checkin-submit-btn",
            type:"button",
            disabled:manualSubmitting,
            onClick:handleRecordCheckIn,
            className:`px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              manualSubmitting?
              "bg-neutral-800 text-neutral-500 cursor-not-allowed":
              "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95"
            }`,
            children:[
              l.jsx("span",{children:"✓"}),
              l.jsx("span",{children:manualSubmitting?"Recording Check-in...":"Record Check-in"})
            ]
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
              l.jsxs("div",{className:"text-[11px] font-mono text-emerald-400 font-bold",children:["ID: ",selectedCardMember.member_id||selectedCardMember.id]})
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

                const canvas = document.getElementById("card-barcode-canvas");
                if (canvas) {
                  const dataUrl = canvas.toDataURL("image/png");
                  doc.addImage(dataUrl, "PNG", 6, 28, 73.6, 16);
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
