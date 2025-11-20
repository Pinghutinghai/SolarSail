import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

// Representative cities for each timezone (0-23)
const TIMEZONE_CITIES = [
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

async function seed() {
    console.log('🌍 Starting demo capsules generation...');

    // Create a demo user if doesn't exist
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
        console.log('Created demo user');
    }

    // Delete existing demo capsules
    const deleteResult = await prisma.capsule.deleteMany({
        where: { opUserId: demoUser.id }
    });
    console.log(`Cleaned up ${deleteResult.count} old demo capsules`);

    let createdCount = 0;

    // Generate capsules with CORRECT solarZoneIndex
    // We generate enough capsules to likely cover all zones naturally
    const TARGET_CAPSULES = 300;
    const TOTAL_ZONES = 51;
    const zoneWidth = 1440 / TOTAL_ZONES;

    // Helper to calculate zone (inlined to avoid import issues)
    function calculateSolarZone(longitude: number, date: Date): number {
        const offsetMinutes = longitude * 4;
        const solarTime = new Date(date.getTime() + offsetMinutes * 60000);
        const hours = solarTime.getUTCHours();
        const minutes = solarTime.getUTCMinutes();
        const totalMinutes = hours * 60 + minutes;
        return Math.floor(totalMinutes / zoneWidth) % TOTAL_ZONES;
    }

    for (let i = 0; i < TARGET_CAPSULES; i++) {
        // Pick a random city for location
        const city = TIMEZONE_CITIES[Math.floor(Math.random() * TIMEZONE_CITIES.length)];

        // Randomize position around the city (up to 15 degrees to spread them out)
        const latVariation = (Math.random() - 0.5) * 30;
        const lngVariation = (Math.random() - 0.5) * 30;

        let latitude = city.lat + latVariation;
        let longitude = city.lng + lngVariation;

        // Normalize longitude
        if (longitude > 180) longitude -= 360;
        if (longitude < -180) longitude += 360;
        // Clamp latitude
        if (latitude > 90) latitude = 90;
        if (latitude < -90) latitude = -90;

        // Random text
        const text = DEMO_TEXTS[Math.floor(Math.random() * DEMO_TEXTS.length)];

        // Random creation time (0-7 days ago)
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 24);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);
        createdAt.setHours(createdAt.getHours() - hoursAgo);

        // Calculate the REAL solar zone for this location and time
        const zone = calculateSolarZone(longitude, createdAt);

        await prisma.capsule.create({
            data: {
                opUserId: demoUser.id,
                latitude,
                longitude,
                solarZoneIndex: zone, // Correctly calculated zone
                contentText: text,
                createdAt,
                expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
            }
        });

        createdCount++;
        if (createdCount % 50 === 0) {
            console.log(`✓ Created ${createdCount} capsules...`);
        }
    }

    console.log(`\n🎉 Successfully created ${createdCount} demo capsules with consistent Solar Zones!`);
    console.log('Capsules are now correctly distributed in time and space.');
}

seed()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
