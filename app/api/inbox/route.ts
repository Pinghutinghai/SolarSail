import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
        const capsules = await prisma.capsule.findMany({
            where: {
                opUserId: parseInt(userId),
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: {
                _count: {
                    select: { replies: true },
                },
                replies: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 1,
                    include: {
                        user: {
                            select: {
                                username: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const capsulesWithReplies = capsules.filter((c: any) => c._count.replies > 0);
        const now = new Date();

        const inboxItems = capsulesWithReplies.map((capsule: any) => {
            const capsuleAge = now.getTime() - new Date(capsule.createdAt).getTime();
            const hoursElapsed = capsuleAge / (60 * 60 * 1000);

            const unlockedReplies = capsule.replies?.filter((reply: any) => {
                const replyAge = now.getTime() - new Date(reply.createdAt).getTime();
                return replyAge >= 24 * 60 * 60 * 1000;
            }).length || 0;

            // Only show latest reply if it's unlocked (24h+ old)
            const latestReply = capsule.replies?.[0];
            const latestReplyAge = latestReply
                ? now.getTime() - new Date(latestReply.createdAt).getTime()
                : 0;
            const isLatestReplyUnlocked = latestReplyAge >= 24 * 60 * 60 * 1000;

            return {
                id: capsule.id,
                contentText: capsule.contentText,
                imageUrl: capsule.imageUrl,
                createdAt: capsule.createdAt,
                totalReplies: capsule._count.replies,
                unlockedReplies,
                lockedReplies: capsule._count.replies - unlockedReplies,
                latestReply: (latestReply && isLatestReplyUnlocked) ? {
                    username: latestReply.user.username,
                    createdAt: latestReply.createdAt,
                    preview: latestReply.contentText.substring(0, 50) + (latestReply.contentText.length > 50 ? '...' : ''),
                } : null,
                capsuleAge: hoursElapsed,
            };
        });

        const totalUnread = inboxItems.reduce((sum: number, item: any) => sum + item.unlockedReplies, 0);

        return NextResponse.json({
            items: inboxItems,
            totalUnread,
            totalCapsules: inboxItems.length,
        });
    } catch (error) {
        console.error('Error fetching inbox:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
