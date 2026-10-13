import { useState } from 'react';
import { playTone } from './AudioFeedback';

export const useAttendanceCheckin = () => {
  const [muted, setMuted] = useState(false);

  const performCheckIn = async (memberId: string, notes?: string) => {
    try {
      const cleanMemberId = String(memberId).trim();
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: cleanMemberId, identifier: cleanMemberId, notes }),
      });
      const data = await res.json();

      if (res.ok && (data.status === 'valid' || data.success === true)) {
        playTone('valid', muted);
        return { success: true, data };
      } else if (res.status === 409 || data.status === 'duplicate') {
        playTone('duplicate', muted);
        return { success: false, error: data.error || 'Duplicate Attendance Blocked' };
      } else {
        playTone('denied', muted);
        return { success: false, error: data.error || 'Check-in Denied' };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  };

  return { performCheckIn, muted, setMuted };
};
