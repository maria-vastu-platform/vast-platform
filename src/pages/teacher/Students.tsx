import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, Mail, User } from 'lucide-react';

interface StudentProfile {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    kohorte_id?: string;
}

const MOCK_KOHORTEN = [
    { id: 'k1', name: 'Frühling 2026', color: '#c4b7b3' },
    { id: 'k2', name: 'Herbst 2026', color: '#d4a574' },
];

export default function Students() {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKohorte, setFilterKohorte] = useState<string>('all');

    useEffect(() => {
        async function fetchStudents() {
            try {
                if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    setStudents([
                        { id: '1', name: 'Anna Schneider', email: 'anna@beispiel.de', created_at: '2026-02-10T10:00:00Z', kohorte_id: 'k1' },
                        { id: '2', name: 'Lisa Müller', email: 'lisa@beispiel.de', created_at: '2026-02-12T14:30:00Z', kohorte_id: 'k1' },
                        { id: '3', name: 'Sophie Wagner', email: 'sophie@beispiel.de', created_at: '2026-02-15T09:15:00Z', kohorte_id: 'k1' },
                        { id: '4', name: 'Julia Fischer', email: 'julia@beispiel.de', created_at: '2026-02-18T11:45:00Z', kohorte_id: 'k2' },
                    ]);
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'student')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setStudents(data || []);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStudents();
    }, []);

    const assignKohorte = async (studentId: string, kohorteId: string) => {
        // Optimistic UI update
        const previous = students;
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, kohorte_id: kohorteId || undefined } : s
        ));

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ kohorte_id: kohorteId || null })
                .eq('id', studentId);

            if (error) throw error;
        } catch (error) {
            console.error('Fehler beim Zuweisen der Kohorte:', error);
            setStudents(previous); // Revert on error
            alert('Fehler beim Speichern der Kohorte. Bitte versuche es erneut.');
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={40} /></div>;

    const inviteLink = `${window.location.origin}/register`;

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        alert('Link wurde kopiert!');
    };

    const filtered = students.filter(s => {
        const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesKohorte = filterKohorte === 'all' || s.kohorte_id === filterKohorte || (filterKohorte === 'none' && !s.kohorte_id);
        return matchesSearch && matchesKohorte;
    });

    const getKohorte = (id?: string) => MOCK_KOHORTEN.find(k => k.id === id);

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-serif text-vastu-dark">Teilnehmer</h1>
                <button
                    onClick={copyLink}
                    className="flex items-center gap-2 bg-vastu-accent/10 text-vastu-dark border border-vastu-accent/30 px-4 py-2 rounded-lg hover:bg-vastu-accent/20 transition-colors"
                >
                    <Mail size={18} />
                    Einladungslink kopieren
                </button>
            </div>

            {/* Invite Card */}
            <div className="bg-white p-6 rounded-xl border border-vastu-accent/20 shadow-sm mb-8 flex items-center justify-between">
                <div>
                    <h3 className="font-medium text-vastu-dark mb-1">Registrierungslink für Teilnehmer</h3>
                    <p className="text-sm text-gray-500">Sende diesen Link an Teilnehmer, damit sie ein Konto erstellen können</p>
                </div>
                <code className="bg-gray-100 px-4 py-2 rounded text-sm text-gray-600 select-all">
                    {inviteLink}
                </code>
            </div>

            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <p className="text-gray-500">Teilnehmerliste ({filtered.length})</p>
                    {/* Kohorte filter */}
                    <select
                        value={filterKohorte}
                        onChange={e => setFilterKohorte(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vastu-accent bg-white"
                    >
                        <option value="all">Alle Kohorten</option>
                        {MOCK_KOHORTEN.map(k => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                        <option value="none">Nicht zugewiesen</option>
                    </select>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Suchen..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-accent/50 w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Teilnehmer</th>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">E-Mail</th>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Kohorte</th>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Registriert am</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length > 0 ? (
                            filtered.map((student) => {
                                const kohorte = getKohorte(student.kohorte_id);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-vastu-light flex items-center justify-center text-vastu-dark">
                                                    <User size={20} />
                                                </div>
                                                <span className="font-medium text-vastu-dark">{student.name || 'Kein Name'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-gray-400" />
                                                {student.email}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <select
                                                value={student.kohorte_id || ''}
                                                onChange={e => assignKohorte(student.id, e.target.value)}
                                                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-accent bg-white"
                                                style={kohorte ? { borderColor: kohorte.color, color: kohorte.color } : {}}
                                            >
                                                <option value="">— Keine —</option>
                                                {MOCK_KOHORTEN.map(k => (
                                                    <option key={k.id} value={k.id}>{k.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-4 px-6 text-gray-500 text-sm">
                                            {new Date(student.created_at).toLocaleDateString('de-DE')}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-500">
                                    {searchQuery ? 'Keine Teilnehmer gefunden' : 'Noch keine Teilnehmer registriert'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
