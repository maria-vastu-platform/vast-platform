export type UserRole = 'student' | 'teacher';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

export type MaterialType = 'video' | 'pdf' | 'pptx' | 'doc' | 'link' | 'zip';

export interface Material {
    id: string;
    title: string;
    type: MaterialType;
    url: string;
    description?: string;
    isHomework?: boolean;
}

export interface Lektion {
    id: string;
    title: string;
    description?: string;
    materials: Material[];
    vimeoUrl?: string;
    date?: string;
    isCompleted?: boolean;
    homeworkDescription?: string;
}

export interface Module {
    id: string;
    title: string;
    description?: string;
    lektionen: Lektion[];
    moduleMaterials: Material[];
    isLocked: boolean;
    availableFrom?: string;
}

export interface Course {
    id: string;
    title: string;
    modules: Module[];
}

export interface LiveStream {
    id: string;
    title: string;
    date: string;
    video_url?: string;
    vimeo_url?: string;
    rutube_url?: string;
    audio_url?: string;
    description?: string;
    created_at?: string;
}

export interface StreamComment {
    id: string;
    stream_id: string;
    user_id: string;
    userName?: string;
    userAvatar?: string;
    content: string;
    created_at: string;
}

export type LibraryCategory = 'slides' | 'bonus' | 'guide' | 'template' | 'links';

export interface LibraryItem {
    id: string;
    title: string;
    category: LibraryCategory;
    file_url: string;
    description?: string;
    created_at: string;
    file_type?: string;
    is_master_file?: boolean;
}

export interface Review {
    id: string;
    user_id: string;
    review_url: string;
    created_at: string;
}

export interface Kohorte {
    id: string;
    name: string;
    startDate: string;
    description?: string;
    color?: string;
    created_at?: string;
}
