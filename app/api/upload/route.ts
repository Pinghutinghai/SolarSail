import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const fileType = file.type;
        const isImage = fileType.startsWith('image/');
        const isAudio = fileType.startsWith('audio/');

        if (!isImage && !isAudio) {
            return NextResponse.json({ error: 'Invalid file type. Only images and audio files are allowed.' }, { status: 400 });
        }

        // Validate file size (2MB for images, 5MB for audio)
        const maxSize = isImage ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json({
                error: `File too large. Max size: ${isImage ? '2MB' : '5MB'}`
            }, { status: 400 });
        }

        // Upload to Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
        });

        return NextResponse.json({
            url: blob.url,
            type: isImage ? 'image' : 'audio'
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
