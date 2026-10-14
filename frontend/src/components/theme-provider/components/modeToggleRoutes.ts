/**
 * Pages that own their theme control (or have no light/dark theme) hide the global floating toggle.
 */
const PREFIXES = [
  // Staff pages render the theme control in StaffShell's top bar.
  '/reception',
  '/home',
  '/grow',
  '/customers',
  '/settings',
  '/analytics',
  '/calendar',
  '/onboarding',
  '/workspaces',
  '/no-access',
  '/admin',
  '/schedule', // All booking pages have integrated toggles
];

// The landing page and its template gallery tint themselves by the story clock, not by light/dark,
// and their top bar holds the controls.
const EXACT = ['/', '/templates'];

export function hidesGlobalModeToggle(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return EXACT.includes(path) || PREFIXES.some((route) => path === route || path.startsWith(`${route}/`));
}
