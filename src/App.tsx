import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { CourseProvider } from './contexts/CourseContext';

// Eager: LoginPage is the very first route a fresh visitor lands on, so
// lazy would add a needless Suspense round-trip on the critical path.
import LoginPage from './pages/LoginPage';

// Route-level code splitting for every other page: each is its own chunk
// and only downloads when navigated to. The login screen no longer ships
// the entire teacher + student app.
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage'));

const StudentLayout = lazy(() => import('./components/layout/StudentLayout'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const WelcomePage = lazy(() => import('./pages/student/WelcomePage'));
const LektionView = lazy(() => import('./pages/student/LektionView'));
const QuizView = lazy(() => import('./pages/student/QuizView'));
const Library = lazy(() => import('./pages/student/Library'));
const Profile = lazy(() => import('./pages/student/Profile'));
const InstallGuide = lazy(() => import('./pages/student/InstallGuide'));
const FeedbackPage = lazy(() => import('./pages/student/Feedback'));

const TeacherLayout = lazy(() => import('./components/layout/TeacherLayout'));
const CourseEditor = lazy(() => import('./pages/teacher/CourseEditor'));
const Students = lazy(() => import('./pages/teacher/Students'));
const ManageLibrary = lazy(() => import('./pages/teacher/ManageLibrary'));
const ManageKohorten = lazy(() => import('./pages/teacher/ManageKohorten'));
const WelcomeEditor = lazy(() => import('./pages/teacher/WelcomeEditor'));
const SettingsPage = lazy(() => import('./pages/teacher/SettingsPage'));
const QuizResults = lazy(() => import('./pages/teacher/QuizResults'));
const TeacherFeedback = lazy(() => import('./pages/teacher/Feedback'));

function RouteFallback() {
    return (
        <div className="min-h-screen bg-vastu-dark-deep flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-vastu-gold/30 border-t-vastu-gold animate-spin" />
        </div>
    );
}

function App() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-vastu-light p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm max-w-lg w-full border border-gray-100 text-center">
                    <h1 className="text-2xl font-serif text-vastu-dark mb-4">Konfigurationsfehler</h1>
                    <p className="text-vastu-text-light mb-4">
                        Die Anwendung benötigt Umgebungsvariablen.
                    </p>
                    <div className="bg-vastu-light p-4 rounded-xl text-left text-sm font-mono text-vastu-text-light mb-6">
                        <p>Bitte setze folgende Variablen:</p>
                        <ul className="list-disc list-inside mt-2">
                            {!supabaseUrl && <li>VITE_SUPABASE_URL</li>}
                            {!supabaseKey && <li>VITE_SUPABASE_ANON_KEY</li>}
                        </ul>
                    </div>
                    <p className="text-sm text-vastu-text-light">
                        Überprüfe deine <code>.env</code> Datei oder das Deployment Dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AuthProvider>
            <CourseProvider>
            <Router>
                <Suspense fallback={<RouteFallback />}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/update-password" element={<UpdatePasswordPage />} />

                    {/* Welcome — full-screen landing (no sidebar) */}
                    <Route path="/student/welcome" element={<WelcomePage />} />

                    {/* Student Routes — with sidebar */}
                    <Route path="/student" element={<StudentLayout />}>
                        <Route index element={<StudentDashboard />} />
                        <Route path="module/:moduleId/lektion/:lektionId" element={<LektionView />} />
                        <Route path="module/:moduleId/quiz/:quizId" element={<QuizView />} />
                        <Route path="library" element={<Library />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="install" element={<InstallGuide />} />
                        <Route path="feedback" element={<FeedbackPage />} />
                    </Route>

                    {/* Teacher Routes */}
                    <Route path="/teacher" element={<TeacherLayout />}>
                        <Route index element={<CourseEditor />} />
                        <Route path="course-editor" element={<CourseEditor />} />
                        <Route path="students" element={<Students />} />
                        <Route path="library" element={<ManageLibrary />} />
                        <Route path="kohorten" element={<ManageKohorten />} />
                        <Route path="welcome-seite" element={<WelcomeEditor />} />
                        <Route path="quiz-results" element={<QuizResults />} />
                        <Route path="feedback" element={<TeacherFeedback />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
                </Suspense>
            </Router>
            </CourseProvider>
        </AuthProvider>
    );
}

export default App;
