/**
 * Database of Israeli cities & geographic coordinates.
 * Used for high-performance plotting of businesses on Google Maps.
 */

export const ISRAEL_CITIES_COORDS = {
  // Major metropolitan centers
  'תל אביב - יפו': { lat: 32.0853, lng: 34.7818 },
  'תל אביב': { lat: 32.0853, lng: 34.7818 },
  'יפו': { lat: 32.0515, lng: 34.7523 },
  'ירושלים': { lat: 31.7683, lng: 35.2137 },
  'חיפה': { lat: 32.7940, lng: 34.9896 },
  'ראשון לציון': { lat: 31.9730, lng: 34.7925 },
  'פתח תקווה': { lat: 32.0840, lng: 34.8878 },
  'אשדוד': { lat: 31.8044, lng: 34.6553 },
  'נתניה': { lat: 32.3215, lng: 34.8532 },
  'באר שבע': { lat: 31.2530, lng: 34.7915 },
  'בני ברק': { lat: 32.0841, lng: 34.8354 },
  'חולון': { lat: 32.0158, lng: 34.7874 },
  'רמת גן': { lat: 32.0823, lng: 34.8107 },
  'אשקלון': { lat: 31.6688, lng: 34.5743 },
  'רחובות': { lat: 31.8928, lng: 34.8113 },
  'בת ים': { lat: 32.0234, lng: 34.7516 },
  'בית שמש': { lat: 31.7470, lng: 34.9881 },
  'כפר סבא': { lat: 32.1750, lng: 34.9069 },
  'הרצליה': { lat: 32.1663, lng: 34.8432 },
  'חדרה': { lat: 32.4340, lng: 34.9197 },
  'מודיעין-מכבים-רעות': { lat: 31.8903, lng: 35.0104 },
  'מודיעין': { lat: 31.8903, lng: 35.0104 },
  'רמלה': { lat: 31.9275, lng: 34.8660 },
  'רעננה': { lat: 32.1848, lng: 34.8713 },
  'נצרת': { lat: 32.7019, lng: 35.2979 },
  'נצרת עילית': { lat: 32.7100, lng: 35.3300 },
  'נוף הגליל': { lat: 32.7100, lng: 35.3300 },
  'לוד': { lat: 31.9514, lng: 34.8881 },
  'הוד השרון': { lat: 32.1557, lng: 34.8872 },
  'גבעתיים': { lat: 32.0722, lng: 34.8089 },
  'קרית אתא': { lat: 32.8058, lng: 35.1058 },
  'נהריה': { lat: 33.0059, lng: 35.0941 },
  'קרית גת': { lat: 31.6100, lng: 34.7642 },
  'עפולה': { lat: 32.6074, lng: 35.2897 },
  'אילת': { lat: 29.5577, lng: 34.9519 },
  'ראש העין': { lat: 32.0956, lng: 34.9566 },
  'טבריה': { lat: 32.7922, lng: 35.5312 },
  'עכו': { lat: 32.9274, lng: 35.0818 },
  'קרית מוצקין': { lat: 32.8339, lng: 35.0772 },
  'קרית ים': { lat: 32.8464, lng: 35.0689 },
  'קרית ביאליק': { lat: 32.8278, lng: 35.0847 },
  'נס ציונה': { lat: 31.9304, lng: 34.7981 },
  'אלעד': { lat: 32.0519, lng: 34.9519 },
  'יבנה': { lat: 31.8780, lng: 34.7397 },
  'רמת השרון': { lat: 32.1466, lng: 34.8384 },
  'כרמיאל': { lat: 32.9199, lng: 35.2901 },
  'טירת כרמל': { lat: 32.7608, lng: 34.9708 },
  'נתיבות': { lat: 31.4172, lng: 34.5886 },
  'אופקים': { lat: 31.3144, lng: 34.6206 },
  'שדרות': { lat: 31.5215, lng: 34.5962 },
  'מגדל העמק': { lat: 32.6742, lng: 35.2403 },
  'קרית אונו': { lat: 32.0628, lng: 34.8580 },
  'אור יהודה': { lat: 32.0294, lng: 34.8569 },
  'דימונה': { lat: 31.0667, lng: 35.0333 },
  'צפת': { lat: 32.9646, lng: 35.4960 },
  'חריש': { lat: 32.4642, lng: 35.0483 },
  'פרדס חנה-כרכור': { lat: 32.4719, lng: 34.9725 },
  'פרדס חנה': { lat: 32.4719, lng: 34.9725 },
  'כרכור': { lat: 32.4850, lng: 34.9950 },
  'קצרין': { lat: 32.9919, lng: 35.6903 },
  'קרית שמונה': { lat: 33.2073, lng: 35.5721 },
  'מעלה אדומים': { lat: 31.7908, lng: 35.2974 },
  'אריאל': { lat: 32.1044, lng: 35.1744 },
  'גבעת שמואל': { lat: 32.0789, lng: 34.8483 },
  'טייבה': { lat: 32.2667, lng: 35.0100 },
  'טירה': { lat: 32.2333, lng: 34.9500 },
  'שפרעם': { lat: 32.8056, lng: 35.1708 },
  'סחנין': { lat: 32.8600, lng: 35.3042 },
  'באקה אל-גרביה': { lat: 32.4194, lng: 35.0361 },
  'טמרה': { lat: 32.8533, lng: 35.1983 },
  'אום אל-פחם': { lat: 32.5186, lng: 35.1528 },
  'דאלית אל-כרמל': { lat: 32.6953, lng: 35.0531 },
  'כפר קאסם': { lat: 32.1147, lng: 34.9753 },
  'קלנסווה': { lat: 32.2858, lng: 34.9819 },
  'ערד': { lat: 31.2589, lng: 35.2128 },
  'זכרון יעקב': { lat: 32.5714, lng: 34.9531 },
  'מבשרת ציון': { lat: 31.7981, lng: 35.1517 },
  'אבן יהודה': { lat: 32.2694, lng: 34.8872 },
  'גן יבנה': { lat: 31.7872, lng: 34.7153 },
  'יהוד-מונוסון': { lat: 32.0319, lng: 34.8911 },
  'יהוד': { lat: 32.0319, lng: 34.8911 },
  'נוה מונוסון': { lat: 32.0250, lng: 34.8770 },
  'גדרה': { lat: 31.8128, lng: 34.7781 },
  'מזכרת בתיה': { lat: 31.8544, lng: 34.8458 },
  'קרית עקרון': { lat: 31.8606, lng: 34.8211 },
  'שוהם': { lat: 31.9989, lng: 34.9458 },
  'תל מונד': { lat: 32.2536, lng: 34.9189 },
  'בני עייש': { lat: 31.7917, lng: 34.7583 },
  'כפר יונה': { lat: 32.3167, lng: 34.9333 },
  'כוכב יאיר': { lat: 32.2289, lng: 34.9961 },
  'צור יגאל': { lat: 32.2289, lng: 34.9961 },
  'אזור': { lat: 32.0242, lng: 34.8067 },
  'קרית מלאכי': { lat: 31.7289, lng: 34.7456 },
  'מצפה רמון': { lat: 30.6100, lng: 34.8000 },
  'ירוחם': { lat: 30.9881, lng: 34.9306 },
  'נשר': { lat: 32.7667, lng: 35.0333 },
  'גני תקווה': { lat: 32.0600, lng: 34.8700 },
  'סביון': { lat: 32.0500, lng: 34.8800 },
  'ביתר עילית': { lat: 31.6969, lng: 35.1169 },
  'מודיעין עילית': { lat: 31.9331, lng: 35.0425 },
  'גבעת זאב': { lat: 31.8592, lng: 35.1678 },
  'אפרת': { lat: 31.6542, lng: 35.1528 },
  'מעלות-תרשיחא': { lat: 33.0167, lng: 35.2750 },
  'שלומי': { lat: 33.0733, lng: 35.1433 },
  'קציר': { lat: 32.4939, lng: 35.0931 },
  'עספיא': { lat: 32.7167, lng: 35.0500 },
  'מגאר': { lat: 32.8897, lng: 35.4056 },
  'ירכא': { lat: 32.9558, lng: 35.1950 },
  'כפר מנדא': { lat: 32.8100, lng: 35.2600 },
  'ראמה': { lat: 32.9367, lng: 35.3672 },
  'ריינה': { lat: 32.7239, lng: 35.3181 },
  'איכסאל': { lat: 32.6842, lng: 35.3183 },
  'טורעאן': { lat: 32.7842, lng: 35.3725 },
  'יפיע': { lat: 32.6869, lng: 35.2678 },
  'כאבול': { lat: 32.8703, lng: 35.2094 },
  'כפר כנא': { lat: 32.7478, lng: 35.3389 },
  'אבו גוש': { lat: 31.8081, lng: 35.1081 },
  'עין מאהל': { lat: 32.7183, lng: 35.3481 },
  'בסמת טבעון': { lat: 32.7267, lng: 35.1517 },
  'בני ציון': { lat: 32.2197, lng: 34.8683 },
  'יד בנימין': { lat: 31.7969, lng: 34.8219 },
  'פוריידיס': { lat: 32.5983, lng: 34.9517 },
  'מגידו': { lat: 32.5786, lng: 35.1794 },
  'יסוד המעלה': { lat: 33.0561, lng: 35.5975 },
  'ראש פינה': { lat: 32.9692, lng: 35.5392 },
  'חצור הגלילית': { lat: 32.9819, lng: 35.5458 },
  'בית שאן': { lat: 32.4975, lng: 35.4989 },
  'עומר': { lat: 31.2639, lng: 34.8431 },
  'מיתר': { lat: 31.3308, lng: 34.9353 },
  'להבים': { lat: 31.3789, lng: 34.8197 },
  'עין גדי': { lat: 31.4558, lng: 35.3889 },
  'ים המלח': { lat: 31.2000, lng: 35.3600 },
  'בית דגן': { lat: 32.0017, lng: 34.8297 },
  'קרית טבעון': { lat: 32.7167, lng: 35.1333 },
  "ג'סר א-זרקא": { lat: 32.5350, lng: 34.9150 },
  'גסר א-זרקא': { lat: 32.5350, lng: 34.9150 },
  'עתלית': { lat: 32.6900, lng: 34.9400 },
  'טירת יהודה': { lat: 32.0167, lng: 34.9167 },
  'צור משה': { lat: 32.2833, lng: 34.9000 },
  'כפר ויתקין': { lat: 32.3833, lng: 34.8667 },
  'בצרה': { lat: 32.2000, lng: 34.8667 },
  'רשפון': { lat: 32.2000, lng: 34.8167 },
  'שפיים': { lat: 32.2167, lng: 34.8167 },
  'געש': { lat: 32.2333, lng: 34.8167 },
  'יקום': { lat: 32.2500, lng: 34.8333 },
  'אודים': { lat: 32.2667, lng: 34.8500 },
  'בית יהושע': { lat: 32.2667, lng: 34.8667 },
  'כפר שמריהו': { lat: 32.1833, lng: 34.8167 },
  'נווה אפרים': { lat: 32.0300, lng: 34.8800 },
  'רינתיה': { lat: 32.0500, lng: 34.9167 },
  'מזור': { lat: 32.0500, lng: 34.9333 },
  'באר יעקב': { lat: 31.9333, lng: 34.8333 },
  'משמר השבעה': { lat: 32.0000, lng: 34.8333 },
  'חמד': { lat: 32.0000, lng: 34.8500 },
  'צפריה': { lat: 32.0000, lng: 34.8667 },
  'כפר חב\"ד': { lat: 31.9833, lng: 34.8500 },
  'כפר חבד': { lat: 31.9833, lng: 34.8500 },
  'אחיעזר': { lat: 31.9833, lng: 34.8667 },
  'יגל': { lat: 31.9833, lng: 34.8833 },
  'זיתן': { lat: 31.9667, lng: 34.8833 },
  'ישרש': { lat: 31.9000, lng: 34.8667 },
  'מצליח': { lat: 31.9167, lng: 34.8833 },
  'סתריה': { lat: 31.8833, lng: 34.8500 },
  'כפר ביל\"ו': { lat: 31.8833, lng: 34.8167 },
  'כפר בילו': { lat: 31.8833, lng: 34.8167 },
  'גבעת ברנר': { lat: 31.8667, lng: 34.8000 },
  'בניה': { lat: 31.8500, lng: 34.7667 },
  'קדרון': { lat: 31.8167, lng: 34.7833 },
  'חפץ חיים': { lat: 31.7833, lng: 34.8000 },
  'בית חלקיה': { lat: 31.7833, lng: 34.8167 },
  'יסודות': { lat: 31.8000, lng: 34.8667 },
  'נצר חזני': { lat: 31.8000, lng: 34.8500 },
  'גני יוחנן': { lat: 31.8333, lng: 34.8667 },
  'יציץ': { lat: 31.8500, lng: 34.8833 },
  'רמות מאיר': { lat: 31.8667, lng: 34.8667 },
  'פתחיה': { lat: 31.8833, lng: 34.9000 },
  'פדיה': { lat: 31.8833, lng: 34.9167 },
  'כרמי יוסף': { lat: 31.8500, lng: 34.9167 },
  'משמר דוד': { lat: 31.8167, lng: 34.9000 },
  'טל שחר': { lat: 31.8000, lng: 34.8833 },
  'חולדה': { lat: 31.8167, lng: 34.8833 },
  'בקוע': { lat: 31.8000, lng: 34.9333 },
  'נחשון': { lat: 31.8167, lng: 34.9500 },
  'נווה שלום': { lat: 31.8333, lng: 34.9833 },
  'לטרון': { lat: 31.8333, lng: 34.9833 },
  'מסילת ציון': { lat: 31.8000, lng: 35.0167 },
  'תעוז': { lat: 31.7833, lng: 34.9833 },
  'תרום': { lat: 31.7833, lng: 35.0000 },
  'אשתאול': { lat: 31.7833, lng: 35.0167 },
  'צרעה': { lat: 31.7500, lng: 34.9667 },
  'מחסיה': { lat: 31.7333, lng: 35.0167 },
  'נחם': { lat: 31.7500, lng: 35.0000 },
  'זכריה': { lat: 31.7000, lng: 34.9500 },
  'לוזית': { lat: 31.6833, lng: 34.8833 },
  'עגור': { lat: 31.6833, lng: 34.9167 },
  'שריגים': { lat: 31.6667, lng: 34.9167 },
  'לי-און': { lat: 31.6667, lng: 34.9167 },
  'גבעת ישעיהו': { lat: 31.6500, lng: 34.9333 },
  'צפרירים': { lat: 31.6500, lng: 34.9500 },
  'נווה מיכאל': { lat: 31.6667, lng: 34.9500 },
  'רוגלית': { lat: 31.6667, lng: 34.9500 },
  'אדרת': { lat: 31.6500, lng: 34.9833 },
  'נתיב הל\"ה': { lat: 31.6833, lng: 34.9833 },
  'נתיב הל"ה': { lat: 31.6833, lng: 34.9833 },
  'צור הדסה': { lat: 31.7167, lng: 35.1000 },
  'מבוא ביתר': { lat: 31.7167, lng: 35.1167 },
  'נס הרים': { lat: 31.7333, lng: 35.0500 },
  'בר גיורא': { lat: 31.7333, lng: 35.0667 },
  'מטה בנימין': { lat: 31.9500, lng: 35.2500 },
  'עפרה': { lat: 31.9500, lng: 35.2500 },
  'שילה': { lat: 32.0500, lng: 35.2833 },
  'עלי': { lat: 32.0667, lng: 35.2667 },
  'קרני שומרון': { lat: 32.1667, lng: 35.1000 },
  'קדומים': { lat: 32.2167, lng: 35.1667 },
  'אלפי מנשה': { lat: 32.1667, lng: 35.0333 },
  'אורנית': { lat: 32.1333, lng: 35.0167 },
  'עץ אפרים': { lat: 32.1333, lng: 35.0500 },
  'אלקנה': { lat: 32.1167, lng: 35.0333 },
  'ברקן': { lat: 32.1167, lng: 35.1000 },
  'רבבה': { lat: 32.1167, lng: 35.1333 },
  'יקיר': { lat: 32.1333, lng: 35.1500 },
  'נופים': { lat: 32.1333, lng: 35.1333 },
  'עמנואל': { lat: 32.1500, lng: 35.1500 }
};

