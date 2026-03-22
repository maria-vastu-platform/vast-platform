import { useEffect, useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Announcement {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

export default function AnnouncementBanner() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        async function fetchAnnouncement() {
            try {
                const { data, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .eq('active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error || !data) return;

                // Check if user already saw this announcement
                const seenIds = JSON.parse(localStorage.getItem('seen-announcements') || '[]');
                if (seenIds.includes(data.id)) return;

                setAnnouncement(data);

                // Auto-mark as seen after 3 seconds (so it won't show again next visit)
                setTimeout(() => {
                    const current = JSON.parse(localStorage.getItem('seen-announcements') || '[]');
                    if (!current.includes(data.id)) {
                        current.push(data.id);
                        localStorage.setItem('seen-announcements', JSON.stringify(current));
                    }
                }, 3000);
            } catch {
                // Table might not exist yet — ignore
            }
        }
        fetchAnnouncement();
    }, []);

    const handleDismiss = () => {
        if (announcement) {
            const seenIds = JSON.parse(localStorage.getItem('seen-announcements') || '[]');
            if (!seenIds.includes(announcement.id)) {
                seenIds.push(announcement.id);
                localStorage.setItem('seen-announcements', JSON.stringify(seenIds));
            }
        }
        setDismissed(true);
    };

    if (!announcement || dismissed) return null;

    return (
        <div className="bg-vastu-gold/15 border border-vastu-gold/30 rounded-xl p-4 mb-4 flex items-start gap-3 animate-fade-in">
            <div className="w-9 h-9 rounded-lg bg-vastu-gold/20 flex items-center justify-center shrink-0">
                <Megaphone size={18} className="text-vastu-dark" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-serif font-medium text-vastu-dark text-sm">{announcement.title}</h4>
                <p className="text-xs font-body text-vastu-text mt-0.5 whitespace-pre-line">{announcement.message}</p>
            </div>
            <button
                onClick={handleDismiss}
                className="text-vastu-text-light hover:text-vastu-dark transition-colors shrink-0"
            >
                <X size={16} />
            </button>
        </div>
    );
}
