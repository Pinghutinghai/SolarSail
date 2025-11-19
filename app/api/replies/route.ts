import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { capsuleId, userId, content } = body;

        if (!capsuleId || !userId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const reply = await prisma.reply.create({
            data: {
                capsuleId,
                userId,
                contentText: content,
            },
        });

        return NextResponse.json(reply);
    } catch (error) {
        console.error('Error creating reply:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const capsuleId = searchParams.get('capsuleId');
    const userId = searchParams.get('userId');

    if (!capsuleId || !userId) {
        return NextResponse.json({ error: 'Missing capsuleId or userId' }, { status: 400 });
    }

    try {
        const capsule = await prisma.capsule.findUnique({
            where: { id: parseInt(capsuleId) },
        });

        if (!capsule) {
            return NextResponse.json({ error: 'Capsule not found' }, { status: 404 });
        }

        const isOP = capsule.opUserId === parseInt(userId);

        // Progressive unlock logic:
        // Users can see replies from previous 24h windows
        // Example: At 48h after posting, can see 0-24h replies, not 24-48h

        const replies = await prisma.reply.findMany({
            where: { capsuleId: parseInt(capsuleId) },
            include: {
                user: {
                    select: { username: true, longitude: true, latitude: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const now = new Date();
        const capsuleAge = now.getTime() - new Date(capsule.createdAt).getTime();
        const hoursElapsed = capsuleAge / (60 * 60 * 1000);

        // Calculate unlock windows
        const visibleReplies = replies.filter((reply) => {
            if (!isOP) return true; // Non-OPs see all visible replies

            const replyAge = now.getTime() - new Date(reply.createdAt).getTime();
            const replyHours = replyAge / (60 * 60 * 1000);

            // Reply is visible if it's at least 24h old
            return replyHours >= 24;
        });

        // Group replies by 24h windows for visualization
        const replyWindows = [];
        const totalDays = 7;

        for (let day = 0; day < totalDays; day++) {
            const windowStart = day * 24;
            const windowEnd = (day + 1) * 24;
            const isUnlocked = hoursElapsed >= windowEnd; // Window unlocks 24h after it ends

            const windowReplies = replies.filter((reply) => {
                const replyRelativeTime = new Date(reply.createdAt).getTime() - new Date(capsule.createdAt).getTime();
                const replyRelativeHours = replyRelativeTime / (60 * 60 * 1000);

                return replyRelativeHours >= windowStart && replyRelativeHours < windowEnd;
            });

            if (windowReplies.length > 0 || day < Math.ceil(hoursElapsed / 24)) {
                replyWindows.push({
                    day: day + 1,
                    startHour: windowStart,
                    endHour: windowEnd,
                    isUnlocked,
                    count: windowReplies.length,
                });
            }
        }

        // Calculate next unlock time
        const currentWindow = Math.floor(hoursElapsed / 24);
        const nextUnlockHours = (currentWindow + 1) * 24 - hoursElapsed;
        const nextUnlockTime = nextUnlockHours > 0 ? nextUnlockHours * 60 * 60 * 1000 : 0;

        return NextResponse.json({
            replies: visibleReplies,
            totalReplies: replies.length,
            visibleCount: visibleReplies.length,
            replyWindows,
            nextUnlockTime, // milliseconds until next batch unlocks
            capsuleAge: hoursElapsed,
            isOP,
        });
    } catch (error) {
        console.error('Error fetching replies:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
