import { useState, useEffect, useCallback, useRef } from 'react';

export const useScanner = (onScan: (identifier: string) => void) => {
  const [buffer, setBuffer] = useState('');
  const lastScan = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastScan.current > 3000) setBuffer(''); // Debounce 3s
      lastScan.current = now;

      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          onScan(buffer);
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
