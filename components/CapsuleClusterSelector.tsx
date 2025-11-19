'use client';

import React from 'react';

interface Capsule {
    id: number;
    latitude: number;
    longitude: number;
    contentText: string;
    createdAt: string;
    opUser: { username: string };
    opUserId: number;
    _count?: { replies: number };
}

interface CapsuleClusterSelectorProps {
    capsules: Capsule[];
    position: { x: number; y: number };
    onSelect: (capsule: Capsule) => void;
    onClose: () => void;
    currentUserId?: number;
}

export default function CapsuleClusterSelector({
    capsules,
    position,
    onSelect,
    onClose,
    currentUserId
}: CapsuleClusterSelectorProps) {
    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40"
                onClick={onClose}
            />

            {/* Selector Menu */}
            <div
                className="fixed z-50 bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] border border-indigo-500/30 rounded-xl shadow-[0_0_30px_-10px_rgba(167,139,250,0.3)] p-4 min-w-[250px] max-w-[300px] animate-fade-in"
                style={{
                    left: `${Math.min(position.x, window.innerWidth - 320)}px`,
                    top: `${Math.min(position.y, window.innerHeight - 400)}px`,
                }}
            >
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-semibold text-sm">
                        {capsules.length} Capsules Here
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {capsules.map((capsule) => {
                        const isUserCapsule = currentUserId && capsule.opUserId === currentUserId;
                        return (
                            <button
                                key={capsule.id}
                                onClick={() => onSelect(capsule)}
                                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 transition-all group"
                            >
                                <div className="flex items-start gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full mt-1 ${isUserCapsule ? 'bg-orange-500' : 'bg-cyan-500'
                                            }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white/90 text-sm line-clamp-2 mb-1">
                                            {capsule.contentText}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span>{capsule.opUser.username}</span>
                                            {capsule._count && capsule._count.replies > 0 && (
                                                <span className="text-purple-400">
                                                    {capsule._count.replies} 💬
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
