import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_TEXTS = [
    "Sometimes I wonder if anyone else is looking at the same stars...",
    "Today's sunset was breathtaking. Wish I could share it with someone.",
    "Feeling grateful for the small moments of peace in this chaotic world.",
    "Just had the best coffee of my life at a tiny cafe nobody knows about.",
    "Missing home, but loving this journey.",
    "The ocean always reminds me how small we are.",
    "Found a bookmark in an old book with someone else's handwriting. Wonder who they were.",
    "Late night thoughts: what if we're all just trying to find our way home?",
    "The city lights look like stars from up here.",
    "Sending good vibes to whoever needs them right now.",
    "Some days are harder than others, but we keep going.",
    "The smell of rain on warm pavement is my favorite thing.",
    "Just me, my thoughts, and the night sky.",
    "Hope you're doing okay, wherever you are.",
    "This moment feels like it should last forever.",
    "Learned today that kindness doesn't cost anything.",
    "The world is vast, but sometimes it feels so small.",
    "Caught myself smiling at a stranger's dog today. Simple joys.",
    "Midnight snack: instant noodles and existential thoughts.",
    "If you're reading this, you're not alone.",
    "星空下的我，想知道你在哪里。",
    "有时候，沉默比千言万语更有力量。",
    "今晚的月亮特别圆，你看到了吗？",
    "漂流在时间里，等待一个回音。",
];

const TIMEZONE_CITIES = [
    { zone: 0, lat: 51.5074, lng: -0.1278 }, { zone: 1, lat: 48.8566, lng: 2.3522 },
    { zone: 2, lat: 41.9028, lng: 12.4964 }, { zone: 3, lat: 55.7558, lng: 37.6173 },
    { zone: 4, lat: 25.2048, lng: 55.2708 }, { zone: 5, lat: 28.6139, lng: 77.2090 },
    { zone: 6, lat: 23.8103, lng: 90.4125 }, { zone: 7, lat: 13.7563, lng: 100.5018 },
    { zone: 8, lat: 39.9042, lng: 116.4074 }, { zone: 9, lat: 35.6762, lng: 139.6503 },
    { zone: 10, lat: -33.8688, lng: 151.2093 }, { zone: 11, lat: -41.2865, lng: 174.7762 },
    { zone: 12, lat: -17.8252, lng: -149.5250 }, { zone: 13, lat: 21.3099, lng: -157.8581 },
    { zone: 14, lat: 61.2181, lng: -149.9003 }, { zone: 15, lat: 37.7749, lng: -122.4194 },
    { zone: 16, lat: 19.4326, lng: -99.1332 }, { zone: 17, lat: -12.0464, lng: -77.0428 },
    { zone: 18, lat: 40.7128, lng: -74.0060 }, { zone: 19, lat: -23.5505, lng: -46.6333 },
    { zone: 20, lat: -34.6037, lng: -58.3816 }, { zone: 21, lat: -15.7942, lng: -47.8822 },
    { zone: 22, lat: 64.1466, lng: -21.9426 }, { zone: 23, lat: 27.9117, lng: -15.4362 },
];

export async function POST() {
    try {
        // Create demo user
        // Create demo user
        let demoUser = await prisma.user.findFirst({
            where: { username: 'demo_traveler' }
        });

        if (!demoUser) {
            demoUser = await prisma.user.create({
                data: {
                    username: 'demo_traveler',
                    latitude: 0,
                    longitude: 0,
                }
            });
        }

        // Clean old demo capsules
        await prisma.capsule.deleteMany({
            where: { opUserId: demoUser.id }
        });

        let createdCount = 0;

        // Generate 3 capsules per timezone
        for (const city of TIMEZONE_CITIES) {
            for (let i = 0; i < 3; i++) {
                const latVariation = (Math.random() - 0.5) * 10;
                const lngVariation = (Math.random() - 0.5) * 10;
                const text = DEMO_TEXTS[Math.floor(Math.random() * DEMO_TEXTS.length)];

                const daysAgo = Math.floor(Math.random() * 7);
                const hoursAgo = Math.floor(Math.random() * 24);
                const createdAt = new Date();
                createdAt.setDate(createdAt.getDate() - daysAgo);
                createdAt.setHours(createdAt.getHours() - hoursAgo);

                await prisma.capsule.create({
                    data: {
                        opUserId: demoUser.id,
                        latitude: city.lat + latVariation,
                        longitude: city.lng + lngVariation,
                        solarZoneIndex: city.zone,
                        contentText: text,
                        createdAt,
                        expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
                    }
                });

                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Created ${createdCount} demo capsules`
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 });
    }
}
