'use client';

import React, { useState, useEffect } from 'react';

interface InboxItem {
    id: number;
    contentText: string;
    imageUrl?: string | null;
    createdAt: string;
    totalReplies: number;
    unlockedReplies: number;
    lockedReplies: number;
    latestReply: {
        username: string;
        createdAt: string;
        preview: string;
    } | null;
    capsuleAge: number;
}

interface InboxProps {
    userId: number;
    onClose: () => void;
    onSelectCapsule: (capsuleId: number) => void;
}

export default function Inbox({ userId, onClose, onSelectCapsule }: InboxProps) {
    const [items, setItems] = useState<InboxItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalUnread, setTotalUnread] = useState(0);

    useEffect(() => {
        fetchInbox();
    }, [userId]);

    const fetchInbox = async () => {
        try {
            const res = await fetch(`/api/inbox?userId=${userId}`);
            const data = await res.json();
            if (data.items) {
                setItems(data.items);
            }
            if (typeof data.totalUnread === 'number') {
                setTotalUnread(data.totalUnread);
            }
        } catch (error) {
            console.error('Failed to fetch inbox:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        return 'Just now';
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 pointer-events-auto animate-fade-in">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] max-h-[85vh] flex flex-col animate-unfold origin-center relative overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <div>
                        <h2 className="text-xl font-light text-white tracking-wide flex items-center gap-2">
                            Interstellar Inbox
                            {totalUnread > 0 && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                                    {totalUnread} NEW
                                </span>
                            )}
                        </h2>
                        <p className="text-white/40 text-xs mt-1 font-mono">Echoes from the void</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {loading ? (
                        <div className="text-center text-white/30 py-12 font-mono text-sm">
                            Scanning frequencies...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center text-white/30 py-12">
                            <div className="text-4xl mb-4 opacity-50">📭</div>
                            <p className="font-light">No signals received yet</p>
                            <p className="text-xs mt-2 font-mono opacity-50">Cast a bottle into the stars...</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div
                                key={item.id}
                                onClick={() => onSelectCapsule(item.id)}
                                className="bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 hover:border-white/20 cursor-pointer transition-all group"
                            >
                                <div className="flex gap-4">
                                    {item.imageUrl && (
                                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                                            <img
                                                src={item.imageUrl}
                                                alt="Capsule"
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-white/90 text-sm font-medium line-clamp-1 group-hover:text-white transition-colors">
                                                {item.contentText}
                                            </p>
                                            <span className="text-[10px] text-white/30 ml-2 flex-shrink-0 font-mono">
                                                {formatTimeAgo(item.createdAt)}
                                            </span>
                                        </div>

                                        {item.latestReply && (
                                            <div className="bg-black/20 p-2 rounded-lg text-xs mb-2 border border-white/5">
                                                <div className="text-cyan-300/80 font-medium mb-0.5">@{item.latestReply.username}</div>
                                                <div className="text-white/50 line-clamp-1 italic">"{item.latestReply.preview}"</div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 text-[10px] font-mono">
                                            <span className="text-green-400/80 flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-green-400"></span>
                                                {item.unlockedReplies} Visible
                                            </span>
                                            {item.lockedReplies > 0 && (
                                                <span className="text-amber-400/80 flex items-center gap-1">
                                                    <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse"></span>
                                                    {item.lockedReplies} Arriving
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
