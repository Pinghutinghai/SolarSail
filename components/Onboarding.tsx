'use client';

import React, { useState } from 'react';

interface OnboardingProps {
    onLocationFound: (coords: { lat: number; lng: number }) => void;
}

export default function Onboarding({ onLocationFound }: OnboardingProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGrantPermission = () => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLoading(false);
                onLocationFound({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (err) => {
                setLoading(false);
                setError('Unable to retrieve your location. Please try manual entry.');
                console.error(err);
            }
        );
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 backdrop-blur-sm">
            <div className="bg-gray-900 p-8 rounded-2xl border border-white/10 max-w-md w-full text-center shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-4">Welcome to SolarSail</h2>
                <p className="text-gray-300 mb-8">
                    To connect you with others in your solar rhythm, we need to know where you are under the sun.
                </p>

                {error && (
                    <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGrantPermission}
                    disabled={loading}
                    className="w-full py-3 px-6 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Locating...' : 'Grant Location Access'}
                </button>

                <div className="mt-6">
                    <button className="text-gray-500 text-sm hover:text-white transition-colors">
                        Enter manually (Coming Soon)
                    </button>
                </div>
            </div>
        </div>
    );
}
