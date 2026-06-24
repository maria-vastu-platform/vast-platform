import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserRole } from '../lib/types';

const PENDING_INVITE_KEY = 'vastu.pendingInvite';
const ROLE_CACHE_KEY = 'vastu.cachedRole';

// Cache the resolved identity so repeat visits skip BOTH the profile-fetch
// round-trip AND the LoginPage flash before the redirect kicks in.
interface CachedAuth {
    userId: string;
    role: UserRole;
    email?: string;
    name?: string;
}

function readCachedAuth(): CachedAuth | null {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(ROLE_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.userId) return null;
        if (parsed.role !== 'student' && parsed.role !== 'teacher') return null;
        return parsed as CachedAuth;
    } catch { return null; }
}

function writeCachedAuth(user: User, role: UserRole) {
    if (typeof localStorage === 'undefined') return;
    try {
        const payload: CachedAuth = {
            userId: user.id,
            role,
            email: user.email,
            name: (user.user_metadata as { full_name?: string } | undefined)?.full_name,
        };
        localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(payload));
    } catch { }
}

function clearCachedAuth() {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(ROLE_CACHE_KEY); } catch { }
}

function optimisticUserFromCache(cached: CachedAuth): User {
    return {
        id: cached.userId,
        email: cached.email || '',
        user_metadata: { full_name: cached.name || '' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: '',
    } as User;
}

// Email-confirmation flow: RegisterPage stashes the invite token, and the
// entitlement gets created here on the next SIGNED_IN once the user is
// authenticated (redeem_invite needs auth.uid()).
async function tryRedeemPendingInvite() {
    if (typeof localStorage === 'undefined') return;
    const token = localStorage.getItem(PENDING_INVITE_KEY);
    if (!token) return;
    const { error } = await supabase.rpc('redeem_invite', { invite_token: token });
    if (!error) {
        localStorage.removeItem(PENDING_INVITE_KEY);
    } else {
        console.warn('Pending invite redemption failed:', error.message);
    }
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: UserRole | null;
    loading: boolean;
    signOut: () => Promise<void>;
    switchDemoRole: (newRole: UserRole) => void;
    isDemo: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    loading: true,
    signOut: async () => { },
    switchDemoRole: () => { },
    isDemo: false,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Pre-hydrate from cache so the first render already knows who the user
    // is (no LoginPage flash before the redirect, no protected-layout spinner).
    const initialCache = typeof window !== 'undefined' ? readCachedAuth() : null;
    const [user, setUser] = useState<User | null>(initialCache ? optimisticUserFromCache(initialCache) : null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<UserRole | null>(initialCache ? initialCache.role : null);
    const [loading, setLoading] = useState(initialCache ? false : true);

    const isPlaceholder = !import.meta.env.VITE_SUPABASE_URL ||
        import.meta.env.VITE_SUPABASE_URL.includes('placeholder') ||
        !import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY === 'placeholder';

    const isDemo = isPlaceholder;

    const createMockUser = (demoRole: UserRole) => {
        const name = demoRole === 'teacher' ? 'Maria Sobotka' : 'Maria Teilnehmer';
        const mockUser: User = {
            id: demoRole === 'teacher' ? 'mock-teacher-id' : 'mock-student-id',
            app_metadata: {},
            user_metadata: {
                full_name: name,
                avatar_url: null,
            },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
        } as User;
        return mockUser;
    };

    useEffect(() => {
        if (isPlaceholder) {
            // In demo mode, don't auto-login — wait for user to pick a role on login page
            setLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                // Replace the optimistic user object with the real one from
                // the verified session, then refresh role in background.
                setUser(session.user);
                fetchUserRole(session.user);
            } else {
                // Cache was stale (no real session) — clear optimistic state.
                clearCachedAuth();
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            // Password-reset link: Supabase sets a short-lived recovery session
            // and fires PASSWORD_RECOVERY. If the link landed anywhere other than
            // /update-password (e.g. the Site URL root because the redirect URL
            // wasn't allow-listed), force the user to the password form before
            // any "logged-in" redirect bounces them into the app.
            if (_event === 'PASSWORD_RECOVERY') {
                if (window.location.pathname !== '/update-password') {
                    window.history.replaceState({}, '', '/update-password');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }
            }
            setSession(session);
            if (session?.user) {
                setUser(session.user);
                fetchUserRole(session.user);
                if (_event === 'SIGNED_IN') {
                    tryRedeemPendingInvite();
                }
            } else {
                clearCachedAuth();
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const switchDemoRole = (newRole: UserRole) => {
        const mockUser = createMockUser(newRole);
        const mockSession: Session = {
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: mockUser,
        };
        setSession(mockSession);
        setUser(mockUser);
        setRole(newRole);
    };

    const fetchUserRole = async (authUser: User) => {
        const userId = authUser.id;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Profile fetch error, defaulting to student:', error.message);
                setRole('student');
                writeCachedAuth(authUser, 'student');
            } else {
                const fetchedRole = data?.role as UserRole || 'student';
                setRole(fetchedRole);
                // Always merge the profile onto the AUTHORITATIVE session user
                // passed in — never a stale closure `user`. The old code spread
                // the closure `user`, which on a repeat visit is the optimistic
                // object rebuilt from a previously-cached account. That reverted
                // user.id to the wrong account, so CourseContext queried the
                // wrong user's entitlements (zero rows) and locked an entitled
                // student out with "Kein Kurszugang".
                const updatedUser = { ...authUser, user_metadata: { ...authUser.user_metadata, ...data } };
                setUser(updatedUser);
                writeCachedAuth(updatedUser, fetchedRole);
            }
        } catch (err) {
            console.error(err);
            setRole('student');
            writeCachedAuth(authUser, 'student');
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        if (!isPlaceholder) {
            await supabase.auth.signOut();
        }
        clearCachedAuth();
        setRole(null);
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, role, loading, signOut, switchDemoRole, isDemo }}>
            {children}
        </AuthContext.Provider>
    );
}
