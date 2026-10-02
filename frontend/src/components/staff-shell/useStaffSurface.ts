import { useLayoutEffect } from 'react';
import { isStaffPath } from './navigation';

/**
 * Switch <html> to the staff token set while a staff page is mounted.
 * On unmount the flag stays if the next route is also a staff page, which
 * avoids a palette flash while its lazy chunk loads.
 */
export function useStaffSurface() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = 'staff';
    return () => {
      if (!isStaffPath(window.location.pathname)) delete root.dataset.surface;
    };
  }, []);
}
