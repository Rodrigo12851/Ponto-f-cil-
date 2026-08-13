/**
 * Screen Wake Lock Utility
 * Keeps the device screen always ON during Tablet Kiosk Mode.
 */

let wakeLockSentinel: any = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && (navigator as any).wakeLock) {
      if (wakeLockSentinel && !wakeLockSentinel.released) {
        return true;
      }
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    }
  } catch (err: any) {
    console.warn('Wake Lock request notice:', err?.message || err);
  }
  return false;
}

export async function releaseScreenWakeLock(): Promise<void> {
  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      await wakeLockSentinel.release();
    }
  } catch (err) {
    console.warn('Wake Lock release notice:', err);
  } finally {
    wakeLockSentinel = null;
  }
}

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}
