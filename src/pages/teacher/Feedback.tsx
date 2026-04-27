import { useEffect, useMemo, useState } from 'react';
import { Heart, Star, Download, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FeedbackResponse } from '../../lib/types';

interface UserSummary {
    user_id: string;
    name: string;
    email: string;
    submitted_at: string;
    answers: Record<string, { rating?: number | null; text?: string | null }>;
}

const QUESTION_LABELS: Record<string, string> = {
    overall_rating: 'Gesamtbewertung',
    liked_most: 'Was hat dir am besten gefallen?',
    improve: 'Was könnten wir verbessern?',
    recommend: 'Würdest du weiterempfehlen?',
    additional_thoughts: 'Zusätzliche Anmerkungen',
};

const RECOMMEND_LABEL: Record<string, string> = {
    yes: 'Ja, auf jeden Fall',
    maybe: 'Vielleicht',
    no: 'Eher nicht',
};

const QUESTION_ORDER = ['overall_rating', 'liked_most', 'improve', 'recommend', 'additional_thoughts'];

export default function TeacherFeedback() {
    const [responses, setResponses] = useState<FeedbackResponse[]>([]);
    const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { data: rows, error } = await supabase
                .from('feedback_responses')
                .select('*')
                .order('updated_at', { ascending: false });
            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }
            const list = (rows || []) as FeedbackResponse[];
            setResponses(list);

            const userIds = Array.from(new Set(list.map(r => r.user_id)));
            if (userIds.length > 0) {
                const { data: profs } = await supabase
                    .from('profiles')
                    .select('id, name, email')
                    .in('id', userIds);
                const map: Record<string, { name: string; email: string }> = {};
                (profs || []).forEach((p: any) => {
                    map[p.id] = { name: p.name || p.email || 'Anonym', email: p.email || '' };
                });
                setProfiles(map);
            }
            setLoading(false);
        })();
    }, []);

    const summaries = useMemo<UserSummary[]>(() => {
        const byUser: Record<string, UserSummary> = {};
        responses.forEach(r => {
            if (!byUser[r.user_id]) {
                byUser[r.user_id] = {
                    user_id: r.user_id,
                    name: profiles[r.user_id]?.name || 'Teilnehmer',
                    email: profiles[r.user_id]?.email || '',
                    submitted_at: r.updated_at,
                    answers: {},
                };
            }
            byUser[r.user_id].answers[r.question_key] = {
                rating: r.answer_rating,
                text: r.answer_text,
            };
            // Track latest update timestamp
            if (r.updated_at > byUser[r.user_id].submitted_at) {
                byUser[r.user_id].submitted_at = r.updated_at;
            }
        });
        return Object.values(byUser).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    }, [responses, profiles]);

    const stats = useMemo(() => {
        const ratings = responses.filter(r => r.question_key === 'overall_rating' && r.answer_rating != null);
        const avg = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.answer_rating || 0), 0) / ratings.length
            : 0;

        const recs = responses.filter(r => r.question_key === 'recommend');
        const recCounts = { yes: 0, maybe: 0, no: 0 };
        recs.forEach(r => {
            if (r.answer_text && r.answer_text in recCounts) {
                recCounts[r.answer_text as keyof typeof recCounts]++;
            }
        });

        return {
            participants: summaries.length,
            avgRating: avg,
            ratingCount: ratings.length,
            recCounts,
        };
    }, [responses, summaries]);

    const exportCsv = () => {
        const header = ['Name', 'Email', 'Eingereicht am', ...QUESTION_ORDER.map(k => QUESTION_LABELS[k] || k)];
        const rows = summaries.map(s => [
            s.name,
            s.email,
            new Date(s.submitted_at).toLocaleString('de-DE'),
            ...QUESTION_ORDER.map(k => {
                const a = s.answers[k];
                if (!a) return '';
                if (k === 'overall_rating') return a.rating != null ? String(a.rating) : '';
                if (k === 'recommend') return RECOMMEND_LABEL[a.text || ''] || a.text || '';
                return a.text || '';
            }),
        ]);
        const csv = [header, ...rows]
            .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-vastu-dark flex items-center gap-3">
                        <Heart size={28} className="text-vastu-gold" />
                        Feedback
                    </h1>
                    <p className="text-sm font-sans text-vastu-text-light mt-1">
                        Antworten der Teilnehmer auf den Kurs-Feedbackbogen.
                    </p>
                </div>
                <button
                    onClick={exportCsv}
                    disabled={summaries.length === 0}
                    className="inline-flex items-center gap-2 bg-vastu-dark text-white px-4 py-2 rounded-lg hover:bg-vastu-dark/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={16} />
                    <span>Als CSV exportieren</span>
                </button>
            </div>

            {summaries.length === 0 ? (
                <div className="bg-white rounded-xl border border-vastu-sand/50 p-12 text-center">
                    <MessageCircle size={48} className="mx-auto mb-4 text-vastu-sand" />
                    <p className="font-serif text-lg text-vastu-dark">Noch keine Antworten</p>
                    <p className="text-sm font-sans text-vastu-text-light mt-1">
                        Sobald Teilnehmer den Feedbackbogen ausfüllen, erscheinen ihre Antworten hier.
                    </p>
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-vastu-sand/50 p-5">
                            <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light mb-1">Teilnehmer</div>
                            <div className="text-3xl font-serif text-vastu-dark">{stats.participants}</div>
                        </div>
                        <div className="bg-white rounded-xl border border-vastu-sand/50 p-5">
                            <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light mb-1">Ø Bewertung</div>
                            <div className="flex items-baseline gap-2">
                                <div className="text-3xl font-serif text-vastu-dark">
                                    {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
                                </div>
                                {stats.avgRating > 0 && (
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <Star
                                                key={n}
                                                size={14}
                                                className={n <= Math.round(stats.avgRating) ? 'text-vastu-gold fill-vastu-gold' : 'text-vastu-sand'}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="text-xs font-sans text-vastu-text-light mt-1">
                                aus {stats.ratingCount} Bewertungen
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-vastu-sand/50 p-5">
                            <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light mb-2">Weiterempfehlung</div>
                            <div className="space-y-1 text-sm font-sans">
                                <div className="flex justify-between"><span>Ja</span><span className="font-medium text-green-600">{stats.recCounts.yes}</span></div>
                                <div className="flex justify-between"><span>Vielleicht</span><span className="font-medium text-amber-600">{stats.recCounts.maybe}</span></div>
                                <div className="flex justify-between"><span>Nein</span><span className="font-medium text-red-600">{stats.recCounts.no}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Responses */}
                    <div className="space-y-4">
                        {summaries.map(s => (
                            <div key={s.user_id} className="bg-white rounded-xl border border-vastu-sand/50 overflow-hidden">
                                <div className="px-5 py-3 bg-vastu-cream/40 border-b border-vastu-sand/30 flex items-center justify-between">
                                    <div>
                                        <div className="font-serif font-medium text-vastu-dark">{s.name}</div>
                                        <div className="text-xs font-sans text-vastu-text-light">{s.email}</div>
                                    </div>
                                    <div className="text-xs font-sans text-vastu-text-light">
                                        {new Date(s.submitted_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    {QUESTION_ORDER.map(key => {
                                        const a = s.answers[key];
                                        if (!a || (a.rating == null && !a.text)) return null;
                                        return (
                                            <div key={key} className="space-y-1">
                                                <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light">
                                                    {QUESTION_LABELS[key] || key}
                                                </div>
                                                {key === 'overall_rating' && a.rating != null ? (
                                                    <div className="flex items-center gap-1">
                                                        {[1, 2, 3, 4, 5].map(n => (
                                                            <Star
                                                                key={n}
                                                                size={18}
                                                                className={n <= a.rating! ? 'text-vastu-gold fill-vastu-gold' : 'text-vastu-sand'}
                                                            />
                                                        ))}
                                                        <span className="ml-2 text-sm font-sans text-vastu-text-light">{a.rating}/5</span>
                                                    </div>
                                                ) : key === 'recommend' ? (
                                                    <div className="text-sm font-body text-vastu-dark">
                                                        {RECOMMEND_LABEL[a.text || ''] || a.text}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm font-body text-vastu-dark whitespace-pre-wrap">
                                                        {a.text}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
