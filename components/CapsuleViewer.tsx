'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { calculateDistance, formatDistance, getLocalTime, getTimeOfDay, getLocationName } from '@/lib/geoContext';

interface Reply {
    id: number;
    contentText: string;
    createdAt: string;
    user: {
        username: string;
    };
}

interface Capsule {
    id: number;
    contentText: string;
    imageUrl?: string | null;
    audioUrl?: string | null;
    latitude: number;
    longitude: number;
    createdAt: string;
    opUser: {
        username: string;
    };
}

interface ReplyWindow {
    day: number;
    startHour: number;
    endHour: number;
    isUnlocked: boolean;
    count: number;
}

interface CapsuleViewerProps {
    capsule: Capsule;
    currentUserId: number;
    userLocation: { lat: number; lng: number };
    onClose: () => void;
}

export default function CapsuleViewer({ capsule, currentUserId, userLocation, onClose }: CapsuleViewerProps) {
    const [replies, setReplies] = useState<Reply[]>([]);
    const [replyWindows, setReplyWindows] = useState<ReplyWindow[]>([]);
    const [nextUnlockTime, setNextUnlockTime] = useState(0);
    const [totalReplies, setTotalReplies] = useState(0);
    const [newReply, setNewReply] = useState('');
    const [loadingReplies, setLoadingReplies] = useState(true);
    const [sendingReply, setSendingReply] = useState(false);
    const [locationName, setLocationName] = useState('');

    useEffect(() => {
        getLocationName(capsule.latitude, capsule.longitude).then(setLocationName);
    }, [capsule.latitude, capsule.longitude]);

    useEffect(() => {
        fetchReplies();
    }, [capsule.id]);

    const fetchReplies = async () => {
        try {
            const res = await fetch(`/api/replies?capsuleId=${capsule.id}&userId=${currentUserId}`);
            const data = await res.json();
            if (data.replies) {
                setReplies(data.replies);
            }
            if (data.replyWindows) {
                setReplyWindows(data.replyWindows);
            }
            if (typeof data.nextUnlockTime === 'number') {
                setNextUnlockTime(data.nextUnlockTime);
            }
            if (typeof data.totalReplies === 'number') {
                setTotalReplies(data.totalReplies);
            }
        } catch (error) {
            console.error('Failed to fetch replies', error);
        } finally {
            setLoadingReplies(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReply.trim()) return;

        setSendingReply(true);
        try {
            const res = await fetch('/api/replies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    capsuleId: capsule.id,
                    userId: currentUserId,
                    content: newReply,
                }),
            });

            if (res.ok) {
                setNewReply('');
                fetchReplies();
            }
        } catch (error) {
            console.error('Failed to send reply', error);
        } finally {
            setSendingReply(false);
        }
    };

    // Calculate geographic and temporal context
    const context = useMemo(() => {
        const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            capsule.latitude,
            capsule.longitude
        );
        const localTime = getLocalTime(capsule.longitude, new Date(capsule.createdAt));
        const timeOfDay = getTimeOfDay(capsule.longitude, capsule.latitude, new Date(capsule.createdAt));

        return {
            distance: formatDistance(distance),
            localTime: localTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            timeOfDay,
            locationName
        };
    }, [capsule, userLocation, locationName]);

    // Format countdown
    const countdown = useMemo(() => {
        if (nextUnlockTime <= 0) return null;
        const hours = Math.floor(nextUnlockTime / (60 * 60 * 1000));
        const mins = Math.floor((nextUnlockTime % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}h ${mins}m`;
    }, [nextUnlockTime]);

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 pointer-events-auto animate-fade-in">
            <div
                className="relative w-full max-w-2xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] overflow-hidden animate-unfold flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-white/5">
                    <div>
                        <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest mb-1 font-light">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]"></span>
                            <span>Incoming Transmission</span>
                        </div>
                        <h3 className="text-white font-light text-2xl tracking-wide">@{capsule.opUser.username}</h3>
                        <p className="text-white/40 text-xs mt-1 font-mono">{new Date(capsule.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">✕</button>
                </div>

                {/* Geographic & Temporal Context */}
                <div className="px-6 py-4 bg-white/5 border-b border-white/5 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl opacity-50">📍</span>
                        <div>
                            <div className="text-white/90 text-sm font-medium">{context.locationName}</div>
                            <div className="text-white/40 text-xs">{context.distance} away</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xl opacity-50">🕒</span>
                        <div>
                            <div className="text-white/90 text-sm font-medium">{context.localTime}</div>
                            <div className="text-white/40 text-xs">{context.timeOfDay}</div>
                        </div>
                    </div>
                </div>

                {/* Unlock Timeline */}
                {replyWindows.length > 0 && (
                    <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-white/60 text-xs uppercase tracking-widest">Signal Strength</span>
                            {countdown && (
                                <span className="text-amber-400 text-xs font-mono">Next Wave: {countdown}</span>
                            )}
                        </div>
                        <div className="flex gap-1 h-12 items-end">
                            {replyWindows.map((window) => (
                                <div
                                    key={window.day}
                                    className="flex-1 flex flex-col justify-end group relative"
                                    title={`Day ${window.day}: ${window.count} replies ${window.isUnlocked ? '(Unlocked)' : '(Locked)'}`}
                                >
                                    <div className={`w-full rounded-t-sm transition-all duration-500 ${window.isUnlocked ? 'bg-white/20 group-hover:bg-white/30' : 'bg-white/5'} ${window.count > 0 ? 'h-full' : 'h-1'}`} style={{ height: window.count > 0 ? `${Math.min(100, window.count * 10)}%` : '4px' }} />
                                    <div className="text-[9px] text-white/20 text-center mt-1 font-mono">D{window.day}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-white/30 text-center font-mono">
                            {replies.length}/{totalReplies} Echoes Received
                        </div>
                    </div>
                )}

                <div className="bg-black/30 p-4 rounded-xl mb-6 border border-white/5 overflow-y-auto max-h-60 shrink-0 space-y-3">
                    <p className="text-white text-lg leading-relaxed">{capsule.contentText}</p>

                    {capsule.imageUrl && (
                        <div className="mt-3">
                            <img
                                src={capsule.imageUrl}
                                alt="Capsule image"
                                className="w-full rounded-lg border border-white/10 max-h-64 object-contain bg-black/20"
                            />
                        </div>
                    )}

                    {capsule.audioUrl && (
                        <div className="mt-3">
                            <audio
                                controls
                                className="w-full"
                                src={capsule.audioUrl}
                            >
                                Your browser does not support audio playback.
                            </audio>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 mb-4 space-y-3 pr-2">
                    <h4 className="text-gray-400 text-sm font-semibold sticky top-0 bg-gray-900 py-2">Replies</h4>

                    {loadingReplies ? (
                        <p className="text-gray-600 text-center text-sm">Loading echoes...</p>
                    ) : replies.length === 0 ? (
                        <p className="text-gray-600 text-center text-sm italic">
                            {totalReplies > 0 ? `${totalReplies} 条回复等待解锁...` : 'No echoes yet. Be the first.'}
                        </p>
                    ) : (
                        replies.map(reply => (
                            <div key={reply.id} className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="text-cyan-200 text-sm font-medium">@{reply.user.username}</span>
                                    <span className="text-gray-600 text-[10px]">{new Date(reply.createdAt).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-gray-300 text-sm">{reply.contentText}</p>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleSendReply} className="mt-auto pt-4 border-t border-white/10">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            placeholder="Send an echo..."
                            className="flex-1 bg-black/50 text-white px-4 py-2 rounded-full border border-white/10 focus:border-cyan-500 outline-none text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!newReply.trim() || sendingReply}
                            className="bg-cyan-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-cyan-500 disabled:opacity-50"
                        >
                            Send
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
