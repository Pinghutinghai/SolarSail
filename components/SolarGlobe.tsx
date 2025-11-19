'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { getSolarZoneIndex, getSunPosition } from '@/lib/solarTime';
import CapsuleClusterSelector from './CapsuleClusterSelector';

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

interface SolarGlobeProps {
    userLocation: { lat: number; lng: number } | null;
    onCapsuleClick?: (capsule: Capsule) => void;
    refreshTrigger?: number;
    currentUserId?: number;
}

interface CapsuleCluster {
    capsules: Capsule[];
    screenX: number;
    screenY: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

// Helper to calculate drifted longitude
function getDriftedLongitude(longitude: number, createdAt: string): number {
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const hoursElapsed = (now - created) / (1000 * 60 * 60);
    const drift = hoursElapsed * 15; // 15 degrees per hour West
    let driftedLng = longitude - drift;

    // Normalize to -180 to 180
    driftedLng = ((driftedLng + 180) % 360);
    if (driftedLng < 0) driftedLng += 360;
    return driftedLng - 180;
}

export default function SolarGlobe({ userLocation, onCapsuleClick, refreshTrigger = 0, currentUserId }: SolarGlobeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [capsules, setCapsules] = useState<Capsule[]>([]);
    const [worldData, setWorldData] = useState<any>(null);
    const [currentZone, setCurrentZone] = useState<number>(-1);
    const [clusterSelector, setClusterSelector] = useState<{ cluster: CapsuleCluster; position: { x: number; y: number } } | null>(null);
    const [scale, setScale] = useState(400); // Zoom scale
    const scaleRef = useRef(scale);
    const nightLights = useRef<[number, number][]>([]); // Store [lng, lat] of city lights
    const mousePos = useRef<[number, number] | null>(null); // Track mouse pos for hover effects

    // Sync scale ref with state
    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    // Globe state
    const rotation = useRef<[number, number]>([0, 0]);
    const isDragging = useRef(false);
    const lastMouse = useRef<[number, number]>([0, 0]);
    const autoRotate = useRef(true);
    const tweenRef = useRef<d3.Timer | null>(null);
    const particles = useRef<Particle[]>([]);
    const prevRefreshTrigger = useRef(refreshTrigger);

    // Fly to location animation
    const flyTo = React.useCallback((targetLng: number, targetLat: number, onComplete?: () => void) => {
        autoRotate.current = false;
        if (tweenRef.current) tweenRef.current.stop();

        const startRotate = rotation.current;
        const endRotate: [number, number] = [-targetLng, -targetLat];
        const startScale = scaleRef.current;
        const endScale = 800;

        const interpolateRotate = d3.interpolate(startRotate, endRotate);
        const interpolateScale = d3.interpolate(startScale, endScale);
        const duration = 1500;

        tweenRef.current = d3.timer((elapsed) => {
            const t = Math.min(1, elapsed / duration);
            const easeT = d3.easeCubicOut(t);

            rotation.current = interpolateRotate(easeT);
            scaleRef.current = interpolateScale(easeT);

            if (t >= 1) {
                tweenRef.current?.stop();
                tweenRef.current = null;
                if (onComplete) onComplete();
            }
        });
    }, []);

    // Fetch World Data and Generate Clustered Night Lights
    useEffect(() => {
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
            .then(res => res.json())
            .then(data => {
                setWorldData(data);

                const lights: [number, number][] = [];
                const countries = topojson.feature(data, data.objects.countries);

                // Generate clustered city lights for realistic distribution
                const cityCenters: [number, number][] = [];
                let attempts = 0;

                const numCenters = 50 + Math.floor(Math.random() * 30);
                while (cityCenters.length < numCenters && attempts < 500) {
                    const lng = Math.random() * 360 - 180;
                    const lat = (Math.random() - 0.5) * 120;

                    if (d3.geoContains(countries, [lng, lat])) {
                        cityCenters.push([lng, lat]);
                    }
                    attempts++;
                }

                cityCenters.forEach(center => {
                    const clusterSize = 10 + Math.floor(Math.random() * 40);
                    const spread = 0.5 + Math.random() * 2;

                    for (let i = 0; i < clusterSize; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.sqrt(Math.random()) * spread;

                        const lng = center[0] + Math.cos(angle) * distance;
                        const lat = center[1] + Math.sin(angle) * distance;

                        if (d3.geoContains(countries, [lng, lat])) {
                            lights.push([lng, lat]);
                        }
                    }
                });

                nightLights.current = lights;
            })
            .catch(err => console.error('Failed to load world data', err));
    }, []);

    // Fetch Capsules
    useEffect(() => {
        if (!userLocation) return;

        const fetchCapsules = () => {
            const zone = getSolarZoneIndex(userLocation.lng);
            if (zone !== currentZone) {
                setCurrentZone(zone);
                const url = currentUserId
                    ? `/api/capsules?zone=${zone}&userId=${currentUserId}`
                    : `/api/capsules?zone=${zone}`;

                fetch(url)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            setCapsules(data);
                        }
                    })
                    .catch(err => console.error('Failed to fetch capsules', err));
            }
        };

