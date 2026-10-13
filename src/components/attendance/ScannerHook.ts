import { useState, useEffect, useRef } from 'react';

/**
 * useScanner hook
 * The string returned by the barcode scanner IS the member_id directly.
 * Captures scanner input and passes member_id to onScan.
 */
export const useScanner = (onScan: (memberId: string) => void) => {
  const [buffer, setBuffer] = useState('');
  const lastScan = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isInput && target?.id !== 'scanner-dummy-input') {
        const inputType = (target as HTMLInputElement).type;
        if (inputType === 'text' || inputType === 'tel' || inputType === 'search') {
          return;
        }
      }

      const now = Date.now();
      if (now - lastScan.current > 3000) setBuffer(''); // Debounce 3s
      lastScan.current = now;

      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          const scannedMemberId = buffer.trim();
          onScan(scannedMemberId);
          setBuffer('');
        }
      } else if (e.key.length === 1) {
        setBuffer(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buffer, onScan]);

  return null;
};
