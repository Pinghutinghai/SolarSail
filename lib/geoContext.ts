// Helper functions for geographic and temporal context

import * as d3 from 'd3';

/**
 * Calculate distance between two points on Earth using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const coords1: [number, number] = [lng1, lat1];
    const coords2: [number, number] = [lng2, lat2];

    // d3.geoDistance returns radians, convert to kilometers
    const radiansDistance = d3.geoDistance(coords1, coords2);
    const earthRadius = 6371; // km
    return radiansDistance * earthRadius;
}

/**
 * Format distance for display
 * @param km Distance in kilometers
 * @returns Formatted string like "8,234 km" or "342 km"
 */
export function formatDistance(km: number): string {
    return `${Math.round(km).toLocaleString()} km`;
}

/**
 * Calculate local solar time based on longitude
 * @param longitude Longitude of the location
 * @param date Current UTC date/time
 * @returns Local date/time object
 */
export function getLocalTime(longitude: number, date: Date = new Date()): Date {
    // Each degree of longitude represents 4 minutes of time
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();

    // Calculate offset in hours from longitude
    const offsetHours = longitude / 15;

    const localDate = new Date(date);
    localDate.setUTCHours(utcHours + offsetHours);

    return localDate;
}

/**
 * Get time of day classification based on solar position
 * @param longitude Location longitude
 * @param latitude Location latitude
 * @param date Date/time to check
 * @returns Time of day description in Chinese
 */
export function getTimeOfDay(longitude: number, latitude: number, date: Date = new Date()): string {
    const localTime = getLocalTime(longitude, date);
    const hour = localTime.getHours();
    const minute = localTime.getMinutes();
    const timeValue = hour + minute / 60;

    // Approximate sunrise/sunset times (can be refined with solar calculations)
    const sunrise = 6;
    const sunset = 18;

    if (timeValue >= sunrise - 1 && timeValue < sunrise + 1) {
        return '黎明';
    } else if (timeValue >= sunrise + 1 && timeValue < 12) {
        return '上午';
    } else if (timeValue >= 12 && timeValue < 14) {
        return '正午';
    } else if (timeValue >= 14 && timeValue < sunset - 1) {
        return '下午';
    } else if (timeValue >= sunset - 1 && timeValue < sunset + 1) {
        return '黄昏';
    } else {
        return '夜晚';
    }
}

/**
 * Get approximate location name from coordinates
 * Uses offline TopoJSON data for reverse geocoding
 */
import * as topojson from 'topojson-client';

