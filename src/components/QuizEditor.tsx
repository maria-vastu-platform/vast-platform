import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react';
import { QuizType } from '../lib/types';

interface QuizQuestion {
    id?: string;
    question: string;
    options: string[];
    correct_index: number;
    order_index: number;
}

interface QuizBlock {
    quizId: string | null;
    title: string;
    description: string;
    quizType: QuizType;
    questions: QuizQuestion[];
    isDirty: boolean;
    saving: boolean;
}

interface QuizEditorProps {
    moduleId: string;
}

export default function QuizEditor({ moduleId }: QuizEditorProps) {
    const [blocks, setBlocks] = useState<QuizBlock[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuizzes();
    }, [moduleId]);

    const fetchQuizzes = async () => {
        try {
            const { data: quizzes } = await supabase
                .from('quizzes')
                .select('*')
                .eq('week_id', moduleId)
                .order('created_at', { ascending: true });

            if (!quizzes || quizzes.length === 0) {
                setBlocks([]);
                setLoading(false);
                return;
            }

            const quizIds = quizzes.map(q => q.id);
            const { data: allQuestions } = await supabase
                .from('quiz_questions')
                .select('*')
                .in('quiz_id', quizIds)
                .order('order_index', { ascending: true });

            const questionsByQuiz: Record<string, QuizQuestion[]> = {};
            (allQuestions || []).forEach((q: any) => {
                if (!questionsByQuiz[q.quiz_id]) questionsByQuiz[q.quiz_id] = [];
                questionsByQuiz[q.quiz_id].push({
                    id: q.id,
                    question: q.question,
                    options: q.options,
                    correct_index: q.correct_index,
                    order_index: q.order_index,
                });
            });

            setBlocks(quizzes.map(q => ({
                quizId: q.id,
                title: q.title,
                description: q.description || '',
                quizType: q.quiz_type || 'quiz',
                questions: questionsByQuiz[q.id] || [],
                isDirty: false,
                saving: false,
            })));
        } catch {
            // No quizzes yet
        } finally {
            setLoading(false);
        }
    };

    const updateBlock = (idx: number, updates: Partial<QuizBlock>) => {
        setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...updates, isDirty: true } : b));
    };

    const handleSave = async (idx: number) => {
        const block = blocks[idx];
        setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, saving: true } : b));

        try {
            let currentQuizId = block.quizId;

            if (!currentQuizId) {
                const { data, error } = await supabase
                    .from('quizzes')
                    .insert({ week_id: moduleId, title: block.title, description: block.description || null, quiz_type: block.quizType })
                    .select()
                    .single();
                if (error) throw error;
                currentQuizId = data.id;
            } else {
                const { error } = await supabase
                    .from('quizzes')
                    .update({ title: block.title, description: block.description || null, quiz_type: block.quizType })
                    .eq('id', currentQuizId)
                    .select();
                if (error) throw error;
            }

            await supabase.from('quiz_questions').delete().eq('quiz_id', currentQuizId);

            if (block.questions.length > 0) {
                const toInsert = block.questions.map((q, i) => ({
                    quiz_id: currentQuizId,
                    question: q.question,
                    options: q.options,
                    correct_index: q.correct_index,
                    order_index: i,
                }));
                const { error } = await supabase.from('quiz_questions').insert(toInsert);
                if (error) throw error;
            }

            // Refetch to get new IDs
            await fetchQuizzes();
        } catch (error: any) {
            console.error('Error saving quiz:', error);
            alert('Fehler beim Speichern: ' + (error?.message || 'Unbekannter Fehler'));
            setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, saving: false } : b));
        }
    };

    const handleDelete = async (idx: number) => {
        const block = blocks[idx];
        if (block.quizId) {
            if (!window.confirm('Quiz komplett löschen?')) return;
            await supabase.from('quizzes').delete().eq('id', block.quizId);
        }
        setBlocks(prev => prev.filter((_, i) => i !== idx));
    };

    const addNewQuiz = (type: QuizType) => {
        setBlocks(prev => [...prev, {
            quizId: null,
            title: type === 'reflection' ? 'Reflexion' : 'Quiz',
            description: '',
            quizType: type,
            questions: [],
            isDirty: true,
            saving: false,
        }]);
    };

    const addQuestion = (blockIdx: number) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIdx) return b;
            return {
                ...b,
                isDirty: true,
                questions: [...b.questions, { question: '', options: ['', '', '', ''], correct_index: 0, order_index: b.questions.length }],
            };
        }));
    };

    const removeQuestion = (blockIdx: number, qIdx: number) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIdx) return b;
            return { ...b, isDirty: true, questions: b.questions.filter((_, j) => j !== qIdx) };
        }));
    };

    const updateQuestion = (blockIdx: number, qIdx: number, field: string, value: any) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIdx) return b;
            return {
                ...b,
                isDirty: true,
                questions: b.questions.map((q, j) => j === qIdx ? { ...q, [field]: value } : q),
            };
        }));
    };

    const updateOption = (blockIdx: number, qIdx: number, oIdx: number, value: string) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIdx) return b;
            return {
                ...b,
                isDirty: true,
                questions: b.questions.map((q, j) => {
                    if (j !== qIdx) return q;
                    const newOptions = [...q.options];
                    newOptions[oIdx] = value;
                    return { ...q, options: newOptions };
                }),
            };
        }));
    };

    const addOption = (blockIdx: number, qIdx: number) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIdx) return b;
            return {
                ...b,
                isDirty: true,
                questions: b.questions.map((q, j) => j !== qIdx ? q : { ...q, options: [...q.options, ''] }),
            };
        }));
    };

    const removeOption = (blockIdx: number, qIdx: number, oIdx: number) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== blockIdx) return b;
            return {
                ...b,
                isDirty: true,
                questions: b.questions.map((q, j) => {
                    if (j !== qIdx) return q;
                    const newOptions = q.options.filter((_, k) => k !== oIdx);
                    const newCorrect = q.correct_index >= oIdx && q.correct_index > 0
                        ? q.correct_index - 1
                        : q.correct_index;
                    return { ...q, options: newOptions, correct_index: Math.min(newCorrect, newOptions.length - 1) };
                }),
            };
        }));
    };

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" size={20} /></div>;
    }

    return (
        <div className="space-y-6">
            {blocks.map((block, blockIdx) => (
                <div key={block.quizId || `new-${blockIdx}`} className={`p-4 rounded-lg border ${block.quizType === 'reflection' ? 'bg-purple-50/50 border-purple-200/50' : 'bg-blue-50/50 border-blue-200/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-sm font-bold uppercase tracking-wider ${block.quizType === 'reflection' ? 'text-purple-700' : 'text-blue-700'}`}>
                            {block.quizType === 'reflection' ? 'Reflexion' : 'Quiz'}
                        </h4>
                        <div className="flex gap-2">
                            <button onClick={() => handleDelete(blockIdx)} className="text-xs text-red-400 hover:text-red-600">
                                Löschen
                            </button>
                            <button
                                onClick={() => handleSave(blockIdx)}
                                disabled={!block.isDirty || block.saving}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${block.isDirty ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-400'}`}
                            >
                                {block.saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                Speichern
                            </button>
                        </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-2 mb-4">
                        <input
                            type="text"
                            value={block.title}
                            onChange={(e) => updateBlock(blockIdx, { title: e.target.value })}
                            className="w-full text-sm font-medium bg-white border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                            placeholder={block.quizType === 'reflection' ? 'Reflexion-Titel' : 'Quiz-Titel'}
                        />
                        <input
                            type="text"
                            value={block.description}
                            onChange={(e) => updateBlock(blockIdx, { description: e.target.value })}
                            className="w-full text-sm bg-white border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                            placeholder="Beschreibung (optional)"
                        />
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        {block.questions.map((q, qIdx) => (
                            <div key={qIdx} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-start gap-2 mb-3">
                                    <GripVertical size={16} className="text-gray-300 mt-2 shrink-0" />
                                    <span className="text-sm font-bold text-purple-600 mt-2 shrink-0">{qIdx + 1}.</span>
                                    <input
                                        type="text"
                                        value={q.question}
                                        onChange={(e) => updateQuestion(blockIdx, qIdx, 'question', e.target.value)}
                                        className="flex-1 text-sm bg-transparent border-b border-gray-200 focus:border-purple-400 focus:outline-none py-1"
                                        placeholder="Frage eingeben..."
                                    />
                                    <button onClick={() => removeQuestion(blockIdx, qIdx)} className="text-gray-400 hover:text-red-500 shrink-0">
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="space-y-2 pl-8">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-2">
                                            {block.quizType === 'quiz' ? (
                                                <button
                                                    onClick={() => updateQuestion(blockIdx, qIdx, 'correct_index', oIdx)}
                                                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${q.correct_index === oIdx ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}
                                                    title="Als richtige Antwort markieren"
                                                >
                                                    {q.correct_index === oIdx && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </button>
                                            ) : (
                                                <div className="w-5 h-5 rounded-full border-2 border-purple-300 shrink-0" />
                                            )}
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => updateOption(blockIdx, qIdx, oIdx, e.target.value)}
                                                className={`flex-1 text-sm bg-transparent border-b focus:outline-none py-1 ${q.correct_index === oIdx && block.quizType === 'quiz' ? 'border-green-300 focus:border-green-500' : 'border-gray-200 focus:border-purple-400'}`}
                                                placeholder={`Antwort ${oIdx + 1}`}
                                            />
                                            {q.options.length > 2 && (
                                                <button onClick={() => removeOption(blockIdx, qIdx, oIdx)} className="text-gray-300 hover:text-red-400">
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addOption(blockIdx, qIdx)}
                                        className="text-xs text-gray-400 hover:text-purple-600 ml-7"
                                    >
                                        + Antwort hinzufügen
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => addQuestion(blockIdx)}
                        className="w-full mt-4 py-3 border-2 border-dashed border-purple-200 rounded-xl flex items-center justify-center gap-2 text-purple-400 hover:text-purple-600 hover:border-purple-400 transition-all font-medium text-sm"
                    >
                        <Plus size={16} /> Frage hinzufügen
                    </button>
                </div>
            ))}

            {/* Add New Quiz / Reflection Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => addNewQuiz('quiz')}
                    className="flex-1 py-3 border-2 border-dashed border-blue-200 rounded-xl flex items-center justify-center gap-2 text-blue-400 hover:text-blue-600 hover:border-blue-400 transition-all font-medium text-sm"
                >
                    <Plus size={16} /> Quiz hinzufügen
                </button>
                <button
                    onClick={() => addNewQuiz('reflection')}
                    className="flex-1 py-3 border-2 border-dashed border-purple-200 rounded-xl flex items-center justify-center gap-2 text-purple-400 hover:text-purple-600 hover:border-purple-400 transition-all font-medium text-sm"
                >
                    <Plus size={16} /> Reflexion hinzufügen
                </button>
            </div>
        </div>
    );
}