        fetchCapsules();
        const interval = setInterval(fetchCapsules, 10000);
        return () => clearInterval(interval);
    }, [userLocation, currentZone, refreshTrigger, currentUserId]);

    // Spawn particles on refreshTrigger change
    useEffect(() => {
        if (refreshTrigger !== prevRefreshTrigger.current && userLocation && canvasRef.current) {
            const canvas = canvasRef.current;
            const width = canvas.width;
            const height = canvas.height;
            const projection = d3.geoOrthographic()
                .scale(scaleRef.current)
                .translate([width / 2, height / 2])
                .clipAngle(90)
                .rotate(rotation.current);

            const projected = projection([userLocation.lng, userLocation.lat]);

            if (projected) {
                const [x, y] = projected;
                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = Math.random() * 3 + 1;
                    particles.current.push({
                        x: x,
                        y: y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 2,
                        life: 1.0 + Math.random() * 0.5,
                        color: i % 2 === 0 ? '#fbbf24' : '#ffffff',
                        size: Math.random() * 3 + 1
                    });
                }
            }
        }
        prevRefreshTrigger.current = refreshTrigger;
    }, [refreshTrigger, userLocation]);

    // Initial Rotation to User
    useEffect(() => {
        if (userLocation && autoRotate.current) {
            rotation.current = [-userLocation.lng, -userLocation.lat];
        }
    }, [userLocation]);

    // Main Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Auto Rotate
            if (autoRotate.current && !isDragging.current && !tweenRef.current) {
                rotation.current = [rotation.current[0] + 0.05, rotation.current[1]];
            }

            const now = new Date();

            // Projection
            const projection = d3.geoOrthographic()
                .scale(scaleRef.current)
                .translate([width / 2, height / 2])
                .clipAngle(90)
                .rotate(rotation.current);

            const path = d3.geoPath(projection, ctx);

            // Draw Ocean
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, scaleRef.current, 0, 2 * Math.PI);
            ctx.fillStyle = '#0a0e27';
            ctx.fill();

            // Draw Land
            if (worldData) {
                const countries = topojson.feature(worldData, worldData.objects.countries);
                ctx.beginPath();
                path(countries);
                ctx.fillStyle = '#192339';
                ctx.fill();
                ctx.strokeStyle = '#304a6e';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            // Fresnel Atmospheric Glow
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = scaleRef.current;

            const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.92, centerX, centerY, radius * 1.05);
            gradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.15)');
            gradient.addColorStop(1, 'rgba(150, 220, 255, 0.3)');

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.05, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Night Lights (Clustered)
            if (nightLights.current.length > 0) {
                const sunPos = getSunPosition(now);
                const sunCoords: [number, number] = [sunPos[0], -23.44 * Math.cos((2 * Math.PI * (now.getDate() + 10)) / 365)];

                nightLights.current.forEach((light, index) => {
                    if (d3.geoDistance(light, sunCoords) > Math.PI / 2) {
                        const projected = projection(light);
                        const center = projection.invert ? projection.invert([width / 2, height / 2]) : [0, 0];
                        if (center && d3.geoDistance(light, center as [number, number]) < 1.57) {
                            if (projected) {
                                const [lx, ly] = projected;
                                const size = 0.7 + (index % 3) * 0.3;

                                ctx.shadowBlur = 3;
                                ctx.shadowColor = 'rgba(255, 240, 180, 0.8)';
                                ctx.fillStyle = 'rgba(255, 245, 200, 0.9)';

                                ctx.beginPath();
                                ctx.arc(lx, ly, size, 0, 2 * Math.PI);
                                ctx.fill();

                                ctx.shadowBlur = 0;
                            }
                        }
                    }
                });
            }

            // Terminator with Golden Hour Glow
            const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
            const sunLng = 180 - (utcHours * 15);
            const sunLat = -23.44 * Math.cos((2 * Math.PI * (now.getDate() + 10)) / 365);

            const antiSunLng = sunLng + 180;
            const antiSunLat = -sunLat;

            const nightCircle = d3.geoCircle().center([antiSunLng, antiSunLat]).radius(90)();
            ctx.beginPath();
            path(nightCircle);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fill();

            ctx.beginPath();
            path(nightCircle);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.05)';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#d97706';
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            // User Constellation
            const userCapsules = capsules
                .filter(c => c.opUserId === currentUserId)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            if (userCapsules.length > 1) {
                const lineCoords: [number, number][] = userCapsules.map(c => {
                    const driftedLng = getDriftedLongitude(c.longitude, c.createdAt);
                    return [driftedLng, c.latitude];
                });

                const constellation: GeoJSON.LineString = {
                    type: 'LineString',
                    coordinates: lineCoords
                };

                ctx.beginPath();
                // @ts-ignore
                path(constellation);
                ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 6]);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(34, 211, 238, 0.4)';
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Draw Capsules
            const time = Date.now();
            capsules.forEach(capsule => {
                const driftedLng = getDriftedLongitude(capsule.longitude, capsule.createdAt);
                const coords: [number, number] = [driftedLng, capsule.latitude];

                const center = projection.invert ? projection.invert([width / 2, height / 2]) : [0, 0];
                if (center && d3.geoDistance(coords, center as [number, number]) > 1.57) return;

                const projected = projection(coords);
                if (projected) {
                    const [x, y] = projected;
                    const pulse = Math.sin(time / 1500 + capsule.id) * 0.15 + 1;
                    const isUserCapsule = currentUserId === capsule.opUserId;

                    if (isUserCapsule) {
                        ctx.beginPath();
                        ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
                        ctx.fillStyle = '#fbbf24';
                        ctx.fill();

                        ctx.shadowBlur = 15;
                        ctx.shadowColor = '#fbbf24';
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    } else {
                        const isCyan = capsule.id % 2 === 0;
                        const color = isCyan ? 'rgba(34, 211, 238, 0.5)' : 'rgba(167, 139, 250, 0.5)';

                        ctx.beginPath();
                        ctx.arc(x, y, 2 * pulse, 0, 2 * Math.PI);
                        ctx.fillStyle = color;
                        ctx.fill();
                    }
                }
            });

            // Draw User Location
            if (userLocation) {
                const projected = projection([userLocation.lng, userLocation.lat]);
                if (projected) {
                    const [x, y] = projected;
                    const pulseTime = (time / 2000) % 1;
                    const maxRadius = 25;

                    ctx.beginPath();
                    ctx.arc(x, y, maxRadius * pulseTime, 0, 2 * Math.PI);
                    ctx.strokeStyle = `rgba(34, 211, 238, ${0.8 - pulseTime * 0.8})`;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, 2 * Math.PI);
                    ctx.fillStyle = '#22d3ee';
                    ctx.fill();

                    ctx.shadowBlur = 15;
                    ctx.shadowColor = '#22d3ee';
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }

            // Draw Particles
            if (particles.current.length > 0) {
                for (let i = particles.current.length - 1; i >= 0; i--) {
                    const p = particles.current[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= 0.02;
                    p.vy += 0.05;

                    if (p.life <= 0) {
                        particles.current.splice(i, 1);
                        continue;
                    }

                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1.0;
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        // Event Handlers
        const handleMouseDown = (event: MouseEvent) => {
            isDragging.current = true;
            lastMouse.current = [event.clientX, event.clientY];
            autoRotate.current = false;
        };

        const handleDrag = (event: MouseEvent) => {
            if (!isDragging.current) return;
            const [x, y] = lastMouse.current;
            const dx = event.clientX - x;
            const dy = event.clientY - y;

            const sensitivity = 0.25;
            rotation.current = [
                rotation.current[0] + dx * sensitivity,
                rotation.current[1] - dy * sensitivity
            ];

            lastMouse.current = [event.clientX, event.clientY];
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            const zoomSensitivity = 0.001;
            const newScale = scaleRef.current * (1 - event.deltaY * zoomSensitivity);
            const clampedScale = Math.max(200, Math.min(newScale, 2000));
            setScale(clampedScale);
        };

        const handleCanvasMouseMove = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mousePos.current = [event.clientX - rect.left, event.clientY - rect.top];

            const width = canvas.width;
            const height = canvas.height;
            const projection = d3.geoOrthographic()
                .scale(scaleRef.current)
                .translate([width / 2, height / 2])
                .clipAngle(90)
                .rotate(rotation.current);

            const invert = projection.invert ? projection.invert(mousePos.current) : null;
            let isHovering = false;

            if (invert) {
                const hoverThreshold = 0.08;
                for (const c of capsules) {
                    const driftedLng = getDriftedLongitude(c.longitude, c.createdAt);
                    if (d3.geoDistance(invert, [driftedLng, c.latitude]) < hoverThreshold) {
                        isHovering = true;
                        break;
                    }
                }
            }
            canvas.style.cursor = isHovering ? 'pointer' : 'move';
        };

        const handleClick = (event: MouseEvent) => {
            if (isDragging.current) return;

            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const width = canvas.width;
            const height = canvas.height;
            const projection = d3.geoOrthographic()
                .scale(scaleRef.current)
                .translate([width / 2, height / 2])
                .clipAngle(90)
                .rotate(rotation.current);

            const invert = projection.invert ? projection.invert([x, y]) : null;

            if (!invert) return;

            const clickThreshold = 0.08;
            const nearCapsules: Array<{ capsule: Capsule; dist: number; screenX: number; screenY: number }> = [];

            for (const c of capsules) {
                const driftedLng = getDriftedLongitude(c.longitude, c.createdAt);
                const geoDist = d3.geoDistance(invert, [driftedLng, c.latitude]);

                if (geoDist < clickThreshold) {
                    const projected = projection([driftedLng, c.latitude]);
                    if (projected) {
                        nearCapsules.push({
                            capsule: c,
                            dist: geoDist,
                            screenX: projected[0],
                            screenY: projected[1]
                        });
                    }
                }
            }

            if (nearCapsules.length > 0) {
                nearCapsules.sort((a, b) => a.dist - b.dist);
                const screenDist = Math.sqrt((nearCapsules[0].screenX - x) ** 2 + (nearCapsules[0].screenY - y) ** 2);

                if (nearCapsules.length === 1 || screenDist < 50) {
                    if (nearCapsules.length === 1) {
                        const target = nearCapsules[0].capsule;
                        const driftedLng = getDriftedLongitude(target.longitude, target.createdAt);

                        flyTo(driftedLng, target.latitude, () => {
                            setScale(scaleRef.current);
                        });

                        if (onCapsuleClick) onCapsuleClick(target);
                    } else {
                        const cluster = {
                            capsules: nearCapsules.map(nc => nc.capsule),
                            screenX: event.clientX,
                            screenY: event.clientY
                        };

                        const firstCap = nearCapsules[0].capsule;
                        const driftedLng = getDriftedLongitude(firstCap.longitude, firstCap.createdAt);
                        flyTo(driftedLng, firstCap.latitude);

                        setClusterSelector({
                            cluster,
                            position: { x: event.clientX, y: event.clientY }
                        });
                    }
                }
            }
        };

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleDrag);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('mousemove', handleCanvasMouseMove);

        return () => {
            cancelAnimationFrame(animationFrameId);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleDrag);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('mousemove', handleCanvasMouseMove);
        };
    }, [worldData, capsules, userLocation, currentUserId, flyTo, onCapsuleClick]);

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
            <canvas
                ref={canvasRef}
                width={800}
                height={800}
                className="w-full h-full max-w-[800px] max-h-[800px] cursor-move"
            />

            {clusterSelector && (
                <CapsuleClusterSelector
                    capsules={clusterSelector.cluster.capsules}
                    position={clusterSelector.position}
                    onSelect={(capsule) => {
                        setClusterSelector(null);
                        if (onCapsuleClick) onCapsuleClick(capsule);
                    }}
                    onClose={() => setClusterSelector(null)}
                />
            )}

            <div className="absolute bottom-8 right-8 flex flex-col gap-4 z-10">
                {userLocation && (
                    <button
                        onClick={() => flyTo(userLocation.lng, userLocation.lat)}
                        className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all shadow-lg group"
                        title="Return to Me"
                    >
                        <span className="group-hover:animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-10"></span>
                        📍
                    </button>
                )}
            </div>
        </div>
    );
}