let worldTopology: any = null;
let countryFeatures: any = null;
// ISO 3166-1 numeric code to name mapping (Partial list for demo, can be expanded)
const countryNames: Record<string, string> = {
    "004": "Afghanistan", "008": "Albania", "010": "Antarctica", "012": "Algeria", "024": "Angola", "032": "Argentina",
    "036": "Australia", "040": "Austria", "031": "Azerbaijan", "044": "Bahamas", "050": "Bangladesh", "051": "Armenia",
    "052": "Barbados", "056": "Belgium", "060": "Bermuda", "064": "Bhutan", "068": "Bolivia", "070": "Bosnia and Herzegovina",
    "072": "Botswana", "076": "Brazil", "084": "Belize", "090": "Solomon Islands", "092": "British Virgin Islands",
    "096": "Brunei Darussalam", "100": "Bulgaria", "104": "Myanmar", "108": "Burundi", "112": "Belarus", "116": "Cambodia",
    "120": "Cameroon", "124": "Canada", "132": "Cabo Verde", "140": "Central African Republic", "144": "Sri Lanka",
    "148": "Chad", "152": "Chile", "156": "China", "170": "Colombia", "174": "Comoros", "178": "Congo",
    "180": "Democratic Republic of the Congo", "184": "Cook Islands", "188": "Costa Rica", "191": "Croatia", "192": "Cuba",
    "196": "Cyprus", "203": "Czech Republic", "204": "Benin", "208": "Denmark", "212": "Dominica", "214": "Dominican Republic",
    "218": "Ecuador", "222": "El Salvador", "226": "Equatorial Guinea", "231": "Ethiopia", "232": "Eritrea", "233": "Estonia",
    "234": "Faroe Islands", "238": "Falkland Islands", "242": "Fiji", "246": "Finland", "250": "France", "254": "French Guiana",
    "258": "French Polynesia", "260": "French Southern Territories", "262": "Djibouti", "266": "Gabon", "268": "Georgia",
    "270": "Gambia", "275": "Palestinian Territory", "276": "Germany", "288": "Ghana", "292": "Gibraltar", "296": "Kiribati",
    "300": "Greece", "304": "Greenland", "308": "Grenada", "312": "Guadeloupe", "316": "Guam", "320": "Guatemala",
    "324": "Guinea", "328": "Guyana", "332": "Haiti", "334": "Heard Island and McDonald Islands", "336": "Holy See",
    "340": "Honduras", "344": "Hong Kong", "348": "Hungary", "352": "Iceland", "356": "India", "360": "Indonesia",
    "364": "Iran", "368": "Iraq", "372": "Ireland", "376": "Israel", "380": "Italy", "384": "Côte d'Ivoire",
    "388": "Jamaica", "392": "Japan", "398": "Kazakhstan", "400": "Jordan", "404": "Kenya", "408": "North Korea",
    "410": "South Korea", "414": "Kuwait", "417": "Kyrgyzstan", "418": "Lao People's Democratic Republic", "422": "Lebanon",
    "426": "Lesotho", "428": "Latvia", "430": "Liberia", "434": "Libya", "438": "Liechtenstein", "440": "Lithuania",
    "442": "Luxembourg", "446": "Macao", "450": "Madagascar", "454": "Malawi", "458": "Malaysia", "462": "Maldives",
    "466": "Mali", "470": "Malta", "474": "Martinique", "478": "Mauritania", "480": "Mauritius", "484": "Mexico",
    "492": "Monaco", "496": "Mongolia", "498": "Moldova", "500": "Montserrat", "504": "Morocco", "508": "Mozambique",
    "512": "Oman", "516": "Namibia", "520": "Nauru", "524": "Nepal", "528": "Netherlands", "531": "Curaçao",
    "533": "Aruba", "534": "Sint Maarten (Dutch part)", "535": "Bonaire, Sint Eustatius and Saba", "540": "New Caledonia",
    "548": "Vanuatu", "554": "New Zealand", "558": "Nicaragua", "562": "Niger", "566": "Nigeria", "570": "Niue",
    "574": "Norfolk Island", "578": "Norway", "580": "Northern Mariana Islands", "581": "United States Minor Outlying Islands",
    "583": "Micronesia", "584": "Marshall Islands", "585": "Palau", "586": "Pakistan", "591": "Panama", "598": "Papua New Guinea",
    "600": "Paraguay", "604": "Peru", "608": "Philippines", "612": "Pitcairn", "616": "Poland", "620": "Portugal",
    "624": "Guinea-Bissau", "626": "Timor-Leste", "630": "Puerto Rico", "634": "Qatar", "638": "Réunion", "642": "Romania",
    "643": "Russian Federation", "646": "Rwanda", "652": "Saint Barthélemy", "654": "Saint Helena", "659": "Saint Kitts and Nevis",
    "660": "Anguilla", "662": "Saint Lucia", "663": "Saint Martin (French part)", "666": "Saint Pierre and Miquelon",
    "670": "Saint Vincent and the Grenadines", "674": "San Marino", "678": "Sao Tome and Principe", "682": "Saudi Arabia",
    "686": "Senegal", "688": "Serbia", "690": "Seychelles", "694": "Sierra Leone", "702": "Singapore", "703": "Slovakia",
    "704": "Vietnam", "705": "Slovenia", "706": "Somalia", "710": "South Africa", "716": "Zimbabwe", "724": "Spain",
    "728": "South Sudan", "729": "Sudan", "732": "Western Sahara", "740": "Suriname", "744": "Svalbard and Jan Mayen",
    "748": "Eswatini", "752": "Sweden", "756": "Switzerland", "760": "Syrian Arab Republic", "762": "Tajikistan",
    "764": "Thailand", "768": "Togo", "772": "Tokelau", "776": "Tonga", "780": "Trinidad and Tobago", "784": "United Arab Emirates",
    "788": "Tunisia", "792": "Turkey", "795": "Turkmenistan", "796": "Turks and Caicos Islands", "798": "Tuvalu",
    "800": "Uganda", "804": "Ukraine", "807": "North Macedonia", "818": "Egypt", "826": "United Kingdom",
    "834": "Tanzania", "840": "United States", "850": "United States Virgin Islands",
    "854": "Burkina Faso", "858": "Uruguay", "860": "Uzbekistan", "862": "Venezuela", "876": "Wallis and Futuna",
    "882": "Samoa", "887": "Yemen", "894": "Zambia"
};

export async function initializeGeocoding() {
    if (worldTopology) return;
    try {
        const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        worldTopology = await response.json();
        // Pre-calculate features for faster lookup
        countryFeatures = (topojson.feature(worldTopology, worldTopology.objects.countries) as any).features;
    } catch (error) {
        console.error("Failed to load geocoding data", error);
    }
}

export async function getLocationName(latitude: number, longitude: number): Promise<string> {
    if (!worldTopology) {
        await initializeGeocoding();
    }

    if (!countryFeatures) return `${Math.abs(latitude).toFixed(1)}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(1)}°${longitude >= 0 ? 'E' : 'W'}`;

    // Check which country contains the point
    // d3.geoContains accepts [longitude, latitude]
    const point: [number, number] = [longitude, latitude];

    for (const feature of countryFeatures) {
        if (d3.geoContains(feature, point)) {
            const id = feature.id.toString().padStart(3, '0'); // Ensure 3-digit string for map lookup
            return countryNames[id] || "Unknown Territory";
        }
    }

    return "High Seas";
}
