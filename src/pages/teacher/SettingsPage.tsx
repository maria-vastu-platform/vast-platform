import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Video, Link as LinkIcon, Map, MessageCircle, BookOpen, Megaphone, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getVideoEmbedUrl } from '../../lib/utils';

interface Announcement {
    id: string;
    title: string;
    message: string;
    active: boolean;
    created_at: string;
}

function normalizeWelcomeVideoUrl(rawUrl: string) {
    const url = rawUrl.trim();
    if (!url) return '';

    if (url.includes('vimeo.com') && !url.includes('player.vimeo.com/video/')) {
        const match = url.match(/vimeo\.com\/(?:manage\/videos\/)?(\d+)/);
        if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
    }

    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('<iframe')) {
        return getVideoEmbedUrl(url);
    }

    return url;
}

export default function SettingsPage() {
    const [welcomeVideoUrl, setWelcomeVideoUrl] = useState('');
    const [zoomLink, setZoomLink] = useState('');
    const [telegramLink, setTelegramLink] = useState('');
    const [vastuMapLink, setVastuMapLink] = useState('');
    const [instructionUrl, setInstructionUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const { isDemo } = useAuth();

    // Announcements
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
    const [newAnnouncementMessage, setNewAnnouncementMessage] = useState('');
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (isDemo) {
                setWelcomeVideoUrl('https://player.vimeo.com/video/placeholder');
                setZoomLink('https://zoom.us');
                setTelegramLink('https://t.me');
                setVastuMapLink('https://www.vastusphere.net');
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('platform_settings')
                    .select('*')
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found', which is fine for the first time
                    throw error;
                }

                if (data) {
                    setWelcomeVideoUrl(data.welcome_video_url || '');
                    setZoomLink(data.zoom_link || '');
                    setTelegramLink(data.telegram_link || '');
                    setVastuMapLink(data.vastu_map_link || 'https://www.vastusphere.net');
                    setInstructionUrl(data.instruction_url || '');
                }
            } catch (err) {
                console.error('Error loading settings:', err);
                setMessage({ text: 'Fehler beim Laden der Einstellungen.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        const fetchAnnouncements = async () => {
            try {
                const { data } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (data) setAnnouncements(data);
            } catch {
                // Table might not exist yet
            }
        };

        fetchSettings();
        fetchAnnouncements();
    }, [isDemo]);

    const handleSendAnnouncement = async () => {
        if (!newAnnouncementTitle.trim()) return;
        setSendingAnnouncement(true);
        try {
            // Deactivate all previous announcements
            await supabase.from('announcements').update({ active: false }).eq('active', true);

            const { data, error } = await supabase
                .from('announcements')
                .insert({
                    title: newAnnouncementTitle.trim(),
                    message: newAnnouncementMessage.trim(),
                    active: true,
                })
                .select()
                .single();

            if (error) throw error;
            if (data) setAnnouncements(prev => [data, ...prev]);
            setNewAnnouncementTitle('');
            setNewAnnouncementMessage('');
        } catch (err) {
            console.error('Error sending announcement:', err);
            alert('Fehler beim Senden der Nachricht.');
        } finally {
            setSendingAnnouncement(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        try {
            await supabase.from('announcements').delete().eq('id', id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting announcement:', err);
        }
    };

    const handleToggleAnnouncement = async (id: string, active: boolean) => {
        try {
            if (active) {
                // Deactivate all others first
                await supabase.from('announcements').update({ active: false }).eq('active', true);
            }
            await supabase.from('announcements').update({ active }).eq('id', id);
            setAnnouncements(prev => prev.map(a =>
                a.id === id ? { ...a, active } : (active ? { ...a, active: false } : a)
            ));
        } catch (err) {
            console.error('Error toggling announcement:', err);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        if (isDemo) {
            setTimeout(() => {
                setSaving(false);
                setMessage({ text: 'Einstellungen erfolgreich gespeichert! (Demo Modus)', type: 'success' });
            }, 800);
            return;
        }

        try {
            const normalizedWelcomeVideoUrl = normalizeWelcomeVideoUrl(welcomeVideoUrl);
            // Upsert the single row (we will use id = 1 in the database)
            const { error } = await supabase
                .from('platform_settings')
                .upsert({
                    id: 1, // Enforce single row
                    welcome_video_url: normalizedWelcomeVideoUrl,
                    zoom_link: zoomLink,
                    telegram_link: telegramLink,
                    vastu_map_link: vastuMapLink,
                    instruction_url: instructionUrl,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setWelcomeVideoUrl(normalizedWelcomeVideoUrl);
            setMessage({ text: 'Einstellungen erfolgreich gespeichert!', type: 'success' });
        } catch (err) {
            console.error('Error saving settings:', err);
            setMessage({ text: 'Fehler beim Speichern der Einstellungen.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-vastu-dark" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-serif text-vastu-dark mb-2">Plattform Einstellungen</h1>
            <p className="font-body text-vastu-text-light mb-8">
                Verwalte hier die Links für die Willkommensseite der Studenten.
            </p>

            {message.text && (
                <div className={`mb-6 p-4 rounded-xl border font-sans text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">

                {/* Welcome Video Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-vastu-gold/10 flex items-center justify-center">
                            <Video className="text-vastu-gold" size={20} />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl text-vastu-dark">Begrüßungsvideo</h2>
                            <p className="text-sm font-sans text-vastu-text-light">Das Video, das ganz oben auf der Willkommensseite angezeigt wird.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">Vimeo / YouTube URL</label>
                        <input
                            type="url"
                            value={welcomeVideoUrl}
                            onChange={(e) => setWelcomeVideoUrl(e.target.value)}
                            placeholder="z.B. https://vimeo.com/123456789"
                            className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                        />
                        <p className="text-xs text-vastu-text-light mt-2 italic">Wenn leer, wird das Video-Element für Studenten ausgeblendet.</p>
                    </div>
                </div>

                {/* Quick Links Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-vastu-gold/10 flex items-center justify-center">
                            <LinkIcon className="text-vastu-gold" size={20} />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl text-vastu-dark">Quick Links</h2>
                            <p className="text-sm font-sans text-vastu-text-light">Die Schnellzugriff-Buttons auf der Willkommensseite.</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5 flex items-center gap-2">
                                <Video size={16} className="text-blue-500" />
                                Zoom Meeting Link
                            </label>
                            <input
                                type="url"
                                value={zoomLink}
                                onChange={(e) => setZoomLink(e.target.value)}
                                placeholder="https://us02web.zoom.us/j/..."
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Link für das wöchentliche Live-Meeting.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5 flex items-center gap-2">
                                <MessageCircle size={16} className="text-sky-500" />
                                Telegram Kanal Link
                            </label>
                            <input
                                type="url"
                                value={telegramLink}
                                onChange={(e) => setTelegramLink(e.target.value)}
                                placeholder="https://t.me/+"
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Link zur Telegram Community-Gruppe.</p>
                        </div>

                        <div className="pt-2 border-t border-vastu-sand/30">
                            <label className="block text-sm font-sans font-medium text-vastu-dark mt-4 mb-1.5 flex items-center gap-2">
                                <Map size={16} className="text-vastu-gold" />
                                Vastu Karte Erstellung Link
                            </label>
                            <input
                                type="url"
                                value={vastuMapLink}
                                onChange={(e) => setVastuMapLink(e.target.value)}
                                placeholder="https://www.vastusphere.net"
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Standard: https://www.vastusphere.net</p>
                        </div>

                        <div className="pt-2 border-t border-vastu-sand/30">
                            <label className="block text-sm font-sans font-medium text-vastu-dark mt-4 mb-1.5 flex items-center gap-2">
                                <BookOpen size={16} className="text-emerald-500" />
                                Anleitung Link (z.B. Vimeo Untertitel)
                            </label>
                            <input
                                type="url"
                                value={instructionUrl}
                                onChange={(e) => setInstructionUrl(e.target.value)}
                                placeholder="https://support.vimeo.com/..."
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Wird als klickbarer Link im Bereich „Hilfreiche Anleitungen" angezeigt.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-vastu-dark text-white px-8 py-3.5 rounded-xl font-sans font-medium hover:bg-vastu-dark-deep transition-all shadow-lg shadow-vastu-dark/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
                    </button>
                </div>
            </form>

            {/* Announcements Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-vastu-gold/10 flex items-center justify-center">
                        <Megaphone className="text-vastu-gold" size={20} />
                    </div>
                    <div>
                        <h2 className="font-serif text-xl text-vastu-dark">Nachrichten an Teilnehmer</h2>
                        <p className="text-sm font-sans text-vastu-text-light">Sende Pop-up Nachrichten, die alle Teilnehmer sehen.</p>
                    </div>
                </div>

                {/* New Announcement Form */}
                <div className="space-y-3 mb-6">
                    <input
                        type="text"
                        value={newAnnouncementTitle}
                        onChange={e => setNewAnnouncementTitle(e.target.value)}
                        placeholder="Titel der Nachricht (z.B. Neues Modul freigeschaltet!)"
                        className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                    />
                    <textarea
                        value={newAnnouncementMessage}
                        onChange={e => setNewAnnouncementMessage(e.target.value)}
                        placeholder="Nachricht (optional)"
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base resize-none"
                    />
                    <button
                        onClick={handleSendAnnouncement}
                        disabled={!newAnnouncementTitle.trim() || sendingAnnouncement}
                        className="flex items-center gap-2 bg-vastu-gold text-white px-6 py-2.5 rounded-xl font-sans font-medium hover:bg-vastu-gold/90 transition-all disabled:opacity-50"
                    >
                        {sendingAnnouncement ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Nachricht senden
                    </button>
                </div>

                {/* Previous Announcements */}
                {announcements.length > 0 && (
                    <div>
                        <h4 className="text-sm font-sans font-medium text-vastu-text-light mb-3">Bisherige Nachrichten</h4>
                        <div className="space-y-2">
                            {announcements.map(a => (
                                <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${a.active ? 'bg-vastu-gold/5 border-vastu-gold/30' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-vastu-dark">{a.title}</span>
                                            {a.active && <span className="text-[10px] px-2 py-0.5 bg-vastu-gold/20 text-vastu-dark rounded-full font-sans">Aktiv</span>}
                                        </div>
                                        {a.message && <p className="text-xs text-vastu-text-light mt-0.5 truncate">{a.message}</p>}
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(a.created_at).toLocaleString('de-DE')}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <button
                                            onClick={() => handleToggleAnnouncement(a.id, !a.active)}
                                            className={`text-xs px-3 py-1 rounded-lg transition-colors ${a.active ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-vastu-gold/20 text-vastu-dark hover:bg-vastu-gold/30'}`}
                                        >
                                            {a.active ? 'Deaktivieren' : 'Aktivieren'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAnnouncement(a.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
