// This preference selects a form only; authorization remains on the server.
export type LoginMode = 'admin' | 'seguridad';
export const LOGIN_MODE_KEY = 'gestion-personal-login-mode-v1';

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readLoginMode(storage: PreferenceStorage): LoginMode | null {
  try {
    const value = storage.getItem(LOGIN_MODE_KEY);
    return value === 'admin' || value === 'seguridad' ? value : null;
  } catch { return null; }
}
export function rememberLoginMode(storage: PreferenceStorage, mode: LoginMode): void {
  try { storage.setItem(LOGIN_MODE_KEY, mode); } catch { /* The form remains usable. */ }
}
export function initialLoginMode(input: {
  saved: LoginMode | null; activation?: boolean; setup?: boolean;
  accessLink?: boolean; adminSession?: boolean; securitySession?: boolean;
}): LoginMode | null {
  if (input.activation) return 'seguridad';
  if (input.setup || input.accessLink) return 'admin';
  if (input.saved) return input.saved;
  if (input.adminSession) return 'admin';
  if (input.securitySession) return 'seguridad';
  return null;
}
