'use client';

import React, { useState, useEffect } from 'react';
import SolarGlobe from '@/components/SolarGlobe';
import Onboarding from '@/components/Onboarding';
import CapsuleCreator from '@/components/CapsuleCreator';
import CapsuleViewer from '@/components/CapsuleViewer';
import Inbox from '@/components/Inbox';

interface User {
  id: number;
  username: string;
}

interface Capsule {
  id: number;
  latitude: number;
  longitude: number;
  contentText: string;
  createdAt: string;
  opUser: { username: string };
}

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);

  const [showInbox, setShowInbox] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check if we already have location saved (e.g. in local storage)
    // For now, just show onboarding every time for demo

    // Check for existing user in localStorage
    const storedUser = localStorage.getItem('solarSailUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLocationFound = async (coords: { lat: number; lng: number }) => {
    setLocation(coords);
    setShowOnboarding(false);

    // Register or update user
    // For v1.0, we'll just auto-create a user if not exists, or update location
    // If no user, prompt for username? Or just generate one?
    // Let's keep it simple: If no user, create one with random name or prompt later.
    // For now, let's auto-generate "Traveler-{Random}" if not set.

    if (!user) {
      const username = `Traveler-${Math.floor(Math.random() * 10000)}`;
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            latitude: coords.lat,
            longitude: coords.lng,
            preferredLanguage: 'en'
          }),
        });
        const newUser = await res.json();
        setUser(newUser);
        localStorage.setItem('solarSailUser', JSON.stringify(newUser));
      } catch (err) {
        console.error('Auth failed', err);
      }
    } else {
      // Update location
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          latitude: coords.lat,
          longitude: coords.lng,
        }),
      }).catch(err => console.error('Update location failed', err));
    }
  };

  // Fetch unread count periodically
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/inbox?userId=${user.id}`);
        const data = await res.json();
        if (typeof data.totalUnread === 'number') {
          setUnreadCount(data.totalUnread);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      <SolarGlobe
        userLocation={location}
        onCapsuleClick={(capsule) => setSelectedCapsule(capsule)}
        refreshTrigger={refreshKey}
        currentUserId={user?.id}

      />

      {showOnboarding && (
        <Onboarding onLocationFound={handleLocationFound} />
      )}

      {/* UI Overlay */}
      {!showOnboarding && location && user && (
        <>
          <div className="absolute top-0 left-0 w-full p-6 pointer-events-none z-10 flex justify-between items-start">
            <h1 className="text-white text-3xl font-bold drop-shadow-lg tracking-widest uppercase opacity-80">
              SolarSail
            </h1>
            <div className="pointer-events-auto flex gap-3">
              <button
                onClick={() => setShowCreator(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">✨</span>
                Release Capsule
              </button>
              <button
                onClick={() => setShowInbox(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/20 transition-all relative"
                title="Inbox"
              >
                📮
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {showCreator && (
            <CapsuleCreator
              userId={user.id}
              latitude={location.lat}
              longitude={location.lng}
              onCapsuleCreated={() => {
                setShowCreator(false);
                setRefreshKey(prev => prev + 1);
              }}
              onCancel={() => setShowCreator(false)}
            />
          )}

          {showInbox && (
            <Inbox
              userId={user.id}
              onClose={() => setShowInbox(false)}
              onSelectCapsule={async (capsuleId) => {
                // Fetch full capsule data by ID
                const res = await fetch(`/api/capsules?capsuleId=${capsuleId}`);
                const capsule = await res.json();
                if (capsule && !capsule.error) {
                  setSelectedCapsule(capsule);
                  setShowInbox(false);
                }
              }}
            />
          )}

          {selectedCapsule && location && (
            <CapsuleViewer
              capsule={selectedCapsule}
              currentUserId={user.id}
              userLocation={location}
              onClose={() => setSelectedCapsule(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
