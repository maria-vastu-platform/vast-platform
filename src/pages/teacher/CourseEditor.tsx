import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, ChevronDown, ChevronRight, FileText, Video, X, Save, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import FileUploader from '../../components/FileUploader';
import AddLinkModal from '../../components/AddLinkModal';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Material {
    id: string;
    title: string;
    type: 'video' | 'pdf' | 'doc' | 'link' | 'zip';
    url: string;
    week_id?: string;
    day_id?: string;
    is_homework?: boolean;
}

interface Lektion {
    id: string;
    title: string;
    order_index: number;
    description?: string;
    homework_description?: string;
    vimeo_url?: string;
    date?: string;
    materials?: Material[];
}

interface Modul {
    id: string;
    title: string;
    description: string;
    order_index: number;
    available_from?: string;
    days: Lektion[];
    materials?: Material[];
}

// --- Sub-components ---

const LektionEditor = ({ lektion, onDelete, onUpdate, onMoveUp, onMoveDown, isFirst, isLast }: {
    lektion: Lektion,
    onDelete: () => void,
    onUpdate: () => void,
    onMoveUp: () => void,
    onMoveDown: () => void,
    isFirst: boolean,
    isLast: boolean
}) => {
    const [local, setLocal] = useState(lektion);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    useEffect(() => {
        setLocal(lektion);
        setIsDirty(false);
    }, [lektion]);

    const handleChange = (field: keyof Lektion, value: any) => {
        setLocal(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('days')
                .update({
                    title: local.title,
                    description: local.description,
                    homework_description: local.homework_description,
                    vimeo_url: local.vimeo_url,
                    date: local.date
                })
                .eq('id', lektion.id);

            if (error) throw error;
            setIsDirty(false);
            onUpdate();
        } catch (error) {
            console.error('Error saving lektion:', error);
            alert('Fehler beim Speichern der Lektion');
        } finally {
            setSaving(false);
        }
    };

    const handleAddMaterial = async (url: string, type: string, name: string, isHomework = false) => {
        const { error } = await supabase.from('materials').insert([{
            title: name, type, url, day_id: lektion.id, is_homework: isHomework
        }]);
        if (!error) onUpdate();
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!window.confirm('Material löschen?')) return;
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (!error) onUpdate();
    };

    const lessonMaterials = lektion.materials?.filter(m => !m.is_homework) || [];
    const homeworkMaterials = lektion.materials?.filter(m => m.is_homework) || [];

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'clean']
        ],
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-vastu-accent/50 hover:shadow-md">
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1 mr-4 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Lektionstitel</label>
                            <input
                                type="text"
                                value={local.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="text-lg font-medium text-vastu-dark bg-transparent border-b border-gray-200 hover:border-vastu-accent focus:border-vastu-accent focus:outline-none w-full transition-colors py-1"
                            />
                        </div>
                        <div className="flex bg-gray-50 rounded-lg p-1">
                            <button onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-gray-400 hover:text-vastu-dark disabled:opacity-30">
                                <ArrowUp size={16} />
                            </button>
                            <button onClick={onMoveDown} disabled={isLast} className="p-1.5 text-gray-400 hover:text-vastu-dark disabled:opacity-30">
                                <ArrowDown size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Beschreibung</label>
                        <ReactQuill
                            theme="snow"
                            value={local.description || ''}
                            onChange={(value) => handleChange('description', value)}
                            modules={modules}
                            className="bg-white rounded-lg"
                        />
                    </div>

                    {/* Vimeo URL */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Vimeo-Video</label>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <Video size={16} className="text-blue-400" />
                            <input
                                type="text"
                                value={local.vimeo_url || ''}
                                onChange={(e) => handleChange('vimeo_url', e.target.value)}
                                className="flex-1 text-sm bg-transparent focus:outline-none"
                                placeholder="https://vimeo.com/123456789 oder https://player.vimeo.com/video/123456789"
                            />
                        </div>
                    </div>

                    {/* Homework Section */}
                    <div className="border-t border-gray-100 pt-6">
                        <label className="block text-xs font-bold text-vastu-accent uppercase tracking-wider mb-4 flex items-center gap-2">
                            <FileText size={16} /> Hausaufgabe
                        </label>
                        <div className="space-y-4">
                            <ReactQuill
                                theme="snow"
                                value={local.homework_description || ''}
                                onChange={(value) => handleChange('homework_description', value)}
                                modules={modules}
                                placeholder="Beschreibe die Hausaufgabe..."
                                className="bg-white rounded-lg"
                            />
                            <div>
                                <div className="space-y-2 mb-3">
                                    {homeworkMaterials.map(m => (
                                        <div key={m.id} className="flex items-center justify-between bg-orange-50 p-2 rounded border border-orange-100 text-sm">
                                            <span className="truncate flex-1 font-medium text-orange-800">{m.title}</span>
                                            <button onClick={() => handleDeleteMaterial(m.id)} className="text-orange-400 hover:text-red-500"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                                <FileUploader
                                    folder={`homework/${lektion.id}`}
                                    onUploadComplete={(url, type, name) => handleAddMaterial(url, type, name, true)}
                                    label="Datei anhängen"
                                    compact
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="flex flex-col gap-2 sticky top-4">
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                        className={`p-2 rounded-lg transition-colors ${isDirty ? 'bg-vastu-accent text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-400'}`}
                        title="Speichern"
                    >
                        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    </button>
                    <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="Lektion löschen">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            {/* Lesson Materials */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Materialien zur Lektion</h5>
                <div className="space-y-2 mb-3">
                    {lessonMaterials.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                            <span className="truncate flex-1">{m.title}</span>
                            <button onClick={() => handleDeleteMaterial(m.id)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <FileUploader
                        folder={`days/${lektion.id}`}
                        onUploadComplete={(url, type, name) => handleAddMaterial(url, type, name, false)}
                        compact
                    />
                    <button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-vastu-accent hover:text-vastu-accent"
                    >
                        + Link
                    </button>
                </div>
            </div>

            <AddLinkModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onAdd={(url, formattedTitle) => handleAddMaterial(url, 'link', formattedTitle, false)}
            />
        </div>
    );
};

const ModulEditor = ({ modul, onDelete, onUpdate, onAddLektion, onMoveUp, onMoveDown, isFirst, isLast }: {
    modul: Modul,
    onDelete: () => void,
    onUpdate: () => void,
    onAddLektion: () => void,
    onMoveUp: () => void,
    onMoveDown: () => void,
    isFirst: boolean,
    isLast: boolean
}) => {
    const [expanded, setExpanded] = useState(false);
    const [localModul, setLocalModul] = useState(modul);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    useEffect(() => {
        setLocalModul(modul);
        setIsDirty(false);
    }, [modul]);

    const handleChange = (field: keyof Modul, value: any) => {
        setLocalModul(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('weeks')
                .update({
                    title: localModul.title,
                    available_from: localModul.available_from
                })
                .eq('id', modul.id);

            if (error) throw error;
            setIsDirty(false);
            onUpdate();
        } catch (error) {
            console.error('Error saving modul:', error);
            alert('Fehler beim Speichern des Moduls');
        } finally {
            setSaving(false);
        }
    };

    const handleAddMaterial = async (url: string, type: string, name: string) => {
        const { error } = await supabase.from('materials').insert([{
            title: name, type, url, week_id: modul.id
        }]);
        if (!error) onUpdate();
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!window.confirm('Material löschen?')) return;
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (!error) onUpdate();
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Module Header */}
            <div className="p-4 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => setExpanded(!expanded)} className="p-1 -ml-1">
                        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    <div className="flex items-center justify-between flex-1">
                        <input
                            value={localModul.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="text-xl font-bold text-vastu-dark bg-transparent border-b border-transparent hover:border-gray-300 focus:border-vastu-dark focus:outline-none px-1 py-0.5 w-full mr-4"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddLektion(); }}
                            className="flex items-center text-sm text-vastu-dark hover:text-vastu-dark/70 whitespace-nowrap mr-4"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Lektion
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onMoveUp} disabled={isFirst} className="p-2 text-gray-400 hover:text-vastu-dark disabled:opacity-30">↑</button>
                    <button onClick={onMoveDown} disabled={isLast} className="p-2 text-gray-400 hover:text-vastu-dark disabled:opacity-30">↓</button>
                    <input
                        type="date"
                        className="text-sm border rounded px-2 py-1 bg-white"
                        value={localModul.available_from ? new Date(localModul.available_from).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value).toISOString() : null;
                            handleChange('available_from', date);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                        className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isDirty ? 'bg-vastu-accent text-white hover:bg-vastu-accent/90' : 'bg-gray-100 text-gray-400'}`}
                        title="Änderungen speichern"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    </button>
                    <button onClick={onDelete} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
            </div>

            {/* Module Content */}
            {expanded && (
                <div className="p-4 space-y-6">
                    {/* Module Materials */}
                    <div className="bg-vastu-accent/10 p-4 rounded-lg border border-vastu-accent/20">
                        <h4 className="text-sm font-bold text-vastu-dark mb-3 uppercase tracking-wider">Modul-Materialien (Allgemein)</h4>
                        <div className="space-y-2 mb-3">
                            {modul.materials?.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 text-sm">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {m.type === 'video' ? <Video size={14} className="text-blue-500" /> : <FileText size={14} className="text-orange-500" />}
                                        <input
                                            defaultValue={m.title}
                                            className="truncate bg-transparent border-b border-transparent hover:border-gray-300 focus:border-vastu-accent focus:outline-none px-1 w-full"
                                            onBlur={(e) => {
                                                if (e.target.value !== m.title) {
                                                    supabase.from('materials').update({ title: e.target.value }).eq('id', m.id).then(() => onUpdate());
                                                }
                                            }}
                                        />
                                    </div>
                                    <button onClick={() => handleDeleteMaterial(m.id)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <FileUploader
                            folder={`weeks/${modul.id}`}
                            onUploadComplete={(url, type, name) => handleAddMaterial(url, type, name)}
                        />
                        <button
                            onClick={() => setIsLinkModalOpen(true)}
                            className="w-full mt-2 py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:text-vastu-dark hover:border-vastu-accent hover:bg-vastu-accent/5 transition-all font-medium text-sm"
                        >
                            <Plus size={16} /> Link hinzufügen
                        </button>
                    </div>

                    <AddLinkModal
                        isOpen={isLinkModalOpen}
                        onClose={() => setIsLinkModalOpen(false)}
                        onAdd={(url, formattedTitle) => handleAddMaterial(url, 'link', formattedTitle)}
                        title="Link zum Modul hinzufügen"
                    />

                    {/* Lektionen */}
                    <div className="mt-8">
                        <h4 className="text-sm font-bold text-vastu-dark mb-4 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-vastu-dark"></span>
                            Lektionen des Moduls
                        </h4>

                        <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                            {modul.days.length === 0 && (
                                <div className="text-sm text-gray-400 italic mb-4">
                                    Dieses Modul hat noch keine Lektionen. Füge die erste hinzu.
                                </div>
                            )}

                            {modul.days
                                .sort((a, b) => a.order_index - b.order_index)
                                .map((lektion, index) => (
                                    <LektionEditor
                                        key={lektion.id}
                                        lektion={lektion}
                                        onDelete={() => {
                                            if (window.confirm('Lektion löschen?')) {
                                                supabase.from('days').delete().eq('id', lektion.id).then(() => onUpdate());
                                            }
                                        }}
                                        onUpdate={onUpdate}
                                        isFirst={index === 0}
                                        isLast={index === modul.days.length - 1}
                                        onMoveUp={async () => {
                                            if (index > 0) {
                                                const days = modul.days.sort((a, b) => a.order_index - b.order_index);
                                                const prev = days[index - 1];
                                                const curr = days[index];
                                                await supabase.from('days').update({ order_index: prev.order_index }).eq('id', curr.id);
                                                await supabase.from('days').update({ order_index: curr.order_index }).eq('id', prev.id);
                                                onUpdate();
                                            }
                                        }}
                                        onMoveDown={async () => {
                                            if (index < modul.days.length - 1) {
                                                const days = modul.days.sort((a, b) => a.order_index - b.order_index);
                                                const next = days[index + 1];
                                                const curr = days[index];
                                                await supabase.from('days').update({ order_index: next.order_index }).eq('id', curr.id);
                                                await supabase.from('days').update({ order_index: curr.order_index }).eq('id', next.id);
                                                onUpdate();
                                            }
                                        }}
                                    />
                                ))}

                            <button
                                onClick={onAddLektion}
                                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:text-vastu-dark hover:border-vastu-accent hover:bg-vastu-accent/5 transition-all font-medium"
                            >
                                <Plus size={20} />
                                Neue Lektion hinzufügen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CourseEditor() {
    const [modules, setModules] = useState<Modul[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchModules() {
        try {
            if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                setModules([
                    {
                        id: 'pre', title: 'Sanfter Start', description: 'Einstieg in die Vastulogie', order_index: 0, available_from: '2026-02-07',
                        days: [
                            { id: 'pre-1', title: 'Willkommen & Einführung', description: 'Überblick über die Ausbildung', vimeo_url: '', date: '', order_index: 0, homework_description: '', materials: [] },
                            { id: 'pre-2', title: 'Vastu auf Social Media', description: 'Sichtbarkeit aufbauen', vimeo_url: '', date: '', order_index: 1, homework_description: '', materials: [] },
                        ],
                        materials: []
                    },
                    {
                        id: 'm1', title: 'Modul 1', description: 'Vastu Karte, Elemente, Reinigung & Energien', order_index: 1, available_from: '2026-03-20',
                        days: [
                            { id: 'm1-1', title: '1.1 Vastu Karte & Elemente', description: '', vimeo_url: '', date: '', order_index: 0, homework_description: 'Erstelle deine eigene Vastu-Karte', materials: [] },
                            { id: 'm1-2', title: '1.2 Energetische Reinigung', description: '', vimeo_url: '', date: '', order_index: 1, homework_description: '', materials: [] },
                            { id: 'm1-3', title: '1.3 Experimente mit den Elementen', description: '', vimeo_url: '', date: '', order_index: 2, homework_description: '', materials: [] },
                            { id: 'm1-4', title: '1.4 Innere & Äußere Energien', description: '', vimeo_url: '', date: '', order_index: 3, homework_description: '', materials: [] },
                        ],
                        materials: []
                    },
                    {
                        id: 'm2', title: 'Modul 2', description: 'Planeten, Charaktere, Sektoren, Yantren', order_index: 2, available_from: '2026-03-25',
                        days: [
                            { id: 'm2-1', title: '2.1 Planeten & Sektoren', description: '', vimeo_url: '', date: '', order_index: 0, homework_description: '', materials: [] },
                        ],
                        materials: []
                    },
                ]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('weeks')
                .select(`*, days (*, materials (*)), materials (*)`)
                .order('order_index', { ascending: true });

            if (error) throw error;

            if (data) {
                const sorted: Modul[] = data.map((w: any) => ({
                    id: w.id,
                    title: w.title,
                    description: w.description,
                    order_index: w.order_index,
                    available_from: w.available_from,
                    days: w.days.sort((a: any, b: any) => a.order_index - b.order_index).map((d: any) => ({
                        id: d.id,
                        title: d.title,
                        description: d.description,
                        vimeo_url: d.vimeo_url,
                        date: d.date,
                        order_index: d.order_index,
                        homework_description: d.homework_description,
                        materials: d.materials || []
                    })),
                    materials: w.materials || []
                }));
                setModules(sorted);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchModules(); }, []);

    const handleAddModul = async () => {
        const title = window.prompt('Modulname:');
        if (!title) return;
        const { error } = await supabase.from('weeks').insert([{ title, order_index: modules.length + 1 }]);
        if (!error) fetchModules();
    };

    const handleDeleteModul = async (id: string) => {
        if (!window.confirm('Modul löschen?')) return;
        const { error } = await supabase.from('weeks').delete().eq('id', id);
        if (!error) fetchModules();
    };

    const handleAddLektion = async (modulId: string) => {
        const title = window.prompt('Lektionsname:');
        if (!title) return;
        const { error } = await supabase.from('days').insert([{ week_id: modulId, title, order_index: 99 }]);
        if (error) {
            alert('Fehler beim Erstellen der Lektion: ' + error.message);
        } else {
            fetchModules();
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-serif text-vastu-dark">Kurs-Editor</h1>
                <button onClick={handleAddModul} className="flex items-center gap-2 bg-vastu-dark text-white px-4 py-2 rounded-lg hover:bg-vastu-dark/90">
                    <Plus size={18} /> Modul hinzufügen
                </button>
            </div>

            <div className="space-y-4">
                {modules.map((modul, index) => (
                    <ModulEditor
                        key={modul.id}
                        modul={modul}
                        onDelete={() => handleDeleteModul(modul.id)}
                        onUpdate={fetchModules}
                        onAddLektion={() => handleAddLektion(modul.id)}
                        onMoveUp={async () => {
                            if (index > 0) {
                                const prev = modules[index - 1];
                                const curr = modules[index];
                                await supabase.from('weeks').update({ order_index: prev.order_index }).eq('id', curr.id);
                                await supabase.from('weeks').update({ order_index: curr.order_index }).eq('id', prev.id);
                                fetchModules();
                            }
                        }}
                        onMoveDown={async () => {
                            if (index < modules.length - 1) {
                                const next = modules[index + 1];
                                const curr = modules[index];
                                await supabase.from('weeks').update({ order_index: next.order_index }).eq('id', curr.id);
                                await supabase.from('weeks').update({ order_index: curr.order_index }).eq('id', next.id);
                                fetchModules();
                            }
                        }}
                        isFirst={index === 0}
                        isLast={index === modules.length - 1}
                    />
                ))}
            </div>
        </div>
    );
}
