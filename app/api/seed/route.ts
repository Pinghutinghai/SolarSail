import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSolarZoneIndex } from '@/lib/solarTime';

export async function GET(request: Request) {
    try {
        // Create a seed user if not exists
        let seedUser = await prisma.user.findFirst({ where: { username: 'TimeTraveler' } });
        if (!seedUser) {
            seedUser = await prisma.user.create({
                data: {
                    username: 'TimeTraveler',
                    longitude: 0,
                    latitude: 0,
                    preferredLanguage: 'en',
                },
            });
        }

        const seedMessages = [
            "The sun is warm here. How is it there?",
            "Just saw a beautiful sunrise.",
            "Coffee tastes better at 8 AM solar time.",
            "Thinking about the stars.",
            "Is anyone else awake?",
        ];

        const createdCapsules = [];

        // Create capsules in random zones
        for (let i = 0; i < 50; i++) {
            const randomLng = Math.random() * 360 - 180;
            const randomLat = Math.random() * 180 - 90;
            const zoneIndex = getSolarZoneIndex(randomLng);

            const message = seedMessages[Math.floor(Math.random() * seedMessages.length)];

            const capsule = await prisma.capsule.create({
                data: {
                    opUserId: seedUser.id,
                    contentText: `[Seed Zone ${zoneIndex}] ${message}`,
                    solarZoneIndex: zoneIndex,
                    latitude: randomLat,
                    longitude: randomLng,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });
            createdCapsules.push(capsule);
        }

        return NextResponse.json({ message: 'Seeded successfully', count: createdCapsules.length });
    } catch (error) {
        console.error('Error seeding:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
