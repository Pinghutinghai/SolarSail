import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    try {
        const capsuleCount = await prisma.capsule.count();
        const userCount = await prisma.user.count();

        console.log('📊 Database Status:');
        console.log(`  Users: ${userCount}`);
        console.log(`  Capsules: ${capsuleCount}`);

        if (capsuleCount > 0) {
            const sampleCapsules = await prisma.capsule.findMany({
                take: 5,
                include: { opUser: true }
            });

            console.log('\n🔍 Sample Capsules:');
            sampleCapsules.forEach((c: any) => {
                console.log(`  - ID: ${c.id}, Zone: ${c.solarZoneIndex}, Lat: ${c.latitude.toFixed(2)}, Lng: ${c.longitude.toFixed(2)}, Text: "${c.contentText.substring(0, 20)}..."`);
            });
        }
    } catch (error) {
        console.error("Error checking database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
