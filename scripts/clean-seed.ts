import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAndReseed() {
    console.log('🧹 Cleaning database...');

    // Delete replies first (foreign key constraint)
    const deletedReplies = await prisma.reply.deleteMany({});
    console.log(`Deleted ${deletedReplies.count} replies`);

    // Then delete ALL capsules
    const deleted = await prisma.capsule.deleteMany({});
    console.log(`Deleted ${deleted.count} capsules`);

    // Find or create demo user
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
        console.log('✅ Created demo user');
    } else {
        console.log('✅ Found demo user');
    }

    console.log('\n🌱 Creating demo capsules...');

    const DEMO_TEXTS = [
        "Sometimes I wonder if anyone else is looking at the same stars...",
        "Today's sunset was breathtaking.",
        "Missing home, but loving this journey.",
        "The ocean always reminds me how small we are.",
        "Late night thoughts...",
        "Just had the best coffee of my life.",
        "Sending good vibes to whoever needs them.",
        "The city lights look like stars from up here.",
        "Hope you're doing okay, wherever you are.",
        "This moment feels like it should last forever.",
    ];

    const CITIES = [
        { zone: 0, lat: 51.5074, lng: -0.1278, name: "London" },
        { zone: 1, lat: 48.8566, lng: 2.3522, name: "Paris" },
        { zone: 2, lat: 41.9028, lng: 12.4964, name: "Rome" },
        { zone: 3, lat: 55.7558, lng: 37.6173, name: "Moscow" },
        { zone: 4, lat: 25.2048, lng: 55.2708, name: "Dubai" },
        { zone: 5, lat: 28.6139, lng: 77.2090, name: "Delhi" },
        { zone: 6, lat: 23.8103, lng: 90.4125, name: "Dhaka" },
        { zone: 7, lat: 13.7563, lng: 100.5018, name: "Bangkok" },
        { zone: 8, lat: 39.9042, lng: 116.4074, name: "Beijing" },
        { zone: 9, lat: 35.6762, lng: 139.6503, name: "Tokyo" },
        { zone: 10, lat: -33.8688, lng: 151.2093, name: "Sydney" },
        { zone: 11, lat: -41.2865, lng: 174.7762, name: "Wellington" },
        { zone: 12, lat: -17.8252, lng: -149.5250, name: "Tahiti" },
        { zone: 13, lat: 21.3099, lng: -157.8581, name: "Honolulu" },
        { zone: 14, lat: 61.2181, lng: -149.9003, name: "Anchorage" },
        { zone: 15, lat: 37.7749, lng: -122.4194, name: "San Francisco" },
        { zone: 16, lat: 19.4326, lng: -99.1332, name: "Mexico City" },
        { zone: 17, lat: -12.0464, lng: -77.0428, name: "Lima" },
        { zone: 18, lat: 40.7128, lng: -74.0060, name: "New York" },
        { zone: 19, lat: -23.5505, lng: -46.6333, name: "São Paulo" },
        { zone: 20, lat: -34.6037, lng: -58.3816, name: "Buenos Aires" },
        { zone: 21, lat: -15.7942, lng: -47.8822, name: "Brasília" },
        { zone: 22, lat: 64.1466, lng: -21.9426, name: "Reykjavik" },
        { zone: 23, lat: 27.9117, lng: -15.4362, name: "Canary Islands" },
    ];

    let count = 0;
    for (const city of CITIES) {
        for (let i = 0; i < 3; i++) {
            await prisma.capsule.create({
                data: {
                    opUserId: demoUser.id,
                    latitude: city.lat + (Math.random() - 0.5) * 5,
                    longitude: city.lng + (Math.random() - 0.5) * 5,
                    solarZoneIndex: city.zone,
                    contentText: DEMO_TEXTS[count % DEMO_TEXTS.length],
                    createdAt: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                }
            });
            count++;
        }
        console.log(`  ✓ Zone ${city.zone} (${city.name}): 3 capsules`);
    }

    console.log(`\n✅ Created ${count} demo capsules!`);

    // Verify
    const total = await prisma.capsule.count();
    console.log(`📊 Total capsules in database: ${total}`);

    await prisma.$disconnect();
}

cleanAndReseed().catch(console.error);
