import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, longitude, latitude, preferredLanguage } = body;

        if (!username || longitude === undefined || latitude === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Simple "login or register" logic
        // In a real app, we'd have proper auth. Here we just find by username or create.
        // For demo purposes, let's just create a new user or update existing if we had a stable ID.
        // Since we don't have passwords, let's assume username is unique for now or just create new.
        // Let's try to find by username first.

        let user = await prisma.user.findFirst({
            where: { username },
        });

        if (user) {
            // Update location
            user = await prisma.user.update({
                where: { id: user.id },
                data: { longitude, latitude },
            });
        } else {
            user = await prisma.user.create({
                data: {
                    username,
                    longitude,
                    latitude,
                    preferredLanguage: preferredLanguage || 'en',
                },
            });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error in auth:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
