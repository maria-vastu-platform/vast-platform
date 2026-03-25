import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Quiz, QuizAttempt } from '../lib/types';

/** Fetch a single quiz by its ID (for QuizView) */
export function useQuiz(quizId: string | undefined) {
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

    useEffect(() => {
        setQuiz(null);
        setLastAttempt(null);

        if (!quizId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        async function fetchQuiz() {
            try {
                const { data: quizData, error: quizError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('id', quizId)
                    .single();

                if (quizError || !quizData) {
                    setQuiz(null);
                    setLoading(false);
                    return;
                }

                const { data: questions } = await supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('quiz_id', quizData.id)
                    .order('order_index', { ascending: true });

                setQuiz({
                    id: quizData.id,
                    week_id: quizData.week_id,
                    title: quizData.title,
                    description: quizData.description,
                    quiz_type: quizData.quiz_type || 'quiz',
                    questions: (questions || []).map((q: any) => ({
                        id: q.id,
                        quiz_id: q.quiz_id,
                        question: q.question,
                        options: q.options,
                        correct_index: q.correct_index,
                        order_index: q.order_index,
                    })),
                });

                // Fetch latest attempt
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: attempt } = await supabase
                        .from('quiz_attempts')
                        .select('*')
                        .eq('quiz_id', quizData.id)
                        .eq('user_id', user.id)
                        .order('completed_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (attempt) {
                        setLastAttempt({
                            id: attempt.id,
                            user_id: attempt.user_id,
                            quiz_id: attempt.quiz_id,
                            answers: attempt.answers,
                            score: attempt.score,
                            total: attempt.total,
                            completed_at: attempt.completed_at,
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching quiz:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchQuiz();
    }, [quizId]);

    const submitAttempt = async (answers: Record<string, number>, questionsForScoring?: { id: string; correct_index: number }[]): Promise<QuizAttempt | null> => {
        if (!quiz) return null;

        const scoreQuestions = questionsForScoring || quiz.questions;
        let score = 0;
        for (const q of scoreQuestions) {
            if (answers[q.id] === q.correct_index) score++;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const attempt = {
                user_id: user.id,
                quiz_id: quiz.id,
                answers,
                score,
                total: quiz.questions.length,
            };

            const { data, error } = await supabase
                .from('quiz_attempts')
                .insert(attempt)
                .select()
                .single();

            if (error) throw error;

            const result: QuizAttempt = {
                id: data.id,
                user_id: data.user_id,
                quiz_id: data.quiz_id,
                answers: data.answers,
                score: data.score,
                total: data.total,
                completed_at: data.completed_at,
            };

            setLastAttempt(result);
            return result;
        } catch (err) {
            console.error('Error submitting quiz:', err);
            return null;
        }
    };

    return { quiz, loading, lastAttempt, submitAttempt };
}

/** Lightweight: fetch all quizzes for a module (for Dashboard quiz buttons) */
export interface QuizSummary {
    id: string;
    title: string;
    quiz_type: 'quiz' | 'reflection';
    questionCount: number;
    lastAttempt: { score: number; total: number } | null;
}

export function useModuleQuizzes(moduleId: string | undefined) {
    const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setQuizzes([]);
        if (!moduleId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        async function fetch() {
            try {
                const { data: quizData } = await supabase
                    .from('quizzes')
                    .select('id, title, quiz_type')
                    .eq('week_id', moduleId)
                    .order('created_at', { ascending: true });

                if (!quizData || quizData.length === 0) {
                    setLoading(false);
                    return;
                }

                const quizIds = quizData.map(q => q.id);

                // Count questions per quiz
                const { data: questions } = await supabase
                    .from('quiz_questions')
                    .select('quiz_id')
                    .in('quiz_id', quizIds);

                const countByQuiz: Record<string, number> = {};
                (questions || []).forEach((q: any) => {
                    countByQuiz[q.quiz_id] = (countByQuiz[q.quiz_id] || 0) + 1;
                });

                // Fetch latest attempts for current user
                const { data: { user } } = await supabase.auth.getUser();
                const attemptsByQuiz: Record<string, { score: number; total: number }> = {};
                if (user) {
                    const { data: attempts } = await supabase
                        .from('quiz_attempts')
                        .select('quiz_id, score, total, completed_at')
                        .eq('user_id', user.id)
                        .in('quiz_id', quizIds)
                        .order('completed_at', { ascending: false });

                    (attempts || []).forEach((a: any) => {
                        if (!attemptsByQuiz[a.quiz_id]) {
                            attemptsByQuiz[a.quiz_id] = { score: a.score, total: a.total };
                        }
                    });
                }

                setQuizzes(quizData.map(q => ({
                    id: q.id,
                    title: q.title,
                    quiz_type: q.quiz_type || 'quiz',
                    questionCount: countByQuiz[q.id] || 0,
                    lastAttempt: attemptsByQuiz[q.id] || null,
                })));
            } catch (err) {
                console.error('Error fetching module quizzes:', err);
            } finally {
                setLoading(false);
            }
        }

        fetch();
    }, [moduleId]);

    return { quizzes, loading };
}
