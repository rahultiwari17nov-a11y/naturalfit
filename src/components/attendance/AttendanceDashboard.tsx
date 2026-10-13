import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useScanner } from './ScannerHook';
import { useAttendanceCheckin } from './AttendanceCheckinService';
import { generateAttendancePDF, downloadCSV, formatISTDate, formatISTTime } from './ReportGenerator';
import { AlertTriangle, CheckCircle, XCircle, Volume2, VolumeX, Download, Calendar } from 'lucide-react';

/**
 * Returns IST (Asia/Kolkata) date boundaries
 */
export const getISTDateParts = (d: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970', 10);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
  return { year, month, day };
};

export const getISTDayBoundary = (offsetDays: number = 0) => {
  const { year, month, day } = getISTDateParts(new Date());
  const d = new Date(Date.UTC(year, month - 1, day + offsetDays));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${dd}`;
  const startIso = new Date(`${dateStr}T00:00:00+05:30`).toISOString();
  const endIso = new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
  return { dateStr, startIso, endIso };
};

export const AttendanceDashboard: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom'>('today');

  const todayBoundary = useMemo(() => getISTDayBoundary(0), []);
  const [startDateStr, setStartDateStr] = useState(todayBoundary.dateStr);
  const [endDateStr, setEndDateStr] = useState(todayBoundary.dateStr);

  const [msg, setMsg] = useState<{type: 'success' | 'warning' | 'error', text: string} | null>(null);
  const { performCheckIn, muted, setMuted } = useAttendanceCheckin();

  // Calculate precise IST ISO timestamps for the active filter
  const dateBounds = useMemo(() => {
    if (activePreset === 'today') {
      const b = getISTDayBoundary(0);
      return { startIso: b.startIso, endIso: b.endIso, startStr: b.dateStr, endStr: b.dateStr };
    }
    if (activePreset === 'yesterday') {
      const b = getISTDayBoundary(-1);
      return { startIso: b.startIso, endIso: b.endIso, startStr: b.dateStr, endStr: b.dateStr };
    }
    if (activePreset === 'last7') {
      const start = getISTDayBoundary(-6);
      const today = getISTDayBoundary(0);
      return { startIso: start.startIso, endIso: today.endIso, startStr: start.dateStr, endStr: today.dateStr };
    }
    if (activePreset === 'thisMonth') {
      const { year, month } = getISTDateParts(new Date());
      const m = String(month).padStart(2, '0');
      const startStr = `${year}-${m}-01`;
      const startIso = new Date(`${startStr}T00:00:00+05:30`).toISOString();
      const today = getISTDayBoundary(0);
      return { startIso, endIso: today.endIso, startStr, endStr: today.dateStr };
    }
    // Custom
    const startIso = new Date(`${startDateStr}T00:00:00+05:30`).toISOString();
    const endIso = new Date(`${endDateStr}T23:59:59.999+05:30`).toISOString();
    return { startIso, endIso, startStr: startDateStr, endStr: endDateStr };
  }, [activePreset, startDateStr, endDateStr]);

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    let loaded = false;
    try {
      const url = `/api/attendance?start_iso=${encodeURIComponent(dateBounds.startIso)}&end_iso=${encodeURIComponent(dateBounds.endIso)}&start_date=${dateBounds.startStr}&end_date=${dateBounds.endStr}`;
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.trim().startsWith('<')) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            setLogs(data);
            loaded = true;
          }
        }
      }
    } catch (_) {}

    // Direct Supabase fallback (Netlify / Static Hosting)
    if (!loaded) {
      try {
        const sbUrl = `https://kkhnpgztzfpmjltsuhmo.supabase.co/rest/v1/attendance?select=id,member_id,check_in_time,status,reception_notes,created_at,members(id,member_id,name,mobile,plan_type,expiry_date,profile_picture)&check_in_time=gte.${encodeURIComponent(dateBounds.startIso)}&check_in_time=lte.${encodeURIComponent(dateBounds.endIso)}&order=check_in_time.desc`;
        const sbRes = await fetch(sbUrl, {
          headers: {
            'apikey': 'sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU',
            'Authorization': 'Bearer sb_publishable_ZEh4rJnXI_uEnWYHp7YGHA_st4b9kwU'
          }
        });
        if (sbRes.ok) {
          const raw = await sbRes.json();
          if (Array.isArray(raw)) {
            const mapped = raw.map((item: any) => ({
              ...item,
              member_id: item.members?.member_id || item.member_id || '--',
              name: item.members?.name || 'Unknown Member',
              plan_type: item.members?.plan_type || 'Regular',
              expiry_date: item.members?.expiry_date || '',
              mobile: item.members?.mobile || ''
            }));
            setLogs(mapped);
          }
        }
      } catch (err) {
        console.warn('Supabase fetch error:', err);
      }
    }
    setIsLoading(false);
  }, [dateBounds]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const isPresentDay = activePreset === 'today' || (activePreset === 'custom' && startDateStr === todayBoundary.dateStr && endDateStr === todayBoundary.dateStr);

  const handleScan = async (scannedMemberId: string) => {
    if (!isPresentDay) {
      setMsg({
        type: 'warning',
        text: activePreset === 'yesterday'
          ? 'Marking attendance for yesterday is disabled while present day attendance is active. Attendance can only be marked for Today.'
          : 'Marking attendance for future days or historical logs is disabled. Attendance can only be recorded for the present day (Today).'
      });
      setTimeout(() => setMsg(null), 5000);
      return;
    }
    const res = await performCheckIn(scannedMemberId);
    if (res.success) {
      setMsg({ type: 'success', text: `Welcome ${res.data.member?.name || 'Member'}!` });
      fetchAttendance();
    } else {
      setMsg({ type: res.error?.includes('Already') || res.error?.includes('Duplicate') ? 'warning' : 'error', text: res.error });
      fetchAttendance();
    }
    setTimeout(() => setMsg(null), 5000);
  };

  useScanner(handleScan);

  const summary = useMemo(() => {
    const total = logs.length;
    const valid = logs.filter(l => l.status === 'valid').length;
    const expired = logs.filter(l => l.status === 'expired').length;
    const unique = new Set(logs.map(l => l.member_id)).size;
    return { total, valid, expired, unique };
  }, [logs]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Dashboard</h1>
          <p className="text-xs text-neutral-400">Timezone strictly processed in Indian Standard Time (IST)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCSV(logs, { start: formatISTDate(dateBounds.startIso), end: formatISTDate(dateBounds.endIso) })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => generateAttendancePDF(logs, { start: formatISTDate(dateBounds.startIso), end: formatISTDate(dateBounds.endIso) }, summary)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
      
      {/* Alert banner */}
      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in ${msg.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-200' : msg.type === 'warning' ? 'bg-amber-950/80 border border-amber-500 text-amber-200' : 'bg-red-950/80 border border-red-500 text-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : msg.type === 'warning' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Preset Filters */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-400">Presets:</span>
            <button
              onClick={() => setActivePreset('today')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${activePreset === 'today' ? 'bg-emerald-500 text-black shadow-md' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
            >
              Today
            </button>
            <button
              onClick={() => setActivePreset('yesterday')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${activePreset === 'yesterday' ? 'bg-emerald-500 text-black shadow-md' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setActivePreset('last7')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${activePreset === 'last7' ? 'bg-emerald-500 text-black shadow-md' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setActivePreset('thisMonth')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${activePreset === 'thisMonth' ? 'bg-emerald-500 text-black shadow-md' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
            >
              This Month
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-2 ml-auto text-xs">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <input
              type="date"
              value={startDateStr}
              max={todayBoundary.dateStr}
              onChange={e => {
                if (e.target.value > todayBoundary.dateStr) return;
                setStartDateStr(e.target.value);
                setActivePreset('custom');
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-emerald-500"
            />
            <span className="text-neutral-500">to</span>
            <input
              type="date"
              value={endDateStr}
              max={todayBoundary.dateStr}
              onChange={e => {
                if (e.target.value > todayBoundary.dateStr) return;
                setEndDateStr(e.target.value);
                setActivePreset('custom');
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-800">
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-[10px] text-neutral-400 uppercase font-bold">Total Scans</div>
            <div className="text-xl font-bold text-white mt-0.5">{summary.total}</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-[10px] text-emerald-400 uppercase font-bold">Valid Entries</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{summary.valid}</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-[10px] text-red-400 uppercase font-bold">Expired Attempts</div>
            <div className="text-xl font-bold text-red-400 mt-0.5">{summary.expired}</div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-[10px] text-blue-400 uppercase font-bold">Unique Members</div>
            <div className="text-xl font-bold text-blue-400 mt-0.5">{summary.unique}</div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-950 border-b border-neutral-800 text-[11px] uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="py-3 px-4">Date (IST)</th>
                <th className="py-3 px-4">Time (IST)</th>
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Plan & Expiry</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-neutral-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 font-medium">
                    {isLoading ? 'Loading attendance logs...' : 'No attendance records found for this timeframe.'}
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-neutral-800/50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-neutral-300">{formatISTDate(log.check_in_time)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white">{formatISTTime(log.check_in_time)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">{log.member_id || '--'}</td>
                    <td className="py-3 px-4 font-semibold text-white">{log.name || 'Unknown Member'}</td>
                    <td className="py-3 px-4">
                      <div>{log.plan_type || 'Regular'}</div>
                      <div className="text-[10px] text-neutral-400">Exp: {formatISTDate(log.expiry_date) || '--'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'valid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                        {log.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-400 italic text-[11px]">{log.reception_notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
