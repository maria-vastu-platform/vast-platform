import { useParams, Link, useNavigate } from 'react-router-dom';
import { FileText, Download, Loader2, BookOpen, CheckCircle2, ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { useLektion } from '../../hooks/useCourse';
import VimeoPlayer from '../../components/VimeoPlayer';
import { useState } from 'react';

export default function LektionView() {
    const { moduleId, lektionId } = useParams();
    const { lektion, loading, toggleComplete } = useLektion(moduleId, lektionId);
    const [justCompleted, setJustCompleted] = useState(false);
    const navigate = useNavigate();

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    if (!lektion) {
        return (
            <div className="text-center py-20">
                <p className="text-vastu-text-light font-body text-lg">Lektion nicht gefunden</p>
                <Link to="/student" className="text-vastu-dark underline mt-4 inline-block font-body">Zurück zum Kurs</Link>
            </div>
        );
    }

    const pdfMaterials = lektion.materials.filter(m => m.type === 'pdf');
    const otherMaterials = lektion.materials.filter(m => m.type !== 'pdf');

    const handleToggleComplete = (val: boolean) => {
        toggleComplete(val);
        if (val) {
            setJustCompleted(true);
            setTimeout(() => setJustCompleted(false), 500);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group text-sm font-sans"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Zurück</span>
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm font-sans text-vastu-text-light">
                <Link to="/student" className="hover:text-vastu-dark transition-colors flex items-center gap-1">
                    <Home size={14} />
                    Kurs
                </Link>
                <ChevronRight size={14} className="text-vastu-sand" />
                <Link to={`/student?module=${moduleId}`} className="hover:text-vastu-dark transition-colors">
                    Modul
                </Link>
                <ChevronRight size={14} className="text-vastu-sand" />
                <span className="text-vastu-dark font-medium truncate max-w-[200px]">{lektion.title}</span>
            </nav>

            {/* Lesson Content Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden">
                {/* Header with grain */}
                <div className="bg-vastu-accent grain-overlay p-6 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-vastu-dark opacity-5 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3" />
                    <div className="relative z-10">
                        <h1 className="text-2xl md:text-4xl font-serif mb-2 text-vastu-dark">{lektion.title}</h1>
                        {lektion.description && (
                            <p className="text-vastu-dark/50 font-body leading-relaxed max-w-2xl text-lg">{lektion.description}</p>
                        )}
                    </div>
                </div>

                {/* Vimeo Video */}
                {lektion.vimeoUrl && (
                    <div className="p-6 md:p-8">
                        <VimeoPlayer url={lektion.vimeoUrl} />
                    </div>
                )}

                {/* Homework Description — styled with gold left bar */}
                {lektion.homeworkDescription && (
                    <div className="px-6 md:px-8 pb-6">
                        <div className="bg-vastu-cream rounded-xl p-6 border border-vastu-sand/30 accent-bar-left" style={{ borderLeftColor: '#c4b7b3' }}>
                            <h3 className="font-serif text-lg text-vastu-dark mb-3 flex items-center gap-2">
                                <BookOpen size={18} className="text-vastu-gold" />
                                Hausaufgabe
                            </h3>
                            <div className="text-vastu-text font-body prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: lektion.homeworkDescription }} />
                        </div>
                    </div>
                )}

                {/* Mark as Complete — with celebration animation */}
                <div className="px-6 md:px-8 pb-6">
                    <button
                        onClick={() => handleToggleComplete(!lektion.isCompleted)}
                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-sans font-medium transition-all ${justCompleted ? 'animate-celebrate' : ''
                            } ${lektion.isCompleted
                                ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
                                : 'bg-vastu-dark text-white hover:bg-vastu-dark-deep shadow-lg shadow-vastu-dark/15'
                            }`}
                    >
                        {lektion.isCompleted ? (
                            <>
                                <CheckCircle2 size={22} />
                                Lektion abgeschlossen ✓
                            </>
                        ) : (
                            <>
                                <input type="checkbox" className="lesson-check" readOnly checked={false} />
                                Ich habe die Lektion abgeschlossen
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* PDF Materials */}
            {pdfMaterials.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <h3 className="font-serif text-xl text-vastu-dark mb-4 flex items-center gap-2">
                        <FileText className="text-vastu-gold" size={20} />
                        PDF Materialien
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {pdfMaterials.map((mat) => (
                            <a
                                key={mat.id}
                                href={mat.url}
                                target="_blank"
                                rel="noreferrer"
                                className="pdf-card flex items-center gap-4 p-4 bg-vastu-cream/60 rounded-xl border border-vastu-sand/30 hover:border-vastu-gold/30 group"
                            >
                                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                                    <FileText className="text-red-500" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-serif font-medium text-vastu-dark truncate">{mat.title}</div>
                                    <div className="text-xs font-sans text-vastu-text-light uppercase mt-0.5">PDF</div>
                                </div>
                                <Download size={18} className="text-vastu-sand group-hover:text-vastu-dark transition-colors shrink-0" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Other Materials */}
            {otherMaterials.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <h3 className="font-serif text-xl text-vastu-dark mb-4">Weitere Materialien</h3>
                    <div className="space-y-3">
                        {otherMaterials.map((mat) => (
                            <a
                                key={mat.id}
                                href={mat.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-vastu-cream transition-colors group"
                            >
                                <FileText size={18} className="text-vastu-text-light group-hover:text-vastu-gold" />
                                <span className="text-sm font-serif font-medium text-vastu-dark">{mat.title}</span>
                                <span className="text-[10px] font-sans text-vastu-text-light uppercase ml-auto">{mat.type}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
