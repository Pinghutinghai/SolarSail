'use client';

import React, { useState, useRef } from 'react';

interface CapsuleCreatorProps {
    userId: number;
    latitude: number;
    longitude: number;
    onCapsuleCreated: () => void;
    onCancel: () => void;
}

export default function CapsuleCreator({ userId, latitude, longitude, onCapsuleCreated, onCancel }: CapsuleCreatorProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState('');

    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Image must be smaller than 2MB');
                return;
            }
            setImageFile(file);
        }
    };

    const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('audio/')) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Audio must be smaller than 5MB');
                return;
            }
            setAudioFile(file);
        }
    };

    const uploadFile = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                return data.url;
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        setUploadProgress('Preparing...');

        try {
            let imageUrl = null;
            let audioUrl = null;

            // Upload image if exists
            if (imageFile) {
                imageUrl = await uploadFile(imageFile);
            }

            // Upload audio if exists
            if (audioFile) {
                setUploadProgress('Uploading audio...');
                audioUrl = await uploadFile(audioFile);
            }

            setUploadProgress('Launching...');

            // Simulate launch delay for animation
            setTimeout(async () => {
                try {
                    const res = await fetch('/api/capsules', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId,
                            content,
                            latitude,
                            longitude,
                            imageUrl,
                            audioUrl,
                        }),
                    });

                    if (res.ok) {
                        onCapsuleCreated();
                    } else {
                        console.error('Failed to create capsule');
                        alert('Failed to create capsule');
                        setIsSubmitting(false);
                    }
                } catch (error) {
                    console.error('Error creating capsule:', error);
                    alert('Error creating capsule');
                    setIsSubmitting(false);
                }
            }, 800); // Wait for animation

        } catch (error) {
            console.error('Error preparing upload:', error);
            setIsSubmitting(false);
            setUploadProgress('');
        }
    };

    return (
        <div className={`absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 transition-opacity duration-500 ${isSubmitting && uploadProgress === 'Launching...' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className={`bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] transform transition-all duration-700 ${isSubmitting && uploadProgress === 'Launching...' ? 'scale-0 translate-y-[-200px] rotate-12' : 'scale-100 translate-y-0'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-light text-white tracking-wide">New Transmission</h2>
                    <button onClick={onCancel} className="text-white/40 hover:text-white transition-colors p-2">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Broadcast a thought into the night..."
                            className="w-full h-48 bg-transparent text-white p-0 border-none focus:ring-0 outline-none resize-none placeholder-white/30 text-lg font-light leading-relaxed"
                            maxLength={500}
                            autoFocus
                        />

                        {/* Toolbar */}
                        <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-4">
                            <div className="flex items-center gap-4">
                                {/* Image Button */}
                                <div className="relative">
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => imageInputRef.current?.click()}
                                        className={`p-2 rounded-full transition-colors ${imageFile ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        title="Attach Image"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <polyline points="21 15 16 10 5 21"></polyline>
                                        </svg>
                                    </button>
                                    {imageFile && (
                                        <span className="absolute -top-2 -right-2 w-2 h-2 bg-cyan-400 rounded-full"></span>
                                    )}
                                </div>

                                {/* Audio Button */}
                                <div className="relative">
                                    <input
                                        ref={audioInputRef}
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudioSelect}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => audioInputRef.current?.click()}
                                        className={`p-2 rounded-full transition-colors ${audioFile ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        title="Attach Audio"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                            <line x1="12" y1="19" x2="12" y2="23"></line>
                                            <line x1="8" y1="23" x2="16" y2="23"></line>
                                        </svg>
                                    </button>
                                    {audioFile && (
                                        <span className="absolute -top-2 -right-2 w-2 h-2 bg-cyan-400 rounded-full"></span>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!content.trim() && !imageFile && !audioFile}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-sm font-medium transition-all"
                            >
                                {isSubmitting ? uploadProgress : 'Transmit'}
                            </button>
                        </div>

                        {/* File Previews */}
                        {(imageFile || audioFile) && (
                            <div className="flex gap-2 mt-2">
                                {imageFile && (
                                    <div className="text-xs text-white/40 flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                        <span>📷 {imageFile.name}</span>
                                        <button type="button" onClick={() => setImageFile(null)} className="hover:text-white">×</button>
                                    </div>
                                )}
                                {audioFile && (
                                    <div className="text-xs text-white/40 flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                        <span>🎤 {audioFile.name}</span>
                                        <button type="button" onClick={() => setAudioFile(null)} className="hover:text-white">×</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
