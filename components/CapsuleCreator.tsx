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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's on your mind at this solar time?"
                            className="w-full h-32 bg-white/5 text-white p-4 rounded-xl border border-white/10 focus:border-white/30 focus:ring-0 outline-none resize-none placeholder-white/20 text-lg font-light"
                            maxLength={500}
                            autoFocus
                        />
                    </div>

                    {/* Media Upload Section */}
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Image Signal</label>
                            <div className="relative group">
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
                                    className={`flex items-center justify-center w-full h-24 rounded-xl border border-dashed border-white/20 cursor-pointer hover:bg-white/5 transition-colors ${imageFile ? 'border-green-500/50 bg-green-500/10' : ''}`}
                                >
                                    {imageFile ? (
                                        <div className="text-center overflow-hidden px-2">
                                            <span className="text-2xl mb-1 block">📷</span>
                                            <span className="text-[10px] text-green-400 block truncate max-w-full">{imageFile.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-white/30 text-2xl">+</span>
                                    )}
                                </button>
                                {imageFile && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setImageFile(null);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1">
                            <label className="block text-xs text-white/40 uppercase tracking-widest mb-2">Audio Signal</label>
                            <div className="relative group">
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
                                    className={`flex items-center justify-center w-full h-24 rounded-xl border border-dashed border-white/20 cursor-pointer hover:bg-white/5 transition-colors ${audioFile ? 'border-green-500/50 bg-green-500/10' : ''}`}
                                >
                                    {audioFile ? (
                                        <div className="text-center overflow-hidden px-2">
                                            <span className="text-2xl mb-1 block">🎵</span>
                                            <span className="text-[10px] text-green-400 block truncate max-w-full">{audioFile.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-white/30 text-2xl">+</span>
                                    )}
                                </button>
                                {audioFile && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAudioFile(null);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-500"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {uploadProgress && (
                        <div className="text-cyan-400 text-xs text-center font-mono animate-pulse">
                            {uploadProgress}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-6 py-3 rounded-full text-white/40 hover:text-white transition-colors text-sm font-light disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            className={`
                                px-8 py-3 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300
                                ${!content.trim() || isSubmitting
                                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                    : 'bg-white text-black hover:bg-white/90 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'}
                            `}
                        >
                            {isSubmitting ? 'Transmitting...' : 'Launch Capsule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
