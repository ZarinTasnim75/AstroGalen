'use client';

import * as React from 'react';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Input, Label } from './ui/input';
import { getUser, signIn, signOut, initialsOf, type UserProfile } from '@/lib/auth';

// Login button for the navbar. Since AstroGalen is offline-first and stores
// health data only on this device, signing in creates a local crew profile
// (name + role) kept in localStorage — no password, no server.
export function LoginButton() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setUser(getUser());
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your crew name.');
      return;
    }
    setError('');
    setUser(signIn(name, role));
    setName('');
    setRole('');
    setOpen(false);
  };

  const doSignOut = () => {
    signOut();
    setUser(null);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={user ? `Account — ${user.name}` : 'Login'}
        className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition ${
          user
            ? 'border-orbit-cyan/50 bg-orbit-cyan/10 text-orbit-cyan'
            : 'border-orbit-border text-orbit-text hover:bg-orbit-cyan/10'
        }`}
      >
        {user ? (
          <>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orbit-cyan/25 text-[11px] font-bold">
              {initialsOf(user.name)}
            </span>
            <span className="hidden sm:inline max-w-24 truncate">{user.name}</span>
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Login</span>
          </>
        )}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={user ? 'Signed in' : 'Mission login'}>
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-orbit-border/70 p-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-orbit-cyan/20 text-sm font-bold text-orbit-cyan">
                {initialsOf(user.name)}
              </span>
              <div>
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-orbit-muted">{user.role}</p>
              </div>
            </div>
            <p className="text-xs text-orbit-muted">
              This is a local crew profile stored only on this device. Your health records stay in this browser&apos;s
              database and are never uploaded by logging in.
            </p>
            <Button variant="outline" onClick={doSignOut} className="w-full">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-orbit-muted">
              Create your local crew profile to personalize the app. Everything stays on this device — the app works
              fully offline.
            </p>
            <div>
              <Label htmlFor="login-name">Crew member name</Label>
              <Input
                id="login-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Vega"
                autoComplete="off"
                maxLength={40}
              />
            </div>
            <div>
              <Label htmlFor="login-role">Role (optional)</Label>
              <Input
                id="login-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Flight Engineer"
                autoComplete="off"
                maxLength={40}
              />
            </div>
            {error && (
              <p role="alert" className="text-xs text-orbit-red">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              <UserRound className="h-4 w-4" /> Enter the station
            </Button>
            <p className="text-[11px] text-orbit-muted">
              No password needed — this is not an account system. Profile data never leaves this device.
            </p>
          </form>
        )}
      </Dialog>
    </>
  );
}
