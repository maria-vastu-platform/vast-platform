import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2 } from 'lucide-react';

const DISCLAIMER_ITEMS = [
    'Ich bestätige hiermit, dass ich alle Regeln & Bedingungen gelesen habe & akzeptiere',
    'Ich gehe die Ausbildung bis zum Ende durch',
    'Ich gebe mir selbst, das Versprechen des Wissen aufzunehmen und umzusetzen',
    'Ich gehe die Ausbildung mit Liebe, Achtsamkeit, Langsamkeit durch & erlaube mir, Fehler zu machen',
    'Ich bin aktiv im Chat und stelle meine Fragen ohne Scham und Ängste',
    'Ich führe die Hausaufgaben aus',
    'Ich habe keine Zeit → Ich habe Zeit',
    'Ich verstehe das nicht → Ich verstehe & das Wissen eröffnet sich Stück für Stück',
];

interface DisclaimerModalProps {
    userId: string;
    onAccepted: () => void;
}

export default function DisclaimerModal({ userId, onAccepted }: DisclaimerModalProps) {
    const [checked, setChecked] = useState<Record<number, boolean>>({});
    const [submitting, setSubmitting] = useState(false);

    const allChecked = DISCLAIMER_ITEMS.every((_, i) => checked[i]);

    const toggle = (index: number) => {
        setChecked(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleAccept = async () => {
        if (!allChecked) return;
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ disclaimer_accepted_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;
            onAccepted();
        } catch (error) {
            console.error('Fehler beim Speichern der Vereinbarung:', error);
            alert('Fehler beim Speichern. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-vastu-dark p-6 text-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-vastu-gold opacity-10 rounded-full blur-[40px] translate-x-1/3 -translate-y-1/3" />
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                        <span className="text-3xl">🙏</span>
                    </div>
                    <h2 className="font-serif text-xl text-white mb-1">Willkommen bei Vastulogie</h2>
                    <p className="text-white/60 text-sm font-sans">
                        Bitte bestätige die folgenden Punkte, bevor du startest.
                    </p>
                </div>

                {/* Checklist */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {DISCLAIMER_ITEMS.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => toggle(index)}
                            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                                checked[index]
                                    ? 'border-green-200 bg-green-50/50'
                                    : 'border-gray-200 bg-white hover:border-vastu-accent/30 hover:bg-vastu-cream/20'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                checked[index]
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-300'
                            }`}>
                                {checked[index] && <CheckCircle2 size={14} />}
                            </div>
                            <span className={`text-sm font-sans leading-relaxed ${
                                checked[index] ? 'text-green-800' : 'text-vastu-dark'
                            }`}>
                                {item}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 shrink-0">
                    <button
                        onClick={handleAccept}
                        disabled={!allChecked || submitting}
                        className="w-full py-3.5 bg-vastu-dark text-white rounded-xl font-serif font-medium hover:bg-vastu-dark/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                Ich stimme zu & starte die Ausbildung
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3 font-sans">
                        {allChecked ? '✅ Alle Punkte bestätigt' : `${Object.values(checked).filter(Boolean).length} von ${DISCLAIMER_ITEMS.length} bestätigt`}
                    </p>
                </div>
            </div>
        </div>
    );
}
