import { addMinutes } from 'date-fns';

export const TOTAL_ZONES = 51;
export const DEGREES_PER_ZONE = 360 / TOTAL_ZONES; // ~7.0588 degrees
export const MINUTES_PER_DEGREE = 4;

/**
 * Calculates the Solar Time for a given longitude and UTC time.
 * Solar Time = UTC + (Longitude * 4 minutes)
 */
export function calculateSolarTime(longitude: number, utcDate: Date = new Date()): Date {
    const offsetMinutes = longitude * MINUTES_PER_DEGREE;
    return addMinutes(utcDate, offsetMinutes);
}

/**
 * Determines the Solar Zone Index (0-50) for a given longitude.
 * Zones are 0-indexed.
 * 
 * The logic is:
 * Map longitude (-180 to 180) to a 0-360 range (or similar) and divide by zone width.
 * However, the PRD implies zones are based on "Solar Time" matching.
 * But strictly speaking, a static location belongs to a static zone index if we divide the globe.
 * 
 * Let's define Zone 0 as starting at some meridian (e.g., -180 or 0).
 * If we want "matching", users in Zone X are those whose solar time is currently T.
 * 
 * Wait, the PRD says:
 * "Visual Matching: User sees their dot move through zones."
 * "Visual Discovery: When user enters a new zone, they see capsules anchored there."
 * 
 * This implies the USER moves through zones as time passes?
 * NO. The user's location is fixed (mostly). The EARTH rotates.
 * 
 * Re-reading F-01: "User sees their dot ... 'pass through' F-02 defined 'Solar Zones'."
 * This is slightly confusing.
 * If the user is at Beijing (fixed), they are always at Longitude 116.
 * If "Solar Zones" are fixed geographic slices (like time zones), the user never moves out of them unless they travel.
 * 
 * BUT F-01 says: "User sees their dot... 'pass through' ... zones".
 * AND F-02 says: "Backend indexes 51 zones... Matching is based on this index."
 * 
 * INTERPRETATION A: Zones are fixed geographic regions (like UTC+8).
 * If so, a user in Beijing is ALWAYS in Zone X.
 * Then "Discovery" happens when... what?
 * F-04: "When user ... enters a new solar_zone_index ... system fetches capsules."
 * This implies the user IS moving relative to the zones.
 * 
 * INTERPRETATION B: Zones are TIME slots relative to the sun (e.g., "The 8:00 AM Zone").
 * As the earth turns, Beijing enters the "8:00 AM Zone", then the "9:00 AM Zone".
 * 
 * Let's look at F-01 again: "User sees their dot ... 'pass through' ... zones".
 * And F-03: "Capsule is 'anchored' to user's CURRENT solar_zone_index."
 * 
 * If I drop a capsule at 8:00 AM Solar Time (Zone 8AM), does it stay in Zone 8AM?
 * F-03: "Capsule exists for 7 days."
 * F-04: "User enters new zone... sees capsules."
 * 
 * If Zones are "Time Slots" (e.g. 0 = Midnight, 25 = Noon):
 * - At 8:00 AM, I am in Zone "8AM". I drop a bottle.
 * - The bottle is tagged Zone "8AM".
 * - 1 hour later, I am at 9:00 AM. I am now in Zone "9AM".
 * - Someone else at 7:00 AM (west of me) enters Zone "8AM" in 1 hour.
 * 
 * THIS MATCHES "The Vision": "Connect those ... experiencing the SAME solar rhythm."
 * So if I am at 8AM, I connect with others at 8AM.
 * 
 * So, Solar Zone Index is NOT static to Longitude.
 * It is a function of (Longitude + Time).
 * 
 * Formula:
 * Solar Time (minutes from midnight) = (UTC_minutes + Longitude * 4) % 1440
 * Zone Index = floor(Solar Time / (1440 / 51))
 * 
 * Let's verify.
 * 24 hours = 1440 minutes.
 * 51 zones.
 * Each zone = 1440 / 51 ≈ 28.23 minutes.
 * 
 * So, `getSolarZoneIndex(longitude, utcDate)`
 */
export function getSolarZoneIndex(longitude: number, utcDate: Date = new Date()): number {
    const solarTime = calculateSolarTime(longitude, utcDate);

    // Get minutes from start of the day (0-1439)
    // We need to normalize this carefully.
    // solarTime is a Date object.

    const hours = solarTime.getUTCHours(); // Use UTC methods because calculateSolarTime returns a shifted Date object where "UTC" components represent the Solar Time?
    // Wait, calculateSolarTime adds minutes to the actual UTC time.
    // Example: UTC is 12:00. Longitude 0. Solar Time is 12:00.
    // Example: UTC is 12:00. Longitude +15 (1 hour east). Solar Time is 13:00.
    // The Date object returned by `addMinutes` will have its internal timestamp shifted.
    // If we use `getUTCHours()` on the result, we get the "Solar Hour".

    const minutes = solarTime.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Normalize to 0-1440 range (handle potential negative or overflow if not handled by Date)
    // Date object handles overflow/underflow correctly, but let's be sure about the "day" wrap.
    // We only care about the time of day.

    const zoneWidth = 1440 / TOTAL_ZONES;
    const zoneIndex = Math.floor(totalMinutes / zoneWidth) % TOTAL_ZONES;

    return zoneIndex;
}

/**
 * Calculates the Sun's geographic position (sub-solar point) for a given UTC date.
 * Uses accurate approximations for Solar Declination and the Equation of Time.
 * Returns [longitude, latitude] in degrees.
 */
export function getSunPosition(date: Date = new Date()): [number, number] {
    const start = new Date(date.getUTCFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // Fractional year in radians
    // (2 * PI / 365) * (dayOfYear - 1) + (hour - 12) / 24 ... simplified
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (date.getUTCHours() - 12) / 24);

    // Equation of Time (in minutes)
    // Empirical formula
    const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
        - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));

    // Solar Declination (in radians)
    const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
        - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
        - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

    const declDegrees = decl * (180 / Math.PI);

    // Sun Longitude
    // 12:00 UTC is roughly 0 longitude, but corrected by Equation of Time.
    // 15 degrees per hour.
    // If UTC is 12:00, Sun is at 0 (minus EoT adjustment).
    // If UTC is 0:00, Sun is at 180.
    // Formula: 180 - (UTC_Hours + UTC_Minutes/60 + EoT_Minutes/60) * 15

    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const sunLng = 180 - (utcHours + eqTime / 60) * 15;

    // Normalize longitude to -180 to 180
    const normalizedLng = ((sunLng + 180) % 360) - 180;

    return [normalizedLng, declDegrees];
}
