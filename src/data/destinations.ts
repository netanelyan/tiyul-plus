import type { Destination } from '@/lib/types';

// נתוני דוגמה שנאספו ידנית. דירוגים הם הערכה מערכתית; כשרות ושעות פתיחה
// משתנות - תמיד לוודא מול המקום לפני ההגעה.
// כשמחברים ספק חיצוני (Google Places / TripAdvisor), הנתונים כאן משמשים
// כבסיס והספק מעשיר אותם בדירוגים, תמונות ושעות אמת.
// מידע ברמת מדינה (ויזה, מטבע, סים, תשלומים) גר ב-countries.ts;
// כאן נשאר רק מה שעירוני באמת: טיסות לשדה של העיר, תחבורה, כשרות.

export const destinations: Destination[] = [
  {
    slug: 'vienna',
    name: 'וינה',
    nameLocal: 'Vienna / Wien',
    countrySlug: 'austria',
    flag: '🇦🇹',
    center: { lat: 48.2082, lng: 16.3719 },
    zoom: 12,
    tagline: 'ארמונות, קפה וינאי וקהילה יהודית תוססת',
    photo:
      'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'קתדרלת סנט סטפן',
      nameLocal: "St. Stephen's Cathedral",
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wien_-_Stephansdom_%281%29.JPG/500px-Wien_-_Stephansdom_%281%29.JPG',
      blurb:
        'הלב הגותי של וינה - גג האריחים הצבעוני והצריח הגבוה נראים מכל רחבי העיר.',
    },
    summary:
      'וינה היא יעד מושלם לישראלים: טיסה ישירה וקצרה, עיר מהלכת, שפע תרבות - וקהילה יהודית פעילה ברובע השני עם מסעדות כשרות וסופרמרקט כשר. משלבים ארמונות קיסריים עם בתי קפה, ובסוף היום עולים לכרם על גבעות יער וינה.',
    bestSeason: 'אפריל-יוני, ספטמבר-אוקטובר (דצמבר לשווקי חג המולד)',
    places: [
      {
        id: 'vie-schonbrunn',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Wien_-_Schloss_Sch%C3%B6nbrunn.JPG/500px-Wien_-_Schloss_Sch%C3%B6nbrunn.JPG',
        tags: ['families', 'history', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'ארמון שנברון',
        nameLocal: 'Schönbrunn Palace',
        category: 'attraction',
        lat: 48.1845,
        lng: 16.3122,
        description:
          'ארמון הקיץ של הקיסרות ההבסבורגית עם 1,441 חדרים וגנים עצומים. שווה לטפס לגלוריאטה לתצפית על כל העיר.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Schönbrunn+Palace',
      },
      {
        id: 'vie-stephansdom',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Wien_-_Stephansdom_%281%29.JPG/500px-Wien_-_Stephansdom_%281%29.JPG',
        tags: ['history'],
        priceLevel: 1,
        mustSee: true,
        name: 'קתדרלת סנט סטפן',
        nameLocal: "St. Stephen's Cathedral",
        category: 'attraction',
        lat: 48.2085,
        lng: 16.3731,
        description:
          'הלב של וינה. גג האריחים הצבעוני והצריח הגותי נראים מכל מקום - אפשר לעלות לצריח הדרומי (343 מדרגות).',
        rating: 4.7,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=St+Stephens+Cathedral+Vienna',
      },
      {
        id: 'vie-hofburg',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Wien_-_Neue_Hofburg.JPG/500px-Wien_-_Neue_Hofburg.JPG',
        tags: ['history', 'art'],
        priceLevel: 2,
        name: 'ארמון הופבורג',
        nameLocal: 'Hofburg Palace',
        category: 'attraction',
        lat: 48.2065,
        lng: 16.3657,
        description:
          'מתחם הארמונות של מרכז העיר: מוזיאון סיסי, הדירות הקיסריות ובית הספר לרכיבה הספרדי.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Hofburg+Vienna',
      },
      {
        id: 'vie-belvedere',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Palacio_Belvedere%2C_Viena%2C_Austria%2C_2020-02-01%2C_DD_93-95_HDR.jpg/500px-Palacio_Belvedere%2C_Viena%2C_Austria%2C_2020-02-01%2C_DD_93-95_HDR.jpg',
        tags: ['art', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'ארמון בלוודר',
        nameLocal: 'Belvedere Palace',
        category: 'museum',
        lat: 48.1915,
        lng: 16.38,
        description:
          'ארמון בארוק עם אוסף האמנות האוסטרית החשוב בעולם, כולל "הנשיקה" של קלימט.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Belvedere+Vienna',
      },
      {
        id: 'vie-prater',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Prater_vom_Riesenrad.jpg/500px-Prater_vom_Riesenrad.jpg',
        tags: ['families', 'nightlife'],
        priceLevel: 1,
        name: 'פארק הפראטר',
        nameLocal: 'Prater',
        category: 'attraction',
        lat: 48.2167,
        lng: 16.3958,
        description:
          'לונה פארק היסטורי עם הגלגל הענק המפורסם (Riesenrad) משנת 1897. כיף בערב, וקרוב לרובע היהודי.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Prater+Vienna',
      },
      {
        id: 'vie-kahlenberg',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/D%C3%B6bling_%28Wien%29_-_Kahlenberg_%282%29.JPG/500px-D%C3%B6bling_%28Wien%29_-_Kahlenberg_%282%29.JPG',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        name: 'קלנברג ויער וינה',
        nameLocal: 'Kahlenberg',
        category: 'viewpoint',
        lat: 48.2727,
        lng: 16.335,
        description:
          'גבעה על גבול יער וינה עם תצפית על הדנובה וכל העיר. יורדים ברגל דרך הכרמים לכיוון גרינצינג.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Kahlenberg',
      },
      {
        id: 'vie-naschmarkt',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Wien_-_Naschmarkt.JPG/500px-Wien_-_Naschmarkt.JPG',
        tags: ['foodie'],
        priceLevel: 0,
        name: 'שוק נאשמרקט',
        nameLocal: 'Naschmarkt',
        category: 'attraction',
        lat: 48.1985,
        lng: 16.363,
        description:
          'שוק האוכל הגדול של וינה - דוכני תבלינים, פירות ואוכל רחוב. סגור בימי ראשון.',
        rating: 4.3,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Naschmarkt',
      },
      {
        id: 'vie-cafe-central',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Palais_Ferstel.jpg/500px-Palais_Ferstel.jpg',
        tags: ['foodie', 'romantic', 'history'],
        priceLevel: 2,
        name: 'קפה צנטרל',
        nameLocal: 'Café Central',
        category: 'cafe',
        lat: 48.2103,
        lng: 16.3655,
        description:
          'בית הקפה הווינאי המפורסם ביותר, כאן ישבו פרויד וטרוצקי. לא כשר - אבל שווה לראות את הבניין; יש תור.',
        rating: 4.4,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Cafe+Central+Vienna',
      },
      {
        id: 'vie-mariahilfer',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Wien_07_Mariahilfer_Stra%C3%9Fe_Shopping_f.jpg/500px-Wien_07_Mariahilfer_Stra%C3%9Fe_Shopping_f.jpg',
        tags: ['families'],
        priceLevel: 2,
        name: 'רחוב מריאהילפר',
        nameLocal: 'Mariahilfer Straße',
        category: 'shopping',
        lat: 48.1978,
        lng: 16.3505,
        description:
          'רחוב הקניות הגדול של וינה - 1.8 ק"מ של רשתות, חנויות מעצבים ובתי קפה. סגור לרכבים ברובו.',
        rating: 4.3,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Mariahilfer+Strasse',
      },
      {
        id: 'vie-alef-alef',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'הקהילה היהודית של וינה (IKG)' },
        name: 'אלף אלף (מסעדה כשרה)',
        nameLocal: 'Alef Alef',
        category: 'kosher-food',
        lat: 48.2115,
        lng: 16.3745,
        description:
          'מסעדת בשרים כשרה ותיקה ליד בית הכנסת העירוני (Stadttempel) במרכז העיר הישן.',
        rating: 4.3,
        kosherNote: 'בשרי, בהשגחת הקהילה היהודית של וינה (IKG). לוודא שעות מראש.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Alef+Alef+Vienna',
      },
      {
        id: 'vie-bahur-tov',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'השגחה מקומית - לוודא מול המקום' },
        name: 'בחור טוב (גריל כשר)',
        nameLocal: 'Bahur Tov',
        category: 'kosher-food',
        lat: 48.2155,
        lng: 16.38,
        description:
          'גריל בשרי כשר ברובע השני (לאופולדשטאט), הלב של הקהילה היהודית - שיפודים, המבורגרים ואווירה ישראלית.',
        rating: 4.2,
        kosherNote: 'בשרי. ברובע יש עוד מסעדות כשרות ובתי כנסת במרחק הליכה.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Bahur+Tov+Vienna',
      },
      {
        id: 'vie-koscherland',
        priceLevel: 1,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'חנות - מוצרים ארוזים עם הכשרים' },
        name: 'קושרלנד (סופר כשר)',
        nameLocal: 'Koscherland',
        category: 'kosher-market',
        lat: 48.218,
        lng: 16.3755,
        description:
          'סופרמרקט כשר ברובע השני - מצרכים, מוצרי חלב ולחם. מציל לשבתות ולמי שמבשל בדירה.',
        kosherNote: 'סגור בשבת. לקנות בערב שישי מוקדם.',
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Koscherland+Vienna',
      },
      {
        id: 'vie-kunsthistorisches',
        name: 'מוזיאון תולדות האמנות',
        nameLocal: 'Kunsthistorisches Museum',
        category: 'museum',
        lat: 48.2038,
        lng: 16.3617,
        description:
          'מוזיאון האמנות הקיסרי מול הופבורג - ברויגל, ורמר ורפאל באחד הבניינים המפוארים של הרינג.',
        rating: 4.7,
        durationMin: 150,
        tags: ['art', 'history'],
        priceLevel: 2,
        mustSee: true,
        externalUrl: 'https://maps.google.com/?q=Kunsthistorisches+Museum',
      },
      {
        id: 'vie-albertina',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Wien_-_Albertina.JPG/500px-Wien_-_Albertina.JPG',
        name: 'מוזיאון אלברטינה',
        nameLocal: 'Albertina',
        category: 'museum',
        lat: 48.2043,
        lng: 16.3684,
        description:
          'אוסף גרפיקה ואמנות מודרנית בארמון שבקצה הופבורג - דירר, מונה ופיקאסו, עם מרפסת נוף לאופרה.',
        rating: 4.6,
        durationMin: 120,
        tags: ['art'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Albertina+Vienna',
      },
      {
        id: 'vie-rathaus',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Wien_Rathaus_hochaufl%C3%B6send.jpg/500px-Wien_Rathaus_hochaufl%C3%B6send.jpg',
        name: 'בית העירייה וכיכר הרטהאוס',
        nameLocal: 'Rathausplatz',
        category: 'attraction',
        lat: 48.2108,
        lng: 16.3572,
        description:
          'בית העירייה הניאו-גותי והכיכר שלפניו - זירת האירועים של וינה: שוקי חג המולד בחורף וקולנוע פתוח בקיץ.',
        rating: 4.5,
        durationMin: 45,
        tags: ['families', 'history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Rathausplatz+Vienna',
      },
      {
        id: 'vie-opera',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Wiener_Staatsoper_Front.jpg/500px-Wiener_Staatsoper_Front.jpg',
        name: 'האופרה הממלכתית',
        nameLocal: 'Vienna State Opera',
        category: 'attraction',
        lat: 48.2029,
        lng: 16.369,
        description:
          'מבתי האופרה המפורסמים בעולם. גם בלי כרטיס להצגה - הבניין מרשים ויש סיורים מודרכים ביום.',
        rating: 4.6,
        durationMin: 60,
        tags: ['art', 'romantic'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Vienna+State+Opera',
      },
      {
        id: 'vie-donauinsel',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Wien_-_Donauinsel_mit_den_Donaubr%C3%BCcken.JPG/500px-Wien_-_Donauinsel_mit_den_Donaubr%C3%BCcken.JPG',
        name: 'אי הדנובה',
        nameLocal: 'Donauinsel',
        category: 'nature',
        lat: 48.228,
        lng: 16.411,
        description:
          'האי הארוך שבלב הדנובה - קילומטרים של מסלולי אופניים, דשא ופינות רחצה. הבריחה הירוקה של הווינאים.',
        rating: 4.4,
        durationMin: 150,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Donauinsel',
      },
      {
        id: 'vie-stadtpark',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Stadtpark_station.JPG/500px-Stadtpark_station.JPG',
        name: 'שטאדטפארק ופסל שטראוס',
        nameLocal: 'Stadtpark',
        category: 'nature',
        lat: 48.2049,
        lng: 16.3803,
        description:
          'הפארק העירוני עם פסל הזהב של יוהאן שטראוס - הפוגה ירוקה קלאסית במרחק הליכה מהרינג.',
        rating: 4.4,
        durationMin: 45,
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Stadtpark+Vienna',
      },
      {
        id: 'vie-hundertwasser',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Wien_-_Hundertwasserhaus_%2803%29.JPG/500px-Wien_-_Hundertwasserhaus_%2803%29.JPG',
        name: 'בית הונדרטוואסר',
        nameLocal: 'Hundertwasserhaus',
        category: 'attraction',
        lat: 48.2073,
        lng: 16.3942,
        description:
          'בית הדירות הצבעוני והמעוקל של האמן הונדרטוואסר - אחת הפינות המצולמות בעיר. צופים מבחוץ.',
        rating: 4.4,
        durationMin: 30,
        tags: ['art'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Hundertwasserhaus',
      },
      {
        id: 'vie-graben',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Wien_-_Graben_%282%29.JPG/500px-Wien_-_Graben_%282%29.JPG',
        name: 'גראבן וקולמרקט',
        nameLocal: 'Graben & Kohlmarkt',
        category: 'shopping',
        lat: 48.2089,
        lng: 16.3693,
        description:
          'מדרחוב היוקרה של המרכז עם עמוד המגפה הבארוקי - ממשיכים לקולמרקט ולחנויות הוותיקות של וינה.',
        rating: 4.5,
        durationMin: 60,
        tags: ['romantic'],
        priceLevel: 3,
        externalUrl: 'https://maps.google.com/?q=Graben+Vienna',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'מרכז העיר הקיסרי',
        placeIds: ['vie-stephansdom', 'vie-hofburg', 'vie-cafe-central', 'vie-alef-alef'],
        notes: 'הכול במרחק הליכה. מסיימים בארוחת ערב כשרה ליד בית הכנסת העירוני.',
      },
      {
        day: 2,
        title: 'שנברון ובלוודר',
        placeIds: ['vie-schonbrunn', 'vie-naschmarkt', 'vie-belvedere'],
        notes: 'לשנברון מגיעים עם U4. את קלימט משאירים לאחר הצהריים כשהאור יפה בגנים.',
      },
      {
        day: 3,
        title: 'הרובע היהודי ופראטר',
        placeIds: ['vie-koscherland', 'vie-bahur-tov', 'vie-prater'],
        notes: 'יום רגוע ברובע השני: קניות בסופר הכשר, צהריים בגריל, ואחר צהריים בפראטר.',
      },
      {
        day: 4,
        title: 'יער וינה והכרמים',
        placeIds: ['vie-kahlenberg'],
        notes: 'אוטובוס 38A לפסגה, ירידה רגלית דרך הכרמים. להביא מים ונעליים נוחות.',
      },
    ],
    practical: {
      flights:
        'טיסות ישירות מנתב"ג (אל על, אוסטריאן, ווִיז אייר ועוד) - כ-3.5 שעות. לרוב יש טיסות כל יום.',
      gettingAround:
        'תחבורה ציבורית מעולה (U-Bahn, חשמליות). כרטיס 24/48/72 שעות משתלם. מרכז העיר מהלך.',
      kosherOverview:
        'מהקהילות החזקות באירופה: מסעדות כשרות, סופר כשר ובתי כנסת - רובם ברובע השני (לאופולדשטאט) ובמרכז. אין בעיה להסתדר שבוע שלם עם אוכל כשר.',
    },
  },
  {
    slug: 'bratislava',
    name: 'ברטיסלבה',
    nameLocal: 'Bratislava',
    countrySlug: 'slovakia',
    flag: '🇸🇰',
    center: { lat: 48.1439, lng: 17.1097 },
    zoom: 13,
    tagline: 'עיר בירה קומפקטית, 45 דקות מווינה',
    photo:
      'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'טירת ברטיסלבה',
      nameLocal: 'Bratislava Castle',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Bratislava_-_Burg_%28b%29.JPG/500px-Bratislava_-_Burg_%28b%29.JPG',
      blurb:
        'הטירה הלבנה על הגבעה, סמל העיר, עם תצפית על הדנובה ועל שלוש מדינות בו-זמנית.',
    },
    summary:
      'ברטיסלבה מצטרפת מושלם לטיול וינה - עיר עתיקה קטנה וצבעונית על הדנובה, טירה על גבעה, ומחירים נוחים משמעותית מאוסטריה. לישראלים היא גם עיר עם היסטוריה יהודית עמוקה (החת"ם סופר פעל כאן). מספיקים לה יום-יומיים.',
    bestSeason: 'מאי-ספטמבר',
    places: [
      {
        id: 'bts-castle',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Bratislava_-_Burg_%28b%29.JPG/500px-Bratislava_-_Burg_%28b%29.JPG',
        tags: ['history', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'טירת ברטיסלבה',
        nameLocal: 'Bratislava Castle',
        category: 'attraction',
        lat: 48.1421,
        lng: 17.1,
        description:
          'הטירה הלבנה שעל הגבעה - סמל העיר. התצפית על הדנובה ועל שלוש מדינות (סלובקיה, אוסטריה, הונגריה) שווה את הטיפוס.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Bratislava+Castle',
      },
      {
        id: 'bts-oldtown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Slovakia-03123_-_Inside_of_St._Michael%27s_Gate_%2832286853995%29.jpg/500px-Slovakia-03123_-_Inside_of_St._Michael%27s_Gate_%2832286853995%29.jpg',
        tags: ['history', 'families'],
        priceLevel: 0,
        mustSee: true,
        name: 'העיר העתיקה ושער מיכאל',
        nameLocal: "Old Town & Michael's Gate",
        category: 'attraction',
        lat: 48.145,
        lng: 17.1067,
        description:
          'סמטאות צבעוניות, פסלי ברונזה משעשעים (צ\'ומיל המפורסם) ובתי קפה. הכול מהלך תוך שעה-שעתיים בנחת.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Michaels+Gate+Bratislava',
      },
      {
        id: 'bts-ufo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Most_SNP%2C_Bratislava_%28by_Pudelek%29.JPG/500px-Most_SNP%2C_Bratislava_%28by_Pudelek%29.JPG',
        tags: ['romantic'],
        priceLevel: 2,
        name: 'מגדל UFO',
        nameLocal: 'UFO Observation Deck',
        category: 'viewpoint',
        lat: 48.1387,
        lng: 17.1046,
        description:
          'תצפית בצורת חללית על גשר SNP מעל הדנובה. הכי יפה בשקיעה.',
        rating: 4.4,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=UFO+Bratislava',
      },
      {
        id: 'bts-blue-church',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Blue_Church%2C_Bratislava_02.jpg/500px-Blue_Church%2C_Bratislava_02.jpg',
        tags: ['art'],
        priceLevel: 0,
        name: 'הכנסייה הכחולה',
        nameLocal: 'Blue Church (St. Elizabeth)',
        category: 'attraction',
        lat: 48.1436,
        lng: 17.1146,
        description:
          'כנסיית אר-נובו בצבע תכלת פסטלי שנראית כמו עוגה - אחת המצולמות בעיר.',
        rating: 4.6,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Blue+Church+Bratislava',
      },
      {
        id: 'bts-devin',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Devin02.jpg/500px-Devin02.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        name: 'טירת דווין',
        nameLocal: 'Devín Castle',
        category: 'nature',
        lat: 48.1739,
        lng: 16.9787,
        description:
          'חורבות טירה דרמטיות במפגש הנהרות מורבה ודנובה, 20 דקות נסיעה מהעיר. שילוב מושלם של טבע והיסטוריה.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Devin+Castle',
      },
      {
        id: 'bts-eurovea',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Slovakia_bratislava_ruzinov_nivy.jpg/500px-Slovakia_bratislava_ruzinov_nivy.jpg',
        tags: ['families'],
        priceLevel: 2,
        name: 'קניון יורוביאה',
        nameLocal: 'Eurovea Galleria',
        category: 'shopping',
        lat: 48.1405,
        lng: 17.1231,
        description:
          'קניון מודרני על טיילת הדנובה - שילוב נעים של קניות, מסעדות וישיבה מול הנהר.',
        rating: 4.4,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Eurovea+Bratislava',
      },
      {
        id: 'bts-chatam-sofer',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Mauz%C3%B3leum_Chatama_S%C3%B3fera_4.jpg/500px-Mauz%C3%B3leum_Chatama_S%C3%B3fera_4.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'אתר הזיכרון של החת"ם סופר',
        nameLocal: 'Chatam Sofer Memorial',
        category: 'attraction',
        lat: 48.1408,
        lng: 17.0946,
        description:
          'ציון קברו של רבי משה סופר, מגדולי הרבנים של המאה ה-19, ששרד מבית הקברות היהודי הישן. ביקור בתיאום מראש.',
        rating: 4.7,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chatam+Sofer+Memorial',
      },
      {
        id: 'bts-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'חב"ד - ארוחות בתיאום מראש' },
        name: 'בית חב"ד ברטיסלבה',
        nameLocal: 'Chabad Bratislava',
        category: 'kosher-food',
        lat: 48.146,
        lng: 17.103,
        description:
          'הכתובת לאוכל כשר וארוחות שבת בעיר. אין מסעדות כשרות מסחריות - מתאמים ארוחות מראש עם בית חב"ד.',
        kosherNote: 'ארוחות בתיאום מראש בלבד. לחלופין - וינה במרחק 45 דקות.',
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chabad+Bratislava',
      },
      {
        id: 'bts-primates',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Palacio_primacial%2C_Bratislava%2C_Eslovaquia%2C_2020-02-01%2C_DD_30.jpg/500px-Palacio_primacial%2C_Bratislava%2C_Eslovaquia%2C_2020-02-01%2C_DD_30.jpg',
        name: 'ארמון הפרימאס',
        nameLocal: "Primate's Palace",
        category: 'attraction',
        lat: 48.144,
        lng: 17.109,
        description:
          'הארמון הוורוד הניאו-קלאסי שבו נחתם שלום פרסבורג אחרי קרב אוסטרליץ. בפנים - אולם המראות ואוסף שטיחי קיר.',
        rating: 4.5,
        durationMin: 45,
        tags: ['history', 'art'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Primates+Palace+Bratislava',
      },
      {
        id: 'bts-main-square',
        name: 'הכיכר הראשית',
        nameLocal: 'Hlavné námestie',
        category: 'attraction',
        lat: 48.1437,
        lng: 17.1085,
        description:
          'לב העיר העתיקה: בית העירייה הישן, בתים צבעוניים, מזרקת רולנד ודוכנים עונתיים.',
        rating: 4.5,
        durationMin: 45,
        tags: ['history', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Hlavne+namestie+Bratislava',
      },
      {
        id: 'bts-cathedral',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Catedral_de_San_Mart%C3%ADn%2C_Bratislava%2C_Eslovaquia%2C_2020-02-01%2C_DD_48.jpg/500px-Catedral_de_San_Mart%C3%ADn%2C_Bratislava%2C_Eslovaquia%2C_2020-02-01%2C_DD_48.jpg',
        name: 'קתדרלת מרטין הקדוש',
        nameLocal: "St Martin's Cathedral",
        category: 'attraction',
        lat: 48.1417,
        lng: 17.1048,
        description:
          'קתדרלת ההכתרה הגותית - כאן הוכתרו מלכי הונגריה, וביניהם מריה תרזה, לאורך כמעט 300 שנה.',
        rating: 4.4,
        durationMin: 45,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=St+Martins+Cathedral+Bratislava',
      },
      {
        id: 'bts-slavin',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Monumento_a_Slav%C3%ADn%2C_Bratislava%2C_Eslovaquia%2C_2020-02-01%2C_DD_13.jpg/500px-Monumento_a_Slav%C3%ADn%2C_Bratislava%2C_Eslovaquia%2C_2020-02-01%2C_DD_13.jpg',
        name: 'אנדרטת סלאבין',
        nameLocal: 'Slavín',
        category: 'viewpoint',
        lat: 48.1533,
        lng: 17.0997,
        description:
          'אנדרטת הזיכרון הסובייטית על גבעה שקטה מעל העיר - נוף פתוח ושכונת שגרירויות ווילות מסביב.',
        rating: 4.4,
        durationMin: 60,
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Slavin+Bratislava',
      },
      {
        id: 'bts-kamzik',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Bratislava_-_Fernsehturm_%28a%29.JPG/500px-Bratislava_-_Fernsehturm_%28a%29.JPG',
        name: 'מגדל קמז׳יק',
        nameLocal: 'Kamzík TV Tower',
        category: 'viewpoint',
        lat: 48.1817,
        lng: 17.0951,
        description:
          'מגדל שידור על גבעה מיוערת מעל העיר - תצפית, מסעדה מסתובבת ומסלולי הליכה ביער מסביב.',
        rating: 4.3,
        durationMin: 120,
        tags: ['outdoors'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Kamzik+Tower',
      },
      {
        id: 'bts-hviezdoslav',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Hviezdoslavovo_n%C3%A1mestie_%2810267450433%29.jpg/500px-Hviezdoslavovo_n%C3%A1mestie_%2810267450433%29.jpg',
        name: 'כיכר הביילזדוסלב והטיילת',
        nameLocal: 'Hviezdoslavovo námestie',
        category: 'attraction',
        lat: 48.1408,
        lng: 17.1074,
        description:
          'השדרה האלגנטית בין התיאטרון הלאומי לדנובה - עצים, מזרקות ובתי קפה. נעימה במיוחד בערב.',
        rating: 4.5,
        durationMin: 45,
        tags: ['romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Hviezdoslavovo+namestie',
      },
      {
        id: 'bts-old-market',
        name: 'אולם השוק הישן',
        nameLocal: 'Stará tržnica',
        category: 'attraction',
        lat: 48.1445,
        lng: 17.1122,
        description:
          'אולם השוק ההיסטורי מ-1910 - בשבתות מתקיים בו שוק אוכל ותוצרת מקומית, ובשאר השבוע אירועים.',
        rating: 4.2,
        durationMin: 60,
        tags: ['foodie'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Stara+trznica+Bratislava',
      },
      {
        id: 'bts-synagogue',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Orthodox_Synagogue%2C_Heydukova_street%2C_Bratislava.jpg/500px-Orthodox_Synagogue%2C_Heydukova_street%2C_Bratislava.jpg',
        name: 'בית הכנסת ברחוב היידוקובה',
        nameLocal: 'Heydukova Street Synagogue',
        category: 'attraction',
        lat: 48.1466,
        lng: 17.1112,
        description:
          'בית הכנסת היחיד שנותר בעיר (1926, בסגנון קוביסטי נדיר) - פעיל עד היום, עם תערוכה קטנה על הקהילה.',
        rating: 4.4,
        durationMin: 45,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Heydukova+Synagogue',
      },
      {
        id: 'bts-jewish-museum',
        name: 'המוזיאון לתרבות יהודית',
        nameLocal: 'Museum of Jewish Culture',
        category: 'museum',
        lat: 48.1414,
        lng: 17.103,
        description:
          'מוזיאון בבית היסטורי ברחוב הגטו לשעבר, מתחת לטירה - סיפורה של יהדות סלובקיה לאורך הדורות.',
        rating: 4.3,
        durationMin: 60,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Museum+of+Jewish+Culture+Bratislava',
      },
      {
        id: 'bts-janka-krala',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Sad_Janka_Krala%2C_Bratislava%2C_Slovakia.JPG/500px-Sad_Janka_Krala%2C_Bratislava%2C_Slovakia.JPG',
        name: 'פארק יאנקו קראל',
        nameLocal: 'Sad Janka Kráľa',
        category: 'nature',
        lat: 48.1348,
        lng: 17.1074,
        description:
          'מהפארקים הציבוריים הוותיקים באירופה, על הגדה הדרומית של הדנובה - מול מגדל ה-UFO וליד קניון אאופרק.',
        rating: 4.3,
        durationMin: 60,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Sad+Janka+Krala',
      },
      {
        id: 'bts-nedbalka',
        name: 'גלריית נדבלקה',
        nameLocal: 'Nedbalka Gallery',
        category: 'museum',
        lat: 48.145,
        lng: 17.1105,
        description:
          'גלריה לאמנות סלובקית מודרנית בבניין עם אטריום לבן מפתיע - מכנים אותה "הגוגנהיים הקטן של ברטיסלבה".',
        rating: 4.5,
        durationMin: 60,
        tags: ['art'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Nedbalka+Gallery',
      },
      {
        id: 'bts-zelezna',
        name: 'ז׳לזנה סטודניצ׳קה (יער העיר)',
        nameLocal: 'Železná studnička',
        category: 'nature',
        lat: 48.183,
        lng: 17.093,
        description:
          'עמק מיוער עם אגמים, שבילי הליכה ופינות פיקניק - הריאה הירוקה של ברטיסלבה, רבע שעה מהמרכז.',
        rating: 4.5,
        durationMin: 150,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Zelezna+studnicka',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'העיר העתיקה והטירה',
        placeIds: ['bts-oldtown', 'bts-blue-church', 'bts-castle', 'bts-ufo'],
        notes: 'יום רגלי קלאסי. מסיימים בשקיעה במגדל ה-UFO.',
      },
      {
        day: 2,
        title: 'מורשת יהודית וטבע',
        placeIds: ['bts-chatam-sofer', 'bts-devin', 'bts-chabad'],
        notes: 'את אתר החת"ם סופר מתאמים מראש. לדווין נוסעים באוטובוס 29 או בשיט על הדנובה.',
      },
    ],
    practical: {
      flights:
        'הכי נוח לטוס לווינה (טיסות ישירות מנתב"ג) - משדה התעופה של וינה עד ברטיסלבה כשעה בשאטל/רכב. יש גם טיסות לואו-קוסט ישירות לברטיסלבה בחלק מהעונות.',
      gettingAround: 'הכול מהלך במרכז. לדווין - אוטובוס 29. וינה-ברטיסלבה: אוטובוס FlixBus/RegioJet או רכבת, כשעה.',
      kosherOverview:
        'אין מסעדות כשרות מסחריות - בית חב"ד מארח בתיאום מראש, והעיר במרחק 45 דקות מהמערך הכשר המלא של וינה. מומלץ להצטייד בסופר הכשר בווינה.',
    },
  },
  {
    slug: 'prague',
    name: 'פראג',
    nameLocal: 'Prague / Praha',
    countrySlug: 'czechia',
    flag: '🇨🇿',
    center: { lat: 50.0875, lng: 14.4213 },
    zoom: 13,
    tagline: 'עיר הזהב: גשרים, טירות והרובע היהודי המפורסם בעולם',
    photo:
      'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'גשר קרל',
      nameLocal: 'Charles Bridge',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg/500px-Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg',
      blurb:
        'גשר גותי מהמאה ה-14 החוצה את הוולטבה, מעוטר בשלושים פסלי קדושים.',
    },
    summary:
      'היעד האהוב על ישראלים במרכז אירופה, ובצדק: עיר יפה להפליא שכולה מהלכת, הרובע היהודי העתיק עם בית הכנסת אלטנוישול ובית הקברות הישן, מסעדות כשרות במרחק הליכה - ומחירי בירה שוברי שוויון (למי ששותה).',
    bestSeason: 'אפריל-יוני, ספטמבר-אוקטובר',
    places: [
      {
        id: 'prg-charles',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg/500px-Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_img3.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'גשר קרל',
        nameLocal: 'Charles Bridge',
        category: 'attraction',
        lat: 50.0865,
        lng: 14.4114,
        description:
          'הגשר הגותי מהמאה ה-14 עם 30 פסלים מעל הוולטבה. להגיע בזריחה או אחרי 21:00 כדי לחוות אותו בלי ההמונים.',
        rating: 4.8,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Charles+Bridge',
      },
      {
        id: 'prg-castle',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Karl%C5%AFv_most_Praha%2C_Star%C3%A9_M%C4%9Bsto_20170810_007.jpg/500px-Karl%C5%AFv_most_Praha%2C_Star%C3%A9_M%C4%9Bsto_20170810_007.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'מצודת פראג',
        nameLocal: 'Prague Castle',
        category: 'attraction',
        lat: 50.09,
        lng: 14.4,
        description:
          'מתחם הטירות הגדול בעולם לפי גינס, עם קתדרלת ויטוס המרהיבה וסמטת הזהב. חצי יום לפחות.',
        rating: 4.7,
        durationMin: 210,
        externalUrl: 'https://maps.google.com/?q=Prague+Castle',
      },
      {
        id: 'prg-oldtown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg/500px-Prague_07-2016_View_from_Old_Town_Hall_Tower_img3.jpg',
        tags: ['history', 'families'],
        priceLevel: 0,
        mustSee: true,
        name: 'כיכר העיר העתיקה והשעון האסטרונומי',
        nameLocal: 'Old Town Square',
        category: 'attraction',
        lat: 50.0875,
        lng: 14.4213,
        description:
          'הלב הפועם של פראג: השעון האסטרונומי מ-1410, כנסיית טין והאווירה המפורסמת. מכאן הכול קרוב.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Old+Town+Square+Prague',
      },
      {
        id: 'prg-josefov',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Jewish_tawnhall_%28Prague%29.jpg/500px-Jewish_tawnhall_%28Prague%29.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'הרובע היהודי (יוזפוב)',
        nameLocal: 'Josefov - Jewish Quarter',
        category: 'museum',
        lat: 50.09,
        lng: 14.418,
        description:
          'בית הכנסת אלטנוישול (מהעתיקים בעולם שעדיין פעילים), בית הקברות הישן ובית הכנסת הספרדי. כרטיס משולב למוזיאון היהודי מכסה הכול.',
        rating: 4.8,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Josefov+Prague',
      },
      {
        id: 'prg-petrin',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Petrin_Praha.jpg/500px-Petrin_Praha.jpg',
        tags: ['outdoors', 'families', 'romantic'],
        priceLevel: 1,
        name: 'גבעת פטרשין',
        nameLocal: 'Petřín Hill',
        category: 'nature',
        lat: 50.0833,
        lng: 14.395,
        description:
          'גבעה ירוקה עם רכבל, גנים ומגדל תצפית בהשראת אייפל. הפוגה מושלמת מהעיר.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Petrin+Hill',
      },
      {
        id: 'prg-palladium',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Kas%C3%A1rna_Ji%C5%99%C3%ADho_z_Pod%C4%9Bbradm_%28Nov%C3%A9_M%C4%9Bsto%29%2C_Praha_1%2C_n%C3%A1m._Republiky%2C_Na_Po%C5%99%C3%AD%C4%8D%C3%AD_1%2C_Nov%C3%A9_M%C4%9Bsto.JPG/500px-Kas%C3%A1rna_Ji%C5%99%C3%ADho_z_Pod%C4%9Bbradm_%28Nov%C3%A9_M%C4%9Bsto%29%2C_Praha_1%2C_n%C3%A1m._Republiky%2C_Na_Po%C5%99%C3%AD%C4%8D%C3%AD_1%2C_Nov%C3%A9_M%C4%9Bsto.JPG',
        tags: ['families'],
        priceLevel: 2,
        name: 'קניון פלאדיום ורחוב פאריז׳סקה',
        nameLocal: 'Palladium & Pařížská Street',
        category: 'shopping',
        lat: 50.0888,
        lng: 14.4283,
        description:
          'פלאדיום - הקניון הגדול במרכז (200 חנויות), ופאריז׳סקה הסמוכה - שדרת היוקרה של פראג, בין כיכר העיר לרובע היהודי.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Palladium+Prague',
      },
      {
        id: 'prg-king-solomon',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'גלאט, בהשגחת רבנות פראג' },
        name: 'קינג סולומון (מסעדה כשרה)',
        nameLocal: 'King Solomon',
        category: 'kosher-food',
        lat: 50.0897,
        lng: 14.4185,
        description:
          'המסעדה הכשרה הוותיקה של פראג, בלב הרובע היהודי - מטבח יהודי-אירופי מסורתי. מציעה גם ארוחות שבת בתשלום מראש.',
        rating: 4.3,
        kosherNote: 'בשרי, גלאט. ארוחות שבת בהזמנה ותשלום מראש בלבד.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=King+Solomon+Prague',
      },
      {
        id: 'prg-dinitz',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'רבנות פראג' },
        name: 'דיניץ (מסעדה כשרה)',
        nameLocal: 'Dinitz',
        category: 'kosher-food',
        lat: 50.0907,
        lng: 14.421,
        description:
          'מסעדה בשרית כשרה ליד בית הכנסת הספרדי - שווארמה, המבורגרים ומנות ישראליות. פופולרית בין מטיילים ישראלים.',
        rating: 4.2,
        kosherNote: 'בשרי, בהשגחת הרבנות של פראג.',
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Dinitz+Prague',
      },
      {
        id: 'prg-wenceslas',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Prague_Praha_2014_Holmstad_Vaclavplassen_i_nybyen_Nove_Mesto_flott.jpg/500px-Prague_Praha_2014_Holmstad_Vaclavplassen_i_nybyen_Nove_Mesto_flott.jpg',
        name: 'כיכר ואצלב',
        nameLocal: 'Wenceslas Square',
        category: 'attraction',
        lat: 50.081,
        lng: 14.4278,
        description:
          'הכיכר-שדרה שבה התרחשו הרגעים הגדולים של צ׳כיה המודרנית, מ-1918 ועד מהפכת הקטיפה. שוקקת ומלאת חנויות.',
        rating: 4.5,
        durationMin: 60,
        tags: ['history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Wenceslas+Square',
      },
      {
        id: 'prg-mala-strana',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/19.7.16_Prague_Castle_12_%2828395711206%29.jpg/500px-19.7.16_Prague_Castle_12_%2828395711206%29.jpg',
        name: 'מאלה סטראנה',
        nameLocal: 'Malá Strana',
        category: 'attraction',
        lat: 50.088,
        lng: 14.4037,
        description:
          'הרובע הבארוקי שמתחת למצודה - סמטאות מרוצפות, חצרות נסתרות וכנסיית ניקולס הקדוש. יורדים אליו מגשר קרל.',
        rating: 4.7,
        durationMin: 120,
        tags: ['romantic', 'history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Mala+Strana',
      },
      {
        id: 'prg-vysehrad',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Parn%C3%ADk_Vy%C5%A1ehrad_pod_Vy%C5%A1ehradem.jpg/500px-Parn%C3%ADk_Vy%C5%A1ehrad_pod_Vy%C5%A1ehradem.jpg',
        name: 'מצודת וישהראד',
        nameLocal: 'Vyšehrad',
        category: 'attraction',
        lat: 50.0645,
        lng: 14.418,
        description:
          'המצודה השנייה של פראג, על צוק מעל הוולטבה - בזיליקה, בית הקברות הלאומי ונוף רגוע הרחק מההמונים.',
        rating: 4.6,
        durationMin: 120,
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Vysehrad',
      },
      {
        id: 'prg-letna',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Praha%2C_Letn%C3%A1%2C_sad.jpg/500px-Praha%2C_Letn%C3%A1%2C_sad.jpg',
        name: 'פארק לטנה',
        nameLocal: 'Letná Park',
        category: 'nature',
        lat: 50.0955,
        lng: 14.415,
        description:
          'פארק על מצוק מעל הנהר עם התצפית הקלאסית על גשרי הוולטבה - ובקיץ גן בירה גדול מתחת לעצים.',
        rating: 4.6,
        durationMin: 90,
        tags: ['outdoors', 'nightlife'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Letna+Park',
      },
      {
        id: 'prg-dancing-house',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Tanzendes_Haus_2023.jpg/500px-Tanzendes_Haus_2023.jpg',
        name: 'הבית הרוקד',
        nameLocal: 'Dancing House',
        category: 'attraction',
        lat: 50.0755,
        lng: 14.4141,
        description:
          'בניין "ג׳ינג׳ר ופרד" של פרנק גרי - האייקון המודרני של פראג על גדת הנהר. עוצרים לצילום מבחוץ.',
        rating: 4.4,
        durationMin: 20,
        tags: ['art'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Dancing+House',
      },
      {
        id: 'prg-national-museum',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Museo_Nacional%2C_Praga%2C_Rep%C3%BAblica_Checa%2C_2022-07-02%2C_DD_265-267_HDR.jpg/500px-Museo_Nacional%2C_Praga%2C_Rep%C3%BAblica_Checa%2C_2022-07-02%2C_DD_265-267_HDR.jpg',
        name: 'המוזיאון הלאומי',
        nameLocal: 'National Museum',
        category: 'museum',
        lat: 50.0789,
        lng: 14.4304,
        description:
          'הבניין הניאו-רנסנסי המשופץ בראש כיכר ואצלב - אוספי היסטוריה וטבע מתחת לכיפה מפוארת.',
        rating: 4.5,
        durationMin: 120,
        tags: ['history', 'families'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=National+Museum+Prague',
      },
      {
        id: 'prg-kampa',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Kampa5.jpg/500px-Kampa5.jpg',
        name: 'אי קמפה',
        nameLocal: 'Kampa Island',
        category: 'nature',
        lat: 50.0843,
        lng: 14.4083,
        description:
          'האי השקט שמתחת לגשר קרל - "ונציה של פראג" עם תעלת השדים, פארק על המים ומוזיאון לאמנות מודרנית.',
        rating: 4.6,
        durationMin: 60,
        tags: ['romantic', 'outdoors', 'art'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Kampa+Island',
      },
      {
        id: 'prg-strahov',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Praha%2C_Hradcany_-_Strahovsky_klaster_%28pohled_z_ulice_Uvoz%29.jpg/500px-Praha%2C_Hradcany_-_Strahovsky_klaster_%28pohled_z_ulice_Uvoz%29.jpg',
        name: 'מנזר סטרהוב והספרייה',
        nameLocal: 'Strahov Monastery',
        category: 'attraction',
        lat: 50.0862,
        lng: 14.3896,
        description:
          'מנזר על הגבעה מעל מאלה סטראנה עם שני אולמות ספרייה בארוקיים מהיפים בעולם - ובדרך תצפית יפה על העיר.',
        rating: 4.6,
        durationMin: 90,
        tags: ['history', 'art'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Strahov+Monastery',
      },
      {
        id: 'prg-havelske',
        name: 'שוק האבל',
        nameLocal: 'Havelské tržiště',
        category: 'shopping',
        lat: 50.0846,
        lng: 14.4229,
        description:
          'שוק הרחוב הפתוח היחיד ששרד במרכז ההיסטורי (נזכר כבר ב-1232) - פירות, מזכרות ועבודות עץ.',
        rating: 4.2,
        durationMin: 30,
        tags: ['foodie'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Havelske+trziste',
      },
      {
        id: 'prg-zizkov',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Prague_NZ7_0367_%2844311730795%29.jpg/500px-Prague_NZ7_0367_%2844311730795%29.jpg',
        name: 'מגדל הטלוויזיה ז׳יז׳קוב',
        nameLocal: 'Žižkov Television Tower',
        category: 'viewpoint',
        lat: 50.081,
        lng: 14.451,
        description:
          'המגדל עם פסלי התינוקות הזוחלים של דויד צ׳רני - התצפית הגבוהה בעיר, בלב שכונת ז׳יז׳קוב האותנטית.',
        rating: 4.3,
        durationMin: 75,
        tags: ['art'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Zizkov+Tower',
      },
      {
        id: 'prg-jerusalem-synagogue',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Prag_Jerusalemer-Synagoge_Feb-2014_IMG_2162.JPG/500px-Prag_Jerusalemer-Synagoge_Feb-2014_IMG_2162.JPG',
        name: 'בית הכנסת הירושלמי',
        nameLocal: 'Jerusalem Synagogue',
        category: 'attraction',
        lat: 50.0843,
        lng: 14.4341,
        description:
          'בית הכנסת הצבעוני והגדול בפראג (1906) - שילוב מסחרר של אר-נובו וסגנון מורי. פעיל, ומציג תערוכות.',
        rating: 4.6,
        durationMin: 45,
        tags: ['history', 'art'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Jerusalem+Synagogue+Prague',
      },
      {
        id: 'prg-cafe-louvre',
        name: 'קפה לובר',
        nameLocal: 'Café Louvre',
        category: 'cafe',
        lat: 50.0817,
        lng: 14.4189,
        description:
          'בית קפה פראגאי מ-1902 שבו ישבו קפקא ואיינשטיין - ארוחת בוקר, עוגות ואולם ביליארד. לא כשר.',
        rating: 4.4,
        durationMin: 60,
        tags: ['history', 'foodie'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Cafe+Louvre+Prague',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'העיר העתיקה והרובע היהודי',
        placeIds: ['prg-oldtown', 'prg-josefov', 'prg-dinitz'],
        notes: 'הרובע היהודי סגור בשבת. צהריים כשרים בדיניץ במרחק 3 דקות הליכה.',
      },
      {
        day: 2,
        title: 'המצודה וגשר קרל',
        placeIds: ['prg-castle', 'prg-charles', 'prg-king-solomon'],
        notes: 'מתחילים מוקדם במצודה, יורדים דרך מאלה סטראנה וחוצים את גשר קרל לכיוון ארוחת ערב.',
      },
      {
        day: 3,
        title: 'ירוק ונוף',
        placeIds: ['prg-petrin', 'prg-charles'],
        notes: 'רכבל לפטרשין, ובערב חזרה לגשר קרל כשהוא ריק ומואר.',
      },
    ],
    practical: {
      flights: 'טיסות ישירות מנתב"ג (אל על, סמארטווינגס ועוד) - כ-4 שעות.',
      gettingAround: 'מרכז העיר כולו מהלך. חשמליות ומטרו מצוינים לכל השאר.',
      kosherOverview:
        'שתי מסעדות כשרות ברובע היהודי ומניינים קבועים באלטנוישול ובבית הכנסת הספרדי. ארוחות שבת דורשות הרשמה מראש. יש גם חנויות עם מוצרים כשרים בסיסיים.',
    },
  },
  {
    slug: 'budapest',
    name: 'בודפשט',
    nameLocal: 'Budapest',
    countrySlug: 'hungary',
    flag: '🇭🇺',
    center: { lat: 47.4979, lng: 19.0402 },
    zoom: 13,
    tagline: 'פנינת הדנובה: מרחצאות, פרלמנט והרובע היהודי הגדול באירופה',
    photo:
      'https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'בניין הפרלמנט ההונגרי',
      nameLocal: 'Hungarian Parliament',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg/500px-Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg',
      blurb:
        'אחד מבנייני הפרלמנט המרשימים בעולם, פרוש על גדת הדנובה ומואר בעוצמה בלילה.',
    },
    summary:
      'בודפשט היא ההפתעה הגדולה של מרכז אירופה: עיר מפוארת וזולה יחסית, עם מרחצאות תרמיים, נוף דנובה עוצר נשימה - והרובע היהודי התוסס באירופה, עם בית הכנסת הגדול ביבשת, מסעדות כשרות ושכונה שלמה של היסטוריה יהודית חיה.',
    bestSeason: 'אפריל-יוני, ספטמבר-אוקטובר',
    places: [
      {
        id: 'bud-parliament',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg/500px-Hungarian_Parliament_Building_from_across_the_Danube%2C_2025-01-11.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'בניין הפרלמנט',
        nameLocal: 'Hungarian Parliament',
        category: 'attraction',
        lat: 47.5076,
        lng: 19.0459,
        description:
          'אחד הבניינים היפים בעולם, על גדת הדנובה. סיורים מודרכים בפנים - לקנות כרטיסים מראש. מדהים במיוחד בלילה מהגדה השנייה.',
        rating: 4.8,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Hungarian+Parliament',
      },
      {
        id: 'bud-bastion',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Hal%C3%A1szb%C3%A1stya_2017.jpg/500px-Hal%C3%A1szb%C3%A1stya_2017.jpg',
        tags: ['romantic', 'history'],
        priceLevel: 1,
        mustSee: true,
        name: 'מצודת הדייגים',
        nameLocal: "Fisherman's Bastion",
        category: 'viewpoint',
        lat: 47.5022,
        lng: 19.0344,
        description:
          'טרסות אגדתיות בסגנון ניאו-רומנסקי עם התצפית הכי יפה על הפרלמנט והדנובה. להגיע מוקדם בבוקר לפני ההמונים.',
        rating: 4.7,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Fishermans+Bastion',
      },
      {
        id: 'bud-castle',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Budav%C3%A1ri_Palota%2C_ABCDEF_%C3%A9p%C3%BClet.jpg/500px-Budav%C3%A1ri_Palota%2C_ABCDEF_%C3%A9p%C3%BClet.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'טירת בודה',
        nameLocal: 'Buda Castle',
        category: 'attraction',
        lat: 47.4962,
        lng: 19.0397,
        description:
          'מתחם הארמון ההיסטורי על גבעת הטירה. עולים ברכבל ההיסטורי (Sikló) ומטיילים ברובע הטירה כולו.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Buda+Castle',
      },
      {
        id: 'bud-szechenyi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Budapest_Sz%C3%A9chenyi_Baths_R02.jpg/500px-Budapest_Sz%C3%A9chenyi_Baths_R02.jpg',
        tags: ['families', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'מרחצאות סצ׳ני',
        nameLocal: 'Széchenyi Thermal Bath',
        category: 'attraction',
        lat: 47.5189,
        lng: 19.0819,
        description:
          'מרחצאות תרמיים ענקיים בבניין צהוב מפואר - החוויה הבודפשטית האולטימטיבית. הבריכות החיצוניות חמות גם בחורף.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Szechenyi+Bath',
      },
      {
        id: 'bud-dohany',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Synagogue-Budapest.jpg/500px-Synagogue-Budapest.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'בית הכנסת הגדול (דוהאני)',
        nameLocal: 'Dohány Street Synagogue',
        category: 'museum',
        lat: 47.4959,
        lng: 19.0603,
        description:
          'בית הכנסת הגדול באירופה (3,000 מקומות), בסגנון מורי מרהיב, עם מוזיאון יהודי ואנדרטת עץ החיים לזכר קורבנות השואה.',
        rating: 4.8,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Dohany+Synagogue',
      },
      {
        id: 'bud-shoes',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Shoes_Danube_Promenade_IMGP1297.jpg/500px-Shoes_Danube_Promenade_IMGP1297.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'הנעליים על גדת הדנובה',
        nameLocal: 'Shoes on the Danube Bank',
        category: 'attraction',
        lat: 47.5039,
        lng: 19.0454,
        description:
          'אנדרטה מצמררת ועדינה: 60 זוגות נעלי ברזל לזכר יהודים שנורו אל הנהר ב-1944. חמש דקות הליכה מהפרלמנט.',
        rating: 4.8,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Shoes+on+the+Danube',
      },
      {
        id: 'bud-vaci',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Vaci_utca_street_sign-Budapest.jpg/500px-Vaci_utca_street_sign-Budapest.jpg',
        tags: ['foodie'],
        priceLevel: 1,
        name: 'רחוב ואצי ושוק המרכזי',
        nameLocal: 'Váci utca & Great Market Hall',
        category: 'shopping',
        lat: 47.4879,
        lng: 19.0587,
        description:
          'מדרחוב הקניות הראשי של פשט, שמסתיים בשוק המרכזי המפואר - פפריקה, מזכרות ואוכל הונגרי בבניין שוק מהמאה ה-19.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Vaci+Utca',
      },
      {
        id: 'bud-carmel',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'השגחה מקומית - לוודא מול המקום' },
        name: 'כרמל (מסעדה כשרה)',
        nameLocal: 'Carmel Restaurant',
        category: 'kosher-food',
        lat: 47.4975,
        lng: 19.0625,
        description:
          'מסעדה כשרה ותיקה ברחוב קזינצי, בלב הרובע היהודי - מטבח הונגרי-יהודי קלאסי (גולש, שניצל, פלאצ׳ינטה).',
        rating: 4.2,
        kosherNote: 'בשרי, בהשגחה מקומית. ברחוב קזינצי מרוכזים עוד מקומות כשרים.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Carmel+Restaurant+Budapest',
      },
      {
        id: 'bud-hanna',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'גלאט, הקהילה האורתודוקסית' },
        name: 'חנה (מסעדה כשרה)',
        nameLocal: 'Hanna Restaurant',
        category: 'kosher-food',
        lat: 47.4972,
        lng: 19.062,
        description:
          'מסעדה כשרה אורתודוקסית בחצר בית הכנסת האורתודוקסי בקזינצי - אווירה ביתית וארוחות שבת בתיאום.',
        rating: 4.0,
        kosherNote: 'גלאט כשר. ארוחות שבת בהרשמה מראש.',
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Hanna+Kosher+Budapest',
      },
      {
        id: 'bud-basilica',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Budapest_Szent_Istvan_Bazilika_R01.jpg/500px-Budapest_Szent_Istvan_Bazilika_R01.jpg',
        name: 'בזיליקת סנט אישטוואן',
        nameLocal: "St. Stephen's Basilica",
        category: 'attraction',
        lat: 47.5008,
        lng: 19.054,
        description:
          'הכנסייה הגדולה של פשט עם כיפה שנראית מכל העיר - עולים אליה לתצפית 360 מעלות על בודפשט.',
        rating: 4.7,
        durationMin: 75,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=St+Stephens+Basilica+Budapest',
      },
      {
        id: 'bud-heroes',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/HUN-2015-Budapest-Heroes%E2%80%99_Square.jpg/500px-HUN-2015-Budapest-Heroes%E2%80%99_Square.jpg',
        name: 'כיכר הגיבורים',
        nameLocal: "Heroes' Square",
        category: 'attraction',
        lat: 47.515,
        lng: 19.0779,
        description:
          'הכיכר המונומנטלית בקצה שדרת אנדראשי - פסלי שבעת השבטים המייסדים, ומוזיאוני אמנות משני צדדיה.',
        rating: 4.6,
        durationMin: 45,
        tags: ['history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Heroes+Square+Budapest',
      },
      {
        id: 'bud-citypark',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Vajdahunyad_v%C3%A1ra_Budapest_September_2013.jpg/500px-Vajdahunyad_v%C3%A1ra_Budapest_September_2013.jpg',
        name: 'פארק העיר וטירת ואידהוניאד',
        nameLocal: 'City Park & Vajdahunyad Castle',
        category: 'nature',
        lat: 47.5146,
        lng: 19.0829,
        description:
          'טירה אקלקטית אגדתית בלב פארק העיר - אגם שיט בקיץ שהופך להחלקה על קרח בחורף, ליד מרחצאות סצ׳ני.',
        rating: 4.5,
        durationMin: 90,
        tags: ['families', 'romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Vajdahunyad+Castle',
      },
      {
        id: 'bud-gellert-hill',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Gell%C3%A9rtHillSkyline.jpg/500px-Gell%C3%A9rtHillSkyline.jpg',
        name: 'גבעת גלרט והציטדלה',
        nameLocal: 'Gellért Hill',
        category: 'viewpoint',
        lat: 47.4869,
        lng: 19.0466,
        description:
          'הגבעה עם פסל החירות מעל הדנובה - הטיפוס הקלאסי לפנורמה של כל הגשרים ושתי גדות העיר.',
        rating: 4.6,
        durationMin: 90,
        tags: ['outdoors'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Gellert+Hill',
      },
      {
        id: 'bud-andrassy',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Andr%C3%A1ssi%C3%BAtl%C3%A9gifot%C3%B3.jpg/500px-Andr%C3%A1ssi%C3%BAtl%C3%A9gifot%C3%B3.jpg',
        name: 'שדרת אנדראשי',
        nameLocal: 'Andrássy Avenue',
        category: 'attraction',
        lat: 47.5064,
        lng: 19.0651,
        description:
          'השדרה המפוארת של בודפשט (אתר מורשת עולמית) - מבניין האופרה עד כיכר הגיבורים, בתי קפה ובוטיקים.',
        rating: 4.5,
        durationMin: 90,
        tags: ['romantic', 'history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Andrassy+Avenue',
      },
      {
        id: 'bud-margaret',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Budapest_Donauinsel_2.jpg/500px-Budapest_Donauinsel_2.jpg',
        name: 'אי מרגרט',
        nameLocal: 'Margaret Island',
        category: 'nature',
        lat: 47.5262,
        lng: 19.047,
        description:
          'האי הירוק באמצע הדנובה - מזרקה מוזיקלית, גני ורדים ומסלול ריצה מסביב. שוכרים רכב-פדלים משפחתי.',
        rating: 4.6,
        durationMin: 120,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Margaret+Island',
      },
      {
        id: 'bud-gellert-baths',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Budapest%2C_Gell%C3%A9rt_f%C3%BCrd%C5%91.jpg/500px-Budapest%2C_Gell%C3%A9rt_f%C3%BCrd%C5%91.jpg',
        name: 'מרחצאות גלרט',
        nameLocal: 'Gellért Baths',
        category: 'attraction',
        lat: 47.4838,
        lng: 19.0518,
        description:
          'המרחצאות בסגנון אר-נובו שבמלון גלרט המפורסם - אריחים מצוירים, בריכה מקורה מפוארת ואווירה של פעם.',
        rating: 4.5,
        durationMin: 150,
        tags: ['romantic'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Gellert+Baths',
      },
      {
        id: 'bud-kazinczy',
        name: 'בית הכנסת ברחוב קזינצי',
        nameLocal: 'Kazinczy Street Synagogue',
        category: 'attraction',
        lat: 47.4966,
        lng: 19.0621,
        description:
          'בית הכנסת האורתודוקסי בסגנון אר-נובו בלב רחוב קזינצי - מרכז הקהילה השומרת, צמוד למסעדות הכשרות.',
        rating: 4.5,
        durationMin: 45,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Kazinczy+Synagogue',
      },
      {
        id: 'bud-newyork-cafe',
        photo:
          'https://upload.wikimedia.org/wikipedia/en/thumb/5/58/Anantara_New_York_Palace_Budapest_Hotel.png/500px-Anantara_New_York_Palace_Budapest_Hotel.png',
        name: 'ניו יורק קפה',
        nameLocal: 'New York Café',
        category: 'cafe',
        lat: 47.4984,
        lng: 19.0699,
        description:
          'בית הקפה שמתהדר בתואר "היפה בעולם" - אולם ניאו-בארוקי מוזהב. תור ארוך ומחירים בהתאם; שווה הצצה. לא כשר.',
        rating: 4.4,
        durationMin: 60,
        tags: ['romantic', 'foodie'],
        priceLevel: 3,
        externalUrl: 'https://maps.google.com/?q=New+York+Cafe+Budapest',
      },
      {
        id: 'bud-liberty-bridge',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Szabads%C3%A1g_h%C3%ADd_Budapest_September_2013.JPG/500px-Szabads%C3%A1g_h%C3%ADd_Budapest_September_2013.JPG',
        name: 'גשר החירות',
        nameLocal: 'Liberty Bridge',
        category: 'attraction',
        lat: 47.486,
        lng: 19.055,
        description:
          'הגשר הירוק בסגנון אר-נובו בין השוק המרכזי לגבעת גלרט - מהיפים על הדנובה.',
        rating: 4.5,
        durationMin: 30,
        tags: ['romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Liberty+Bridge+Budapest',
      },
      {
        id: 'bud-gerbeaud',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Cafe_Gerbeaud_01.JPG/500px-Cafe_Gerbeaud_01.JPG',
        name: 'קפה ג׳רבו',
        nameLocal: 'Café Gerbeaud',
        category: 'cafe',
        lat: 47.4966,
        lng: 19.0505,
        description:
          'הקונדיטוריה ההיסטורית של כיכר ורשמרטי (מ-1858) - עוגות דובוש וזיכרונות מימי המונרכיה. לא כשר.',
        rating: 4.4,
        durationMin: 45,
        tags: ['foodie', 'history'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Cafe+Gerbeaud',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'פשט: פרלמנט והרובע היהודי',
        placeIds: ['bud-parliament', 'bud-shoes', 'bud-dohany', 'bud-carmel'],
        notes: 'יום רגלי בצד פשט. מסיימים בערב ברובע היהודי - הוא גם מרכז חיי הלילה.',
      },
      {
        day: 2,
        title: 'בודה: הטירה והמצודה',
        placeIds: ['bud-castle', 'bud-bastion', 'bud-hanna'],
        notes: 'חוצים את גשר השלשלאות, עולים ברכבל. בערב חוזרים לפשט לארוחה כשרה.',
      },
      {
        day: 3,
        title: 'מרחצאות ופארק העיר',
        placeIds: ['bud-szechenyi'],
        notes: 'יום פינוק בסצ׳ני. להביא בגד ים וכפכפים; אפשר לשכור מגבת במקום.',
      },
    ],
    practical: {
      flights: 'טיסות ישירות מנתב"ג (אל על, ווִיז אייר) - כ-3 שעות.',
      gettingAround: 'מטרו היסטורי (הקו הראשון ביבשת!), חשמליות ומעבורות דנובה. הכול עם אותו כרטיס.',
      kosherOverview:
        'הרובע היהודי סביב רחוב קזינצי הוא מהתוססים באירופה: מסעדות כשרות, בתי כנסת פעילים (דוהאני, קזינצי האורתודוקסי), חנות כשרה ובתי חב"ד. קל להסתדר כשר כל השבוע.',
    },
  },
  {
    slug: 'rome',
    name: 'רומא',
    nameLocal: 'Rome / Roma',
    countrySlug: 'italy',
    flag: '🇮🇹',
    center: { lat: 41.8967, lng: 12.4822 },
    zoom: 13,
    tagline: 'העיר הנצחית: קולוסיאום, פסטה - והגטו היהודי הכי טעים באירופה',
    photo:
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'הקולוסיאום',
      nameLocal: 'Colosseum',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/500px-Colosseo_2020.jpg',
      blurb:
        'האמפיתיאטרון הגדול ביותר שנבנה אי פעם ברומא העתיקה, וסמלה המוכר בעולם של איטליה.',
    },
    summary:
      'רומא היא מוזיאון פתוח של 2,500 שנה - ובשביל ישראלים יש בה בונוס ענק: הגטו היהודי, הקהילה היהודית הרציפה העתיקה באירופה, עם ריכוז מסעדות כשרות שאין כמוהו ביבשת. קרוב לכל אתר מרכזי יש ארוחה כשרה מצוינת.',
    bestSeason: 'מרץ-מאי, ספטמבר-נובמבר (הקיץ חם ועמוס)',
    places: [
      {
        id: 'rom-colosseum',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/500px-Colosseo_2020.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'הקולוסיאום',
        nameLocal: 'Colosseum',
        category: 'attraction',
        lat: 41.8902,
        lng: 12.4922,
        description:
          'האמפיתיאטרון הגדול בעולם העתיק. חובה לקנות כרטיס משולב (קולוסיאום+פורום+פלטין) מראש באתר הרשמי.',
        rating: 4.8,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Colosseum',
      },
      {
        id: 'rom-forum',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Foro_Romano_Musei_Capitolini_Roma.jpg/500px-Foro_Romano_Musei_Capitolini_Roma.jpg',
        tags: ['history'],
        priceLevel: 2,
        name: 'הפורום הרומאי',
        nameLocal: 'Roman Forum',
        category: 'attraction',
        lat: 41.8925,
        lng: 12.4853,
        description:
          'לב האימפריה הרומית - שדרת חורבות מהמרשימות בעולם, כולל שער טיטוס עם תבליט כלי המקדש מירושלים.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Roman+Forum',
      },
      {
        id: 'rom-trevi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Trevi_Fountain_-_Roma.jpg/500px-Trevi_Fountain_-_Roma.jpg',
        tags: ['romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'מזרקת טרווי',
        nameLocal: 'Trevi Fountain',
        category: 'attraction',
        lat: 41.9009,
        lng: 12.4833,
        description:
          'המזרקה המפורסמת בעולם. זורקים מטבע ומבטיחים חזרה לרומא. הכי קסום אחרי 23:00 כשההמונים מתפזרים.',
        rating: 4.7,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Trevi+Fountain',
      },
      {
        id: 'rom-pantheon',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Pantheon_%28Rome%29_-_Right_side_and_front.jpg/500px-Pantheon_%28Rome%29_-_Right_side_and_front.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        mustSee: true,
        name: 'הפנתאון',
        nameLocal: 'Pantheon',
        category: 'attraction',
        lat: 41.8986,
        lng: 12.4769,
        description:
          'המבנה השמור ביותר מרומא העתיקה, עם כיפת הבטון הלא-מזוינת הגדולה בעולם והאוקולוס המפורסם.',
        rating: 4.8,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Pantheon+Rome',
      },
      {
        id: 'rom-vatican',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Musei_vaticani_Coat_of_Arms.svg/500px-Musei_vaticani_Coat_of_Arms.svg.png',
        tags: ['art', 'history'],
        priceLevel: 2,
        mustSee: true,
        name: 'מוזיאוני הוותיקן והקפלה הסיסטינית',
        nameLocal: 'Vatican Museums',
        category: 'museum',
        lat: 41.9065,
        lng: 12.4536,
        description:
          'מאוספי האמנות הגדולים בעולם, בשיאם הקפלה הסיסטינית של מיכלאנג׳לו. כרטיסים מראש = חובה מוחלטת.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Vatican+Museums',
      },
      {
        id: 'rom-ghetto',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Great_Synagogue_of_Rome.jpg/500px-Great_Synagogue_of_Rome.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'הגטו היהודי ובית הכנסת הגדול',
        nameLocal: 'Jewish Ghetto & Great Synagogue',
        category: 'museum',
        lat: 41.8919,
        lng: 12.4778,
        description:
          'הקהילה היהודית הרציפה העתיקה באירופה (מהמאה ה-2 לפנה"ס!). בית הכנסת הגדול, המוזיאון היהודי, והרחוב הראשי מלא מסעדות כשרות וארטישוק א-לה-ג׳ודיה.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Great+Synagogue+of+Rome',
      },
      {
        id: 'rom-corso',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Via_del_Corso_%2852501354470%29.jpg/500px-Via_del_Corso_%2852501354470%29.jpg',
        tags: ['families'],
        priceLevel: 2,
        name: 'ויה דל קורסו',
        nameLocal: 'Via del Corso',
        category: 'shopping',
        lat: 41.9028,
        lng: 12.4796,
        description:
          'רחוב הקניות המרכזי של רומא, מפיאצה דל פופולו עד ויטוריאנו - ומסביבו סמטאות הבוטיקים של ספרדים והפנתאון.',
        rating: 4.3,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Via+del+Corso',
      },
      {
        id: 'rom-baghetto',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'רבנות רומא' },
        name: 'בא-גטו (מסעדה כשרה)',
        nameLocal: "Ba'Ghetto",
        category: 'kosher-food',
        lat: 41.8925,
        lng: 12.4776,
        description:
          'המסעדה הכשרה המפורסמת של הגטו - מטבח רומאי-יהודי וטריפוליטאי. הארטישוק המטוגן שלהם הוא מוסד.',
        rating: 4.4,
        kosherNote: 'בשרי, בהשגחת רבנות רומא. יש להם גם סניף חלבי (Ba\'Ghetto Milky) באותו רחוב.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=BaGhetto+Rome',
      },
      {
        id: 'rom-yotvata',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'רבנות רומא' },
        name: 'יטבתה (מסעדה כשרה חלבית)',
        nameLocal: 'Yotvata',
        category: 'kosher-food',
        lat: 41.8938,
        lng: 12.4753,
        description:
          'מסעדה חלבית כשרה מול נהר הטיבר, ליד הגטו - פסטות, פיצות ודגים איטלקיים אמיתיים.',
        rating: 4.3,
        kosherNote: 'חלבי, בהשגחת רבנות רומא.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Yotvata+Rome',
      },
      {
        id: 'rom-spanish-steps',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Piazza_di_Spagna_%28Rome%29_0004.jpg/500px-Piazza_di_Spagna_%28Rome%29_0004.jpg',
        name: 'המדרגות הספרדיות',
        nameLocal: 'Spanish Steps',
        category: 'attraction',
        lat: 41.906,
        lng: 12.4828,
        description:
          'גרם המדרגות המפורסם מפיאצה די ספניה אל כנסיית טריניטה דיי מונטי - נקודת המפגש הקלאסית של רומא.',
        rating: 4.6,
        durationMin: 30,
        tags: ['romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Spanish+Steps',
      },
      {
        id: 'rom-navona',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Piazza_Navona_%28Rome%29_at_night.jpg/500px-Piazza_Navona_%28Rome%29_at_night.jpg',
        name: 'פיאצה נבונה',
        nameLocal: 'Piazza Navona',
        category: 'attraction',
        lat: 41.8992,
        lng: 12.4731,
        description:
          'הכיכר הבארוקית היפה ברומא - מזרקת ארבעת הנהרות של ברניני במרכז, ציירי רחוב ובתי קפה מסביב.',
        rating: 4.7,
        durationMin: 45,
        tags: ['romantic', 'art'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Piazza+Navona',
      },
      {
        id: 'rom-campo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Campo_dei_Fiori.jpg/500px-Campo_dei_Fiori.jpg',
        name: 'קמפו דה פיורי',
        nameLocal: "Campo de' Fiori",
        category: 'attraction',
        lat: 41.8956,
        lng: 12.4722,
        description:
          'שוק בוקר צבעוני בכיכר שבערב הופכת למוקד בילוי - פירות, פסטה ופרחים תחת פסל ג׳ורדנו ברונו.',
        rating: 4.3,
        durationMin: 45,
        tags: ['foodie', 'nightlife'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Campo+de+Fiori',
      },
      {
        id: 'rom-borghese',
        name: 'גלריה בורגזה',
        nameLocal: 'Galleria Borghese',
        category: 'museum',
        lat: 41.9142,
        lng: 12.4923,
        description:
          'פסלי ברניני וציורי קרוואג׳ו בווילה מוקפת גנים ענקיים - מהמוזיאונים המרוכזים והמהנים ברומא. כניסה בהזמנת מועד מראש.',
        rating: 4.8,
        durationMin: 150,
        tags: ['art', 'romantic'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Galleria+Borghese',
      },
      {
        id: 'rom-castel',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Castel_Sant%27Angelo_at_Night.jpg/500px-Castel_Sant%27Angelo_at_Night.jpg',
        name: 'קסטל סנט אנג׳לו',
        nameLocal: "Castel Sant'Angelo",
        category: 'attraction',
        lat: 41.9031,
        lng: 12.4663,
        description:
          'המאוזוליאום של אדריאנוס שהפך למבצר האפיפיורים - מעבר סודי מהוותיקן ותצפית גגות יפה מהפסגה.',
        rating: 4.6,
        durationMin: 90,
        tags: ['history'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Castel+Sant+Angelo',
      },
      {
        id: 'rom-trastevere',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Santa_Maria_in_Trastevere_fountain.jpg/500px-Santa_Maria_in_Trastevere_fountain.jpg',
        name: 'טראסטוורה',
        nameLocal: 'Trastevere',
        category: 'attraction',
        lat: 41.8896,
        lng: 12.4695,
        description:
          'השכונה הכי אהובה של רומא בערב - סמטאות מטפסות קיסוס, טרטוריות ובזיליקת סנטה מריה עם פסיפסי הזהב.',
        rating: 4.7,
        durationMin: 120,
        tags: ['nightlife', 'romantic', 'foodie'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Trastevere',
      },
      {
        id: 'rom-gianicolo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Janiculum.jpg/500px-Janiculum.jpg',
        name: 'גבעת ג׳ניקולו',
        nameLocal: 'Janiculum Hill',
        category: 'viewpoint',
        lat: 41.8919,
        lng: 12.461,
        description:
          'הגבעה מעל טראסטוורה עם התצפית הרחבה ביותר על גגות רומא - ותותח שנורה בכל צהריים במסורת בת 150 שנה.',
        rating: 4.6,
        durationMin: 60,
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Janiculum+Terrace',
      },
      {
        id: 'rom-peter-square',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg/500px-St_Peter%27s_Square%2C_Vatican_City_-_April_2007.jpg',
        name: 'כיכר פטרוס הקדוש',
        nameLocal: "St. Peter's Square",
        category: 'attraction',
        lat: 41.9022,
        lng: 12.4568,
        description:
          'הכיכר האליפטית של ברניני מול הבזיליקה הגדולה בעולם - קולונדות, אובליסק ולב הוותיקן. הכניסה לבזיליקה חינם (תור ביטחוני).',
        rating: 4.7,
        durationMin: 90,
        tags: ['history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=St+Peters+Square',
      },
      {
        id: 'rom-mouth',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Et%C3%A0_imperiale%2C_chiusino_a_forma_di_mascherone_di_divinit%C3%A0_fluviale%2C_detta_bocca_della_verit%C3%A0%2C_collocata_qui_nel_1632.jpg/500px-Et%C3%A0_imperiale%2C_chiusino_a_forma_di_mascherone_di_divinit%C3%A0_fluviale%2C_detta_bocca_della_verit%C3%A0%2C_collocata_qui_nel_1632.jpg',
        name: 'פה האמת',
        nameLocal: 'Bocca della Verità',
        category: 'attraction',
        lat: 41.8884,
        lng: 12.4816,
        description:
          'דיסקת השיש העתיקה שהפכה ל"גלאי שקרים" אגדי בכנסיית סנטה מריה אין קוסמדין - מכניסים יד ומצטלמים.',
        rating: 4.4,
        durationMin: 30,
        tags: ['families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Bocca+della+Verita',
      },
      {
        id: 'rom-popolo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/PIAZZA_DEL_POPOLO_VISTA_AEREA.jpg/500px-PIAZZA_DEL_POPOLO_VISTA_AEREA.jpg',
        name: 'פיאצה דל פופולו והפינצ׳ו',
        nameLocal: 'Piazza del Popolo & Pincio',
        category: 'attraction',
        lat: 41.9106,
        lng: 12.4763,
        description:
          'הכיכר הגדולה בשער הצפוני של רומא העתיקה - אובליסק מצרי, כנסיות תאומות, ומעליה טרסת הפינצ׳ו עם נוף השקיעה.',
        rating: 4.6,
        durationMin: 45,
        tags: ['romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Piazza+del+Popolo',
      },
      {
        id: 'rom-appia',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Paesaggio_dell%27Appia_antica.jpg/500px-Paesaggio_dell%27Appia_antica.jpg',
        name: 'הדרך האפּיה העתיקה',
        nameLocal: 'Appian Way (Via Appia Antica)',
        category: 'nature',
        lat: 41.8558,
        lng: 12.5169,
        description:
          'הדרך הרומית העתיקה - אבני ריצוף בנות יותר מאלפיים שנה, קטקומבות ונוף כפרי ירוק בתוך העיר. נעימה במיוחד באופניים.',
        rating: 4.6,
        durationMin: 180,
        tags: ['outdoors', 'history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Via+Appia+Antica',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'רומא העתיקה',
        placeIds: ['rom-colosseum', 'rom-forum', 'rom-baghetto'],
        notes: 'מתחילים מוקדם בקולוסיאום. הגטו במרחק הליכה מהפורום - ארוחת ערב כשרה מושלמת לסיום.',
      },
      {
        day: 2,
        title: 'מרכז העיר הבארוקי',
        placeIds: ['rom-pantheon', 'rom-trevi', 'rom-ghetto', 'rom-yotvata'],
        notes: 'יום רגלי: פנתאון, טרווי, ואחר צהריים שלם בגטו היהודי כולל המוזיאון.',
      },
      {
        day: 3,
        title: 'הוותיקן',
        placeIds: ['rom-vatican'],
        notes: 'להזמין כניסה ל-8:00 בבוקר. אחרי הביקור - חזרה לגטו לארוחה, 20 דקות בחשמלית.',
      },
    ],
    practical: {
      flights: 'טיסות ישירות מנתב"ג לפיומיצ׳ינו (אל על, ITA, ווִיז אייר) - כ-3.5 שעות.',
      gettingAround:
        'המרכז ההיסטורי מהלך ברובו. מטרו מוגבל אבל שימושי לוותיקן ולקולוסיאום. מרכבת דה טרמיני יש חיבור מהיר לשדה.',
      kosherOverview:
        'מהטובות באירופה לאוכל כשר: הגטו היהודי מרכז יותר מתריסר מסעדות כשרות (בשרי וחלבי), מאפיות ומעדניות. מטבח רומאי-יהודי ייחודי שלא תמצאו בשום מקום אחר בעולם.',
    },
  },
  {
    slug: 'athens',
    name: 'אתונה',
    nameLocal: 'Athens',
    countrySlug: 'greece',
    flag: '🇬🇷',
    center: { lat: 37.9755, lng: 23.7348 },
    zoom: 13,
    tagline: 'שעתיים טיסה, 2,500 שנות היסטוריה - והים באמצע',
    photo:
      'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'האקרופוליס והפרתנון',
      nameLocal: 'Acropolis',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/1029_Acropolis_of_Athens_in_Greece_at_night_Photo_by_Giles_Laurent.jpg/500px-1029_Acropolis_of_Athens_in_Greece_at_night_Photo_by_Giles_Laurent.jpg',
      blurb:
        'הגבעה הקדושה של אתונה העתיקה, עם מקדש הפרתנון בראשה - סמל הציוויליזציה המערבית.',
    },
    summary:
      'היעד הקרוב והקליל: שעתיים טיסה מנתב"ג, אווירה ים-תיכונית מוכרת, מחירים נוחים והאקרופוליס מעל הכול. מושלם לסופ"ש ארוך - משלבים עתיקות בבוקר, שווקים בצהריים וטברנות בערב, ויש גם קהילת חב"ד פעילה עם אוכל כשר.',
    bestSeason: 'מרץ-יוני, ספטמבר-נובמבר (יולי-אוגוסט חם מאוד)',
    places: [
      {
        id: 'ath-acropolis',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/1029_Acropolis_of_Athens_in_Greece_at_night_Photo_by_Giles_Laurent.jpg/500px-1029_Acropolis_of_Athens_in_Greece_at_night_Photo_by_Giles_Laurent.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'האקרופוליס והפרתנון',
        nameLocal: 'Acropolis',
        category: 'attraction',
        lat: 37.9715,
        lng: 23.7267,
        description:
          'סמל הציוויליזציה המערבית. לעלות ב-8:00 בפתיחה או שעתיים לפני שקיעה - גם בגלל החום וגם בגלל האור.',
        rating: 4.8,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Acropolis+Athens',
      },
      {
        id: 'ath-acropolis-museum',
        tags: ['history', 'art'],
        priceLevel: 1,
        mustSee: true,
        name: 'מוזיאון האקרופוליס',
        nameLocal: 'Acropolis Museum',
        category: 'museum',
        lat: 37.9685,
        lng: 23.7285,
        description:
          'מוזיאון מודרני מבריק למרגלות הסלע, בנוי מעל חפירות ארכיאולוגיות עם רצפת זכוכית. משלים מושלם לביקור למעלה.',
        rating: 4.8,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Acropolis+Museum',
      },
      {
        id: 'ath-plaka',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Carrer_del_barri_de_Plaka%2C_Atenes.JPG/500px-Carrer_del_barri_de_Plaka%2C_Atenes.JPG',
        tags: ['romantic', 'families'],
        priceLevel: 0,
        name: 'שכונת פלאקה',
        nameLocal: 'Plaka',
        category: 'attraction',
        lat: 37.9725,
        lng: 23.73,
        description:
          'השכונה העתיקה למרגלות האקרופוליס - סמטאות צבעוניות, בוגנוויליות ובתים ניאו-קלאסיים. הכי יפה בשעות הבוקר.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Plaka+Athens',
      },
      {
        id: 'ath-monastiraki',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Monastiraki_Square_on_June_6%2C_2020.jpg/500px-Monastiraki_Square_on_June_6%2C_2020.jpg',
        tags: ['foodie', 'nightlife'],
        priceLevel: 0,
        name: 'כיכר מונסטיראקי והשוק',
        nameLocal: 'Monastiraki Flea Market',
        category: 'attraction',
        lat: 37.976,
        lng: 23.7255,
        description:
          'שוק הפשפשים והרחובות הכי תוססים באתונה, עם נוף לאקרופוליס מגגות בתי הקפה מסביב.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Monastiraki',
      },
      {
        id: 'ath-lycabettus',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/%CE%9B%CF%85%CE%BA%CE%B1%CE%B2%CE%B7%CF%84%CF%84%CF%8C%CF%82_-_Mount_Lycabettus.jpg/500px-%CE%9B%CF%85%CE%BA%CE%B1%CE%B2%CE%B7%CF%84%CF%84%CF%8C%CF%82_-_Mount_Lycabettus.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'הר ליקבטוס',
        nameLocal: 'Mount Lycabettus',
        category: 'viewpoint',
        lat: 37.9814,
        lng: 23.7573,
        description:
          'הנקודה הגבוהה באתונה - שקיעה על כל העיר עד הים. עולים ברכבל או ברגל (30 דקות טיפוס).',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Mount+Lycabettus',
      },
      {
        id: 'ath-ermou',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Ermou-street.jpg/500px-Ermou-street.jpg',
        tags: ['families'],
        priceLevel: 2,
        name: 'רחוב ארמו',
        nameLocal: 'Ermou Street',
        category: 'shopping',
        lat: 37.9757,
        lng: 23.7312,
        description:
          'מדרחוב הקניות הראשי של אתונה, מכיכר סינטגמה עד מונסטיראקי - רשתות בינלאומיות לצד חנויות מקומיות.',
        rating: 4.2,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Ermou+Street+Athens',
      },
      {
        id: 'ath-gostijo',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'הרבנות של אתונה' },
        name: 'גוסטיז׳ו (מסעדה כשרה)',
        nameLocal: 'Gostijo',
        category: 'kosher-food',
        lat: 37.9787,
        lng: 23.7239,
        description:
          'מסעדה כשרה ספרדית-יוונית בשכונת פסירי, ליד בית הכנסת - מזה טעים, קבבים ואווירה חמה.',
        rating: 4.3,
        kosherNote: 'בשרי, בהשגחת הרבנות של אתונה. סגור בשבת; ארוחות שבת דרך חב"ד.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Gostijo+Athens',
      },
      {
        id: 'ath-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'חב"ד - ארוחות שבת בהרשמה' },
        name: 'בית חב"ד אתונה',
        nameLocal: 'Chabad of Athens',
        category: 'kosher-food',
        lat: 37.9779,
        lng: 23.7235,
        description:
          'מרכז חב"ד במרכז העיר עם מניינים, ארוחות שבת וחנות מוצרים כשרים בסיסית.',
        kosherNote: 'ארוחות שבת בהרשמה מראש דרך האתר שלהם.',
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chabad+Athens',
      },
      {
        id: 'ath-agora',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Agora_-_Ath%C3%A8nes_%28GRA1%29_-_2022-03-26_-_97.jpg/500px-Agora_-_Ath%C3%A8nes_%28GRA1%29_-_2022-03-26_-_97.jpg',
        name: 'האגורה העתיקה',
        nameLocal: 'Ancient Agora',
        category: 'attraction',
        lat: 37.9747,
        lng: 23.7217,
        description:
          'השוק העתיק שבו התהלך סוקרטס - מקדש הפייסטוס השמור להפליא והסטואה המשוחזרת של אטלוס.',
        rating: 4.6,
        durationMin: 90,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Ancient+Agora+Athens',
      },
      {
        id: 'ath-temple-zeus',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/L%27Olympieion_%28Ath%C3%A8nes%29_%2830776483926%29.jpg/500px-L%27Olympieion_%28Ath%C3%A8nes%29_%2830776483926%29.jpg',
        name: 'מקדש זאוס האולימפי',
        nameLocal: 'Temple of Olympian Zeus',
        category: 'attraction',
        lat: 37.9693,
        lng: 23.7331,
        description:
          'שרידי המקדש העצום לזאוס - עמודים קורינתיים ענקיים ליד שער אדריאנוס, בין פלאקה לאצטדיון.',
        rating: 4.4,
        durationMin: 45,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Temple+of+Olympian+Zeus',
      },
      {
        id: 'ath-panathenaic',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Panathenaic_Stadium_-_panoramio_%281%29.jpg/500px-Panathenaic_Stadium_-_panoramio_%281%29.jpg',
        name: 'האצטדיון הפנאתנאי',
        nameLocal: 'Panathenaic Stadium',
        category: 'attraction',
        lat: 37.9683,
        lng: 23.741,
        description:
          'האצטדיון של האולימפיאדה המודרנית הראשונה (1896), בנוי כולו שיש - אפשר לרוץ הקפה על המסלול.',
        rating: 4.5,
        durationMin: 60,
        tags: ['history', 'families'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Panathenaic+Stadium',
      },
      {
        id: 'ath-syntagma',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/%CE%A0%CE%BB%CE%B1%CF%84%CE%B5%CE%AF%CE%B1_%CE%A3%CF%85%CE%BD%CF%84%CE%AC%CE%B3%CE%BC%CE%B1%CF%84%CE%BF%CF%82_6386.jpg/500px-%CE%A0%CE%BB%CE%B1%CF%84%CE%B5%CE%AF%CE%B1_%CE%A3%CF%85%CE%BD%CF%84%CE%AC%CE%B3%CE%BC%CE%B1%CF%84%CE%BF%CF%82_6386.jpg',
        name: 'כיכר סינטגמה וחילופי המשמר',
        nameLocal: 'Syntagma Square',
        category: 'attraction',
        lat: 37.9755,
        lng: 23.7348,
        description:
          'כיכר הפרלמנט עם חילופי המשמר של האֶבזונים בכל שעה עגולה - המופע החינמי הקבוע של אתונה.',
        rating: 4.4,
        durationMin: 30,
        tags: ['families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Syntagma+Square',
      },
      {
        id: 'ath-national-garden',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/%CE%95%CE%B8%CE%BD%CE%B9%CE%BA%CF%8C%CF%82_%CE%9A%CE%AE%CF%80%CE%BF%CF%82.jpg/500px-%CE%95%CE%B8%CE%BD%CE%B9%CE%BA%CF%8C%CF%82_%CE%9A%CE%AE%CF%80%CE%BF%CF%82.jpg',
        name: 'הגן הלאומי',
        nameLocal: 'National Garden',
        category: 'nature',
        lat: 37.9726,
        lng: 23.7375,
        description:
          'גן צל ירוק מאחורי הפרלמנט - בריכות צבים, שדרות דקלים ומפלט אמיתי מהחום של אתונה.',
        rating: 4.3,
        durationMin: 60,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=National+Garden+Athens',
      },
      {
        id: 'ath-benaki',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Benaki_Museum_Athens.JPG/500px-Benaki_Museum_Athens.JPG',
        name: 'מוזיאון בנאקי',
        nameLocal: 'Benaki Museum',
        category: 'museum',
        lat: 37.9764,
        lng: 23.7415,
        description:
          'אוסף פרטי מרהיב של אמנות יוונית מהפרהיסטוריה עד המאה ה-20, בווילה ניאו-קלאסית ליד הגן הלאומי.',
        rating: 4.6,
        durationMin: 90,
        tags: ['art', 'history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Benaki+Museum',
      },
      {
        id: 'ath-archaeological',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Arch%C3%A4ologisches_Nationalmuseum_Athen.jpg/500px-Arch%C3%A4ologisches_Nationalmuseum_Athen.jpg',
        name: 'המוזיאון הארכיאולוגי הלאומי',
        nameLocal: 'National Archaeological Museum',
        category: 'museum',
        lat: 37.989,
        lng: 23.7327,
        description:
          'מהמוזיאונים הארכיאולוגיים החשובים בעולם - מסכת אגממנון, מנגנון האנטיקיתרה והברונזות הגדולות.',
        rating: 4.7,
        durationMin: 120,
        tags: ['history', 'art'],
        priceLevel: 1,
        mustSee: true,
        externalUrl: 'https://maps.google.com/?q=National+Archaeological+Museum+Athens',
      },
      {
        id: 'ath-anafiotika',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Anafiotika.JPG/500px-Anafiotika.JPG',
        name: 'אנפיוטיקה',
        nameLocal: 'Anafiotika',
        category: 'attraction',
        lat: 37.9718,
        lng: 23.7288,
        description:
          'כפר קיקלאדי לבן שנבנה על צלע האקרופוליס - סמטאות ברוחב אדם, בוגנוויליות ותחושת אי באמצע העיר.',
        rating: 4.6,
        durationMin: 45,
        tags: ['romantic'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Anafiotika',
      },
      {
        id: 'ath-philopappos',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Philopappos_monument.jpg/500px-Philopappos_monument.jpg',
        name: 'גבעת פילופאפוס',
        nameLocal: 'Philopappos Hill',
        category: 'viewpoint',
        lat: 37.9679,
        lng: 23.721,
        description:
          'גבעת המוזות מול האקרופוליס - נקודת הצילום הקלאסית של הפרתנון, שבילי אורנים והאנדרטה העתיקה בפסגה.',
        rating: 4.6,
        durationMin: 75,
        tags: ['outdoors'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Philopappos+Hill',
      },
      {
        id: 'ath-psiri',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Psyrri_square_Athens.jpg/500px-Psyrri_square_Athens.jpg',
        name: 'שכונת פסירי',
        nameLocal: 'Psiri',
        category: 'attraction',
        lat: 37.9789,
        lng: 23.7247,
        description:
          'שכונת הבילוי עם אמנות רחוב, טברנות ומוזיקה חיה - בערב זה המקום; גם מסעדת גוסטיז׳ו הכשרה שוכנת כאן.',
        rating: 4.4,
        durationMin: 90,
        tags: ['nightlife', 'foodie'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Psiri+Athens',
      },
      {
        id: 'ath-kolonaki',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Kolonaki%2C_Main_Avenue.jpg/500px-Kolonaki%2C_Main_Avenue.jpg',
        name: 'קולונאקי',
        nameLocal: 'Kolonaki',
        category: 'shopping',
        lat: 37.9772,
        lng: 23.7442,
        description:
          'השכונה האלגנטית למרגלות ליקבטוס - בוטיקים, גלריות ובתי קפה של אתונאים מקומיים.',
        rating: 4.3,
        durationMin: 90,
        tags: ['foodie'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Kolonaki',
      },
      {
        id: 'ath-jewish-museum',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/The_Jewish_Museum_of_Greece.jpg/500px-The_Jewish_Museum_of_Greece.jpg',
        name: 'המוזיאון היהודי של יוון',
        nameLocal: 'Jewish Museum of Greece',
        category: 'museum',
        lat: 37.9723,
        lng: 23.7318,
        description:
          'סיפור הקהילות הרומניוטיות והספרדיות של יוון - יותר מאלפיים שנות היסטוריה ועד השואה, ליד סינטגמה.',
        rating: 4.5,
        durationMin: 60,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Jewish+Museum+of+Greece',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'האקרופוליס ופלאקה',
        placeIds: ['ath-acropolis', 'ath-acropolis-museum', 'ath-plaka', 'ath-gostijo'],
        notes: 'אקרופוליס על הבוקר, מוזיאון בצהריים הממוזגים, פלאקה אחר הצהריים וערב כשר בפסירי.',
      },
      {
        day: 2,
        title: 'שווקים ושקיעה',
        placeIds: ['ath-monastiraki', 'ath-lycabettus'],
        notes: 'בוקר בשוק הפשפשים, אחר צהריים רגוע ושקיעה מליקבטוס - להביא מים.',
      },
    ],
    practical: {
      flights:
        'המון טיסות ישירות מנתב"ג (אל על, ארקיע, ישראייר, Aegean, בלו בירד) - כשעתיים בלבד. לרוב היעד הזול ביותר לטוס אליו מהארץ.',
      gettingAround:
        'מרכז העיר מהלך. מטרו נוח וזול, כולל קו ישיר מהשדה. מוניות זולות יחסית (Uber מזמין מוניות).',
      kosherOverview:
        'קהילה יהודית קטנה אבל מאורגנת: מסעדת גוסטיז׳ו הכשרה, חב"ד פעיל עם ארוחות שבת ומכולת בסיסית, ובית הכנסת בית שלום. פירות, ירקות ודגים טריים בשווקים משלימים את התמונה.',
    },
  },
  {
    slug: 'barcelona',
    name: 'ברצלונה',
    nameLocal: 'Barcelona',
    countrySlug: 'spain',
    flag: '🇪🇸',
    center: { lat: 41.3874, lng: 2.1686 },
    zoom: 13,
    tagline: 'גאודי, חוף ים וטאפאס - העיר שכולה יצירת אמנות',
    photo:
      'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'סגרדה פמיליה',
      nameLocal: 'Sagrada Família',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/SF_maig_2_cropped.jpg/500px-SF_maig_2_cropped.jpg',
      blurb:
        'יצירת המופת הלא-גמורה של אנטוני גאודי, בבנייה מתמשכת מאז 1882.',
    },
    summary:
      'ברצלונה מחברת את מה שאף עיר אחרת לא מצליחה: אדריכלות הזויה של גאודי, רובע גותי מימי הביניים, חוף ים אמיתי בתוך העיר ואנרגיה ים-תיכונית. לישראלים היא גם נוחה במיוחד - טיסות ישירות רבות וקהילה יהודית עם פתרונות כשרות.',
    bestSeason: 'מאי-יוני, ספטמבר-אוקטובר',
    places: [
      {
        id: 'bcn-sagrada',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/SF_maig_2_cropped.jpg/500px-SF_maig_2_cropped.jpg',
        tags: ['art', 'history'],
        priceLevel: 3,
        mustSee: true,
        name: 'סגרדה פמיליה',
        nameLocal: 'Sagrada Família',
        category: 'attraction',
        lat: 41.4036,
        lng: 2.1744,
        description:
          'יצירת המופת הלא-גמורה של גאודי, בבנייה מאז 1882. הפנים עוצר נשימה - כרטיסים מראש בלבד, עדיף לשעת בוקר עם שמש במזרח.',
        rating: 4.8,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Sagrada+Familia',
      },
      {
        id: 'bcn-guell',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Parc_guell_-_panoramio.jpg/500px-Parc_guell_-_panoramio.jpg',
        tags: ['art', 'outdoors', 'families'],
        priceLevel: 2,
        mustSee: true,
        name: 'פארק גואל',
        nameLocal: 'Park Güell',
        category: 'nature',
        lat: 41.4145,
        lng: 2.1527,
        description:
          'הפארק הפסיפסי הקסום של גאודי עם התצפית המפורסמת על העיר והים. האזור המונומנטלי דורש כרטיס מראש.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Park+Guell',
      },
      {
        id: 'bcn-gothic',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Barcelona_-_Carrer_del_Bisbe.jpg/500px-Barcelona_-_Carrer_del_Bisbe.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'הרובע הגותי',
        nameLocal: 'Gothic Quarter (Barri Gòtic)',
        category: 'attraction',
        lat: 41.3833,
        lng: 2.177,
        description:
          'סמטאות מימי הביניים, הקתדרלה, כיכרות נסתרות - ושרידי הקהילה היהודית העתיקה ברובע אל קול (El Call), כולל בית הכנסת העתיק שנחשב מהעתיקים באירופה.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Gothic+Quarter+Barcelona',
      },
      {
        id: 'bcn-boqueria',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Barcelona_-_Mercat_de_Sant_Josep_%28la_Boqueria%29_-_Entrance.jpg/500px-Barcelona_-_Mercat_de_Sant_Josep_%28la_Boqueria%29_-_Entrance.jpg',
        tags: ['foodie'],
        priceLevel: 0,
        name: 'שוק הבוקריה ולה רמבלה',
        nameLocal: 'La Boqueria Market',
        category: 'attraction',
        lat: 41.3818,
        lng: 2.1715,
        description:
          'שוק האוכל המפורסם של ברצלונה על שדרת לה רמבלה - צבעים, מיצים טריים ופירות. להיזהר מכייסים באזור.',
        rating: 4.4,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=La+Boqueria',
      },
      {
        id: 'bcn-barceloneta',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Barcelona_Barceloneta.svg/500px-Barcelona_Barceloneta.svg.png',
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        name: 'חוף ברצלונטה',
        nameLocal: 'Barceloneta Beach',
        category: 'nature',
        lat: 41.3784,
        lng: 2.1925,
        description:
          'חוף העיר הקלאסי - טיילת, אופניים, ים אמיתי במרחק מטרו מהמרכז. שקיעה יפה מהטיילת לכיוון הנמל.',
        rating: 4.4,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Barceloneta+Beach',
      },
      {
        id: 'bcn-batllo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Casa_Batllo_Overview_Barcelona_Spain_cut.jpg/500px-Casa_Batllo_Overview_Barcelona_Spain_cut.jpg',
        tags: ['art'],
        priceLevel: 3,
        name: 'קאסה באטיו',
        nameLocal: 'Casa Batlló',
        category: 'attraction',
        lat: 41.3917,
        lng: 2.1649,
        description:
          'בית הדרקון של גאודי בפאסג׳ דה גרסיה - חזית שנראית כמו עצמות ואגדה קטלאנית. מרהיב גם רק מבחוץ.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Casa+Batllo',
      },
      {
        id: 'bcn-gracia',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Via_Barcelona_Casa_Mil%C3%A0.JPG/500px-Via_Barcelona_Casa_Mil%C3%A0.JPG',
        tags: ['romantic'],
        priceLevel: 3,
        name: 'פאסג׳ דה גרסיה',
        nameLocal: 'Passeig de Gràcia',
        category: 'shopping',
        lat: 41.3926,
        lng: 2.1649,
        description:
          'שדרת היוקרה של ברצלונה - מותגים גדולים בין שני בתי גאודי (קאסה באטיו וקאסה מילה). קניות ואדריכלות באותה הליכה.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Passeig+de+Gracia',
      },
      {
        id: 'bcn-maccabi',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'הקהילה היהודית של ברצלונה (CIB)' },
        name: 'מכבי (מסעדה כשרה)',
        nameLocal: 'Maccabi Kosher Restaurant',
        category: 'kosher-food',
        lat: 41.3944,
        lng: 2.1288,
        description:
          'מסעדה כשרה בשרית ליד בית הכנסת הגדול - גריל, חומוס ומנות ישראליות. אחת הבודדות בעיר, כדאי להזמין מקום.',
        rating: 4.1,
        kosherNote: 'בשרי, בהשגחת הקהילה היהודית של ברצלונה (CIB). לוודא שעות מראש.',
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Maccabi+Barcelona',
      },
      {
        id: 'bcn-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'חב"ד - ארוחות שבת בהרשמה' },
        name: 'בית חב"ד ברצלונה',
        nameLocal: 'Chabad Barcelona',
        category: 'kosher-food',
        lat: 41.3935,
        lng: 2.1409,
        description:
          'מרכז חב"ד פעיל עם ארוחות שבת, מניינים ומידע על מוצרים כשרים בסופרמרקטים המקומיים.',
        kosherNote: 'ארוחות שבת בהרשמה מראש.',
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chabad+Barcelona',
      },
      {
        id: 'bcn-casa-mila',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Casa_Mil%C3%A0%2C_general_view.jpg/500px-Casa_Mil%C3%A0%2C_general_view.jpg',
        name: 'קאסה מילה (לה פדררה)',
        nameLocal: 'Casa Milà',
        category: 'attraction',
        lat: 41.3954,
        lng: 2.1619,
        description:
          'בניין המגורים הגלי של גאודי עם גג הארובות הסוריאליסטי - "המחצבה" שהפכה לאתר מורשת עולמית.',
        rating: 4.6,
        durationMin: 90,
        tags: ['art'],
        priceLevel: 3,
        mustSee: true,
        externalUrl: 'https://maps.google.com/?q=Casa+Mila',
      },
      {
        id: 'bcn-cathedral',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Barcelona_Cathedral_Saint_Eulalia.jpg/500px-Barcelona_Cathedral_Saint_Eulalia.jpg',
        name: 'קתדרלת ברצלונה',
        nameLocal: 'Barcelona Cathedral',
        category: 'attraction',
        lat: 41.3839,
        lng: 2.1762,
        description:
          'הקתדרלה הגותית של הרובע העתיק עם חצר האווזים המפורסמת - לא להתבלבל עם הסגרדה של גאודי.',
        rating: 4.5,
        durationMin: 60,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Barcelona+Cathedral',
      },
      {
        id: 'bcn-montjuic',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Fale_-_Spain_-_Barcelona_-_8.jpg/500px-Fale_-_Spain_-_Barcelona_-_8.jpg',
        name: 'הר מונז׳ואיק',
        nameLocal: 'Montjuïc',
        category: 'nature',
        lat: 41.3641,
        lng: 2.1655,
        description:
          'ההר של ברצלונה: מבצר עם נוף לנמל, גנים, האצטדיון האולימפי - ובערבים מסוימים מופע המזרקה הקסומה (לבדוק מראש).',
        rating: 4.6,
        durationMin: 180,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Montjuic',
      },
      {
        id: 'bcn-born',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Santa_Maria_del_Mar%2C_Barcelona_05.jpg/500px-Santa_Maria_del_Mar%2C_Barcelona_05.jpg',
        name: 'רובע אל בורן',
        nameLocal: 'El Born & Santa Maria del Mar',
        category: 'attraction',
        lat: 41.3838,
        lng: 2.182,
        description:
          'בזיליקת סנטה מריה דל מאר הגותית, סמטאות בוהמייניות ובארים של טאפאס - הרובע הכי תוסס אחרי רדת החשכה.',
        rating: 4.6,
        durationMin: 90,
        tags: ['nightlife', 'romantic', 'history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=El+Born+Barcelona',
      },
      {
        id: 'bcn-picasso',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Museu_Picasso_Barcelona.jpg/500px-Museu_Picasso_Barcelona.jpg',
        name: 'מוזיאון פיקאסו',
        nameLocal: 'Museu Picasso',
        category: 'museum',
        lat: 41.3852,
        lng: 2.1809,
        description:
          'חמישה ארמונות גותיים ברובע אל בורן עם האוסף המרכזי של פיקאסו הצעיר - כולל סדרת לאס מנינאס המלאה.',
        rating: 4.5,
        durationMin: 90,
        tags: ['art'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Museu+Picasso',
      },
      {
        id: 'bcn-ciutadella',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Ciutadella_Park_fountain.jpg/500px-Ciutadella_Park_fountain.jpg',
        name: 'פארק סיוטדיה',
        nameLocal: 'Parc de la Ciutadella',
        category: 'nature',
        lat: 41.3881,
        lng: 2.1874,
        description:
          'הפארק המרכזי של העיר - מזרקה מונומנטלית שגאודי הצעיר השתתף בעיצובה, סירות משוטים והפרלמנט הקטלאני.',
        rating: 4.5,
        durationMin: 90,
        tags: ['families', 'outdoors'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Parc+de+la+Ciutadella',
      },
      {
        id: 'bcn-camp-nou',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Camp_Nou_aerial.jpg/500px-Camp_Nou_aerial.jpg',
        name: 'קאמפ נואו',
        nameLocal: 'Camp Nou (Spotify Camp Nou)',
        category: 'attraction',
        lat: 41.3809,
        lng: 2.1228,
        description:
          'האצטדיון האגדי של ברצלונה - סיור ומוזיאון לחובבי כדורגל. בתקופת השיפוץ הגדול לבדוק מראש מה פתוח.',
        rating: 4.5,
        durationMin: 120,
        tags: ['families'],
        priceLevel: 3,
        externalUrl: 'https://maps.google.com/?q=Camp+Nou',
      },
      {
        id: 'bcn-tibidabo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Temple_del_Sagrat_Cor_vist_des_de_la_Talaia_del_Tibidabo.JPG/500px-Temple_del_Sagrat_Cor_vist_des_de_la_Talaia_del_Tibidabo.JPG',
        name: 'טיבידאבו',
        nameLocal: 'Tibidabo',
        category: 'viewpoint',
        lat: 41.4225,
        lng: 2.1187,
        description:
          'ההר הגבוה מעל העיר - כנסייה נוצצת, לונה פארק היסטורי ונוף עד הים. עולים בפוניקולר ההיסטורי.',
        rating: 4.5,
        durationMin: 180,
        tags: ['families', 'outdoors'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Tibidabo',
      },
      {
        id: 'bcn-bunkers',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Tur%C3%B3_Rovira.jpg/500px-Tur%C3%B3_Rovira.jpg',
        name: 'בונקרס דל כרמל',
        nameLocal: 'Bunkers del Carmel',
        category: 'viewpoint',
        lat: 41.4194,
        lng: 2.1615,
        description:
          'עמדות נ"מ ממלחמת האזרחים שהפכו לתצפית ה-360 האהובה על המקומיים - שקיעה עם כל ברצלונה מתחת.',
        rating: 4.6,
        durationMin: 90,
        tags: ['outdoors', 'nightlife'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Bunkers+del+Carmel',
      },
      {
        id: 'bcn-sant-pau',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Hospital_Sant_Pau%2C_main_facade.jpg/500px-Hospital_Sant_Pau%2C_main_facade.jpg',
        name: 'מתחם סנט פאו המודרניסטי',
        nameLocal: 'Recinte Modernista de Sant Pau',
        category: 'attraction',
        lat: 41.4114,
        lng: 2.1743,
        description:
          'מתחם בית החולים המודרניסטי של דומנק אי מונטנר (אתר מורשת עולמית) - ביתני פסיפס בגן, 5 דקות מהסגרדה.',
        rating: 4.6,
        durationMin: 90,
        tags: ['art', 'history'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Recinte+Modernista+Sant+Pau',
      },
      {
        id: 'bcn-mnac',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Museu_nacional_d%27art_de_catalunya_2.jpg/500px-Museu_nacional_d%27art_de_catalunya_2.jpg',
        name: 'מוזיאון האמנות הלאומי (MNAC)',
        nameLocal: "Museu Nacional d'Art de Catalunya",
        category: 'museum',
        lat: 41.3684,
        lng: 2.1536,
        description:
          'הארמון הלאומי על מונז׳ואיק עם אוסף ציורי הקיר הרומנסקיים החשוב בעולם - והמדרגות שלפניו הן תצפית בפני עצמה.',
        rating: 4.6,
        durationMin: 120,
        tags: ['art'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=MNAC+Barcelona',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'גאודי הגדול',
        placeIds: ['bcn-sagrada', 'bcn-guell', 'bcn-maccabi'],
        notes: 'סגרדה פמיליה בבוקר, פארק גואל אחר הצהריים (20 דקות באוטובוס ביניהם), ערב כשר במכבי.',
      },
      {
        day: 2,
        title: 'העיר העתיקה',
        placeIds: ['bcn-gothic', 'bcn-boqueria', 'bcn-batllo'],
        notes: 'רובע גותי כולל אל קול היהודי, שוק הבוקריה לצהריים, ובדרך חזרה קאסה באטיו מוארת.',
      },
      {
        day: 3,
        title: 'ים וטיילת',
        placeIds: ['bcn-barceloneta'],
        notes: 'בוקר רגוע בחוף, שכירת אופניים לאורך הטיילת. אפשר לשלב שיט קצר מהנמל.',
      },
    ],
    practical: {
      flights: 'טיסות ישירות מנתב"ג (אל על, ווִאלינג, ישראייר) - כ-4.5 שעות.',
      gettingAround:
        'מטרו מצוין ומקיף. כרטיס T-Casual (10 נסיעות) משתלם. מרכז העיר נעים להליכה. להיזהר מכייסים במטרו ובלה רמבלה - תיק קדימה.',
      kosherOverview:
        'קהילה יהודית ותיקה עם מסעדת מכבי הכשרה, חב"ד פעיל וההיסטוריה של אל קול - הרובע היהודי מימי הביניים. פחות שפע מרומא או בודפשט, אבל מסתדרים; רבים משלבים בישול עצמי עם מוצרים כשרים מהסופר.',
    },
  },
  {
    slug: 'berlin',
    name: 'ברלין',
    nameLocal: 'Berlin',
    countrySlug: 'germany',
    flag: '🇩🇪',
    center: { lat: 52.52, lng: 13.405 },
    zoom: 12,
    tagline: 'עיר של היסטוריה כבדה ואנרגיה צעירה - וקהילה ישראלית ענקית',
    photo:
      'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1600&q=70',
    iconicLandmark: {
      name: 'שער ברנדנבורג',
      nameLocal: 'Brandenburg Gate',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburger_Tor_abends.jpg/500px-Brandenburger_Tor_abends.jpg',
      blurb:
        'השער הניאו-קלאסי מהמאה ה-18, סמלה של ברלין ושל איחוד גרמניה.',
    },
    summary:
      'ברלין היא עיר שכל ישראלי חווה אחרת: היסטוריה יהודית שאי אפשר ולא צריך לברוח ממנה, לצד סצנה צעירה, זולה ויצירתית עם עשרות אלפי ישראלים שחיים בה. גלריות, פארקים, שווקים - והכול רחב, ירוק ונגיש.',
    bestSeason: 'מאי-ספטמבר',
    places: [
      {
        id: 'ber-brandenburg',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburger_Tor_abends.jpg/500px-Brandenburger_Tor_abends.jpg',
        tags: ['history'],
        priceLevel: 0,
        mustSee: true,
        name: 'שער ברנדנבורג',
        nameLocal: 'Brandenburg Gate',
        category: 'attraction',
        lat: 52.5163,
        lng: 13.3777,
        description:
          'הסמל של ברלין ושל איחוד גרמניה. מכאן מתחיל ציר הטיול הקלאסי: רייכסטאג, אנדרטת השואה ואונטר דן לינדן.',
        rating: 4.7,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Brandenburg+Gate',
      },
      {
        id: 'ber-reichstag',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Berlin_reichstag_west_panorama_2.jpg/500px-Berlin_reichstag_west_panorama_2.jpg',
        tags: ['history'],
        priceLevel: 0,
        mustSee: true,
        name: 'הרייכסטאג וכיפת הזכוכית',
        nameLocal: 'Reichstag Building',
        category: 'attraction',
        lat: 52.5186,
        lng: 13.3762,
        description:
          'בניין הפרלמנט עם כיפת הזכוכית של נורמן פוסטר - כניסה חינם אבל רק בהרשמה מראש באתר הבונדסטאג.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Reichstag',
      },
      {
        id: 'ber-memorial',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Memorial_to_the_Murdered_Jews_of_Europeabove.jpg/500px-Memorial_to_the_Murdered_Jews_of_Europeabove.jpg',
        tags: ['history'],
        priceLevel: 0,
        mustSee: true,
        name: 'אנדרטת השואה',
        nameLocal: 'Memorial to the Murdered Jews of Europe',
        category: 'attraction',
        lat: 52.5139,
        lng: 13.3789,
        description:
          '2,711 בלוקי בטון בלב ברלין. מרכz המידע התת-קרקעי מומלץ ומטלטל. חוויה שכל ישראלי צריך לעצמו.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Holocaust+Memorial+Berlin',
      },
      {
        id: 'ber-museum-island',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Berlin_Museumsinsel_Fernsehturm.jpg/500px-Berlin_Museumsinsel_Fernsehturm.jpg',
        tags: ['art', 'history'],
        priceLevel: 2,
        mustSee: true,
        name: 'אי המוזיאונים',
        nameLocal: 'Museum Island',
        category: 'museum',
        lat: 52.5169,
        lng: 13.401,
        description:
          'חמישה מוזיאונים עולמיים על אי בנהר השפרה, כולל שער אישתר במוזיאון פרגמון (בשיפוץ חלקי - לבדוק מה פתוח).',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Museum+Island',
      },
      {
        id: 'ber-eastside',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Segment_with_Graffiti_of_the_Berlin_Wall_%283_of_4%29_%28cropped%29.jpg/500px-Segment_with_Graffiti_of_the_Berlin_Wall_%283_of_4%29_%28cropped%29.jpg',
        tags: ['history', 'art'],
        priceLevel: 0,
        mustSee: true,
        name: 'איסט סייד גאלרי',
        nameLocal: 'East Side Gallery',
        category: 'attraction',
        lat: 52.505,
        lng: 13.4399,
        description:
          'הקטע הארוך ששרד מחומת ברלין, מכוסה ביותר מ-100 ציורי קיר - כולל הנשיקה המפורסמת. הליכה של 1.3 ק"מ לאורך הנהר.',
        rating: 4.6,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=East+Side+Gallery',
      },
      {
        id: 'ber-jewish-museum',
        tags: ['history'],
        priceLevel: 1,
        name: 'המוזיאון היהודי',
        nameLocal: 'Jewish Museum Berlin',
        category: 'museum',
        lat: 52.5027,
        lng: 13.3949,
        description:
          'הבניין המפורסם של דניאל ליבסקינד - אדריכלות שמספרת את סיפור יהדות גרמניה דרך חללים ריקים וצירים שבורים.',
        rating: 4.5,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Jewish+Museum+Berlin',
      },
      {
        id: 'ber-kudamm',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Berlin_-_K%C3%BCrfurstendamm_Gehsteig.jpg/500px-Berlin_-_K%C3%BCrfurstendamm_Gehsteig.jpg',
        tags: ['families'],
        priceLevel: 3,
        name: 'קורפירסטנדאם (קודאם)',
        nameLocal: "Kurfürstendamm & KaDeWe",
        category: 'shopping',
        lat: 52.5027,
        lng: 13.3317,
        description:
          'שדרת הקניות ההיסטורית של מערב ברלין, ובקצה שלה KaDeWe - הכולבו המפואר של אירופה. ליד המרכז היהודי בשרלוטנבורג.',
        rating: 4.4,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Kurfurstendamm',
      },
      {
        id: 'ber-bleibergs',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'השגחה מקומית - חלבי' },
        name: 'בלייברגס (קפה כשר חלבי)',
        nameLocal: "Bleibergs Café",
        category: 'kosher-food',
        lat: 52.5011,
        lng: 13.3349,
        description:
          'קפה-מסעדה חלבי כשר בשרלוטנבורג - שקשוקה, סלטים ועוגות, אווירה ישראלית-ברלינאית.',
        rating: 4.2,
        kosherNote: 'חלבי, בהשגחה. סגור בשבת.',
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Bleibergs+Berlin',
      },
      {
        id: 'ber-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: { source: 'curated', lastChecked: 'pending-review', supervision: 'חב"ד - ארוחות שבת בהרשמה' },
        name: 'בית חב"ד ברלין',
        nameLocal: 'Chabad Berlin',
        category: 'kosher-food',
        lat: 52.5017,
        lng: 13.3213,
        description:
          'מרכז יהודי גדול בשרלוטנבורג עם בית כנסת, ארוחות שבת וחנות כשרה צמודה.',
        kosherNote: 'ארוחות שבת בהרשמה. בחנות מבחר מוצרים כשרים טוב.',
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chabad+Berlin',
      },
      {
        id: 'ber-checkpoint',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Berlin_-_Checkpoint_Charlie_1963.jpg/500px-Berlin_-_Checkpoint_Charlie_1963.jpg',
        name: 'צ׳קפוינט צ׳רלי',
        nameLocal: 'Checkpoint Charlie',
        category: 'attraction',
        lat: 52.5075,
        lng: 13.3904,
        description:
          'מעבר הגבול המפורסם של המלחמה הקרה - שחזור הביתן, ולוחות מידע על סיפורי הבריחות מסביב.',
        rating: 4.3,
        durationMin: 45,
        tags: ['history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Checkpoint+Charlie',
      },
      {
        id: 'ber-tv-tower',
        name: 'מגדל הטלוויזיה',
        nameLocal: 'Fernsehturm (Alexanderplatz)',
        category: 'viewpoint',
        lat: 52.5208,
        lng: 13.4094,
        description:
          'סמל מזרח ברלין באלכסנדרפלאץ - תצפית מהכדור על כל העיר. כרטיסים מראש מקצרים את התור.',
        rating: 4.5,
        durationMin: 90,
        tags: ['families'],
        priceLevel: 3,
        externalUrl: 'https://maps.google.com/?q=Fernsehturm+Berlin',
      },
      {
        id: 'ber-tiergarten',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Berlin_Tiergarten_Siegess%C3%A4ule_Luftansicht.jpg/500px-Berlin_Tiergarten_Siegess%C3%A4ule_Luftansicht.jpg',
        name: 'טירגארטן ועמוד הניצחון',
        nameLocal: 'Tiergarten & Siegessäule',
        category: 'nature',
        lat: 52.5145,
        lng: 13.3501,
        description:
          'הפארק המרכזי הענק של ברלין עם עמוד הניצחון המוזהב במרכזו - שכירת אופניים היא הדרך לחצות אותו.',
        rating: 4.5,
        durationMin: 120,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Tiergarten+Berlin',
      },
      {
        id: 'ber-gendarmenmarkt',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Gendarmenmarkt_Panorama.jpg/500px-Gendarmenmarkt_Panorama.jpg',
        name: 'ז׳נדרמנמרקט',
        nameLocal: 'Gendarmenmarkt',
        category: 'attraction',
        lat: 52.5138,
        lng: 13.3927,
        description:
          'הכיכר האלגנטית של ברלין: שתי כנסיות תאומות ובית הקונצרטים ביניהן. בדצמבר - שוק חג מולד מפורסם.',
        rating: 4.6,
        durationMin: 45,
        tags: ['romantic', 'history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Gendarmenmarkt',
      },
      {
        id: 'ber-hackesche',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Hackesche_h%C3%B6fe_berlin.jpg/500px-Hackesche_h%C3%B6fe_berlin.jpg',
        name: 'האקשה הפה',
        nameLocal: 'Hackesche Höfe',
        category: 'attraction',
        lat: 52.5246,
        lng: 13.4023,
        description:
          'שמונה חצרות אר-נובו משתלבות במיטה - בוטיקים, גלריות וקולנוע; ובסמטה הצמודה חצר האוס שוורצנברג המכוסה גרפיטי.',
        rating: 4.5,
        durationMin: 75,
        tags: ['art', 'nightlife'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Hackesche+Hofe',
      },
      {
        id: 'ber-neue-synagoge',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Neue_Synagoge%2C_Berlin-Mitte%2C_160328%2C_ako.jpg/500px-Neue_Synagoge%2C_Berlin-Mitte%2C_160328%2C_ako.jpg',
        name: 'בית הכנסת החדש',
        nameLocal: 'Neue Synagoge',
        category: 'attraction',
        lat: 52.5249,
        lng: 13.3944,
        description:
          'בית הכנסת עם כיפת הזהב המנצנצת ברחוב אורנינבורגר - שוחזר אחרי המלחמה כמרכז תיעוד של יהדות ברלין.',
        rating: 4.5,
        durationMin: 60,
        tags: ['history'],
        priceLevel: 1,
        externalUrl: 'https://maps.google.com/?q=Neue+Synagoge+Berlin',
      },
      {
        id: 'ber-topography',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Topographie_des_Terrors_Neubau.jpg/500px-Topographie_des_Terrors_Neubau.jpg',
        name: 'טופוגרפיה של הטרור',
        nameLocal: 'Topography of Terror',
        category: 'museum',
        lat: 52.5065,
        lng: 13.3836,
        description:
          'מרכז התיעוד בשטח מטה הגסטפו וה-SS לשעבר - תיעוד מקיף ומטלטל של מנגנון הטרור הנאצי. הכניסה חינם.',
        rating: 4.6,
        durationMin: 120,
        tags: ['history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Topography+of+Terror',
      },
      {
        id: 'ber-charlottenburg',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Charlottenburg_Hohenzollern_2.jpg/500px-Charlottenburg_Hohenzollern_2.jpg',
        name: 'ארמון שרלוטנבורג',
        nameLocal: 'Charlottenburg Palace',
        category: 'attraction',
        lat: 52.5208,
        lng: 13.2957,
        description:
          'ארמון הבארוק הגדול של ברלין עם גנים צרפתיים על נהר השפרה - פרוסיה המלכותית במיטבה, לא רחוק מהמרכז היהודי.',
        rating: 4.5,
        durationMin: 150,
        tags: ['history', 'romantic'],
        priceLevel: 2,
        externalUrl: 'https://maps.google.com/?q=Charlottenburg+Palace',
      },
      {
        id: 'ber-mauerpark',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Mauerpark_1979.jpg/500px-Mauerpark_1979.jpg',
        name: 'מאוארפארק',
        nameLocal: 'Mauerpark',
        category: 'nature',
        lat: 52.5439,
        lng: 13.4022,
        description:
          'הפארק על תוואי החומה שבימי ראשון הופך למוסד ברלינאי: שוק פשפשים ענק וקריוקי המוני באמפיתיאטרון.',
        rating: 4.5,
        durationMin: 120,
        tags: ['nightlife', 'families', 'outdoors'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Mauerpark',
      },
      {
        id: 'ber-tempelhof',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Tempelhofer_Feld_May_2021.jpg/500px-Tempelhofer_Feld_May_2021.jpg',
        name: 'שדה טמפלהוף',
        nameLocal: 'Tempelhofer Feld',
        category: 'nature',
        lat: 52.4736,
        lng: 13.4018,
        description:
          'שדה התעופה ההיסטורי שהפך לפארק עירוני עצום - רוכבים ומחליקים על המסלולים שבהם נחתה הרכבת האווירית.',
        rating: 4.6,
        durationMin: 120,
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Tempelhofer+Feld',
      },
      {
        id: 'ber-potsdamer',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Berlin_-_Potsdamer_Platz_-_2016.jpg/500px-Berlin_-_Potsdamer_Platz_-_2016.jpg',
        name: 'פוטסדאמר פלאץ',
        nameLocal: 'Potsdamer Platz',
        category: 'attraction',
        lat: 52.5096,
        lng: 13.3759,
        description:
          'הכיכר שהייתה שממת החומה והפכה למרכז זכוכית מודרני - סוני סנטר, ושרידי חומה משולבים במדרכה.',
        rating: 4.2,
        durationMin: 45,
        tags: ['history'],
        priceLevel: 0,
        externalUrl: 'https://maps.google.com/?q=Potsdamer+Platz',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'הציר ההיסטורי',
        placeIds: ['ber-brandenburg', 'ber-reichstag', 'ber-memorial'],
        notes: 'להרשם לכיפת הרייכסטאג מראש. שלושת האתרים במרחק הליכה זה מזה.',
      },
      {
        day: 2,
        title: 'מוזיאונים וזיכרון',
        placeIds: ['ber-museum-island', 'ber-jewish-museum', 'ber-bleibergs'],
        notes: 'בוקר באי המוזיאונים, אחה"צ במוזיאון היהודי, וערב שקשוקה כשרה בשרלוטנבורג.',
      },
      {
        day: 3,
        title: 'החומה וברלין הצעירה',
        placeIds: ['ber-eastside', 'ber-chabad'],
        notes: 'איסט סייד גאלרי ושוטטות בקרויצברג/פרידריכסהיין. שישי? ארוחת שבת בחב"ד.',
      },
    ],
    practical: {
      flights: 'טיסות ישירות מנתב"ג ל-BER (אל על, ריינאייר, איזיג׳ט) - כ-4.5 שעות.',
      gettingAround:
        'U-Bahn, S-Bahn, חשמליות ואופניים - רשת מעולה. כרטיס יומי/שבועי משתלם. העיר ענקית, לתכנן לפי אזורים.',
      kosherOverview:
        'הקהילה היהודית מתרכזת בשרלוטנבורג: בלייברגס החלבי, חנות כשרה ליד חב"ד, ומסעדות נוספות משתנות - לבדוק עדכני. בזכות הקהילה הישראלית הגדולה יש גם המון אוכל ישראלי (לא בהכרח כשר) בכל העיר.',
    },
  },
  {
    slug: 'bangkok',
    name: 'בנגקוק',
    nameLocal: 'Bangkok / กรุงเทพมหานคร',
    countrySlug: 'thailand',
    flag: '🇹🇭',
    center: { lat: 13.7563, lng: 100.5018 },
    zoom: 12,
    tagline: 'מקדשי זהב, אוכל רחוב עולמי וחב"ד בלב אזור התרמילאים',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Chao_Phraya_River_Skyline_-_panoramio.jpg/500px-Chao_Phraya_River_Skyline_-_panoramio.jpg',
    iconicLandmark: {
      name: 'הארמון המלכותי ווואט פרה קאו',
      nameLocal: 'Grand Palace & Wat Phra Kaew',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/A_roof_of_a_building_at_the_Grand_Palace%2C_Bangkok%2C_sunrise%2C_2017.jpg/500px-A_roof_of_a_building_at_the_Grand_Palace%2C_Bangkok%2C_sunrise%2C_2017.jpg',
      blurb:
        'המתחם המלכותי לשעבר עם גגות הזהב הרב-שכבתיים - האתר המזוהה ביותר עם תאילנד, ומהמבוקרים בעולם.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'טיסה ישירה יציבה, אוכל רחוב ברמה עולמית ותשתית כשרות אמיתית סביב חב"ד - אבל החום והלחות דורשים קצב איטי יותר מאירופה.',
    },
    summary:
      'בנגקוק היא היעד הראשון של טיול+ מחוץ לאירופה: עיר ענקית ותוססת עם מקדשים מוזהבים לצד גורדי שחקים, שוק הסופ"ש הגדול בעולם, ואוכל רחוב שנחשב מהטובים בעולם. לישראלים היא גם עיר עם היסטוריה ארוכה - בית חב"ד באזור חאו סאן מזוהה מזה עשורים עם דור התרמילאים אחרי הצבא.',
    bestSeason: 'נובמבר-פברואר (עונה יבשה וקרירה יחסית) - מרץ-מאי חם ולח מאוד, יוני-אוקטובר עונת המונסון',
    places: [
      {
        id: 'bkk-grandpalace',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/A_roof_of_a_building_at_the_Grand_Palace%2C_Bangkok%2C_sunrise%2C_2017.jpg/500px-A_roof_of_a_building_at_the_Grand_Palace%2C_Bangkok%2C_sunrise%2C_2017.jpg',
        tags: ['history', 'families'],
        priceLevel: 2,
        mustSee: true,
        name: 'הארמון המלכותי ווואט פרה קאו',
        nameLocal: 'Grand Palace & Wat Phra Kaew',
        category: 'attraction',
        lat: 13.7501,
        lng: 100.492,
        description:
          'המתחם המלכותי לשעבר, ובתוכו וואט פרה קאו - המקדש השומר על פסל בודהה האמרלד המקודש ביותר בתאילנד. האתר המבוקר ביותר בממלכה; להגיע עם כתפיים וברכיים מכוסות.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Grand+Palace+Bangkok',
      },
      {
        id: 'bkk-watarun',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Templo_Wat_Arun%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_30.jpg/500px-Templo_Wat_Arun%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_30.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'וואט ארון - מקדש השחר',
        nameLocal: 'Wat Arun',
        category: 'attraction',
        lat: 13.7436,
        lng: 100.4889,
        description:
          'מקדש על גדת הנהר המערבית, מגדל פרנג מעוטר בקרמיקה וקונכיות. יפה במיוחד בשקיעה, ומהצד השני של הנהר בלילה כשהוא מואר.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Wat+Arun+Bangkok',
      },
      {
        id: 'bkk-watpho',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Wat_Pho%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_02.jpg/500px-Wat_Pho%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_02.jpg',
        tags: ['history'],
        priceLevel: 1,
        mustSee: true,
        name: 'וואט פו - מקדש הבודהה השוכב',
        nameLocal: 'Wat Pho',
        category: 'attraction',
        lat: 13.7464,
        lng: 100.4936,
        description:
          'המקדש העתיק והגדול ביותר בבנגקוק, עם פסל בודהה שוכב מוזהב באורך 46 מטר. גם ביתו המסורתי של בית הספר לעיסוי תאילנדי.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Wat+Pho+Bangkok',
      },
      {
        id: 'bkk-wattraimit',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/2016_Bangkok%2C_Dystrykt_Samphanthawong%2C_Wat_Traimit_Witthayaram_%2817%29.jpg/500px-2016_Bangkok%2C_Dystrykt_Samphanthawong%2C_Wat_Traimit_Witthayaram_%2817%29.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'וואט טריימיט - הבודהה מזהב',
        nameLocal: 'Wat Traimit (Golden Buddha)',
        category: 'attraction',
        lat: 13.7381,
        lng: 100.5136,
        description:
          'פסל בודהה מזהב מוצק במשקל 5.5 טונות, שהתגלה במקרה מתחת לציפוי טיח ב-1955. עומד בכניסה לרובע הסיני.',
        rating: 4.5,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Wat+Traimit+Bangkok',
      },
      {
        id: 'bkk-yaowarat',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Yaowarat_Road_Bangkok.jpg/500px-Yaowarat_Road_Bangkok.jpg',
        tags: ['foodie', 'nightlife'],
        priceLevel: 0,
        name: 'יאווארט - הרובע הסיני',
        nameLocal: 'Yaowarat Road (Chinatown)',
        category: 'attraction',
        lat: 13.7398,
        lng: 100.5083,
        description:
          'הרחוב הראשי של הרובע הסיני של בנגקוק - שלטי ניאון, דוכני אוכל רחוב ברמה עולמית וחנויות זהב. הכי תוסס בשעות הערב.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Yaowarat+Road+Bangkok',
      },
      {
        id: 'bkk-onlokyun',
        tags: ['foodie'],
        priceLevel: 0,
        name: 'און לוק יון - מסעדת בוקר ותיקה',
        nameLocal: 'On Lok Yun',
        category: 'cafe',
        lat: 13.7511,
        lng: 100.4978,
        description:
          'מסעדת בוקר תאילנדית-סינית כמעט בת 80 שנה ליד העיר העתיקה - טוסט חמאה, ביצים ותה חלב תאילנדי. לא כשרה, אבל מוסד בנגקוקי אמיתי. סגורה בימי ראשון.',
        rating: 4.3,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=On+Lok+Yun+Bangkok',
      },
      {
        id: 'bkk-chatuchak',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Chatuchak_Weekend_Market%2C_Bangkok%2C_Thailand_%284570440063%29.jpg/500px-Chatuchak_Weekend_Market%2C_Bangkok%2C_Thailand_%284570440063%29.jpg',
        tags: ['families', 'foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'שוק צ׳טוצ׳ק',
        nameLocal: 'Chatuchak Weekend Market',
        category: 'shopping',
        lat: 13.8008,
        lng: 100.5514,
        description:
          'שוק הסופ"ש הגדול בעולם - יותר מ-15,000 דוכנים של בגדים, אמנות, צמחים ואוכל. פתוח שבת-ראשון בלבד; אם הביקור באמצע השבוע, מחליפים אותו ביום קניות אחר.',
        rating: 4.5,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Chatuchak+Weekend+Market',
      },
      {
        id: 'bkk-jimthompson',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Jim_Thompson_House_spirit_house.JPG/500px-Jim_Thompson_House_spirit_house.JPG',
        tags: ['art', 'history'],
        priceLevel: 2,
        name: 'בית ג׳ים תומפסון',
        nameLocal: 'Jim Thompson House',
        category: 'museum',
        lat: 13.7492,
        lng: 100.5283,
        description:
          'בית עץ תאילנדי מסורתי של היזם האמריקאי שהחיה את תעשיית המשי המקומית ונעלם ללא עקבות ב-1967. אוסף אמנות ועתיקות אסייתיות בתוך גינה טרופית.',
        rating: 4.5,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Jim+Thompson+House',
      },
      {
        id: 'bkk-lumphini',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Parque_Lumphini%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_01.jpg/500px-Parque_Lumphini%2C_Bangkok%2C_Tailandia%2C_2013-08-22%2C_DD_01.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 0,
        name: 'פארק לומפיני',
        nameLocal: 'Lumphini Park',
        category: 'nature',
        lat: 13.7306,
        lng: 100.5417,
        description:
          'הריאה הירוקה של בנגקוק במרכז העיר - אגם עם סירות דוושה, ולטאות ניטור ענקיות שמסתובבות חופשי, ובוקרים עם המוני מתרגלי טאי צ׳י.',
        rating: 4.4,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Lumphini+Park+Bangkok',
      },
      {
        id: 'bkk-mahanakhon',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Bangkok_-_King_Power_Mahanakhon_%E0%B8%84%E0%B8%B4%E0%B8%87_%E0%B9%80%E0%B8%9E%E0%B8%B2%E0%B9%80%E0%B8%A7%E0%B8%AD%E0%B8%A3%E0%B9%8C_%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3_2021_May.jpg/500px-Bangkok_-_King_Power_Mahanakhon_%E0%B8%84%E0%B8%B4%E0%B8%87_%E0%B9%80%E0%B8%9E%E0%B8%B2%E0%B9%80%E0%B8%A7%E0%B8%AD%E0%B8%A3%E0%B9%8C_%E0%B8%A1%E0%B8%AB%E0%B8%B2%E0%B8%99%E0%B8%84%E0%B8%A3_2021_May.jpg',
        tags: ['romantic'],
        priceLevel: 3,
        name: 'מהאנקהון סקייווק',
        nameLocal: 'King Power Mahanakhon SkyWalk',
        category: 'viewpoint',
        lat: 13.7236,
        lng: 100.5283,
        description:
          'מגדל התצפית הגבוה בתאילנד (314 מטר) עם רצפת זכוכית שקופה. הפנורמה על העיר, הנהר וגורדי השחקים משם עוצרת נשימה - במיוחד לקראת השקיעה.',
        rating: 4.5,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=King+Power+Mahanakhon',
      },
      {
        id: 'bkk-iconsiam',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Iconsiam_Skyscrapers.jpg/500px-Iconsiam_Skyscrapers.jpg',
        tags: ['families', 'foodie'],
        priceLevel: 2,
        name: 'אייקונסיאם',
        nameLocal: 'ICONSIAM',
        category: 'shopping',
        lat: 13.7267,
        lng: 100.5105,
        description:
          'קניון ענק על גדת הנהר עם שוק צף מקורה בפנים ומותגי יוקרה. מגיעים בסירת חינם קצרה מתחנת הרכבת הקלה.',
        rating: 4.5,
        durationMin: 105,
        externalUrl: 'https://maps.google.com/?q=ICONSIAM+Bangkok',
      },
      {
        id: 'bkk-asiatique',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/The_Sirimahannop_at_Asiatique_during_sunset%2C_Bangkok_2.jpg/500px-The_Sirimahannop_at_Asiatique_during_sunset%2C_Bangkok_2.jpg',
        tags: ['families', 'nightlife', 'foodie'],
        priceLevel: 1,
        name: 'אסיאטיק - שוק הלילה על הנהר',
        nameLocal: 'Asiatique The Riverfront',
        category: 'attraction',
        lat: 13.7043,
        lng: 100.5058,
        description:
          'מחסני נמל ישנים שהפכו לשוק לילה על הנהר - חנויות, מסעדות וגלגל ענק. מגיעים בסירת חינם; נעים במיוחד לביקור בערב.',
        rating: 4.4,
        durationMin: 105,
        externalUrl: 'https://maps.google.com/?q=Asiatique+The+Riverfront',
      },
      {
        id: 'bkk-erawan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Erawan_Shrine_Bangkok_2021_May.jpg/500px-Erawan_Shrine_Bangkok_2021_May.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'מקדש אראוואן',
        nameLocal: 'Erawan Shrine',
        category: 'attraction',
        lat: 13.7444,
        lng: 100.5404,
        description:
          'מקדש הינדי קטן לאל ברהמה, בלב צומת קניות סואן. אתר פולחן פעיל שמושך תיירים ומקומיים לאורך כל היום.',
        rating: 4.4,
        durationMin: 20,
        externalUrl: 'https://maps.google.com/?q=Erawan+Shrine+Bangkok',
      },
      {
        id: 'bkk-khaosan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/2016_Bangkok%2C_Dystrykt_Phra_Nakhon%2C_Ulica_Khaosan_%2808%29.jpg/500px-2016_Bangkok%2C_Dystrykt_Phra_Nakhon%2C_Ulica_Khaosan_%2808%29.jpg',
        tags: ['nightlife', 'foodie'],
        priceLevel: 1,
        name: 'חאו סאן רוד',
        nameLocal: 'Khao San Road',
        category: 'attraction',
        lat: 13.759,
        lng: 100.4977,
        description:
          'רחוב התרמילאים המפורסם בעולם - שווקי רחוב, ברים ואווירה שמזוהה עמוק עם גל התרמילאים הישראלי. בית חב"ד נמצא כאן, במרחק הליכה.',
        rating: 4.2,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Khao+San+Road',
      },
      {
        id: 'bkk-riverboat',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'סירות האקספרס של נהר צ׳או פראיה',
        nameLocal: 'Chao Phraya Express Boat',
        category: 'attraction',
        lat: 13.744,
        lng: 100.493,
        description:
          'קווי הסירות הציבוריות לאורך הנהר - הדרך הזולה והכיפית ביותר לראות את העיר העתיקה מהמים, ולעבור בין רוב האתרים המרכזיים.',
        rating: 4.4,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Chao+Phraya+Express+Boat',
      },
      {
        id: 'bkk-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד בנגקוק (אור מנחם)',
        },
        name: 'בית חב"ד אור מנחם (מסעדה כשרה)',
        nameLocal: 'Chabad House Bangkok - Ohr Menachem',
        category: 'kosher-food',
        lat: 13.7592,
        lng: 100.4966,
        description:
          'בית חב"ד ותיק וגדול באזור חאו סאן, עם מסעדה בשרית וקפה חלבי הפתוחים לאורך השבוע - כתובת מפגש מרכזית לתרמילאים הישראלים בבנגקוק.',
        rating: 4.4,
        kosherNote:
          'בשרי + חלבי (חללים נפרדים). ארוחות שבת בהרשמה מראש - מומלץ ליצור קשר עם בית חב"ד לפני ההגעה.',
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Chabad+House+Bangkok',
      },
      {
        id: 'bkk-jcafe',
        priceLevel: 1,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'חנות - מוצרים ארוזים עם הכשרים',
        },
        name: 'J Cafe - מכולת כשרה',
        nameLocal: 'J Cafe Kosher Shoppe',
        category: 'kosher-market',
        lat: 13.7398,
        lng: 100.5622,
        description:
          'חנות מכולת כשרה וקפה בסוכומווית 20, עם ייבוא מוצרים מישראל - שימושי למי שמתארגן לבשל בעצמו או מחפש נשנוש כשר מוכר.',
        kosherNote: 'מוצרים ארוזים עם הכשרים. השילוט ברחוב לא בולט - לחפש לפי הכתובת המדויקת מראש.',
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=J+Cafe+Kosher+Shoppe+Bangkok',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'רטנקוסין - העיר העתיקה',
        placeIds: ['bkk-grandpalace', 'bkk-watpho', 'bkk-riverboat', 'bkk-watarun'],
        notes:
          'מתחילים מוקדם, לפני החום והקהל, בארמון המלכותי. חוצים ברגל לוואט פו, ואז בסירה לוואט ארון בצד השני של הנהר. כתפיים וברכיים מכוסות בכל המקדשים.',
      },
      {
        day: 2,
        title: 'הרובע הסיני ושוק הענק',
        placeIds: ['bkk-onlokyun', 'bkk-wattraimit', 'bkk-yaowarat', 'bkk-chatuchak'],
        notes:
          'בוקר על טוסט וביצים באון לוק יון, אחר כך הבודהה מזהב ויאווארט. צ׳טוצ׳ק פתוח שבת-ראשון בלבד - באמצע השבוע מחליפים ביום קניות באייקונסיאם.',
      },
      {
        day: 3,
        title: 'בנגקוק המודרנית',
        placeIds: ['bkk-jimthompson', 'bkk-erawan', 'bkk-mahanakhon', 'bkk-iconsiam'],
        notes: 'יום ממוזג יותר: בית ג׳ים תומפסון בבוקר, ואז מקדש אראוואן, ותצפית ממהאנקהון לקראת השקיעה.',
      },
      {
        day: 4,
        title: 'חב"ד, פארק ולילה על הנהר',
        placeIds: ['bkk-lumphini', 'bkk-chabad', 'bkk-khaosan', 'bkk-asiatique'],
        notes:
          'בוקר רגוע בלומפיני. בשישי - ארוחת שבת בבית חב"ד (בתיאום מראש). בערב, חאו סאן או שוק הלילה באסיאטיק, לפי מצב הרוח.',
      },
    ],
    practical: {
      flights:
        'אל על מטיסה ישירה מנתב"ג לבנגקוק כ-5 פעמים בשבוע (טיסה ארוכת טווח של כ-11 שעות) - לא יומי, אבל תדיר ויציב לאורך השנה.',
      gettingAround:
        'רכבת קלה BTS ומטרו MRT ממוזגים ונוחים, סירות Chao Phraya Express לאורך הנהר, מוניות מונה או אפליקציית Grab, וטוקטוק לחוויה - לסכם מחיר מראש לפני העלייה.',
      kosherOverview:
        'לא תשתית כמו באירופה, אבל אמיתית ופעילה: בית חב"ד אור מנחם באזור חאו סאן (מסעדה בשרית + קפה חלבי, כולל ארוחות שבת), וחנות/קפה כשר J Cafe בסוכומווית 20. מעבר לשני המקומות האלה אין עוד אתרים עם הכשר מאומת בעיר - לא להסתמך על מסעדות תאילנדיות רגילות.',
    },
  },
  {
    slug: 'abu-dhabi',
    name: 'אבו דאבי',
    nameLocal: 'Abu Dhabi / أبوظبي',
    countrySlug: 'uae',
    flag: '🇦🇪',
    center: { lat: 24.47, lng: 54.42 },
    zoom: 11,
    tagline: 'מסגד שיש מרהיב, אי מוזיאונים ופארקי שעשועים - היעד הערבי הראשון של טיול+',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Abu_Dhabi_Skyline_fron_Corniche_Rd.JPG/500px-Abu_Dhabi_Skyline_fron_Corniche_Rd.JPG',
    iconicLandmark: {
      name: 'מסגד שיח׳ זאיד הגדול',
      nameLocal: 'Sheikh Zayed Grand Mosque',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Sheikh_Zayed_Mosque_Silhouette.jpg/500px-Sheikh_Zayed_Mosque_Silhouette.jpg',
      blurb:
        'אחד המסגדים הגדולים בעולם - שיש לבן טהור, כיפות עגולות וחצר עמודים ענקית שהפכו אותו לסמל המזוהה ביותר עם אבו דאבי.',
    },
    editorialRating: {
      score: 4.5,
      verdict:
        'טיסה ישירה ותכופה, פטור מוויזה מלא ותשתית כשרות אמיתית שצומחת - אבל החום הקיצוני בקיץ (מעל 45 מעלות) והמחירים הגבוהים דורשים תכנון עונתי וגם תקציב.',
    },
    summary:
      'אבו דאבי היא היעד הערבי הראשון של טיול+: מאז חידוש הטיסות הישירות של אתיחאד בין נתב"ג לבירת האמירויות והרחבתן לשגרה יומית, זו קפיצה קצרה יחסית אל שילוב נדיר של מסגדי שיש ענקיים, אי מוזיאונים בעיצוב עולמי ופארקי שעשועים - לצד תשתית כשרות אמיתית שצמחה מאז הסכמי אברהם, כולל בית הכנסת הראשון שנבנה במיוחד במדינה.',
    bestSeason: 'נובמבר-מרץ (חורף נעים ויבש) - יוני-ספטמבר חם ולח מאוד, פחות מומלץ לטיול חוץ',
    places: [
      {
        id: 'auh-zayedmosque',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Sheikh_Zayed_Mosque_Silhouette.jpg/500px-Sheikh_Zayed_Mosque_Silhouette.jpg',
        tags: ['history', 'families'],
        priceLevel: 0,
        mustSee: true,
        name: 'מסגד שיח׳ זאיד הגדול',
        nameLocal: 'Sheikh Zayed Grand Mosque',
        category: 'attraction',
        lat: 24.412,
        lng: 54.474,
        description:
          'אחד המסגדים הגדולים בעולם - שיש לבן טהור, 82 כיפות, השטיח הידני-קשור הגדול בעולם ונברשות ענק מוזהבות. כניסה חינם; דרוש לבוש צנוע (לנשים מספקים עבאיה בכניסה).',
        rating: 4.8,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Sheikh+Zayed+Grand+Mosque+Abu+Dhabi',
      },
      {
        id: 'auh-kosherplace',
        priceLevel: 2,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'Emirates Agency for Kosher Certification (הרב לוי דוכמן)',
        },
        name: 'דה כשר פלייס (מסעדת גריל ישראלית)',
        nameLocal: 'The Kosher Place',
        category: 'kosher-food',
        lat: 24.4118,
        lng: 54.485,
        description:
          'מסעדת גריל בסגנון ישראלי בכפר הוונציאני שבמלון הריץ קרלטון גרנד קנאל - נתחי בשר על האש ומטעמים מזרח-תיכוניים. בהשגחת הרב לוי דוכמן, הרב הקבוע הראשון של איחוד האמירויות.',
        rating: 4.4,
        kosherNote:
          'פתוחה ראשון-חמישי (צהריים וערב), שישי צהריים בלבד, סגורה בשבת (קבוצות עם הרשמה מראש). מומלץ להזמין מקום מראש ולוודא כניסה דרך הכניסה האחורית של המלון.',
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=The+Kosher+Place+Ritz+Carlton+Abu+Dhabi',
      },
      {
        id: 'auh-qasralwatan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/UAE_Presidential_Palace_entrance_01.jpg/500px-UAE_Presidential_Palace_entrance_01.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'קצר אל-וואטן - ארמון האומה',
        nameLocal: 'Qasr Al Watan',
        category: 'attraction',
        lat: 24.46225,
        lng: 54.30551,
        description:
          'הארמון הנשיאותי הפתוח לציבור - אדריכלות ערבית-איסלאמית מפוארת, "בית הידע" עם כתבי יד עתיקים, וגן ענק. בערב מוקרן על החזית מופע אור "ארמון בתנועה".',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Qasr+Al+Watan+Abu+Dhabi',
      },
      {
        id: 'auh-founders',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/The_Founders_Memorial.jpg/500px-The_Founders_Memorial.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'אנדרטת המייסד',
        nameLocal: "The Founder's Memorial",
        category: 'attraction',
        lat: 24.4631,
        lng: 54.3224,
        description:
          'מרכז מבקרים ואנדרטה לזכר השיח׳ זאיד בן סולטאן אל נהיאן, מייסד איחוד האמירויות - במרכזו פסל "הקונסטלציה" הענק, המרכיב את דיוקנו מאלפי חלקי מתכת בתאורה לילית.',
        rating: 4.5,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=The+Founders+Memorial+Abu+Dhabi',
      },
      {
        id: 'auh-emiratespalace',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Emirates_palace_from_top_view.jpg/500px-Emirates_palace_from_top_view.jpg',
        tags: ['romantic'],
        priceLevel: 3,
        name: 'ארמון האמירויות (מנדרין אוריינטל)',
        nameLocal: 'Emirates Palace',
        category: 'viewpoint',
        lat: 24.4624,
        lng: 54.3175,
        description:
          'מלון-ארמון עם כיפות זהב, מפורסם בזכות כספומט המנפיק מטילי זהב ותה של אחר הצהריים מוזהב ממש. אפשר גם סתם לצלם גמלים בכניסה ולטייל בלובי המרשים.',
        rating: 4.6,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Emirates+Palace+Abu+Dhabi',
      },
      {
        id: 'auh-louvre',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Louvre_Abu_Dhabi_01.jpg/500px-Louvre_Abu_Dhabi_01.jpg',
        tags: ['art'],
        priceLevel: 2,
        mustSee: true,
        name: 'הלובר אבו דאבי',
        nameLocal: 'Louvre Abu Dhabi',
        category: 'museum',
        lat: 24.533,
        lng: 54.40001,
        description:
          'כיפת ענק מנוקבת שמטילה "גשם של אור" על המוזיאון שמתחתיה - אמנות מכל תרבויות העולם תחת קורת גג אחת, בפרויקט משותף עם הלובר הפריזאי.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Louvre+Abu+Dhabi',
      },
      {
        id: 'auh-abrahamichouse',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Moses_Ben_Maimon_Synagogue_interior_-_june_28_2025.jpg/500px-Moses_Ben_Maimon_Synagogue_interior_-_june_28_2025.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'בית המשפחה האברהמית',
        nameLocal: 'Abrahamic Family House',
        category: 'attraction',
        lat: 24.530933,
        lng: 54.406101,
        description:
          'מתחם ובו מסגד, כנסייה ובית הכנסת "משה בן מימון" - בית הכנסת הראשון שנבנה במיוחד באיחוד האמירויות, עם מקווה ובית מדרש, פונה מערבה לכיוון ירושלים. כניסה ותפילות בתיאום מראש.',
        rating: 4.6,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Abrahamic+Family+House+Abu+Dhabi',
      },
      {
        id: 'auh-saadiyatbeach',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Saadiyat_Island_Beach_Club.jpg/500px-Saadiyat_Island_Beach_Club.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 1,
        name: 'חוף סעדיאת הציבורי',
        nameLocal: 'Saadiyat Public Beach',
        category: 'nature',
        lat: 24.5453,
        lng: 54.436,
        description:
          'חוף חול לבן ומים טורקיז על אי סעדיאת - אחד מאתרי הקינון של צבי ים ירוקים בעולם. משתלב היטב עם ביקור בלובר או בבית המשפחה האברהמית באותו אזור.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Saadiyat+Public+Beach+Abu+Dhabi',
      },
      {
        id: 'auh-jubail',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Jubail_Mangrove_Park_Abu_Dhabi.jpg/500px-Jubail_Mangrove_Park_Abu_Dhabi.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'פארק מנגרובים ג׳ובייל',
        nameLocal: 'Jubail Mangrove Park',
        category: 'nature',
        lat: 24.54536,
        lng: 54.48559,
        description:
          'שביל עץ מעל ביצות המנגרובים הטבעיות של אבו דאבי, עם אפשרות לשוט בקיאק בין השורשים. שקט, ירוק ושונה לגמרי מהעיר - טוב לשילוב עם יום באי סעדיאת.',
        rating: 4.4,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Jubail+Mangrove+Park+Abu+Dhabi',
      },
      {
        id: 'auh-ferrariworld',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Ferrari_world-abu_dhabi-2011.JPG/500px-Ferrari_world-abu_dhabi-2011.JPG',
        tags: ['families'],
        priceLevel: 3,
        mustSee: true,
        name: 'פרארי וורלד',
        nameLocal: 'Ferrari World Abu Dhabi',
        category: 'attraction',
        lat: 24.4838,
        lng: 54.607,
        description:
          'פארק שעשועים מקורה בנושא פרארי על אי יאס - כולל את "פורמולה רוסה", הרכבת ההרים המהירה בעולם (מעל 240 קמ"ש). מתחת לגג האדום הענק שנראה מרחוק.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Ferrari+World+Abu+Dhabi',
      },
      {
        id: 'auh-warnerbros',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Warner_Bros._World_Abu_Dhabi_03.jpg/500px-Warner_Bros._World_Abu_Dhabi_03.jpg',
        tags: ['families'],
        priceLevel: 3,
        name: 'וורנר ברדרס וורלד',
        nameLocal: 'Warner Bros. World Abu Dhabi',
        category: 'attraction',
        lat: 24.49089,
        lng: 54.59936,
        description:
          'פארק שעשועים מקורה עם דמויות DC ולוני טונס - אטרקציות לכל הגילאים, טוב במיוחד לימי חום קיצוני כי הכול ממוזג.',
        rating: 4.5,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Warner+Bros+World+Abu+Dhabi',
      },
      {
        id: 'auh-yaswaterworld',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Yas_Waterworld_Abu_Dhabi_2.jpg/500px-Yas_Waterworld_Abu_Dhabi_2.jpg',
        tags: ['families'],
        priceLevel: 3,
        name: 'יאס ווטרוורלד',
        nameLocal: 'Yas Waterworld',
        category: 'attraction',
        lat: 24.48806,
        lng: 54.59972,
        description:
          'פארק מים גדול על אי יאס עם יותר מ-40 מתקנים ומגלשות - כולל את "לואה לופ", מגלשת המים החופשית התלולה ביותר באזור.',
        rating: 4.5,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Yas+Waterworld+Abu+Dhabi',
      },
      {
        id: 'auh-qasralhosn',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Qasr_al-Hosn_%281%29.jpg/500px-Qasr_al-Hosn_%281%29.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'קצר אל-חוסן',
        nameLocal: 'Qasr Al Hosn',
        category: 'museum',
        lat: 24.482389,
        lng: 54.3548194,
        description:
          'הבניין האבן הישן ביותר באבו דאבי - מצודה ומגדל שמירה מהמאה ה-18 שהיו מושב השלטון של משפחת אל נהיאן, לצד "בית האומנים" עם תערוכות מלאכת יד מקומית.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Qasr+Al+Hosn+Abu+Dhabi',
      },
      {
        id: 'auh-corniche',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Abu_Dhabi_Corniche_Beach.jpg/500px-Abu_Dhabi_Corniche_Beach.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 0,
        name: 'הקורניש',
        nameLocal: 'Abu Dhabi Corniche',
        category: 'nature',
        lat: 24.483308,
        lng: 54.344958,
        description:
          'טיילת חוף לאורך כ-8 ק"מ עם שבילי אופניים והליכה, פארקים ומגדלי קו הרקיע ברקע - הטבעת האמיתית לרוץ, לרכוב או פשוט לשבת מול הים בשקיעה.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Abu+Dhabi+Corniche',
      },
      {
        id: 'auh-iraniansouk',
        tags: ['foodie'],
        priceLevel: 1,
        name: 'השוק האיראני',
        nameLocal: 'Iranian Souk (Mina Zayed)',
        category: 'shopping',
        lat: 24.5173,
        lng: 54.3736,
        description:
          'שוק מסורתי בנמל זאיד עם דוכני צמחים, שטיחים פרסיים וכלי חרס - לצד שוק הדגים החדש והגדול הסמוך, אחד ממוקדי המסחר הוותיקים של העיר.',
        rating: 4.3,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Iranian+Souk+Abu+Dhabi',
      },
      {
        id: 'auh-galleria',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/The_Galleria_Al_Maryah_Island%2C.jpg/500px-The_Galleria_Al_Maryah_Island%2C.jpg',
        priceLevel: 3,
        name: 'הגלריה - אי אל מריה',
        nameLocal: 'The Galleria Al Maryah Island',
        category: 'shopping',
        lat: 24.501934,
        lng: 54.389877,
        description:
          'קניון היוקרה המרכזי של אבו דאבי, עם מותגים בינלאומיים ומסעדות על חזית המים - נסיעה קצרה ממרכז העיר.',
        rating: 4.4,
        durationMin: 105,
        externalUrl: 'https://maps.google.com/?q=The+Galleria+Al+Maryah+Island',
      },
      {
        id: 'auh-sababa',
        priceLevel: 1,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'Emirates Agency for Kosher Certification (הרב לוי דוכמן)',
        },
        name: 'סבבה (דוכן כשר בפודקורט)',
        nameLocal: 'Sababa',
        category: 'kosher-food',
        lat: 24.4345,
        lng: 54.4127,
        description:
          'דוכן כשר חלבי/פרווה בפודקורט של קניון מושריף - פלאפל, חצילים, שקשוקה ולביבות תפוחי אדמה בגרסה כשרה. אופציה קלה ומהירה יותר מארוחה מסודרת.',
        kosherNote: 'תפריט חלבי/פרווה בהשגחת הרב לוי דוכמן. שעות לפי שעות הקניון - לבדוק מראש בסופי שבוע.',
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Sababa+Mushrif+Mall+Abu+Dhabi',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'מסגד השיש, הארמון והמייסד',
        placeIds: [
          'auh-zayedmosque',
          'auh-kosherplace',
          'auh-qasralwatan',
          'auh-founders',
          'auh-emiratespalace',
        ],
        notes:
          'מתחילים מוקדם במסגד השיח׳ זאיד (לפני החום והקהל, לבוש צנוע חובה) - בקרבתו אפשר לעצור לארוחת צהריים בדה כשר פלייס. אחר הצהריים לקצר אל-וואטן ואנדרטת המייסד, ומסיימים בשקיעה בארמון האמירויות.',
      },
      {
        day: 2,
        title: 'אי סעדיאת - אמנות ואמונה',
        placeIds: ['auh-louvre', 'auh-abrahamichouse', 'auh-saadiyatbeach', 'auh-jubail'],
        notes:
          'כל האתרים באזור אחד, סעדיאת וג׳ובייל - הלובר בבוקר (ממוזג, טוב לשעות החמות), בית המשפחה האברהמית אחר כך (לתאם ביקור מראש), ולסיים בחוף או בקיאק בין המנגרובים.',
      },
      {
        day: 3,
        title: 'אי יאס - אדרנלין',
        placeIds: ['auh-ferrariworld', 'auh-warnerbros', 'auh-yaswaterworld'],
        notes:
          'שלושת הפארקים על אי יאס - כל אחד שווה יום שלם, ורוב המבקרים בוחרים אחד או שניים ולא את כולם. פרארי וורלד לחובבי מהירות, וורנר ברדרס למשפחות עם ילדים קטנים, יאס ווטרוורלד לימים החמים ביותר.',
      },
      {
        day: 4,
        title: 'העיר העתיקה, השווקים והקורניש',
        placeIds: ['auh-qasralhosn', 'auh-corniche', 'auh-iraniansouk', 'auh-galleria', 'auh-sababa'],
        notes:
          'קצר אל-חוסן בבוקר, טיול בקורניש, ואז השוק האיראני בנמל זאיד לחוויה מסורתית יותר. סבבה בקניון מושריף טוב לארוחת צהריים כשרה קלה בדרך לקניות בגלריה.',
      },
    ],
    practical: {
      flights:
        'אתיחאד איירווייז מפעילה עד 6 טיסות ישירות ביום בין נתב"ג לשדה התעופה זאיד של אבו דאבי (מאז חידוש הקו באפריל 2026) - הקו העמוס ביותר ברשת אתיחאד; טיסה של כ-3.5 שעות.',
      gettingAround:
        'מוניות ואפליקציות Careem/Uber זמינות וזולות יחסית; רכב שכור נוח למי שרוצה לכסות גם את אי יאס ואי סעדיאת באותו יום. תחבורה ציבורית קיימת אך פחות נוחה לתייר.',
      kosherOverview:
        'תשתית כשרות אמיתית וגדלה, בהשגחת הרב לוי דוכמן, הרב הקבוע הראשון של איחוד האמירויות: דה כשר פלייס (מסעדת גריל) בכפר הוונציאני שבמלון הריץ קרלטון, וסבבה (חלבי/פרווה) בפודקורט של קניון מושריף. הקהילה היהודית באבו דאבי קטנה (כ-600 איש) אך פעילה - בית הכנסת "משה בן מימון" בבית המשפחה האברהמית הוא הראשון שנבנה במיוחד במדינה. מעבר לשני המקומות האלה אין עוד מסעדות עם הכשר מאומת בעיר.',
    },
  },
  {
    slug: 'tbilisi',
    name: 'טביליסי',
    nameLocal: 'Tbilisi / თბილისი',
    countrySlug: 'georgia',
    flag: '🇬🇪',
    center: { lat: 41.6938, lng: 44.8015 },
    zoom: 12,
    tagline: 'עיר עתיקה, מרחצאות גופרית והרי הקווקז מעבר לפינה',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Tbilisi_Peace_Bridge_and_Rike_Park.jpg/500px-Tbilisi_Peace_Bridge_and_Rike_Park.jpg',
    iconicLandmark: {
      name: 'מבצר נריקלה',
      nameLocal: 'Narikala Fortress',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Narikala_fortress%2C_Tbilisi%2C_Georgia.jpg/500px-Narikala_fortress%2C_Tbilisi%2C_Georgia.jpg',
      blurb:
        'מבצר בן יותר מ-1,500 שנה השולט מהגבעה על העיר העתיקה - מגיעים אליו ברכבל, והתצפית מהחומות על גגות טביליסי והנהר היא מהיפות בעיר.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'טיסה ישירה קצרה וזולה, שילוב מנצח של עיר עתיקה, נוף הרים ואוכל ויין - ותשתית כשרות אמיתית. החיסרון: הכביש לקזבגי ארוך ומפותל, וקיץ בעיר יכול להיות חם.',
    },
    summary:
      'טביליסי היא שער הכניסה לגאורגיה ואחד היעדים האהובים על ישראלים: עיר עתיקה של סמטאות מרוצפות ומרפסות עץ, מרחצאות גופרית, וגשר זכוכית מודרני מעל הנהר - והכול במרחק פחות משלוש שעות טיסה. מסביב מחכים נופי הקווקז הדרמטיים (קזבגי) והעיר העתיקה מצחתה, ובלב העיר קהילה יהודית ותיקה עם בית חב"ד ומסעדות כשרות.',
    bestSeason: 'מאי-יוני וספטמבר-אוקטובר (מזג אוויר נעים) - יולי-אוגוסט חמים בעיר, החורף קר ומושלג בהרים',
    places: [
      {
        id: 'tbs-narikala',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Narikala_fortress%2C_Tbilisi%2C_Georgia.jpg/500px-Narikala_fortress%2C_Tbilisi%2C_Georgia.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'מבצר נריקלה',
        nameLocal: 'Narikala Fortress',
        category: 'attraction',
        lat: 41.68778,
        lng: 44.80861,
        description:
          'המבצר ההיסטורי השולט על העיר העתיקה. עולים ברכבל מפארק ריקה, מטיילים על החומות, ונהנים מהתצפית הטובה בעיר - במיוחד לקראת השקיעה. הכניסה חינם.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Narikala+Fortress+Tbilisi',
      },
      {
        id: 'tbs-abanotubani',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/2014_Tbilisi%2C_%C5%81a%C5%BAnie_siarkowe_w_Abanotubani_%2801%29.jpg/500px-2014_Tbilisi%2C_%C5%81a%C5%BAnie_siarkowe_w_Abanotubani_%2801%29.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'מרחצאות הגופרית (אבנוטובאני)',
        nameLocal: 'Abanotubani Sulfur Baths',
        category: 'attraction',
        lat: 41.68778,
        lng: 44.81111,
        description:
          'רובע המרחצאות ההיסטורי עם כיפות הלבנים האופייניות, מעל מעיינות גופרית חמים. אפשר לשכור חדר מרחץ פרטי - החוויה שהפכה את טביליסי למה שהיא ("העיר החמה").',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Abanotubani+Tbilisi',
      },
      {
        id: 'tbs-sameba',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sameba_Cathedral%2C_Courtyard%2C_Sunset%2C_Dusk%2C_Tbilisi%2C_Georgia.jpg/500px-Sameba_Cathedral%2C_Courtyard%2C_Sunset%2C_Dusk%2C_Tbilisi%2C_Georgia.jpg',
        tags: ['history'],
        priceLevel: 0,
        mustSee: true,
        name: 'קתדרלת השילוש הקדוש (סמבה)',
        nameLocal: 'Holy Trinity Cathedral (Sameba)',
        category: 'attraction',
        lat: 41.6975,
        lng: 44.81667,
        description:
          'הקתדרלה הגדולה בגאורגיה ואחת הגדולות בעולם הנוצרי-אורתודוקסי, מוזהבת ומרשימה, שנבנתה בשנות ה-2000 ושולטת על קו הרקיע של טביליסי. לבוש צנוע נדרש בכניסה.',
        rating: 4.7,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Holy+Trinity+Cathedral+Tbilisi',
      },
      {
        id: 'tbs-peace-bridge',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Tbilisi_Peace_Bridge_and_Rike_Park.jpg/500px-Tbilisi_Peace_Bridge_and_Rike_Park.jpg',
        tags: ['romantic', 'families'],
        priceLevel: 0,
        name: 'גשר השלום',
        nameLocal: 'Bridge of Peace',
        category: 'attraction',
        lat: 41.693,
        lng: 44.8083,
        description:
          'גשר הולכי רגל מודרני מזכוכית ופלדה מעל נהר המטקווארי, המחבר את העיר העתיקה עם פארק ריקה. מואר יפה בלילה ומהווה ניגוד מרהיב לסמטאות הישנות.',
        rating: 4.4,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Bridge+of+Peace+Tbilisi',
      },
      {
        id: 'tbs-metekhi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Metekhi_church_of_Tbilisi.jpg/500px-Metekhi_church_of_Tbilisi.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'כנסיית מטחי',
        nameLocal: 'Metekhi Church',
        category: 'attraction',
        lat: 41.69,
        lng: 44.81111,
        description:
          'כנסייה מהמאה ה-13 על צוק מעל הנהר, לצד פסל הרוכב של המלך ואחטנג גורגסלי, מייסד טביליסי. תצפית יפה אל מול נריקלה והעיר העתיקה.',
        rating: 4.4,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Metekhi+Church+Tbilisi',
      },
      {
        id: 'tbs-rustaveli',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Shota_Rustaveli_Avenue%2C_Tbilisi.jpg/500px-Shota_Rustaveli_Avenue%2C_Tbilisi.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        name: 'שדרת רוסטוולי',
        nameLocal: 'Rustaveli Avenue',
        category: 'attraction',
        lat: 41.7007,
        lng: 44.7953,
        description:
          'השדרה הראשית של טביליסי - מבנים מרשימים מהמאה ה-19, האופרה, המוזיאון הלאומי, תיאטראות, בתי קפה וחנויות. הלב התרבותי של העיר החדשה.',
        rating: 4.4,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Rustaveli+Avenue+Tbilisi',
      },
      {
        id: 'tbs-freedom-square',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Freedom_Square%2C_Tbilisi_%2850497944841%29.jpg/500px-Freedom_Square%2C_Tbilisi_%2850497944841%29.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'כיכר החירות',
        nameLocal: 'Freedom Square',
        category: 'attraction',
        lat: 41.6938,
        lng: 44.8014,
        description:
          'הכיכר המרכזית של טביליסי, ובמרכזה עמוד הזהב של פסל גאורגי הקדוש. נקודת מפגש ותחילת דרך נוחה לסיור רגלי אל העיר העתיקה ולשדרת רוסטוולי.',
        rating: 4.3,
        durationMin: 20,
        externalUrl: 'https://maps.google.com/?q=Freedom+Square+Tbilisi',
      },
      {
        id: 'tbs-mtatsminda',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Tbilisi_Ferris_Wheel_2022-07-30.jpg/500px-Tbilisi_Ferris_Wheel_2022-07-30.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 1,
        name: 'פארק מטאצמינדה',
        nameLocal: 'Mtatsminda Park',
        category: 'viewpoint',
        lat: 41.6933,
        lng: 44.7802,
        description:
          'פארק שעשועים על ההר הגבוה מעל העיר, עם גלגל ענק ותצפית פנורמית. עולים אליו ברכבל (פוניקולר) הוותיק - מושלם לשקיעה ולערב עם ילדים.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Mtatsminda+Park+Tbilisi',
      },
      {
        id: 'tbs-turtle-lake',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Turtle_Lake_in_Tbilisi%2C_Georgia.jpg/500px-Turtle_Lake_in_Tbilisi%2C_Georgia.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        name: 'אגם הצבים',
        nameLocal: 'Turtle Lake',
        category: 'nature',
        lat: 41.7004,
        lng: 44.7545,
        description:
          'אגם קטן ורגוע מוקף יער על גבעות ואקה, אהוב על המקומיים לטיול, ריצה וקפה על המים. אפשר להגיע ברכבל ולשלב עם המוזיאון האתנוגרפי הפתוח הסמוך.',
        rating: 4.3,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Turtle+Lake+Tbilisi',
      },
      {
        id: 'tbs-botanical',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/National_Botanical_Garden_of_Georgia_%28HDR_Photo%2C_Lg_G31%29_%D8%A8%D8%A7%D8%BA_%D8%A8%D9%88%D8%AA%D8%A7%D9%86%DB%8C%DA%A9%D8%A7%D9%84%D8%8C_%D8%B4%D9%87%D8%B1_%D8%AA%D9%81%D9%84%DB%8C%D8%B3.jpg/500px-National_Botanical_Garden_of_Georgia_%28HDR_Photo%2C_Lg_G31%29_%D8%A8%D8%A7%D8%BA_%D8%A8%D9%88%D8%AA%D8%A7%D9%86%DB%8C%DA%A9%D8%A7%D9%84%D8%8C_%D8%B4%D9%87%D8%B1_%D8%AA%D9%81%D9%84%DB%8C%D8%B3.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'הגן הבוטני הלאומי',
        nameLocal: 'National Botanical Garden',
        category: 'nature',
        lat: 41.6851,
        lng: 44.8027,
        description:
          'גן ענק בגיא שמאחורי מבצר נריקלה, עם שבילים, מפל וגשר תלוי. בריחה ירוקה ושקטה במרחק דקות הליכה מהעיר העתיקה.',
        rating: 4.4,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=National+Botanical+Garden+Tbilisi',
      },
      {
        id: 'tbs-chronicle',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Chronicle_of_Georgia_-_Fragment.jpg/500px-Chronicle_of_Georgia_-_Fragment.jpg',
        tags: ['history', 'art'],
        priceLevel: 0,
        name: 'הכרוניקה של גאורגיה',
        nameLocal: 'The Chronicle of Georgia',
        category: 'viewpoint',
        lat: 41.7707,
        lng: 44.8104,
        description:
          'אנדרטה מונומנטלית של עמודי ענק (כ-30 מטר) עם תבליטים של מלכי ואירועי גאורגיה, מעל "ים טביליסי". מרשימה, פחות מתויירת, עם תצפית רחבה על העיר.',
        rating: 4.5,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chronicle+of+Georgia+Tbilisi',
      },
      {
        id: 'tbs-jvari',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Georgia_Jvari_monastery_IMG_9345_2070.jpg/500px-Georgia_Jvari_monastery_IMG_9345_2070.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'מנזר ג׳ווארי (מצחתה)',
        nameLocal: 'Jvari Monastery',
        category: 'attraction',
        lat: 41.8383,
        lng: 44.7335,
        description:
          'מנזר מהמאה ה-6, אתר מורשת עולמית של אונסק"ו, על ראש גבעה השולט על מפגש שני הנהרות ועל העיר העתיקה מצחתה. אחת התצפיות היפות בגאורגיה. כ-30 דקות מטביליסי.',
        rating: 4.7,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Jvari+Monastery+Mtskheta',
      },
      {
        id: 'tbs-svetitskhoveli',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/2017_-_Svetitskhoveli_Cathedral_-_01.jpg/500px-2017_-_Svetitskhoveli_Cathedral_-_01.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'קתדרלת סווטיצחוולי (מצחתה)',
        nameLocal: 'Svetitskhoveli Cathedral',
        category: 'attraction',
        lat: 41.8419,
        lng: 44.7211,
        description:
          'הקתדרלה מהמאה ה-11 בלב העיר העתיקה מצחתה, בירתה הרוחנית של גאורגיה - אתר מורשת עולמית ומקום עלייה לרגל. משתלבת מצוין עם מנזר ג׳ווארי שממול.',
        rating: 4.6,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Svetitskhoveli+Cathedral+Mtskheta',
      },
      {
        id: 'tbs-gergeti',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Gergeti_Trinity_Church._Kazbegi%2C_Georgia_%2836130111370%29.jpg/500px-Gergeti_Trinity_Church._Kazbegi%2C_Georgia_%2836130111370%29.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 0,
        mustSee: true,
        name: 'כנסיית גרגטי וקזבגי',
        nameLocal: 'Gergeti Trinity Church (Kazbegi)',
        category: 'nature',
        lat: 42.6625,
        lng: 44.6203,
        description:
          'כנסייה בודדת מהמאה ה-14 על גבעה בגובה 2,170 מטר, על רקע הר קזבק המושלג (5,047 מ׳) - אחד הנופים המזוהים ביותר עם גאורגיה. טיול יום מלא מטביליסי (כ-3 שעות דרך מעבר ההרים).',
        rating: 4.8,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Gergeti+Trinity+Church',
      },
      {
        id: 'tbs-synagogue',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Great_Synagogue_%28Tbilisi%29.jpg/500px-Great_Synagogue_%28Tbilisi%29.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'בית הכנסת הגדול',
        nameLocal: 'Great Synagogue of Tbilisi',
        category: 'attraction',
        lat: 41.69,
        lng: 44.8073,
        description:
          'בית הכנסת הגדול (הספרדי) בעיר העתיקה, נבנה בתחילת המאה ה-20 בידי יהודים מהעיר אחלציחה. עדות לקהילה יהודית עתיקת יומין בגאורגיה, במרחק הליכה ממסעדות הכשרות של הרובע.',
        rating: 4.5,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Great+Synagogue+Tbilisi',
      },
      {
        id: 'tbs-mendis',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד טביליסי (מהדרין)',
        },
        name: 'מנדי׳ס - מסעדת חב"ד הכשרה',
        nameLocal: "Mendi's (Chabad Kosher Restaurant)",
        category: 'kosher-food',
        lat: 41.6931,
        lng: 44.8049,
        description:
          'מסעדת בשרים כשרה למהדרין של בית חב"ד טביליסי בעיר העתיקה, עם מטבח יהודי-גאורגי מסורתי. לצידה מטבח חלבי לארוחות בוקר בבית חב"ד. כתובת מפגש מרכזית לישראלים בעיר.',
        rating: 4.5,
        kosherNote:
          'בשרי, בהשגחת בית חב"ד טביליסי (מהדרין). פתוחה בדרך כלל מהצהריים ועד חצות - מומלץ לוודא שעות וארוחות שבת מול בית חב"ד מראש.',
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chabad+Tbilisi',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'העיר העתיקה והמרחצאות',
        placeIds: [
          'tbs-narikala',
          'tbs-abanotubani',
          'tbs-metekhi',
          'tbs-peace-bridge',
          'tbs-synagogue',
        ],
        notes:
          'יום רגלי בלב טביליסי: עולים ברכבל לנריקלה לתצפית, יורדים לרובע המרחצאות (שווה חדר מרחץ גופרית פרטי), ועוברים דרך מטחי וגשר השלום. בית הכנסת הגדול ומסעדות הכשרות במרחק הליכה.',
      },
      {
        day: 2,
        title: 'העיר החדשה וההר',
        placeIds: [
          'tbs-freedom-square',
          'tbs-rustaveli',
          'tbs-sameba',
          'tbs-mendis',
          'tbs-mtatsminda',
        ],
        notes:
          'מכיכר החירות לאורך שדרת רוסטוולי, קפיצה לקתדרלת סמבה, ארוחת צהריים כשרה במנדי׳ס, ולסיום עלייה בפוניקולר לפארק מטאצמינדה לשקיעה מעל העיר.',
      },
      {
        day: 3,
        title: 'מצחתה - הבירה הרוחנית',
        placeIds: ['tbs-jvari', 'tbs-svetitskhoveli', 'tbs-chronicle', 'tbs-turtle-lake', 'tbs-botanical'],
        notes:
          'טיול יום קצר (30 דקות) לעיר העתיקה מצחתה: מנזר ג׳ווארי לתצפית ומפגש הנהרות, וקתדרלת סווטיצחוולי. בדרך חזרה אפשר לעצור בכרוניקה של גאורגיה, ולסיים ברוגע באגם הצבים או בגן הבוטני.',
      },
      {
        day: 4,
        title: 'קזבגי - הרי הקווקז',
        placeIds: ['tbs-gergeti'],
        notes:
          'טיול יום מלא צפונה דרך מעבר ההרים (Georgian Military Road) אל קזבגי: כנסיית גרגטי על רקע הר קזבק המושלג - הנוף שכולם מגיעים בשבילו. הדרך ארוכה ומפותלת (כ-3 שעות לכל כיוון); מומלץ טיול מאורגן או נהג פרטי.',
      },
    ],
    practical: {
      flights:
        'מגוון רחב של טיסות ישירות מנתב"ג לטביליסי (אל על, ג׳ורג׳יאן איירווייז, ישראייר, ארקיע) - כ-24 טיסות בשבוע, טיסה קצרה של כ-2.5 שעות. מהיעדים הנוחים ביותר לישראלים מבחינת זמינות ומחיר.',
      gettingAround:
        'בעיר: מטרו זול, מרשרוטקות (מיניבוסים) ובעיקר אפליקציית Bolt למוניות - זולה ונוחה מאוד. לטיולי יום (מצחתה, קזבגי) - טיול מאורגן, נהג פרטי או רכב שכור.',
      kosherOverview:
        'טביליסי היא מהיעדים הכשרים הנוחים באזור: מסעדת מנדי׳ס של בית חב"ד (בשרי מהדרין) ומטבח חלבי לארוחות בוקר, ולצידן כמה מסעדות כשרות נוספות ברובע היהודי בעיר העתיקה (בהן קינג דיוויד, שלום עליכם, לה קאסה וחומוס ירושלים). ארבעה בתי כנסת פעילים, כולל בית הכנסת הגדול. מומלץ לאמת שעות והשגחה מול בית חב"ד לפני ההגעה.',
    },
  },
  {
    slug: 'phuket',
    name: 'פוקט',
    nameLocal: 'Phuket / ภูเก็ต',
    countrySlug: 'thailand',
    flag: '🇹🇭',
    center: { lat: 7.88, lng: 98.34 },
    zoom: 11,
    tagline: 'חופי חלום, איים מוקפי צוקים ובית חב"ד גדול - האי הגדול של תאילנד',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sunset_at_Karon_Beach%2C_Phuket%2C_Thailand.JPG/500px-Sunset_at_Karon_Beach%2C_Phuket%2C_Thailand.JPG',
    iconicLandmark: {
      name: 'הבודהה הגדול',
      nameLocal: 'The Big Buddha',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/The_Big_Buddha%2C_Phuket.jpg/500px-The_Big_Buddha%2C_Phuket.jpg',
      blurb:
        'פסל בודהה משיש לבן בגובה 45 מטר על ראש גבעה במרכז האי - נראה מרחוק, ומציע תצפית מעגלית על חופי הדרום ועל הים.',
    },
    editorialRating: {
      score: 4.5,
      verdict:
        'טיסה ישירה, חופים וטיולי איים ברמה עולמית, ובית חב"ד גדול עם מסעדה כשרה - יעד ים מצוין למשפחות ולזוגות. החיסרון: פאטונג רועשת ומסחרית, ועונת המונסון (מאי-אוקטובר) מגבילה שיט לאיים.',
    },
    summary:
      'פוקט היא האי הגדול של תאילנד ואחד מיעדי הים האהובים על ישראלים: חופי חול לבן, שקיעות מכף פרומתפ, וטיולי סירה אל איים מוקפי צוקי גיר כמו פי פי ומפרץ פאנג נגה. יש בה גם בית חב"ד גדול עם מסעדה כשרה בפאטונג, מה שהופך אותה לנוחה במיוחד למטיילים שומרי כשרות.',
    bestSeason: 'נובמבר-אפריל (עונה יבשה, ים רגוע - הזמן לטיולי איים) - מאי-אוקטובר מונסון וגשם',
    places: [
      {
        id: 'hkt-bigbuddha',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/The_Big_Buddha%2C_Phuket.jpg/500px-The_Big_Buddha%2C_Phuket.jpg',
        tags: ['history'],
        priceLevel: 0,
        mustSee: true,
        name: 'הבודהה הגדול',
        nameLocal: 'The Big Buddha',
        category: 'attraction',
        lat: 7.8275,
        lng: 98.3124,
        description:
          'פסל בודהה משיש לבן בגובה 45 מטר על גבעת נאקרד, נראה מרוב חלקי האי. הכניסה חינם (תרומה); תצפית פנורמית על חופי קארון וקטה. לבוש צנוע נדרש.',
        rating: 4.6,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Big+Buddha+Phuket',
      },
      {
        id: 'hkt-promthep',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Beautiful_Sunset_on_Promthep_Cape%2C_Phuket_island%2C_Thailand.jpg/500px-Beautiful_Sunset_on_Promthep_Cape%2C_Phuket_island%2C_Thailand.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'כף פרומתפ',
        nameLocal: 'Promthep Cape',
        category: 'viewpoint',
        lat: 7.7601,
        lng: 98.309,
        description:
          'הקצה הדרומי של פוקט - נקודת השקיעה המפורסמת של האי. מגיעים לפני השקיעה, מוצאים מקום על הצוק, וצופים בשמש שוקעת אל הים מול איים קטנים.',
        rating: 4.6,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Promthep+Cape+Phuket',
      },
      {
        id: 'hkt-phiphi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Maya_Bay%2C_Koh_Phi_Phi%2C_Krabi%2C_Thailand.jpg/500px-Maya_Bay%2C_Koh_Phi_Phi%2C_Krabi%2C_Thailand.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'איי פי פי ומאיה ביי',
        nameLocal: 'Phi Phi Islands & Maya Bay',
        category: 'nature',
        lat: 7.7333,
        lng: 98.7667,
        description:
          'איי גיר דרמטיים עם מים טורקיז, שנודעו בזכות מפרץ מאיה ("החוף" עם דיקפריו). מגיעים בטיול סירה יומי מפוקט; שנורקלינג בין דגים צבעוניים. עונתיות תלוית מונסון.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Maya+Bay+Phi+Phi',
      },
      {
        id: 'hkt-jamesbond',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Khao_Phing_Kan_and_Koh_Tapu_%28James_Bond_Island%29.jpg/500px-Khao_Phing_Kan_and_Koh_Tapu_%28James_Bond_Island%29.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'אי ג׳יימס בונד (מפרץ פאנג נגה)',
        nameLocal: 'James Bond Island (Phang Nga Bay)',
        category: 'nature',
        lat: 8.2747,
        lng: 98.5004,
        description:
          'מגדל הסלע המפורסם מסרט 007, במפרץ פאנג נגה המנומר בצוקי גיר עצומים העולים מהמים. טיולי סירה וקאנו בין המערות והמנגרובים - יום מלא מפוקט.',
        rating: 4.5,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=James+Bond+Island+Phang+Nga',
      },
      {
        id: 'hkt-karon-viewpoint',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Three_beaches.jpg/500px-Three_beaches.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        name: 'נקודת התצפית קארון (שלושת החופים)',
        nameLocal: 'Karon Viewpoint',
        category: 'viewpoint',
        lat: 7.7973,
        lng: 98.3022,
        description:
          'תצפית קלאסית על שלושת החופים (קטה נוי, קטה וקארון) המשתרעים זה אחר זה לאורך החוף. עצירה קצרה ומתגמלת בדרך דרומה אל כף פרומתפ.',
        rating: 4.4,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Karon+Viewpoint+Phuket',
      },
      {
        id: 'hkt-patong',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Patong_Beach_in_Phuket.jpg/500px-Patong_Beach_in_Phuket.jpg',
        tags: ['families', 'nightlife'],
        priceLevel: 1,
        name: 'חוף פאטונג',
        nameLocal: 'Patong Beach',
        category: 'nature',
        lat: 7.8931,
        lng: 98.2966,
        description:
          'החוף המרכזי והשוקק של פוקט - ספורט ימי, שמשיות וכיסאות נוח, וסמוך אליו מרכז החיים והבילוי של האי. תוסס ומסחרי, לא הכי שקט.',
        rating: 4.2,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Patong+Beach+Phuket',
      },
      {
        id: 'hkt-karon',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sunset_at_Karon_Beach%2C_Phuket%2C_Thailand.JPG/500px-Sunset_at_Karon_Beach%2C_Phuket%2C_Thailand.JPG',
        tags: ['families', 'romantic'],
        priceLevel: 0,
        name: 'חוף קארון',
        nameLocal: 'Karon Beach',
        category: 'nature',
        lat: 7.844,
        lng: 98.2934,
        description:
          'חוף חול לבן ארוך ורחב, רגוע יותר מפאטונג ואהוב על משפחות. "חול שר" שחורק תחת הרגליים, ושקיעות יפות אל הים.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Karon+Beach+Phuket',
      },
      {
        id: 'hkt-kata',
        tags: ['families', 'outdoors'],
        priceLevel: 0,
        name: 'חוף קטה',
        nameLocal: 'Kata Beach',
        category: 'nature',
        lat: 7.8163,
        lng: 98.3001,
        description:
          'חוף מוגן ונעים עם מים צלולים, פופולרי לשחייה ולגלישה למתחילים (בעונה). אווירה רגועה יותר, עם מסעדות וברים קטנים לאורך הטיילת.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Kata+Beach+Phuket',
      },
      {
        id: 'hkt-chalong',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Phuket_Thailand_Wat-Chalong-01.jpg/500px-Phuket_Thailand_Wat-Chalong-01.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'וואט צ׳אלונג',
        nameLocal: 'Wat Chalong',
        category: 'attraction',
        lat: 7.8467,
        lng: 98.3367,
        description:
          'המקדש הבודהיסטי החשוב והמפואר ביותר בפוקט, עם פגודה מוזהבת בת מספר קומות ותצוגת שריד קדוש. לבוש צנוע נדרש.',
        rating: 4.5,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Wat+Chalong+Phuket',
      },
      {
        id: 'hkt-oldtown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Thalang_Road%2C_Old_Phuket_Town.jpg/500px-Thalang_Road%2C_Old_Phuket_Town.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'העיר העתיקה של פוקט',
        nameLocal: 'Old Phuket Town',
        category: 'attraction',
        lat: 7.8846,
        lng: 98.3921,
        description:
          'רחובות סינו-פורטוגזיים צבעוניים (רחוב ת׳לאנג) עם בתי קפה, גלריות ואוכל רחוב. בימי ראשון בערב נפתח שוק ההליכה (Lard Yai) - הצד התרבותי של האי, הרחק מהחופים.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Old+Phuket+Town',
      },
      {
        id: 'hkt-bangla',
        tags: ['nightlife'],
        priceLevel: 1,
        name: 'כביש בנגלה (פאטונג)',
        nameLocal: 'Bangla Road',
        category: 'attraction',
        lat: 7.8936,
        lng: 98.2966,
        description:
          'רחוב הבילוי המרכזי של פוקט בפאטונג - ברים, מוזיקה ואורות ניאון, נסגר לתנועה בלילה. תוסס וקולני; לא לכל אחד, אבל חלק בלתי נפרד מהאי.',
        rating: 4.0,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Bangla+Road+Patong',
      },
      {
        id: 'hkt-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד פוקט',
        },
        name: 'בית חב"ד פוקט (מסעדה כשרה)',
        nameLocal: 'Chabad House Phuket',
        category: 'kosher-food',
        lat: 7.9019,
        lng: 98.3005,
        description:
          'בית חב"ד גדול בפאטונג (מול הדואר) עם מסעדה כשרה - מהמבורגרים ועד אוכל תאילנדי ומזרח-תיכוני, בשר מיובא. תפילות יומיות, ארוחות שבת וחגים לאלפי ישראלים בשנה.',
        rating: 4.5,
        kosherNote:
          'מסעדה בשרית כשרה בהשגחת בית חב"ד פוקט. ארוחות שבת בהרשמה מראש - מומלץ ליצור קשר עם בית חב"ד לפני ההגעה ולוודא שעות.',
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Chabad+House+Phuket+Patong',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'הדרום - בודהה, מקדש ושקיעה',
        placeIds: ['hkt-bigbuddha', 'hkt-chalong', 'hkt-karon-viewpoint', 'hkt-kata', 'hkt-promthep'],
        notes:
          'יום דרום: הבודהה הגדול ווואט צ׳אלונג בבוקר, אחר צהריים על חוף קטה, ולסיום שקיעה מכף פרומתפ (להגיע מוקדם לתפוס מקום). נקודת התצפית קארון בדרך.',
      },
      {
        day: 2,
        title: 'פאטונג - חוף, כשר ובילוי',
        placeIds: ['hkt-karon', 'hkt-patong', 'hkt-chabad', 'hkt-bangla'],
        notes:
          'בוקר רגוע על חוף קארון, צהריים בפאטונג, וארוחה כשרה בבית חב"ד. בערב - כביש בנגלה למי שרוצה את צד הבילוי הרועש של האי.',
      },
      {
        day: 3,
        title: 'איי פי פי - יום ים',
        placeIds: ['hkt-phiphi'],
        notes:
          'טיול סירה יומי לאיי פי פי ומאיה ביי - שנורקלינג, חופים מוקפי צוקים ומים טורקיז. לצאת מוקדם; תלוי מזג ים ועונה (לא בשיא המונסון).',
      },
      {
        day: 4,
        title: 'מפרץ פאנג נגה והעיר העתיקה',
        placeIds: ['hkt-jamesbond', 'hkt-oldtown'],
        notes:
          'יום שני של איים - מפרץ פאנג נגה ואי ג׳יימס בונד בקאנו ובסירה בין צוקי הגיר. בערב, סיבוב בעיר העתיקה של פוקט (בראשון - שוק ההליכה).',
      },
    ],
    practical: {
      flights:
        'אל על מפעילה טיסה ישירה מנתב"ג לפוקט כ-4 פעמים בשבוע (טיסה ארוכת טווח של כ-11 שעות) - קו ישיר יציב, נוח למי שרוצה לדלג על עצירת ביניים בבנגקוק.',
      gettingAround:
        'האי גדול והתחבורה הציבורית דלה: מוניות ואפליקציית Grab (זמינות משתנה), טוקטוק מקומי (יקר - לסכם מחיר מראש), או השכרת רכב/קטנוע. לאיים - טיולי סירה מאורגנים מהמרינות.',
      kosherOverview:
        'בית חב"ד פוקט בפאטונג הוא כתובת הכשרות המרכזית באי: מסעדה בשרית כשרה (בשר מיובא), תפילות יומיות וארוחות שבת לאלפי ישראלים בשנה. זו למעשה נקודת הכשרות המאומתת היחידה באי - לא להסתמך על מסעדות תאילנדיות רגילות. מומלץ לתאם ארוחות שבת מראש.',
    },
  },
  {
    slug: 'baku',
    name: 'באקו',
    nameLocal: 'Baku / Bakı',
    countrySlug: 'azerbaijan',
    flag: '🇦🇿',
    center: { lat: 40.375, lng: 49.84 },
    zoom: 11,
    tagline: 'מגדלי להבה, עיר עתיקה על הים הכספי ופלאי אש טבעיים',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Baku_Boulevard_pier.jpg/500px-Baku_Boulevard_pier.jpg',
    iconicLandmark: {
      name: 'מגדלי הלהבה',
      nameLocal: 'Flame Towers',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Flame_Towers.jpg/500px-Flame_Towers.jpg',
      blurb:
        'שלושה גורדי שחקים בצורת להבות אש, השולטים על קו הרקיע של באקו - בלילה הם הופכים למסך תאורה ענק, סמל "ארץ האש" המודרנית.',
    },
    editorialRating: {
      score: 4.4,
      verdict:
        'טיסה ישירה קצרה, שילוב מרתק של עיר עתיקה, אדריכלות עתידנית ופלאי טבע געשיים - ומורשת יהודית ייחודית. חסרונות: אתרי הטבע (גובוסטן, יאנאר דאג) מפוזרים ודורשים נהג, ואין תשתית כשרות רחבה מעבר לבית חב"ד.',
    },
    summary:
      'באקו, בירת אזרבייג׳ן על חוף הים הכספי, מפגישה עיר עתיקה מוקפת חומה עם גורדי שחקים נוצצים וטיילת ים ארוכה. מסביבה מחכים פלאי "ארץ האש" - הר בוער שאינו כבה, מקדש אש עתיק ושדה ציורי סלע והרי בוץ בגובוסטן. צפונה יותר שוכן הכפר האדום, אחד היישובים היהודיים השלמים האחרונים בעולם.',
    bestSeason: 'אפריל-יוני וספטמבר-אוקטובר (נעים) - קיץ חם ולח מהכספי, חורף קר ורוחני ("באקו" = עיר הרוחות)',
    places: [
      {
        id: 'gyd-flame',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Flame_Towers.jpg/500px-Flame_Towers.jpg',
        tags: ['romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'מגדלי הלהבה',
        nameLocal: 'Flame Towers',
        category: 'viewpoint',
        lat: 40.3594,
        lng: 49.8267,
        description:
          'שלושת גורדי השחקים המזוהים עם באקו, בצורת להבות. יפים במיוחד בלילה כשמסכי ה-LED מציגים אש נעה ודגלים. התצפית הטובה עליהם היא מפארק הרמה (שדרת השהידים) הסמוך.',
        rating: 4.6,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Flame+Towers+Baku',
      },
      {
        id: 'gyd-maiden',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Baku_Maiden_Tower.jpg/500px-Baku_Maiden_Tower.jpg',
        tags: ['history'],
        priceLevel: 1,
        mustSee: true,
        name: 'מגדל הבתולה והעיר העתיקה',
        nameLocal: 'Maiden Tower & Old City',
        category: 'attraction',
        lat: 40.3661,
        lng: 49.8372,
        description:
          'מגדל אבן מסתורי מימי הביניים בלב איצ׳רישהר, העיר העתיקה המוקפת חומה (אתר מורשת עולמית). סמטאות אבן, שווקים קטנים ותצפית מגג המגדל על העיר והים.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Maiden+Tower+Baku',
      },
      {
        id: 'gyd-shirvanshahs',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Shirvanshahs_palace%28old-city%29_baku_azerbaijan.jpg/500px-Shirvanshahs_palace%28old-city%29_baku_azerbaijan.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'ארמון השירוואנשאהים',
        nameLocal: 'Palace of the Shirvanshahs',
        category: 'attraction',
        lat: 40.3661,
        lng: 49.8334,
        description:
          'מכלול ארמון מלכותי מהמאה ה-15 בלב העיר העתיקה - חצרות, מסגד, מאוזוליאום ובית מרחץ. הפאר האדריכלי של שושלת השירוואנשאהים.',
        rating: 4.5,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Palace+of+the+Shirvanshahs+Baku',
      },
      {
        id: 'gyd-heydar',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Heydar_Aliyev_International_Conference_Center_Baku_Azerbaijan.jpg/500px-Heydar_Aliyev_International_Conference_Center_Baku_Azerbaijan.jpg',
        tags: ['art'],
        priceLevel: 2,
        mustSee: true,
        name: 'מרכז היידר אלייב',
        nameLocal: 'Heydar Aliyev Center',
        category: 'museum',
        lat: 40.3953,
        lng: 49.8669,
        description:
          'מבנה תרבות זורם וחסר קווים ישרים בתכנון האדריכלית זהא חדיד - מהאייקונים של האדריכלות המודרנית בעולם. תערוכות בפנים, וכר דשא עם פסלים בחוץ.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Heydar+Aliyev+Center+Baku',
      },
      {
        id: 'gyd-boulevard',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Baku_Boulevard_pier.jpg/500px-Baku_Boulevard_pier.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 0,
        name: 'טיילת באקו',
        nameLocal: 'Baku Boulevard',
        category: 'nature',
        lat: 40.36,
        lng: 49.845,
        description:
          'טיילת ים ארוכה לאורך הכספי - שדרות, מזרקות, גלגל ענק וספינות שיט. הלב הפנוי של העיר, נעים במיוחד לטיול ערב מול המים.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Baku+Boulevard',
      },
      {
        id: 'gyd-fountain',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Fountains_Square%2C_Baku_01.jpg/500px-Fountains_Square%2C_Baku_01.jpg',
        tags: ['foodie'],
        priceLevel: 1,
        name: 'כיכר המזרקות',
        nameLocal: 'Fountain Square',
        category: 'shopping',
        lat: 40.3707,
        lng: 49.8375,
        description:
          'הכיכר המרכזית והחיה של באקו החדשה, מוקפת מבנים מהמאה ה-19, בתי קפה, מסעדות וחנויות. נקודת מפגש ובילוי, במרחק הליכה מהעיר העתיקה.',
        rating: 4.3,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Fountain+Square+Baku',
      },
      {
        id: 'gyd-yanardag',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Yanar_Dag_in_September_2019_%283%29.jpg/500px-Yanar_Dag_in_September_2019_%283%29.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'יאנאר דאג - ההר הבוער',
        nameLocal: 'Yanar Dag',
        category: 'nature',
        lat: 40.5018,
        lng: 49.8913,
        description:
          'מדרון גבעה שבו אש טבעית בוערת ברציפות מזה מאות שנים, ניזונה מגז טבעי שמחלחל מהאדמה. הסמל של "ארץ האש" - מרשים במיוחד אחרי רדת החשכה. כ-30 דקות מהעיר.',
        rating: 4.3,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Yanar+Dag',
      },
      {
        id: 'gyd-gobustan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Rock_art_in_Gobustan.jpg/500px-Rock_art_in_Gobustan.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'גובוסטן - ציורי סלע והרי בוץ',
        nameLocal: 'Gobustan Rock Art & Mud Volcanoes',
        category: 'nature',
        lat: 40.1118,
        lng: 49.3783,
        description:
          'שמורת אתר מורשת עולמית עם אלפי ציורי סלע בני עד 40,000 שנה, ולצידה שדה של הרי בוץ געשיים שמבעבעים בוץ קר - נוף כמעט אחר-עולמי. כשעה מדרום לבאקו.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Gobustan+National+Park',
      },
      {
        id: 'gyd-ateshgah',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Ateshgah_Zoroastrian_Fire_Temple_%28Baku%29.jpg/500px-Ateshgah_Zoroastrian_Fire_Temple_%28Baku%29.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'מקדש האש אטשגה',
        nameLocal: 'Ateshgah Fire Temple',
        category: 'attraction',
        lat: 40.4154,
        lng: 50.0086,
        description:
          'מקדש אש זורואסטרי/הינדי מרובע עם להבה מרכזית, ששימש עולי רגל ומבקרים במשך מאות שנים. עדות נוספת לקשר העמוק של אזרבייג׳ן לאש. כ-30 דקות מהעיר.',
        rating: 4.3,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Ateshgah+Fire+Temple+Baku',
      },
      {
        id: 'gyd-redvillage',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Krasnaya_sloboda_i_galleryfull.jpg/500px-Krasnaya_sloboda_i_galleryfull.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'הכפר האדום (קרסניה סלובודה)',
        nameLocal: 'Red Village (Qırmızı Qəsəbə)',
        category: 'attraction',
        lat: 41.3736,
        lng: 48.5106,
        description:
          'אחד היישובים היהודיים השלמים האחרונים בעולם מחוץ לישראל - קהילת "יהודי ההרים" עם בתי כנסת פעילים ומרכז מבקרים על ההיסטוריה היהודית. ליד העיר קובה, כ-2.5 שעות צפונית לבאקו.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Qirmizi+Qesebe+Red+Village',
      },
      {
        id: 'gyd-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד באקו (הרב שניאור סגל)',
        },
        name: 'בית חב"ד באקו (כשרות)',
        nameLocal: 'Chabad of Baku',
        category: 'kosher-food',
        lat: 40.3758,
        lng: 49.8394,
        description:
          'בית חב"ד וקהילה יהודית ברובע נסימי (רחוב דילארה אלייבה), עם בית כנסת וקייטרינג כשר - למעשה שירות הכשרות המאומת היחיד בבאקו. הכתובת לארוחות ולמידע לישראלים בעיר.',
        rating: 4.4,
        kosherNote:
          'קייטרינג ואוכל כשר דרך בית חב"ד באקו. אין תשתית מסעדות כשרות רחבה בעיר - יש לתאם ארוחות (כולל שבת) מול בית חב"ד מראש.',
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chabad+of+Baku',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'העיר העתיקה ומגדלי הלהבה',
        placeIds: ['gyd-maiden', 'gyd-shirvanshahs', 'gyd-fountain', 'gyd-boulevard', 'gyd-flame'],
        notes:
          'יום רגלי: מגדל הבתולה וארמון השירוואנשאהים בעיר העתיקה, יציאה לכיכר המזרקות ולטיילת הים, ולסיום תצפית על מגדלי הלהבה מפארק הרמה - מרשימים במיוחד כשנדלקים בלילה.',
      },
      {
        day: 2,
        title: 'ארץ האש - אש, בוץ וסלע',
        placeIds: ['gyd-gobustan', 'gyd-ateshgah', 'gyd-yanardag'],
        notes:
          'יום טבע עם נהג/טיול מאורגן: דרומה לגובוסטן (ציורי סלע והרי בוץ), ואז מזרחה למקדש האש אטשגה ולהר הבוער יאנאר דאג - הכי מרשים לקראת החשכה. האתרים מפוזרים, ורכב הכרחי.',
      },
      {
        day: 3,
        title: 'אדריכלות ומורשת יהודית',
        placeIds: ['gyd-heydar', 'gyd-redvillage', 'gyd-chabad'],
        notes:
          'בוקר במרכז היידר אלייב (זהא חדיד). מי שרוצה יום שלם של מורשת יהודית - נסיעה צפונה לכפר האדום ליד קובה (כ-2.5 שעות). לארוחה כשרה מתאמים מראש עם בית חב"ד.',
      },
    ],
    practical: {
      flights:
        'טיסות ישירות תכופות מנתב"ג לבאקו (אזרביג׳אן איירליינס AZAL, ארקיע, ישראייר) - כ-18 טיסות בשבוע, טיסה של כ-3 שעות.',
      gettingAround:
        'בעיר: מטרו זול, אפליקציית Bolt למוניות ורגל בעיר העתיקה. אתרי הטבע (גובוסטן, יאנאר דאג, אטשגה) והכפר האדום מפוזרים ורחוקים - הדרך הנוחה היא טיול מאורגן או נהג פרטי ליום.',
      kosherOverview:
        'בית חב"ד באקו (ברובע נסימי, בראשות הרב שניאור סגל) הוא שירות הכשרות המאומת בעיר - בית כנסת וקייטרינג כשר. אין בבאקו תשתית מסעדות כשרות רחבה, ולכן יש לתאם ארוחות מול בית חב"ד מראש. בכפר האדום שבצפון יש קהילה יהודית פעילה ומרכז מבקרים.',
    },
  },
  {
    slug: 'almaty',
    name: 'אלמטי',
    nameLocal: 'Almaty / Алматы',
    countrySlug: 'kazakhstan',
    flag: '🇰🇿',
    center: { lat: 43.24, lng: 76.94 },
    zoom: 11,
    tagline: 'עיר למרגלות הרים מושלגים - שער לקניון צ׳ארין ולאגמי טיאן שאן',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Big_Almaty_Lake_on_29_Aug_2019.jpg/500px-Big_Almaty_Lake_on_29_Aug_2019.jpg',
    iconicLandmark: {
      name: 'קתדרלת זנקוב',
      nameLocal: 'Ascension (Zenkov) Cathedral',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Zenkov_Cathedral%2C_Almaty.jpg/500px-Zenkov_Cathedral%2C_Almaty.jpg',
      blurb:
        'קתדרלה אורתודוקסית צבעונית מעץ מ-1907, מהמבנים הגבוהים בעולם הבנויים כולם מעץ בלי מסמרים - ושרדה רעידת אדמה גדולה. סמל העיר בלב פארק פנפילוב.',
    },
    editorialRating: {
      score: 4.4,
      verdict:
        'טבע הרים ברמה עולמית ממש מעל העיר, פטור מוויזה וקהילת חב"ד - יעד מתגלה ומתגמל. חסרונות: הטיסה הישירה בתדירות נמוכה (כפעמיים בשבוע), ואתרי הטבע הטובים דורשים נהג ויום שלם.',
    },
    summary:
      'אלמטי, העיר הגדולה של קזחסטן, יושבת למרגלות הרי טיאן שאן המושלגים - ומשלבת עיר ירוקה ונעימה עם גישה מהירה לטבע פראי: קניון צ׳ארין האדום, האגם הגדול הטורקיז, ואתרי הסקי מדאו ושימבולק שמעל העיר. יש בה קהילת חב"ד ותיקה עם בית כנסת מרכזי וחנות כשרה.',
    bestSeason: 'מאי-ספטמבר (טבע ואגמים נגישים) - החורף קר ומושלג ומצוין לסקי במדאו/שימבולק',
    places: [
      {
        id: 'ala-charyn',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Charyn_Canyon_%283991842679%29.jpg/500px-Charyn_Canyon_%283991842679%29.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'קניון צ׳ארין (עמק הטירות)',
        nameLocal: 'Charyn Canyon',
        category: 'nature',
        lat: 43.3581,
        lng: 79.0925,
        description:
          'קניון אדום דרמטי שנחצב בידי הנהר, המכונה "עמק הטירות" בזכות עמודי הסלע. לעיתים מושווה לגרנד קניון בגרסה מיניאטורית. טיול יום מלא (כ-200 ק"מ) ממזרח לאלמטי.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Charyn+Canyon',
      },
      {
        id: 'ala-lake',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Big_Almaty_Lake_on_29_Aug_2019.jpg/500px-Big_Almaty_Lake_on_29_Aug_2019.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'האגם הגדול של אלמטי',
        nameLocal: 'Big Almaty Lake',
        category: 'nature',
        lat: 43.0506,
        lng: 76.985,
        description:
          'אגם הרים טורקיז בגובה כ-2,500 מטר, מוקף פסגות מושלגות, כ-25 ק"מ מהעיר. הצבע משתנה עם העונה והאור - אחד הנופים המזוהים ביותר עם אלמטי. (בדקו הגבלות גישה עונתיות.)',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Big+Almaty+Lake',
      },
      {
        id: 'ala-shymbulak',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Shymbulak%2C_Almaty_%28P1180205-Pano%29.jpg/500px-Shymbulak%2C_Almaty_%28P1180205-Pano%29.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 2,
        mustSee: true,
        name: 'שימבולק',
        nameLocal: 'Shymbulak',
        category: 'nature',
        lat: 43.1281,
        lng: 77.0808,
        description:
          'אתר הסקי הגבוה מעל אלמטי, נגיש ברכבל מרשים מעל מדאו. בחורף - סקי; בקיץ - טיולים רגליים ותצפיות אלפיניות על רכס טיאן שאן. נגיש ליום מהעיר.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Shymbulak+Almaty',
      },
      {
        id: 'ala-medeu',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Medeu_Skating_Rink_in_Almaty_Kazakhstan.jpg/500px-Medeu_Skating_Rink_in_Almaty_Kazakhstan.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'מדאו',
        nameLocal: 'Medeu',
        category: 'attraction',
        lat: 43.1575,
        lng: 77.0586,
        description:
          'זירת ההחלקה על הקרח הגבוהה בעולם (כ-1,700 מטר), בעמק הררי ממש מעל העיר. נקודת מוצא לרכבל לשימבולק, ולעלייה במדרגות הסכר לתצפית.',
        rating: 4.4,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Medeu+Almaty',
      },
      {
        id: 'ala-koktobe',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/View_of_Kok-Tobe_amusement_part_and_Almaty_T.V_Tower..JPG/500px-View_of_Kok-Tobe_amusement_part_and_Almaty_T.V_Tower..JPG',
        tags: ['families', 'romantic'],
        priceLevel: 1,
        name: 'קוק-טובה',
        nameLocal: 'Kok-Tobe',
        category: 'viewpoint',
        lat: 43.2331,
        lng: 76.9755,
        description:
          'גבעה מעל אלמטי עם רכבל, פארק שעשועים קטן, מגדל טלוויזיה והתצפית הטובה על העיר וההרים מסביב. נעים במיוחד בשקיעה ובלילה.',
        rating: 4.4,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Kok-Tobe+Almaty',
      },
      {
        id: 'ala-zenkov',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Zenkov_Cathedral%2C_Almaty.jpg/500px-Zenkov_Cathedral%2C_Almaty.jpg',
        tags: ['history', 'art'],
        priceLevel: 0,
        mustSee: true,
        name: 'קתדרלת זנקוב',
        nameLocal: 'Ascension (Zenkov) Cathedral',
        category: 'attraction',
        lat: 43.2588,
        lng: 76.9532,
        description:
          'קתדרלה אורתודוקסית צבעונית מעץ מ-1907, מהמבנים הגבוהים בעולם הבנויים כולם מעץ - ושרדה את רעידת האדמה הגדולה של 1911. פנינה בלב פארק פנפילוב.',
        rating: 4.6,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Ascension+Cathedral+Almaty',
      },
      {
        id: 'ala-panfilov',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/The_memorial_park_of_Panfilov_28_guardsmen_-_panoramio.jpg/500px-The_memorial_park_of_Panfilov_28_guardsmen_-_panoramio.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        name: 'פארק 28 הגווארדים של פנפילוב',
        nameLocal: 'Panfilov Park',
        category: 'attraction',
        lat: 43.2605,
        lng: 76.9543,
        description:
          'פארק עירוני ירוק וקריר סביב קתדרלת זנקוב, ובו אנדרטת מלחמה מרשימה ולהבה נצחית. מקום מפגש נעים לטיול רגלי במרכז העיר.',
        rating: 4.4,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Panfilov+Park+Almaty',
      },
      {
        id: 'ala-republic',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Republic_Square_-_sculptures_at_the_Independence_Monument_Almaty.jpg/500px-Republic_Square_-_sculptures_at_the_Independence_Monument_Almaty.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'כיכר הרפובליקה ואנדרטת העצמאות',
        nameLocal: 'Republic Square',
        category: 'attraction',
        lat: 43.2389,
        lng: 76.9455,
        description:
          'הכיכר המרכזית הרחבה של אלמטי, ובמרכזה עמוד אנדרטת העצמאות עם דמות "האדם המוזהב" בראשו - סמל לאומי קזחי. נקודה טובה להבנת העיר המודרנית.',
        rating: 4.2,
        durationMin: 30,
        externalUrl: 'https://maps.google.com/?q=Republic+Square+Almaty',
      },
      {
        id: 'ala-firstpres',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Park_of_the_Foundation_of_the_First_President_of_Almaty.jpg/500px-Park_of_the_Foundation_of_the_First_President_of_Almaty.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 0,
        name: 'פארק הנשיא הראשון',
        nameLocal: 'First President Park',
        category: 'nature',
        lat: 43.1864,
        lng: 76.8868,
        description:
          'פארק גדול ומטופח בדרום העיר, עם שדרות, מזרקות, גן יפני ותצפית ישרה על רכס ההרים. מקום אהוב על משפחות מקומיות לטיול אחר צהריים.',
        rating: 4.4,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=First+President+Park+Almaty',
      },
      {
        id: 'ala-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד אלמטי (הרב אלחנן כהן)',
        },
        name: 'בית חב"ד אלמטי (בית כנסת מרכזי וחנות כשרה)',
        nameLocal: 'Chabad Lubavitch Almaty',
        category: 'kosher-food',
        lat: 43.2599,
        lng: 76.8889,
        description:
          'המתחם המרכזי של הקהילה היהודית באלמטי (שדרת ראיימבק) - בית הכנסת המרכזי, חנות כשרה, חדר אוכל ומקווה. כתובת הכשרות והמידע לישראלים בעיר.',
        rating: 4.4,
        kosherNote:
          'חנות כשרה ואוכל דרך בית חב"ד (החנות פתוחה א׳-ו׳, בשישי עד לפני שבת). אין תשתית מסעדות כשרות רחבה בעיר - מומלץ לתאם ארוחות מראש מול בית חב"ד.',
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Chabad+Almaty',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'העיר - קתדרלה, פארקים ותצפית',
        placeIds: ['ala-zenkov', 'ala-panfilov', 'ala-republic', 'ala-firstpres', 'ala-koktobe'],
        notes:
          'יום עירוני: קתדרלת זנקוב ופארק פנפילוב, כיכר הרפובליקה ופארק הנשיא הראשון עם נוף ההרים, ולסיום עלייה ברכבל לקוק-טובה לשקיעה מעל העיר.',
      },
      {
        day: 2,
        title: 'ההרים שמעל העיר',
        placeIds: ['ala-medeu', 'ala-shymbulak', 'ala-lake'],
        notes:
          'יום הרים: מדאו (זירת הקרח) ורכבל לשימבולק לתצפיות אלפיניות, ואחר הצהריים האגם הגדול של אלמטי (לבדוק הגבלות גישה עונתיות). הכול במרחק שעה מהעיר.',
      },
      {
        day: 3,
        title: 'קניון צ׳ארין',
        placeIds: ['ala-charyn', 'ala-chabad'],
        notes:
          'טיול יום מלא מזרחה לקניון צ׳ארין (כ-200 ק"מ, נהג או טיול מאורגן) - הליכה בעמק הטירות בין עמודי הסלע האדומים. לתאם ארוחות כשרות מראש עם בית חב"ד.',
      },
    ],
    practical: {
      flights:
        'אייר אסטנה מפעילה טיסה ישירה מנתב"ג לאלמטי כפעמיים בשבוע (טיסה של כ-6 שעות) - קו ישיר יציב, אם כי בתדירות נמוכה יותר מיעדים קרובים.',
      gettingAround:
        'בעיר: מטרו, אוטובוסים ואפליקציית Yandex Go למוניות (זולה). אתרי הטבע (צ׳ארין, האגם הגדול) והרי הסקי דורשים נהג פרטי או טיול מאורגן - אין תחבורה ציבורית נוחה אליהם.',
      kosherOverview:
        'בית חב"ד אלמטי (שדרת ראיימבק, בראשות הרב אלחנן כהן) הוא מרכז הכשרות בעיר: בית כנסת מרכזי, חנות כשרה וחדר אוכל. אין באלמטי תשתית מסעדות כשרות רחבה - מומלץ לתאם ארוחות (כולל שבת) מול בית חב"ד מראש.',
    },
  },
  {
    slug: 'kotor',
    name: 'קוטור ומפרץ בוקה',
    nameLocal: 'Kotor / Kotor',
    countrySlug: 'montenegro',
    flag: '🇲🇪',
    center: { lat: 42.55, lng: 18.9 },
    zoom: 9,
    tagline: 'מפרץ דמוי פיורד, ערים עתיקות והרים פראיים עם אגמים וקניונים',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kotor%2C_Montenegro.jpg/500px-Kotor%2C_Montenegro.jpg',
    iconicLandmark: {
      name: 'מפרץ קוטור והעיר העתיקה',
      nameLocal: 'Bay of Kotor & Old Town',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kotor%2C_Montenegro.jpg/500px-Kotor%2C_Montenegro.jpg',
      blurb:
        'עיר עתיקה מוקפת חומה בקצה מפרץ בוקה הדרמטי, בין צוקי הרים תלולים שנראים כמו פיורד - אתר מורשת עולמית ואחד הנופים היפים בים התיכון.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'מפרץ מרהיב, ערים עתיקות וטבע הרים נגיש - הכול במרחקים קצרים ועם פטור מוויזה. חסרונות: הטיסה הישירה עונתית (קיץ בלבד לטיבט), ואין במדינה תשתית כשרות.',
    },
    summary:
      'קוטור ומפרץ בוקה הם הלב של מונטנגרו: עיר עתיקה מוקפת חומה למרגלות הרים תלולים, ערי חוף כמו בודווה וסווטי סטפן במרחק דקות, ומעליהן העולם ההררי הפראי - הפארק הלאומי לובצ׳ן, אגם ביוגרד ביער הבתולה שליד קולאשין, והאגם השחור וקניון טארה בדורמיטור. (בסיס נוח לטיול הוא קוטור או בודווה; אתרי הצפון הם טיולי יום ארוכים.)',
    bestSeason: 'מאי-אוקטובר (חוף והרים נגישים; הטיסה הישירה לטיבט בקיץ) - חורף שקט וקר בהרים',
    places: [
      {
        id: 'kot-oldtown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kotor%2C_Montenegro.jpg/500px-Kotor%2C_Montenegro.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'העיר העתיקה של קוטור',
        nameLocal: 'Kotor Old Town',
        category: 'attraction',
        lat: 42.4243,
        lng: 18.7712,
        description:
          'מבוך סמטאות אבן, כיכרות וכנסיות מימי הביניים בעיר מוקפת חומה על שפת המפרץ - אתר מורשת עולמית. חתולים בכל פינה, בתי קפה נעימים ואווירה ונציאנית.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Kotor+Old+Town',
      },
      {
        id: 'kot-walls',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/San_Giovanni_Fortress%2C_Montenegro.jpg/500px-San_Giovanni_Fortress%2C_Montenegro.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        mustSee: true,
        name: 'חומות קוטור ומצודת סן ג׳ובאני',
        nameLocal: 'Kotor Walls & San Giovanni Fortress',
        category: 'viewpoint',
        lat: 42.4256,
        lng: 18.7742,
        description:
          'טיפוס של כ-1,350 מדרגות לאורך חומות העיר עד מצודת סן ג׳ובאני - התצפית הקלאסית על המפרץ מלמעלה. מאמץ מתגמל; מומלץ בבוקר או לפנות ערב, עם מים ונעליים טובות.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Kotor+Fortress+San+Giovanni',
      },
      {
        id: 'kot-perast',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Widok_na_Perast_od_strony_morza_05.JPG/500px-Widok_na_Perast_od_strony_morza_05.JPG',
        tags: ['history', 'romantic'],
        priceLevel: 0,
        name: 'פראסט',
        nameLocal: 'Perast',
        category: 'attraction',
        lat: 42.4869,
        lng: 18.6992,
        description:
          'עיירה בארוקית קטנה ומקסימה על שפת המפרץ, עם ארמונות אבן וכנסיות ובלי תנועת רכב. נקודת היציאה בסירה לאיים הקטנים שממול.',
        rating: 4.6,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Perast+Montenegro',
      },
      {
        id: 'kot-ourlady',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Our_Lady_of_the_Rocks_Montenegro.jpg/500px-Our_Lady_of_the_Rocks_Montenegro.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'כנסיית גבירתנו של הסלעים',
        nameLocal: 'Our Lady of the Rocks',
        category: 'attraction',
        lat: 42.4867,
        lng: 18.6889,
        description:
          'כנסייה על אי מלאכותי שנבנה במשך מאות שנים מאבנים שהטילו דייגים לים. מגיעים בסירה קצרה מפראסט; בפנים מוזיאון קטן ולוח קיר עשוי חוטי כסף.',
        rating: 4.5,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Our+Lady+of+the+Rocks+Perast',
      },
      {
        id: 'kot-lovcen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Jezerski_Vrh%2C_Njegos_mausoleum_-_1.jpg/500px-Jezerski_Vrh%2C_Njegos_mausoleum_-_1.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        mustSee: true,
        name: 'הפארק הלאומי לובצ׳ן ומאוזוליאום נייגוש',
        nameLocal: 'Lovćen NP & Njegoš Mausoleum',
        category: 'nature',
        lat: 42.4001,
        lng: 18.8375,
        description:
          'פארק לאומי הררי מעל קוטור, ובראש פסגת ג׳זרסקי המאוזוליאום של המשורר-שליט נייגוש. מטפסים 461 מדרגות לתצפית מעגלית עוצרת נשימה על חצי מונטנגרו. הדרך המפותלת מקוטור היא חוויה בפני עצמה.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Njegos+Mausoleum+Lovcen',
      },
      {
        id: 'kot-budva',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Old_Town_Scene_-_Budva_-_Montenegro_-_01.jpg/500px-Old_Town_Scene_-_Budva_-_Montenegro_-_01.jpg',
        tags: ['history', 'nightlife'],
        priceLevel: 1,
        mustSee: true,
        name: 'העיר העתיקה של בודווה',
        nameLocal: 'Budva Old Town',
        category: 'attraction',
        lat: 42.2781,
        lng: 18.8386,
        description:
          'עיר עתיקה מוקפת חומה על צוק אל הים, ולצידה החופים ומרכז הבילוי התוסס ביותר של החוף המונטנגרי. שילוב של סמטאות ונציאניות, חופים וחיי לילה.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Budva+Old+Town',
      },
      {
        id: 'kot-svetistefan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Sveti_Stefan_%2805%29.jpg/500px-Sveti_Stefan_%2805%29.jpg',
        tags: ['romantic'],
        priceLevel: 0,
        name: 'סווטי סטפן',
        nameLocal: 'Sveti Stefan',
        category: 'viewpoint',
        lat: 42.2558,
        lng: 18.8911,
        description:
          'אי-כפר דייגים מהמאה ה-15 שהפך למלון יוקרה, מחובר לחוף ברצועת חול - הגלויה המזוהה ביותר עם מונטנגרו. האי עצמו סגור למבקרים, אבל התצפית מהכביש שמעליו חובה.',
        rating: 4.5,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Sveti+Stefan+Montenegro',
      },
      {
        id: 'kot-biograd',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Biogradsko_Jezero.jpg/500px-Biogradsko_Jezero.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'אגם ביוגרד (ביוגרדסקה גורה)',
        nameLocal: 'Lake Biograd (Biogradska Gora)',
        category: 'nature',
        lat: 42.897,
        lng: 19.6027,
        description:
          'אגם קרחוני צלול בלב אחד מיערות הבתולה האחרונים באירופה, בפארק הלאומי ביוגרדסקה גורה שליד קולאשין. שביל הליכה נעים מקיף את האגם - טבע שקט ובראשיתי, כשעתיים מהחוף.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Biogradsko+Jezero',
      },
      {
        id: 'kot-blacklake',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Crno_jezero_-_1.jpg/500px-Crno_jezero_-_1.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'האגם השחור (דורמיטור)',
        nameLocal: 'Black Lake (Durmitor)',
        category: 'nature',
        lat: 43.1433,
        lng: 19.0875,
        description:
          'אגם הררי כהה ומרהיב למרגלות פסגות הפארק הלאומי דורמיטור, ליד העיירה ז׳בליאק. שביל מעגלי קל (כ-3.5 ק"מ) בין יער אורנים ומים - לב הטבע האלפיני של מונטנגרו.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Black+Lake+Durmitor',
      },
      {
        id: 'kot-tara',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/%C4%90ur%C4%91evi%C4%87a_Tara.jpg/500px-%C4%90ur%C4%91evi%C4%87a_Tara.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'גשר וקניון טארה',
        nameLocal: 'Tara Canyon & Đurđevića Bridge',
        category: 'nature',
        lat: 43.1495,
        lng: 19.2941,
        description:
          'קניון נהר הטארה הוא העמוק באירופה (עד כ-1,300 מטר), ומעליו נמתח גשר הקשתות ההיסטורי מ-1940. אזור לרפטינג, זיפליין ותצפיות - חלק מיום דורמיטור בצפון.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Djurdjevica+Tara+Bridge',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'מפרץ בוקה - קוטור ופראסט',
        placeIds: ['kot-oldtown', 'kot-walls', 'kot-perast', 'kot-ourlady'],
        notes:
          'בוקר בעיר העתיקה של קוטור וטיפוס על החומות למצודת סן ג׳ובאני (מים ונעליים טובות!). אחר הצהריים נסיעה יפהפייה לאורך המפרץ לפראסט, ומשם בסירה לכנסיית גבירתנו של הסלעים.',
      },
      {
        day: 2,
        title: 'החוף - בודווה, סווטי סטפן ולובצ׳ן',
        placeIds: ['kot-budva', 'kot-svetistefan', 'kot-lovcen'],
        notes:
          'העיר העתיקה של בודווה והחופים בבוקר, תצפית על סווטי סטפן, ולסיום עלייה בדרך המפותלת אל הפארק הלאומי לובצ׳ן ולמאוזוליאום נייגוש - תצפית על חצי מונטנגרו.',
      },
      {
        day: 3,
        title: 'צפון פראי - דורמיטור וטארה',
        placeIds: ['kot-blacklake', 'kot-tara'],
        notes:
          'יום ארוך צפונה (כ-2.5-3 שעות): הקפת האגם השחור בדורמיטור, וגשר וקניון טארה בדרך. מי שיכול - שווה לינה בז׳בליאק/קולאשין כדי לפצל את הצפון ליומיים.',
      },
      {
        day: 4,
        title: 'יער הבתולה - אגם ביוגרד',
        placeIds: ['kot-biograd'],
        notes:
          'טיול רגוע בפארק הלאומי ביוגרדסקה גורה שליד קולאשין: שביל מקיף את אגם ביוגרד בלב יער בתולה קדום. שילוב מושלם בדרך חזרה מהצפון אל החוף.',
      },
    ],
    practical: {
      flights:
        'אל על וישראייר מפעילות טיסה ישירה מנתב"ג לטיבט (Tivat) - אך עונתית בלבד, בחודשי הקיץ (כ-יולי-ספטמבר), טיסה של כ-3 שעות. מחוץ לעונה טסים דרך יעד ביניים אירופי.',
      gettingAround:
        'הדרך הנוחה היא רכב שכור: המרחקים קצרים אך הכבישים ההרריים מפותלים, ואתרי הטבע בצפון (דורמיטור, ביוגרדסקה גורה) כמעט בלתי נגישים בתחבורה ציבורית. בין ערי החוף יש גם אוטובוסים.',
      kosherOverview:
        'אין במונטנגרו תשתית כשרות מסודרת - אין מסעדות כשרות או בית חב"ד תיירותי פעיל, והקהילה היהודית הקטנה מרוכזת בפודגוריצה. מומלץ להצטייד מראש במוצרים ארוזים עם הכשר, או להתארגן ללינה עם מטבח ולבשל עצמאית. פירות, ירקות ודגים טריים זמינים בשווקים המקומיים.',
    },
  },
  {
    slug: 'budva',
    name: 'בודווה',
    nameLocal: 'Budva / Budva',
    countrySlug: 'montenegro',
    flag: '🇲🇪',
    center: { lat: 42.31, lng: 18.9 },
    zoom: 11,
    tagline: 'בירת החוף של מונטנגרו - עיר עתיקה, חופים ואגם סקאדאר',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Citadela_of_Budva_old_town.jpg/500px-Citadela_of_Budva_old_town.jpg',
    iconicLandmark: {
      name: 'העיר העתיקה של בודווה',
      nameLocal: 'Budva Old Town',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Old_Town_Scene_-_Budva_-_Montenegro_-_01.jpg/500px-Old_Town_Scene_-_Budva_-_Montenegro_-_01.jpg',
      blurb:
        'עיר עתיקה מוקפת חומה על צוק אל הים האדריאטי, עם סמטאות ונציאניות, מצודה וכנסיות - הלב ההיסטורי של חוף מונטנגרו.',
    },
    editorialRating: {
      score: 4.4,
      verdict:
        'בירת החוף: עיר עתיקה יפהפייה, שרשרת חופים ובסיס מצוין לטבע (אגם סקאדאר, לובצ׳ן). חסרונות: עמוסה ורועשת בשיא הקיץ, והטיסה הישירה לטיבט עונתית בלבד.',
    },
    summary:
      'בודווה היא בירת החוף התוססת של מונטנגרו: עיר עתיקה מוקפת חומה על צוק, שרשרת חופים וחיי לילה - ובסיס נוח לטבע שמסביב. במרחק דקות: האי סווטי ניקולה, כפר-המלון סווטי סטפן, הרי לובצ׳ן, והפנינה השקטה - אגם סקאדאר, הגדול בבלקן, עם תצפית הפיתול המפורסמת בפאבלובה סטראנה. אין במדינה תשתית כשרות.',
    bestSeason: 'מאי-אוקטובר (עונת החוף; הטיסה הישירה לטיבט בקיץ) - יולי-אוגוסט הכי עמוס ותוסס',
    places: [
      {
        id: 'bud-oldtown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Old_Town_Scene_-_Budva_-_Montenegro_-_01.jpg/500px-Old_Town_Scene_-_Budva_-_Montenegro_-_01.jpg',
        tags: ['history', 'nightlife'],
        priceLevel: 1,
        mustSee: true,
        name: 'העיר העתיקה של בודווה',
        nameLocal: 'Budva Old Town',
        category: 'attraction',
        lat: 42.2781,
        lng: 18.8386,
        description:
          'עיר עתיקה מוקפת חומה על צוק אל הים - סמטאות אבן ונציאניות, כנסיות וכיכרות, ומסביב מרכז הבילוי והחיים של החוף המונטנגרי. יפה במיוחד בשעות הערב.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Budva+Old+Town',
      },
      {
        id: 'bud-citadela',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Citadela_of_Budva_old_town.jpg/500px-Citadela_of_Budva_old_town.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 1,
        name: 'מצודת בודווה (ציטדלה)',
        nameLocal: 'Budva Citadela',
        category: 'viewpoint',
        lat: 42.2775,
        lng: 18.838,
        description:
          'המצודה בקצה העיר העתיקה, עם חומות, ספרייה עתיקה ותצפית פתוחה על הים, על האי סווטי ניקולה ועל גגות הרעפים של בודווה. הכי יפה לקראת השקיעה.',
        rating: 4.4,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Citadela+Budva',
      },
      {
        id: 'bud-mogren',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Mogren_Beach_Budva_1b.png/500px-Mogren_Beach_Budva_1b.png',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'חוף מוגרן',
        nameLocal: 'Mogren Beach',
        category: 'nature',
        lat: 42.277,
        lng: 18.8321,
        description:
          'חוף חצץ יפה מתחת לצוקים, במרחק הליכה קצרה מהעיר העתיקה לאורך שביל חוף מרהיב. מים צלולים ואווירה נעימה - מהחופים האהובים בבודווה.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Mogren+Beach+Budva',
      },
      {
        id: 'bud-svnikola',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Sveti_Nikola_Island_near_Budva_2600x1300.jpg/500px-Sveti_Nikola_Island_near_Budva_2600x1300.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'האי סווטי ניקולה',
        nameLocal: 'Sveti Nikola Island',
        category: 'nature',
        lat: 42.2659,
        lng: 18.8522,
        description:
          'האי הגדול מול בודווה, המכונה "האי של הצבאים", עם חופים שקטים ושבילי הליכה. מגיעים בסירת טקסי קצרה מהחוף - בריחה נעימה מהעיר.',
        rating: 4.3,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Sveti+Nikola+Island+Budva',
      },
      {
        id: 'bud-becici',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Montenegro_Becici_beach.jpg/500px-Montenegro_Becici_beach.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 1,
        name: 'חוף בצ׳יצ׳י',
        nameLocal: 'Bečići Beach',
        category: 'nature',
        lat: 42.2831,
        lng: 18.8775,
        description:
          'חוף חול-חצץ ארוך ורחב מדרום לבודווה, שזכה בעבר בפרס לחוף היפה באירופה. רגוע ומשפחתי יותר, עם מלונות וטיילת לאורכו.',
        rating: 4.3,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Becici+Beach',
      },
      {
        id: 'bud-slovenska',
        tags: ['families', 'nightlife'],
        priceLevel: 0,
        name: 'חוף סלובנסקה',
        nameLocal: 'Slovenska Plaža',
        category: 'nature',
        lat: 42.2835,
        lng: 18.8475,
        description:
          'החוף המרכזי והארוך של בודווה, צמוד לעיר ולטיילת - ספורט ימי, בארים ומסעדות. הכי נוח ותוסס, אם כי לא הכי שקט.',
        rating: 4.1,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Slovenska+Plaza+Budva',
      },
      {
        id: 'bud-svetistefan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Sveti_Stefan_%2805%29.jpg/500px-Sveti_Stefan_%2805%29.jpg',
        tags: ['romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'סווטי סטפן',
        nameLocal: 'Sveti Stefan',
        category: 'viewpoint',
        lat: 42.2558,
        lng: 18.8911,
        description:
          'אי-כפר דייגים מהמאה ה-15 שהפך למלון יוקרה, מחובר לחוף ברצועת חול - הגלויה המזוהה ביותר עם מונטנגרו. האי סגור למבקרים, אבל התצפית מהכביש שמעליו חובה. דקות דרומית לבודווה.',
        rating: 4.5,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Sveti+Stefan+Montenegro',
      },
      {
        id: 'bud-skadar',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Pavlova_Strana%2C_Rijeka_Crnojevi%C4%87a%2C_Cetinje.jpg/500px-Pavlova_Strana%2C_Rijeka_Crnojevi%C4%87a%2C_Cetinje.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'אגם סקאדאר ותצפית פאבלובה סטראנה',
        nameLocal: 'Lake Skadar & Pavlova Strana',
        category: 'nature',
        lat: 42.3564,
        lng: 19.0227,
        description:
          'האגם הגדול בבלקן ושמורת ציפורים (פליקנים!), עם פיתול נהר מרהיב בתצפית פאבלובה סטראנה שליד ריקה צרנוֹיֶביצ׳ה. שיט שקט בין חבצלות מים יוצא מווירפזאר. כשעה מבודווה.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Pavlova+Strana+Skadar+Lake',
      },
      {
        id: 'bud-lovcen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Jezerski_Vrh%2C_Njegos_mausoleum_-_1.jpg/500px-Jezerski_Vrh%2C_Njegos_mausoleum_-_1.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        name: 'הפארק הלאומי לובצ׳ן',
        nameLocal: 'Lovćen National Park',
        category: 'nature',
        lat: 42.4001,
        lng: 18.8375,
        description:
          'פארק לאומי הררי מעל החוף, ובראש פסגת ג׳זרסקי המאוזוליאום של המשורר-שליט נייגוש - 461 מדרגות לתצפית מעגלית עוצרת נשימה על חצי מונטנגרו. כשעה מבודווה.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Lovcen+National+Park',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'העיר העתיקה והחופים',
        placeIds: ['bud-oldtown', 'bud-citadela', 'bud-mogren', 'bud-slovenska'],
        notes:
          'בוקר בעיר העתיקה ובמצודה (תצפית על הים), טיול על שביל החוף אל חוף מוגרן, ואחר צהריים רגוע על חוף סלובנסקה הצמוד. בערב - הסמטאות והבילוי בעיר העתיקה.',
      },
      {
        day: 2,
        title: 'חופי הדרום ואי הצבאים',
        placeIds: ['bud-svetistefan', 'bud-becici', 'bud-svnikola'],
        notes:
          'תצפית על סווטי סטפן, חוף רגוע בבצ׳יצ׳י, וסירת טקסי אל האי סווטי ניקולה לשחייה ולשקט - יום ים קלאסי סביב בודווה.',
      },
      {
        day: 3,
        title: 'אגם סקאדאר',
        placeIds: ['bud-skadar'],
        notes:
          'טיול יום אל הפארק הלאומי אגם סקאדאר: תצפית הפיתול בפאבלובה סטראנה, ושיט שקט מווירפזאר בין ציפורים וחבצלות מים. ניגוד מרענן לחוף.',
      },
      {
        day: 4,
        title: 'ההר - לובצ׳ן',
        placeIds: ['bud-lovcen'],
        notes:
          'יום הרים: הדרך המפותלת אל הפארק הלאומי לובצ׳ן ולמאוזוליאום נייגוש, עם התצפית המעגלית המפורסמת על חצי מונטנגרו. שווה לשלב עם ירידה לצד קוטור.',
      },
    ],
    practical: {
      flights:
        'הטיסה הישירה הקרובה היא לטיבט (Tivat), כ-20 דקות נסיעה מבודווה - אך עונתית בלבד (אל על/ישראייר בקיץ, כ-יולי-ספטמבר). מחוץ לעונה טסים דרך יעד ביניים אירופי.',
      gettingAround:
        'רכב שכור נוח ביותר לטבע שמסביב (סקאדאר, לובצ׳ן); לאורך החוף יש גם אוטובוסים תכופים (בודווה-קוטור-סווטי סטפן). בעיר עצמה הכול במרחק הליכה.',
      kosherOverview:
        'אין במונטנגרו תשתית כשרות מסודרת - אין מסעדות כשרות או בית חב"ד תיירותי פעיל. מומלץ להצטייד מראש במוצרים ארוזים עם הכשר או להתארגן ללינה עם מטבח ולבשל עצמאית. פירות, ירקות ודגים טריים זמינים בשווקים.',
    },
  },
  {
    slug: 'petra',
    name: 'פטרה וואדי ראם',
    nameLocal: 'Petra / البتراء',
    countrySlug: 'jordan',
    flag: '🇯🇴',
    center: { lat: 30.0, lng: 35.3 },
    zoom: 8,
    tagline: 'עיר חצובה בסלע, מדבר אדום וים אדום - פלאי דרום ירדן',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Wadi_rum_desert.jpg/500px-Wadi_rum_desert.jpg',
    iconicLandmark: {
      name: 'הח׳זנה - "האוצר"',
      nameLocal: 'Al-Khazneh (The Treasury)',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Al_Khazneh_Petra_edit_2.jpg/500px-Al_Khazneh_Petra_edit_2.jpg',
      blurb:
        'החזית העצומה החצובה בסלע הוורוד בקצה הסיק - הפנים המזוהות ביותר של פטרה ומאתרי המורשת המפורסמים בעולם.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'פלא עולמי אמיתי במרחק שעות מאילת - פטרה וּוואדי ראם הם חוויית טבע והיסטוריה נדירה. חסרונות: מעבר יבשתי והסדרי ויזה (Jordan Pass), חום קיצוני בקיץ, ואין תשתית כשרות.',
    },
    summary:
      'דרום ירדן מציע לישראלים פלא במרחק נגיעה מאילת: פטרה, העיר הנבטית החצובה בסלע ורוד, עם הח׳זנה, המנזר וקילומטרים של מקדשים; מדבר ואדי ראם עם צוקי חול אדומים ושמי כוכבים; ואקבה על הים האדום. הכניסה במעבר ערבה, ומומלץ Jordan Pass מראש. אין בדרום ירדן תשתית כשרות מסודרת.',
    bestSeason: 'מרץ-מאי וספטמבר-נובמבר (נעים) - קיץ חם קיצוני במדבר, חורף קר בלילות',
    places: [
      {
        id: 'pet-treasury',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/The_Treasury%2C_Petra%2C_Jordan1.jpg/500px-The_Treasury%2C_Petra%2C_Jordan1.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'הח׳זנה - "האוצר" והסיק',
        nameLocal: 'Al-Khazneh (The Treasury) & the Siq',
        category: 'attraction',
        lat: 30.3225,
        lng: 35.4516,
        description:
          'נכנסים לפטרה דרך הסיק - קניון סלע צר וגבוה באורך כ-1.2 ק"מ - שנפתח אל הח׳זנה, החזית המפורסמת החצובה בסלע. הרגע האיקוני של כל ביקור בפטרה. הכניסה כלולה ב-Jordan Pass.',
        rating: 4.9,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Al-Khazneh+Petra',
      },
      {
        id: 'pet-monastery',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Ad_Deir_%28The_Monastery%29%2C_El_Deir%2C_Petra%2C_Jordan.jpg/500px-Ad_Deir_%28The_Monastery%29%2C_El_Deir%2C_Petra%2C_Jordan.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'המנזר (א-דיר)',
        nameLocal: 'The Monastery (Ad Deir)',
        category: 'nature',
        lat: 30.3382,
        lng: 35.431,
        description:
          'המבנה החצוב הגדול ביותר בפטרה, בקצה טיפוס של כ-800 מדרגות בהרים. פחות צפוף מהח׳זנה, עם נוף פראי ותצפית בקצה. שווה כל מדרגה - להתחיל מוקדם ולקחת מים.',
        rating: 4.8,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Ad+Deir+Monastery+Petra',
      },
      {
        id: 'pet-highplace',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Petra_View_from_High_Place_of_Sacrifice_1935.jpg/500px-Petra_View_from_High_Place_of_Sacrifice_1935.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 0,
        name: 'במת ההקרבה העליונה',
        nameLocal: 'High Place of Sacrifice',
        category: 'viewpoint',
        lat: 30.3215,
        lng: 35.447,
        description:
          'מסלול טיפוס מדרגות אל במת פולחן נבטית על ראש הר, עם תצפית מרהיבה על עמק פטרה כולו. מסלול חלופי ושקט יותר לחזרה, בין קברים חצובים.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=High+Place+of+Sacrifice+Petra',
      },
      {
        id: 'pet-bynight',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Petra_Al-Kaznah_by_Night.jpg/500px-Petra_Al-Kaznah_by_Night.jpg',
        tags: ['romantic', 'history'],
        priceLevel: 2,
        name: 'פטרה בלילה',
        nameLocal: 'Petra by Night',
        category: 'attraction',
        lat: 30.3226,
        lng: 35.4517,
        description:
          'בערבים נבחרים מוארים הסיק והח׳זנה באלפי נרות, עם מוזיקה בדואית. חוויה שקטה וקסומה, נפרדת מכרטיס היום. לבדוק ימי הפעלה מראש.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Petra+by+Night',
      },
      {
        id: 'pet-littlepetra',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Facade_Siq_al-Barid_Jordan1501.jpg/500px-Facade_Siq_al-Barid_Jordan1501.jpg',
        tags: ['history'],
        priceLevel: 0,
        name: 'פטרה הקטנה (סיק אל-בארד)',
        nameLocal: 'Little Petra (Siq al-Barid)',
        category: 'attraction',
        lat: 30.3675,
        lng: 35.4456,
        description:
          'אתר נבטי קטן וחינמי צפונית לפטרה, עם קניון צר ומבנים חצובים - שקט ומהיר יותר לביקור. משתלב יפה עם פטרה הראשית.',
        rating: 4.4,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Little+Petra+Siq+al-Barid',
      },
      {
        id: 'pet-wadirum',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Wadi_rum_desert.jpg/500px-Wadi_rum_desert.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'מדבר ואדי ראם',
        nameLocal: 'Wadi Rum',
        category: 'nature',
        lat: 29.5931,
        lng: 35.42,
        description:
          'מדבר של צוקי חול אדומים, קשתות סלע ומישורים אינסופיים - "עמק הירח" ששימש רקע לסרטים רבים. סיורי ג׳יפ בדואיים, טיפוס וגמלים, ולינה באוהל מדברי מתחת לשמי כוכבים.',
        rating: 4.8,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Wadi+Rum',
      },
      {
        id: 'pet-aqaba',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/South_Beach%2C_Aqaba%2C_Jordan.jpg/500px-South_Beach%2C_Aqaba%2C_Jordan.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'אקבה - הים האדום',
        nameLocal: 'Aqaba (Red Sea)',
        category: 'nature',
        lat: 29.5319,
        lng: 35.0056,
        description:
          'עיר הנמל של ירדן על הים האדום, ממש מול אילת - חופים, שוניות אלמוגים לצלילה ושנורקלינג, ואווירה נינוחה. נקודת מעבר נוחה מהגבול ומהמדבר.',
        rating: 4.3,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Aqaba+Jordan',
      },
      {
        id: 'pet-wadimusa',
        tags: ['foodie'],
        priceLevel: 1,
        name: 'ואדי מוסא (עיירת פטרה)',
        nameLocal: 'Wadi Musa',
        category: 'attraction',
        lat: 30.32,
        lng: 35.4783,
        description:
          'העיירה שלמרגלות פטרה, בסיס הלינה והאוכל לרוב המבקרים - מלונות, מסעדות מקומיות ותצפיות על ההרים. נוח ללון כאן לפני יום מוקדם בפטרה.',
        rating: 4.1,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Wadi+Musa+Jordan',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'פטרה - הסיק, האוצר והמנזר',
        placeIds: ['pet-treasury', 'pet-highplace', 'pet-monastery'],
        notes:
          'יום פטרה מלא: להיכנס מוקדם דרך הסיק אל הח׳זנה, לטפס לבמת ההקרבה לתצפית, ולסיים בטיפוס למנזר (800 מדרגות - מים והתחלה מוקדמת חובה). Jordan Pass כולל את הכניסה.',
      },
      {
        day: 2,
        title: 'פטרה הקטנה ומדבר ואדי ראם',
        placeIds: ['pet-littlepetra', 'pet-wadirum'],
        notes:
          'בוקר קצר בפטרה הקטנה, ואז דרומה לוואדי ראם: סיור ג׳יפ בדואי בין צוקי החול האדומים, ולינה באוהל מדברי מתחת לכוכבים - החלק הבלתי נשכח של הטיול.',
      },
      {
        day: 3,
        title: 'אקבה והים האדום',
        placeIds: ['pet-aqaba', 'pet-wadimusa'],
        notes:
          'רגיעה באקבה על הים האדום - חוף, שנורקלינג או צלילה - בדרך חזרה אל מעבר ערבה. מי שמעדיף עוד פטרה יכול להחליף בבוקר נוסף באתר.',
      },
    ],
    practical: {
      flights:
        'לא טסים - נכנסים במעבר יבשתי: מעבר ערבה (יצחק רבין) באילת-אקבה פתוח כל יום כ-08:00-20:00. מומלץ לרכוש מראש Jordan Pass (כולל ויזה בתנאי 3 לילות + כניסה לפטרה). מאילת אפשר גם טיולים מאורגנים ליום/יומיים.',
      gettingAround:
        'אין תחבורה ציבורית נוחה בין האתרים - הדרך הנוחה היא נהג פרטי, מונית מסוכמת מראש, רכב שכור בירדן, או טיול מאורגן מאילת. מהגבול לפטרה כשעתיים; פטרה לוואדי ראם כשעה-וחצי.',
      kosherOverview:
        'אין בדרום ירדן תשתית כשרות מסודרת - אין מסעדות כשרות או בית חב"ד. מטיילים שומרי כשרות נוהגים להצטייד מראש מאילת (הסמוכה למעבר) במזון ארוז עם הכשר. פירות, ירקות, טחינה וחומוס טריים זמינים מקומית.',
    },
  },
  {
    slug: 'larnaca',
    name: 'לרנקה',
    nameLocal: 'Larnaca / Λάρνακα',
    countrySlug: 'cyprus',
    flag: '🇨🇾',
    center: { lat: 34.83, lng: 33.3 },
    zoom: 9,
    tagline: 'שער האי הקרוב - חופים, סלע אפרודיטה, הרי טרודוס וכשרות',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Sea_caves_Cape_Greco_2.jpg/500px-Sea_caves_Cape_Greco_2.jpg',
    iconicLandmark: {
      name: 'סלע אפרודיטה',
      nameLocal: "Aphrodite's Rock",
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Petra_tou_romiou_1.jpg/500px-Petra_tou_romiou_1.jpg',
      blurb:
        'סלע בודד בים על החוף הדרומי, שלפי המיתולוגיה היוונית ממנו נולדה האלה אפרודיטה - הסמל המזוהה ביותר עם קפריסין, מרהיב בשקיעה.',
    },
    editorialRating: {
      score: 4.3,
      verdict:
        'הכי קרוב, הכי הרבה טיסות, ותשתית כשרות אמיתית - אי שלם של חופים, הרים ונופים במרחק שעה. חסרונות: חם ועמוס בשיא הקיץ, והאתרים היפים מפוזרים על פני האי (רכב כמעט הכרחי).',
    },
    summary:
      'לרנקה היא שער הכניסה לקפריסין, האי הקרוב ביותר לישראל: טיילת דקלים וחוף בעיר, אגם מלח עם פלמינגו בחורף, וממנה יוצאים לכל האי הקטן - כף גרקו וחופי איה נאפה במזרח, הרי טרודוס הירוקים במרכז, וסלע אפרודיטה וקוריון העתיקה במערב. יש בה קהילת חב"ד גדולה עם קפיטריה כשרה ומשלוחים.',
    bestSeason: 'אפריל-יוני וספטמבר-אוקטובר (נעים ופחות עמוס) - יולי-אוגוסט חם ומלא, חורף מתון ונעים לטרודוס',
    places: [
      {
        id: 'lca-finikoudes',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Larnaca_01-2017_img27_Finikoudes.jpg/500px-Larnaca_01-2017_img27_Finikoudes.jpg',
        tags: ['families', 'foodie'],
        priceLevel: 1,
        name: 'טיילת פיניקודס ולרנקה',
        nameLocal: 'Finikoudes Promenade',
        category: 'attraction',
        lat: 34.9107,
        lng: 33.6353,
        description:
          'טיילת הדקלים של לרנקה לאורך החוף - מסעדות, בתי קפה וחוף עירוני, ולידה כנסיית סנט לזרוס ההיסטורית. לב העיר, נעים לטיול ערב.',
        rating: 4.3,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Finikoudes+Larnaca',
      },
      {
        id: 'lca-saltlake',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Larnaca_Salt_Lake%2C_Cyprus%2C_view_to_Hala_Sultan_Tekke.jpg/500px-Larnaca_Salt_Lake%2C_Cyprus%2C_view_to_Hala_Sultan_Tekke.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        name: 'אגם המלח ומסגד חלה סולטן',
        nameLocal: 'Larnaca Salt Lake & Hala Sultan Tekke',
        category: 'nature',
        lat: 34.885,
        lng: 33.61,
        description:
          'אגם מלח רדוד ליד שדה התעופה, שבחורף ובאביב מתמלא במאות פלמינגו ורודים; על גדתו מסגד היסטורי מוקף דקלים. שביל הליכה נעים - נוף אחר לגמרי מהחוף. (בקיץ האגם יבש.)',
        rating: 4.3,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Larnaca+Salt+Lake',
      },
      {
        id: 'lca-capegreco',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Sea_caves_Cape_Greco_2.jpg/500px-Sea_caves_Cape_Greco_2.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'כף גרקו',
        nameLocal: 'Cape Greco',
        category: 'nature',
        lat: 35.0,
        lng: 34.0167,
        description:
          'ראש הצוק בקצה המזרחי של האי, עם מערות ים חצובות, מים טורקיז וגשר סלע טבעי. מסלולי הליכה ואופניים על הצוקים, וקפיצות לים למי שאמיץ. בין איה נאפה לפרוטרס.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Cape+Greco',
      },
      {
        id: 'lca-nissi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Nissi_Beach%2C_Ayia_Napa_-_panoramio.jpg/500px-Nissi_Beach%2C_Ayia_Napa_-_panoramio.jpg',
        tags: ['families', 'nightlife'],
        priceLevel: 1,
        name: 'חוף ניסי (איה נאפה)',
        nameLocal: 'Nissi Beach',
        category: 'nature',
        lat: 34.988,
        lng: 33.969,
        description:
          'חוף החול הלבן המפורסם של איה נאפה, עם מים רדודים וטורקיז ואיון קטן שאפשר להגיע אליו ברגל במים. תוסס ומשפחתי ביום, מרכז הבילוי של האי בערב.',
        rating: 4.3,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Nissi+Beach+Ayia+Napa',
      },
      {
        id: 'lca-troodos',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Eastern_side_of_Troodos_Mountains%2C_Cyprus_01.jpg/500px-Eastern_side_of_Troodos_Mountains%2C_Cyprus_01.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'הרי טרודוס',
        nameLocal: 'Troodos Mountains',
        category: 'nature',
        lat: 34.9167,
        lng: 32.8333,
        description:
          'רכס ההרים הירוק במרכז האי, עם פסגת האולימפוס (כ-1,950 מ׳), יערות אורנים, מפלים, כפרי אבן וכנסיות מצוירות (אתרי מורשת עולמית). קריר ונעים גם בקיץ - ניגוד מרענן לחוף.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Troodos+Mountains+Cyprus',
      },
      {
        id: 'lca-kykkos',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Kykkos_Monastery_Courtyard_2.JPG/500px-Kykkos_Monastery_Courtyard_2.JPG',
        tags: ['history', 'art'],
        priceLevel: 0,
        name: 'מנזר קיקוס',
        nameLocal: 'Kykkos Monastery',
        category: 'attraction',
        lat: 34.9839,
        lng: 32.7412,
        description:
          'המנזר העשיר והמפואר ביותר בקפריסין, עמוק בהרי טרודוס - חצרות מוזהבות, פסיפסים נוצצים ומוזיאון. משתלב יפה עם יום בהרים.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Kykkos+Monastery',
      },
      {
        id: 'lca-aphrodite',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Petra_tou_romiou_1.jpg/500px-Petra_tou_romiou_1.jpg',
        tags: ['romantic', 'outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'סלע אפרודיטה',
        nameLocal: "Aphrodite's Rock (Petra tou Romiou)",
        category: 'viewpoint',
        lat: 34.6635,
        lng: 32.627,
        description:
          'סלע בודד בים על החוף בין לימסול לפאפוס, מקום הולדתה של האלה אפרודיטה לפי המיתולוגיה. מרהיב בשקיעה; יש חוף חלוקים לטבילה. הסמל של קפריסין.',
        rating: 4.4,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Aphrodite+Rock+Petra+tou+Romiou',
      },
      {
        id: 'lca-kourion',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Ancient_Roman_theatre_Kourion_Cyprus.jpg/500px-Ancient_Roman_theatre_Kourion_Cyprus.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'קוריון העתיקה',
        nameLocal: 'Kourion',
        category: 'attraction',
        lat: 34.6642,
        lng: 32.8877,
        description:
          'אתר עתיקות יווני-רומי מרשים על צוק מעל הים, ובמרכזו תיאטרון עתיק משוחזר עם נוף לים, פסיפסים ובית מרחץ. משתלב עם סלע אפרודיטה באזור המערבי.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Kourion+Cyprus',
      },
      {
        id: 'lca-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד קפריסין',
        },
        name: 'בית חב"ד לרנקה - קפיטריה "שמיים"',
        nameLocal: 'Chabad Larnaca (Shemayim)',
        category: 'kosher-food',
        lat: 34.9124,
        lng: 33.6328,
        description:
          'בית חב"ד לרנקה עם קפיטריה כשרה "שמיים" - כריכים, סלטים, מאפים ופיצות - ומשלוחי ארוחות כשרות חמות למלון. תשתית הכשרות המרכזית בעיר; באיה נאפה יש בית חב"ד נוסף עם חנות וארוחות שבת בקיץ.',
        rating: 4.4,
        kosherNote:
          'קפיטריה כשרה ומשלוחים דרך בית חב"ד. שעות משתנות לפי עונה - כדאי לוודא מול בית חב"ד מראש, במיוחד לארוחות שבת.',
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Chabad+Larnaca',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'לרנקה - עיר, אגם וכשרות',
        placeIds: ['lca-finikoudes', 'lca-saltlake', 'lca-chabad'],
        notes:
          'יום רגוע בלרנקה: טיילת פיניקודס וכנסיית סנט לזרוס, סיבוב באגם המלח (פלמינגו בחורף-אביב), וארוחה כשרה בקפיטריית "שמיים" של בית חב"ד.',
      },
      {
        day: 2,
        title: 'המזרח - כף גרקו וחופי איה נאפה',
        placeIds: ['lca-capegreco', 'lca-nissi'],
        notes:
          'בוקר בכף גרקו - מערות ים, גשר סלע ומסלולי צוקים - ואחר צהריים על חוף ניסי באיה נאפה. שילוב מושלם של טבע וחוף.',
      },
      {
        day: 3,
        title: 'הרי טרודוס',
        placeIds: ['lca-troodos', 'lca-kykkos'],
        notes:
          'יום בהרים הקרירים: מסלולי יער ומפלים בטרודוס, כנסיות מצוירות וכפרי אבן, וביקור במנזר קיקוס המפואר. רכב מומלץ - הכבישים מפותלים.',
      },
      {
        day: 4,
        title: 'המערב - אפרודיטה וקוריון',
        placeIds: ['lca-aphrodite', 'lca-kourion'],
        notes:
          'נסיעה מערבה אל סלע אפרודיטה על החוף, ואל קוריון העתיקה - תיאטרון רומי על צוק מעל הים. אפשר להאריך ליום שלם עם פאפוס.',
      },
    ],
    practical: {
      flights:
        'הקו הנוסע ביותר מנתב"ג: עשרות טיסות ישירות ביום ללרנקה (אל על, ישראייר, ארקיע, Wizz, בלו-ברד ועוד), טיסה של פחות משעה. אפשר גם לפאפוס במערב האי.',
      gettingAround:
        'רכב שכור כמעט הכרחי כדי להגיע לטרודוס, לכף גרקו ולמערב האי - אין תחבורה ציבורית נוחה ביניהם. בתוך לרנקה ואיה נאפה יש אוטובוסים וטקסי.',
      kosherOverview:
        'לקפריסין תשתית כשרות אמיתית בזכות בית חב"ד קפריסין: קפיטריה כשרה "שמיים" בלרנקה עם משלוחי ארוחות למלון, ובית חב"ד נוסף באיה נאפה עם חנות כשרה וארוחות שבת (בעיקר בעונת הקיץ, כשמגיעים אלפי ישראלים). מומלץ לוודא שעות וארוחות שבת מול בית חב"ד מראש.',
    },
  },
  {
    slug: 'batumi',
    name: 'באטומי',
    nameLocal: 'Batumi / ბათუმი',
    countrySlug: 'georgia',
    flag: '🇬🇪',
    center: { lat: 41.64, lng: 41.68 },
    zoom: 10,
    tagline: 'הים השחור, יער גשם ומפלים - ריביירת גאורגיה עם כשרות',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/View_of_Batumi%2C_Georgia.jpg/500px-View_of_Batumi%2C_Georgia.jpg',
    iconicLandmark: {
      name: 'טיילת באטומי',
      nameLocal: 'Batumi Boulevard',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Batumi_Boulevard_Alley.jpg/500px-Batumi_Boulevard_Alley.jpg',
      blurb:
        'טיילת ים ארוכה ומוצלת לאורך חוף הים השחור, עם שדרות דקלים, מזרקות ופסלים - הלב הפועם של ריביירת גאורגיה.',
    },
    editorialRating: {
      score: 4.3,
      verdict:
        'טיסה ישירה קצרה, חוף ים שחור לצד יער גשם ומפלים סובטרופיים, ותשתית כשרות אמיתית - חבילה מלאה לקיץ. חסרונות: החוף חלוקי (לא חולי), והעונה מרוכזת בקיץ; הפנים לח וגשום.',
    },
    summary:
      'באטומי היא "ריביירת גאורגיה" על חוף הים השחור: עיר נופש תוססת עם טיילת דקלים, אדריכלות אקלקטית וחיי לילה - ומאחוריה עולם סובטרופי ירוק של יער גשם, מפלים וגן בוטני על צוק מעל הים. יש בה גם בית חב"ד ומסעדה כשרה, מה שהופך אותה לנוחה לישראלים שומרי כשרות. טיסה ישירה של כשעתיים וחצי.',
    bestSeason: 'יוני-ספטמבר (עונת החוף) - אביב וסתיו ירוקים ונעימים לטבע; חורף מתון וגשום',
    places: [
      {
        id: 'bus-boulevard',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Batumi_Boulevard_Alley.jpg/500px-Batumi_Boulevard_Alley.jpg',
        tags: ['families', 'outdoors', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'טיילת באטומי',
        nameLocal: 'Batumi Boulevard',
        category: 'nature',
        lat: 41.6536,
        lng: 41.6345,
        description:
          'טיילת ים ארוכה לאורך חוף הים השחור - שדרות דקלים, מזרקות, אופניים והחוף לצידה. כאן גם פסל "עלי ונינו" הנע ומגדל האלפבית. הכי יפה לטיול ערב ולשקיעה.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Batumi+Boulevard',
      },
      {
        id: 'bus-piazza',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Batumi._Piazza_Square.jpg/500px-Batumi._Piazza_Square.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'כיכר פיאצה והעיר העתיקה',
        nameLocal: 'Piazza Square & Old Town',
        category: 'attraction',
        lat: 41.6516,
        lng: 41.6377,
        description:
          'כיכר בסגנון איטלקי עם פסיפסים, מסעדות ובתי קפה, בלב העיר העתיקה של באטומי - סמטאות, מרפסות ואדריכלות אקלקטית. תוססת בערב.',
        rating: 4.3,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Piazza+Square+Batumi',
      },
      {
        id: 'bus-botanical',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Batumi_Botanical_Garden_%2825%29.jpg/500px-Batumi_Botanical_Garden_%2825%29.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'הגן הבוטני של באטומי',
        nameLocal: 'Batumi Botanical Garden',
        category: 'nature',
        lat: 41.6927,
        lng: 41.7198,
        description:
          'גן בוטני ענק ומהיפים באזור, פרוש על מדרונות צוק מעל הים השחור - צמחייה סובטרופית מכל העולם, שבילים ותצפיות ים מרהיבות. כ-20 דקות צפונית לעיר.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Batumi+Botanical+Garden',
      },
      {
        id: 'bus-mtirala',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Mtirala_National_Park%2C_Adjara%2C_Georgia.jpg/500px-Mtirala_National_Park%2C_Adjara%2C_Georgia.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'הפארק הלאומי מטיראלה',
        nameLocal: 'Mtirala National Park',
        category: 'nature',
        lat: 41.6975,
        lng: 41.8895,
        description:
          'יער הגשם הסובטרופי הרטוב ביותר בגאורגיה - מסלולי הליכה ירוקים, גשר תלוי, אגם ומפל שאפשר לשחות בו. עולם אחר לגמרי, כשעה מהחוף.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Mtirala+National+Park',
      },
      {
        id: 'bus-makhuntseti',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Makhuntseti_falls%2C_Adjara%2C_Georgia.jpg/500px-Makhuntseti_falls%2C_Adjara%2C_Georgia.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'מפל מאחונצטי וגשר המלכה תמר',
        nameLocal: 'Makhuntseti Waterfall & Queen Tamar Bridge',
        category: 'nature',
        lat: 41.5749,
        lng: 41.8583,
        description:
          'מפל גבוה ורב-עוצמה בכפרי אדג׳ריה, ולידו גשר אבן קשתי מימי המלכה תמר (המאה ה-12). משתלב עם טעימות יין ודבש מקומיים בדרך. כשעה מבאטומי.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Makhuntseti+Waterfall',
      },
      {
        id: 'bus-gonio',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Gonio-Apsaros_Fortress_Museum%2C_Adjara%2C_Georgia_%283%29.jpg/500px-Gonio-Apsaros_Fortress_Museum%2C_Adjara%2C_Georgia_%283%29.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'מבצר גוניו-אפסארוס',
        nameLocal: 'Gonio-Apsaros Fortress',
        category: 'attraction',
        lat: 41.5733,
        lng: 41.5738,
        description:
          'מבצר רומי-ביזנטי עתיק ליד החוף, דרומית לבאטומי סמוך לגבול טורקיה - חומות מרשימות, אתר חפירות ומוזיאון. משתלב עם חוף שקט יותר באזור.',
        rating: 4.2,
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Gonio+Fortress',
      },
      {
        id: 'bus-mendis',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד באטומי',
        },
        name: 'מנדי׳ס - מסעדת חב"ד הכשרה',
        nameLocal: "Mendi's (Chabad Kosher Restaurant)",
        category: 'kosher-food',
        lat: 41.6495,
        lng: 41.6415,
        description:
          'מסעדה בשרית כשרה של בית חב"ד באטומי בלב העיר העתיקה, עם אוכל גאורגי מסורתי ומטבח בינלאומי. כתובת הכשרות המרכזית בעיר, לצד ארוחות שבת בבית חב"ד.',
        rating: 4.4,
        kosherNote:
          'בשרי, בהשגחת בית חב"ד באטומי. ארוחות שבת בתיאום מראש - כדאי לוודא שעות מול בית חב"ד, במיוחד מחוץ לעונת הקיץ.',
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Mendis+Kosher+Batumi',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'העיר והטיילת',
        placeIds: ['bus-piazza', 'bus-boulevard', 'bus-mendis'],
        notes:
          'בוקר בעיר העתיקה ובכיכר פיאצה, אחר צהריים על טיילת הים (עלי ונינו, מגדל האלפבית, שקיעה), וארוחה כשרה במנדי׳ס של בית חב"ד.',
      },
      {
        day: 2,
        title: 'הגן הבוטני והחוף',
        placeIds: ['bus-botanical'],
        notes:
          'יום ירוק בגן הבוטני הענק על הצוק מעל הים - שבילים, צמחייה סובטרופית ותצפיות. אפשר להשלים בחוף ובטיילת לקראת הערב.',
      },
      {
        day: 3,
        title: 'יער הגשם מטיראלה',
        placeIds: ['bus-mtirala'],
        notes:
          'טיול יום בפארק הלאומי מטיראלה - יער גשם, גשר תלוי, ומפל שאפשר לשחות בו. נעליים טובות ובגד ים; רכב או טיול מאורגן מהעיר.',
      },
      {
        day: 4,
        title: 'כפרי אדג׳ריה - מפל ומבצר',
        placeIds: ['bus-makhuntseti', 'bus-gonio'],
        notes:
          'יום בכפרי אדג׳ריה: מפל מאחונצטי וגשר המלכה תמר עם טעימות יין ודבש, ובחזרה מבצר גוניו העתיק סמוך לחוף.',
      },
    ],
    practical: {
      flights:
        'טיסות ישירות תכופות מנתב"ג לבאטומי (ארקיע, אל על, ג׳ורג׳יאן איירווייז ואחרים) - טיסה של כ-2.5 שעות, בעיקר בעונת הקיץ. חלופה: לטוס לטביליסי ולהמשיך פנימית/ברכבת.',
      gettingAround:
        'העיר עצמה מהלכת (הטיילת, פיאצה, החוף); לאתרי הטבע (מטיראלה, מאחונצטי, הגן הבוטני, גוניו) - רכב שכור, טקסי מסוכם או טיול מאורגן. אין תחבורה ציבורית נוחה אליהם.',
      kosherOverview:
        'בית חב"ד באטומי מפעיל את מסעדת מנדי׳ס הכשרה (בשרי) בעיר העתיקה, ומארח ארוחות שבת. זו תשתית הכשרות המאומתת בעיר - מומלץ לוודא שעות וארוחות שבת מול בית חב"ד מראש, במיוחד מחוץ לעונת הקיץ.',
    },
  },
  {
    slug: 'crete',
    name: 'כרתים',
    nameLocal: 'Crete / Κρήτη',
    countrySlug: 'greece',
    flag: '🇬🇷',
    center: { lat: 35.33, lng: 24.8 },
    zoom: 8,
    tagline: 'נקיקי הליכה, לגונות טורקיז ואגם - האי הגדול של יוון',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Chania_-_Venetian_harbor_2.jpg/500px-Chania_-_Venetian_harbor_2.jpg',
    iconicLandmark: {
      name: 'לגונת באלוס',
      nameLocal: 'Balos Lagoon',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Balos_Lagoon_on_Crete.jpg/500px-Balos_Lagoon_on_Crete.jpg',
      blurb:
        'לגונה רדודה במים טורקיז-לבנים בין הרים וחוף חול, בקצה הצפון-מערבי של כרתים - מהנופים המצולמים ביותר ביוון.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'טיסה ישירה קצרה, ושילוב נדיר של נקיקי הליכה, לגונות טורקיז, חופים ומורשת מינואית - אי שלם של טבע. חסרונות: הטבע הגדול (סמריה, באלוס) דורש מאמץ, שיט ורכב, וחם ועמוס באוגוסט. אין כשרות מסודרת.',
    },
    summary:
      'כרתים היא האי הגדול של יוון ויעד טבע מהמובילים בים התיכון: נקיק סמריה למטיילים, לגונת באלוס וחוף אלפוניסי הוורוד, אגם קורנאס המתוק, ונופי הרים וכפרים - לצד ערי נמל ונציאניות מקסימות והארמון המינואי קנוסוס. טיסה ישירה של פחות משעתיים, אך אין באי תשתית כשרות מסודרת.',
    bestSeason: 'מאי-יוני וספטמבר-אוקטובר (נעים; סמריה פתוח) - יולי-אוגוסט חם ועמוס, החורף סוגר חלק ממסלולי הטבע',
    places: [
      {
        id: 'her-chania',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Chania_-_Venetian_harbor_2.jpg/500px-Chania_-_Venetian_harbor_2.jpg',
        tags: ['history', 'romantic', 'foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'העיר העתיקה של חאניה',
        nameLocal: 'Chania Old Town',
        category: 'attraction',
        lat: 35.5167,
        lng: 24.0167,
        description:
          'עיר הנמל היפה בכרתים - נמל ונציאני עם מגדלור, סמטאות אבן, מסעדות דגים ואווירה. הבסיס הנוח למערב האי ולטיולי הטבע שסביבו.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Chania+Old+Town+Crete',
      },
      {
        id: 'her-samaria',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Samaria_Gorge%2C_Crete_%28150854%29_%289450552265%29.jpg/500px-Samaria_Gorge%2C_Crete_%28150854%29_%289450552265%29.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'נקיק סמריה',
        nameLocal: 'Samaria Gorge',
        category: 'nature',
        lat: 35.2711,
        lng: 23.9614,
        description:
          'אחד מנקיקי ההליכה המפורסמים באירופה - מסלול יורד של כ-16 ק"מ בין קירות סלע ענקיים ("השערים") עד לחוף הים בדרום. יום שלם, נעליים טובות והרבה מים; פתוח בעונה החמה.',
        rating: 4.8,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Samaria+Gorge',
      },
      {
        id: 'her-balos',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Balos_Lagoon_on_Crete.jpg/500px-Balos_Lagoon_on_Crete.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'לגונת באלוס',
        nameLocal: 'Balos Lagoon',
        category: 'nature',
        lat: 35.5883,
        lng: 23.5878,
        description:
          'לגונה רדודה במים טורקיז-לבנים בקצה הצפון-מערבי של האי, בין הרים לחוף. מגיעים בשיט מקיסמוס או בדרך עפר ובהליכה. מהחופים היפים בעולם.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Balos+Lagoon+Crete',
      },
      {
        id: 'her-elafonisi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Elafonisi_pink_sand_beach_-_panoramio.jpg/500px-Elafonisi_pink_sand_beach_-_panoramio.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        name: 'חוף אלפוניסי',
        nameLocal: 'Elafonisi Beach',
        category: 'nature',
        lat: 35.27,
        lng: 23.532,
        description:
          'חוף שמור בקצה הדרום-מערבי, מפורסם בחול הוורדרד ובמים רדודים וצלולים - מושלם למשפחות. עמוס בשיא הקיץ; שווה להקדים.',
        rating: 4.5,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Elafonisi+Beach+Crete',
      },
      {
        id: 'her-kournas',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Lake_Kournas%2C_Chania_Greece.jpg/500px-Lake_Kournas%2C_Chania_Greece.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'אגם קורנאס',
        nameLocal: 'Lake Kournas',
        category: 'nature',
        lat: 35.3308,
        lng: 24.2756,
        description:
          'אגם המים המתוקים היחיד בכרתים, מוקף הרים - מים צלולים בגוונים משתנים, סירות דוושה וצבים. עצירה רגועה בין רתימנו לחאניה.',
        rating: 4.3,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Lake+Kournas',
      },
      {
        id: 'her-rethymno',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Kreta_%28GR%29%2C_Rethymno%2C_Alter_Hafen_--_2023_--_8339.jpg/500px-Kreta_%28GR%29%2C_Rethymno%2C_Alter_Hafen_--_2023_--_8339.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'העיר העתיקה של רתימנו',
        nameLocal: 'Rethymno Old Town',
        category: 'attraction',
        lat: 35.3684,
        lng: 24.4744,
        description:
          'עיר ונציאנית-עות׳מאנית מקסימה עם נמל קטן, מבצר (פורטצה) וסמטאות ציוריות - שקטה ואותנטית יותר מחאניה. במרכז החוף הצפוני.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Rethymno+Old+Town',
      },
      {
        id: 'her-preveli',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Preveli_Palm_Beach_01.JPG/500px-Preveli_Palm_Beach_01.JPG',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'חוף פרוולי ויער הדקלים',
        nameLocal: 'Preveli Palm Beach',
        category: 'nature',
        lat: 35.1525,
        lng: 24.4738,
        description:
          'חוף בקצה נחל שבו נשפך יער דקלים אל הים בדרום האי - אפשר לשוט/לשוח במעלה הנחל בין הדקלים. יורדים אליו בשביל תלול; פראי ומתגמל.',
        rating: 4.5,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Preveli+Beach+Crete',
      },
      {
        id: 'her-knossos',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Knossos_R03.jpg/500px-Knossos_R03.jpg',
        tags: ['history'],
        priceLevel: 2,
        mustSee: true,
        name: 'ארמון קנוסוס',
        nameLocal: 'Knossos',
        category: 'attraction',
        lat: 35.2981,
        lng: 25.1631,
        description:
          'הארמון המינואי הגדול ביותר, בן כ-4,000 שנה, ליד הרקליון - מבוך אולמות משוחזרים, פרסקאות ומיתוס המינוטאור. משלימים עם המוזיאון הארכיאולוגי בהרקליון.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Knossos+Palace',
      },
      {
        id: 'her-spinalonga',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Spinalonga_Island%2C_Crete_1.jpg/500px-Spinalonga_Island%2C_Crete_1.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'האי ספינלונגה',
        nameLocal: 'Spinalonga',
        category: 'attraction',
        lat: 35.2975,
        lng: 25.7381,
        description:
          'אי-מבצר ונציאני במפרץ אלונדה שבמזרח האי, ששימש בעבר מושבת מצורעים - סיור מרתק ומעט קודר, בשיט קצר מפלאקה. משתלב עם מזרח כרתים.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Spinalonga+Crete',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'המערב - חאניה ולגונת באלוס',
        placeIds: ['her-chania', 'her-balos'],
        notes:
          'בוקר בעיר העתיקה של חאניה ובנמל הוונציאני, ושיט/נסיעה אל לגונת באלוס הטורקיז - יום מערב קלאסי. אפשר להחליף את באלוס באלפוניסי לפי מזג הים.',
      },
      {
        day: 2,
        title: 'נקיק סמריה',
        placeIds: ['her-samaria'],
        notes:
          'יום שלם בנקיק סמריה: ירידה של כ-16 ק"מ בין קירות הסלע עד לחוף הדרומי, וחזרה בסירה ואוטובוס. נעליים טובות, כובע והרבה מים; מתאים למי שכשיר להליכה ארוכה.',
      },
      {
        day: 3,
        title: 'המרכז - רתימנו, אגם וחוף דקלים',
        placeIds: ['her-rethymno', 'her-kournas', 'her-preveli'],
        notes:
          'העיר העתיקה של רתימנו, עצירה רגועה באגם קורנאס, ובדרום חוף הדקלים של פרוולי. יום מגוון של עיר, אגם וחוף פראי.',
      },
      {
        day: 4,
        title: 'המרכז-מזרח - קנוסוס והרקליון',
        placeIds: ['her-knossos', 'her-spinalonga'],
        notes:
          'הארמון המינואי קנוסוס והמוזיאון הארכיאולוגי בהרקליון. מי שממשיך מזרחה יכול להוסיף שיט אל האי-מבצר ספינלונגה במפרץ אלונדה.',
      },
    ],
    practical: {
      flights:
        'טיסות ישירות תכופות מנתב"ג להרקליון (HER) - כ-29 בשבוע בעונה (אל על, ישראייר, ארקיע, Aegean, בלו-ברד ועוד), טיסה של כ-1:45 שעות. יש גם קו ישיר לחאניה (CHQ) בתדירות נמוכה יותר.',
      gettingAround:
        'האי גדול והאתרים מפוזרים - רכב שכור כמעט הכרחי (סמריה, באלוס, אלפוניסי, פרוולי). יש אוטובוסים בין הערים הראשיות; ללגונות ולנקיקים - שיט או טיול מאורגן.',
      kosherOverview:
        'אין בכרתים תשתית כשרות מסודרת - אין מסעדות כשרות או בית חב"ד תיירותי פעיל (בחאניה יש בית הכנסת ההיסטורי עץ חיים, כאתר מורשת - לא אוכל כשר). מומלץ להצטייד מראש במזון ארוז עם הכשר; ירקות, פירות, זיתים וגבינות טריים זמינים בשפע בשווקים.',
    },
  },
  {
    slug: 'munich',
    name: 'מינכן והרי בוואריה',
    nameLocal: 'Munich / München',
    countrySlug: 'germany',
    flag: '🇩🇪',
    center: { lat: 47.95, lng: 11.6 },
    zoom: 8,
    tagline: 'עיר בווארית קלאסית - וטירות, נקיקים ואגמי אלפים מסביב',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/3_of_10_-_Lake_Konigssee_Bavaria%2C_GERMANY.jpg/500px-3_of_10_-_Lake_Konigssee_Bavaria%2C_GERMANY.jpg',
    iconicLandmark: {
      name: 'טירת נוישוונשטיין',
      nameLocal: 'Neuschwanstein Castle',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Neuschwanstein_Castle_from_Marienbr%C3%BCcke%2C_2011_May.jpg/500px-Neuschwanstein_Castle_from_Marienbr%C3%BCcke%2C_2011_May.jpg',
      blurb:
        'טירת אגדה על ראש גבעה מיוערת מול האלפים הבוואריים, שבנה המלך לודוויג השני והשראה ל"טירת הנסיכה" של דיסני - הסמל המזוהה ביותר עם בוואריה.',
    },
    editorialRating: {
      score: 4.5,
      verdict:
        'טיסה ישירה, עיר בווארית מקסימה ושער לאלפים - טירות, נקיקים ואגמים ברמה עולמית, ותשתית כשרות אמיתית. חסרונות: אתרי הטבע הם טיולי יום של 1-2 שעות שדורשים רכב, והאזור יקר.',
    },
    summary:
      'מינכן היא בירת בוואריה - עיר מלכותית עם כיכרות, גנים וגני בירה - ובעיקר שער מושלם לאלפים הבוואריים: טירת נוישוונשטיין האגדית, פסגת צוגשפיצה ואגם אייבזה, נקיק פרטנאך ואגם קניגסזה דמוי הפיורד. מינכן היא גם הקהילה היהודית השנייה בגודלה בגרמניה, עם מסעדה כשרה גלאט ובית חב"ד.',
    bestSeason: 'מאי-ספטמבר (אגמים ונקיקים נגישים; אוקטובר - אוקטוברפסט) - חורף מושלג ומצוין לסקי אלפיני',
    places: [
      {
        id: 'muc-marienplatz',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Overview_Marienplatz_Rathaus_Munich.jpg/500px-Overview_Marienplatz_Rathaus_Munich.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'מריאנפלאץ והעיר העתיקה',
        nameLocal: 'Marienplatz & Old Town',
        category: 'attraction',
        lat: 48.1373,
        lng: 11.5755,
        description:
          'הכיכר המרכזית של מינכן, ובה בניין העירייה החדש הניאו-גותי עם הגלוקנשפיל (מופע פעמונים ובובות בצהריים). נקודת מוצא לסמטאות, לשוק ויקטואלין ולגני הבירה.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Marienplatz+Munich',
      },
      {
        id: 'muc-engarten',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Chinese_Tower_-_English_Garden.jpg/500px-Chinese_Tower_-_English_Garden.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        name: 'הגן האנגלי',
        nameLocal: 'Englischer Garten',
        category: 'nature',
        lat: 48.1528,
        lng: 11.5919,
        description:
          'אחד הפארקים העירוניים הגדולים בעולם (גדול מסנטרל פארק), עם אחו, נחלים, מגדל סיני וגן בירה - ובכניסה גולשי גלים על גל נייח בנחל האייסבאך. הריאה הירוקה של מינכן.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Englischer+Garten+Munich',
      },
      {
        id: 'muc-nymphenburg',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Nymphenburg_Palace%2C_Munich%2C_Germany.jpg/500px-Nymphenburg_Palace%2C_Munich%2C_Germany.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 1,
        name: 'ארמון נימפנבורג',
        nameLocal: 'Nymphenburg Palace',
        category: 'attraction',
        lat: 48.1581,
        lng: 11.5036,
        description:
          'ארמון הקיץ הבארוקי של שליטי בוואריה, עם חזית מרשימה, אולמות מפוארים וגנים עצומים עם תעלות וביתני נופש. נעים לשילוב עם טיול רגלי בגנים.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Nymphenburg+Palace',
      },
      {
        id: 'muc-neuschwanstein',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Neuschwanstein_Castle_from_Marienbr%C3%BCcke%2C_2011_May.jpg/500px-Neuschwanstein_Castle_from_Marienbr%C3%BCcke%2C_2011_May.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'טירת נוישוונשטיין',
        nameLocal: 'Neuschwanstein Castle',
        category: 'attraction',
        lat: 47.5575,
        lng: 10.7494,
        description:
          'טירת האגדה של המלך לודוויג השני על צוק מיוער מול האלפים - התצפית מגשר מרי (Marienbrücke) היא הזווית המפורסמת. כרטיסים מראש; כ-1.5 שעות ממינכן.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Neuschwanstein+Castle',
      },
      {
        id: 'muc-zugspitze',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Lake_Eibsee_and_Zugspitze.jpg/500px-Lake_Eibsee_and_Zugspitze.jpg',
        tags: ['outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'צוגשפיצה ואגם אייבזה',
        nameLocal: 'Zugspitze & Eibsee',
        category: 'nature',
        lat: 47.4578,
        lng: 10.9731,
        description:
          'הפסגה הגבוהה בגרמניה (2,962 מ׳), ואליה עולים ברכבל או ברכבת שיניים - נוף אלפיני של 360 מעלות ושלג גם בקיץ. למרגלותיה אגם אייבזה הטורקיז, ששביל מקיף אותו.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Zugspitze+Eibsee',
      },
      {
        id: 'muc-partnach',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/20230608_Partnachklamm_08.jpg/500px-20230608_Partnachklamm_08.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'נקיק פרטנאך',
        nameLocal: 'Partnach Gorge',
        category: 'nature',
        lat: 47.4692,
        lng: 11.1186,
        description:
          'נקיק סלע דרמטי ליד גרמיש, שבו שביל חצוב עובר צמוד לנהר הגועש בין קירות גבוהים ומפלים. הליכה קצרה ומרשימה, משתלבת עם יום צוגשפיצה/נוישוונשטיין.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Partnachklamm',
      },
      {
        id: 'muc-konigssee',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/3_of_10_-_Lake_Konigssee_Bavaria%2C_GERMANY.jpg/500px-3_of_10_-_Lake_Konigssee_Bavaria%2C_GERMANY.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'אגם קניגסזה',
        nameLocal: 'Königssee',
        category: 'nature',
        lat: 47.5551,
        lng: 12.9766,
        description:
          'אגם צלול ועמוק דמוי פיורד בין צוקים תלולים, בפארק הלאומי ברכטסגאדן - שיט בסירות חשמליות שקטות אל כנסיית סנט ברתולומיאו האדומה. מהאגמים היפים באירופה. כ-2 שעות ממינכן.',
        rating: 4.8,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Konigssee',
      },
      {
        id: 'muc-einstein',
        tags: ['foodie'],
        priceLevel: 2,
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'הקהילה היהודית של מינכן (גלאט כשר)',
        },
        name: 'מסעדת איינשטיין (כשרה)',
        nameLocal: 'Restaurant Einstein',
        category: 'kosher-food',
        lat: 48.1345,
        lng: 11.572,
        description:
          'מסעדה גלאט-כשרה במרכז הקהילתי היהודי בכיכר סנט יעקב, במרחק הליכה ממריאנפלאץ - המסעדה הכשרה המרכזית של מינכן. יש מעבר ביטחוני בכניסה; מומלץ להזמין מקום מראש.',
        rating: 4.5,
        kosherNote:
          'גלאט כשר בהשגחת הקהילה היהודית של מינכן. כניסה דרך שער ביטחוני; שעות משתנות ומומלץ להזמין מראש. בעיר יש גם בית חב"ד ומספר נקודות כשרות נוספות.',
        durationMin: 75,
        externalUrl: 'https://maps.google.com/?q=Restaurant+Einstein+Munich',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'מינכן - העיר',
        placeIds: ['muc-marienplatz', 'muc-engarten', 'muc-nymphenburg', 'muc-einstein'],
        notes:
          'יום עירוני: מריאנפלאץ והגלוקנשפיל, שוק ויקטואלין, הגן האנגלי (גולשי הגל!) וארמון נימפנבורג. ארוחה כשרה במסעדת איינשטיין במרכז הקהילתי.',
      },
      {
        day: 2,
        title: 'טירת נוישוונשטיין ונקיק פרטנאך',
        placeIds: ['muc-neuschwanstein', 'muc-partnach'],
        notes:
          'בוקר בטירת נוישוונשטיין (כרטיסים מראש, תצפית מגשר מרי), ובדרך חזרה דרך גרמיש - נקיק פרטנאך הדרמטי. יום אלפיני קלאסי, רכב מומלץ.',
      },
      {
        day: 3,
        title: 'צוגשפיצה ואגם אייבזה',
        placeIds: ['muc-zugspitze'],
        notes:
          'עולים ברכבת השיניים/רכבל אל פסגת צוגשפיצה, הגבוהה בגרמניה - נוף אלפים ושלג גם בקיץ - ולמטה הקפת אגם אייבזה הטורקיז. בגדים חמים גם בקיץ.',
      },
      {
        day: 4,
        title: 'אגם קניגסזה - ברכטסגאדן',
        placeIds: ['muc-konigssee'],
        notes:
          'טיול יום דרום-מזרחה אל אגם קניגסזה: שיט שקט בין הצוקים אל כנסיית סנט ברתולומיאו, ומסלולי הליכה סביב. אפשר לשלב עם ברכטסגאדן והסביבה.',
      },
    ],
    practical: {
      flights:
        'טיסות ישירות מנתב"ג למינכן (MUC) כל השנה (אל על, לופטהנזה ואחרים), טיסה של כ-3.5 שעות - שדה תעופה גדול ומחובר, שער נוח לכל דרום גרמניה.',
      gettingAround:
        'בעיר: מטרו (U-Bahn) ורכבת קלה (S-Bahn) מצוינות. לאלפים (נוישוונשטיין, צוגשפיצה, קניגסזה) - רכב שכור נוח בהרבה, אם כי חלק מהאתרים נגישים גם ברכבת + אוטובוס או בטיול מאורגן.',
      kosherOverview:
        'למינכן, הקהילה היהודית השנייה בגודלה בגרמניה, תשתית כשרות אמיתית: מסעדת איינשטיין הגלאט-כשרה במרכז הקהילתי, בית חב"ד, וכמה נקודות כשרות נוספות. מומלץ להזמין מקום מראש ולוודא שעות (יש מעבר ביטחוני בכניסה למרכז הקהילתי).',
    },
  },
  {
    slug: 'dolomites',
    name: 'הדולומיטים',
    nameLocal: 'Dolomites / Dolomiti',
    countrySlug: 'italy',
    flag: '🇮🇹',
    center: { lat: 46.55, lng: 11.9 },
    zoom: 9,
    tagline: 'אגמי אלפים טורקיז, פסגות סלע ומסלולי הליכה - צפון איטליה',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Lago_di_Braies_South_Tyrol_3.jpg/500px-Lago_di_Braies_South_Tyrol_3.jpg',
    iconicLandmark: {
      name: 'שלוש הפסגות (טרה צ׳ימה)',
      nameLocal: 'Tre Cime di Lavaredo',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Drei_Zinnen_Tre_Cime_di_Lavaredo_Dolomites.jpg/500px-Drei_Zinnen_Tre_Cime_di_Lavaredo_Dolomites.jpg',
      blurb:
        'שלושה צריחי סלע מונומנטליים שהם הסמל של הדולומיטים - מסלול ההיקף סביבם הוא מהטיולים המפורסמים באלפים.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'טבע אלפיני ברמה עולמית - אגמי טורקיז, פסגות סלע דרמטיות ומסלולי הליכה אינסופיים, במרחק נסיעה מוונציה. חסרונות: אין שדה תעופה מקומי (2-3 שעות נסיעה), רכב הכרחי, עונתי מאוד, ואין כשרות בהרים.',
    },
    summary:
      'הדולומיטים הם רכס האלפים הדרומי בצפון איטליה, אתר מורשת עולמית - עולם של פסגות סלע ורודות, אחו ירוק ואגמים בצבע טורקיז בלתי נתפס. יעד חלומי למטיילים ולחובבי נוף: אגם בראייס, שלוש הפסגות, אלפה די סיוזי ועמק פונס. מגיעים בטיסה לוונציה/ורונה ובנסיעה; אין באזור ההררי תשתית כשרות.',
    bestSeason: 'יוני-ספטמבר (הליכות ואגמים בשיא) - דצמבר-מרץ עונת סקי; אביב וסתיו חלק מהמסלולים והרכבלים סגורים',
    places: [
      {
        id: 'dol-braies',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Lago_di_Braies_South_Tyrol_3.jpg/500px-Lago_di_Braies_South_Tyrol_3.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'אגם בראייס',
        nameLocal: 'Lago di Braies (Pragser Wildsee)',
        category: 'nature',
        lat: 46.6947,
        lng: 12.0844,
        description:
          'אגם קרחוני ירוק-אמרלד מוקף צוקי דולומיט ויער, עם סירות עץ להשכרה ושביל קל שמקיף אותו (כ-3.5 ק"מ). מהנופים המצולמים באיטליה - להגיע מוקדם, מתמלא בקהל.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Lago+di+Braies',
      },
      {
        id: 'dol-trecime',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Drei_Zinnen_Tre_Cime_di_Lavaredo_Dolomites.jpg/500px-Drei_Zinnen_Tre_Cime_di_Lavaredo_Dolomites.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'שלוש הפסגות (טרה צ׳ימה)',
        nameLocal: 'Tre Cime di Lavaredo',
        category: 'nature',
        lat: 46.6167,
        lng: 12.3,
        description:
          'שלושת צריחי הסלע המזוהים ביותר עם הדולומיטים. מסלול ההיקף (כ-10 ק"מ) הוא מהטיולים היפים באלפים, עם בקתות הרים בדרך. מגיעים בכביש אגרה עד רפוג׳ו אאורונצו.',
        rating: 4.8,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Tre+Cime+di+Lavaredo',
      },
      {
        id: 'dol-sorapis',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Sorapis_061.jpg/500px-Sorapis_061.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'אגם סוראפיס',
        nameLocal: 'Lago di Sorapis',
        category: 'nature',
        lat: 46.5206,
        lng: 12.2235,
        description:
          'אגם הררי בצבע חלבי-טורקיז מסחרר, בקצה מסלול הליכה מאתגר (כ-3 שעות הלוך) ליד קורטינה. הפרס בסוף השביל מהיפים בדולומיטים - למטיילים כשירים בלבד.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Lago+di+Sorapis',
      },
      {
        id: 'dol-seiseralm',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Seiser_Alm_01.jpg/500px-Seiser_Alm_01.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'אלפה די סיוזי',
        nameLocal: 'Alpe di Siusi (Seiser Alm)',
        category: 'nature',
        lat: 46.5369,
        lng: 11.6667,
        description:
          'האחו האלפיני הגבוה הגדול באירופה - מרחבי דשא מתגלגלים על רקע פסגות הסלה והשלרן. שבילי הליכה קלים ורכבלים; נגיש ומתאים גם למשפחות. מעל ורדיה/סיוזי.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Alpe+di+Siusi',
      },
      {
        id: 'dol-funes',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Santa_Maddalena_Chapel_and_Dolomites.jpg/500px-Santa_Maddalena_Chapel_and_Dolomites.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        name: 'עמק פונס וכנסיית סנטה מדלנה',
        nameLocal: 'Val di Funes & Santa Maddalena',
        category: 'nature',
        lat: 46.6415,
        lng: 11.7001,
        description:
          'עמק ירוק פסטורלי עם כנסייה קטנה על גבעה, על רקע צריחי הסלע של רכס האודלה - אחת התמונות המושלמות של הדולומיטים. שבילי הליכה נעימים סביב הכפרים.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Santa+Maddalena+Val+di+Funes',
      },
      {
        id: 'dol-carezza',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Lago_di_Carezza_e_Latemar.jpg/500px-Lago_di_Carezza_e_Latemar.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'אגם קרצה',
        nameLocal: 'Lago di Carezza',
        category: 'nature',
        lat: 46.4093,
        lng: 11.5759,
        description:
          'אגם קטן ומהופנט שצבעיו משתנים בין ירוק לכחול-סגול, על רקע רכס הלטמאר - "אגם הקשת בענן" של האגדה המקומית. עצירה קצרה ומתגמלת בדרום הדולומיטים.',
        rating: 4.5,
        durationMin: 45,
        externalUrl: 'https://maps.google.com/?q=Lago+di+Carezza',
      },
      {
        id: 'dol-cortina',
        tags: ['outdoors', 'foodie'],
        priceLevel: 3,
        name: 'קורטינה ד׳אמפצו',
        nameLocal: "Cortina d'Ampezzo",
        category: 'attraction',
        lat: 46.5403,
        lng: 12.1361,
        description:
          'עיירת הנופש היוקרתית של הדולומיטים ("פנינת הדולומיטים"), מוקפת פסגות - בסיס נוח לטיולים, עם רחוב ראשי, בתי קפה ורכבלים. אירחה אולימפיאדות חורף.',
        rating: 4.4,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Cortina+d%27Ampezzo',
      },
      {
        id: 'dol-bolzano',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Piazza_Municipio_Bolzano.jpg/500px-Piazza_Municipio_Bolzano.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'בולצאנו ומוזיאון אצי',
        nameLocal: 'Bolzano & Ötzi Museum',
        category: 'attraction',
        lat: 46.5,
        lng: 11.35,
        description:
          'בירת דרום טירול, מפגש של תרבות איטלקית ואוסטרית - כיכרות, שוק ומרפסות. במוזיאון הארכיאולוגי שוכן "אצי", איש הקרח בן 5,300 השנה שנמצא בהרים. שער דרומי לדולומיטים.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Bolzano+Otzi+Museum',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'הצפון - בראייס ושלוש הפסגות',
        placeIds: ['dol-braies', 'dol-trecime'],
        notes:
          'בוקר מוקדם באגם בראייס (לפני הקהל), ואחר צהריים מסלול ההיקף סביב שלוש הפסגות - שני האייקונים של הדולומיטים ביום אחד. נעליים טובות ובגדים לשכבות.',
      },
      {
        day: 2,
        title: 'ואל גרדנה - אחו ופסגות',
        placeIds: ['dol-seiseralm', 'dol-funes'],
        notes:
          'האחו האלפיני אלפה די סיוזי (רכבל למעלה, הליכות קלות), ובהמשך עמק פונס וכנסיית סנטה מדלנה על רקע רכס האודלה - יום נופים רך ומתגמל.',
      },
      {
        day: 3,
        title: 'אמפצו - אגם סוראפיס',
        placeIds: ['dol-sorapis', 'dol-cortina'],
        notes:
          'מסלול ההליכה אל אגם סוראפיס הטורקיז (מאתגר, כ-6 שעות הלוך-חזור), וארוחה/מנוחה בקורטינה ד׳אמפצו. למי שמעדיף קל יותר - מסלולים סביב קורטינה.',
      },
      {
        day: 4,
        title: 'הדרום - אגם קרצה ובולצאנו',
        placeIds: ['dol-carezza', 'dol-bolzano'],
        notes:
          'עצירה באגם קרצה הצבעוני, וסיום בבולצאנו - העיר, השוק ומוזיאון אצי (איש הקרח). נוח לשלב בדרך חזרה דרומה אל ורונה/ונציה.',
      },
    ],
    practical: {
      flights:
        'אין שדה תעופה בדולומיטים עצמם. טסים ישירות מנתב"ג לוונציה (VCE) או לוורונה/מילאנו, וממשיכים ברכב כ-2-2.5 שעות אל לב ההרים. רכב שכור הוא כמעט תנאי לטיול באזור.',
      gettingAround:
        'רכב שכור הכרחי - האתרים מפוזרים על פני עמקים והכבישים ההרריים מפותלים ויפים. בעונה יש גם רכבלים ואוטובוסי הרים (חלקם עם כרטיס אזורי), אך הגמישות עם רכב עדיפה בהרבה.',
      kosherOverview:
        'אין בדולומיטים תשתית כשרות - אין מסעדות כשרות או בית חב"ד באזור ההררי. הקהילות והכשרות הקרובות הן בערי השער (ונציה, מילאנו). מומלץ להצטייד מראש במזון ארוז עם הכשר, או לבחור לינה עם מטבח; גבינות, פירות וירקות טריים זמינים בשפע בשווקים.',
    },
  },
  {
    slug: 'salzburg',
    name: 'זלצבורג ואזור האגמים',
    nameLocal: 'Salzburg / Salzburg',
    countrySlug: 'austria',
    flag: '🇦🇹',
    center: { lat: 47.6, lng: 13.15 },
    zoom: 8,
    tagline: 'עיר מוצרט, כפרי אגמים ומפלים אלפיניים - זלצקמרגוט',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Old_Town_Salzburg_across_the_Salzach_river.jpg/500px-Old_Town_Salzburg_across_the_Salzach_river.jpg',
    iconicLandmark: {
      name: 'הלשטאט',
      nameLocal: 'Hallstatt',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Panoramic_view_of_Hallstatt_village_and_shoreline_from_lake.jpg/500px-Panoramic_view_of_Hallstatt_village_and_shoreline_from_lake.jpg',
      blurb:
        'כפר אגם ציורי דחוס בין הר לאגם, עם בתי עץ ומגדל כנסייה משתקפים במים - מהמקומות המצולמים באוסטריה ואתר מורשת עולמית.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'צירוף מנצח: עיר בארוקית מקסימה (מוצרט, "צלילי המוזיקה") ואזור אגמים והרים ברמה עולמית. חסרונות: אין טיסה ישירה לזלצבורג (טסים לווינה/מינכן ונוסעים), עונתי, ואין כשרות מסודרת באזור.',
    },
    summary:
      'זלצבורג היא פנינה בארוקית - עיר הולדתו של מוצרט, עם עיר עתיקה מוקפת הרים ומבצר על צוק. סביבה משתרע הזלצקמרגוט, אזור האגמים והרים של אוסטריה: כפר האגם הלשטאט, אגמי וולפגנג וגוזאו, ומפלי קרימל האדירים. מגיעים בטיסה לווינה/מינכן ובנסיעה; אין באזור תשתית כשרות (בווינה יש מלאה).',
    bestSeason: 'מאי-ספטמבר (אגמים והרים בשיא) - דצמבר לשווקי חג המולד; חלק ממסלולי ההרים סגורים בחורף',
    places: [
      {
        id: 'szg-oldtown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Old_Town_Salzburg_across_the_Salzach_river.jpg/500px-Old_Town_Salzburg_across_the_Salzach_river.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        mustSee: true,
        name: 'העיר העתיקה של זלצבורג',
        nameLocal: 'Salzburg Old Town',
        category: 'attraction',
        lat: 47.8,
        lng: 13.0422,
        description:
          'עיר עתיקה בארוקית ואתר מורשת עולמית - רחוב גטריידה גאסה עם שלטי הברזל, בית הולדתו של מוצרט, כיכרות וקתדרלה. הכול מוקף הרים ומעליו מבצר הוהנזלצבורג.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Salzburg+Old+Town',
      },
      {
        id: 'szg-fortress',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Salzburg_-_Festung_Hohensalzburg.JPG/500px-Salzburg_-_Festung_Hohensalzburg.JPG',
        tags: ['history'],
        priceLevel: 2,
        name: 'מבצר הוהנזלצבורג',
        nameLocal: 'Hohensalzburg Fortress',
        category: 'viewpoint',
        lat: 47.795,
        lng: 13.0472,
        description:
          'אחד המבצרים הגדולים והמשומרים באירופה, על הגבעה מעל העיר - עולים ברכבל, מסיירים באולמות ונהנים מהתצפית הטובה ביותר על זלצבורג וההרים.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Hohensalzburg+Fortress',
      },
      {
        id: 'szg-mirabell',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Mirabell_Palace_1.jpg/500px-Mirabell_Palace_1.jpg',
        tags: ['romantic', 'families'],
        priceLevel: 0,
        name: 'ארמון וגני מירבל',
        nameLocal: 'Mirabell Palace & Gardens',
        category: 'attraction',
        lat: 47.8056,
        lng: 13.0419,
        description:
          'ארמון וגנים בארוקיים מטופחים עם מזרקות, פסלים ופרחים - ומקום צילום מ"צלילי המוזיקה". כניסה חינם לגנים, נוף יפה אל המבצר.',
        rating: 4.5,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Mirabell+Gardens+Salzburg',
      },
      {
        id: 'szg-hallstatt',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Panoramic_view_of_Hallstatt_village_and_shoreline_from_lake.jpg/500px-Panoramic_view_of_Hallstatt_village_and_shoreline_from_lake.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'הלשטאט',
        nameLocal: 'Hallstatt',
        category: 'nature',
        lat: 47.562,
        lng: 13.649,
        description:
          'כפר אגם אגדי בין הר תלול לאגם, עם בתי עץ צרים, מגדל כנסייה ומכרה מלח עתיק בהר עם תצפית ("Skywalk"). מגיעים מוקדם - מהמקומות העמוסים באוסטריה. כשעה מזלצבורג.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Hallstatt',
      },
      {
        id: 'szg-wolfgangsee',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Wolfgangsee-Landscape.jpg/500px-Wolfgangsee-Landscape.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'אגם וולפגנג',
        nameLocal: 'Wolfgangsee',
        category: 'nature',
        lat: 47.7369,
        lng: 13.4528,
        description:
          'אגם צלול ונעים בלב הזלצקמרגוט, עם הכפרים סנט וולפגנג וסנט גילגן, שיט בסירות ורכבת שיניים אל פסגת שאפברג לתצפית על אגמים. אידילי וקל למשפחות.',
        rating: 4.5,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Wolfgangsee',
      },
      {
        id: 'szg-gosausee',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Gosausee_Dachstein_July_2012.jpg/500px-Gosausee_Dachstein_July_2012.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'אגם גוזאו',
        nameLocal: 'Gosausee',
        category: 'nature',
        lat: 47.5332,
        lng: 13.4968,
        description:
          'אגם הררי שקט שמשקף את קרחון הדכשטיין המושלג - שביל קל ומהמם מקיף אותו (כ-1.5 שעות). פחות מתויר מהלשטאט הסמוך, ולא פחות יפה.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Gosausee',
      },
      {
        id: 'szg-krimml',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Krimml_Waterfalls%2C_2014_%2802%29.JPG/500px-Krimml_Waterfalls%2C_2014_%2802%29.JPG',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'מפלי קרימל',
        nameLocal: 'Krimml Waterfalls',
        category: 'nature',
        lat: 47.1981,
        lng: 12.1714,
        description:
          'המפלים הגבוהים באוסטריה (כ-380 מ׳ בשלושה מפלים), בפארק הלאומי הוהה טאוארן - שביל עולה בין תצפיות אל בסיס המפל, בין רסיסי מים וקשתות. כשעה-וחצי מזלצבורג.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Krimml+Waterfalls',
      },
      {
        id: 'szg-zell',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Schmittenh%C3%B6he%2C_Zell_am_See.JPG/500px-Schmittenh%C3%B6he%2C_Zell_am_See.JPG',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'צל אם זה',
        nameLocal: 'Zell am See',
        category: 'nature',
        lat: 47.3167,
        lng: 12.8,
        description:
          'עיירת נופש על אגם צל, מוקפת פסגות - טיילת אגם, שיט, ורכבל אל פסגת שמיטנהוהה לתצפית אלפינית. בסיס נוח לאזור הוהה טאוארן ולמפלי קרימל.',
        rating: 4.4,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Zell+am+See',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'זלצבורג - העיר',
        placeIds: ['szg-oldtown', 'szg-fortress', 'szg-mirabell'],
        notes:
          'יום בעיר: העיר העתיקה ורחוב גטריידה גאסה, בית מוצרט, עלייה ברכבל למבצר הוהנזלצבורג לתצפית, וגני מירבל. הכול במרחק הליכה.',
      },
      {
        day: 2,
        title: 'זלצקמרגוט - הלשטאט וגוזאו',
        placeIds: ['szg-hallstatt', 'szg-gosausee'],
        notes:
          'בוקר מוקדם בהלשטאט (לפני הקהל), ואחר צהריים הקפת אגם גוזאו השקט מול הדכשטיין - יום אגמים קלאסי בלב אזור האגמים.',
      },
      {
        day: 3,
        title: 'אגם וולפגנג ושאפברג',
        placeIds: ['szg-wolfgangsee'],
        notes:
          'יום רגוע סביב אגם וולפגנג: הכפרים סנט וולפגנג וסנט גילגן, שיט על האגם, ורכבת שיניים אל פסגת שאפברג לתצפית על שרשרת האגמים.',
      },
      {
        day: 4,
        title: 'הוהה טאוארן - מפלי קרימל וצל אם זה',
        placeIds: ['szg-krimml', 'szg-zell'],
        notes:
          'שביל מפלי קרימל האדירים בפארק הלאומי, ומנוחה על אגם צל אם זה עם רכבל לתצפית. יום הרים ומים בדרום המחוז.',
      },
    ],
    practical: {
      flights:
        'אין קו ישיר יציב מנתב"ג לזלצבורג. הנוח ביותר: לטוס לווינה (VIE) או למינכן (MUC) - שתיהן עם טיסות ישירות - ולהמשיך ברכב/רכבת (כ-1.5-2 שעות ממינכן, כ-3 שעות מווינה).',
      gettingAround:
        'בזלצבורג העיר הכול מהלך; לזלצקמרגוט ולהרים (הלשטאט, וולפגנג, קרימל) - רכב שכור נוח בהרבה, אם כי יש גם רכבות ואוטובוסים אזוריים אל חלק מהאגמים.',
      kosherOverview:
        'אין בזלצבורג ובאזור האגמים תשתית כשרות מסודרת - אין מסעדה כשרה או בית חב"ד תיירותי פעיל. הכשרות המלאה הקרובה היא בווינה. מומלץ להצטייד מראש במזון ארוז עם הכשר או לבחור לינה עם מטבח; גבינות, פירות וירקות טריים זמינים בשפע.',
    },
  },
  {
    slug: 'mallorca',
    name: 'מיורקה',
    nameLocal: 'Mallorca / Mallorca',
    countrySlug: 'spain',
    flag: '🇪🇸',
    center: { lat: 39.65, lng: 2.95 },
    zoom: 9,
    tagline: 'הרי טרמונטנה, מפרצי טורקיז וכפרי אבן - אי הים התיכון',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mallorca_Cala_de_Sa_Calobra_asv2023-04_img4.jpg/500px-Mallorca_Cala_de_Sa_Calobra_asv2023-04_img4.jpg',
    iconicLandmark: {
      name: 'קתדרלת פלמה (לה סאו)',
      nameLocal: 'Palma Cathedral (La Seu)',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Palma_Cathedral_%28La_Seu%29_from_Parc_de_la_Mar.jpg/500px-Palma_Cathedral_%28La_Seu%29_from_Parc_de_la_Mar.jpg',
      blurb:
        'קתדרלה גותית עצומה על שפת הים בפלמה, עם חלון ורד ענק ונגיעות של גאודי - הסמל של מיורקה, משתקפת באגם שמולה.',
    },
    editorialRating: {
      score: 4.4,
      verdict:
        'טיסה ישירה בקיץ, ושילוב של הרי טרמונטנה למטיילים, מפרצים טורקיז וכפרי אבן מקסימים. חסרונות: הקו הישיר עונתי בלבד (יולי-אוקטובר), עמוס מאוד בשיא הקיץ, ואין באי תשתית כשרות.',
    },
    summary:
      'מיורקה, הגדול באיי הבלארים, הוא הרבה יותר מחופים: רכס הרי טרמונטנה (אתר מורשת עולמית) עם מסלולי הליכה וכפרי אבן, מפרצים חצובים במים טורקיז כמו סה קלוברה, צוקי כף פורמנטור ומערות תת-קרקעיות עם אגם. פלמה הבירה מציעה קתדרלה גותית ועיר עתיקה. טיסה ישירה בקיץ; אין באי תשתית כשרות מסודרת.',
    bestSeason: 'מאי-יוני וספטמבר-אוקטובר (נעים, פחות עמוס; הקו הישיר בקיץ) - יולי-אוגוסט חם ומלא',
    places: [
      {
        id: 'pmi-palma',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Palma_Cathedral_%28La_Seu%29_from_Parc_de_la_Mar.jpg/500px-Palma_Cathedral_%28La_Seu%29_from_Parc_de_la_Mar.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 2,
        mustSee: true,
        name: 'פלמה - הקתדרלה והעיר העתיקה',
        nameLocal: 'Palma & La Seu Cathedral',
        category: 'attraction',
        lat: 39.5674,
        lng: 2.6481,
        description:
          'בירת האי - קתדרלה גותית מרהיבה על שפת הים (עם התערבות של גאודי), סמטאות אבן, פטיו פנימיים ושוק. נעים לטיול רגלי ולארוחת ערב בעיר העתיקה.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Palma+Cathedral+La+Seu',
      },
      {
        id: 'pmi-tramuntana',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Serra_de_Tramuntana%2C_Mallorca.jpg/500px-Serra_de_Tramuntana%2C_Mallorca.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'הרי טרמונטנה',
        nameLocal: 'Serra de Tramuntana',
        category: 'nature',
        lat: 39.7308,
        lng: 2.6947,
        description:
          'רכס ההרים לאורך החוף הצפון-מערבי, אתר מורשת עולמית - מסלולי הליכה בין מדרגות אבן, מטעי זיתים וכפרים, ותצפיות ים מרהיבות. לב הטבע של מיורקה.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Serra+de+Tramuntana',
      },
      {
        id: 'pmi-sacalobra',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Mallorca_Cala_de_Sa_Calobra_asv2023-04_img4.jpg/500px-Mallorca_Cala_de_Sa_Calobra_asv2023-04_img4.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'סה קלוברה וטורנט דה פארייס',
        nameLocal: 'Sa Calobra & Torrent de Pareis',
        category: 'nature',
        lat: 39.8436,
        lng: 2.7925,
        description:
          'מפרץ חלוקים במים טורקיז בין צוקי הרים, בקצה נחל הקניון טורנט דה פארייס. מגיעים בכביש הררי מפותל מפורסם או בשיט מפורט דה סולר - מהמקומות הדרמטיים באי.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Sa+Calobra',
      },
      {
        id: 'pmi-formentor',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Cap_Formentor_2015_%28Zuschnitt%29.jpg/500px-Cap_Formentor_2015_%28Zuschnitt%29.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        name: 'כף פורמנטור',
        nameLocal: 'Cap de Formentor',
        category: 'viewpoint',
        lat: 39.9472,
        lng: 3.1808,
        description:
          'הקצה הצפוני של האי - צוקים תלולים הצוללים לים, מגדלור בקצה ותצפיות עוצרות נשימה לאורך כביש מפותל. מרהיב במיוחד בזריחה ובשקיעה.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Cap+de+Formentor',
      },
      {
        id: 'pmi-valldemossa',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Valldemossa_view.jpg/500px-Valldemossa_view.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 1,
        name: 'ואלדמוסה',
        nameLocal: 'Valldemossa',
        category: 'attraction',
        lat: 39.7117,
        lng: 2.6226,
        description:
          'כפר אבן ציורי בהרי טרמונטנה, שבו שהו שופן וז׳ורז׳ סאנד - סמטאות פרחים, מנזר וקפה עם מאפה קוקה מקומי. אחד הכפרים היפים באי.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Valldemossa',
      },
      {
        id: 'pmi-soller',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Mallorca_Soller_Tram_%2724%27_1605_04_%2853177082159%29.jpg/500px-Mallorca_Soller_Tram_%2724%27_1605_04_%2853177082159%29.jpg',
        tags: ['families', 'history'],
        priceLevel: 1,
        name: 'סולר והחשמלית',
        nameLocal: 'Sóller',
        category: 'attraction',
        lat: 39.7676,
        lng: 2.714,
        description:
          'עיירה בעמק הדרים בהרי טרמונטנה, מחוברת לפלמה ברכבת עץ עתיקה דרך ההרים, ולנמל בחשמלית וינטג׳. כיכר יפה, מיצי תפוזים טריים ואווירה נינוחה.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Soller+Mallorca',
      },
      {
        id: 'pmi-drac',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Boat_on_Martel_Lake_Coves_del_Drac_Mallorca.jpg/500px-Boat_on_Martel_Lake_Coves_del_Drac_Mallorca.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 2,
        name: 'מערות הדרקון (קובס דל דרק)',
        nameLocal: 'Coves del Drac',
        category: 'nature',
        lat: 39.5368,
        lng: 3.3301,
        description:
          'מערכת מערות מרשימה בפורטו כריסטו שבמזרח, ובתוכה אחד האגמים התת-קרקעיים הגדולים בעולם - עם מופע מוזיקה חיה על סירות. קריר ומרהיב, טוב למשפחות.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Coves+del+Drac',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'פלמה - הבירה',
        placeIds: ['pmi-palma'],
        notes:
          'יום בפלמה: קתדרלת לה סאו על הים, העיר העתיקה, המצודה והשוק. נעים לסיים בארוחה ובטיילת. בסיס נוח להמשך הטיול באי.',
      },
      {
        day: 2,
        title: 'טרמונטנה - כפרים והרים',
        placeIds: ['pmi-valldemossa', 'pmi-soller', 'pmi-tramuntana'],
        notes:
          'יום בהרי טרמונטנה: הכפר ואלדמוסה, סולר עם החשמלית והרכבת העתיקה, ומסלול הליכה קצר עם תצפית ים. נופים וכפרי אבן לאורך כל הדרך.',
      },
      {
        day: 3,
        title: 'הצפון - סה קלוברה וכף פורמנטור',
        placeIds: ['pmi-sacalobra', 'pmi-formentor'],
        notes:
          'מפרץ סה קלוברה הטורקיז (כביש מפותל או שיט), וצוקי כף פורמנטור בקצה הצפוני עם המגדלור. יום נופי מים וסלע מרהיב.',
      },
      {
        day: 4,
        title: 'המזרח - מערות הדרקון',
        placeIds: ['pmi-drac'],
        notes:
          'טיול במערות הדרקון עם האגם התת-קרקעי ומופע המוזיקה, ומפרצים וחופים באזור המזרחי בהמשך היום. סיום רגוע לפני החזרה.',
      },
    ],
    practical: {
      flights:
        'ישראייר מפעילה טיסה ישירה מנתב"ג לפלמה (PMI) - אך עונתית בלבד (כ-יולי-אוקטובר), טיסה של כ-4.5 שעות. מחוץ לעונה טסים דרך ברצלונה/מדריד עם קו פנימי קצר.',
      gettingAround:
        'רכב שכור נוח ביותר לטבע (טרמונטנה, פורמנטור, סה קלוברה, מערות). יש גם רכבת עתיקה לסולר, חשמלית ואוטובוסים בין הערים הראשיות; לפלמה עצמה אין צורך ברכב.',
      kosherOverview:
        'אין במיורקה תשתית כשרות מסודרת - אין מסעדה כשרה או בית חב"ד תיירותי פעיל (בפלמה יש מורשת יהודית עתיקה - הרובע היהודי "אל קאל" והצֶ׳אֶטֶס - אך לא אוכל כשר). הכשרות הקרובה היא בברצלונה/מדריד. מומלץ להצטייד מראש; פירות, ירקות ודגים טריים זמינים בשפע.',
    },
  },
  {
    slug: 'interlaken',
    name: 'אינטרלאקן ועמק היונגפראו',
    nameLocal: 'Interlaken & Jungfrau Region',
    countrySlug: 'switzerland',
    flag: '🇨🇭',
    center: { lat: 46.63, lng: 7.93 },
    zoom: 10,
    tagline: 'בין שני אגמים: מפלים, קרחונים ורכבת אל גג אירופה',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/1_lauterbrunnen_valley_wengen_2022.jpg/500px-1_lauterbrunnen_valley_wengen_2022.jpg',
    iconicLandmark: {
      name: 'יונגפראויוך - גג אירופה',
      nameLocal: 'Jungfraujoch',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Sphinx_et_Jungfrau_-_img_06980.jpg/500px-Sphinx_et_Jungfrau_-_img_06980.jpg',
      blurb:
        'האוכף שבין פסגות המונק והיונגפראו בגובה 3,454 מ׳, ובו תחנת הרכבת הגבוהה באירופה ומצפה הספינקס - מעליו משתרע קרחון אלטש, הקרחון הארוך באלפים.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'טבע אלפיני מהמדרגה הראשונה עם נגישות יוצאת דופן: רכבות ורכבלים מגיעים כמעט לכל תצפית, גם בלי רכב. חסרונות: זה אחד היעדים היקרים בעולם, אין באזור כתובת כשרה מאומתת, ומזג האוויר יכול למחוק תצפית שכבר שילמתם עליה.',
    },
    summary:
      'אינטרלאקן יושבת בין אגם תון לאגם בריינץ, והיא שער הכניסה לעמק היונגפראו - אחד מאזורי ההרים המרהיבים באלפים. מכאן יוצאים אל עמק לאוטרברונן ושבעים מפליו, אל תצפיות שילטהורן והרדר קולם, אל אגם באכאלפזה שמשקף את פסגות השלג, ואל יונגפראויוך - תחנת הרכבת הגבוהה באירופה. הכול מחובר ברכבות ורכבלים, כך שאפשר לטייל כאן ברצינות גם בלי רכב.',
    bestSeason:
      'יוני-ספטמבר (שבילים ורכבלים פתוחים, אגמים בשיא) · דצמבר-מרץ עונת סקי · באפריל-מאי ובנובמבר חלק מהמתקנים סגורים לתחזוקה',
    places: [
      {
        id: 'int-jungfraujoch',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Sphinx_et_Jungfrau_-_img_06980.jpg/500px-Sphinx_et_Jungfrau_-_img_06980.jpg',
        tags: ['outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'יונגפראויוך - גג אירופה',
        nameLocal: 'Jungfraujoch',
        category: 'nature',
        lat: 46.5472,
        lng: 7.9806,
        description:
          'האוכף בין המונק ליונגפראו בגובה 3,454 מ׳, ואליו מטפסת רכבת שיניים דרך מנהרה בתוך ההר. למעלה: מצפה הספינקס, ארמון קרח, מישור שלג ונוף אל קרחון אלטש. הכרטיס יקר במיוחד - שווה לבדוק תחזית לפני שקונים.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Jungfraujoch',
      },
      {
        id: 'int-lauterbrunnen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/1_lauterbrunnen_valley_wengen_2022.jpg/500px-1_lauterbrunnen_valley_wengen_2022.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        mustSee: true,
        name: 'עמק לאוטרברונן',
        nameLocal: 'Lauterbrunnen Valley',
        category: 'nature',
        lat: 46.595,
        lng: 7.9075,
        description:
          'עמק קרחוני צר בין קירות סלע אנכיים, שממנו יורדים עשרות מפלים (המספר המקובל: 72). שביל העמק שטוח ונוח להליכה או לרכיבה על אופניים, והכפר עצמו הוא בסיס מצוין לעמק כולו.',
        rating: 4.8,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Lauterbrunnen',
      },
      {
        id: 'int-staubbach',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Lauterbrunnen_Staubbach.jpg/500px-Lauterbrunnen_Staubbach.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'מפל שטאובבאך',
        nameLocal: 'Staubbach Falls',
        category: 'nature',
        lat: 46.5897,
        lng: 7.9055,
        description:
          'מפל צניחה חופשית של כמעט 300 מטר שנופל מקיר הסלע ממש מעל כפר לאוטרברונן - אחד המפלים הגבוהים באירופה. שביל קצר ותלול מוביל למנהרה קטנה מאחורי המפל (סגורה בחורף).',
        rating: 4.5,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Staubbach+Falls',
      },
      {
        id: 'int-trummelbach',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Trummelbach.JPG/500px-Trummelbach.JPG',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'מפלי טרימלבאך',
        nameLocal: 'Trümmelbach Falls',
        category: 'nature',
        lat: 46.5691,
        lng: 7.915,
        description:
          'עשרה מפלים קרחוניים שחצבו את דרכם בתוך ההר עצמו - מבקרים בהם דרך מעלית שנחצבה בסלע ומערכת מדרגות וגשרונים. רועש, קר ורטוב, וחוויה מרשימה במיוחד לילדים. פתוח בעונה החמה.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Tr%C3%BCmmelbach+Falls',
      },
      {
        id: 'int-schilthorn',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Schilthorn_with_Bernese_Alps%2C_2012_August.jpg/500px-Schilthorn_with_Bernese_Alps%2C_2012_August.jpg',
        tags: ['outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'שילטהורן (פיץ גלוריה)',
        nameLocal: 'Schilthorn / Piz Gloria',
        category: 'viewpoint',
        lat: 46.5572,
        lng: 7.8353,
        description:
          'פסגה בגובה 2,970 מ׳ עם מסעדה מסתובבת ותצפית 360 מעלות אל האייגר, המונק והיונגפראו. הוסרטה כאן סצנה מסרטי ג׳יימס בונד. עולים ברכבל דרך הכפר מירן חסר המכוניות.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Schilthorn',
      },
      {
        id: 'int-bachalpsee',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Bachalpsee_reflection.jpg/500px-Bachalpsee_reflection.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'אגם באכאלפזה',
        nameLocal: 'Bachalpsee',
        category: 'nature',
        lat: 46.6694,
        lng: 8.0233,
        description:
          'אגם הררי בגובה כ-2,265 מ׳ שמשקף את פסגות השלג של רכס האלפים הברניים - מהנופים המצולמים בשווייץ. מגיעים ברכבל מגרינדלוואלד אל פירסט, ומשם הליכה קלה של כשעה בשביל רחב.',
        rating: 4.8,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Bachalpsee',
      },
      {
        id: 'int-grindelwald',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Grindelwald_View_02.jpg/500px-Grindelwald_View_02.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'גרינדלוואלד',
        nameLocal: 'Grindelwald',
        category: 'attraction',
        lat: 46.6167,
        lng: 8.0333,
        description:
          'כפר הרים קלאסי למרגלות קיר הצפון של האייגר, ובסיס הנוחות ביותר לטיולי העמק: רכבל לפירסט, רכבת ליונגפראויוך ושפע מסלולי הליכה שיוצאים מהכפר עצמו.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Grindelwald',
      },
      {
        id: 'int-harder',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Harder_Kulm.JPG/500px-Harder_Kulm.JPG',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        name: 'הרדר קולם',
        nameLocal: 'Harder Kulm',
        category: 'viewpoint',
        lat: 46.6973,
        lng: 7.8517,
        description:
          'תצפית הבית של אינטרלאקן, בגובה כ-1,320 מ׳: רכבת פוניקולר תלולה מהעיר, ולמעלה מרפסת תצפית שמרחפת אל שני האגמים ואל שלוש הפסגות המפורסמות. יפה במיוחד לקראת שקיעה.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Harder+Kulm',
      },
      {
        id: 'int-brienz',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Aerial_image_of_Lake_Brienz_%28view_from_the_southwest%29.jpg/500px-Aerial_image_of_Lake_Brienz_%28view_from_the_southwest%29.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'אגם בריינץ',
        nameLocal: 'Lake Brienz',
        category: 'nature',
        lat: 46.7167,
        lng: 7.9667,
        description:
          'האגם המזרחי של אינטרלאקן, בצבע טורקיז-חלבי בזכות מי הקרחונים. אוניות נוסעים חוצות אותו בין הכפרים, ובגדה הצפונית שוכן הכפר בריינץ עם בתי העץ המסורתיים.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Lake+Brienz',
      },
      {
        id: 'int-thunersee',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Aerial_image_of_Lake_Thun_%28view_from_the_east%29.jpg/500px-Aerial_image_of_Lake_Thun_%28view_from_the_east%29.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'אגם תון',
        nameLocal: 'Lake Thun',
        category: 'nature',
        lat: 46.6833,
        lng: 7.7167,
        description:
          'האגם המערבי של אינטרלאקן, גדול ורגוע יותר, ולחופיו טירות ומזחים. שיט האוניות בין אינטרלאקן לעיר תון הוא אחת הדרכים היפות והנינוחות לראות את האזור.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Lake+Thun',
      },
      {
        id: 'int-hoheweg',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Goldswil-Viadukt_Panorama_mit_Interlaken_im_Hintergrund_2.jpg/500px-Goldswil-Viadukt_Panorama_mit_Interlaken_im_Hintergrund_2.jpg',
        tags: ['families'],
        priceLevel: 1,
        name: 'מרכז אינטרלאקן וההווג',
        nameLocal: 'Interlaken & Höheweg',
        category: 'attraction',
        lat: 46.6833,
        lng: 7.85,
        description:
          'הרחוב הראשי של אינטרלאקן, ולצדו מדשאות ההיהמאטה שמהן ממריאים הצנחנים והפרפלנים מול נוף היונגפראו. מכאן יוצאות שתי תחנות הרכבת של העיר לכל כיווני העמק.',
        rating: 4.3,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=H%C3%B6heweg+Interlaken',
      },
      {
        id: 'int-murren',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/1_M%C3%BCrren_2022.jpg/500px-1_M%C3%BCrren_2022.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        name: 'מירן - כפר ללא מכוניות',
        nameLocal: 'Mürren',
        category: 'attraction',
        lat: 46.5594,
        lng: 7.8922,
        description:
          'כפר קטן בגובה כ-1,640 מ׳ על מדף מעל עמק לאוטרברונן, ואליו מגיעים רק ברכבל וברכבת - בלי מכוניות. נקודת מוצא לרכבל שילטהורן ולשבילי תצפית מול האייגר, המונק והיונגפראו.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=M%C3%BCrren',
      },
      {
        id: 'int-aare',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Aareschlucht_166_7.jpg/500px-Aareschlucht_166_7.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'נקיק האארה',
        nameLocal: 'Aare Gorge (Aareschlucht)',
        category: 'nature',
        lat: 46.7178,
        lng: 8.2136,
        description:
          'נקיק צר ועמוק שחצב נהר האארה בסלע הגיר ליד מיירינגן, ובו מסלול הליכה על גשרונים ומנהרות לאורך כקילומטר וחצי - קריר, דרמטי ומתאים גם למשפחות.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Aareschlucht',
      },
      {
        id: 'int-reichenbach',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Schattenhalb_Reichenbachfall_7-05-2024_10-56-28.jpg/500px-Schattenhalb_Reichenbachfall_7-05-2024_10-56-28.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        name: 'מפלי רייכנבאך',
        nameLocal: 'Reichenbach Falls',
        category: 'nature',
        lat: 46.7136,
        lng: 8.1831,
        description:
          'מפלי מדרגות מרשימים מעל מיירינגן, שאליהם עולים ברכבל היסטורי. המקום מפורסם גם כזירת הקרב הסופי בין שרלוק הולמס לפרופסור מוריארטי בסיפורו של קונן דויל.',
        rating: 4.4,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Reichenbach+Falls',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'האגמים ותצפית הבית',
        placeIds: ['int-hoheweg', 'int-harder', 'int-brienz'],
        notes:
          'יום נחיתה רגוע: הליכה בהווג, פוניקולר להרדר קולם לתצפית על שני האגמים, ולקראת הערב שיט או טיול לאורך אגם בריינץ.',
      },
      {
        day: 2,
        title: 'עמק לאוטרברונן והמפלים',
        placeIds: ['int-lauterbrunnen', 'int-staubbach', 'int-trummelbach', 'int-murren'],
        notes:
          'יום המפלים: שביל העמק בין קירות הסלע, שטאובבאך שנופל מעל הכפר, מפלי טרימלבאך שבתוך ההר - ועלייה במסלול לכפר מירן חסר המכוניות.',
      },
      {
        day: 3,
        title: 'גג אירופה',
        placeIds: ['int-jungfraujoch', 'int-grindelwald'],
        notes:
          'יום שלם ליונגפראויוך - לצאת מוקדם ולבדוק תחזית לפני שקונים כרטיס. בחזרה עצירה בגרינדלוואלד למרגלות קיר האייגר.',
      },
      {
        day: 4,
        title: 'אגם באכאלפזה או שילטהורן',
        placeIds: ['int-bachalpsee', 'int-schilthorn', 'int-aare'],
        notes:
          'בוחרים תצפית אחת: הליכה קלה לאגם באכאלפזה מפירסט, או רכבל לשילטהורן. מי שנשאר עם זמן - נקיק האארה במיירינגן בדרך חזרה.',
      },
    ],
    practical: {
      flights:
        'טיסות ישירות מנתב"ג לציריך (ZRH): אל על, ו-SWISS שחידשה את הקו ב-1 ביולי 2026 - כ-12-13 טיסות בשבוע בין שתי החברות, כ-4 שעות. מציריך רכבת ישירה/עם החלפה אחת לאינטרלאקן (כשעתיים), ואפשר גם דרך ז׳נבה או באזל.',
      gettingAround:
        'אין צורך ברכב: רכבות, רכבלים ואוניות מגיעים כמעט לכל נקודה, בתדירות גבוהה ובדייקנות. שווה לבדוק מראש כרטיס נסיעות מתאים (Swiss Travel Pass או כרטיסי אזור היונגפראו) - התחבורה כאן יקרה, וכרטיס מתאים חוסך הרבה. חלק מהרכבלים סגורים בעונות המעבר לתחזוקה.',
      kosherOverview:
        'אין באינטרלאקן ובעמק היונגפראו כתובת כשרה מאומתת - לא מסעדה ולא חנות. תשתית הכשרות בשווייץ מרוכזת בערים הגדולות (ציריך, ז׳נבה, בזל), וכמה מלונות בהרים מציעים שירות כשר עונתי בלבד. מי שמקפיד - להצטייד מראש בציריך ולוודא ישירות מול המלון/המסעדה לפני הנסיעה.',
    },
  },
  {
    slug: 'tokyo',
    name: 'טוקיו והר פוג׳י',
    nameLocal: 'Tokyo & Mount Fuji',
    countrySlug: 'japan',
    flag: '🇯🇵',
    center: { lat: 35.55, lng: 139.3 },
    zoom: 8,
    tagline: 'עיר ענקית ומדויקת - ומסביבה הר געש, אגמים ומעיינות חמים',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg/500px-View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg',
    iconicLandmark: {
      name: 'הר פוג׳י',
      nameLocal: 'Mount Fuji / 富士山',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg/500px-View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg',
      blurb:
        'הר הגעש הגבוה ביפן (3,776 מ׳) וסמלה המוכר ביותר - אתר מורשת עולמית של אונסק"ו, שנראה בימים בהירים גם מטוקיו.',
    },
    editorialRating: {
      score: 4.8,
      verdict:
        'אחת הערים המרתקות בעולם, ובטווח שעתיים ממנה הר געש, אגמים, מפלים ומעיינות חמים - עם תחבורה ציבורית מושלמת ובטיחות יוצאת דופן. חסרונות: טיסה של כ-11.5 שעות בתדירות נמוכה, יעד יקר, מחסום שפה, ופוג׳י מתחבא בעננים בחלק גדול מהשנה.',
    },
    summary:
      'טוקיו היא עיר-מדינה שלמה: מקדש סנסו-ג׳י בן המאה השביעית באסקוסה, צומת שיבויה הענק, יער המקדש של מייג׳י וגנים מטופחים בלב הבטון. במרחק שעה-שעתיים מתחילה יפן אחרת - הר פוג׳י ואגמיו, עמק הגופרית של האקונה, מפל קגון שבניקו והבודהה הגדול של קמאקורה. בטוקיו יש גם בית חב"ד ומסעדה כשרה, מה שהופך אותה לנקודת פתיחה נוחה לשומרי כשרות ביפן.',
    bestSeason:
      'סוף מרץ-אפריל (פריחת הדובדבן) ואוקטובר-נובמבר (שלכת) - הנוחים ביותר · הקיץ חם ולח מאוד · טיפוס על פוג׳י אפשרי רק בעונה הרשמית, כיולי-תחילת ספטמבר',
    places: [
      {
        id: 'jpn-fuji',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg/500px-View_of_Mount_Fuji_from_%C5%8Cwakudani_20211202.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'הר פוג׳י',
        nameLocal: 'Mount Fuji / 富士山',
        category: 'nature',
        lat: 35.3608,
        lng: 138.7275,
        description:
          'הר הגעש הסימטרי שהוא סמלה של יפן, 3,776 מ׳ ואתר מורשת עולמית. רובם המכריע של המבקרים צופים בו מהאגמים או מהאקונה; הטיפוס עצמו אפשרי רק בעונה הקצרה של הקיץ ודורש הכנה.',
        rating: 4.8,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Mount+Fuji',
      },
      {
        id: 'jpn-kawaguchi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/KawaguchiKo.jpg/500px-KawaguchiKo.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'אגם קוואגוצ׳י',
        nameLocal: 'Lake Kawaguchi / 河口湖',
        category: 'nature',
        lat: 35.515,
        lng: 138.7567,
        description:
          'הנגיש שבחמשת אגמי פוג׳י, ומהגדה הצפונית שלו נשקף ההר בשלמותו ומשתקף במים. סביבו טיילת, מוזיאונים קטנים, רכבל לתצפית ואונקים (מעיינות חמים) עם נוף.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Lake+Kawaguchi',
      },
      {
        id: 'jpn-chureito',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Chuurei-tou_Fujiyoshida_17025277650_c59733d6ba_o.jpg/500px-Chuurei-tou_Fujiyoshida_17025277650_c59733d6ba_o.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 0,
        mustSee: true,
        name: 'פגודת צ׳ורייטו',
        nameLocal: 'Chureito Pagoda, Arakurayama Sengen Park',
        category: 'viewpoint',
        lat: 35.5012,
        lng: 138.8014,
        description:
          'הפגודה האדומה בת חמש הקומות שמעל העיר פוג׳ייושידה, ומאחוריה הר פוג׳י - התמונה המזוהה ביותר עם יפן. מגיעים בטיפוס של כ-400 מדרגות; יפה במיוחד בפריחת הדובדבן ובשלכת.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Chureito+Pagoda',
      },
      {
        id: 'jpn-hakone',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/View_of_Mount_Fuji_from_Lake_Ashi.jpg/500px-View_of_Mount_Fuji_from_Lake_Ashi.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'האקונה',
        nameLocal: 'Hakone / 箱根',
        category: 'nature',
        lat: 35.1894,
        lng: 139.0247,
        description:
          'אזור הררי געשי דרומית-מערבית לטוקיו, מפורסם במעיינות החמים (אונסן) ובמסלול המעגלי שמשלב רכבת הרים, פוניקולר, רכבל ואונייה על האגם. יעד קלאסי ליום-יומיים מטוקיו.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Hakone',
      },
      {
        id: 'jpn-ashi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/260505_Moto-Hakone_Hakone_Japan01s3.jpg/500px-260505_Moto-Hakone_Hakone_Japan01s3.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'אגם אשי',
        nameLocal: 'Lake Ashi / 芦ノ湖',
        category: 'nature',
        lat: 35.2097,
        lng: 139.0044,
        description:
          'אגם געשי בלב האקונה, ובימים בהירים נשקף מעליו הר פוג׳י. שער הטורי האדום של מקדש האקונה עומד במים ממש בקצה האגם - אחת התמונות המפורסמות באזור.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Lake+Ashi',
      },
      {
        id: 'jpn-owakudani',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Owakudani_-_Hakone_%2827369344357%29.jpg/500px-Owakudani_-_Hakone_%2827369344357%29.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'עמק אווקודאני',
        nameLocal: 'Ōwakudani / 大涌谷',
        category: 'nature',
        lat: 35.2419,
        lng: 139.0208,
        description:
          'עמק געשי פעיל שנוצר בהתפרצות לפני כ-3,000 שנה: אדים גופריתיים, בורות רותחים ונוף מאדים - מגיעים ברכבל מעליו. לפעמים נסגר בגלל פעילות גזים; לבדוק את מצב האתר לפני שמגיעים.',
        rating: 4.4,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Owakudani',
      },
      {
        id: 'jpn-kegon',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Lake_chuzenji_and_kegon_waterfall.jpg/500px-Lake_chuzenji_and_kegon_waterfall.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'מפל קגון (ניקו)',
        nameLocal: 'Kegon Falls / 華厳滝',
        category: 'nature',
        lat: 36.7379,
        lng: 139.502,
        description:
          'מפל בגובה כ-97 מ׳ שיוצא מאגם צ׳וזנג׳י בהרי ניקו, ומעלית מובילה למרפסת תצפית בתחתיתו. משתלב עם מקדשי ניקו (אתר מורשת עולמית) ליום מלא צפונית לטוקיו.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Kegon+Falls',
      },
      {
        id: 'jpn-sensoji',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Sensoji_2023.jpg/500px-Sensoji_2023.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 0,
        mustSee: true,
        name: 'מקדש סנסו-ג׳י (אסקוסה)',
        nameLocal: 'Sensō-ji, Asakusa',
        category: 'attraction',
        lat: 35.7147,
        lng: 139.7968,
        description:
          'המקדש הבודהיסטי העתיק בטוקיו, ואליו מובילה סמטת נקאמיסה עמוסה בדוכני מזכרות ומאכלי רחוב. השער האדום קמינרימון עם הפנס הענק הוא אחד הצילומים המזוהים עם העיר.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Sensoji+Temple',
      },
      {
        id: 'jpn-shibuya',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Shibuya_Crossing%2C_Aerial.jpg/500px-Shibuya_Crossing%2C_Aerial.jpg',
        tags: ['nightlife', 'families'],
        priceLevel: 0,
        mustSee: true,
        name: 'צומת שיבויה',
        nameLocal: 'Shibuya Crossing',
        category: 'attraction',
        lat: 35.6586,
        lng: 139.7011,
        description:
          'מעבר החצייה האלכסוני שמול תחנת שיבויה, שבו חוצים אלפי אנשים בכל מחזור רמזור - סמל של טוקיו המודרנית. סביבו רחובות קניות, וממרפסות התצפית בבניינים הסמוכים רואים את הכוריאוגרפיה מלמעלה.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Shibuya+Crossing',
      },
      {
        id: 'jpn-meiji',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Meiji_Jingu_2023-3.jpg/500px-Meiji_Jingu_2023-3.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        name: 'מקדש מייג׳י',
        nameLocal: 'Meiji Shrine / 明治神宮',
        category: 'attraction',
        lat: 35.6761,
        lng: 139.6992,
        description:
          'מקדש שינטו גדול בלב יער נטוע של יותר ממאה אלף עצים, ממש ליד הרחובות הסואנים של הראג׳וקו ושיבויה. שער הטורי העצום בכניסה והשקט שבפנים הם ניגוד מוחלט לעיר שבחוץ.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Meiji+Shrine',
      },
      {
        id: 'jpn-skytree',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Tokyo_Skytree_2014_%E2%85%A2.jpg/500px-Tokyo_Skytree_2014_%E2%85%A2.jpg',
        tags: ['families'],
        priceLevel: 2,
        name: 'טוקיו סקייטרי',
        nameLocal: 'Tokyo Skytree / 東京スカイツリー',
        category: 'viewpoint',
        lat: 35.7101,
        lng: 139.8107,
        description:
          'מגדל השידור הגבוה ביפן (634 מ׳) ובו שתי קומות תצפית - בימים בהירים רואים ממנו את הר פוג׳י. בבסיסו קניון גדול ואקווריום, ומסביב שכונת סומידה השקטה יחסית.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Tokyo+Skytree',
      },
      {
        id: 'jpn-ueno',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Ueno_park.jpg/500px-Ueno_park.jpg',
        tags: ['families', 'art'],
        priceLevel: 0,
        name: 'פארק אואנו',
        nameLocal: 'Ueno Park / 上野公園',
        category: 'nature',
        lat: 35.7122,
        lng: 139.7711,
        description:
          'הפארק העירוני הגדול של מזרח טוקיו, ובו בריכת שיבאבה, מקדשים, גן חיות וכמה מהמוזיאונים החשובים ביפן. בעונת הסאקורה זה אחד ממוקדי הפריחה המפורסמים בעיר.',
        rating: 4.5,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Ueno+Park',
      },
      {
        id: 'jpn-gyoen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Shinjuku_Gyoen_National_Garden_-_sakura_3.JPG/500px-Shinjuku_Gyoen_National_Garden_-_sakura_3.JPG',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'גן שינג׳וקו גיואן',
        nameLocal: 'Shinjuku Gyo-en',
        category: 'nature',
        lat: 35.685,
        lng: 139.71,
        description:
          'גן לאומי ענק בלב שינג׳וקו, שמשלב גן יפני מסורתי, גן אנגלי, גן צרפתי וחממה טרופית. אחד המקומות היפים בעיר לפריחת הדובדבן ולשלכת, ושקט להפתיע.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Shinjuku+Gyoen',
      },
      {
        id: 'jpn-kamakura',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/TsurugaokaHachiman-M8867.jpg/500px-TsurugaokaHachiman-M8867.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        name: 'קמאקורה',
        nameLocal: 'Kamakura / 鎌倉',
        category: 'attraction',
        lat: 35.3197,
        lng: 139.5525,
        description:
          'עיר חוף היסטורית כשעה מטוקיו, שהייתה בירת יפן במאות ה-12-14. מקדשים בין גבעות מיוערות, מקדש צורוגאוקה האצ׳ימנגו במרכז, ושבילי הליכה קצרים בין האתרים אל החוף.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Kamakura',
      },
      {
        id: 'jpn-daibutsu',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/230128_Kamakura_Daibutsu_Japan04s3.jpg/500px-230128_Kamakura_Daibutsu_Japan04s3.jpg',
        tags: ['history'],
        priceLevel: 1,
        mustSee: true,
        name: 'הבודהה הגדול של קמאקורה',
        nameLocal: 'Kōtoku-in, Great Buddha',
        category: 'attraction',
        lat: 35.3168,
        lng: 139.5357,
        description:
          'פסל ברונזה בגובה כ-11.4 מ׳ מהמאה ה-13, שיושב תחת כיפת השמיים מאז שגלי צונאמי הרסו את האולם שהקיף אותו. אחד הסמלים המוכרים של יפן, ואפשר גם להיכנס אל תוך הפסל.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Kotoku-in+Great+Buddha',
      },
      {
        id: 'jpn-chabad',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'בית חב"ד טוקיו ומסעדת Chana׳s Place',
        nameLocal: "Chabad House Tokyo & Chana's Place, Takanawa",
        category: 'kosher-food',
        lat: 35.635,
        lng: 139.7357,
        description:
          'בית חב"ד של טוקיו בשכונת טקאנאווה (1-5-23 Takanawa, Minato-ku), ובו Chana׳s Place - המסעדה הכשרה הראשונה בעיר, עם תפריט ישראלי-יהודי. עובדים בעיקר בהזמנה מראש ובשעות מוגדרות.',
        kosherNote: 'בהשגחת בית חב"ד טוקיו. חובה לתאם מראש - שעות הפתיחה מוגבלות.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד טוקיו (הרב מנדי סודקביץ)',
        },
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Chabad+House+Tokyo+Takanawa',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'טוקיו הישנה - אסקוסה וסומידה',
        placeIds: ['jpn-sensoji', 'jpn-skytree', 'jpn-ueno'],
        notes:
          'יום ראשון רגוע אחרי הטיסה הארוכה: מקדש סנסו-ג׳י וסמטת נקאמיסה, מגדל סקייטרי מעבר לנהר, וסיום בפארק אואנו.',
      },
      {
        day: 2,
        title: 'טוקיו המודרנית',
        placeIds: ['jpn-meiji', 'jpn-shibuya', 'jpn-gyoen', 'jpn-chabad'],
        notes:
          'יער המקדש של מייג׳י, ומשם ברגל לצומת שיבויה ולרחובות הקניות. אחר הצהריים גן שינג׳וקו גיואן, וארוחת ערב כשרה בטקאנאווה (בהזמנה מראש).',
      },
      {
        day: 3,
        title: 'הר פוג׳י והאגמים',
        placeIds: ['jpn-fuji', 'jpn-kawaguchi', 'jpn-chureito'],
        notes:
          'יוצאים מוקדם לאזור האגמים: תצפיות על פוג׳י מגדות קוואגוצ׳י ומפגודת צ׳ורייטו. לבדוק תחזית - ההר מתחבא בעננים לעתים קרובות.',
      },
      {
        day: 4,
        title: 'האקונה - געש ומעיינות חמים',
        placeIds: ['jpn-hakone', 'jpn-owakudani', 'jpn-ashi'],
        notes:
          'המסלול המעגלי של האקונה: רכבת הרים ורכבל אל עמק אווקודאני הגופריתי, ואונייה על אגם אשי אל שער הטורי שבמים.',
      },
      {
        day: 5,
        title: 'קמאקורה או ניקו',
        placeIds: ['jpn-kamakura', 'jpn-daibutsu', 'jpn-kegon'],
        notes:
          'בוחרים כיוון: דרומה לקמאקורה (מקדשים, הבודהה הגדול וחוף) או צפונה לניקו (מקדשי המורשת ומפל קגון). שניהם טיולי יום ברכבת מטוקיו.',
      },
    ],
    practical: {
      flights:
        'אל על היא היחידה שמפעילה טיסה ישירה מנתב"ג לטוקיו (נריטה, NRT) - כשלוש טיסות בשבוע ב-787-9, כ-11.5 שעות; הקו חודש באפריל 2026. לחלופין טסים עם החלפה דרך אירופה, איסטנבול או המפרץ.',
      gettingAround:
        'בטוקיו: מטרו ורכבות JR מכסים הכול - כדאי כרטיס IC נטען (Suica/Pasmo) מיד עם הנחיתה. לפוג׳י ולהאקונה יש רכבות ואוטובוסים ישירים וכרטיסי אזור (למשל Hakone Free Pass). Japan Rail Pass משתלם רק אם מתכננים גם נסיעות רכבת מהירה למרחקים ארוכים.',
      kosherOverview:
        'בטוקיו יש תשתית כשרות אמיתית אך קטנה: בית חב"ד בטקאנאווה עם המסעדה הכשרה Chana׳s Place, ושירות משלוחי אוכל כשר (Kosher Delica) שפועל בהשגחה רבנית ומגיע גם לערים אחרות ביפן - בשניהם עובדים בהזמנה מראש. מחוץ לטוקיו אין כמעט כלום, וחשוב לדעת שהמטבח היפני מבוסס על מרק דאשי (דגים), מירין ורוטב סויה - אין להניח כשרות בשום מסעדה רגילה.',
    },
  },
  {
    slug: 'serengeti',
    name: 'סרנגטי וקילימנג׳רו',
    nameLocal: 'Northern Tanzania Safari Circuit',
    countrySlug: 'tanzania',
    flag: '🇹🇿',
    center: { lat: -3.0, lng: 35.8 },
    zoom: 7,
    tagline: 'מישורי הספארי הגדולים, מכתש ענק והפסגה של אפריקה',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Serengeti-Landscape-2012.JPG/500px-Serengeti-Landscape-2012.JPG',
    iconicLandmark: {
      name: 'הר קילימנג׳רו',
      nameLocal: 'Mount Kilimanjaro',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Kilimanjaro_from_Amboseli.jpg/500px-Kilimanjaro_from_Amboseli.jpg',
      blurb:
        'ההר הגבוה באפריקה (5,895 מ׳) והר הגעש הבודד הגבוה בעולם - פסגת שלג שמתנשאת מעל הסוואנה, ואפשר לטפס אליה בלי ציוד טיפוס טכני.',
    },
    editorialRating: {
      score: 4.8,
      verdict:
        'הספארי הקלאסי של אפריקה: סרנגטי, נגורונגורו והנדידה הגדולה - חוויה שאין לה תחליף, ובארושה יש בית חב"ד עם אוכל כשר. חסרונות: אין טיסה ישירה מישראל (החלפה באדיס אבבה), יעד יקר בגלל אגרות הפארקים והלודג׳ים, ורוב הטיולים דורשים ג׳יפ עם נהג-מדריך.',
    },
    summary:
      'צפון טנזניה הוא מסלול הספארי המפורסם בעולם: מישורי סרנגטי שבהם עוברת הנדידה הגדולה של מאות אלפי גנואים וזברות, מכתש נגורונגורו שבתוכו מערכת אקולוגית שלמה, ואגם מניארה וטרנגירה עם עדרי הפילים. מעל הכול מתנשאת פסגת קילימנג׳רו המושלגת. עיר הבסיס היא ארושה, שממנה יוצאים כל הספארים - ושבה גם בית חב"ד עם מטבח כשר.',
    bestSeason:
      'יוני-אוקטובר (העונה היבשה - הצפייה בחיות הטובה ביותר; הנדידה בצפון סרנגטי כיולי-ספטמבר) · ינואר-פברואר עונת ההמלטות בדרום סרנגטי · אפריל-מאי גשמים כבדים וחלק מהדרכים קשות',
    places: [
      {
        id: 'tza-serengeti',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Serengeti-Landscape-2012.JPG/500px-Serengeti-Landscape-2012.JPG',
        tags: ['outdoors', 'families'],
        priceLevel: 3,
        mustSee: true,
        name: 'הפארק הלאומי סרנגטי',
        nameLocal: 'Serengeti National Park',
        category: 'nature',
        lat: -2.4,
        lng: 34.6,
        description:
          'מישורי עשב אינסופיים בשטח של כ-15 אלף קמ"ר, אתר מורשת עולמית, ובהם מתרחשת הנדידה הגדולה - מעבר עונתי של מאות אלפי גנואים וזברות. כאן נמצאים גם האריות, הנמרים והצ׳יטות שהפכו את המקום למותג.',
        rating: 4.9,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Serengeti+National+Park',
      },
      {
        id: 'tza-ngorongoro',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Ngorongoro-1001-2.jpg/500px-Ngorongoro-1001-2.jpg',
        tags: ['outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'מכתש נגורונגורו',
        nameLocal: 'Ngorongoro Crater',
        category: 'nature',
        lat: -3.21,
        lng: 35.46,
        description:
          'קלדרה של הר געש שקרס, בקוטר של כ-20 ק"מ ובעומק כ-600 מ׳, ובתוכה מערכת אקולוגית סגורה עם עשרות אלפי בעלי חיים - כולל אוכלוסיית קרנפים שחורים. יורדים אל רצפת המכתש ברכב שטח.',
        rating: 4.9,
        durationMin: 600,
        externalUrl: 'https://maps.google.com/?q=Ngorongoro+Crater',
      },
      {
        id: 'tza-kilimanjaro',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Kilimanjaro_from_Amboseli.jpg/500px-Kilimanjaro_from_Amboseli.jpg',
        tags: ['outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'הר קילימנג׳רו',
        nameLocal: 'Mount Kilimanjaro',
        category: 'nature',
        lat: -3.0667,
        lng: 37.3592,
        description:
          'הפסגה הגבוהה באפריקה, 5,895 מ׳, ובה כיפת קרח שמצטמצמת משנה לשנה. הטיפוס אורך 5-9 ימים במסלולים כמו מצ׳אמה או לימושו, אינו דורש ציוד טכני - אבל דורש כושר, התאקלמות וליווי מדריכים וסבלים מורשים.',
        rating: 4.8,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Mount+Kilimanjaro',
      },
      {
        id: 'tza-tarangire',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Tarangine_%2862%29.jpg/500px-Tarangine_%2862%29.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 2,
        name: 'הפארק הלאומי טרנגירה',
        nameLocal: 'Tarangire National Park',
        category: 'nature',
        lat: -3.8333,
        lng: 36.0,
        description:
          'פארק של עצי באובב ענקיים ונהר שאליו מתנקזות החיות בעונה היבשה - מהמקומות הטובים בטנזניה לצפייה בעדרי פילים גדולים. שקט ופחות עמוס מסרנגטי.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Tarangire+National+Park',
      },
      {
        id: 'tza-manyara',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Lake_Manyara_Wildlife.jpg/500px-Lake_Manyara_Wildlife.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'אגם מניארה',
        nameLocal: 'Lake Manyara National Park',
        category: 'nature',
        lat: -3.5,
        lng: 36.0,
        description:
          'פארק צר בין מצוק השבר האפריקאי לאגם מלוח, עם יער עד, להקות בבונים, היפופוטמים ולהקות פלמינגו על המים. עצירה נוחה בדרך מארושה אל נגורונגורו.',
        rating: 4.5,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Lake+Manyara+National+Park',
      },
      {
        id: 'tza-arushanp',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Meru_Ashcone.jpg/500px-Meru_Ashcone.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'הפארק הלאומי ארושה והר מרו',
        nameLocal: 'Arusha National Park & Mount Meru',
        category: 'nature',
        lat: -3.2668,
        lng: 36.8349,
        description:
          'פארק קטן וירוק ממש ליד העיר, ובו הר מרו (4,562 מ׳), אגמי מומלה, מפלים ולוע געשי. אחד המקומות הבודדים בטנזניה שבהם מותר ספארי רגלי בליווי ריינג׳ר - טוב גם כהתאקלמות לפני קילימנג׳רו.',
        rating: 4.5,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Arusha+National+Park',
      },
      {
        id: 'tza-olduvai',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Oldupai-3.jpg/500px-Oldupai-3.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'נקיק אולדובאי',
        nameLocal: 'Olduvai (Oldupai) Gorge',
        category: 'museum',
        lat: -2.9936,
        lng: 35.3512,
        description:
          'נקיק בשולי נגורונגורו שנחשב לאחד האתרים החשובים בעולם לחקר האדם הקדמון: כאן חשפו בני משפחת ליקי מאובנים וכלי אבן בני מיליוני שנים. יש מרכז מבקרים קטן עם תצוגה והסבר.',
        rating: 4.3,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Olduvai+Gorge',
      },
      {
        id: 'tza-arusha',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Arusha_City_view.jpg/500px-Arusha_City_view.jpg',
        tags: ['foodie'],
        priceLevel: 1,
        name: 'ארושה - עיר הבסיס',
        nameLocal: 'Arusha',
        category: 'attraction',
        lat: -3.3667,
        lng: 36.6833,
        description:
          'העיר שממנה יוצא כל ספארי בצפון טנזניה, למרגלות הר מרו: סוכנויות טיולים, שווקים, בתי קפה ומרכז תרבות. נקודת ההצטיידות והמנוחה לפני ואחרי הימים בפארקים.',
        rating: 4.2,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Arusha+Tanzania',
      },
      {
        id: 'tza-chabad',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'בית חב"ד ארושה',
        nameLocal: 'Chabad House Arusha',
        category: 'kosher-food',
        lat: -3.3667,
        lng: 36.6833,
        description:
          'בית חב"ד של ארושה (רחוב Mawandammo 9) עם מטבח כשר שמגיש ארוחות ישראליות-יהודיות, וגם מרכז לתיירים ישראלים באזור. הארוחות בהזמנה מראש - לפחות יממה לפני. הסימון על המפה הוא באזור העיר, לא כתובת מדויקת.',
        kosherNote: 'בהשגחת בית חב"ד ארושה. חובה להזמין מראש (כ-24 שעות); לוודא זמינות ישירות מולם.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד ארושה, טנזניה',
        },
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Chabad+House+Arusha',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'נחיתה בארושה והתאקלמות',
        placeIds: ['tza-arusha', 'tza-arushanp', 'tza-chabad'],
        notes:
          'מגיעים לארושה, מסדרים ציוד וסוכנות ספארי, ויוצאים לחצי יום בפארק ארושה - ספארי רגלי ואגמי מומלה. ארוחת ערב כשרה בבית חב"ד (בהזמנה מראש).',
      },
      {
        day: 2,
        title: 'טרנגירה - ארץ הפילים והבאובבים',
        placeIds: ['tza-tarangire'],
        notes:
          'יום ספארי מלא בטרנגירה: עדרי פילים ליד הנהר, עצי באובב עתיקים ופחות עומס מבקרים מהפארקים המפורסמים.',
      },
      {
        day: 3,
        title: 'אגם מניארה ונקיק אולדובאי',
        placeIds: ['tza-manyara', 'tza-olduvai'],
        notes:
          'בוקר במניארה - יער עד, בבונים ופלמינגו על האגם. אחר הצהריים עלייה לרמת נגורונגורו עם עצירה בנקיק אולדובאי.',
      },
      {
        day: 4,
        title: 'מכתש נגורונגורו',
        placeIds: ['tza-ngorongoro'],
        notes:
          'יורדים לרצפת המכתש עם אור ראשון - הצפיפות הגבוהה ביותר של חיות בר בטנזניה, כולל סיכוי לקרנף שחור. לצאת מוקדם, המכתש מתחמם ומתמלא בצהריים.',
      },
      {
        day: 5,
        title: 'סרנגטי והנדידה הגדולה',
        placeIds: ['tza-serengeti'],
        notes:
          'יום או יומיים בסרנגטי - מיקום המחנה תלוי בעונה ובמיקום הנדידה. שווה לשלב יציאה מוקדמת ואחר צהריים מאוחר, שעות הפעילות של הטורפים.',
      },
      {
        day: 6,
        title: 'קילימנג׳רו - תצפית או טיפוס',
        placeIds: ['tza-kilimanjaro'],
        notes:
          'למי שרק צופה: יום באזור מושי עם נוף להר. למי שמטפס: זו נקודת הפתיחה למסלול של 5-9 ימים, שמתוכננים בנפרד מהספארי ודורשים חברה מורשית.',
      },
    ],
    practical: {
      flights:
        'אין טיסה ישירה מנתב"ג. החיבור הנוח הוא עם אתיופיאן איירליינס דרך אדיס אבבה לקילימנג׳רו (JRO) - כ-4 טיסות בשבוע וכ-10 שעות סה"כ כולל החלפה; יש גם קווים דרך המפרץ ואירופה, ומסלולים לזנזיבר (ZNZ).',
      gettingAround:
        'ספארי בצפון טנזניה נעשה כמעט תמיד בג׳יפ 4x4 עם נהג-מדריך של סוכנות מקומית - זו גם הדרך היחידה להיכנס לרוב הפארקים. המרחקים גדולים והדרכים חלקן עפר; יש גם טיסות פנים קטנות בין המסלולים לחיסכון בזמן.',
      kosherOverview:
        'בארושה, עיר הבסיס של הספארי, פועל בית חב"ד עם מטבח כשר שמגיש ארוחות בהזמנה מראש - זו כתובת הכשרות היחידה שאותרה באזור. בפארקים ובלודג׳ים אין כשרות, אבל חלק מסוכנויות הספארי מציעות מסלולים עם אוכל כשר מוזמן מראש - חובה לתאם ולוודא את ההשגחה ישירות מולם לפני שסוגרים.',
    },
  },
  {
    slug: 'cusco',
    name: 'קוסקו ומאצ׳ו פיצ׳ו',
    nameLocal: 'Cusco & Machu Picchu',
    countrySlug: 'peru',
    flag: '🇵🇪',
    center: { lat: -13.4, lng: -72.1 },
    zoom: 9,
    tagline: 'בירת האינקה, העמק הקדוש ואגמים בגובה 4,000 מטר',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Machu_Picchu%2C_2023_%28012%29.jpg/500px-Machu_Picchu%2C_2023_%28012%29.jpg',
    iconicLandmark: {
      name: 'מאצ׳ו פיצ׳ו',
      nameLocal: 'Machu Picchu',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Machu_Picchu%2C_2023_%28012%29.jpg/500px-Machu_Picchu%2C_2023_%28012%29.jpg',
      blurb:
        'עיר האינקה מהמאה ה-15 שנבנתה על רכס בגובה כ-2,430 מ׳ מעל עמק אורובמבה - אתר מורשת עולמית והסמל המוכר ביותר של דרום אמריקה.',
    },
    editorialRating: {
      score: 4.8,
      verdict:
        'שילוב נדיר של ארכיאולוגיה ברמה עולמית וטבע אנדים - ובקוסקו יש בית חב"ד עם מטבח בשרי וחלבי, נוח במיוחד לישראלים. חסרונות: אין טיסה ישירה (יממה של טיסות והחלפות), הגובה בקוסקו כ-3,400 מ׳ דורש יומיים התאקלמות, וכרטיסי מאצ׳ו פיצ׳ו במכסה יומית שנגמרת מראש.',
    },
    summary:
      'קוסקו הייתה בירת אימפריית האינקה, והיום היא נקודת המוצא לכל מה שמסביב: מאצ׳ו פיצ׳ו, העמק הקדוש עם אולנטייטמבו ופיסק, מדרגות החקלאות של מוראי ובריכות המלח של מאראס - וטיולי הליכה אל אגם הומנטאי הקרחוני ואל ההר בצבעי הקשת, ויניקונקה. זו גם אחת התחנות המרכזיות של הישראלים בדרום אמריקה, ובית חב"ד המקומי מפעיל מסעדות כשרות.',
    bestSeason:
      'מאי-ספטמבר (העונה היבשה - הטובה ביותר להליכות ולמאצ׳ו פיצ׳ו) · נובמבר-מרץ עונת הגשמים, ושביל האינקה סגור לגמרי בפברואר',
    places: [
      {
        id: 'per-machupicchu',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Machu_Picchu%2C_2023_%28012%29.jpg/500px-Machu_Picchu%2C_2023_%28012%29.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'מאצ׳ו פיצ׳ו',
        nameLocal: 'Machu Picchu',
        category: 'attraction',
        lat: -13.1633,
        lng: -72.5456,
        description:
          'עיר האינקה שנבנתה במאה ה-15 על רכס בין פסגות, ננטשה ונשארה כמעט שלמה - אתר מורשת עולמית. מגיעים ברכבת לאגואס קליינטס ובאוטובוס במעלה ההר; הכניסה במסלולים ובשעות מוגדרות ובמכסה יומית, וכרטיסים נחטפים שבועות מראש.',
        rating: 4.9,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Machu+Picchu',
      },
      {
        id: 'per-vinicunca',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Vinicunca%2C_Rainbow_Mountain.jpg/500px-Vinicunca%2C_Rainbow_Mountain.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'ויניקונקה - הר הקשת',
        nameLocal: 'Vinicunca (Rainbow Mountain)',
        category: 'nature',
        lat: -13.8702,
        lng: -71.303,
        description:
          'רכס בגובה כ-5,000 מ׳ שפסי המינרלים בו יוצרים פסים בצבעי אדום, צהוב, ירוק וסגול. מגיעים בנסיעה ארוכה מקוסקו ובהליכה קצרה אך תובענית בגלל הגובה - חובה להתאקלם קודם.',
        rating: 4.5,
        durationMin: 600,
        externalUrl: 'https://maps.google.com/?q=Vinicunca+Rainbow+Mountain',
      },
      {
        id: 'per-humantay',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Humantay_Lake.jpg/500px-Humantay_Lake.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'אגם הומנטאי',
        nameLocal: 'Laguna Humantay',
        category: 'nature',
        lat: -13.3795,
        lng: -72.5847,
        description:
          'אגם קרחוני בצבע טורקיז עז למרגלות פסגת סלקנטאי המושלגת, בגובה כ-4,200 מ׳. מגיעים מכפר מולפאטה ובהליכה תלולה של כשעה וחצי - יפה במיוחד בשעות הבוקר.',
        rating: 4.7,
        durationMin: 540,
        externalUrl: 'https://maps.google.com/?q=Humantay+Lake',
      },
      {
        id: 'per-cusco',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Vista_Calle_Suecia.jpg/500px-Vista_Calle_Suecia.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'קוסקו - העיר העתיקה',
        nameLocal: 'Cusco Historic Centre',
        category: 'attraction',
        lat: -13.5169,
        lng: -71.9786,
        description:
          'בירת האינקה לשעבר, בגובה כ-3,400 מ׳: כיכר פלאזה דה ארמס, קירות אבן אינקאיים שעליהם נבנו כנסיות קולוניאליות, ורובע סן בלאס עם סמטאות ובתי מלאכה. שני הימים הראשונים כאן הם גם ימי ההתאקלמות לגובה.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Cusco+Peru',
      },
      {
        id: 'per-sacsayhuaman',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sacsayhuam%C3%A1n%2C_Cusco%2C_Per%C3%BA%2C_2015-07-31%2C_DD_27.JPG/500px-Sacsayhuam%C3%A1n%2C_Cusco%2C_Per%C3%BA%2C_2015-07-31%2C_DD_27.JPG',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        name: 'סקסייוואמן',
        nameLocal: 'Sacsayhuamán',
        category: 'attraction',
        lat: -13.5078,
        lng: -71.9822,
        description:
          'מצודת אינקה על הגבעה שמעל קוסקו, ובה חומות מאבני ענק מסותתות בדיוק מדהים - חלקן שוקלות עשרות טונות. אפשר להגיע בהליכה מהעיר, ומהמצודה נשקף נוף על הגגות האדומים.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Sacsayhuaman',
      },
      {
        id: 'per-sacredvalley',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Urubamba_-_Valle_Sagrado_3.JPG/500px-Urubamba_-_Valle_Sagrado_3.JPG',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        name: 'העמק הקדוש',
        nameLocal: 'Sacred Valley of the Incas',
        category: 'nature',
        lat: -13.3333,
        lng: -72.0833,
        description:
          'עמק נהר אורובמבה בין קוסקו למאצ׳ו פיצ׳ו - נמוך וחמים יותר מקוסקו, ולכן גם נוח יותר להתאקלמות. לאורכו כפרים, מדרגות חקלאות אינקאיות ושווקים מקומיים.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Sacred+Valley+Peru',
      },
      {
        id: 'per-ollantaytambo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Ollantaytambo_-_Heiliges_Tal.jpg/500px-Ollantaytambo_-_Heiliges_Tal.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'אולנטייטמבו',
        nameLocal: 'Ollantaytambo',
        category: 'attraction',
        lat: -13.2581,
        lng: -72.2633,
        description:
          'כפר אינקאי חי שבו עדיין גרים בבתים על יסודות מקוריים, ומעליו מתחם מקדשים ומדרגות שנחשב לאחד ממבצרי האינקה המרשימים. מכאן יוצאות הרכבות למאצ׳ו פיצ׳ו.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Ollantaytambo',
      },
      {
        id: 'per-pisac',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Pisac_-_panoramio_%282%29.jpg/500px-Pisac_-_panoramio_%282%29.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'פיסק - שוק ומדרגות',
        nameLocal: 'Písac',
        category: 'attraction',
        lat: -13.4242,
        lng: -71.8578,
        description:
          'כפר בכניסה לעמק הקדוש, מפורסם בשוק הצבעוני שלו ובמתחם האינקה שעל הרכס מעליו - מדרגות חקלאות ענקיות שנראות כמו מניפה בצלע ההר.',
        rating: 4.5,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Pisac',
      },
      {
        id: 'per-moray',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Moray_-_Qechuyoq.JPG/500px-Moray_-_Qechuyoq.JPG',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        name: 'מוראי - המדרגות המעגליות',
        nameLocal: 'Moray',
        category: 'attraction',
        lat: -13.3293,
        lng: -72.1964,
        description:
          'מתחם מדרגות חקלאיות מעגליות שנחפרו זו בתוך זו, ובכל טבעת טמפרטורה מעט שונה - ההשערה המקובלת היא שזה היה מעין מעבדה חקלאית של האינקה.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Moray+Peru',
      },
      {
        id: 'per-maras',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Salineras_de_Maras%2C_Maras%2C_Per%C3%BA%2C_2015-07-30%2C_DD_03-07_PAN.JPG/500px-Salineras_de_Maras%2C_Maras%2C_Per%C3%BA%2C_2015-07-30%2C_DD_03-07_PAN.JPG',
        tags: ['outdoors', 'foodie'],
        priceLevel: 1,
        name: 'בריכות המלח של מאראס',
        nameLocal: 'Salineras de Maras',
        category: 'nature',
        lat: -13.3001,
        lng: -72.1562,
        description:
          'אלפי בריכות מלח לבנות מדורגות במורד גיא, שממולאות ממעיין מלוח ומופעלות בידי משפחות מקומיות עוד מימי האינקה. נוף גיאומטרי לבן-ורוד יוצא דופן.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Salineras+de+Maras',
      },
      {
        id: 'per-titicaca',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lake_Titicaca_ESA22522896.jpeg/500px-Lake_Titicaca_ESA22522896.jpeg',
        tags: ['outdoors', 'history'],
        priceLevel: 2,
        name: 'אגם טיטיקקה',
        nameLocal: 'Lake Titicaca',
        category: 'nature',
        lat: -15.825,
        lng: -69.325,
        description:
          'האגם הגדול בדרום אמריקה ואחד הגבוהים בעולם (כ-3,810 מ׳), על הגבול עם בוליביה. מהעיר פונו יוצאים אל האיים הצפים של האורוס ואל האיים טקילה ואמנטני. הרחבה של יום-יומיים מקוסקו.',
        rating: 4.5,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Lake+Titicaca+Puno',
      },
      {
        id: 'per-chabad',
        tags: ['foodie'],
        priceLevel: 1,
        name: 'בית חב"ד קוסקו',
        nameLocal: 'Chabad House Cusco',
        category: 'kosher-food',
        lat: -13.5169,
        lng: -71.9786,
        description:
          'בית חב"ד של קוסקו (Calle Vitoque 631), אחד המרכזים הגדולים לישראלים בדרום אמריקה: מסעדה בשרית ומסעדה חלבית עם מטבחים נפרדים, מניינים וארוחות שבת. הסימון על המפה הוא במרכז העיר ולא כתובת מדויקת.',
        kosherNote: 'בהשגחת בית חב"ד קוסקו; שעות בשרי/חלבי נפרדות. לוודא זמינות ושעות מולם.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד קוסקו, פרו',
        },
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Chabad+Cusco',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'קוסקו - התאקלמות לגובה',
        placeIds: ['per-cusco', 'per-chabad'],
        notes:
          'יום ראשון קליל בכוונה: הליכה בפלאזה דה ארמס וברובע סן בלאס, הרבה מים ומנוחה. קוסקו בגובה 3,400 מ׳ - לא לתכנן מאמץ ביום הראשון.',
      },
      {
        day: 2,
        title: 'סקסייוואמן והעמק הקדוש',
        placeIds: ['per-sacsayhuaman', 'per-pisac', 'per-sacredvalley'],
        notes:
          'עולים למצודת סקסייוואמן, ומשם יורדים אל העמק הקדוש - שוק פיסק ומתחם המדרגות שמעליו. העמק נמוך מקוסקו וקל יותר לנשימה.',
      },
      {
        day: 3,
        title: 'מוראי, מאראס ואולנטייטמבו',
        placeIds: ['per-moray', 'per-maras', 'per-ollantaytambo'],
        notes:
          'מדרגות מוראי המעגליות ובריכות המלח של מאראס, ולינה באולנטייטמבו - משם יוצאת הרכבת המוקדמת למאצ׳ו פיצ׳ו.',
      },
      {
        day: 4,
        title: 'מאצ׳ו פיצ׳ו',
        placeIds: ['per-machupicchu'],
        notes:
          'רכבת מוקדמת לאגואס קליינטס ואוטובוס במעלה ההר. הכרטיס הוא למסלול ולשעה מוגדרים - לקנות שבועות מראש, ולוודא איזה מסלול נבחר.',
      },
      {
        day: 5,
        title: 'אגם הומנטאי או הר הקשת',
        placeIds: ['per-humantay', 'per-vinicunca'],
        notes:
          'יום הליכה בגובה - בוחרים אחד: אגם הומנטאי הקרחוני, או ויניקונקה בצבעי הקשת. שניהם יוצאים לפנות בוקר ודורשים התאקלמות מוקדמת.',
      },
      {
        day: 6,
        title: 'הרחבה: אגם טיטיקקה',
        placeIds: ['per-titicaca'],
        notes:
          'למי שיש עוד יומיים: נסיעה לפונו (אוטובוס תיירים או רכבת) וסיור באיים הצפים של האורוס ובכפרי האגם.',
      },
    ],
    practical: {
      flights:
        'אין טיסה ישירה מנתב"ג לפרו. טסים עם החלפה אחת או שתיים - בדרך כלל דרך מדריד, פרנקפורט, אמסטרדם, ניו יורק או פנמה סיטי אל לימה (LIM), ומשם טיסה פנימית של כשעה וחצי לקוסקו (CUZ). סך הדרך: כ-20-26 שעות.',
      gettingAround:
        'בקוסקו הכול בהליכה או במונית זולה. לעמק הקדוש - קולקטיבו (מיניבוס), טיול מאורגן או נהג פרטי ליום. למאצ׳ו פיצ׳ו יש רק רכבת (PeruRail / IncaRail) מאולנטייטמבו או מקוסקו, ואז אוטובוס תלול. לטיולי ההליכה בגובה יוצאים עם סוכנות מקומית לפנות בוקר.',
      kosherOverview:
        'לקוסקו יש בית חב"ד גדול ופעיל - עם מסעדה בשרית ומסעדה חלבית במטבחים נפרדים, מניינים וארוחות שבת - וזו כתובת הכשרות המרכזית באזור, פופולרית מאוד בקרב מטיילים ישראלים. מחוץ לקוסקו (העמק הקדוש, אגואס קליינטס, פונו) אין כשרות מסודרת: כדאי לצאת מצוידים, והאוכל הצמחוני בפרו נגיש ומגוון.',
    },
  },
  {
    slug: 'queenstown',
    name: 'קווינסטאון והאי הדרומי',
    nameLocal: 'Queenstown & the South Island',
    countrySlug: 'new-zealand',
    flag: '🇳🇿',
    center: { lat: -44.5, lng: 168.8 },
    zoom: 7,
    tagline: 'פיורדים, קרחונים ואגמים - בירת הטבע והאדרנלין',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Milford_Sound_%28New_Zealand%29.JPG/500px-Milford_Sound_%28New_Zealand%29.JPG',
    iconicLandmark: {
      name: 'מילפורד סאונד',
      nameLocal: 'Milford Sound / Piopiotahi',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Milford_Sound_%28New_Zealand%29.JPG/500px-Milford_Sound_%28New_Zealand%29.JPG',
      blurb:
        'פיורד באורך כ-15 ק"מ בלב פארק פיורדלנד, שקירותיו מתנשאים ישירות מהמים לגובה של מאות מטרים - ובראשם פסגת מיטר פיק וכמה מהמפלים הגבוהים בניו זילנד.',
    },
    editorialRating: {
      score: 4.8,
      verdict:
        'אחד מאזורי הטבע היפים בעולם, עם תשתית מטיילים מצוינת ובטיחות גבוהה, ובקווינסטאון אפילו בית חב"ד לישראלים. חסרונות: הטיסה הארוכה ביותר מישראל (שתי החלפות, כ-30 שעות), עלויות גבוהות, ומזג אוויר שמשתנה בלי הודעה - במיוחד בפיורדלנד הגשום.',
    },
    summary:
      'קווינסטאון יושבת על גדת אגם ואקטיפו בין רכסי הרים, והיא נקודת המוצא לטבע של האי הדרומי: פיורד מילפורד סאונד ודאוטפול סאונד, מסלולי ההליכה של פיורדלנד ומאונט אספיירינג, אגמי הטורקיז פוקאקי וטקאפו למרגלות הר קוק, וקרחון פרנץ יוזף בחוף המערבי. זו גם בירת ספורט האתגרי של ניו זילנד - וגם עיר קטנה ונוחה עם בית חב"ד פעיל.',
    bestSeason:
      'דצמבר-פברואר (קיץ דרומי - ימים ארוכים, כל המסלולים פתוחים) · מרץ-אפריל שקט ויפה · יוני-אוגוסט חורף וסקי, חלק ממסלולי ההליכה סגורים או דורשים ציוד אלפיני',
    places: [
      {
        id: 'nzl-milford',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Milford_Sound_%28New_Zealand%29.JPG/500px-Milford_Sound_%28New_Zealand%29.JPG',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'מילפורד סאונד',
        nameLocal: 'Milford Sound / Piopiotahi',
        category: 'nature',
        lat: -44.648,
        lng: 167.9056,
        description:
          'הפיורד המפורסם של ניו זילנד: קירות סלע אנכיים, מפלים שיורדים היישר לים, כלבי ים ולעתים דולפינים. השיט אורך כשעתיים, והדרך אליו מטה אנאו היא אחת הנסיעות היפות במדינה.',
        rating: 4.8,
        durationMin: 600,
        externalUrl: 'https://maps.google.com/?q=Milford+Sound',
      },
      {
        id: 'nzl-fiordland',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hollyford_River_NZ_11.jpg/500px-Hollyford_River_NZ_11.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'פארק פיורדלנד',
        nameLocal: 'Fiordland National Park',
        category: 'nature',
        lat: -45.4167,
        lng: 167.7167,
        description:
          'הפארק הלאומי הגדול בניו זילנד, אתר מורשת עולמית: יערות גשם ממוזגים, פיורדים, אגמים ומסלולי הליכה מפורסמים. אחד האזורים הגשומים בעולם - להתארגן לגשם בכל עונה.',
        rating: 4.8,
        durationMin: 720,
        externalUrl: 'https://maps.google.com/?q=Fiordland+National+Park',
      },
      {
        id: 'nzl-doubtful',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Doubtful_Sound_Clear.jpg/500px-Doubtful_Sound_Clear.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 3,
        name: 'דאוטפול סאונד',
        nameLocal: 'Doubtful Sound / Patea',
        category: 'nature',
        lat: -45.3167,
        lng: 166.9833,
        description:
          'הפיורד השני בגודלו, גדול ושקט בהרבה ממילפורד - מגיעים אליו בשילוב של שיט על אגם מנפורי ונסיעה בכביש הרים. פחות מבקרים, יותר תחושה של סוף העולם.',
        rating: 4.7,
        durationMin: 600,
        externalUrl: 'https://maps.google.com/?q=Doubtful+Sound',
      },
      {
        id: 'nzl-routeburn',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Tarn_at_Key_Summit%2C_a_side_track_on_the_Routeburn_Track.jpg/500px-Tarn_at_Key_Summit%2C_a_side_track_on_the_Routeburn_Track.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'מסלול רוטבורן',
        nameLocal: 'Routeburn Track',
        category: 'nature',
        lat: -44.727,
        lng: 168.1703,
        description:
          'אחד מ"ההליכות הגדולות" של ניו זילנד: כ-33 ק"מ בין פיורדלנד למאונט אספיירינג, אגמים אלפיניים ורכסים. אפשר גם ללכת רק את קטע קי סאמיט כטיול יום מהצד של טה אנאו.',
        rating: 4.8,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Routeburn+Track',
      },
      {
        id: 'nzl-queenstown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Queenstown_1_%288168013172%29.jpg/500px-Queenstown_1_%288168013172%29.jpg',
        tags: ['outdoors', 'foodie'],
        priceLevel: 2,
        mustSee: true,
        name: 'קווינסטאון',
        nameLocal: 'Queenstown',
        category: 'attraction',
        lat: -45.0311,
        lng: 168.6625,
        description:
          'עיירת נופש על גדת אגם ואקטיפו, מוקפת רכס "הרימוטקבלס" - בסיס נוח לכל טיולי האזור, וגם בירת ספורט האתגר של המדינה (בנג׳י, פאראגליידינג, סקי בחורף).',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Queenstown+New+Zealand',
      },
      {
        id: 'nzl-wakatipu',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/LakeWakatipuNov172024_02.jpg/500px-LakeWakatipuNov172024_02.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        name: 'אגם ואקטיפו',
        nameLocal: 'Lake Wakatipu',
        category: 'nature',
        lat: -45.05,
        lng: 168.5,
        description:
          'אגם קרחוני בצורת ברק באורך כ-80 ק"מ, שמימיו צלולים וקרים. סביבו שבילי הליכה ואופניים, ובקצהו הצפוני הכפר גלנורקי עם אחד הנופים המצולמים במדינה.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Lake+Wakatipu',
      },
      {
        id: 'nzl-wanaka',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/LakeWanakaNov262024_01.jpg/500px-LakeWanakaNov262024_01.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'ואנאקה',
        nameLocal: 'Wānaka',
        category: 'nature',
        lat: -44.7,
        lng: 169.15,
        description:
          'עיירת אגם רגועה מקווינסטאון, כשעה נסיעה משם: טיילת, העץ הבודד שצומח במים, ומסלול הטיפוס הפופולרי רוי׳ס פיק עם נוף פנורמי על האגם וההרים.',
        rating: 4.7,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Wanaka',
      },
      {
        id: 'nzl-aspiring',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Matukituki_valley.jpg/500px-Matukituki_valley.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'פארק מאונט אספיירינג',
        nameLocal: 'Mount Aspiring National Park',
        category: 'nature',
        lat: -44.3833,
        lng: 168.7333,
        description:
          'פארק אלפיני של עמקים קרחוניים, נהרות טורקיז ופסגות - חלק מאתר המורשת העולמית טה ואהיפונאמו. מעמק מטוקיטוקי יוצאים מסלולי יום יפים כמו רוב רוי גלייסייר.',
        rating: 4.7,
        durationMin: 420,
        externalUrl: 'https://maps.google.com/?q=Mount+Aspiring+National+Park',
      },
      {
        id: 'nzl-cook',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Mt_Cook_LC0247.jpg/500px-Mt_Cook_LC0247.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'אאורקי - הר קוק',
        nameLocal: 'Aoraki / Mount Cook',
        category: 'nature',
        lat: -43.595,
        lng: 170.1419,
        description:
          'הפסגה הגבוהה בניו זילנד (3,724 מ׳) ובמרכז פארק לאומי של קרחונים ואגמי קרח. מסלול הוקי ואלי הקל (כ-3 שעות הלוך-חזור) מגיע אל אגם עם קרחונים צפים - מהטיולים היפים במדינה.',
        rating: 4.8,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Aoraki+Mount+Cook',
      },
      {
        id: 'nzl-pukaki',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/LakePukakiNov232024_01.jpg/500px-LakePukakiNov232024_01.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        name: 'אגם פוקאקי',
        nameLocal: 'Lake Pukaki',
        category: 'nature',
        lat: -44.1167,
        lng: 170.1667,
        description:
          'אגם קרחוני בצבע תכלת-חלבי בלתי נתפס, שנוצר מקמח סלעים של הקרחונים - ומעליו נשקף הר קוק. נקודות התצפית לאורך הכביש הן עצירה חובה בדרך צפונה.',
        rating: 4.8,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Lake+Pukaki',
      },
      {
        id: 'nzl-tekapo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/LakeTekapoNov242024_05.jpg/500px-LakeTekapoNov242024_05.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'אגם טקאפו',
        nameLocal: 'Lake Tekapo',
        category: 'nature',
        lat: -43.8833,
        lng: 170.5167,
        description:
          'אגם טורקיז עם כנסיית הרועה הטוב הקטנה על שפתו, ובקיץ שדות לופין סגולים. האזור הוא שמורת שמיים כהים - אחד המקומות הטובים בעולם לצפייה בכוכבים.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Lake+Tekapo',
      },
      {
        id: 'nzl-franzjosef',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Franz_josef_Glacier_LC0250.jpg/500px-Franz_josef_Glacier_LC0250.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'קרחון פרנץ יוזף',
        nameLocal: 'Franz Josef Glacier / Kā Roimata o Hine Hukatere',
        category: 'nature',
        lat: -43.4669,
        lng: 170.1917,
        description:
          'קרחון שיורד מהאלפים הדרומיים כמעט עד ליער הגשם בחוף המערבי. מהעמק אפשר להגיע לתצפית ברגל; הליכה על הקרח עצמו נעשית רק בטיסת מסוק עם מדריכים.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Franz+Josef+Glacier',
      },
      {
        id: 'nzl-chabad',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'בית חב"ד קווינסטאון',
        nameLocal: 'Chabad Queenstown',
        category: 'kosher-food',
        lat: -45.0311,
        lng: 168.6625,
        description:
          'בית חב"ד שפועל בקווינסטאון עבור המטיילים באי הדרומי: ארוחות שבת, מניינים ואוכל כשר בתיאום מראש. לא אותרה כתובת רשמית מאומתת - הסימון הוא במרכז העיר, וכדאי לתאם ישירות מולם.',
        kosherNote: 'ארוחות ואוכל כשר בהזמנה מראש בלבד; לוודא מיקום, שעות והשגחה ישירות מול בית חב"ד.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד קווינסטאון, ניו זילנד',
        },
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Chabad+Queenstown',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'קווינסטאון והאגם',
        placeIds: ['nzl-queenstown', 'nzl-wakatipu', 'nzl-chabad'],
        notes:
          'יום התאוששות מהטיסה הארוכה: טיילת קווינסטאון, רכבל לתצפית בוב׳ס פיק ונסיעה קצרה לגלנורקי. ארוחת ערב כשרה בתיאום מראש.',
      },
      {
        day: 2,
        title: 'מילפורד סאונד',
        placeIds: ['nzl-milford', 'nzl-fiordland'],
        notes:
          'יום ארוך: יוצאים מוקדם דרך טה אנאו, שיט בפיורד וחזרה. אפשר גם ללון בטה אנאו כדי לקצר את הנסיעה.',
      },
      {
        day: 3,
        title: 'הליכה בפיורדלנד',
        placeIds: ['nzl-routeburn', 'nzl-doubtful'],
        notes:
          'בוחרים: הליכת יום בקטע קי סאמיט של מסלול רוטבורן, או יום שלם בדאוטפול סאונד השקט. שניהם דורשים הזמנה מראש בעונה.',
      },
      {
        day: 4,
        title: 'ואנאקה ומאונט אספיירינג',
        placeIds: ['nzl-wanaka', 'nzl-aspiring'],
        notes:
          'נסיעה נופית לוואנאקה, טיפוס לרוי׳ס פיק למי שכשיר, ואחר הצהריים עמק מטוקיטוקי בפארק מאונט אספיירינג.',
      },
      {
        day: 5,
        title: 'אגמי הטורקיז והר קוק',
        placeIds: ['nzl-pukaki', 'nzl-cook', 'nzl-tekapo'],
        notes:
          'נוסעים צפונה לאורך אגם פוקאקי אל פארק אאורקי - מסלול הוקי ואלי אל אגם הקרחונים - וסיום באגם טקאפו לצפייה בכוכבים.',
      },
      {
        day: 6,
        title: 'החוף המערבי והקרחון',
        placeIds: ['nzl-franzjosef'],
        notes:
          'הרחבה לחוף המערבי: יער גשם, חופים פראיים וקרחון פרנץ יוזף. הנסיעה ארוכה - עדיף לשלב עם לינה באזור.',
      },
    ],
    practical: {
      flights:
        'אין ולא הייתה טיסה ישירה מנתב"ג לניו זילנד - זו הטיסה הארוכה ביותר לישראלים: בדרך כלל שתי החלפות (למשל דרך דובאי/דוחא/בנגקוק/סינגפור ואז אוקלנד או סידני), כ-28-32 שעות סה"כ. מאוקלנד יש טיסה פנימית של כשעתיים לקווינסטאון (ZQN), ויש גם קווים ישירים מסידני ומלבורן.',
      gettingAround:
        'רכב שכור או קמפרוואן הם הדרך המעשית היחידה לטייל באי הדרומי - המרחקים גדולים והתחבורה הציבורית דלילה. נוסעים בצד שמאל, הכבישים צרים ומפותלים, ולתדלוק ולקניות כדאי לעצור בערים - יש קטעים ארוכים בלי כלום.',
      kosherOverview:
        'בקווינסטאון פועל בית חב"ד שמשרת את המטיילים באי הדרומי - ארוחות שבת ואוכל כשר בהזמנה מראש; בערים הגדולות (אוקלנד, וולינגטון, כרייסטצ׳רץ׳) יש קהילות ואפשרויות כשרות נוספות. מחוץ לזה אין באי הדרומי כשרות מסודרת - כדאי להצטייד בסופרמרקטים גדולים, שבהם יש מוצרים ארוזים עם סימון כשרות בינלאומי, ולוודא הכול מראש.',
    },
  },
  {
    slug: 'grand-canyon',
    name: 'הגרנד קניון ופארקי הדרום-מערב',
    nameLocal: 'Grand Canyon & the American Southwest',
    countrySlug: 'usa',
    flag: '🇺🇸',
    center: { lat: 36.8, lng: -112.0 },
    zoom: 6,
    tagline: 'קניונים אדומים, קשתות אבן ומדבר - הרוד טריפ הקלאסי',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Dawn_on_the_S_rim_of_the_Grand_Canyon_%288645178272%29.jpg/500px-Dawn_on_the_S_rim_of_the_Grand_Canyon_%288645178272%29.jpg',
    iconicLandmark: {
      name: 'הגרנד קניון',
      nameLocal: 'Grand Canyon',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Dawn_on_the_S_rim_of_the_Grand_Canyon_%288645178272%29.jpg/500px-Dawn_on_the_S_rim_of_the_Grand_Canyon_%288645178272%29.jpg',
      blurb:
        'קניון באורך כ-446 ק"מ ובעומק של יותר מקילומטר, שחצב נהר הקולורדו בסלעים בני מיליוני שנים - אתר מורשת עולמית ואחד הנופים המזוהים ביותר עם אמריקה.',
    },
    editorialRating: {
      score: 4.8,
      verdict:
        'ריכוז נדיר של פארקים לאומיים ברמה עולמית במרחק נסיעה סביר זה מזה, עם תשתית מצוינת - ובלאס וגאס יש תשתית כשרות אמיתית לפני ואחרי. חסרונות: חובה רכב שכור ומרחקים ארוכים, הקיץ לוהט (מעל 40 מעלות), וכניסות פופולריות דורשות הזמנת מקום מראש.',
    },
    summary:
      'הדרום-מערב האמריקאי הוא הרוד טריפ הקלאסי של חובבי טבע: הגרנד קניון, זאיון עם נחל הנרוז, מגדלי האבן של ברייס קניון, הקשתות של ארצ׳ס וקניונלנדס, וקניון האנטלופה והורסשו בנד ליד אגם פאוול. הבסיס הנוח הוא לאס וגאס - ממנה יוצאים ואליה חוזרים, וגם בה מרוכזת הכשרות באזור.',
    bestSeason:
      'אפריל-מאי ואוקטובר-נובמבר (מזג אוויר נוח לטיולים) · בקיץ חום קיצוני בקניונים הנמוכים ובמדבר · בחורף שלג בברייס ובשפה הצפונית של הגרנד קניון (חלקה נסגר)',
    places: [
      {
        id: 'usa-grandcanyon',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Dawn_on_the_S_rim_of_the_Grand_Canyon_%288645178272%29.jpg/500px-Dawn_on_the_S_rim_of_the_Grand_Canyon_%288645178272%29.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'הפארק הלאומי גרנד קניון',
        nameLocal: 'Grand Canyon National Park',
        category: 'nature',
        lat: 36.0553,
        lng: -112.1218,
        description:
          'הקניון הגדול של נהר הקולורדו - יותר מקילומטר עומק ורוחב של עשרות קילומטרים. רוב המבקרים מגיעים לשפה הדרומית (פתוחה כל השנה) עם תצפיות, שאטלים ומסלולים כמו בּרייט אנג׳ל שיורדים לתוך הקניון.',
        rating: 4.9,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Grand+Canyon+National+Park',
      },
      {
        id: 'usa-zion',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Zion_angels_landing_view.jpg/500px-Zion_angels_landing_view.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'הפארק הלאומי זאיון',
        nameLocal: 'Zion National Park',
        category: 'nature',
        lat: 37.3,
        lng: -113.05,
        description:
          'קניון אבן חול אדומה עם קירות אנכיים גבוהים, ובו שני מסלולים מפורסמים: הנרוז - הליכה בתוך הנחל בין קירות צרים, ואנג׳לס לנדינג התלול (דורש אישור בהגרלה). בעונה נכנסים לקניון רק בשאטל.',
        rating: 4.8,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Zion+National+Park',
      },
      {
        id: 'usa-bryce',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Inspiration_Point_Bryce_Canyon_November_2018_panorama.jpg/500px-Inspiration_Point_Bryce_Canyon_November_2018_panorama.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'ברייס קניון',
        nameLocal: 'Bryce Canyon National Park',
        category: 'nature',
        lat: 37.64,
        lng: -112.17,
        description:
          'אמפיתיאטרון טבעי מלא ב"הודוז" - מגדלי אבן כתומים שנוצרו מבליה של קרח ומים. תצפיות סנרייז וסאנסט פוינט לאורך השפה, ומסלול נאבאחו לופ שיורד ביניהם. גבוה וקריר יחסית (מעל 2,400 מ׳).',
        rating: 4.8,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Bryce+Canyon+National+Park',
      },
      {
        id: 'usa-arches',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Delicate_arch_sunset.jpg/500px-Delicate_arch_sunset.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'הפארק הלאומי ארצ׳ס',
        nameLocal: 'Arches National Park',
        category: 'nature',
        lat: 38.6172,
        lng: -109.621,
        description:
          'יותר מאלפיים קשתות אבן טבעיות, ובראשן דליקט ארץ׳ - הקשת שמופיעה על לוחיות הרישוי של יוטה. בעונת השיא נדרשת הזמנת כניסה מראש לשעה מוגדרת.',
        rating: 4.8,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Arches+National+Park',
      },
      {
        id: 'usa-canyonlands',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Green_River_Overlook_Ekker_Butte.jpg/500px-Green_River_Overlook_Ekker_Butte.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'קניונלנדס',
        nameLocal: 'Canyonlands National Park',
        category: 'nature',
        lat: 38.1669,
        lng: -109.7597,
        description:
          'פארק ענק שחצו אותו נהרות הקולורדו והגרין לשלושה אזורים. החלק הנגיש הוא "איילנד אין דה סקיי" - רמה עם תצפיות פנורמיות אל קניונים ומצוקים עד האופק.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Canyonlands+National+Park',
      },
      {
        id: 'usa-antelope',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/USA_Antelope-Canyon.jpg/500px-USA_Antelope-Canyon.jpg',
        tags: ['outdoors', 'art'],
        priceLevel: 2,
        mustSee: true,
        name: 'קניון האנטלופה',
        nameLocal: 'Antelope Canyon',
        category: 'nature',
        lat: 36.862,
        lng: -111.3743,
        description:
          'קניון חריצים צר בסלע אבן חול, שבו קרני האור יוצרות פסים כתומים-סגולים. נמצא בשטח אומת הנאבאחו - הכניסה רק עם סיור מודרך מוסמך ובהזמנה מראש.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Antelope+Canyon',
      },
      {
        id: 'usa-horseshoe',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Grand_Canyon_Horseshoe_Bend.jpg/500px-Grand_Canyon_Horseshoe_Bend.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'הורסשו בנד',
        nameLocal: 'Horseshoe Bend',
        category: 'viewpoint',
        lat: 36.8794,
        lng: -111.5139,
        description:
          'פיתול פרסה של נהר הקולורדו בעומק של כ-300 מטר מתחת לתצפית, ליד העיירה פייג׳. הליכה קצרה מהחניון; אין מעקה בחלק מהשפה - זהירות עם ילדים.',
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Horseshoe+Bend+Page+Arizona',
      },
      {
        id: 'usa-powell',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Lake_Powell_by_Sentinel-2.jpg/500px-Lake_Powell_by_Sentinel-2.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 2,
        name: 'אגם פאוול',
        nameLocal: 'Lake Powell',
        category: 'nature',
        lat: 36.9361,
        lng: -111.4842,
        description:
          'מאגר ענק על נהר הקולורדו שמסתעף למאות קניונים מוצפים בין צוקי אבן חול. אפשר לשוט, לשכור סירה או לבקר בקניון אנטלופה התחתון שבקצהו. מפלס המים משתנה מאוד משנה לשנה.',
        rating: 4.5,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Lake+Powell',
      },
      {
        id: 'usa-monument',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Monument_Valley%2C_Utah%2C_USA_%2823611451292%29.jpg/500px-Monument_Valley%2C_Utah%2C_USA_%2823611451292%29.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 2,
        name: 'מונומנט ואלי',
        nameLocal: 'Monument Valley',
        category: 'nature',
        lat: 36.9833,
        lng: -110.1,
        description:
          'עמק בשטח אומת הנאבאחו שממנו מתנשאים מגדלי אבן חול אדומים - הנוף שהפך לסמל המערב האמריקאי בעשרות סרטים. יש כביש עפר נופי, וסיורים בהדרכת מקומיים לאזורים הסגורים.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Monument+Valley',
      },
      {
        id: 'usa-sedona',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Cathedral_Rock_-_Sedona_AZ-1.jpg/500px-Cathedral_Rock_-_Sedona_AZ-1.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        name: 'סדונה',
        nameLocal: 'Sedona, Arizona',
        category: 'nature',
        lat: 34.8697,
        lng: -111.7611,
        description:
          'עיירה מוקפת צוקי אבן חול אדומים, ומסביבה עשרות מסלולי הליכה ואופניים - קתדרל רוק, דוויל׳ס ברידג׳ ועוד. פופולרית גם בזכות סצנת הספא והאמנות.',
        rating: 4.6,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Sedona+Arizona',
      },
      {
        id: 'usa-deathvalley',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Mesquite_Sand_Dunes_in_Death_Valley.jpg/500px-Mesquite_Sand_Dunes_in_Death_Valley.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'עמק המוות',
        nameLocal: 'Death Valley National Park',
        category: 'nature',
        lat: 36.45,
        lng: -116.85,
        description:
          'הפארק הלאומי הגדול ביבשת: מלחות באדווטר - הנקודה הנמוכה בצפון אמריקה - דיונות חול, מכתשים צבעוניים ותצפית זבריסקי פוינט. בקיץ מהמקומות החמים בעולם; מבקרים בחורף ובאביב.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Death+Valley+National+Park',
      },
      {
        id: 'usa-lasvegas',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Las_Vegas_from_above_%2840064746644%29.jpg/500px-Las_Vegas_from_above_%2840064746644%29.jpg',
        tags: ['nightlife', 'families'],
        priceLevel: 2,
        name: 'לאס וגאס',
        nameLocal: 'Las Vegas',
        category: 'attraction',
        lat: 36.1672,
        lng: -115.1486,
        description:
          'עיר המלונות והמופעים בלב מדבר מוהאבי, ובעיקר - שדה התעופה והבסיס הנוח ביותר לרוד טריפ בפארקים. גם מי שלא בא בשביל הקזינו ימצא כאן מופעים, קניות ואוכל.',
        rating: 4.4,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Las+Vegas',
      },
      {
        id: 'usa-kosher-market',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'סופר כשר בלאס וגאס',
        nameLocal: 'One Stop Kosher Market, S Rainbow Blvd',
        category: 'kosher-market',
        lat: 36.1503,
        lng: -115.2431,
        description:
          'חנות מזון כשרה בשדרות ריינבואו במערב לאס וגאס (3655 S Rainbow Blvd) - נקודת ההצטיידות ההגיונית לפני יציאה לפארקים, שבהם אין שום כשרות. באותו אזור מרוכזות גם המסעדות הכשרות של העיר.',
        kosherNote: 'תחת ועד הכשרות של לאס וגאס (חב"ד דרום נבאדה). לוודא שעות פתיחה והשגחה עדכנית לפני הנסיעה.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'ועד הכשרות של לאס וגאס - חב"ד דרום נבאדה',
        },
        rating: 4.4,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=One+Stop+Kosher+Market+Las+Vegas',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'לאס וגאס - נחיתה והצטיידות',
        placeIds: ['usa-lasvegas', 'usa-kosher-market'],
        notes:
          'לוקחים רכב, ישנים בווגאס ומצטיידים לדרך - כולל קניות במרכול הכשר במערב העיר. בפארקים עצמם אין כשרות ולעתים גם אין חנויות.',
      },
      {
        day: 2,
        title: 'זאיון',
        placeIds: ['usa-zion'],
        notes:
          'כשעתיים וחצי מווגאס. שאטל לתוך הקניון, מסלול קל לאמרלד פולס ולמי שכשיר - הנרוז בתוך המים (לבדוק מזג אוויר, סכנת שיטפונות).',
      },
      {
        day: 3,
        title: 'ברייס קניון',
        placeIds: ['usa-bryce'],
        notes:
          'שעתיים מזאיון. זריחה בסנרייז פוינט, ירידה במסלול נאבאחו לופ בין ההודוז. הפארק גבוה - קר בבוקר גם בקיץ.',
      },
      {
        day: 4,
        title: 'פייג׳ - אנטלופה, הורסשו ואגם פאוול',
        placeIds: ['usa-antelope', 'usa-horseshoe', 'usa-powell'],
        notes:
          'סיור מודרך בקניון האנטלופה (חובה להזמין מראש), תצפית הורסשו בנד, ואחר הצהריים על אגם פאוול.',
      },
      {
        day: 5,
        title: 'מונומנט ואלי',
        placeIds: ['usa-monument'],
        notes:
          'נסיעה מזרחה אל עמק המונומנטים - כביש העפר הנופי או סיור עם מדריך נאבאחו, ושקיעה מול המגדלים.',
      },
      {
        day: 6,
        title: 'מואב - ארצ׳ס וקניונלנדס',
        placeIds: ['usa-arches', 'usa-canyonlands'],
        notes:
          'יום שלם באזור מואב: דליקט ארץ׳ ו"ווינדוז" בארצ׳ס (כניסה מתוזמנת בעונה), ותצפיות איילנד אין דה סקיי בקניונלנדס.',
      },
      {
        day: 7,
        title: 'הגרנד קניון ובחזרה',
        placeIds: ['usa-grandcanyon', 'usa-sedona', 'usa-deathvalley'],
        notes:
          'השפה הדרומית של הגרנד קניון, ובדרך חזרה לווגאס אפשר לשלב את סדונה או להאריך לעמק המוות (בעונה הקרירה בלבד).',
      },
    ],
    practical: {
      flights:
        'יש טיסות ישירות מנתב"ג לניו יורק, מיאמי, בוסטון ולוס אנג׳לס (אל על ואחרות); ללאס וגאס (LAS) אין קו ישיר - טסים עם החלפה אחת בארה"ב, סה"כ כ-17-20 שעות. אפשרות נוספת: לנחות בלוס אנג׳לס ולנסוע ארבע שעות ברכב.',
      gettingAround:
        'רכב שכור הוא חובה מוחלטת - אין תחבורה ציבורית בין הפארקים, והמרחקים גדולים (שעתיים-חמש בין אתר לאתר). כדאי כרטיס שנתי לפארקים (America the Beautiful) אם מבקרים בשלושה ומעלה, להוריד מפות אופליין ולהצטייד במים.',
      kosherOverview:
        'הכשרות באזור מרוכזת בלאס וגאס: מרכול כשר ומסעדות כשרות בצד המערבי של העיר, בפיקוח ועד הכשרות המקומי (חב"ד דרום נבאדה). בפארקים הלאומיים ובעיירות שסביבם אין שום כשרות - הדרך המעשית היא להצטייד בווגאס לכל הטיול, ובסופרמרקטים הגדולים בדרך יש מוצרים ארוזים עם סימוני כשרות אמריקאיים מוכרים.',
    },
  },
  {
    slug: 'high-tatras',
    name: 'הרי הטטרה הגבוהים',
    nameLocal: 'High Tatras / Vysoké Tatry',
    countrySlug: 'slovakia',
    flag: '🇸🇰',
    center: { lat: 49.1, lng: 20.2 },
    zoom: 9,
    tagline: 'האלפים הקטנים של סלובקיה - אגמים קרחוניים ופסגות סלע',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Tatry_Panorama01xxx.jpg/500px-Tatry_Panorama01xxx.jpg',
    iconicLandmark: {
      name: 'שטרבסקה פלסו',
      nameLocal: 'Štrbské Pleso',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Strbske_pleso_from_Krivan.jpg/500px-Strbske_pleso_from_Krivan.jpg',
      blurb:
        'אגם קרחוני בגובה כ-1,346 מ׳ בלב הרי הטטרה, ומסביבו טיילת נוחה ומסלולי הליכה - התמונה המזוהה ביותר עם ההרים הגבוהים של סלובקיה.',
    },
    editorialRating: {
      score: 4.5,
      verdict:
        'הרים אלפיניים אמיתיים במחירים של מזרח אירופה - אגמים קרחוניים, רכבלים ומסלולים מסומנים היטב, ומרחק נסיעה מברטיסלבה או מקרקוב. חסרונות: אין טיסה ישירה לאזור, אין תשתית כשרות, ומזג האוויר בהרים משתנה מהר.',
    },
    summary:
      'הרי הטטרה הגבוהים הם רכס ההרים הצפוני של סלובקיה, על הגבול עם פולין - פסגות סלע חדות מעל 2,600 מ׳, אגמים קרחוניים (פלסא), מפלים ומסלולים מסומנים לכל רמה. בבסיס יושבות עיירות הנופש שטרבסקה פלסו, סטארי סמוקובץ וטטרנסקה לומניצה, ומהן עולים ברכבלים ובפוניקולרים אל הרכסים. באזור גם גן העדן הסלובקי עם נקיקיו, מערות סטלקטיטים וטירת ספיש הענקית.',
    bestSeason:
      'יוני-ספטמבר (מסלולים פתוחים, אגמים נגישים) · דצמבר-מרץ עונת סקי · באביב ובסתיו חלק מהשבילים הגבוהים סגורים - במאי-יוני יש סגירה עונתית של שבילי גובה',
    places: [
      {
        id: 'tat-strbske',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Strbske_pleso_from_Krivan.jpg/500px-Strbske_pleso_from_Krivan.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        mustSee: true,
        name: 'אגם שטרבסקה פלסו',
        nameLocal: 'Štrbské Pleso',
        category: 'nature',
        lat: 49.1167,
        lng: 20.0667,
        description:
          'אגם קרחוני בגובה כ-1,346 מ׳ עם טיילת מעגלית קלה סביבו, סירות בקיץ ומגלשות קפיצות סקי בקרבת מקום. נקודת מוצא נוחה למסלולים אל העמקים הגבוהים.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Strbske+Pleso',
      },
      {
        id: 'tat-popradske',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Mengusovsk%C3%A1_dolina%2C_Vysok%C3%A9_Tatry_%2837%29.JPG/500px-Mengusovsk%C3%A1_dolina%2C_Vysok%C3%A9_Tatry_%2837%29.JPG',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'אגם פופרדסקה פלסו',
        nameLocal: 'Popradské pleso',
        category: 'nature',
        lat: 49.1531,
        lng: 20.0803,
        description:
          'אגם הררי בעמק מנגוסובסקה, בקצה מסלול הליכה נעים של כשעה מהשלוחה של שטרבסקה פלסו. לידו בקתת הרים, ומעליו מתנשאות פסגות הטטרה.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Popradske+pleso',
      },
      {
        id: 'tat-lomnicky',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Lomnicky_stit2.JPG/500px-Lomnicky_stit2.JPG',
        tags: ['outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'פסגת לומניצקי שטיט',
        nameLocal: 'Lomnický štít',
        category: 'viewpoint',
        lat: 49.1958,
        lng: 20.2128,
        description:
          'אחת הפסגות הגבוהות בטטרה (2,634 מ׳), ואליה מגיעים ברכבל תלול מטטרנסקה לומניצה דרך אגם סקלנטה פלסו. למעלה מרפסת תצפית קטנה - הכרטיסים במכסה ובשעות מוגדרות.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Lomnicky+stit',
      },
      {
        id: 'tat-hrebienok',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Hrebienok_18.JPG/500px-Hrebienok_18.JPG',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'הרביינוק והמפלים',
        nameLocal: 'Hrebienok',
        category: 'nature',
        lat: 49.1583,
        lng: 20.2247,
        description:
          'רמה בגובה כ-1,285 מ׳ שאליה עולה פוניקולר קצר מסטארי סמוקובץ, ומשם שביל קל אל מפלי הנחל הקר (Studenovodské vodopády). נקודת פתיחה פופולרית למשפחות.',
        rating: 4.5,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Hrebienok',
      },
      {
        id: 'tat-tatranska',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Tatranska_Lomnica_station.jpg/500px-Tatranska_Lomnica_station.jpg',
        tags: ['families'],
        priceLevel: 1,
        name: 'טטרנסקה לומניצה',
        nameLocal: 'Tatranská Lomnica',
        category: 'attraction',
        lat: 49.1667,
        lng: 20.2833,
        description:
          'עיירת נופש למרגלות הרכבל ללומניצקי שטיט, עם מלונות, מסעדות ומוזיאון הטטרה. בסיס נוח ללינה ולנסיעות יומיות בהרים ברכבת החשמלית הקטנה.',
        rating: 4.3,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Tatranska+Lomnica',
      },
      {
        id: 'tat-raj',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Slovensky_raj-Stratenska_pila.jpg/500px-Slovensky_raj-Stratenska_pila.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'גן העדן הסלובקי',
        nameLocal: 'Slovak Paradise National Park (Slovenský raj)',
        category: 'nature',
        lat: 48.9083,
        lng: 20.4,
        description:
          'פארק לאומי של נקיקים, מפלים ומסלולי סולמות וגשרי ברזל שמטפסים בתוך הנחלים - חוויה של הליכה רטובה ומרגשת. חלק מהמסלולים חד-כיווניים; ציוד ונעליים מתאימות חובה.',
        rating: 4.7,
        durationMin: 420,
        externalUrl: 'https://maps.google.com/?q=Slovensky+raj',
      },
      {
        id: 'tat-demanovska',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Demenovska_jaskyna_slobody-smaragdove_jazierko.jpg/500px-Demenovska_jaskyna_slobody-smaragdove_jazierko.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'מערת החירות בדמנובסקה',
        nameLocal: 'Demänovská Cave of Liberty',
        category: 'nature',
        lat: 48.9986,
        lng: 19.5819,
        description:
          'מערת נטיפים גדולה בעמק דמנובסקה שבהרי טטרה הנמוכים, עם אולמות, בריכות אמרלד ומסלול מבוקר של כשעה. קר בפנים כל השנה - להביא שכבה חמה.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Demanovska+Cave+of+Liberty',
      },
      {
        id: 'tat-spis',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Spissky_hrad_west.jpg/500px-Spissky_hrad_west.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'טירת ספיש',
        nameLocal: 'Spiš Castle (Spišský hrad)',
        category: 'attraction',
        lat: 49.0006,
        lng: 20.7683,
        description:
          'אחד ממתחמי הטירות הגדולים באירופה, על גבעת גיר מעל המישור - אתר מורשת עולמית מהמאה ה-12. חורבות מרשימות ותצפית רחבה; כשעה נסיעה מהטטרה.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Spis+Castle',
      },
      {
        id: 'tat-poprad',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Poprad_centrum_01.JPG/500px-Poprad_centrum_01.JPG',
        tags: ['families'],
        priceLevel: 1,
        name: 'פופרד',
        nameLocal: 'Poprad',
        category: 'attraction',
        lat: 49.0594,
        lng: 20.2975,
        description:
          'העיר הראשית למרגלות הטטרה, ובה שדה התעופה האזורי, תחנת רכבת מרכזית וקומפלקס מים תרמיים גדול - נקודת כניסה ויציאה נוחה לאזור ההרים.',
        rating: 4.2,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Poprad',
      },
      {
        id: 'tat-tatry',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Tatry_Panorama01xxx.jpg/500px-Tatry_Panorama01xxx.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'רכס הטטרה הגבוהה',
        nameLocal: 'High Tatras (Vysoké Tatry)',
        category: 'nature',
        lat: 49.1667,
        lng: 20.1333,
        description:
          'רכס ההרים הגבוה בקרפטים, בין סלובקיה לפולין, עם עשרות פסגות מעל 2,500 מ׳ ורשת שבילים מסומנת. השבילים הגבוהים דורשים כושר, ובחלקם נדרש מדריך הרים מוסמך.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=High+Tatras',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'הגעה ואגם שטרבסקה פלסו',
        placeIds: ['tat-poprad', 'tat-strbske'],
        notes:
          'מגיעים לאזור פופרד, ועולים לשטרבסקה פלסו לסיבוב קל סביב האגם והתאקלמות לגובה ולמזג האוויר ההררי.',
      },
      {
        day: 2,
        title: 'עמקים ואגמים',
        placeIds: ['tat-popradske', 'tat-tatry'],
        notes:
          'הליכה אל אגם פופרדסקה פלסו ובחזרה, ולמי שכשיר - המשך אל אחד העמקים הגבוהים. לבדוק תחזית בבוקר.',
      },
      {
        day: 3,
        title: 'רכבלים ומפלים',
        placeIds: ['tat-lomnicky', 'tat-hrebienok', 'tat-tatranska'],
        notes:
          'רכבל אל פסגת לומניצקי שטיט (כרטיס מראש), ואחר הצהריים פוניקולר להרביינוק ושביל המפלים הקל.',
      },
      {
        day: 4,
        title: 'גן העדן הסלובקי',
        placeIds: ['tat-raj'],
        notes:
          'יום שלם בנקיקים: מסלולי סולמות וגשרים לאורך הנחלים. נעליים טובות, ביגוד שיכול להירטב ותכנון מסלול חד-כיווני מראש.',
      },
      {
        day: 5,
        title: 'מערות וטירה',
        placeIds: ['tat-demanovska', 'tat-spis'],
        notes:
          'בוקר במערת החירות שבטטרה הנמוכה, ואחר הצהריים טירת ספיש - סיום היסטורי לפני היציאה.',
      },
    ],
    practical: {
      flights:
        'אין טיסה ישירה מנתב"ג לאזור הטטרה. המסלול המעשי: טיסה ישירה לברטיסלבה או לווינה ומשם כ-4 שעות נסיעה/רכבת, או טיסה לקרקוב שבפולין (כשעתיים וחצי נסיעה) ולעתים לקושיצה עם החלפה. לפופרד יש שדה תעופה אזורי קטן (TAT) עם קווים אירופיים מעטים.',
      gettingAround:
        'בין עיירות הנופש שבמורדות הטטרה נוסעת רכבת חשמלית קטנה (TEŽ) בתדירות טובה, ויש אוטובוסים ורכבלים לאתרים. לגן העדן הסלובקי, למערות ולטירת ספיש - רכב שכור נוח בהרבה. חלק מהשבילים הגבוהים סגורים עונתית, וכניסה למסלולים מסוימים דורשת מדריך.',
      kosherOverview:
        'אין באזור הטטרה כשרות מסודרת - לא מסעדה ולא חנות. הכשרות הקרובה היא בברטיסלבה (בית חב"ד) או בקרקוב, שתיהן במרחק נסיעה של שעות. מי שמקפיד - להצטייד מראש; בסופרמרקטים הגדולים יש מוצרים ארוזים עם סימון כשרות אירופי, ולוודא לפי הסימון עצמו.',
    },
  },
  {
    slug: 'bohemian-switzerland',
    name: 'שווייץ הבוהמית',
    nameLocal: 'Bohemian Switzerland / České Švýcarsko',
    countrySlug: 'czechia',
    flag: '🇨🇿',
    center: { lat: 50.85, lng: 14.22 },
    zoom: 11,
    tagline: 'שערי סלע, נקיקים ויערות - שעה וחצי מפראג',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Pravcicka_brana_001.jpg/500px-Pravcicka_brana_001.jpg',
    iconicLandmark: {
      name: 'שער פראבצ׳יצה',
      nameLocal: 'Pravčická brána',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Prav%C4%8Dick%C3%A1_br%C3%A1na_%28Prebischtor%29_-_by_Pudelek.jpg/500px-Prav%C4%8Dick%C3%A1_br%C3%A1na_%28Prebischtor%29_-_by_Pudelek.jpg',
      blurb:
        'שער הסלע הטבעי הגדול באירופה - קשת אבן חול ברוחב של כ-26 מטר שמתנשאת מעל היערות, וסמלו של הפארק הלאומי שווייץ הבוהמית.',
    },
    editorialRating: {
      score: 4.5,
      verdict:
        'טבע דרמטי במרחק שעה וחצי מפראג, עם שבילים מסומנים היטב ותחבורה ציבורית שמגיעה לשם - שילוב מצוין עם עיר. חסרונות: האזור נפגע קשה בשריפת הענק של 2022 וחלק מהשבילים עדיין משתנים, אין כשרות באזור, וביקורי סוף שבוע צפופים מאוד.',
    },
    summary:
      'שווייץ הבוהמית היא פארק לאומי בצפון צ׳כיה, על גבול גרמניה: מגדלי אבן חול, יערות אורנים ונקיקים שנחל קמניצה חצב בהם - ובמרכזה שער פראבצ׳יצה, קשת הסלע הטבעית הגדולה באירופה. מגיעים מפראג בשעה וחצי, ואפשר לשלב עם הצד הגרמני של הרכס (שווייץ הסקסונית) ועם העיר דצ׳ין שעל נהר האלבה.',
    bestSeason:
      'מאי-אוקטובר (שבילים ושיט בנקיקים פעילים; השיט לרוב אינו פועל בחורף) · ספטמבר-אוקטובר יפים במיוחד בצבעי הסתיו · אחרי גשמים חלק מהשבילים חלקלקים',
    places: [
      {
        id: 'cbs-pravcicka',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Prav%C4%8Dick%C3%A1_br%C3%A1na_%28Prebischtor%29_-_by_Pudelek.jpg/500px-Prav%C4%8Dick%C3%A1_br%C3%A1na_%28Prebischtor%29_-_by_Pudelek.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'שער פראבצ׳יצה',
        nameLocal: 'Pravčická brána',
        category: 'nature',
        lat: 50.8838,
        lng: 14.2815,
        description:
          'קשת האבן הטבעית הגדולה באירופה, ברוחב כ-26 מ׳ ובגובה כ-16 מ׳. עולים אליה בשביל יער של כשעה מהז׳נסקו; לצדה מבנה היסטורי עם מרפסת תצפית. אסור לטפס על הקשת עצמה.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Pravcicka+brana',
      },
      {
        id: 'cbs-park',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Pravcicka_brana_001.jpg/500px-Pravcicka_brana_001.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'הפארק הלאומי שווייץ הבוהמית',
        nameLocal: 'České Švýcarsko National Park',
        category: 'nature',
        lat: 50.8333,
        lng: 14.25,
        description:
          'פארק לאומי של מגדלי אבן חול, יערות ונקיקים לאורך הגבול עם גרמניה, עם רשת שבילים מסומנת לכל הרמות. בקיץ 2022 נשרפו כאן שטחים גדולים - חלק מהמסלולים שוקמו ונפתחו מחדש, וכדאי לבדוק מצב עדכני לפני היציאה.',
        rating: 4.6,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Ceske+Svycarsko+National+Park',
      },
      {
        id: 'cbs-kamenice',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/H%C5%99ensko_2007-5.jpg/500px-H%C5%99ensko_2007-5.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'נקיקי נחל קמניצה',
        nameLocal: 'Kamenice Gorges (Edmundova soutěska)',
        category: 'nature',
        lat: 50.8742,
        lng: 14.2361,
        description:
          'נקיקים צרים ועמוקים שחצב נחל קמניצה בסלע, ובהם קטע שעוברים בסירה שטוחה עם שייט מקומי בין קירות אנכיים. חלק מהשביל חצוב במדפי ברזל מעל המים.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Edmundova+souteska',
      },
      {
        id: 'cbs-hrensko',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/H%C5%99ensko%2C_okres_D%C4%9B%C4%8D%C3%ADn.jpg/500px-H%C5%99ensko%2C_okres_D%C4%9B%C4%8D%C3%ADn.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'הז׳נסקו',
        nameLocal: 'Hřensko',
        category: 'attraction',
        lat: 50.8744,
        lng: 14.2425,
        description:
          'הכפר הנמוך ביותר בצ׳כיה, במפגש נחל קמניצה עם האלבה ובדיוק על הגבול הגרמני - נקודת המוצא לשער פראבצ׳יצה ולנקיקים, עם חניונים, מסעדות ותחנת אוטובוס.',
        rating: 4.2,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Hrensko',
      },
      {
        id: 'cbs-jetrichovice',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Jet%C5%99ichovice.jpg/500px-Jet%C5%99ichovice.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'ייטז׳יחוביצה והתצפיות',
        nameLocal: 'Jetřichovice',
        category: 'viewpoint',
        lat: 50.8525,
        lng: 14.3939,
        description:
          'כפר קטן שממנו יוצא מסלול מעגלי אל שלוש תצפיות סלע מפורסמות (מריה, וילהלמינה ורודולף) - מדרגות וסולמות קצרים בין מגדלי אבן חול, ונוף אל הרכס כולו.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Jetrichovice',
      },
      {
        id: 'cbs-tisa',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Tisk%C3%A9_st%C4%9Bny%2C_v%C3%BDhled_na_Tisou%2C_2020.jpg/500px-Tisk%C3%A9_st%C4%9Bny%2C_v%C3%BDhled_na_Tisou%2C_2020.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'סלעי טיסא',
        nameLocal: 'Tiské stěny (Tisá Rocks)',
        category: 'nature',
        lat: 50.7844,
        lng: 14.0314,
        description:
          'מבוך טבעי של קירות ומגדלי אבן חול עם שבילים צרים בין הסלעים - קל, כיפי במיוחד לילדים, וצולם בסרטי "נרניה". פחות מוכר לתיירים מהפארק עצמו.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Tiske+steny',
      },
      {
        id: 'cbs-decin',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/D%C4%9B%C4%8D%C3%ADn_%28Tetschen%29%2C_Czech_Republic.jpg/500px-D%C4%9B%C4%8D%C3%ADn_%28Tetschen%29%2C_Czech_Republic.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'דצ׳ין',
        nameLocal: 'Děčín',
        category: 'attraction',
        lat: 50.7736,
        lng: 14.1961,
        description:
          'עיר על נהר האלבה בשער האזור, ובה ארמון על סלע עם "גן הוורדים" ותצפית, ורכבות ישירות מפראג. בסיס נוח למי שמעדיף ללון בעיר ולא בכפר.',
        rating: 4.2,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Decin',
      },
      {
        id: 'cbs-bastei',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Rathen_und_Elbsandsteingebirge_asv2022-08_img04.jpg/500px-Rathen_und_Elbsandsteingebirge_asv2022-08_img04.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'באסטיי (הצד הגרמני)',
        nameLocal: 'Bastei, Saxon Switzerland',
        category: 'viewpoint',
        lat: 50.9622,
        lng: 14.0714,
        description:
          'תצפית מפורסמת מעל נהר האלבה בצד הגרמני של רכס האבן החול, ובה גשר אבן מהמאה ה-19 בין מגדלי סלע. כחצי שעה נסיעה מהז׳נסקו - חוצים גבול בתוך מרחב שנגן.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Bastei+Bridge',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'שער הסלע והנקיקים',
        placeIds: ['cbs-hrensko', 'cbs-pravcicka', 'cbs-kamenice'],
        notes:
          'מגיעים להז׳נסקו, עולים לשער פראבצ׳יצה ויורדים לנקיקי קמניצה כולל קטע השיט. יום הליכה מלא - נעליים טובות ומים.',
      },
      {
        day: 2,
        title: 'תצפיות הסלע של ייטז׳יחוביצה',
        placeIds: ['cbs-jetrichovice', 'cbs-park'],
        notes:
          'מסלול מעגלי בין תצפיות מריה, וילהלמינה ורודולף, ואחר הצהריים שביל נוסף בפארק לפי מצב השבילים המעודכן.',
      },
      {
        day: 3,
        title: 'טיסא ודצ׳ין',
        placeIds: ['cbs-tisa', 'cbs-decin'],
        notes:
          'בוקר במבוך הסלעים של טיסא (קל ומתאים למשפחות), ואחר הצהריים ארמון דצ׳ין וגן הוורדים לפני החזרה לפראג.',
      },
      {
        day: 4,
        title: 'הרחבה: הצד הגרמני',
        placeIds: ['cbs-bastei'],
        notes:
          'קפיצה של חצי שעה מעבר לגבול אל תצפית באסטיי וגשר הסלע - אפשר לשלב עם שיט על האלבה או עם עיירת רתן.',
      },
    ],
    practical: {
      flights:
        'טסים לפראג (PRG) - יש טיסות ישירות מנתב"ג - ומשם שעה וחצי-שעתיים צפונה. אפשר גם לנחות בדרזדן שבגרמניה (כשעה מהאזור) בטיסה עם החלפה.',
      gettingAround:
        'רכב שכור נוח ביותר, אבל אפשר גם בלי: רכבת מפראג לדצ׳ין ומשם אוטובוס להז׳נסקו ולכפרי הפארק, בתדירות סבירה בעונה. בתוך הפארק נעים ברגל ובאוטובוסי מעבר; בשבתות ובחגים החניונים מתמלאים מוקדם.',
      kosherOverview:
        'אין באזור שווייץ הבוהמית שום תשתית כשרות. הכשרות הקרובה היא בפראג - שבה יש מסעדות כשרות, בית חב"ד וקהילה יהודית ותיקה - כשעה וחצי נסיעה. הדרך המעשית: להצטייד בפראג ליום או ליומיים בטבע.',
    },
  },
  {
    slug: 'balaton',
    name: 'אגם בלטון',
    nameLocal: 'Lake Balaton',
    countrySlug: 'hungary',
    flag: '🇭🇺',
    center: { lat: 46.85, lng: 17.6 },
    zoom: 10,
    tagline: 'הים של הונגריה - חופים, גבעות געש ומעיינות חמים',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Balaton_Hungary_Landscape.jpg/500px-Balaton_Hungary_Landscape.jpg',
    iconicLandmark: {
      name: 'חצי האי טיהאני',
      nameLocal: 'Tihany Peninsula',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Ap%C3%A1ts%C3%A1gi_templom_%2810483._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29_10.jpg/500px-Ap%C3%A1ts%C3%A1gi_templom_%2810483._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29_10.jpg',
      blurb:
        'לשון יבשה שחודרת אל תוך האגם, ועליה מנזר בנדיקטיני מהמאה ה-11 עם שני מגדליו - התצפית המזוהה ביותר עם בלטון.',
    },
    editorialRating: {
      score: 4.3,
      verdict:
        'חופשת אגם נינוחה שעה וחצי מבודפשט: חופים רדודים ונוחים לילדים, גבעות געש עם יקבים ואגם תרמי ייחודי. חסרונות: אין כאן נוף הרים דרמטי, בשיא הקיץ עמוס ויקר, ומחוץ לעונה חלק מהעסקים פשוט סגורים.',
    },
    summary:
      'אגם בלטון הוא האגם הגדול במרכז אירופה, ובהונגריה קוראים לו פשוט "הים". הגדה הצפונית היא הצד היפה: חצי האי טיהאני עם המנזר, גבעות הבזלת של בדצ׳וני והיקבים שעליהן, העיירה בלטונפירד עם הטיילת, והאגם התרמי של הביז - האגם הביולוגי החם הגדול בעולם. הגדה הדרומית רדודה וחולית, ולכן פופולרית עם משפחות.',
    bestSeason:
      'יוני-אוגוסט (רחצה, שיט ופסטיבלים - וגם השיא של הצפיפות) · מאי וספטמבר נעימים ושקטים · בחורף רוב עסקי החוף סגורים, אבל הביז התרמי פעיל כל השנה',
    places: [
      {
        id: 'blt-balaton',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Balaton_Hungary_Landscape.jpg/500px-Balaton_Hungary_Landscape.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'אגם בלטון',
        nameLocal: 'Lake Balaton',
        category: 'nature',
        lat: 46.85,
        lng: 17.72,
        description:
          'האגם הגדול במרכז אירופה - כ-77 ק"מ אורך ומים רדודים שמתחממים מהר בקיץ. סביבו טיילות, חופים מוסדרים, שביל אופניים היקפי ארוך וקווי מעבורות בין הגדות.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Lake+Balaton',
      },
      {
        id: 'blt-tihany',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Ap%C3%A1ts%C3%A1gi_templom_%2810483._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29_10.jpg/500px-Ap%C3%A1ts%C3%A1gi_templom_%2810483._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29_10.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'טיהאני והמנזר',
        nameLocal: 'Tihany Abbey & Peninsula',
        category: 'attraction',
        lat: 46.9089,
        lng: 17.8792,
        description:
          'חצי אי געשי שנכנס אל תוך האגם, ועליו כפר עם בתי לבנים לבנים, שדות לבנדר ומנזר בנדיקטיני מ-1055. מהמנזר נשקפת התצפית המפורסמת על בלטון, ומסביב שבילי הליכה אל האגם הפנימי.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Tihany+Abbey',
      },
      {
        id: 'blt-badacsony',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Badacsony_mountain_from_Balatonm%C3%A1riaf%C3%BCrd%C5%91%2C_Hungary.jpg/500px-Badacsony_mountain_from_Balatonm%C3%A1riaf%C3%BCrd%C5%91%2C_Hungary.jpg',
        tags: ['outdoors', 'foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'הר בדצ׳וני',
        nameLocal: 'Badacsony',
        category: 'nature',
        lat: 46.8035,
        lng: 17.4958,
        description:
          'גבעת בזלת שטוחת-פסגה מעל הגדה הצפונית, שריד של הר געש - ובמדרונותיה כרמים ויקבים. שבילים קצרים עולים אל עמודי הבזלת ואל תצפיות מעל האגם.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Badacsony',
      },
      {
        id: 'blt-heviz',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/H%C3%A9v%C3%ADz.jpg/500px-H%C3%A9v%C3%ADz.jpg',
        tags: ['families', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'האגם התרמי של הביז',
        nameLocal: 'Lake Hévíz',
        category: 'nature',
        lat: 46.7923,
        lng: 17.185,
        description:
          'האגם התרמי הביולוגי הגדול בעולם: מעיין חם ממלא אותו ומחליף את כל המים בכמה ימים, כך שאפשר לשחות בו גם בחורף. מסביבו בית מרחץ עתיק ופארק.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Lake+Heviz',
      },
      {
        id: 'blt-balatonfured',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Balatonfured19.jpg/500px-Balatonfured19.jpg',
        tags: ['families', 'foodie'],
        priceLevel: 1,
        name: 'בלטונפירד',
        nameLocal: 'Balatonfüred',
        category: 'attraction',
        lat: 46.95,
        lng: 17.8833,
        description:
          'עיירת הנופש הוותיקה של הגדה הצפונית: טיילת עצי צפצפה לאורך המים, מרינה, מעיינות מים מינרליים ובתי קפה. בסיס נוח ללינה ולנסיעות יומיות סביב האגם.',
        rating: 4.4,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Balatonfured',
      },
      {
        id: 'blt-szigliget',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/V%C3%A1rrom_%2810376._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29.jpg/500px-V%C3%A1rrom_%2810376._sz%C3%A1m%C3%BA_m%C5%B1eml%C3%A9k%29.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        name: 'מצודת סיגליגט',
        nameLocal: 'Szigliget Castle',
        category: 'attraction',
        lat: 46.7961,
        lng: 17.4383,
        description:
          'חורבות מצודה מהמאה ה-13 על גבעה מעל הכפר, ומהן תצפית פנורמית על האגם ועל גבעות הבזלת. עלייה קצרה ותלולה מהחניה למטה.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Szigliget+Castle',
      },
      {
        id: 'blt-tapolca',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Tapolca_%282%29.jpg/500px-Tapolca_%282%29.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 1,
        name: 'מערת האגם בטפולצה',
        nameLocal: 'Tapolca Lake Cave',
        category: 'nature',
        lat: 46.8828,
        lng: 17.4081,
        description:
          'מערת נטיפים תת-קרקעית שבתוכה אגם, ושטים בה בסירות משוטים קטנות במעברים צרים - חוויה קצרה ומיוחדת, אטרקציה מצוינת ליום גשום.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Tapolca+Lake+Cave',
      },
      {
        id: 'blt-keszthely',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Keszthely_-_Festetics_Castle.jpg/500px-Keszthely_-_Festetics_Castle.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        name: 'קסטהיי וארמון פשטטיץ׳',
        nameLocal: 'Keszthely & Festetics Palace',
        category: 'museum',
        lat: 46.7706,
        lng: 17.2417,
        description:
          'העיר הוותיקה בקצה המערבי של האגם, ובה ארמון בארוקי גדול עם ספרייה היסטורית, גנים ואגפי תצוגה. משתלב היטב עם ביקור בהביז הסמוכה.',
        rating: 4.5,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Festetics+Palace+Keszthely',
      },
      {
        id: 'blt-uplands',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Badacsonytomaj_l%C3%A1tk%C3%A9p.jpg/500px-Badacsonytomaj_l%C3%A1tk%C3%A9p.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'פארק רמות בלטון',
        nameLocal: 'Balaton Uplands National Park',
        category: 'nature',
        lat: 46.9758,
        lng: 17.9294,
        description:
          'פארק לאומי שמשתרע מצפון לאגם: גבעות געש, מכתשי גייזרים מאובנים, ביצות וכפרים כפריים - עם שבילי הליכה ואופניים ופחות תיירים מהחוף.',
        rating: 4.4,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Balaton+Uplands+National+Park',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'הגדה הצפונית - בלטונפירד',
        placeIds: ['blt-balatonfured', 'blt-balaton'],
        notes:
          'מגיעים מבודפשט (כשעה וחצי), מתמקמים בבלטונפירד ומבלים אחר צהריים על הטיילת ובחוף. ערב נינוח במרינה.',
      },
      {
        day: 2,
        title: 'טיהאני',
        placeIds: ['blt-tihany', 'blt-uplands'],
        notes:
          'יום בחצי האי: המנזר והתצפית, שדות הלבנדר והאגם הפנימי, ואחר הצהריים שביל בפארק הרמות.',
      },
      {
        day: 3,
        title: 'הרי הבזלת והמצודה',
        placeIds: ['blt-badacsony', 'blt-szigliget', 'blt-tapolca'],
        notes:
          'עלייה לתצפיות בדצ׳וני בין הכרמים, חורבות מצודת סיגליגט, וסיום בשיט בסירה במערת האגם של טפולצה.',
      },
      {
        day: 4,
        title: 'המערב - הביז וקסטהיי',
        placeIds: ['blt-heviz', 'blt-keszthely'],
        notes:
          'בוקר רחצה באגם התרמי של הביז (גם בחורף), ואחר הצהריים ארמון פשטטיץ׳ בקסטהיי לפני החזרה.',
      },
    ],
    practical: {
      flights:
        'טסים לבודפשט (BUD) בטיסה ישירה מנתב"ג של כשלוש שעות, ומשם כשעה וחצי ברכב או ברכבת ישירה לעיירות הגדה הצפונית (בלטונפירד, סיופוק). אין שדה תעופה בינלאומי פעיל בקנה מידה משמעותי באזור האגם עצמו.',
      gettingAround:
        'רכבת מבודפשט מגיעה לרוב עיירות החוף, ובין הגדות יש מעבורות (טיהאני-סנטאנטלפולד למשל). רכב שכור נוח למי שרוצה יקבים, מצודות ואת פארק הרמות; בקיץ יש גם שביל אופניים היקפי מצוין סביב האגם.',
      kosherOverview:
        'אין באזור בלטון תשתית כשרות. הכשרות הקרובה היא בבודפשט - שבה יש מסעדות כשרות, מאפיות וקהילה גדולה - כשעה וחצי נסיעה. הדרך המעשית: להצטייד בבודפשט לפני היציאה לאגם.',
    },
  },
  {
    slug: 'reykjavik',
    name: 'ריקיאוויק והחוף הדרומי',
    nameLocal: 'Reykjavík & the South Coast',
    countrySlug: 'iceland',
    flag: '🇮🇸',
    center: { lat: 64.0, lng: -19.5 },
    zoom: 6,
    tagline: 'גייזרים, מפלים ולגונת קרחונים - במרחק נסיעה אחת',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/J%C3%B6kuls%C3%A1rl%C3%B3n_lagoon_in_southeastern_Iceland.jpg/500px-J%C3%B6kuls%C3%A1rl%C3%B3n_lagoon_in_southeastern_Iceland.jpg',
    iconicLandmark: {
      name: 'לגונת הקרחונים יוקולסארלון',
      nameLocal: 'Jökulsárlón Glacier Lagoon',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/J%C3%B6kuls%C3%A1rl%C3%B3n_lagoon_in_southeastern_Iceland.jpg/500px-J%C3%B6kuls%C3%A1rl%C3%B3n_lagoon_in_southeastern_Iceland.jpg',
      blurb:
        'לגונה שנוצרה מנסיגת קרחון ברייד׳מרקורייקול, ובה קרחונים כחולים שצפים אל הים - ומולה החוף השחור שעליו נשטפים גושי הקרח (חוף היהלומים).',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'ריכוז אדיר של נופי טבע נדירים לאורך כביש אחד, ומאז 2026 יש בריקיאוויק גם מרכז יהודי עם חנות כשרה ומטבח קהילתי. חסרונות: יעד יקר מאוד, מזג אוויר תזזיתי שיכול לבטל תוכניות, ובחורף שעות אור מעטות מאוד.',
    },
    summary:
      'רוב הטיולים באיסלנד מתחילים בריקיאוויק, ומשם יוצאים למעגל הזהב - פארק תינגוודליר שבין הלוחות הטקטוניים, שדה הגייזרים והמפל גולפוס - וממשיכים לאורך החוף הדרומי אל מפלי סליילנדספוס וסקוגאפוס, החוף השחור ריניספיארה, וקרחון ואטנאייקול עם לגונת יוקולסארלון. בריקיאוויק עצמה נפתח ביולי 2026 מרכז יהודי עם חנות כשרה ומטבח קהילתי.',
    bestSeason:
      'יוני-אוגוסט (אור כמעט מסביב לשעון, כל הדרכים פתוחות) · ספטמבר-מרץ עונת הזוהר הצפוני אבל ימים קצרים ותנאי כביש קשים · הרמות הפנימיות פתוחות רק בקיץ',
    places: [
      {
        id: 'isl-jokulsarlon',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/J%C3%B6kuls%C3%A1rl%C3%B3n_lagoon_in_southeastern_Iceland.jpg/500px-J%C3%B6kuls%C3%A1rl%C3%B3n_lagoon_in_southeastern_Iceland.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'לגונת הקרחונים יוקולסארלון',
        nameLocal: 'Jökulsárlón',
        category: 'nature',
        lat: 64.0703,
        lng: -16.2117,
        description:
          'לגונה עמוקה שנוצרה מנסיגת קרחון, ובה גושי קרח כחלחלים שצפים אל הים; ממול חוף היהלומים, שעליו נשטפים גושי קרח על החול השחור. אפשר גם שיט בין הקרחונים בעונה.',
        rating: 4.9,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Jokulsarlon',
      },
      {
        id: 'isl-gullfoss',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Gullfoss_from_the_Air_%28cropped%29.jpg/500px-Gullfoss_from_the_Air_%28cropped%29.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'מפל גולפוס',
        nameLocal: 'Gullfoss',
        category: 'nature',
        lat: 64.3261,
        lng: -20.1211,
        description:
          'מפל כפול עוצמתי שנופל בשתי מדרגות אל תוך נקיק צר - אחד המפלים המפורסמים באיסלנד, וחלק ממסלול מעגל הזהב. תצפיות מלמעלה ומקרוב, ולעתים קשת בענן מהרסס.',
        rating: 4.8,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Gullfoss',
      },
      {
        id: 'isl-geysir',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Erupting_geysir.jpg/500px-Erupting_geysir.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 0,
        mustSee: true,
        name: 'שדה הגייזרים גייסיר',
        nameLocal: 'Geysir & Strokkur',
        category: 'nature',
        lat: 64.3137,
        lng: -20.2995,
        description:
          'אזור גיאותרמי שממנו הגיעה המילה "גייזר". הגייזר הגדול כמעט אינו פעיל היום, אבל שכנו סטרוקור מתפרץ כל כמה דקות לגובה של עשרות מטרים. שבילים מסומנים - האדמה סביב רותחת.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Geysir+Iceland',
      },
      {
        id: 'isl-thingvellir',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/%C3%9Eingvellir_from_the_information_centre.JPG/500px-%C3%9Eingvellir_from_the_information_centre.JPG',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        mustSee: true,
        name: 'פארק תינגוודליר',
        nameLocal: 'Þingvellir National Park',
        category: 'nature',
        lat: 64.2538,
        lng: -21.0373,
        description:
          'פארק לאומי ואתר מורשת עולמית בשבר שבין הלוח האירופי לאמריקאי - אפשר ללכת בתוך הבקע. כאן גם התכנס האלת׳ינג, מהפרלמנטים העתיקים בעולם, מ-930 לספירה.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Thingvellir',
      },
      {
        id: 'isl-seljalandsfoss',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Idyllic_landscape_with_a_waterfall_%28Unsplash%29.jpg/500px-Idyllic_landscape_with_a_waterfall_%28Unsplash%29.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'מפל סליילנדספוס',
        nameLocal: 'Seljalandsfoss',
        category: 'nature',
        lat: 63.6158,
        lng: -19.9928,
        description:
          'מפל בגובה כ-60 מ׳ שאפשר לעקוף אותו בשביל שעובר מאחורי מסך המים - חוויה רטובה ומיוחדת. שכנו הנסתר גליופרארפוס מוסתר בתוך חריץ סלע סמוך.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Seljalandsfoss',
      },
      {
        id: 'isl-skogafoss',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/2008-05-24_35_Sk%C3%B3gafoss.jpg/500px-2008-05-24_35_Sk%C3%B3gafoss.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'מפל סקוגאפוס',
        nameLocal: 'Skógafoss',
        category: 'nature',
        lat: 63.5321,
        lng: -19.5111,
        description:
          'מפל רחב ועוצמתי בגובה כ-60 מ׳ שאפשר לגשת אליו עד למרחק נגיעה, ומדרגות בצדו עולות לתצפית מלמעלה - ומשם ממשיך שביל ההליכה פימוורדוהאולס לאורך הנחל.',
        rating: 4.8,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Skogafoss',
      },
      {
        id: 'isl-reynisfjara',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Reynisfjara_Beach_Looking_West_Towards_Dyrh%C3%B3laey.jpg/500px-Reynisfjara_Beach_Looking_West_Towards_Dyrh%C3%B3laey.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'החוף השחור ריניספיארה',
        nameLocal: 'Reynisfjara Black Sand Beach',
        category: 'nature',
        lat: 63.4035,
        lng: -19.0474,
        description:
          'חוף חול בזלת שחור ליד הכפר ויק, עם עמודי בזלת משושים, מערה ומצוקי ים. אזהרה חשובה: יש כאן "גלי צחוק" (sneaker waves) פתאומיים - אסור להתקרב לקו המים.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Reynisfjara',
      },
      {
        id: 'isl-vatnajokull',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Vatnaj%C3%B6kull.jpeg/500px-Vatnaj%C3%B6kull.jpeg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'קרחון ואטנאייקול',
        nameLocal: 'Vatnajökull',
        category: 'nature',
        lat: 64.4,
        lng: -16.8,
        description:
          'הקרחון הגדול באירופה מבחינת נפח, ומעליו פארק לאומי ואתר מורשת עולמית. מהאזור יוצאים טיולי קרחון מודרכים וביקורים במערות קרח כחולות בעונה החורפית.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Vatnajokull+National+Park',
      },
      {
        id: 'isl-bluelagoon',
        photo:
          'https://upload.wikimedia.org/wikipedia/en/thumb/0/00/Blue_Lagoon_Main_Building.JPG/500px-Blue_Lagoon_Main_Building.JPG',
        tags: ['romantic', 'families'],
        priceLevel: 3,
        name: 'הלגונה הכחולה',
        nameLocal: 'Blue Lagoon',
        category: 'nature',
        lat: 63.88,
        lng: -22.4481,
        description:
          'בריכה גיאותרמית חלבית-תכולה בשדה לבה ליד שדה התעופה קפלאוויק, שמימיה מגיעים מתחנת כוח גיאותרמית סמוכה. כרטיסים בשעות מוגדרות ובהזמנה מראש; האזור מושפע לעתים מפעילות געשית - לבדוק סטטוס פתיחה.',
        rating: 4.4,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Blue+Lagoon+Iceland',
      },
      {
        id: 'isl-kirkjufell',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Kirkjufell_in_Iceland.jpg/500px-Kirkjufell_in_Iceland.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 0,
        name: 'הר קירקיופל',
        nameLocal: 'Kirkjufell',
        category: 'viewpoint',
        lat: 64.9397,
        lng: -23.3014,
        description:
          'הר בצורת חרוט מחודד על חצי האי סניפלסנס, ולידו מפל קטן - אחד ההרים המצולמים באיסלנד. כשעתיים וחצי מריקיאוויק, ומשתלב עם סיבוב בחצי האי.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Kirkjufell',
      },
      {
        id: 'isl-reykjavik',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Reykjav%C3%ADk%2C_view_from_Hallgr%C3%ADmskirkja_%282%29.jpg/500px-Reykjav%C3%ADk%2C_view_from_Hallgr%C3%ADmskirkja_%282%29.jpg',
        tags: ['foodie', 'art'],
        priceLevel: 2,
        name: 'ריקיאוויק',
        nameLocal: 'Reykjavík',
        category: 'attraction',
        lat: 64.1458,
        lng: -21.9425,
        description:
          'הבירה הצפונית בעולם: כנסיית האלגרימסקירקיה עם מגדל התצפית, אולם הקונצרטים הארפה על המים, רחוב לויגאווגור הצבעוני ובריכות גיאותרמיות עירוניות. בסיס הפתיחה והסיום לכל טיול.',
        rating: 4.5,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Reykjavik',
      },
      {
        id: 'isl-chabad',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'המרכז היהודי של איסלנד (חב"ד)',
        nameLocal: 'Beit Shvidler Jewish Center of Iceland',
        category: 'kosher-market',
        lat: 64.1458,
        lng: -21.9425,
        description:
          'המרכז היהודי של איסלנד נפתח בריקיאוויק ביולי 2026, ובו בית כנסת, חנות כשרה ומטבח קהילתי - נקודת ההצטיידות הכשרה היחידה במדינה. הסימון הוא במרכז העיר; לוודא כתובת ושעות מולם.',
        kosherNote: 'בהפעלת חב"ד איסלנד. ארוחות שבת וקייטרינג בתיאום מראש; לבדוק מלאי ושעות פתיחה לפני שמגיעים.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'חב"ד איסלנד, ריקיאוויק',
        },
        rating: 4.6,
        durationMin: 60,
        externalUrl: 'https://maps.google.com/?q=Chabad+of+Iceland+Reykjavik',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'ריקיאוויק והלגונה הכחולה',
        placeIds: ['isl-reykjavik', 'isl-bluelagoon', 'isl-chabad'],
        notes:
          'נוחתים בקפלאוויק, ומתחילים בלגונה הכחולה שבדרך לעיר (הזמנה מראש). אחר הצהריים ריקיאוויק, והצטיידות בחנות הכשרה למי שמקפיד.',
      },
      {
        day: 2,
        title: 'מעגל הזהב',
        placeIds: ['isl-thingvellir', 'isl-geysir', 'isl-gullfoss'],
        notes:
          'המסלול הקלאסי: בקע תינגוודליר, שדה הגייזרים ומפל גולפוס - הכול בטווח נסיעה קצר מהעיר.',
      },
      {
        day: 3,
        title: 'החוף הדרומי והמפלים',
        placeIds: ['isl-seljalandsfoss', 'isl-skogafoss', 'isl-reynisfjara'],
        notes:
          'נוסעים מזרחה: מפל שאפשר לעבור מאחוריו, מפל שאפשר לטפס מעליו, וסיום בחוף השחור ליד ויק - זהירות מהגלים.',
      },
      {
        day: 4,
        title: 'הקרחון והלגונה',
        placeIds: ['isl-vatnajokull', 'isl-jokulsarlon'],
        notes:
          'ממשיכים מזרחה אל ואטנאייקול - טיול קרחון מודרך או מערת קרח בעונה - ולגונת יוקולסארלון וחוף היהלומים.',
      },
      {
        day: 5,
        title: 'חצי האי סניפלסנס',
        placeIds: ['isl-kirkjufell'],
        notes:
          'הרחבה צפונית-מערבית: הר קירקיופל, כפרי דייגים, מצוקים ושדות לבה - "איסלנד בזעיר אנפין".',
      },
    ],
    practical: {
      flights:
        'איסלנדאייר הפעילה קו ישיר עונתי מנתב"ג לקפלאוויק (KEF) - כשלוש טיסות בשבוע בעונת הקיץ, כ-7 שעות. הקו עונתי ומשתנה משנה לשנה, ולכן חובה לבדוק אם הוא פעיל בתאריכים שלכם; לחלופין טסים עם החלפה אחת דרך אירופה (למשל לונדון, אמסטרדם, קופנהגן) בקלות ובתדירות גבוהה.',
      gettingAround:
        'רכב שכור הוא הדרך המעשית - טבעת הכביש (Route 1) עוברת ליד רוב האתרים. בחורף חובה רכב מתאים ובדיקת תנאי דרך יומית באתר הרשמי; הרמות הפנימיות (F-roads) דורשות 4x4 ופתוחות רק בקיץ. יש גם טיולים מאורגנים יומיים מריקיאוויק לכל האתרים בדף הזה.',
      kosherOverview:
        'מיולי 2026 יש בריקיאוויק מרכז יהודי של חב"ד עם בית כנסת, חנות כשרה ומטבח קהילתי - שינוי משמעותי לעומת השנים הקודמות, שבהן לא הייתה באיסלנד שום נקודה כשרה. מחוץ לעיר אין כלום, אבל איסלנד מייבאת כמעט את כל המזון, ולכן בסופרמרקטים אפשר למצוא מוצרים ארוזים עם סימוני כשרות אירופיים ואמריקאיים. שחיטה כשרה אסורה במדינה - הבשר במרכז מיובא.',
    },
  },
  {
    slug: 'bled',
    name: 'אגם בלד והאלפים היוליאניים',
    nameLocal: 'Lake Bled & the Julian Alps',
    countrySlug: 'slovenia',
    flag: '🇸🇮',
    center: { lat: 46.2, lng: 14.0 },
    zoom: 9,
    tagline: 'אגם עם אי, נהר טורקיז ומערות ענק - הכול בשעה נסיעה',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Lake_Bled_from_the_Mountain.jpg/500px-Lake_Bled_from_the_Mountain.jpg',
    iconicLandmark: {
      name: 'אגם בלד והאי שבמרכזו',
      nameLocal: 'Lake Bled & Bled Island',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Lake_Bled_from_the_Mountain.jpg/500px-Lake_Bled_from_the_Mountain.jpg',
      blurb:
        'אגם קרחוני שבמרכזו האי היחיד בסלובניה, ועליו כנסיית עלייה לרגל עם מגדל פעמון - ומעליו טירה על צוק בן יותר מאלף שנה.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'טבע אלפיני מרוכז ונגיש: אגמים, נקיקים, נהר טורקיז ומערות - הכול בטווח שעה-שעתיים, במחירים סבירים יותר משווייץ או אוסטריה. חסרונות: הטיסה הישירה עונתית בלבד, בלד עמוסה מאוד בקיץ, ואין במדינה תשתית כשרות מאומתת.',
    },
    summary:
      'צפון-מערב סלובניה הוא ריכוז יוצא דופן של טבע: אגם בלד עם האי והטירה, אגם בוהיני הגדול והשקט בלב הפארק הלאומי טריגלב, נקיק וינטגר עם שבילי העץ מעל המים, ועמק נהר סוצ׳ה בצבע טורקיז בלתי נתפס. דרומה משם מערות פוסטויינה וטירת פרדיאמה שבתוך צוק, ובמרחק שעה - ליובליאנה הקטנה והנעימה, ועוד שעה - העיירה הוונציאנית פיראן על הים.',
    bestSeason:
      'מאי-ספטמבר (מסלולים, שיט ורפטינג בסוצ׳ה בשיא) · יולי-אוגוסט עמוס במיוחד בבלד · בחורף אזור סקי, וחלק ממעברי ההרים (ורשיץ׳) נסגרים',
    places: [
      {
        id: 'svn-bled',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Lake_Bled_from_the_Mountain.jpg/500px-Lake_Bled_from_the_Mountain.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'אגם בלד',
        nameLocal: 'Lake Bled',
        category: 'nature',
        lat: 46.3644,
        lng: 14.0947,
        description:
          'אגם קרחוני עם אי במרכזו ועליו כנסייה, ומעליו טירת בלד על צוק. מקיפים אותו בשביל של כ-6 ק"מ, מגיעים לאי בסירת פלטנה מסורתית, ואפשר לשחות בקיץ.',
        rating: 4.8,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Lake+Bled',
      },
      {
        id: 'svn-vintgar',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Slovenia_-_Waterfall_Sum_-_Vintgar_Klamm_%2843686688490%29.jpg/500px-Slovenia_-_Waterfall_Sum_-_Vintgar_Klamm_%2843686688490%29.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'נקיק וינטגר',
        nameLocal: 'Vintgar Gorge',
        category: 'nature',
        lat: 46.39,
        lng: 14.083,
        description:
          'נקיק באורך כ-1.6 ק"מ שחצב נהר רדובנה, ובו שבילי עץ ומעברים צמודים לקיר מעל מים ירוקים-טורקיז, עד למפל שום. הכניסה בהזמנה מראש בעונה ובכיוון אחד.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Vintgar+Gorge',
      },
      {
        id: 'svn-bohinj',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Aerial_image_of_Lake_Bohinj_%28view_from_the_south%29.jpg/500px-Aerial_image_of_Lake_Bohinj_%28view_from_the_south%29.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'אגם בוהיני',
        nameLocal: 'Lake Bohinj',
        category: 'nature',
        lat: 46.2823,
        lng: 13.8582,
        description:
          'האגם הטבעי הגדול בסלובניה, בלב הפארק הלאומי טריגלב - גדול, שקט ופראי יותר מבלד. אפשר לשחות, לשוט בקיאק ולצאת ממנו למסלולי הליכה ולרכבל וגלנץ׳ עם נוף על העמק.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Lake+Bohinj',
      },
      {
        id: 'svn-triglav',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Triglav_-_winter.jpg/500px-Triglav_-_winter.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'הפארק הלאומי טריגלב',
        nameLocal: 'Triglav National Park',
        category: 'nature',
        lat: 46.3783,
        lng: 13.8367,
        description:
          'הפארק הלאומי היחיד בסלובניה, סביב פסגת טריגלב (2,864 מ׳) שמופיעה גם על הדגל. עמקים קרחוניים, אגמים אלפיניים ובקתות הרים; העלייה לפסגה עצמה דורשת ציוד ומיומנות פרטה.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Triglav+National+Park',
      },
      {
        id: 'svn-soca',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Soca_4.jpg/500px-Soca_4.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'עמק נהר סוצ׳ה',
        nameLocal: 'Soča Valley',
        category: 'nature',
        lat: 45.9944,
        lng: 13.6414,
        description:
          'נהר בצבע טורקיז-אמרלד חד שזורם בין הרי האלפים היוליאניים, ולאורכו נקיקים, גשרים תלויים ושביל הליכה ארוך. בירת ספורט המים של סלובניה - רפטינג, קיאק וקניוניג בקיץ.',
        rating: 4.8,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Soca+Valley',
      },
      {
        id: 'svn-kranjska',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Kranjska_Gora-2736048.jpg/500px-Kranjska_Gora-2736048.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'קרנייסקה גורה',
        nameLocal: 'Kranjska Gora',
        category: 'attraction',
        lat: 46.4854,
        lng: 13.7871,
        description:
          'עיירת הרים בקצה הצפוני-מערבי, בסיס לסקי בחורף ולאופניים ולהליכות בקיץ - וממנה עולה מעבר ורשיץ׳ המפותל עם 50 סיבובים אל עמק סוצ׳ה.',
        rating: 4.4,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Kranjska+Gora',
      },
      {
        id: 'svn-postojna',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Postojna_%2822206343750%29.jpg/500px-Postojna_%2822206343750%29.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'מערות פוסטויינה',
        nameLocal: 'Postojna Cave',
        category: 'nature',
        lat: 45.7827,
        lng: 14.2037,
        description:
          'אחת ממערות הקרסט המפורסמות באירופה: יותר מ-20 ק"מ מנהרות, שבחלקן נוסעים ברכבת תת-קרקעית קטנה, ואולמות נטיפים ענקיים. כאן חי גם ה"דרקון התינוק" - הפרוטאוס, דו-חי מערות עיוור.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Postojna+Cave',
      },
      {
        id: 'svn-predjama',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/H%C3%B6hlenburg_Predjama_in_Slovenien.jpg/500px-H%C3%B6hlenburg_Predjama_in_Slovenien.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'טירת פרדיאמה',
        nameLocal: 'Predjama Castle',
        category: 'attraction',
        lat: 45.8153,
        lng: 14.1267,
        description:
          'טירה מהמאה ה-13 שבנויה בתוך פתח מערה בקיר סלע אנכי - מהמראות המוזרים והמרשימים באירופה. מתחתיה מערכת מערות שאפשר לבקר בה בעונה.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Predjama+Castle',
      },
      {
        id: 'svn-ljubljana',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Ljubljana_Old_Town%2C_Slovenia_%28Old_Camera%29_%2833286165680%29.jpg/500px-Ljubljana_Old_Town%2C_Slovenia_%28Old_Camera%29_%2833286165680%29.jpg',
        tags: ['foodie', 'art'],
        priceLevel: 1,
        name: 'ליובליאנה',
        nameLocal: 'Ljubljana',
        category: 'attraction',
        lat: 46.0514,
        lng: 14.5061,
        description:
          'בירה קטנה ונינוחה סביב נהר הליובליאניצה: גשרים מפורסמים, שוק מרכזי, מרכז עיר סגור לרכב וטירה על הגבעה עם רכבל. נוחה מאוד להליכה, ובסיס טוב לימים הראשונים.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Ljubljana',
      },
      {
        id: 'svn-piran',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Piran%2C_Slovenia%2C_Viewpoint.jpg/500px-Piran%2C_Slovenia%2C_Viewpoint.jpg',
        tags: ['romantic', 'foodie'],
        priceLevel: 1,
        name: 'פיראן',
        nameLocal: 'Piran',
        category: 'attraction',
        lat: 45.5283,
        lng: 13.5683,
        description:
          'עיירה ונציאנית קטנה על לשון יבשה באדריאטי, עם כיכר טרטיני, סמטאות אבן וחומות עם תצפית על המפרץ. רצועת החוף של סלובניה קצרה - וזו הפנינה שבה.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Piran',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'ליובליאנה',
        placeIds: ['svn-ljubljana'],
        notes:
          'נחיתה והתמקמות בבירה: הגשרים, השוק המרכזי, טירת ליובליאנה ברכבל וערב על הנהר. אפשר גם לישון כאן ולצאת לנסיעות יומיות.',
      },
      {
        day: 2,
        title: 'בלד והנקיק',
        placeIds: ['svn-bled', 'svn-vintgar'],
        notes:
          'בוקר בנקיק וינטגר (כניסה מוזמנת מראש), אחר הצהריים הקפת אגם בלד, סירה לאי ותצפית מהטירה או ממאלה אוסויניצה.',
      },
      {
        day: 3,
        title: 'בוהיני והפארק',
        placeIds: ['svn-bohinj', 'svn-triglav'],
        notes:
          'יום שקט יותר: אגם בוהיני, רכבל וגלנץ׳ לתצפית, ומסלולי הליכה בפארק הלאומי לפי הכושר והתחזית.',
      },
      {
        day: 4,
        title: 'מעבר ורשיץ׳ ועמק סוצ׳ה',
        placeIds: ['svn-kranjska', 'svn-soca'],
        notes:
          'נסיעה נופית דרך קרנייסקה גורה ומעבר ורשיץ׳ (סגור בחורף) אל עמק סוצ׳ה - הליכה לאורך הנהר ולמי שרוצה, רפטינג.',
      },
      {
        day: 5,
        title: 'מערות, טירה וים',
        placeIds: ['svn-postojna', 'svn-predjama', 'svn-piran'],
        notes:
          'דרומה: מערות פוסטויינה וטירת פרדיאמה שבצוק, וסיום בפיראן על הים לפני החזרה.',
      },
    ],
    practical: {
      flights:
        'ישראייר מפעילה קו ישיר עונתי מנתב"ג לליובליאנה (LJU) - בערך יולי עד אוקטובר, טיסה של כשלוש שעות. מחוץ לעונה טסים עם החלפה (וינה, זאגרב, מינכן, ונציה) או נוחתים בטריאסטה/ונציה ונוסעים כשעתיים ברכב.',
      gettingAround:
        'רכב שכור הוא הדרך הנוחה - המרחקים קצרים והכבישים מצוינים (שימו לב לחובת ה-vinjeta). יש גם אוטובוסים ורכבות סבירים בין ליובליאנה, בלד ובוהיני, ובקיץ אוטובוסים לפארק. חניה בבלד ובנקיקים מוגבלת - להגיע מוקדם.',
      kosherOverview:
        'לא אותרה בסלובניה מסעדה או חנות כשרה מאומתת. יש בליובליאנה קהילה יהודית קטנה, אך אין תשתית כשרות תיירותית; הכשרות הקרובה היא בטריאסטה שבאיטליה או בווינה. הדרך המעשית: להצטייד מראש, ולהסתמך על מוצרים ארוזים עם סימון כשרות אירופי בסופרמרקטים הגדולים.',
    },
  },
  {
    slug: 'plitvice',
    name: 'פליטביצה והחוף הדלמטי',
    nameLocal: 'Plitvice Lakes & the Dalmatian Coast',
    countrySlug: 'croatia',
    flag: '🇭🇷',
    center: { lat: 44.2, lng: 15.8 },
    zoom: 8,
    tagline: 'אגמי מפלים טורקיז - ובשעתיים מהם הים האדריאטי',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/View_in_Plitvice_Lakes_National_Park.jpg/500px-View_in_Plitvice_Lakes_National_Park.jpg',
    iconicLandmark: {
      name: 'אגמי פליטביצה',
      nameLocal: 'Plitvice Lakes',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/View_in_Plitvice_Lakes_National_Park.jpg/500px-View_in_Plitvice_Lakes_National_Park.jpg',
      blurb:
        'שרשרת של 16 אגמים בצבע טורקיז שיורדים זה לתוך זה במאות מפלים, מחוברים בשבילי עץ - הפארק הלאומי הוותיק בדרום-מזרח אירופה ואתר מורשת עולמית.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'שילוב נדיר של פארקי מים ברמה עולמית וחוף אדריאטי יפהפה במרחק קצר, ובזאגרב יש בית חב"ד שמספק אוכל כשר בהזמנה מראש. חסרונות: טיסה ישירה רק לזאגרב ובתדירות נמוכה, פליטביצה עמוסה מאוד בקיץ (כרטיס לשעה מוגדרת), ורכב כמעט הכרחי.',
    },
    summary:
      'פליטביצה היא הפנינה של פנים קרואטיה: 16 אגמים בצבע טורקיז שנשפכים זה לזה במאות מפלים, עם רשת שבילי עץ צמודים למים. דרומה משם מחכה פארק קרקה עם מפלי סקרדינסקי בוק, קניון פאקלניצה למטפסים, והחוף הדלמטי - זאדאר עם עוגב הים, ספליט עם ארמון דיוקלטיאנוס ודוברובניק המוקפת חומה. את הטיול פותחים בדרך כלל בזאגרב.',
    bestSeason:
      'מאי-יוני וספטמבר-אוקטובר (מזג אוויר נעים, פחות עומס, מפלים חזקים) · יולי-אוגוסט חם ועמוס מאוד · באביב המפלים בשיא הזרימה, בחורף חלק מהשבילים סגורים',
    places: [
      {
        id: 'hrv-plitvice',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/View_in_Plitvice_Lakes_National_Park.jpg/500px-View_in_Plitvice_Lakes_National_Park.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 2,
        mustSee: true,
        name: 'הפארק הלאומי אגמי פליטביצה',
        nameLocal: 'Plitvice Lakes National Park',
        category: 'nature',
        lat: 44.8806,
        lng: 15.6161,
        description:
          'שרשרת של 16 אגמים מדורגים שמחוברים במאות מפלים, ובהם שבילי עץ ממש מעל המים, מעבורת חשמלית ורכבת פנימית. אסורה רחצה; הכרטיסים בשעת כניסה מוגדרת ונחטפים בעונה.',
        rating: 4.8,
        durationMin: 420,
        externalUrl: 'https://maps.google.com/?q=Plitvice+Lakes+National+Park',
      },
      {
        id: 'hrv-krka',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Krkawatervallen.jpg/500px-Krkawatervallen.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 2,
        mustSee: true,
        name: 'הפארק הלאומי קרקה',
        nameLocal: 'Krka National Park',
        category: 'nature',
        lat: 43.8019,
        lng: 15.9728,
        description:
          'פארק מפלים על נהר קרקה, ובמרכזו מפלי סקרדינסקי בוק הרחבים עם שביל עץ מעגלי. קרוב לחוף ולכן נוח לשילוב עם ימי ים - הרחצה במפלים עצמם אסורה כיום.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Krka+National+Park',
      },
      {
        id: 'hrv-rastoke',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Rastoke_1510.JPG/500px-Rastoke_1510.JPG',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'ראסטוקה',
        nameLocal: 'Rastoke',
        category: 'nature',
        lat: 45.1213,
        lng: 15.5876,
        description:
          'כפר קטן במפגש נהרות סלוניצה וקורנה, שבו בתי עץ בנויים ממש מעל מפלים קטנים וטחנות מים היסטוריות - "פליטביצה בזעיר אנפין", כחצי שעה מהפארק.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Rastoke',
      },
      {
        id: 'hrv-paklenica',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Canyon_of_Paklenica.jpg/500px-Canyon_of_Paklenica.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'קניון פאקלניצה',
        nameLocal: 'Paklenica National Park',
        category: 'nature',
        lat: 44.3667,
        lng: 15.4333,
        description:
          'שני קניונים תלולים ברכס וולביט שיורדים כמעט עד הים - אתר טיפוס סלעים מוביל באירופה, ולצדו מסלולי הליכה נוחים בין קירות של מאות מטרים.',
        rating: 4.6,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Paklenica+National+Park',
      },
      {
        id: 'hrv-kornati',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Kornati.jpg/500px-Kornati.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'איי קורנאטי',
        nameLocal: 'Kornati Islands',
        category: 'nature',
        lat: 43.7833,
        lng: 15.3333,
        description:
          'ארכיפלג של יותר ממאה איים ואיונים חשופים וקרסטיים, רובם ללא יישוב - נוף ים ייחודי שרואים בעיקר משיט יומי מזאדאר, מורטר או שיבניק.',
        rating: 4.5,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Kornati+National+Park',
      },
      {
        id: 'hrv-zadar',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Roman_Forum_in_Zadar%2C_Croatia_%2848607823862%29.jpg/500px-Roman_Forum_in_Zadar%2C_Croatia_%2848607823862%29.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'זאדאר',
        nameLocal: 'Zadar',
        category: 'attraction',
        lat: 44.1142,
        lng: 15.2275,
        description:
          'עיר חוף עם פורום רומי, כנסיית דונאט העגולה, ושתי יצירות מודרניות על הטיילת: עוגב הים שמנגן מגלי הים, ו"ברכת השמש" הסולארית. בסיס נוח לצפון דלמטיה.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Zadar',
      },
      {
        id: 'hrv-split',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Split_080620-133710-IMG_0968x.jpg/500px-Split_080620-133710-IMG_0968x.jpg',
        tags: ['history', 'nightlife'],
        priceLevel: 2,
        mustSee: true,
        name: 'ספליט',
        nameLocal: 'Split',
        category: 'attraction',
        lat: 43.51,
        lng: 16.44,
        description:
          'העיר השנייה בגודלה בקרואטיה, שנבנתה בתוך ארמון דיוקלטיאנוס מהמאה הרביעית - סמטאות עתיקות שהן עדיין עיר חיה, טיילת ריווה ונמל שממנו יוצאות מעבורות לאיים.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Split+Croatia',
      },
      {
        id: 'hrv-diocletian',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Croatia-01239_-_The_Peristil_%289551533404%29.jpg/500px-Croatia-01239_-_The_Peristil_%289551533404%29.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'ארמון דיוקלטיאנוס',
        nameLocal: "Diocletian's Palace",
        category: 'attraction',
        lat: 43.5083,
        lng: 16.44,
        description:
          'ארמון-מצודה שבנה הקיסר דיוקלטיאנוס בשנת 305 לספירה, ואתר מורשת עולמית - כיכר הפריסטיל, המרתפים והקתדרלה שהייתה המאוזוליאום שלו. הלב ההיסטורי של ספליט.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Diocletian+Palace+Split',
      },
      {
        id: 'hrv-dubrovnik',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/The_walls_of_the_fortress_and_View_of_the_old_city._panorama.jpg/500px-The_walls_of_the_fortress_and_View_of_the_old_city._panorama.jpg',
        tags: ['history', 'romantic'],
        priceLevel: 3,
        mustSee: true,
        name: 'דוברובניק',
        nameLocal: 'Dubrovnik',
        category: 'attraction',
        lat: 42.6403,
        lng: 18.1083,
        description:
          'העיר העתיקה המוקפת חומות ים מהמאה ה-16, אתר מורשת עולמית - הליכה על החומה מקיפה את כל העיר, ורכבל עולה להר סרג׳ לתצפית. יקרה ועמוסה, במיוחד בימי עגינת אוניות.',
        rating: 4.7,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Dubrovnik',
      },
      {
        id: 'hrv-zagreb',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Zagreb_%2829255640143%29.jpg/500px-Zagreb_%2829255640143%29.jpg',
        tags: ['foodie', 'art'],
        priceLevel: 1,
        name: 'זאגרב',
        nameLocal: 'Zagreb',
        category: 'attraction',
        lat: 45.8131,
        lng: 15.9775,
        description:
          'הבירה, ונקודת הכניסה לרוב הישראלים: העיר העליונה עם גגות הרעפים והפוניקולר, שוק דולאץ, מוזיאונים וסצנת בתי קפה חזקה. גם הכתובת של הקהילה היהודית ובית חב"ד.',
        rating: 4.4,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Zagreb',
      },
      {
        id: 'hrv-chabad',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'בית חב"ד זאגרב',
        nameLocal: 'Chabad of Croatia, Zagreb',
        category: 'kosher-food',
        lat: 45.8131,
        lng: 15.9775,
        description:
          'בית חב"ד של קרואטיה בזאגרב (רחוב רוקובה 4): ארוחות שבת, מוצרי בשר וחלב כשרים וקייטרינג שנשלח גם לערים אחרות במדינה - הכול בהזמנה מראש. הסימון הוא במרכז העיר.',
        kosherNote: 'אין בקרואטיה מסעדה כשרה רגילה - ההזמנה מול בית חב"ד, ורצוי כשבוע מראש.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד קרואטיה, זאגרב',
        },
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Chabad+of+Croatia+Zagreb',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'זאגרב',
        placeIds: ['hrv-zagreb', 'hrv-chabad'],
        notes:
          'נחיתה בזאגרב, סיור בעיר העליונה ובשוק דולאץ. מי שמקפיד על כשרות - לתאם מראש עם בית חב"ד לאוכל להמשך הדרך.',
      },
      {
        day: 2,
        title: 'פליטביצה',
        placeIds: ['hrv-plitvice', 'hrv-rastoke'],
        notes:
          'יוצאים מוקדם לפארק (כרטיס לשעה מוגדרת מראש), הליכה על שבילי העץ בין האגמים, ובדרך חזרה עצירה בכפר ראסטוקה.',
      },
      {
        day: 3,
        title: 'הרכס והים - פאקלניצה וזאדאר',
        placeIds: ['hrv-paklenica', 'hrv-zadar'],
        notes:
          'בוקר בקניון פאקלניצה, ואחר הצהריים זאדאר - הפורום, עוגב הים ושקיעה על הטיילת.',
      },
      {
        day: 4,
        title: 'קרקה והאיים',
        placeIds: ['hrv-krka', 'hrv-kornati'],
        notes:
          'מפלי קרקה בבוקר, ולמי שיש יום נוסף - שיט אל איי קורנאטי הקרסטיים.',
      },
      {
        day: 5,
        title: 'ספליט',
        placeIds: ['hrv-split', 'hrv-diocletian'],
        notes:
          'יום בעיר העתיקה שבתוך ארמון דיוקלטיאנוס, טיילת ריווה, ואפשר מעבורת קצרה לאי סמוך.',
      },
      {
        day: 6,
        title: 'דוברובניק',
        placeIds: ['hrv-dubrovnik'],
        notes:
          'הרחבה דרומה (כ-3 שעות נסיעה מספליט): הליכה על החומות בשעות הבוקר המוקדמות, ורכבל להר סרג׳ לשקיעה.',
      },
    ],
    practical: {
      flights:
        'אל על מפעילה קו ישיר מנתב"ג לזאגרב (ZAG) - כטיסה שבועית, כשלוש וחצי שעות, וחלק מהטיסות מבוצעות בפועל בידי ישראייר; קרואטיה איירליינס מוסיפה קו עונתי. לספליט ולדוברובניק אין קו ישיר קבוע - טסים לזאגרב ונוסעים/טסים פנימית, או עם החלפה באירופה.',
      gettingAround:
        'רכב שכור נוח ביותר לשילוב פארקים וחוף; יש גם כביש מהיר מצוין (בתשלום) בין זאגרב, זאדאר וספליט ואוטובוסים בין-עירוניים תכופים. לאיים - מעבורות מזאדאר, שיבניק וספליט. בעונה כדאי להזמין חניה וכרטיסי פארק מראש.',
      kosherOverview:
        'אין בקרואטיה מסעדה כשרה פתוחה לקהל. בית חב"ד בזאגרב מספק ארוחות שבת, מוצרים כשרים וקייטרינג שנשלח גם לערי החוף - הכול בהזמנה מראש (מומלץ כשבוע). הקהילה היהודית המקומית מפרסמת גם מדריך מוצרים כשרים לסופרמרקטים, שימושי למי שמטייל בפארקים ובאיים.',
    },
  },
  {
    slug: 'kathmandu',
    name: 'קטמנדו וההימלאיה',
    nameLocal: 'Kathmandu & the Himalayas',
    countrySlug: 'nepal',
    flag: '🇳🇵',
    center: { lat: 28.2, lng: 85.0 },
    zoom: 7,
    tagline: 'מקדשים, פסגות של 8,000 מטר ומסלולי טרק אגדיים',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg/500px-Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg',
    iconicLandmark: {
      name: 'הר האוורסט',
      nameLocal: 'Mount Everest / Sagarmatha',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg/500px-Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg',
      blurb:
        'הפסגה הגבוהה בעולם (8,849 מ׳) על הגבול בין נפאל לטיבט - ורוב המטיילים פוגשים אותה מהשבילים של אזור הקומבו או מטיסת תצפית.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'הרים ברמה שאין דומה לה, מסלולי טרק לכל רמה ותשתית מטיילים זולה - ובקטמנדו בית חב"ד עם מסעדה כשרה, נדיר באסיה. חסרונות: אין טיסה ישירה (כ-13 שעות עם החלפה), קטמנדו רועשת ומזוהמת, וטרקים גבוהים דורשים התאקלמות, ביטוח מתאים והרבה תכנון.',
    },
    summary:
      'נפאל מציעה שני עולמות: עמק קטמנדו עם כיכרות הדורבר, הסטופות הענקיות בודהנאת וסוואיאמבונאת והעיר העתיקה בהקטפור - וההימלאיה עצמה, עם רכס האנאפורנה מעל פוקהרה, אזור האוורסט בפארק סגרמאתא ושבילי טרק מפורסמים כמו פון היל. בשפלה הדרומית שוכן פארק צ׳יטוואן עם הקרנפים והפילים. בקטמנדו יש גם בית חב"ד עם מסעדה כשרה בשרית וחלבית.',
    bestSeason:
      'אוקטובר-נובמבר (הכי צלול ויציב לטרקים) ומרץ-אפריל (פריחת הרודודנדרון) · יוני-ספטמבר עונת מונסון - שבילים בוציים ונופים מעוננים · בחורף קר מאוד בגבהים',
    places: [
      {
        id: 'npl-everest',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg/500px-Mt._Everest_from_Gokyo_Ri_November_5%2C_2012.jpg',
        tags: ['outdoors'],
        priceLevel: 3,
        mustSee: true,
        name: 'הר האוורסט',
        nameLocal: 'Mount Everest',
        category: 'nature',
        lat: 27.9883,
        lng: 86.9253,
        description:
          'הפסגה הגבוהה בעולם, 8,849 מ׳. המטיילים הרגילים לא מטפסים אלא הולכים אל מחנה הבסיס (כ-12 יום הלוך-חזור מלוקלה) או טסים בטיסת תצפית של שעה מקטמנדו.',
        rating: 4.8,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Mount+Everest',
      },
      {
        id: 'npl-sagarmatha',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Valley%2C_Tengboche%2C_Mountains_of_Nepal.jpg/500px-Valley%2C_Tengboche%2C_Mountains_of_Nepal.jpg',
        tags: ['outdoors'],
        priceLevel: 3,
        name: 'פארק סגרמאתא (אזור האוורסט)',
        nameLocal: 'Sagarmatha National Park',
        category: 'nature',
        lat: 27.9333,
        lng: 86.7333,
        description:
          'אתר מורשת עולמית שמקיף את האוורסט, ובו כפרי השרפה, מנזרים כמו טנגבוצ׳ה וקרחונים. הכניסה בטיסה קטנה ללוקלה ואז ימי הליכה - כל השאר נעשה ברגל ובעזרת סבלים ופרדות.',
        rating: 4.8,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Sagarmatha+National+Park',
      },
      {
        id: 'npl-annapurna',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/South_Face_of_Annapurna_I_%28Main%29.jpg/500px-South_Face_of_Annapurna_I_%28Main%29.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'רכס אנאפורנה',
        nameLocal: 'Annapurna Massif',
        category: 'nature',
        lat: 28.5961,
        lng: 83.8203,
        description:
          'רכס הימלאיה מעל פוקהרה שכולל פסגה מעל 8,000 מ׳ ועוד שכנות מושלגות. סביבו רשת הטרקים הפופולרית בנפאל - ממסלולים של ימים ספורים ועד הקפת הרכס בכשבועיים.',
        rating: 4.8,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Annapurna+Massif',
      },
      {
        id: 'npl-poonhill',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Poon_hill_sunrise.jpg/500px-Poon_hill_sunrise.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'פון היל',
        nameLocal: 'Poon Hill',
        category: 'viewpoint',
        lat: 28.4,
        lng: 83.6895,
        description:
          'תצפית זריחה בגובה כ-3,210 מ׳ מול רכסי אנאפורנה ודאולאגירי, בקצה טרק קצר ופופולרי של 3-4 ימים מפוקהרה - המסלול הקלאסי למי שרוצה טעימה מההימלאיה.',
        rating: 4.7,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Poon+Hill',
      },
      {
        id: 'npl-pokhara',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Pokhara_Valley.jpg/500px-Pokhara_Valley.jpg',
        tags: ['outdoors', 'foodie'],
        priceLevel: 1,
        name: 'פוקהרה',
        nameLocal: 'Pokhara',
        category: 'attraction',
        lat: 28.2083,
        lng: 83.9889,
        description:
          'עיר האגם למרגלות האנאפורנה, ובירת הטרקים והפראגליידינג של נפאל. רגועה בהרבה מקטמנדו: בתי קפה על שפת האגם, סוכנויות טרקים ותצפיות זריחה על ההרים.',
        rating: 4.6,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Pokhara',
      },
      {
        id: 'npl-phewa',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Phewa_lake%2C_Pokhara.jpg/500px-Phewa_lake%2C_Pokhara.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'אגם פאווה',
        nameLocal: 'Phewa Lake',
        category: 'nature',
        lat: 28.2142,
        lng: 83.9472,
        description:
          'האגם של פוקהרה, ובו מקדש טאל בארהי על אי קטן. שוכרים סירת משוטים, ומהגדה המערבית עולים לפגודת השלום העולמית עם נוף על ההרים ועל האגם.',
        rating: 4.6,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Phewa+Lake',
      },
      {
        id: 'npl-chitwan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Chitwan_swamp.jpg/500px-Chitwan_swamp.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 2,
        name: 'הפארק הלאומי צ׳יטוואן',
        nameLocal: 'Chitwan National Park',
        category: 'nature',
        lat: 27.5,
        lng: 84.3333,
        description:
          'ג׳ונגל ואזורי ביצה בשפלה הדרומית, אתר מורשת עולמית - כאן חיים קרנף חד-קרן, פילים, תנינים ולפעמים נמר בנגלי. יוצאים לספארי בג׳יפ, בקאנו או ברגל עם ריינג׳ר.',
        rating: 4.6,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Chitwan+National+Park',
      },
      {
        id: 'npl-kathmandu',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Kathmandu-Durbar_Square-06-Mahavishnu-Kuh-Vishnu-Pratapamalla-Jagannath-2007-gje.jpg/500px-Kathmandu-Durbar_Square-06-Mahavishnu-Kuh-Vishnu-Pratapamalla-Jagannath-2007-gje.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'קטמנדו וכיכר הדורבר',
        nameLocal: 'Kathmandu Durbar Square',
        category: 'attraction',
        lat: 27.71,
        lng: 85.32,
        description:
          'הבירה הצפופה והצבעונית, ובלִבּה כיכר הדורבר עם ארמונות ומקדשי עץ מגולפים - אתר מורשת עולמית שחלקו שוקם אחרי רעידת האדמה של 2015. לידה שכונת תאמל של המטיילים.',
        rating: 4.4,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Kathmandu+Durbar+Square',
      },
      {
        id: 'npl-boudha',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Boudhanath_stupa_%2C_Kathmandu%2C_Nepal.jpg/500px-Boudhanath_stupa_%2C_Kathmandu%2C_Nepal.jpg',
        tags: ['history'],
        priceLevel: 0,
        mustSee: true,
        name: 'סטופת בודהנאת',
        nameLocal: 'Boudhanath Stupa',
        category: 'attraction',
        lat: 27.7214,
        lng: 85.3619,
        description:
          'אחת הסטופות הגדולות בעולם, מרכז החיים הטיבטיים בקטמנדו - עיני הבודהה על הכיפה, מאמינים שמקיפים אותה בשעות הערב וגלגלי תפילה סביב. אתר מורשת עולמית.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Boudhanath+Stupa',
      },
      {
        id: 'npl-swayambhu',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Swayambhunath_2018.jpg/500px-Swayambhunath_2018.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        name: 'סוואיאמבונאת (מקדש הקופים)',
        nameLocal: 'Swayambhunath',
        category: 'attraction',
        lat: 27.715,
        lng: 85.29,
        description:
          'סטופה עתיקה על גבעה מערבית לעיר, שאליה עולים בכ-365 מדרגות בין קופים - ומלמעלה נוף על כל עמק קטמנדו. אחד המקומות הטובים בעיר לשקיעה.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Swayambhunath',
      },
      {
        id: 'npl-bhaktapur',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Nyatpola_%26_Bhairav_Temple.jpg/500px-Nyatpola_%26_Bhairav_Temple.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        name: 'בהקטפור',
        nameLocal: 'Bhaktapur',
        category: 'attraction',
        lat: 27.6722,
        lng: 85.4278,
        description:
          'העיר העתיקה השמורה ביותר בעמק: כיכרות אבן, מקדש נייטפולה בן חמש הקומות, סדנאות קדרות ורחובות ללא מכוניות. שעה מקטמנדו, ומרגישה כמו מאה שנה אחורה.',
        rating: 4.7,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Bhaktapur',
      },
      {
        id: 'npl-nagarkot',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/2015-03-18_Nagarkot_Hotel_Galaxy_DSCF2094.jpg/500px-2015-03-18_Nagarkot_Hotel_Galaxy_DSCF2094.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'נגרקוט',
        nameLocal: 'Nagarkot',
        category: 'viewpoint',
        lat: 27.7236,
        lng: 85.5247,
        description:
          'כפר על רכס במזרח עמק קטמנדו, בגובה כ-2,100 מ׳ - הנקודה הקלאסית לזריחה מול רכסי ההימלאיה בלי לצאת לטרק. שעה וחצי מהעיר, ולנים שם לילה.',
        rating: 4.4,
        durationMin: 720,
        externalUrl: 'https://maps.google.com/?q=Nagarkot',
      },
      {
        id: 'npl-chabad',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Thamel_at_night_-_Kathmandu%2C_Nepal_-_panoramio_%281%29.jpg/500px-Thamel_at_night_-_Kathmandu%2C_Nepal_-_panoramio_%281%29.jpg',
        tags: ['foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'בית חב"ד קטמנדו',
        nameLocal: 'Chabad House Kathmandu, Thamel',
        category: 'kosher-food',
        lat: 27.7152,
        lng: 85.3102,
        description:
          'בית חב"ד בשכונת תאמל (Pushpalal Path) עם מסעדה כשרה - בשרי וחלבי - שמגישה אוכל ישראלי ומקומי, ארוחות שבת וליל הסדר המפורסם שמושך אלפי מטיילים. אחת הכתובות המוכרות לישראלים באסיה.',
        kosherNote: 'בהשגחת בית חב"ד נפאל. שעות ותפריט משתנים לפי העונה - לוודא מולם, במיוחד סביב החגים.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית חב"ד נפאל, קטמנדו',
        },
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Chabad+House+Kathmandu',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'קטמנדו - התאקלמות',
        placeIds: ['npl-kathmandu', 'npl-chabad'],
        notes:
          'נחיתה, מנוחה מהטיסה הארוכה וסיבוב בכיכר הדורבר ובתאמל. ארוחת ערב כשרה בבית חב"ד, וסידור אישורי טרק (TIMS/היתרי פארק) לפי המסלול.',
      },
      {
        day: 2,
        title: 'הסטופות והעיר העתיקה',
        placeIds: ['npl-boudha', 'npl-swayambhu', 'npl-bhaktapur'],
        notes:
          'בוקר בבודהנאת, צהריים בסוואיאמבונאת עם נוף לעמק, ואחר הצהריים בהקטפור השמורה.',
      },
      {
        day: 3,
        title: 'זריחה בנגרקוט',
        placeIds: ['npl-nagarkot'],
        notes:
          'עולים לרכס נגרקוט, לנים שם ורואים זריחה מול ההימלאיה - תצפית הרים בלי טרק.',
      },
      {
        day: 4,
        title: 'פוקהרה והאגם',
        placeIds: ['npl-pokhara', 'npl-phewa'],
        notes:
          'טיסה קצרה או נסיעה ארוכה לפוקהרה, שיט באגם פאווה ופגודת השלום. כאן גם סוגרים את פרטי הטרק.',
      },
      {
        day: 5,
        title: 'טרק פון היל',
        placeIds: ['npl-poonhill', 'npl-annapurna'],
        notes:
          'טרק של 3-4 ימים מפוקהרה: כפרים, מדרגות אינסופיות וזריחה מפון היל מול האנאפורנה. עם מדריך וסבל, ובקצב שמתאים לגובה.',
      },
      {
        day: 6,
        title: 'צ׳יטוואן או אזור האוורסט',
        placeIds: ['npl-chitwan', 'npl-sagarmatha', 'npl-everest'],
        notes:
          'בוחרים סיום: ספארי ג׳ונגל בצ׳יטוואן בשפלה, או טיסת תצפית לאוורסט - ולמי שיש שבועיים, טרק מחנה הבסיס מלוקלה.',
      },
    ],
    practical: {
      flights:
        'אין טיסה ישירה מנתב"ג לקטמנדו (KTM). טסים עם החלפה אחת - בעיקר דרך המפרץ (אבו דאבי, דובאי, שארג׳ה) או דרך הודו וסרי לנקה - סה"כ כ-13 שעות ומעלה. הטיסות הפנימיות בנפאל (לוקלה, פוקהרה) קטנות ותלויות מזג אוויר, וכדאי להשאיר יום מרווח.',
      gettingAround:
        'בקטמנדו ובפוקהרה - טוק-טוק, מוניות ואפליקציית Pathao/InDrive. בין הערים: אוטובוסי תיירים (7-8 שעות לפוקהרה) או טיסה פנימית של 25 דקות. הטרקים עצמם נעשים ברגל, ורוב המטיילים לוקחים מדריך וסבל מקומיים - בחלק מהמסלולים זו גם דרישה רשמית.',
      kosherOverview:
        'בקטמנדו יש בית חב"ד ותיק בשכונת תאמל עם מסעדה כשרה בשרית וחלבית, ארוחות שבת וליל הסדר הגדול באסיה - כתובת מוכרת ומרכזית לישראלים. בפוקהרה פועלת נוכחות חב"ד עונתית ומשתנה, ולכן כדאי לבדוק מולם לפני שמסתמכים עליה. במסלולי הטרק ובכפרים אין כשרות - נוהגים להצטייד מראש ולהסתמך על אוכל צמחוני ופשוט (דאל באט).',
    },
  },
  {
    slug: 'halong',
    name: 'האנוי ומפרץ הא לונג',
    nameLocal: 'Hanoi & Hạ Long Bay',
    countrySlug: 'vietnam',
    flag: '🇻🇳',
    center: { lat: 21.3, lng: 105.6 },
    zoom: 7,
    tagline: 'צוקי גיר במים ירוקים, שדות אורז מדורגים ואוכל רחוב',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/500px-Ha_Long_Bay_in_2019.jpg',
    iconicLandmark: {
      name: 'מפרץ הא לונג',
      nameLocal: 'Hạ Long Bay',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/500px-Ha_Long_Bay_in_2019.jpg',
      blurb:
        'מפרץ באתר מורשת עולמית שבו כ-1,600 איי גיר וצוקים מזדקרים מהמים הירוקים - הנוף המזוהה ביותר עם וייטנאם.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'נוף קארסט יוצא דופן, שדות אורז והרים בצפון, מחירים נמוכים - ומ-2026 גם טיסה ישירה מנתב"ג להאנוי, עם מסעדות כשרות של חב"ד בשתי הערים הגדולות. חסרונות: הא לונג עמוס מאוד ואיכות השיט משתנה מאוד בין המפעילים, האקלים לח, ובצפון יש עונת גשמים ממושכת.',
    },
    summary:
      'צפון וייטנאם מרכז את הנופים המפורסמים של המדינה: מפרץ הא לונג ואי קאט בא עם אלפי צוקי הגיר, "הא לונג היבשתית" בנין בין עם השיט בין ההרים ושדות האורז, ההרים ושדות המדרגות של סאפה ופסגת פאנסיפן, ומסלול האופנועים של הא ג׳יאנג בהרי הגבול. הבסיס הוא האנוי - עיר עתיקה, צפופה וטעימה - שבה גם בית חב"ד עם מסעדה כשרה.',
    bestSeason:
      'אוקטובר-אפריל בצפון (יבש וקריר יחסית; ספטמבר-אוקטובר שדות האורז זהובים בסאפה) · מאי-אוגוסט חם, לח וגשום · בחורף בסאפה יכול לרדת מתחת ל-10 מעלות',
    places: [
      {
        id: 'vnm-halong',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Ha_Long_Bay_in_2019.jpg/500px-Ha_Long_Bay_in_2019.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'מפרץ הא לונג',
        nameLocal: 'Hạ Long Bay',
        category: 'nature',
        lat: 20.9,
        lng: 107.2,
        description:
          'כ-1,600 איי גיר וצוקים במים ירוקים, אתר מורשת עולמית. מבקרים בשיט של יום או בשיט לינה, עם קיאקים, מערות ומפרצים - איכות החוויה תלויה מאוד בחברה ובמסלול שבוחרים.',
        rating: 4.7,
        durationMin: 720,
        externalUrl: 'https://maps.google.com/?q=Ha+Long+Bay',
      },
      {
        id: 'vnm-catba',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Cat_Ba_town.JPG/500px-Cat_Ba_town.JPG',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'אי קאט בא',
        nameLocal: 'Cát Bà Island',
        category: 'nature',
        lat: 20.8,
        lng: 106.9997,
        description:
          'האי הגדול באזור הא לונג, ובו פארק לאומי, מסלולי הליכה, חופים קטנים ומפרץ לאן הא השקט יותר - חלופה פחות עמוסה לשיט הקלאסי, עם אפשרות לקיאקים ולטיפוס.',
        rating: 4.5,
        durationMin: 720,
        externalUrl: 'https://maps.google.com/?q=Cat+Ba+Island',
      },
      {
        id: 'vnm-ninhbinh',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Tam_Coc_by_Tuan_Mai_%22007%22_%288888350545%29.jpg/500px-Tam_Coc_by_Tuan_Mai_%22007%22_%288888350545%29.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'נין בין - "הא לונג היבשתית"',
        nameLocal: 'Ninh Bình (Tam Cốc & Tràng An)',
        category: 'nature',
        lat: 20.25,
        lng: 105.8333,
        description:
          'אזור של צוקי גיר שמתנשאים מתוך שדות אורז ונהרות. שטים בסירת משוטים בין המצוקים ודרך מערות בתאם קוק ובטראנג אן, ומטפסים לתצפית מוא קייב. כשעתיים מהאנוי.',
        rating: 4.7,
        durationMin: 600,
        externalUrl: 'https://maps.google.com/?q=Ninh+Binh',
      },
      {
        id: 'vnm-sapa',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Thacbac3.jpg/500px-Thacbac3.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'סאפה ושדות האורז',
        nameLocal: 'Sa Pa',
        category: 'nature',
        lat: 22.3406,
        lng: 103.8308,
        description:
          'עיירת הרים בצפון-מערב, ומסביבה מדרגות אורז בעמק מואונג הואה וכפרים של קבוצות אתניות (המונג, דאו). מסלולי הליכה של יום או יומיים בין הכפרים, עם לינה בבתי מקומיים.',
        rating: 4.6,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Sa+Pa+Vietnam',
      },
      {
        id: 'vnm-fansipan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Fansipan_Summit.jpg/500px-Fansipan_Summit.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'פסגת פאנסיפן',
        nameLocal: 'Fansipan',
        category: 'viewpoint',
        lat: 22.3033,
        lng: 103.775,
        description:
          'הפסגה הגבוהה בהודו-סין (3,143 מ׳), מעל סאפה. אפשר לעלות ברכבל ארוך במיוחד ואז ברכבת שיניים קצרה, או ללכת טרק של יום-יומיים; למעלה מקדשים ופסל בודהה גדול.',
        rating: 4.4,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Fansipan',
      },
      {
        id: 'vnm-hagiang',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/H%C3%A0_Giang_City.jpg/500px-H%C3%A0_Giang_City.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'הא ג׳יאנג',
        nameLocal: 'Hà Giang',
        category: 'nature',
        lat: 22.8333,
        lng: 104.9833,
        description:
          'הפרובינציה הצפונית ביותר, על גבול סין - מסלול טבעתי מפורסם בין רכסי גיר, מעברי הרים וכפרים מסורתיים. עושים אותו באופנוע עם נהג מקומי (easy rider) או ברכב פרטי, 3-4 ימים.',
        rating: 4.7,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Ha+Giang',
      },
      {
        id: 'vnm-phongnha',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Phongnhakebang6.jpg/500px-Phongnhakebang6.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'פונג ניה-קה באנג',
        nameLocal: 'Phong Nha–Kẻ Bàng National Park',
        category: 'nature',
        lat: 17.5372,
        lng: 106.1514,
        description:
          'פארק מערות ענק במרכז המדינה, אתר מורשת עולמית, ובו כמה מהמערות הגדולות בעולם (סון דונג בהן). מבקרים במערות פונג ניה ופרדייז בשיט ובהליכה. מגיעים בטיסה לדונג הוי או ברכבת לילה מהאנוי.',
        rating: 4.7,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Phong+Nha+Ke+Bang',
      },
      {
        id: 'vnm-hanoi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Hanoi_skyline_with_Ba_Vi_Mountain.jpg/500px-Hanoi_skyline_with_Ba_Vi_Mountain.jpg',
        tags: ['foodie', 'history'],
        priceLevel: 1,
        mustSee: true,
        name: 'האנוי',
        nameLocal: 'Hanoi',
        category: 'attraction',
        lat: 21.0,
        lng: 105.85,
        description:
          'הבירה: רובע 36 הרחובות הצפוף, מקדשים, שרידי התקופה הקולוניאלית ואוכל רחוב שנחשב מהטובים באסיה. גם נקודת המוצא לכל הצפון - רכבות לילה ואוטובוסים לכל הכיוונים.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Hanoi',
      },
      {
        id: 'vnm-hoankiem',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Thap_Rua.jpg/500px-Thap_Rua.jpg',
        tags: ['families'],
        priceLevel: 0,
        name: 'אגם הואן קיים',
        nameLocal: 'Hoàn Kiếm Lake',
        category: 'nature',
        lat: 21.0289,
        lng: 105.8525,
        description:
          'הלב הירוק של האנוי: אגם עירוני עם מגדל הצב במרכזו וגשר אדום למקדש נגוק סון. בסופי שבוע הרחובות סביבו נסגרים לתנועה והופכים למרחב הולכי רגל.',
        rating: 4.5,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Hoan+Kiem+Lake',
      },
      {
        id: 'vnm-chabad',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'בית חב"ד האנוי',
        nameLocal: 'Chabad of Hanoi',
        category: 'kosher-food',
        lat: 21.0,
        lng: 105.85,
        description:
          'בית חב"ד בהאנוי (אזור To Ngoc Van) עם מסעדה כשרה - בשר, עוף וצמחוני - ארוחות שבת בהרשמה מראש ומשלוחים בעיר. פועל בימים ראשון-חמישי ובשישי סגור; לוודא שעות מולם. הסימון הוא באזור העיר.',
        kosherNote: 'בהשגחת Kosher Vietnam (רב הקהילה בווייטנאם). לתאם ארוחות שבת ומשלוחים מראש.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'Kosher Vietnam - בית חב"ד וייטנאם',
        },
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Chabad+of+Hanoi',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'האנוי',
        placeIds: ['vnm-hanoi', 'vnm-hoankiem', 'vnm-chabad'],
        notes:
          'יום התאקלמות: רובע 36 הרחובות, אגם הואן קיים ואוכל רחוב. למי שמקפיד - ארוחה כשרה בבית חב"ד (בימים א-ה).',
      },
      {
        day: 2,
        title: 'מפרץ הא לונג',
        placeIds: ['vnm-halong', 'vnm-catba'],
        notes:
          'שיט במפרץ - יום או לינה על סירה. שווה לבדוק מסלול שכולל את מפרץ לאן הא ואת קאט בא, שם פחות עמוס.',
      },
      {
        day: 3,
        title: 'נין בין',
        placeIds: ['vnm-ninhbinh'],
        notes:
          'סירת משוטים בין צוקי הגיר בטראנג אן או תאם קוק, אופניים בין שדות האורז וטיפוס לתצפית מוא קייב.',
      },
      {
        day: 4,
        title: 'סאפה והרי הצפון',
        placeIds: ['vnm-sapa', 'vnm-fansipan'],
        notes:
          'רכבת לילה או אוטובוס לסאפה, הליכה בין כפרי המדרגות, ולמי שרוצה - רכבל לפסגת פאנסיפן.',
      },
      {
        day: 5,
        title: 'הרחבה: הא ג׳יאנג או פונג ניה',
        placeIds: ['vnm-hagiang', 'vnm-phongnha'],
        notes:
          'לבעלי זמן: מסלול הטבעת של הא ג׳יאנג בצפון (3-4 ימים), או טיסה דרומה למערות פונג ניה.',
      },
    ],
    practical: {
      flights:
        'מ-2026 יש טיסות ישירות מנתב"ג להאנוי (HAN): ארקיע פתחה את הקו בינואר 2026 (כ-1-3 טיסות בשבוע), ואל על הודיעה על קו ישיר שמתחיל ב-24 באוקטובר 2026 בשלוש טיסות שבועיות ב-787. לוחות הזמנים בקווים חדשים משתנים - כדאי לוודא לפני ההזמנה; לחלופין טסים עם החלפה בבנגקוק, איסטנבול או המפרץ.',
      gettingAround:
        'בהאנוי: Grab (מוניות ואופנועים) זול ונוח. בין אזורים: רכבות לילה (האנוי-סאפה/לאו קאי, האנוי-דונג הוי), אוטובוסי שינה וטיסות פנים קצרות. בהרים נהוג לשכור נהג מקומי; נהיגה עצמאית על אופנוע דורשת רישיון מתאים וביטוח - לא לזלזל בזה.',
      kosherOverview:
        'בהאנוי פועל בית חב"ד עם מסעדה כשרה (בשר, עוף וצמחוני), ארוחות שבת בהרשמה ומשלוחים בעיר; בהו צ׳י מין יש בית חב"ד נוסף עם מסעדה כשרה. ההשגחה היא של רב הקהילה בווייטנאם (Kosher Vietnam). מחוץ לשתי הערים - בהא לונג, סאפה, נין בין והא ג׳יאנג - אין כשרות, ולכן נוהגים להצטייד מראש; אוכל צמחוני זמין בכל מקום, אבל רוטב דגים נוכח כמעט בכל מנה מקומית.',
    },
  },
  {
    slug: 'lofoten',
    name: 'לופוטן והפיורדים',
    nameLocal: 'Lofoten & the Norwegian Fjords',
    countrySlug: 'norway',
    flag: '🇳🇴',
    center: { lat: 63.5, lng: 10.0 },
    zoom: 5,
    tagline: 'צוקים מעל המים, כפרי דייגים אדומים וזוהר צפוני',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Moskenes_Reinebringen_lub_2025-07-21_img09_Aussicht.jpg/500px-Moskenes_Reinebringen_lub_2025-07-21_img09_Aussicht.jpg',
    iconicLandmark: {
      name: 'איי לופוטן',
      nameLocal: 'Lofoten Islands',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Moskenes_Reinebringen_lub_2025-07-21_img09_Aussicht.jpg/500px-Moskenes_Reinebringen_lub_2025-07-21_img09_Aussicht.jpg',
      blurb:
        'שרשרת איים מעל החוג הארקטי שבה פסגות סלע חדות צונחות היישר אל מים טורקיז, ובין המפרצים כפרי דייגים עם בקתות עץ אדומות.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'נוף פיורדים וצוקים שקשה להאמין שהוא אמיתי, עם תשתית מצוינת ובטיחות גבוהה - ומעל החוג הארקטי גם זוהר צפוני ושמש חצות. חסרונות: אין טיסה ישירה מישראל, זה אחד היעדים היקרים באירופה, המרחקים גדולים מאוד ומזג האוויר משתנה בלי הודעה.',
    },
    summary:
      'נורווגיה מחולקת לשני חלקים שכדאי להכיר: הפיורדים שבמערב - גיירנגר ונרויפיורד שהם אתרי מורשת עולמית, וצוקי פרייקסטולן וטרולטונגה שמעליהם - ואיי לופוטן שבצפון, מעל החוג הארקטי, עם כפרי דייגים, חופים לבנים ופסגות שצונחות לים. ברגן היא שער הכניסה למערב, וטרומסו היא בירת הזוהר הצפוני.',
    bestSeason:
      'יוני-אוגוסט (שמש חצות בצפון, כל הדרכים והמסלולים פתוחים) · ספטמבר-מרץ עונת זוהר צפוני בטרומסו ובלופוטן · טרולטונגה ופרייקסטולן נגישים בבטחה בעיקר ביוני-ספטמבר',
    places: [
      {
        id: 'nor-lofoten',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Moskenes_Reinebringen_lub_2025-07-21_img09_Aussicht.jpg/500px-Moskenes_Reinebringen_lub_2025-07-21_img09_Aussicht.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'איי לופוטן',
        nameLocal: 'Lofoten Islands',
        category: 'nature',
        lat: 68.3333,
        lng: 14.6667,
        description:
          'ארכיפלג מעל החוג הארקטי, ובו פסגות סלע שיורדות לים, חופי חול לבן ומים בצבע טורקיז. נוסעים בין האיים בכביש E10 עם גשרים ומנהרות; בקיץ שמש חצות, בחורף זוהר צפוני.',
        rating: 4.9,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Lofoten',
      },
      {
        id: 'nor-reine',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Reine_at_Reinefjorden%2C_2010_September.jpg/500px-Reine_at_Reinefjorden%2C_2010_September.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'ריינה',
        nameLocal: 'Reine',
        category: 'attraction',
        lat: 67.9325,
        lng: 13.0888,
        description:
          'כפר דייגים על מפרץ מוקף פסגות, עם בקתות רורבו אדומות מעל המים - התמונה המזוהה ביותר עם לופוטן. מעליו מסלול המדרגות התלול לריינברינגן עם התצפית המפורסמת.',
        rating: 4.8,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Reine+Lofoten',
      },
      {
        id: 'nor-geiranger',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Geirangerfjord_.jpg/500px-Geirangerfjord_.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 2,
        mustSee: true,
        name: 'גיירנגר-פיורד',
        nameLocal: 'Geirangerfjord',
        category: 'nature',
        lat: 62.121,
        lng: 7.129,
        description:
          'פיורד צר באתר מורשת עולמית, ובו מפלי "שבע האחיות" שיורדים מהקירות וחוות נטושות על מדפי סלע. שיט קצר מגיירנגר, ותצפיות דרמטיות מדלסניבה ומכביש הנשרים.',
        rating: 4.8,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Geirangerfjord',
      },
      {
        id: 'nor-naeroy',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Naer%C3%B8yfjorden.jpg/500px-Naer%C3%B8yfjorden.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'נרוי-פיורד',
        nameLocal: 'Nærøyfjord',
        category: 'nature',
        lat: 60.9436,
        lng: 6.9314,
        description:
          'אחד הפיורדים הצרים בעולם (במקומות מסוימים כ-250 מ׳ רוחב), זרוע של הסוגנה-פיורד ואתר מורשת עולמית. השיט גודוואנגן-פלאם הוא הקטע היפה, ומשתלב עם רכבת פלאם.',
        rating: 4.8,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Naeroyfjord',
      },
      {
        id: 'nor-preikestolen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Lyse_Fjord_et_Preikestolen.jpg/500px-Lyse_Fjord_et_Preikestolen.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'פרייקסטולן (סלע הדוכן)',
        nameLocal: 'Preikestolen (Pulpit Rock)',
        category: 'viewpoint',
        lat: 58.9867,
        lng: 6.1875,
        description:
          'מדף סלע שטוח שתלוי כ-600 מ׳ מעל הלייספיורד - אחד המסלולים המפורסמים בנורווגיה. ההליכה כ-8 ק"מ הלוך-חזור, 3-4 שעות, ואין מעקה בקצה.',
        rating: 4.8,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Preikestolen',
      },
      {
        id: 'nor-trolltunga',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Trolltunga_2017.jpg/500px-Trolltunga_2017.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'טרולטונגה (לשון הטרול)',
        nameLocal: 'Trolltunga',
        category: 'viewpoint',
        lat: 60.133,
        lng: 6.754,
        description:
          'לשון סלע שמזדקרת מעל אגם רינגדאלס-ואטן בגובה של כ-700 מ׳. המסלול קשה ותובעני - כ-20-28 ק"מ ליום שלם - ופתוח בבטחה בעיקר בקיץ ובתחילת הסתיו, לעתים בליווי מדריך.',
        rating: 4.7,
        durationMin: 720,
        externalUrl: 'https://maps.google.com/?q=Trolltunga',
      },
      {
        id: 'nor-jotunheimen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Utsiktgald1.jpg/500px-Utsiktgald1.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'יוטונהיימן',
        nameLocal: 'Jotunheimen National Park',
        category: 'nature',
        lat: 61.605,
        lng: 8.4775,
        description:
          'פארק ההרים הגבוה בנורווגיה - "בית הענקים" - ובו הפסגות הגבוהות במדינה, קרחונים ואגמים. כאן עובר גם רכס בסגן, מהמסלולים המפורסמים באירופה.',
        rating: 4.7,
        durationMin: 600,
        externalUrl: 'https://maps.google.com/?q=Jotunheimen',
      },
      {
        id: 'nor-bergen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Bergen_panorama_at_night_-_panoramio_%281%29.jpg/500px-Bergen_panorama_at_night_-_panoramio_%281%29.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 2,
        name: 'ברגן',
        nameLocal: 'Bergen',
        category: 'attraction',
        lat: 60.3894,
        lng: 5.33,
        description:
          'שער הפיורדים: רציף בריגן ההנזאתי עם בתי העץ הצבעוניים (אתר מורשת עולמית), שוק דגים, ורכבל פלויבנן לתצפית מעל העיר. גשומה מאוד - זה חלק מהאופי.',
        rating: 4.6,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Bergen+Norway',
      },
      {
        id: 'nor-tromso',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Troms%C3%B8_sentrum_%285835702754%29.jpg/500px-Troms%C3%B8_sentrum_%285835702754%29.jpg',
        tags: ['outdoors', 'nightlife'],
        priceLevel: 2,
        name: 'טרומסו',
        nameLocal: 'Tromsø',
        category: 'attraction',
        lat: 69.6517,
        lng: 18.9556,
        description:
          'העיר הגדולה מעל החוג הארקטי, ובירת הזוהר הצפוני: קתדרלת הארקטי, רכבל פיילהיים, וטיולי ציד זוהר, כלבי מזחלות ולווייתנים בעונה.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Tromso',
      },
      {
        id: 'nor-lyngen',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Lyngen.jpg/500px-Lyngen.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        name: 'אלפי לינגן',
        nameLocal: 'Lyngen Alps',
        category: 'nature',
        lat: 69.7903,
        lng: 20.1695,
        description:
          'רכס אלפיני חד מזרחית לטרומסו, עם פסגות שצונחות לפיורד וקרחונים קטנים - אזור מוביל לסקי טורינג באביב ולמסלולי הליכה בקיץ.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Lyngen+Alps',
      },
      {
        id: 'nor-oslo',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Nationaltheatret_evening.jpg/500px-Nationaltheatret_evening.jpg',
        tags: ['art', 'families'],
        priceLevel: 2,
        name: 'אוסלו',
        nameLocal: 'Oslo',
        category: 'attraction',
        lat: 59.9133,
        lng: 10.7389,
        description:
          'הבירה, ובה בית האופרה שאפשר לטפס על גגו, מוזיאון מונק, פארק הפסלים ויגלנד ומוזיאוני הוויקינגים והספינות. נקודת מעבר טבעית בדרך לפיורדים ולצפון.',
        rating: 4.4,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Oslo',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'אוסלו',
        placeIds: ['nor-oslo'],
        notes:
          'נחיתה בבירה (עם החלפה מאירופה): בית האופרה, פארק ויגלנד ומוזיאון. ערב מוקדם - יוצאים מחר מערבה.',
      },
      {
        day: 2,
        title: 'ברגן והפיורד הצר',
        placeIds: ['nor-bergen', 'nor-naeroy'],
        notes:
          'רכבת נופית או טיסה קצרה לברגן, סיור בבריגן, ומשם שיט בנרוי-פיורד בשילוב רכבת פלאם.',
      },
      {
        day: 3,
        title: 'גיירנגר',
        placeIds: ['nor-geiranger'],
        notes:
          'יום פיורדים קלאסי: שיט בגיירנגר מול מפלי שבע האחיות, ותצפיות דלסניבה וכביש הנשרים.',
      },
      {
        day: 4,
        title: 'צוקים - פרייקסטולן או טרולטונגה',
        placeIds: ['nor-preikestolen', 'nor-trolltunga'],
        notes:
          'בוחרים מסלול לפי כושר: פרייקסטולן (3-4 שעות) או טרולטונגה (יום שלם ותובעני). לבדוק תנאי מזג אוויר ושעות אור.',
      },
      {
        day: 5,
        title: 'יוטונהיימן',
        placeIds: ['nor-jotunheimen'],
        notes:
          'יום הרים בפארק הגבוה במדינה - רכס בסגן או מסלול קצר יותר, בהתאם לתחזית.',
      },
      {
        day: 6,
        title: 'לופוטן',
        placeIds: ['nor-lofoten', 'nor-reine'],
        notes:
          'טיסה פנימית צפונה (בודו/סווולוואר) ומעבורת/כביש E10 בין האיים: ריינה, חופים לבנים ומסלול ריינברינגן.',
      },
      {
        day: 7,
        title: 'טרומסו והארקטי',
        placeIds: ['nor-tromso', 'nor-lyngen'],
        notes:
          'סיום בצפון: טרומסו, ובעונה - ציד זוהר צפוני או יום באלפי לינגן.',
      },
    ],
    practical: {
      flights:
        'אין טיסה ישירה מנתב"ג לנורווגיה. טסים עם החלפה אחת (וינה, איסטנבול, אמסטרדם, לונדון או בודפשט) לאוסלו (OSL), ולעתים ישירות לברגן. בתוך נורווגיה יש טיסות פנים תכופות וזולות יחסית לצפון (בודו, סווולוואר, טרומסו) - כמעט חובה בגלל המרחקים.',
      gettingAround:
        'רכב שכור לפיורדים ולופוטן, בשילוב מעבורות (נסיעה על מעבורת היא חלק מהכביש בנורווגיה). לצפון עדיף לטוס ולשכור רכב שם. רכבות נופיות מצוינות - אוסלו-ברגן ורכבת פלאם. בחורף נדרשים צמיגי חורף ובדיקת תנאי דרך.',
      kosherOverview:
        'אין באזור הפיורדים ובלופוטן שום נקודת כשרות. קהילה יהודית ובית כנסת יש באוסלו ובטרונדהיים, ובאוסלו אפשר לתאם מראש אוכל כשר דרך הקהילה - אך אין מסעדה כשרה פתוחה לקהל. הדרך המעשית: להצטייד באוסלו או מהבית, ולהסתמך על דגים, מוצרי חלב וירקות עם סימוני כשרות מוכרים בסופרמרקטים.',
    },
  },
  {
    slug: 'cape-town',
    name: 'קייפטאון וקרוגר',
    nameLocal: 'Cape Town & Kruger',
    countrySlug: 'south-africa',
    flag: '🇿🇦',
    center: { lat: -30.0, lng: 24.0 },
    zoom: 5,
    tagline: 'הר שולחן, פינגווינים על החוף וספארי של החמישייה הגדולה',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Table_Mountain_DanieVDM.jpg/500px-Table_Mountain_DanieVDM.jpg',
    iconicLandmark: {
      name: 'הר השולחן',
      nameLocal: 'Table Mountain',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Table_Mountain_DanieVDM.jpg/500px-Table_Mountain_DanieVDM.jpg',
      blurb:
        'הר שטוח-פסגה שמתנשא מעל קייפטאון לגובה של כ-1,085 מ׳, עם רכבל מסתובב ועשרות מסלולי הליכה - הסמל של העיר ואחד ההרים המזוהים בעולם.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'שילוב יוצא דופן של עיר, חופים, יין וספארי - ועם תשתית כשרות אמיתית בקייפטאון וביוהנסבורג, מהמפותחות בעולם מחוץ לישראל. חסרונות: אין כיום קו ישיר קבוע מישראל, המרחקים בין קייפטאון לקרוגר גדולים (טיסה פנימית), וצריך תשומת לב מתמדת לביטחון אישי.',
    },
    summary:
      'קייפטאון יושבת בין הר השולחן לאוקיינוס: רכבל לפסגה, כביש הצוקים של צ׳פמנס פיק, מושבת הפינגווינים בבולדרס ביץ׳, כף התקווה הטובה, הגן הבוטני קירסטנבוש ואי רובן. שעה משם - יקבי סטלנבוש, וממזרח מתחיל כביש הגן עם יערות ציציקאמה. בצפון-מזרח המדינה שוכן הפארק הלאומי קרוגר עם החמישייה הגדולה וקניון נהר הבלייד. בשכונת סי פוינט שבקייפטאון יש ריכוז מסעדות וחנויות כשרות.',
    bestSeason:
      'נובמבר-מרץ קיץ בקייפטאון (חופים ויין; חם ויבש) · מאי-ספטמבר העונה הטובה לספארי בקרוגר (יבש, החיות מתקבצות למים) · בקייפטאון החורף גשום ורוחות חזקות',
    places: [
      {
        id: 'zaf-table',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Table_Mountain_DanieVDM.jpg/500px-Table_Mountain_DanieVDM.jpg',
        tags: ['outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'הר השולחן',
        nameLocal: 'Table Mountain',
        category: 'nature',
        lat: -33.9622,
        lng: 18.4099,
        description:
          'ההר השטוח שמעל קייפטאון: עולים ברכבל מסתובב או במסלול פלטקליף גורג׳ התלול, ולמעלה שבילים ותצפיות על העיר, על החופים ועל האוקיינוס. נסגר ברוח חזקה - לבדוק לפני שנוסעים.',
        rating: 4.8,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Table+Mountain',
      },
      {
        id: 'zaf-capepoint',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Playa_Dias%2C_Cape_Point%2C_Sud%C3%A1frica%2C_2018-07-23%2C_DD_103.jpg/500px-Playa_Dias%2C_Cape_Point%2C_Sud%C3%A1frica%2C_2018-07-23%2C_DD_103.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'כף התקווה הטובה',
        nameLocal: 'Cape of Good Hope & Cape Point',
        category: 'nature',
        lat: -34.3581,
        lng: 18.4756,
        description:
          'הקצה הדרומי-מערבי של אפריקה, בתוך שמורת חצי האי: מצוקים מעל האוקיינוס, מגדלור ישן שאליו עולה פוניקולר, שבילי חוף ובעלי חיים כמו יענים ובבונים (לא להאכיל).',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Cape+Point',
      },
      {
        id: 'zaf-boulders',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Boulders_Beach_Suedafrika.jpg/500px-Boulders_Beach_Suedafrika.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 1,
        mustSee: true,
        name: 'חוף בולדרס והפינגווינים',
        nameLocal: 'Boulders Beach',
        category: 'nature',
        lat: -34.197,
        lng: 18.451,
        description:
          'מושבה של פינגווינים אפריקאיים שחיה בין סלעי גרניט ליד סיימונס טאון - צופים בהם ממסלולי עץ ממש מקרוב. אחת האטרקציות האהובות על משפחות באזור.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Boulders+Beach',
      },
      {
        id: 'zaf-chapmans',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Chapmans_Peak_Drive_2.jpg/500px-Chapmans_Peak_Drive_2.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'כביש צ׳פמנס פיק',
        nameLocal: "Chapman's Peak Drive",
        category: 'viewpoint',
        lat: -34.0872,
        lng: 18.3606,
        description:
          'כביש חצוב בקיר צוק מעל האוקיינוס בין הוט ביי לנורדהוק, עם תצפיות ומפרצים - אחת הנסיעות הנופיות היפות בעולם. כביש אגרה, ולעתים נסגר בגלל מפולות או מזג אוויר.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Chapmans+Peak+Drive',
      },
      {
        id: 'zaf-kirstenbosch',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Kirstenbosch_National_Botanical_Garden_2024_7th_batch_09.jpg/500px-Kirstenbosch_National_Botanical_Garden_2024_7th_batch_09.jpg',
        tags: ['families', 'outdoors'],
        priceLevel: 1,
        name: 'הגן הבוטני קירסטנבוש',
        nameLocal: 'Kirstenbosch Botanical Garden',
        category: 'nature',
        lat: -33.9875,
        lng: 18.4325,
        description:
          'גן בוטני על מדרונות הר השולחן, מהיפים בעולם, המוקדש לצמחיית הפינבוש המקומית - עם שביל חופה מוגבה בין העצים ומופעי קיץ על הדשא.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Kirstenbosch',
      },
      {
        id: 'zaf-robben',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Robben_Island_-_Cape_Town%2C_South_Africa_%283883849594%29.jpg/500px-Robben_Island_-_Cape_Town%2C_South_Africa_%283883849594%29.jpg',
        tags: ['history'],
        priceLevel: 2,
        name: 'אי רובן',
        nameLocal: 'Robben Island',
        category: 'museum',
        lat: -33.805,
        lng: 18.37,
        description:
          'האי שבו נכלא נלסון מנדלה 18 שנה, היום אתר מורשת עולמית ומוזיאון. מגיעים במעבורת מהוואטרפרונט, והסיור נערך בהדרכת אסירים לשעבר. להזמין מראש.',
        rating: 4.6,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Robben+Island',
      },
      {
        id: 'zaf-capetown',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Camps_bay_%2853460319478%29_%28cropped%29.jpg/500px-Camps_bay_%2853460319478%29_%28cropped%29.jpg',
        tags: ['foodie', 'families'],
        priceLevel: 2,
        name: 'קייפטאון',
        nameLocal: 'Cape Town',
        category: 'attraction',
        lat: -33.9253,
        lng: 18.4239,
        description:
          'העיר עצמה: הוואטרפרונט, שכונת בו-קאאפ הצבעונית, חופי קמפס ביי וקליפטון, שוק אולד ביסקיט מיל וסצנת אוכל חזקה - הכול בין ההר לאוקיינוס.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Cape+Town',
      },
      {
        id: 'zaf-seapoint',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'סי פוינט - המרכז הכשר',
        nameLocal: 'Sea Point kosher area, Cape Town',
        category: 'kosher-food',
        lat: -33.9153,
        lng: 18.3925,
        description:
          'שכונת החוף סי פוינט היא מרכז החיים היהודיים של קייפטאון: מסעדות, מאפיות וחנויות כשרות, בתי כנסת ובתי חב"ד - הכול בטווח הליכה. הסימון הוא ברמת השכונה ולא כתובת בודדת.',
        kosherNote:
          'הכשרות בקייפטאון בפיקוח בית הדין המקומי (Cape Beth Din). לוודא ברשימות העדכניות אילו עסקים תחת השגחה, ומה שעות הפתיחה בשישי-שבת.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'בית הדין של קייפטאון (Cape Beth Din)',
        },
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Sea+Point+Cape+Town',
      },
      {
        id: 'zaf-stellenbosch',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Stellenbosch_aerial_photo_from_north-west_2024-01.jpg/500px-Stellenbosch_aerial_photo_from_north-west_2024-01.jpg',
        tags: ['foodie', 'romantic'],
        priceLevel: 2,
        name: 'סטלנבוש והיקבים',
        nameLocal: 'Stellenbosch Winelands',
        category: 'attraction',
        lat: -33.9367,
        lng: 18.8614,
        description:
          'עיירה הולנדית-קייפית עם רחובות עצים ואדריכלות לבנה, מוקפת עמקי כרמים והרים - אזור היין המפורסם של דרום אפריקה, כשעה מקייפטאון.',
        rating: 4.6,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Stellenbosch',
      },
      {
        id: 'zaf-tsitsikamma',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Tsitsikamma_Park.JPG/500px-Tsitsikamma_Park.JPG',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'ציציקאמה וכביש הגן',
        nameLocal: 'Tsitsikamma & the Garden Route',
        category: 'nature',
        lat: -34.0217,
        lng: 23.8956,
        description:
          'החלק הימי של פארק כביש הגן: יער עד, מצוקים, גשרים תלויים מעל שפך נהר הסטורמס ומסלולי הליכה לאורך החוף. נקודת שיא בנסיעה המזרחה מקייפטאון.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Tsitsikamma+National+Park',
      },
      {
        id: 'zaf-kruger',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Kruger_Zebra.JPG/500px-Kruger_Zebra.JPG',
        tags: ['outdoors', 'families'],
        priceLevel: 2,
        mustSee: true,
        name: 'הפארק הלאומי קרוגר',
        nameLocal: 'Kruger National Park',
        category: 'nature',
        lat: -24.0,
        lng: 31.5,
        description:
          'אחד משמורות הטבע הגדולות באפריקה, בשטח של כ-20 אלף קמ"ר, ובו החמישייה הגדולה. ייחודו: אפשר לנהוג בו ברכב פרטי בכבישים סלולים ולישון במחנות מגודרים - ספארי עצמאי ולא רק מאורגן.',
        rating: 4.8,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Kruger+National+Park',
      },
      {
        id: 'zaf-blyde',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/20131119_162543b.jpg/500px-20131119_162543b.jpg',
        tags: ['outdoors'],
        priceLevel: 1,
        name: 'קניון נהר הבלייד',
        nameLocal: 'Blyde River Canyon',
        category: 'nature',
        lat: -24.6789,
        lng: 30.8843,
        description:
          'אחד הקניונים הגדולים בעולם, ירוק כמעט לכל אורכו, בדרך לקרוגר: תצפית "שלושת הרונדוואלים", בורות הענק של בורקס לאק וחלון האלוהים.',
        rating: 4.7,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Blyde+River+Canyon',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'קייפטאון - העיר וההר',
        placeIds: ['zaf-capetown', 'zaf-table', 'zaf-seapoint'],
        notes:
          'רכבל להר השולחן בבוקר (לפני שהרוח מתחזקת), אחר הצהריים הוואטרפרונט ובו-קאאפ, וארוחה כשרה בסי פוינט.',
      },
      {
        day: 2,
        title: 'חצי האי - פינגווינים וכף התקווה',
        placeIds: ['zaf-chapmans', 'zaf-boulders', 'zaf-capepoint'],
        notes:
          'יום נסיעה נופי: כביש צ׳פמנס פיק, מושבת הפינגווינים בבולדרס, וכף התקווה הטובה בקצה חצי האי.',
      },
      {
        day: 3,
        title: 'גנים, אי ויקבים',
        placeIds: ['zaf-kirstenbosch', 'zaf-robben', 'zaf-stellenbosch'],
        notes:
          'בוקר בקירסטנבוש או במעבורת לאי רובן (להזמין מראש), ואחר הצהריים בעמק היין של סטלנבוש.',
      },
      {
        day: 4,
        title: 'כביש הגן',
        placeIds: ['zaf-tsitsikamma'],
        notes:
          'נוסעים מזרחה לאורך כביש הגן: מפרצים, יערות ומסלולי חוף בציציקאמה. אפשר להאריך ליומיים-שלושה.',
      },
      {
        day: 5,
        title: 'קרוגר - ספארי',
        placeIds: ['zaf-kruger'],
        notes:
          'טיסה פנימית לצפון-מזרח (יוהנסבורג ואז נלספרויט/סקוקוזה) ויום-יומיים בפארק - יציאות מוקדמות ומאוחרות, שאז החיות פעילות.',
      },
      {
        day: 6,
        title: 'קניון הבלייד',
        placeIds: ['zaf-blyde'],
        notes:
          'בדרך חזרה מקרוגר: תצפיות שלושת הרונדוואלים, חלון האלוהים ובורות בורקס לאק.',
      },
    ],
    practical: {
      flights:
        'אין כיום קו ישיר קבוע מנתב"ג לדרום אפריקה - טסים עם החלפה אחת (אדיס אבבה, דובאי, איסטנבול, דוחא או נאירובי) ליוהנסבורג (JNB) או לקייפטאון (CPT), סה"כ כ-14-17 שעות. סטטוס הקווים הישירים השתנה בשנים האחרונות - כדאי לבדוק עדכני מול חברות התעופה.',
      gettingAround:
        'רכב שכור הוא הדרך המקובלת בקייפטאון ובכביש הגן (נוסעים בצד שמאל). בין קייפטאון לקרוגר טסים פנימית - זה מרחק של אלפי קילומטרים. בקרוגר אפשר לנהוג עצמאית בכבישים הסלולים או לצאת לספארי מאורגן; לא לנסוע בלילה בכבישים לא מוכרים.',
      kosherOverview:
        'דרום אפריקה היא אחד המקומות הנוחים בעולם למטייל שומר כשרות: בקייפטאון (בעיקר סי פוינט) וביוהנסבורג יש מסעדות, מאפיות וסופרמרקטים כשרים, בפיקוח בתי הדין המקומיים, וגם מוצרים כשרים רבים ברשתות הרגילות. בקרוגר ובכביש הגן אין כשרות - להצטייד מראש בעיר ולוודא רשימות עסקים מעודכנות לפני הנסיעה.',
    },
  },
  {
    slug: 'yerevan',
    name: 'ירוואן והרי ארמניה',
    nameLocal: 'Yerevan & the Armenian Highlands',
    countrySlug: 'armenia',
    flag: '🇦🇲',
    center: { lat: 40.1, lng: 45.0 },
    zoom: 8,
    tagline: 'מנזרי סלע, אגם הררי ויערות - שעתיים וחצי מהבית',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Mount_Ararat_and_the_Yerevan_skyline_%28June_2018%29.jpg/500px-Mount_Ararat_and_the_Yerevan_skyline_%28June_2018%29.jpg',
    iconicLandmark: {
      name: 'מנזר חור וירפ',
      nameLocal: 'Khor Virap',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Monasterio_Khor_Virap%2C_Armenia%2C_2016-10-01%2C_DD_25.jpg/500px-Monasterio_Khor_Virap%2C_Armenia%2C_2016-10-01%2C_DD_25.jpg',
      blurb:
        'מנזר על גבעה בעמק ארארט, ממש על גבול טורקיה - ומאחוריו נשקפת פסגת אררט המושלגת, התמונה המזוהה ביותר עם ארמניה.',
    },
    editorialRating: {
      score: 4.4,
      verdict:
        'יעד קרוב וזול עם מנזרים דרמטיים, אגם הרים ויערות - ומחירים שמאפשרים טיול נוח בתקציב קטן. חסרונות: הטיסות הישירות בתדירות נמוכה ומשתנות, אין כשרות מאומתת, וכדי להגיע לאתרים צריך רכב או נהג - התחבורה הציבורית דלילה.',
    },
    summary:
      'ארמניה קטנה ומרוכזת: מירוואן יוצאים לכל הכיוונים ובשעה-שעתיים מגיעים לנופים אחרים לגמרי - מקדש גרני הרומי מעל קניון, מנזר גגהארד החצוב בסלע, מנזר חור וירפ מול אררט, אגם סוואן ההררי ומנזר סוואנאוואנק על צוק, יערות דיליז׳אן, ובדרום מנזר טאטב שאליו מגיעים ברכבל "כנפי טאטב" הארוך בעולם.',
    bestSeason:
      'מאי-יוני וספטמבר-אוקטובר (מזג אוויר נעים, ירוק או צבעי סתיו) · יולי-אוגוסט חם מאוד בעמקים אבל נעים בהרים · בחורף שלג וכבישי הרים חלקם קשים',
    places: [
      {
        id: 'arm-khorvirap',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Monasterio_Khor_Virap%2C_Armenia%2C_2016-10-01%2C_DD_25.jpg/500px-Monasterio_Khor_Virap%2C_Armenia%2C_2016-10-01%2C_DD_25.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'מנזר חור וירפ',
        nameLocal: 'Khor Virap',
        category: 'attraction',
        lat: 39.8783,
        lng: 44.5761,
        description:
          'מנזר על גבעה בעמק ארארט, מהאתרים המקודשים בארמניה - כאן לפי המסורת נכלא גרגוריוס המאיר בבור. מאחוריו נשקפת פסגת אררט; הכי צלול בבוקר.',
        rating: 4.7,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Khor+Virap',
      },
      {
        id: 'arm-geghard',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Monasterio_de_Geghard%2C_Armenia%2C_2016-10-02%2C_DD_63.jpg/500px-Monasterio_de_Geghard%2C_Armenia%2C_2016-10-02%2C_DD_63.jpg',
        tags: ['history'],
        priceLevel: 0,
        mustSee: true,
        name: 'מנזר גגהארד',
        nameLocal: 'Geghard Monastery',
        category: 'attraction',
        lat: 40.1404,
        lng: 44.8185,
        description:
          'מנזר מהמאה ה-13 שחלקיו חצובים ישירות בתוך קיר הסלע, אתר מורשת עולמית בקניון נהר אזאט. האקוסטיקה באולמות החצובים יוצאת דופן - לעתים שרים שם מקהלות.',
        rating: 4.7,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Geghard+Monastery',
      },
      {
        id: 'arm-garni',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Garni_temple_2021_drone.jpg/500px-Garni_temple_2021_drone.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        name: 'מקדש גרני',
        nameLocal: 'Garni Temple',
        category: 'attraction',
        lat: 40.1124,
        lng: 44.7303,
        description:
          'המקדש ההלניסטי היחיד ששרד בקווקז, מהמאה הראשונה לספירה, על צוק מעל הקניון. למטה בקניון - "הסימפוניה של האבנים", קיר עמודי בזלת משושים.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Garni+Temple',
      },
      {
        id: 'arm-sevan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Lake_Sevan_2022-08-14_Sentinel-2_L2A.jpg/500px-Lake_Sevan_2022-08-14_Sentinel-2_L2A.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'אגם סוואן',
        nameLocal: 'Lake Sevan',
        category: 'nature',
        lat: 40.3167,
        lng: 45.35,
        description:
          'אחד האגמים ההרריים הגדולים בעולם, בגובה כ-1,900 מ׳ - מים כחולים עמוקים, חופים וכפרי דייגים. קריר ונעים גם באוגוסט, וכשעה נסיעה מירוואן.',
        rating: 4.5,
        durationMin: 240,
        externalUrl: 'https://maps.google.com/?q=Lake+Sevan',
      },
      {
        id: 'arm-sevanavank',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/%D5%8D%D6%87%D5%A1%D5%B6%D5%AB_%D5%BE%D5%A1%D5%B6%D5%A1%D5%AF%D5%A1%D5%B6_%D5%B0%D5%A1%D5%B4%D5%A1%D5%AC%D5%AB%D6%80_%D5%84%D4%B2_29.jpg/500px-%D5%8D%D6%87%D5%A1%D5%B6%D5%AB_%D5%BE%D5%A1%D5%B6%D5%A1%D5%AF%D5%A1%D5%B6_%D5%B0%D5%A1%D5%B4%D5%A1%D5%AC%D5%AB%D6%80_%D5%84%D4%B2_29.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        name: 'מנזר סוואנאוואנק',
        nameLocal: 'Sevanavank',
        category: 'attraction',
        lat: 40.5639,
        lng: 45.0108,
        description:
          'שתי כנסיות אבן מהמאה התשיעית על גבעה שחודרת לאגם סוואן - עולים במדרגות ומקבלים תצפית על כל האגם וההרים סביבו.',
        rating: 4.5,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Sevanavank',
      },
      {
        id: 'arm-dilijan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/%22Dilijan%22_national_park.jpg/500px-%22Dilijan%22_national_park.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'הפארק הלאומי דיליז׳אן',
        nameLocal: 'Dilijan National Park',
        category: 'nature',
        lat: 40.6564,
        lng: 45.0214,
        description:
          'יערות עבותים, אגמים קטנים ומנזרים נסתרים - מכנים אותו "שווייץ הקטנה של ארמניה". מסלולי הליכה נוחים בין הכפרים ואל אגם פרז ומנזרי האגהרצין וגושבאנק.',
        rating: 4.6,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Dilijan+National+Park',
      },
      {
        id: 'arm-tatev',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/-2025.05_%D0%A2%D0%B0%D1%82%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%BC%D0%BE%D0%BD%D0%B0%D1%81%D1%82%D1%8B%D1%80%D1%8C_1.jpg/500px--2025.05_%D0%A2%D0%B0%D1%82%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%BC%D0%BE%D0%BD%D0%B0%D1%81%D1%82%D1%8B%D1%80%D1%8C_1.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 2,
        mustSee: true,
        name: 'מנזר טאטב ורכבל "כנפי טאטב"',
        nameLocal: 'Tatev Monastery & Wings of Tatev',
        category: 'attraction',
        lat: 39.3794,
        lng: 46.25,
        description:
          'מנזר מהמאה התשיעית על צוק מעל קניון נהר ורוטן, ואליו מגיעים ברכבל "כנפי טאטב" - הרכבל הדו-כיווני הארוך בעולם, כ-5.7 ק"מ מעל הקניון. כ-4 שעות נסיעה מירוואן.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Tatev+Monastery',
      },
      {
        id: 'arm-noravank',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Noravank.JPG/500px-Noravank.JPG',
        tags: ['history'],
        priceLevel: 0,
        name: 'מנזר נורוואנק',
        nameLocal: 'Noravank',
        category: 'attraction',
        lat: 39.6841,
        lng: 45.2329,
        description:
          'מנזר מהמאה ה-13 בקצה קניון של צוקי אבן חול אדומים - הצבע של הסלעים בשעת שקיעה הוא הסיבה העיקרית לבוא. בדרך לטאטב או ליריחו של יין ארני.',
        rating: 4.6,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Noravank',
      },
      {
        id: 'arm-aragats',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Mount_Aragats_2020-05-11.jpg/500px-Mount_Aragats_2020-05-11.jpg',
        tags: ['outdoors'],
        priceLevel: 0,
        name: 'הר ארגאץ',
        nameLocal: 'Mount Aragats',
        category: 'nature',
        lat: 40.5333,
        lng: 44.2,
        description:
          'ההר הגבוה בארמניה (4,090 מ׳), הר געש כבוי עם ארבע פסגות סביב לוע. אפשר להגיע ברכב עד אגם קארי בגובה 3,200 מ׳ ומשם לטפס לפסגה הדרומית בקיץ.',
        rating: 4.5,
        durationMin: 420,
        externalUrl: 'https://maps.google.com/?q=Mount+Aragats',
      },
      {
        id: 'arm-jermuk',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Jermuk_new_mix_2013.jpg/500px-Jermuk_new_mix_2013.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'ג׳רמוק והמפל',
        nameLocal: 'Jermuk',
        category: 'nature',
        lat: 39.8417,
        lng: 45.6722,
        description:
          'עיירת מרפא הררית המפורסמת במים המינרליים שלה, ובה מפל בגובה כ-70 מ׳, יערות ומסלולי הליכה - עצירה נעימה בדרך דרומה לטאטב.',
        rating: 4.3,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Jermuk',
      },
      {
        id: 'arm-yerevan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Mount_Ararat_and_the_Yerevan_skyline_%28June_2018%29.jpg/500px-Mount_Ararat_and_the_Yerevan_skyline_%28June_2018%29.jpg',
        tags: ['foodie', 'art'],
        priceLevel: 1,
        mustSee: true,
        name: 'ירוואן',
        nameLocal: 'Yerevan',
        category: 'attraction',
        lat: 40.1778,
        lng: 44.5128,
        description:
          'בירה ורודה (מאבן הטוף המקומית) עם כיכר הרפובליקה ומזרקות, מדרגות הקסקאד ומרכז האמנות, שוק ורניסאז׳ ומסעדות מצוינות. בסיס נוח לכל הנסיעות היומיות.',
        rating: 4.6,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Yerevan',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'ירוואן',
        placeIds: ['arm-yerevan'],
        notes:
          'התמקמות בבירה: כיכר הרפובליקה, הקסקאד, שוק ורניסאז׳ וערב במסעדה מקומית. הכול בהליכה או במונית זולה.',
      },
      {
        day: 2,
        title: 'גרני, גגהארד וחור וירפ',
        placeIds: ['arm-garni', 'arm-geghard', 'arm-khorvirap'],
        notes:
          'הקלאסיקה של האזור: מקדש גרני והסימפוניה של האבנים, מנזר גגהארד החצוב, ולקראת ערב חור וירפ מול אררט.',
      },
      {
        day: 3,
        title: 'אגם סוואן ודיליז׳אן',
        placeIds: ['arm-sevan', 'arm-sevanavank', 'arm-dilijan'],
        notes:
          'צפונה לאגם ההררי ולמנזר שעל הצוק, ואחר הצהריים יערות דיליז׳אן - מסלול הליכה קצר בין המנזרים.',
      },
      {
        day: 4,
        title: 'דרומה - נורוואנק וטאטב',
        placeIds: ['arm-noravank', 'arm-jermuk', 'arm-tatev'],
        notes:
          'יום נסיעה ארוך דרומה: קניון נורוואנק, עצירה בג׳רמוק, ורכבל כנפי טאטב אל המנזר שעל הצוק. אפשר ללון בגוריס.',
      },
      {
        day: 5,
        title: 'הר ארגאץ',
        placeIds: ['arm-aragats'],
        notes:
          'נוסעים אל אגם קארי בגובה 3,200 מ׳; מי שכשיר ממשיך לפסגה הדרומית (בקיץ בלבד, ומזג האוויר משתנה מהר).',
      },
    ],
    practical: {
      flights:
        'FlyOne Armenia מפעילה קו ישיר בין נתב"ג לירוואן (EVN) - כ-1-3 טיסות בשבוע לפי כיוון ועונה, כשעתיים וחצי. התדירות משתנה, ולכן כדאי לבדוק לוחות זמנים עדכניים; יש גם חיבורים עם החלפה דרך טביליסי, איסטנבול ודובאי.',
      gettingAround:
        'בירוואן - מוניות זולות ואפליקציות (GG / Yandex). לאתרים מחוץ לעיר: נהג פרטי ליום, טיול מאורגן או רכב שכור. התחבורה הציבורית בין הכפרים דלילה ואיטית, והכבישים ההרריים בדרום ארוכים.',
      kosherOverview:
        'לא אותרה בארמניה מסעדה או חנות כשרה מאומתת. יש בירוואן קהילה יהודית קטנה ובית כנסת, אבל לא תשתית כשרות תיירותית - הכשרות הקרובה היא בטביליסי שבגאורגיה (כשעה טיסה או נסיעה ארוכה). הדרך המעשית: להצטייד מראש, ולהסתמך על ירקות, פירות ומוצרים ארוזים עם סימון מוכר.',
    },
  },
  {
    slug: 'samarkand',
    name: 'סמרקנד ובוכרה',
    nameLocal: 'Samarkand & Bukhara',
    countrySlug: 'uzbekistan',
    flag: '🇺🇿',
    center: { lat: 40.3, lng: 65.5 },
    zoom: 6,
    tagline: 'ערי דרך המשי, כיפות טורקיז ומורשת יהודית בוכרית',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/RegistanSquare_Samarkand.jpg/500px-RegistanSquare_Samarkand.jpg',
    iconicLandmark: {
      name: 'כיכר הרגיסטן',
      nameLocal: 'Registan Square, Samarkand',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/RegistanSquare_Samarkand.jpg/500px-RegistanSquare_Samarkand.jpg',
      blurb:
        'שלוש מדרסות מהמאות ה-15 עד ה-17 שעומדות זו מול זו סביב כיכר אחת, מכוסות פסיפסי אריחים בכחול ובטורקיז - הלב של סמרקנד ואחד המראות המזוהים עם דרך המשי.',
    },
    editorialRating: {
      score: 4.6,
      verdict:
        'אדריכלות איסלאמית ברמה עולמית במחירים נמוכים, טיסה ישירה של פחות מחמש שעות, ורכבת מהירה נוחה בין הערים - ולישראלים גם מורשת בוכרית חיה. חסרונות: הקיץ לוהט מאוד, האתרים משוחזרים במידה שמרגישה לפעמים "חדשה מדי", ותשתית הכשרות מוגבלת מאוד.',
    },
    summary:
      'שלוש ערי דרך המשי - סמרקנד, בוכרה וחיווה - הן הלב של הטיול באוזבקיסטן: כיכר הרגיסטן, מתחם הקברים שאה-אי-זינדה ומאוזוליאום גור-אמיר בסמרקנד; מגדל ומסגד קליאן והרובע היהודי בבוכרה; והעיר המוקפת חומה איצ׳אן קאלה בחיווה. סביב טשקנט אפשר להוסיף טבע - הרי צ׳ימגן ואגם צ׳ארוואק - ובצפון הרחוק את שרידי ים אראל, אחת הטרגדיות הסביבתיות הגדולות של המאה ה-20.',
    bestSeason:
      'אפריל-מאי וספטמבר-אוקטובר (מזג אוויר מושלם) · יולי-אוגוסט חם מאוד (מעל 40 מעלות) · בחורף קר, אבל האתרים ריקים ויפים בשלג',
    places: [
      {
        id: 'uzb-registan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/RegistanSquare_Samarkand.jpg/500px-RegistanSquare_Samarkand.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        mustSee: true,
        name: 'כיכר הרגיסטן',
        nameLocal: 'Registan Square',
        category: 'attraction',
        lat: 39.6547,
        lng: 66.9756,
        description:
          'שלוש מדרסות מונומנטליות סביב כיכר אחת, מכוסות אריחי פסיפס כחולים - אולוגבק, שיר-דור וטילה-קורי. הכי יפה בשעת בוקר מוקדמת או בתאורת ערב.',
        rating: 4.8,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Registan+Samarkand',
      },
      {
        id: 'uzb-shahizinda',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Shah-i-Zinda%2C_Samarkand_%28Shohi-Zinda_majmuasi%2C_Samarqand%2C_%D0%A8%D0%B0%D1%85%D0%B8_%D0%97%D0%B8%D0%BD%D0%B4%D0%B0%29.jpg/500px-Shah-i-Zinda%2C_Samarkand_%28Shohi-Zinda_majmuasi%2C_Samarqand%2C_%D0%A8%D0%B0%D1%85%D0%B8_%D0%97%D0%B8%D0%BD%D0%B4%D0%B0%29.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        mustSee: true,
        name: 'שאה-אי-זינדה',
        nameLocal: 'Shah-i-Zinda',
        category: 'attraction',
        lat: 39.6631,
        lng: 66.9878,
        description:
          'סמטה של מאוזוליאומים מהמאות ה-11 עד ה-19, מכוסים כולם באריחי קרמיקה בגוונים של תכלת - אחד המקומות היפים בעיר, ולא במקרה מכונה "רחוב הקברים החי".',
        rating: 4.8,
        durationMin: 120,
        externalUrl: 'https://maps.google.com/?q=Shah-i-Zinda',
      },
      {
        id: 'uzb-guremir',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/ShrineofAmirTimur.jpg/500px-ShrineofAmirTimur.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'מאוזוליאום גור-אמיר',
        nameLocal: 'Gur-e-Amir',
        category: 'attraction',
        lat: 39.6483,
        lng: 66.9689,
        description:
          'קברו של טימור (טמרלן) ובני משפחתו, מתחת לכיפה מצולעת בצבע טורקיז - מבנה מהמאה ה-15 שהשפיע על אדריכלות הטאג׳ מאהל בהודו.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Gur-e-Amir',
      },
      {
        id: 'uzb-samarkand',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/RegistanSquare_Samarkand.jpg/500px-RegistanSquare_Samarkand.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        name: 'סמרקנד',
        nameLocal: 'Samarkand',
        category: 'attraction',
        lat: 39.6506,
        lng: 66.9653,
        description:
          'אחת הערים העתיקות באסיה המרכזית ואתר מורשת עולמית - מלבד המונומנטים יש בה שוק סיאב הססגוני, מאפיות הלחם המסורתי, ובית עלמין יהודי היסטורי.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Samarkand',
      },
      {
        id: 'uzb-bukhara',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Kalon-Ensemble_Buchara.jpg/500px-Kalon-Ensemble_Buchara.jpg',
        tags: ['history', 'foodie'],
        priceLevel: 1,
        mustSee: true,
        name: 'בוכרה',
        nameLocal: 'Bukhara',
        category: 'attraction',
        lat: 39.7667,
        lng: 64.4231,
        description:
          'עיר דרך המשי השמורה ביותר, אתר מורשת עולמית: מדרסות, שווקים מקורים, בריכת לאבי-האוז והמצודה הארק. כאן גם הרובע היהודי ההיסטורי של יהודי בוכרה, עם בית כנסת פעיל.',
        rating: 4.8,
        durationMin: 600,
        externalUrl: 'https://maps.google.com/?q=Bukhara',
      },
      {
        id: 'uzb-poikalyan',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Poi_Kalon.jpg/500px-Poi_Kalon.jpg',
        tags: ['history'],
        priceLevel: 1,
        name: 'מתחם פוי-קליאן',
        nameLocal: 'Po-i-Kalyan',
        category: 'attraction',
        lat: 39.7758,
        lng: 64.4142,
        description:
          'לב בוכרה: מגדל קליאן מהמאה ה-12 בגובה 47 מ׳, מסגד קליאן הענק והמדרסה שמולו - מתחם שנשאר עומד גם אחרי הכיבוש המונגולי.',
        rating: 4.8,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Po-i-Kalyan',
      },
      {
        id: 'uzb-khiva',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/View_from_the_city_walls%2C_Khiva_%284934484894%29.jpg/500px-View_from_the_city_walls%2C_Khiva_%284934484894%29.jpg',
        tags: ['history'],
        priceLevel: 1,
        mustSee: true,
        name: 'חיווה (איצ׳אן קאלה)',
        nameLocal: 'Khiva / Ichan Kala',
        category: 'attraction',
        lat: 41.3814,
        lng: 60.3611,
        description:
          'עיר מוקפת חומת חימר, שכולה מוזיאון פתוח - מינרטים, ארמונות ומדרסות בתוך שטח קטן שאפשר להקיף ברגל. אתר המורשת העולמית הראשון של אוזבקיסטן.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Khiva',
      },
      {
        id: 'uzb-charvak',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Lac_Tcharvak.jpg/500px-Lac_Tcharvak.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'אגם צ׳ארוואק והרי צ׳ימגן',
        nameLocal: 'Lake Charvak & Chimgan Mountains',
        category: 'nature',
        lat: 41.64,
        lng: 70.03,
        description:
          'מאגר מים תכול בהרי טיין שאן, כשעה וחצי מטשקנט, ומעליו הרי צ׳ימגן - אזור הנופש הטבעי של הבירה: רכבל, מסלולי הליכה בקיץ וסקי בחורף.',
        rating: 4.4,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Charvak+Reservoir',
      },
      {
        id: 'uzb-tashkent',
        photo:
          'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Nest_One_Tashkent.jpg/500px-Nest_One_Tashkent.jpg',
        tags: ['foodie', 'art'],
        priceLevel: 1,
        name: 'טשקנט',
        nameLocal: 'Tashkent',
        category: 'attraction',
        lat: 41.3111,
        lng: 69.2797,
        description:
          'הבירה ושדה התעופה הבינלאומי: שוק צ׳ורסו הענק תחת כיפה כחולה, תחנות מטרו מעוטרות שהן אטרקציה בפני עצמן, שדרות רחבות וקהילה יהודית פעילה.',
        rating: 4.3,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Tashkent',
      },
      {
        id: 'uzb-aral',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/AralSea1989_2014.jpg/500px-AralSea1989_2014.jpg',
        tags: ['outdoors', 'history'],
        priceLevel: 2,
        name: 'ים אראל ובית הקברות לספינות',
        nameLocal: 'Aral Sea & Moynaq ship cemetery',
        category: 'nature',
        lat: 45.0,
        lng: 60.0,
        description:
          'מה שנשאר מהאגם שהיה מהגדולים בעולם ונסוג עשרות קילומטרים - במוינאק עומדות ספינות דייג חלודות על חול המדבר. יעד מרוחק שדורש נסיעת ג׳יפ ארוכה מנוקוס ולינה בשטח.',
        rating: 4.3,
        durationMin: 1440,
        externalUrl: 'https://maps.google.com/?q=Moynaq+ship+cemetery',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'טשקנט',
        placeIds: ['uzb-tashkent'],
        notes:
          'נחיתה בבירה: שוק צ׳ורסו, סיבוב בתחנות המטרו המעוטרות והתאקלמות. בערב רכבת מהירה או טיסה פנימית דרומה.',
      },
      {
        day: 2,
        title: 'סמרקנד',
        placeIds: ['uzb-registan', 'uzb-shahizinda', 'uzb-guremir', 'uzb-samarkand'],
        notes:
          'יום מלא בעיר: רגיסטן בבוקר, שאה-אי-זינדה, גור-אמיר, ולקראת ערב שוק סיאב וחזרה לרגיסטן בתאורה.',
      },
      {
        day: 3,
        title: 'בוכרה',
        placeIds: ['uzb-bukhara', 'uzb-poikalyan'],
        notes:
          'רכבת לבוכרה, והליכה איטית במרכז ההיסטורי: פוי-קליאן, השווקים המקורים, לאבי-האוז והרובע היהודי.',
      },
      {
        day: 4,
        title: 'חיווה',
        placeIds: ['uzb-khiva'],
        notes:
          'נסיעה או רכבת לילה מערבה: יום בתוך החומות של איצ׳אן קאלה - מינרטים, ארמונות ותצפית מהחומה בשקיעה.',
      },
      {
        day: 5,
        title: 'טבע ליד הבירה',
        placeIds: ['uzb-charvak'],
        notes:
          'חזרה לטשקנט ויום באגם צ׳ארוואק ובהרי צ׳ימגן - רכבל, מסלול קצר ורחצה בקיץ.',
      },
      {
        day: 6,
        title: 'הרחבה: ים אראל',
        placeIds: ['uzb-aral'],
        notes:
          'למי שיש 2-3 ימים נוספים: טיסה לנוקוס ומשם מסע ג׳יפים למוינאק ולשרידי ים אראל, עם לינת מדבר.',
      },
    ],
    practical: {
      flights:
        'יש טיסות ישירות מנתב"ג לטשקנט (TAS) - אוזבקיסטן איירווייז מפעילה כ-7 טיסות בשבוע, ולצדה גם Centrum Air, FlyOne Asia ו-Qanot Sharq; זמן טיסה כ-4 שעות ו-50 דקות.',
      gettingAround:
        'רכבת מהירה (Afrosiyob) מחברת את טשקנט-סמרקנד-בוכרה בנוחות ובמהירות - כדאי להזמין מקומות מראש. לחיווה: רכבת לילה או טיסה פנימית לאורגנץ׳. בערים מוניות זולות (Yandex Go). למוינאק ולים אראל - רק בטיול ג׳יפים מאורגן.',
      kosherOverview:
        'אוזבקיסטן היא ארץ המורשת של יהודי בוכרה - בבוכרה עדיין עומד הרובע היהודי עם בית כנסת פעיל, ובטשקנט יש קהילה יהודית ובתי כנסת. עם זאת, לא אותרה מסעדה כשרה קבועה ופתוחה לקהל: הדרך המעשית היא לתאם מראש מול הקהילה בטשקנט או מול קבוצות מאורגנות, ולהצטייד. במסעדות המקומיות הבשר אינו כשר, ואפשר להסתמך על ירקות, פירות ולחם.',
    },
  },
  {
    slug: 'kyoto',
    name: 'קיוטו וקנסאי',
    nameLocal: 'Kyoto & Kansai',
    countrySlug: 'japan',
    flag: '🇯🇵',
    center: { lat: 34.9, lng: 135.7 },
    zoom: 8,
    tagline: 'שערי טורי אינסופיים, יער במבוק ומקדשים בין הרים',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/500px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg',
    iconicLandmark: {
      name: 'פושימי אינארי',
      nameLocal: 'Fushimi Inari-taisha',
      photo:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/500px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg',
      blurb:
        'מקדש שינטו שממנו מטפסת דרך הרים ובה אלפי שערי טורי כתומים שנתרמו לאורך מאות שנים - הצילום המזוהה ביותר עם קיוטו.',
    },
    editorialRating: {
      score: 4.7,
      verdict:
        'יפן המסורתית במרוכז - מקדשים, גנים ויערות במרחק הליכה או רכבת קצרה, ובעיר גם בית חב"ד עם מטבח כשר (בהזמנה מראש). חסרונות: אין טיסה ישירה לקנסאי (מגיעים דרך טוקיו או עם החלפה), האתרים המרכזיים עמוסים מאוד, והקיץ חם ולח.',
    },
    summary:
      'קיוטו הייתה בירת יפן יותר מאלף שנה, ובה יותר מאלף מקדשים ובתי תפילה - פושימי אינארי עם שערי הטורי, קיומיזו-דרה על עמודי העץ, הביתן הזהב קינקאקו-ג׳י ויער הבמבוק של אראשייאמה. סביבה נפרשת קנסאי: אייל הצבי של נארה ומקדש טודאי-ג׳י, אגם ביווה הגדול ביפן, לשון החול אמאנוהאשידאטה, ובדרום מפל נאצ׳י ושבילי העלייה לרגל של קומאנו קודו. בעיר פועל בית חב"ד עם מטבח כשר.',
    bestSeason:
      'סוף מרץ-אפריל (סאקורה) ונובמבר (שלכת אדומה) - היפים והעמוסים ביותר · מאי ואוקטובר נעימים ושקטים יותר · יולי-אוגוסט חם ולח מאוד',
    places: [
      {
        id: 'kyo-fushimi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg/500px-Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine%2C_Kyoto%2C_Japan.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 0,
        mustSee: true,
        name: 'פושימי אינארי',
        nameLocal: 'Fushimi Inari-taisha',
        category: 'attraction',
        lat: 34.9672,
        lng: 135.7728,
        description:
          'מקדש השועלים של קיוטו, וממנו מטפס שביל הררי עם אלפי שערי טורי כתומים עד לפסגת הר אינארי (כשעתיים הלוך-חזור). ככל שעולים - פחות אנשים; הכי שקט לפנות בוקר.',
        rating: 4.8,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Fushimi+Inari+Taisha',
      },
      {
        id: 'kyo-kiyomizu',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Kiyomizu.jpg/500px-Kiyomizu.jpg',
        tags: ['history'],
        priceLevel: 1,
        mustSee: true,
        name: 'קיומיזו-דרה',
        nameLocal: 'Kiyomizu-dera',
        category: 'attraction',
        lat: 34.995,
        lng: 135.785,
        description:
          'מקדש בודהיסטי מהמאה השמינית שמרפסתו העצומה נשענת על עמודי עץ במדרון ההר, אתר מורשת עולמית. מתחתיו מעיין המים שממנו שמו, ומסביב סמטאות היגאשייאמה העתיקות.',
        rating: 4.7,
        durationMin: 180,
        externalUrl: 'https://maps.google.com/?q=Kiyomizu-dera',
      },
      {
        id: 'kyo-arashiyama',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Arashiyama%2C_Part_II_-_Arashiyama7534.jpg/500px-Arashiyama%2C_Part_II_-_Arashiyama7534.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        mustSee: true,
        name: 'אראשייאמה ויער הבמבוק',
        nameLocal: 'Arashiyama',
        category: 'nature',
        lat: 35.0151,
        lng: 135.6707,
        description:
          'רובע הרים במערב קיוטו: חורשת הבמבוק הענקית, גשר טוגטסוקיו על נהר הוזו, מקדש טנריו-ג׳י והפארק של הקופים על הגבעה. הכי יפה מוקדם בבוקר, לפני הקהל.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Arashiyama+Kyoto',
      },
      {
        id: 'kyo-kinkakuji',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg/500px-Golden_Pavilion_Kinkaku-ji_water_mirror_2024.jpg',
        tags: ['history', 'art'],
        priceLevel: 1,
        mustSee: true,
        name: 'הביתן הזהב (קינקאקו-ג׳י)',
        nameLocal: 'Kinkaku-ji',
        category: 'attraction',
        lat: 35.0395,
        lng: 135.7285,
        description:
          'ביתן מצופה עלי זהב שמשתקף באגם שלפניו - אחד המבנים המצולמים ביפן, אתר מורשת עולמית. הסיור הוא מסלול קצר וחד-כיווני סביב האגם והגן.',
        rating: 4.7,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Kinkaku-ji',
      },
      {
        id: 'kyo-ginkakuji',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Ginkakuji_Kyoto03-r.jpg/500px-Ginkakuji_Kyoto03-r.jpg',
        tags: ['history', 'outdoors'],
        priceLevel: 1,
        name: 'הביתן הכסף (גינקאקו-ג׳י)',
        nameLocal: 'Ginkaku-ji',
        category: 'attraction',
        lat: 35.0267,
        lng: 135.7983,
        description:
          'מקדש זן עם גן טחב, גן חול מגורף ומסלול עלייה קצר לתצפית על העיר. ממנו מתחיל "שביל הפילוסוף" - טיילת תעלה מוצלת שהיא אחת ההליכות הנעימות בקיוטו.',
        rating: 4.6,
        durationMin: 150,
        externalUrl: 'https://maps.google.com/?q=Ginkaku-ji',
      },
      {
        id: 'kyo-kyoto',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Kyoto%2C_Japan_%2849667780482%29.jpg/500px-Kyoto%2C_Japan_%2849667780482%29.jpg',
        tags: ['foodie', 'history'],
        priceLevel: 2,
        name: 'קיוטו - העיר',
        nameLocal: 'Kyoto',
        category: 'attraction',
        lat: 35.0116,
        lng: 135.7681,
        description:
          'בירת יפן ההיסטורית: שוק נישיקי, רובע הגיישות גיון, ארמון הקיסר וטירת ניג׳ו, ורחובות עץ מסורתיים. מרכז נוח ללינה - הרכבות מגיעות מכאן לכל קנסאי.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Kyoto',
      },
      {
        id: 'kyo-todaiji',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/T%C5%8Ddai-ji_Kon-d%C5%8D.jpg/500px-T%C5%8Ddai-ji_Kon-d%C5%8D.jpg',
        tags: ['history', 'families'],
        priceLevel: 1,
        mustSee: true,
        name: 'טודאי-ג׳י ופארק נארה',
        nameLocal: 'Tōdai-ji & Nara Park',
        category: 'attraction',
        lat: 34.6892,
        lng: 135.8397,
        description:
          'מקדש מהמאה השמינית שבו פסל בודהה ברונזה ענק, באחד ממבני העץ הגדולים בעולם. סביבו פארק נארה, שבו מסתובבים חופשי מאות אילי צבי מבויתים למחצה. כשעה מקיוטו.',
        rating: 4.7,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Todai-ji+Nara',
      },
      {
        id: 'kyo-biwa',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Lake_biwa.jpg/500px-Lake_biwa.jpg',
        tags: ['outdoors', 'families'],
        priceLevel: 1,
        name: 'אגם ביווה',
        nameLocal: 'Lake Biwa',
        category: 'nature',
        lat: 35.255,
        lng: 136.08,
        description:
          'האגם הגדול והעתיק ביפן, ממש ממזרח לקיוטו - חופים, שביל אופניים היקפי, שער טורי צף במקדש שירהיגה ותצפית ההר ביווקו וואלי ברכבל.',
        rating: 4.4,
        durationMin: 300,
        externalUrl: 'https://maps.google.com/?q=Lake+Biwa',
      },
      {
        id: 'kyo-amanohashidate',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Amanohashidate_aerial_view_2026.jpg/500px-Amanohashidate_aerial_view_2026.jpg',
        tags: ['outdoors', 'romantic'],
        priceLevel: 1,
        name: 'אמאנוהאשידאטה',
        nameLocal: 'Amanohashidate',
        category: 'nature',
        lat: 35.5694,
        lng: 135.1915,
        description:
          'לשון חול באורך כ-3.6 ק"מ מכוסה כ-8,000 עצי אורן, שחוצה מפרץ בים היפני - נחשבת לאחד משלושת הנופים היפים ביפן. מתבוננים בה מהתצפיות שמשני עברי המפרץ.',
        rating: 4.5,
        durationMin: 360,
        externalUrl: 'https://maps.google.com/?q=Amanohashidate',
      },
      {
        id: 'kyo-nachi',
        photo:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Kumano_Kodo_World_heritage_Nachi-no-taki_%E7%86%8A%E9%87%8E%E5%8F%A4%E9%81%93_%E9%82%A3%E6%99%BA%E5%A4%A7%E6%BB%9D10.JPG/500px-Kumano_Kodo_World_heritage_Nachi-no-taki_%E7%86%8A%E9%87%8E%E5%8F%A4%E9%81%93_%E9%82%A3%E6%99%BA%E5%A4%A7%E6%BB%9D10.JPG',
        tags: ['outdoors', 'history'],
        priceLevel: 1,
        name: 'מפל נאצ׳י וקומאנו קודו',
        nameLocal: 'Nachi Falls & Kumano Kodo',
        category: 'nature',
        lat: 33.672,
        lng: 135.891,
        description:
          'המפל החד-מדרגתי הגבוה ביפן (133 מ׳), ולצדו פגודה אדומה ומקדש - חלק משבילי העלייה לרגל קומאנו קודו, אתר מורשת עולמית. בחצי האי קיא, כ-4 שעות מקיוטו.',
        rating: 4.7,
        durationMin: 480,
        externalUrl: 'https://maps.google.com/?q=Nachi+Falls',
      },
      {
        id: 'kyo-chabad',
        tags: ['foodie'],
        priceLevel: 2,
        name: 'בית חב"ד קיוטו',
        nameLocal: 'Chabad of Kyoto, Okazaki',
        category: 'kosher-food',
        lat: 35.0167,
        lng: 135.787,
        description:
          'בית חב"ד של קיוטו בשכונת אוקאזאקי (Okazaki Tennocho, Sakyo-ku), עם בית כנסת קטן ומטבח כשר - ארוחות ואירוח שבת בהזמנה מראש (מומלץ כשלושה ימים, האוכל מוכן לפי הזמנה). הסימון הוא ברמת השכונה.',
        kosherNote: 'בהפעלת חב"ד קיוטו (תחת חב"ד יפן). חובה להזמין מראש - אין מסעדה פתוחה לקהל מזדמן.',
        kosherVerification: {
          source: 'curated',
          lastChecked: 'pending-review',
          supervision: 'חב"ד קיוטו / חב"ד יפן',
        },
        rating: 4.6,
        durationMin: 90,
        externalUrl: 'https://maps.google.com/?q=Chabad+of+Kyoto',
      },
    ],
    itinerary: [
      {
        day: 1,
        title: 'מזרח קיוטו',
        placeIds: ['kyo-kiyomizu', 'kyo-ginkakuji', 'kyo-kyoto'],
        notes:
          'בוקר בקיומיזו-דרה ובסמטאות היגאשייאמה, אחר הצהריים גינקאקו-ג׳י ושביל הפילוסוף, וערב בגיון ובשוק נישיקי.',
      },
      {
        day: 2,
        title: 'שערי הטורי',
        placeIds: ['kyo-fushimi', 'kyo-chabad'],
        notes:
          'לצאת מוקדם לפושימי אינארי ולעלות בשביל ההר עד למעלה. ארוחה כשרה בבית חב"ד - להזמין כמה ימים מראש.',
      },
      {
        day: 3,
        title: 'אראשייאמה והביתן הזהב',
        placeIds: ['kyo-arashiyama', 'kyo-kinkakuji'],
        notes:
          'חורשת הבמבוק בשעת בוקר מוקדמת, טנריו-ג׳י והנהר, ואחר הצהריים קינקאקו-ג׳י המוזהב.',
      },
      {
        day: 4,
        title: 'נארה',
        placeIds: ['kyo-todaiji'],
        notes:
          'רכבת של כשעה לנארה: הבודהה הגדול בטודאי-ג׳י, אילי הצבי בפארק ומקדש קסוגה טאישה עם הפנסים.',
      },
      {
        day: 5,
        title: 'טבע בקנסאי',
        placeIds: ['kyo-biwa', 'kyo-amanohashidate', 'kyo-nachi'],
        notes:
          'בוחרים כיוון טבע: אגם ביווה הקרוב, לשון החול אמאנוהאשידאטה בצפון, או יום ארוך דרומה למפל נאצ׳י ולשבילי קומאנו קודו.',
      },
    ],
    practical: {
      flights:
        'אין טיסה ישירה מנתב"ג לקנסאי (אוסקה, KIX). שתי דרכים מעשיות: טיסה ישירה של אל על לטוקיו (נריטה) ומשם שינקנסן של כשעתיים ורבע לקיוטו, או טיסה עם החלפה (איסטנבול, המפרץ, אירופה) ישירות לאוסקה.',
      gettingAround:
        'בקיוטו: אוטובוסים עירוניים, שתי שורות מטרו ורכבות פרטיות - כרטיס IC נטען (ICOCA/Suica) פותר הכול, ואופניים נוחים מאוד בעיר השטוחה. לנארה, לאגם ביווה ולאוסקה - רכבות תכופות; לאמאנוהאשידאטה ולקומאנו קודו כדאי רכב שכור או רכבת אזורית איטית.',
      kosherOverview:
        'בקיוטו פועל בית חב"ד עם מטבח כשר - ארוחות ואירוח שבת בהזמנה מראש בלבד (האוכל מוכן לפי הזמנה, כדאי כשלושה ימים לפני). זו הכתובת הכשרה היחידה בעיר; בטוקיו יש מסעדה כשרה ושירות משלוחים ארצי. במסעדות רגילות אין להניח כשרות - מרק דאשי (דגים), מירין ורוטב סויה נמצאים כמעט בכל מנה.',
    },
  },
];

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinations.find((d) => d.slug === slug);
}
