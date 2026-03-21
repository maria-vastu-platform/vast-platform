import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, Home, ChevronRight, Loader2, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { useQuiz } from '../../hooks/useQuiz';
import { navigateBackOr } from '../../lib/utils';

export default function QuizView() {
    const { moduleId } = useParams();
    const navigate = useNavigate();
    const { quiz, loading, lastAttempt, submitAttempt } = useQuiz(moduleId);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);
    const [showReview, setShowReview] = useState(false);

    // If user already completed, show review by default
    const viewingPastAttempt = !result && lastAttempt;

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    if (!quiz || quiz.questions.length === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-vastu-text-light font-body text-lg">Kein Quiz für dieses Modul verfügbar</p>
                <Link to="/student" className="text-vastu-dark underline mt-4 inline-block font-body">Zurück zum Kurs</Link>
            </div>
        );
    }

    const handleSelect = (questionId: string, optionIndex: number) => {
        if (result || showReview) return; // locked after submit
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleSubmit = async () => {
        if (Object.keys(answers).length < quiz.questions.length) {
            alert('Bitte beantworte alle Fragen bevor du abgibst.');
            return;
        }
        setSubmitting(true);
        const attempt = await submitAttempt(answers);
        if (attempt) {
            setResult({ score: attempt.score, total: attempt.total });
        }
        setSubmitting(false);
    };

    const handleRetry = () => {
        setAnswers({});
        setResult(null);
        setShowReview(false);
    };

    const activeAnswers = showReview && lastAttempt ? lastAttempt.answers : answers;
    const isReviewMode = !!result || showReview;
    const scoreToShow = result || (lastAttempt ? { score: lastAttempt.score, total: lastAttempt.total } : null);

    return (
        <div className="animate-fade-in space-y-6">
            {/* Back Button */}
            <button
                onClick={() => navigateBackOr(navigate, `/student?module=${moduleId}`)}
                className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group text-sm font-sans"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Zurück</span>
            </button>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm font-sans text-vastu-text-light">
                <Link to="/student" className="hover:text-vastu-dark transition-colors flex items-center gap-1">
                    <Home size={14} /> Kurs
                </Link>
                <ChevronRight size={14} className="text-vastu-sand" />
                <Link to={`/student?module=${moduleId}`} className="hover:text-vastu-dark transition-colors">Modul</Link>
                <ChevronRight size={14} className="text-vastu-sand" />
                <span className="text-vastu-dark font-medium">Quiz</span>
            </nav>

            {/* Quiz Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden">
                {/* Header */}
                <div className="bg-vastu-accent grain-overlay p-6 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-vastu-dark opacity-5 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3" />
                    <div className="relative z-10">
                        <h1 className="text-2xl md:text-4xl font-serif mb-2 text-vastu-dark">{quiz.title}</h1>
                        {quiz.description && <p className="text-vastu-text font-body">{quiz.description}</p>}
                        <p className="text-sm font-sans text-vastu-text-light mt-2">{quiz.questions.length} Fragen</p>
                    </div>
                </div>

                {/* Score Banner */}
                {scoreToShow && (
                    <div className={`mx-6 md:mx-8 mt-6 p-5 rounded-xl border-2 flex items-center gap-4 ${
                        scoreToShow.score === scoreToShow.total
                            ? 'bg-green-50 border-green-200'
                            : scoreToShow.score >= scoreToShow.total * 0.7
                              ? 'bg-yellow-50 border-yellow-200'
                              : 'bg-red-50 border-red-200'
                    }`}>
                        <Trophy size={32} className={
                            scoreToShow.score === scoreToShow.total ? 'text-green-500' :
                            scoreToShow.score >= scoreToShow.total * 0.7 ? 'text-yellow-500' : 'text-red-400'
                        } />
                        <div>
                            <p className="font-serif text-lg text-vastu-dark">
                                {scoreToShow.score} von {scoreToShow.total} richtig
                            </p>
                            <p className="text-sm font-body text-vastu-text-light">
                                {scoreToShow.score === scoreToShow.total
                                    ? 'Perfekt! Alle Fragen richtig beantwortet!'
                                    : scoreToShow.score >= scoreToShow.total * 0.7
                                      ? 'Gut gemacht! Schau dir die falschen Antworten nochmal an.'
                                      : 'Wiederhole das Material und versuche es nochmal.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Past attempt notice */}
                {viewingPastAttempt && !showReview && (
                    <div className="mx-6 md:mx-8 mt-4 p-4 bg-vastu-cream rounded-xl border border-vastu-sand/30 flex items-center justify-between">
                        <p className="text-sm font-body text-vastu-text">Du hast dieses Quiz bereits abgeschlossen.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowReview(true)}
                                className="text-sm font-sans text-vastu-gold hover:text-vastu-dark underline"
                            >
                                Antworten ansehen
                            </button>
                            <button
                                onClick={handleRetry}
                                className="flex items-center gap-1 text-sm font-sans text-vastu-dark hover:text-vastu-gold"
                            >
                                <RotateCcw size={14} /> Nochmal
                            </button>
                        </div>
                    </div>
                )}

                {/* Questions */}
                <div className="p-6 md:p-8 space-y-8">
                    {quiz.questions.map((q, qIdx) => {
                        const selectedIdx = activeAnswers[q.id];
                        const hasAnswered = selectedIdx !== undefined;

                        return (
                            <div key={q.id} className="space-y-3">
                                <h3 className="font-serif text-base text-vastu-dark flex gap-2">
                                    <span className="text-vastu-gold font-bold">{qIdx + 1}.</span>
                                    {q.question}
                                </h3>
                                <div className="space-y-2 pl-6">
                                    {q.options.map((option, oIdx) => {
                                        // Skip empty options (teacher left placeholder blank)
                                        if (!option || option.trim() === '') return null;
                                        const isSelected = selectedIdx === oIdx;
                                        const isCorrect = q.correct_index === oIdx;

                                        let optionStyle = 'bg-white border-vastu-sand/50 hover:border-vastu-gold/50 hover:bg-vastu-cream/30';
                                        if (isReviewMode && hasAnswered) {
                                            if (isCorrect) {
                                                optionStyle = 'bg-green-50 border-green-300';
                                            } else if (isSelected && !isCorrect) {
                                                optionStyle = 'bg-red-50 border-red-300';
                                            } else {
                                                optionStyle = 'bg-white border-gray-200 opacity-60';
                                            }
                                        } else if (isSelected) {
                                            optionStyle = 'bg-vastu-cream border-vastu-gold ring-1 ring-vastu-gold/30';
                                        }

                                        return (
                                            <button
                                                key={oIdx}
                                                onClick={() => handleSelect(q.id, oIdx)}
                                                disabled={isReviewMode}
                                                className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${optionStyle} ${!isReviewMode ? 'cursor-pointer' : ''}`}
                                            >
                                                {isReviewMode && hasAnswered ? (
                                                    isCorrect ? <CheckCircle2 size={18} className="text-green-500 shrink-0" /> :
                                                    isSelected ? <XCircle size={18} className="text-red-400 shrink-0" /> :
                                                    <div className="w-[18px] h-[18px] rounded-full border-2 border-gray-300 shrink-0" />
                                                ) : (
                                                    <div className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-vastu-gold bg-vastu-gold' : 'border-vastu-sand'}`}>
                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                    </div>
                                                )}
                                                <span className="font-body text-sm text-vastu-dark">{option}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Actions */}
                <div className="px-6 md:px-8 pb-6 space-y-3">
                    {!isReviewMode && !viewingPastAttempt && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || Object.keys(answers).length < quiz.questions.length}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-sans font-medium bg-vastu-dark text-white hover:bg-vastu-dark-deep shadow-lg shadow-vastu-dark/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {submitting ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                            Quiz abgeben
                        </button>
                    )}
                    {(result || showReview) && (
                        <button
                            onClick={handleRetry}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-sans font-medium bg-vastu-cream text-vastu-dark hover:bg-vastu-sand/30 border border-vastu-sand/50 transition-all"
                        >
                            <RotateCcw size={20} />
                            Nochmal versuchen
                        </button>
                    )}
                </div>
            </div>

            {/* Back to module */}
            <button
                onClick={() => navigate(`/student?module=${moduleId}`)}
                className="w-full flex items-center justify-center gap-3 p-5 bg-vastu-cream text-vastu-dark rounded-2xl hover:bg-vastu-sand/30 border border-vastu-sand/50 transition-all"
            >
                <Home size={20} />
                <span className="font-serif text-lg">Zurück zum Modul</span>
            </button>
        </div>
    );
}
