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

                // Check if user already dismissed this announcement
                const dismissedIds = JSON.parse(localStorage.getItem('dismissed-announcements') || '[]');
                if (dismissedIds.includes(data.id)) return;

                setAnnouncement(data);
            } catch {
                // Table might not exist yet — ignore
            }
        }
        fetchAnnouncement();
    }, []);

    const handleDismiss = () => {
        if (announcement) {
            const dismissedIds = JSON.parse(localStorage.getItem('dismissed-announcements') || '[]');
            dismissedIds.push(announcement.id);
            localStorage.setItem('dismissed-announcements', JSON.stringify(dismissedIds));
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
