import { useState } from 'react';
import { playTone } from './AudioFeedback';

export const useAttendanceCheckin = () => {
  const [muted, setMuted] = useState(false);

  const performCheckIn = async (identifier: string, notes?: string) => {
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, notes }),
      });
      const data = await res.json();

      if (res.ok) {
        playTone('valid', muted);
        return { success: true, data };
      } else if (res.status === 409) {
        playTone('duplicate', muted);
        return { success: false, error: data.error };
      } else {
        playTone('denied', muted);
        return { success: false, error: data.error };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  return { performCheckIn, muted, setMuted };
};
