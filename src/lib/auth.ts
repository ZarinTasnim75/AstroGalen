// AstroGalen — local mission profile. The app is offline-first, so "login"
// stores a lightweight crew profile on this device only (localStorage).
// No passwords, no server, no personal health data involved.

export interface UserProfile {
  name: string;
  role: string;
  loggedInAt: number;
}

const KEY = 'astrogalen-user';

export function getUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed && typeof parsed.name === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function signIn(name: string, role: string): UserProfile {
  const user: UserProfile = {
    name: name.trim() || 'Astronaut',
    role: role.trim() || 'Mission Crew',
    loggedInAt: Date.now(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // storage unavailable — profile still works for this session
  }
  return user;
}

export function signOut(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
