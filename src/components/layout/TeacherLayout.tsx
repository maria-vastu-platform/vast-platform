import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Layout, Users, Loader2, FileText, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function TeacherLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, role, loading, signOut, isDemo } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-vastu-dark" size={40} /></div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role !== 'teacher') {
        return <Navigate to="/student" replace />;
    }

    const navItems = [
        { path: '/teacher', label: 'Kurs', icon: Layout },
        { path: '/teacher/students', label: 'Teilnehmer', icon: Users },
        { path: '/teacher/kohorten', label: 'Kohorten', icon: Users },
        { path: '/teacher/library', label: 'Bibliothek', icon: FileText },
    ];

    const handleSignOut = () => {
        signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar — light mauve c4b7b3 with dark text */}
            <aside className="hidden md:flex w-64 bg-sidebar-gradient flex-col fixed h-full z-20">
                <div className="p-6 border-b border-vastu-dark/10">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Academy" className="w-8 h-8 object-contain" />
                        <span className="font-serif text-xl tracking-wide text-vastu-dark">ADMIN</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                location.pathname === item.path
                                    ? "bg-white/40 text-vastu-dark font-semibold"
                                    : "text-vastu-dark/80 hover:text-vastu-dark hover:bg-white/20"
                            )}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-vastu-dark/10">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-vastu-dark/70 hover:text-vastu-dark hover:bg-white/20 transition-colors"
                    >
                        <LogOut size={18} />
                        Abmelden
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-sidebar-gradient fixed top-0 w-full z-50 shadow-md h-14 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Academy" className="w-8 h-8 object-contain" />
                    <span className="font-serif text-lg tracking-wide text-vastu-dark">ADMIN</span>
                </div>
                <button
                    className="text-vastu-dark p-1"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="bg-sidebar-gradient w-64 h-full shadow-2xl p-4 pt-18 overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <nav className="space-y-2 mt-14">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        location.pathname === item.path
                                            ? "bg-white/40 text-vastu-dark font-semibold"
                                            : "text-vastu-dark/60 hover:text-vastu-dark hover:bg-white/20"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-6 pt-4 border-t border-vastu-dark/10">
                            {isDemo && (
                                <button
                                    onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-vastu-dark/50 hover:text-vastu-dark hover:bg-white/20 transition-colors mb-2"
                                >
                                    <Users size={18} />
                                    Rolle wechseln
                                </button>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-vastu-dark/70 hover:text-vastu-dark hover:bg-white/20 transition-colors"
                            >
                                <LogOut size={18} />
                                Abmelden
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
                <div className="p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
