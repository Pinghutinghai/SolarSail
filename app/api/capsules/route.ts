import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSolarZoneIndex } from '@/lib/solarTime';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, content, longitude, latitude, imageUrl, audioUrl } = body;

        if (!userId || !content || longitude === undefined || latitude === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Calculate Solar Zone
        const solarZoneIndex = getSolarZoneIndex(longitude);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const capsule = await prisma.capsule.create({
            data: {
                opUserId: userId,
                contentText: content,
                imageUrl: imageUrl || null,
                audioUrl: audioUrl || null,
                solarZoneIndex,
                latitude,
                longitude,
                expiresAt,
            },
        });

        return NextResponse.json(capsule);
    } catch (error) {
        console.error('Error creating capsule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const zone = searchParams.get('zone');
    const userId = searchParams.get('userId');
    const capsuleId = searchParams.get('capsuleId');

    // Handle single capsule fetch by ID
    if (capsuleId) {
        try {
            const capsule = await prisma.capsule.findUnique({
                where: { id: parseInt(capsuleId, 10) },
                select: {
                    id: true,
                    latitude: true,
                    longitude: true,
                    contentText: true,
                    imageUrl: true,
                    audioUrl: true,
                    createdAt: true,
                    opUserId: true,
                    opUser: {
                        select: {
                            username: true,
                            preferredLanguage: true,
                        },
                    },
                    _count: {
                        select: { replies: true },
                    },
                },
            });

            if (!capsule) {
                return NextResponse.json({ error: 'Capsule not found' }, { status: 404 });
            }

            return NextResponse.json(capsule);
        } catch (error) {
            console.error('Error fetching capsule:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }

    if (!zone) {
        return NextResponse.json({ error: 'Missing zone parameter' }, { status: 400 });
    }

    const zoneIndex = parseInt(zone, 10);

    try {
        // Build query: current zone capsules OR user's own capsules
        const whereCondition: any = {
            expiresAt: {
                gt: new Date(), // Not expired
            },
        };

        if (userId) {
            // Include capsules from current zone OR user's own capsules (any zone)
            whereCondition.OR = [
                { solarZoneIndex: zoneIndex },
                { opUserId: parseInt(userId, 10) }
            ];
        } else {
            // Just current zone
            whereCondition.solarZoneIndex = zoneIndex;
        }

        const capsules = await prisma.capsule.findMany({
            where: whereCondition,
            select: {
                id: true,
                latitude: true,
                longitude: true,
                contentText: true,
                imageUrl: true,
                audioUrl: true,
                createdAt: true,
                opUserId: true,
                opUser: {
                    select: {
                        username: true,
                        preferredLanguage: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json(capsules);
    } catch (error) {
        console.error('Error fetching capsules:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
