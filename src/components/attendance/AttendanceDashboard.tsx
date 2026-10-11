import React, { useState, useEffect } from 'react';
import { useScanner } from './ScannerHook';
import { useAttendanceCheckin } from './AttendanceCheckinService';
import { AlertTriangle, CheckCircle, XCircle, Volume2, VolumeX } from 'lucide-react';

export const AttendanceDashboard: React.FC = () => {
  const [msg, setMsg] = useState<{type: 'success' | 'warning' | 'error', text: string} | null>(null);
  const { performCheckIn, muted, setMuted } = useAttendanceCheckin();

  const handleScan = async (id: string) => {
    const res = await performCheckIn(id);
    if (res.success) {
      setMsg({ type: 'success', text: `Welcome ${res.data.member.name}!` });
    } else {
      setMsg({ type: res.error.includes('Already') ? 'warning' : 'error', text: res.error });
    }
    setTimeout(() => setMsg(null), 5000);
  };

  useScanner(handleScan);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Attendance Dashboard</h1>
        <button onClick={() => setMuted(!muted)} className="p-2 rounded-full hover:bg-neutral-100">
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
      </div>
      
      {msg && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${msg.type === 'success' ? 'bg-green-100 text-green-800' : msg.type === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle /> : msg.type === 'warning' ? <AlertTriangle /> : <XCircle />}
          {msg.text}
        </div>
      )}

      <div className="border-2 border-dashed border-neutral-300 rounded-xl p-12 text-center text-neutral-500">
        Ready to scan...
      </div>
    </div>
  );
};