// Cache for pre-geocoded coordinates
let geocodedLocationsMap = null;
let geocodedLocationsPromise = null;

/**
 * Loads pre-geocoded store locations dictionary
 */
export async function loadGeocodedLocations() {
  if (geocodedLocationsMap) return geocodedLocationsMap;
  if (geocodedLocationsPromise) return geocodedLocationsPromise;

  geocodedLocationsPromise = (async () => {
    try {
      const res = await fetch('data/geocoded_locations.json');
      if (res.ok) {
        geocodedLocationsMap = await res.json();
      }
    } catch (e) {
      console.warn('Could not load geocoded_locations.json:', e);
    }
    return geocodedLocationsMap || {};
  })();

  return geocodedLocationsPromise;
}

export function setGeocodedLocations(map) {
  geocodedLocationsMap = map;
}

/**
 * Returns precise latitude and longitude for any store.
 * 1. Uses exact store lat/lng if available on store record.
 * 2. Uses exact pre-geocoded address coordinates from geocoded dictionary.
 * 3. Falls back to true city center with minimal micro-offset (less than 20m)
 *    so stores in the same city are never placed onto false random streets.
 */
export function getStoreCoordinates(store) {
  if (!store || !store.city) return null;
  const rawCity = store.city.trim();
  if (rawCity.toLowerCase() === 'online' || rawCity.includes('אונליין')) return null;

  // 1. Direct coordinates on store record
  if (store.lat && store.lng) {
    const lat = Number(store.lat);
    const lng = Number(store.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat > 29.3 && lat < 33.5 && lng > 34.1 && lng < 35.9) {
      return {
        lat,
        lng,
        cityLat: lat,
        cityLng: lng,
        isExact: true
      };
    }
  }

  // 2. Exact coordinates from geocoded database by store ID
  if (geocodedLocationsMap && store.id) {
    const g = geocodedLocationsMap[String(store.id)];
    if (g && g.lat && g.lng) {
      return {
        lat: Number(g.lat),
        lng: Number(g.lng),
        cityLat: Number(g.lat),
        cityLng: Number(g.lng),
        isExact: true
      };
    }
  }

  // 3. Fallback to city coordinates
  let base = ISRAEL_CITIES_COORDS[rawCity];
  if (!base) {
    // Try fuzzy match
    const cleanCity = rawCity.replace(/['"״]/g, '').trim();
    for (const [key, coords] of Object.entries(ISRAEL_CITIES_COORDS)) {
      if (key.includes(cleanCity) || cleanCity.includes(key)) {
        base = coords;
        break;
      }
    }
  }

  // Fallback to central region if completely unknown city in Israel
  if (!base) {
    base = { lat: 32.0853, lng: 34.7818 }; // Tel Aviv area fallback
  }

  // Tiny deterministic micro-offset (within 10-25 meters) so multiple stores at city center
  // don't overlap completely on the exact same pixel, but never wander into wrong streets
  const idNum = Number(store.id) || 1;
  const angle = ((idNum * 137.5) % 360) * (Math.PI / 180);
  const microRadius = 0.00012 + ((idNum * 17) % 30) * 0.000004;

  const latOffset = Math.sin(angle) * microRadius;
  const lngOffset = Math.cos(angle) * microRadius * 1.15;

  return {
    lat: base.lat + latOffset,
    lng: base.lng + lngOffset,
    cityLat: base.lat,
    cityLng: base.lng,
    isExact: false
  };
}
