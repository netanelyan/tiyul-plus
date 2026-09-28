/**
 * Part two of the Israel seed - the Negev highlands and everything north of Haifa.
 * Split from `israel-seed.mjs` only for file size; the geocoder concatenates them.
 * Same rules: no coordinates here (they come from OSM), and no food/market/shopping
 * categories, which would need a sourced URL and a date actually read.
 */

export const DESTINATIONS_NORTH = [
  {
    slug: 'mitzpe-ramon',
    name: 'מצפה רמון והנגב',
    nameLocal: 'Mitzpe Ramon & the Negev',
    center: { lat: 30.6103, lng: 34.8011 },
    zoom: 11,
    tagline: 'מכתש באורך ארבעים קילומטר, ושמי לילה בלי זיהום אור',
    summary:
      'מכתש רמון הוא התופעה הגאולוגית הגדולה בארץ ואין כמותו במקום אחר בעולם. מצפה רמון ' +
      'יושבת בדיוק על השפה שלו, ולכן התצפית היא לא אתר שנוסעים אליו אלא הדבר שרואים מהעיר. ' +
      'בלילה זה אחד המקומות הטובים בארץ לצפייה בכוכבים.',
    bestSeason: 'אוקטובר עד אפריל. הלילות במדבר קרים מאוד גם באביב - שכבה חמה נדרשת כל השנה.',
    practical: {
      flights:
        'כשעתיים וחצי מתל אביב ושעתיים מירושלים, דרך באר שבע. יש אוטובוסים מבאר שבע, אבל ' +
        'המסלולים בתוך המכתש דורשים רכב - חלקם דורשים רכב גבוה.',
      gettingAround:
        'רכב הכרחי. הכביש היורד לתוך המכתש הוא כביש 40, תלול ועם תצפיות בדרך. דלק אחרון לפני ' +
        'המכתש נמצא במצפה רמון עצמה.',
      kosherOverview:
        'בחאן ובמלונות שבעיר יש כשרות, והבחירה מצומצמת. בתוך המכתש ובשטח אין שום אפשרות לקנות ' +
        'אוכל - לצאת מצוידים. לוודא מול המקום.',
    },
    places: [
      { id: 'ram-crater', name: 'מכתש רמון', nameLocal: 'Ramon Crater', q: 'Makhtesh Ramon', category: 'nature', description: 'המכתש הגדול בעולם מסוגו - 40 קילומטר אורך, שנוצר מבלייה ולא מפגיעת מטאור. הכניסה דרך כביש 40.', durationMin: 240, priceLevel: 0, tags: ['outdoors'], mustSee: true },
      { id: 'ram-visitor-center', name: 'מרכז המבקרים בית הצוק', nameLocal: 'Mitzpe Ramon Visitor Center', q: 'Mitzpe Ramon Visitor Center', category: 'museum', description: 'מרכז מבקרים על שפת המכתש שמסביר את הגאולוגיה, ובו גם אגף לזכר אילן רמון. התצפית ממנו היא הטובה בעיר.', durationMin: 90, priceLevel: 1, tags: ['families', 'history'], mustSee: true },
      { id: 'ram-ein-avdat', name: 'עין עבדת', nameLocal: 'Ein Avdat National Park', q: 'Ein Avdat National Park', category: 'nature', description: 'קניון עם מפל ובריכות מים קבועות בלב המדבר, ובו סולמות ומדרגות חצובות. מסלול חד-כיווני - צריך שני רכבים או חזרה באותו שביל.', durationMin: 150, priceLevel: 1, tags: ['outdoors', 'families'], mustSee: true },
      { id: 'ram-avdat', name: 'עבדת', nameLocal: 'Avdat National Park', q: 'Avdat National Park', category: 'historic', description: 'עיר נבטית על דרך הבשמים, אתר מורשת עולמית. שרידי כנסיות, בית בד ומצודה על גבעה משקיפה.', durationMin: 120, priceLevel: 1, tags: ['history'], mustSee: true },
      { id: 'ram-sde-boker', name: 'קבר בן-גוריון בשדה בוקר', nameLocal: "Ben-Gurion's Tomb, Sde Boker", q: 'Ben-Gurion Tomb Sde Boker', category: 'historic', description: 'קברם של דוד ופולה בן-גוריון על מצוק מעל נחל צין, עם אחת התצפיות היפות בנגב. כניסה חופשית.', durationMin: 60, priceLevel: 0, tags: ['history'] },
      { id: 'ram-alpaca', name: 'חוות האלפקות', nameLocal: 'Alpaca Farm Mitzpe Ramon', q: 'Alpaca Farm Mitzpe Ramon', category: 'attraction', description: 'עדר אלפקות ולמות על שפת המכתש, שאפשר להאכיל. האתר המתאים ביותר באזור לילדים קטנים.', durationMin: 90, priceLevel: 2, tags: ['families'] },
      { id: 'ram-mamshit', name: 'ממשית', nameLocal: 'Mamshit National Park', q: 'Mamshit National Park', category: 'historic', description: 'העיר הנבטית השמורה ביותר בנגב, עם בתים בני שתי קומות וכנסיות פסיפס. ליד דימונה.', durationMin: 90, priceLevel: 1, tags: ['history'] },
      { id: 'ram-carpentry', name: 'המנסרה', nameLocal: 'The Carpentry Shop (HaMinsara)', q: 'HaMinsara Makhtesh Ramon', category: 'nature', description: 'גבעה של גבישי קוורץ מנסרתיים בתוך המכתש, תופעה גאולוגית נדירה. נגישה ברכב רגיל מכביש 40.', durationMin: 45, priceLevel: 0, tags: ['outdoors'] },
      { id: 'ram-ardon', name: 'הר ארדון', nameLocal: 'Mount Ardon', q: 'Mount Ardon Makhtesh Ramon', category: 'viewpoint', description: 'ההר הבולט בתוך המכתש, בצבעים שמשתנים עם השעה. הגישה אליו בדרך עפר - רכב גבוה.', durationMin: 180, priceLevel: 0, tags: ['outdoors'] },
      { id: 'ram-shen-ramon', name: 'שן רמון', nameLocal: 'Shen Ramon', q: 'Shen Ramon', category: 'viewpoint', description: 'צוק בזלת משונן בתוך המכתש, נקודת תצפית קצרה בדרך מזרחה. עצירה של רבע שעה.', durationMin: 30, priceLevel: 0, tags: ['outdoors'] },
    ],
    itinerary: [
      { day: 1, title: 'השפה והמכתש', placeIds: ['ram-visitor-center', 'ram-crater', 'ram-carpentry', 'ram-shen-ramon'], notes: 'לרדת לתוך המכתש אחרי מרכז המבקרים - ההסבר הגאולוגי משנה את מה שרואים למטה.' },
      { day: 2, title: 'נחל צין', placeIds: ['ram-ein-avdat', 'ram-avdat', 'ram-sde-boker'], notes: 'עין עבדת בבוקר. הכניסה האחרונה מוקדמת כי המסלול חד-כיווני.' },
      { day: 3, title: 'מסביב', placeIds: ['ram-alpaca', 'ram-mamshit', 'ram-ardon'], notes: 'הר ארדון דורש רכב גבוה - בלי כזה, להישאר עם שני הראשונים.' },
    ],
  },

  {
    slug: 'galilee-kinneret',
    name: 'הגליל והכנרת',
    nameLocal: 'Galilee & Sea of Galilee',
    center: { lat: 32.85, lng: 35.5 },
    zoom: 11,
    tagline: 'ירוק, מים, וכל ההיסטוריה של הגליל סביב אגם אחד',
    summary:
      'הגליל הוא האזור הירוק של הארץ, והכנרת היא המרכז שממנו יוצאים לכל הכיוונים: צפת ' +
      'וההרים במערב, אתרי הנצרות הקדומה על החוף הצפוני, ושמורות מים בצפון. בחורף ובאביב ' +
      'הכל פורח, ובאביב נחלי הגליל בשיאם.',
    bestSeason: 'מרץ עד מאי הוא השיא - הכל ירוק ופורח. גם הסתיו נוח; הקיץ סביב הכנרת חם ולח מאוד.',
    practical: {
      flights:
        'כשעתיים מתל אביב וכשעה וחצי מחיפה. רכבת מגיעה עד כרמיאל ועד בית שאן, ומשם צריך רכב - ' +
        'התחבורה הציבורית בין אתרי הגליל דלילה מאוד.',
      gettingAround:
        'רכב. כביש 90 מקיף את הכנרת ממזרח וכביש 87 מצפון; הקפה מלאה של האגם היא כשעה נטו. ' +
        'בסופי שבוע ובחגים הצירים סביב הכנרת נתקעים.',
      kosherOverview:
        'בטבריה ובצפת רוב המסעדות כשרות, ובמושבים ובקיבוצים סביב האגם יש מגוון. במסעדות הדגים ' +
        'על החוף כדאי לבדוק - חלקן אינן כשרות. לוודא מול המקום.',
    },
    places: [
      { id: 'gal-tzfat', name: 'צפת העתיקה', nameLocal: 'Safed Old City', q: 'Safed Old City', category: 'historic', description: 'עיר הקבלה, ברום 900 מטר. רובע האמנים ובתי הכנסת העתיקים צמודים זה לזה בסמטאות אבן צרות.', durationMin: 180, priceLevel: 0, tags: ['history', 'art'], mustSee: true },
      { id: 'gal-arbel', name: 'הר ארבל', nameLocal: 'Mount Arbel National Park', q: 'Mount Arbel National Park', category: 'viewpoint', description: 'מצוק מעל הכנרת עם התצפית הטובה באזור. מהפסגה יורד מסלול תלול עם שלבי ברזל - לא למי שחושש מגבהים.', durationMin: 150, priceLevel: 1, tags: ['outdoors'], mustSee: true },
      { id: 'gal-capernaum', name: 'כפר נחום', nameLocal: 'Capernaum', q: 'Capernaum', category: 'historic', description: 'כפר דייגים מהמאה הראשונה על חוף הכנרת, עם בית כנסת מפואר מאבן לבנה. מרכזי בנצרות הקדומה.', durationMin: 75, priceLevel: 1, tags: ['history'] },
      { id: 'gal-hula', name: 'שמורת החולה', nameLocal: 'Hula Nature Reserve', q: 'Hula Nature Reserve', category: 'nature', description: 'אגם ובית גידול ביצתי על נתיב הנדידה. בסתיו ובחורף עוברות בו עשרות אלפי עגורים - מסלול שטוח ונוח לעגלה.', durationMin: 150, priceLevel: 2, tags: ['families', 'outdoors'], mustSee: true },
      { id: 'gal-rosh-pina', name: 'ראש פינה העתיקה', nameLocal: 'Rosh Pina Old Town', q: 'Rosh Pina Old Town', category: 'historic', description: 'מושבה מ-1882 ששוחזרה - רחוב אבן אחד עם בתי בזלת, גלריות ותצפית על עמק החולה.', durationMin: 90, priceLevel: 0, tags: ['romantic', 'history'] },
      { id: 'gal-hamat-tverya', name: 'חמת טבריה', nameLocal: 'Hamat Tiberias National Park', q: 'Hamat Tiberias National Park', category: 'historic', description: 'בית כנסת מהמאה הרביעית עם פסיפס גלגל מזלות שלם, לצד מעיינות חמים. קטן וקרוב לעיר.', durationMin: 60, priceLevel: 1, tags: ['history'] },
      { id: 'gal-kursi', name: 'כורסי', nameLocal: 'Kursi National Park', q: 'Kursi National Park', category: 'historic', description: 'מנזר ביזנטי גדול על החוף המזרחי, עם רצפות פסיפס. שקט ומוצל, כמעט תמיד ריק.', durationMin: 60, priceLevel: 1, tags: ['history'] },
      { id: 'gal-magdala', name: 'מגדלא', nameLocal: 'Magdala', q: 'Magdala Israel', category: 'historic', description: 'עיירת דייגים מהמאה הראשונה שנחשפה ב-2009, ובה בית כנסת מתקופת בית שני. על חוף האגם.', durationMin: 75, priceLevel: 2, tags: ['history'] },
      { id: 'gal-tel-hazor', name: 'תל חצור', nameLocal: 'Tel Hazor National Park', q: 'Tel Hazor National Park', category: 'historic', description: 'העיר הכנענית הגדולה בארץ ואתר מורשת עולמית, עם מערכת מים חצובה עמוקה. ליד ראש פינה.', durationMin: 90, priceLevel: 1, tags: ['history'] },
      { id: 'gal-kinneret-beach', name: 'חופי הכנרת', nameLocal: 'Sea of Galilee Beaches', q: 'Tiberias Beach Sea of Galilee', category: 'nature', description: 'האגם היחיד בארץ שרוחצים בו, עם חופים מוסדרים סביבו. חלקם בתשלום כניסה לרכב.', durationMin: 150, priceLevel: 1, tags: ['families', 'outdoors'], mustSee: true },
      { id: 'gal-nahal-amud', name: 'נחל עמוד', nameLocal: 'Nahal Amud', q: 'Nahal Amud Nature Reserve', category: 'nature', description: 'נחל איתן בין צפת לכנרת, עם צמחייה סבוכה וטחנות קמח נטושות. מסלולי מים באביב.', durationMin: 180, priceLevel: 0, tags: ['outdoors'] },
    ],
    itinerary: [
      { day: 1, title: 'סביב האגם', placeIds: ['gal-capernaum', 'gal-magdala', 'gal-kursi', 'gal-kinneret-beach'], notes: 'הקפה של האגם בכיוון השעון. אתרי הנצרות דורשים לבוש צנוע.' },
      { day: 2, title: 'ההרים במערב', placeIds: ['gal-tzfat', 'gal-rosh-pina', 'gal-arbel'], notes: 'צפת קרירה מהכנרת בכמה מעלות. ארבל לקראת שקיעה - התצפית מזרחה.' },
      { day: 3, title: 'צפונה', placeIds: ['gal-hula', 'gal-tel-hazor', 'gal-hamat-tverya'], notes: 'החולה בבוקר מוקדם, כשהעופות פעילים. בעונת הנדידה כדאי להזמין עגלה מראש.' },
    ],
  },

  {
    slug: 'golan',
    name: 'רמת הגולן',
    nameLocal: 'Golan Heights',
    center: { lat: 33.0, lng: 35.75 },
    zoom: 11,
    tagline: 'מפלים, מצודות צלבניות והשלג היחיד בארץ',
    summary:
      'הגולן הוא רמה בזלתית שמתנשאת מעל הכנרת, וזה מה שנותן לו את המים: הנחלים כאן זורמים ' +
      'כל השנה, בניגוד לרוב הארץ. בחורף החרמון מכוסה שלג, באביב הרמה מכוסה פרחים, ובקיץ ' +
      'הנחלים הם המקום היחיד בארץ שקריר בו באמת.',
    bestSeason: 'אביב (מרץ-מאי) לפריחה ולנחלים מלאים. חורף לשלג בחרמון, וקיץ למסלולי מים.',
    practical: {
      flights:
        'כשעתיים וחצי מתל אביב, וכשעה מטבריה. אין רכבת לגולן והתחבורה הציבורית מועטה מאוד - ' +
        'רכב הוא בפועל תנאי לטיול באזור.',
      gettingAround:
        'רכב. הכבישים טובים והמרחקים קצרים, אבל בחורף ייתכנו סגירות בדרך לחרמון. בשמורות עם ' +
        'מסלולי מים יש שעת כניסה אחרונה מוקדמת - לבדוק מראש.',
      kosherOverview:
        'ביישובי הגולן ובקצרין יש מסעדות כשרות, וחלק מהיקבים והמבשלות אינם כשרים. בשמורות יש ' +
        'קיוסקים בלבד. לוודא מול המקום.',
    },
    places: [
      { id: 'gol-banias', name: 'שמורת בניאס', nameLocal: 'Banias Nature Reserve', q: 'Banias Nature Reserve', category: 'nature', description: 'אחד ממקורות הירדן, עם המפל הגדול בארץ ושרידי מקדש לאל פאן. שני מסלולים נפרדים ושתי כניסות.', durationMin: 180, priceLevel: 2, tags: ['families', 'outdoors', 'history'], mustSee: true },
      { id: 'gol-nimrod', name: 'מצודת נמרוד', nameLocal: 'Nimrod Fortress', q: 'Nimrod Fortress National Park', category: 'historic', description: 'המצודה הגדולה בארץ, מהמאה ה-13, על רכס צר מול החרמון. מגדלים ומנהרות שאפשר להיכנס אליהם.', durationMin: 120, priceLevel: 1, tags: ['history', 'outdoors'], mustSee: true },
      { id: 'gol-bental', name: 'הר בנטל', nameLocal: 'Mount Bental', q: 'Mount Bental', category: 'viewpoint', description: 'פסגת הר געש כבוי עם עמדות תצפית ובונקרים משוחזרים, ונוף אל הרמה הסורית. מגיעים ברכב עד למעלה.', durationMin: 60, priceLevel: 0, tags: ['history'], mustSee: true },
      { id: 'gol-gamla', name: 'שמורת גמלא', nameLocal: 'Gamla Nature Reserve', q: 'Gamla Nature Reserve', category: 'nature', description: 'עיר יהודית מתקופת המרד הגדול על רכס תלול, לצד המפל הגבוה בארץ ומושבת נשרים. מסלול התצפית קצר ונגיש.', durationMin: 180, priceLevel: 2, tags: ['history', 'outdoors'], mustSee: true },
      { id: 'gol-yehudiya', name: 'שמורת יהודיה', nameLocal: 'Yehudiya Nature Reserve', q: 'Yehudiya Nature Reserve', category: 'nature', description: 'שמורת הנחלים הגדולה בגולן, עם מסלולי מים שכוללים קפיצה לבריכה ושחייה. חובה להירשם בכניסה ולצאת מוקדם.', durationMin: 300, priceLevel: 2, tags: ['outdoors'], mustSee: true },
      { id: 'gol-meshushim', name: 'בריכת המשושים', nameLocal: 'Meshushim Pool', q: 'Meshushim Pool', category: 'nature', description: 'בריכה טבעית מוקפת עמודי בזלת משושים - תופעה גאולוגית נדירה. ההליכה אליה כשעה מהחניה.', durationMin: 180, priceLevel: 2, tags: ['outdoors'] },
      { id: 'gol-hermon', name: 'החרמון', nameLocal: 'Mount Hermon', q: 'Mount Hermon Ski Resort', category: 'nature', description: 'ההר הגבוה בארץ ואתר הסקי היחיד בה. בקיץ פועלת הרכבל לתצפית, ובחורף נדרש לבדוק אם האתר פתוח.', durationMin: 240, priceLevel: 3, tags: ['families', 'outdoors'] },
      { id: 'gol-katzrin', name: 'קצרין העתיקה', nameLocal: 'Ancient Katzrin Park', q: 'Ancient Katzrin Park', category: 'historic', description: 'כפר תלמודי משוחזר עם בתים מרוהטים ובית כנסת מהמאה הרביעית. מותאם למשפחות ולהסבר.', durationMin: 90, priceLevel: 1, tags: ['families', 'history'] },
      { id: 'gol-zavitan', name: 'נחל זוויתן', nameLocal: 'Nahal Zavitan', q: 'Nahal Zavitan', category: 'nature', description: 'נחל בתוך שמורת יהודיה עם הבריכה המשושה ומפלים קטנים. מסלול ארוך ותובעני יותר מהממוצע.', durationMin: 300, priceLevel: 2, tags: ['outdoors'] },
      { id: 'gol-odem-forest', name: 'יער אודם', nameLocal: 'Odem Forest', q: 'Odem Forest Golan', category: 'nature', description: 'יער אלון טבעי בצפון הרמה, היחיד מסוגו בארץ. יפה במיוחד בסתיו כשהעלים מחליפים צבע.', durationMin: 120, priceLevel: 0, tags: ['outdoors', 'families'] },
    ],
    itinerary: [
      { day: 1, title: 'צפון הגולן', placeIds: ['gol-banias', 'gol-nimrod', 'gol-bental'], notes: 'בניאס בבוקר. שני מסלולי השמורה נפרדים - אפשר לשלב עם כרטיס אחד.' },
      { day: 2, title: 'נחלים', placeIds: ['gol-yehudiya', 'gol-meshushim'], notes: 'מסלולי המים דורשים רישום בכניסה ושעת יציאה מוקדמת. נעלי הליכה שנרטבות, ותיק אטום.' },
      { day: 3, title: 'הרמה', placeIds: ['gol-gamla', 'gol-katzrin', 'gol-odem-forest'], notes: 'בגמלא כדאי להתחיל בתצפית הנשרים - הם פעילים בבוקר.' },
    ],
  },

  {
    slug: 'haifa-carmel',
    name: 'חיפה והכרמל',
    nameLocal: 'Haifa & Mount Carmel',
    center: { lat: 32.794, lng: 34.9896 },
    zoom: 12,
    tagline: 'עיר על הר, עם גנים שיורדים אל הים',
    summary:
      'חיפה בנויה על מדרון, וזה קובע את כל הביקור בה: העיר התחתית, הדר והכרמל הם שלוש ' +
      'קומות עם נופים שונים לגמרי. הגנים הבהאיים הם הסמל שלה, ומסביב - הכרמל, עם יערות ' +
      'ומערות שהן אתר מורשת עולמית.',
    bestSeason: 'אביב וסתיו. הקיץ לח, והחורף גשום אבל ירוק במיוחד על הכרמל.',
    practical: {
      flights:
        'כשעה ברכבת מתל אביב, ושעתיים מירושלים. תחנת חיפה מרכז קרובה לעיר התחתית, ומשם הכרמלית ' +
        'עולה אל הכרמל - הרכבת התחתית היחידה בארץ.',
      gettingAround:
        'הכרמלית והרכבל מחברים בין הקומות וחוסכים עליות קשות. לאתרי הכרמל ולעין הוד צריך רכב. ' +
        'חיפה היא מהערים הבודדות שבהן תחבורה ציבורית פועלת גם בשבת.',
      kosherOverview:
        'יש כשרות בעיקר בהדר ובנווה שאנן, והמושבה הגרמנית מעורבת. בחיפה חלק מהמסעדות פתוחות ' +
        'בשבת ואינן כשרות. לוודא מול המקום.',
    },
    places: [
      { id: 'hfa-bahai', name: 'הגנים הבהאיים', nameLocal: 'Baháʼí Gardens', q: 'Bahai Gardens Haifa', category: 'attraction', description: 'תשע עשרה מדרגות גן על מדרון הכרמל, אתר מורשת עולמית. התצפית העליונה פתוחה חופשי; הירידה בגנים רק בסיור מודרך.', durationMin: 90, priceLevel: 0, tags: ['romantic'], mustSee: true },
      { id: 'hfa-german-colony', name: 'המושבה הגרמנית', nameLocal: 'German Colony Haifa', q: 'German Colony Haifa', category: 'historic', description: 'רחוב בן גוריון, עם בתי אבן טמפלרים מהמאה ה-19 בציר אחד שמוביל אל הגנים. מרכז הערב של העיר.', durationMin: 75, priceLevel: 1, tags: ['foodie', 'history'] },
      { id: 'hfa-nahal-mearot', name: 'מערות הכרמל', nameLocal: 'Nahal Me’arot Caves', q: 'Nahal Mearot Nature Reserve', category: 'historic', description: 'מערות פרהיסטוריות ובהן ממצאים בני מאות אלפי שנים, אתר מורשת עולמית. מסלול קצר עם מצגת בתוך המערה.', durationMin: 120, priceLevel: 1, tags: ['history', 'families'], mustSee: true },
      { id: 'hfa-ein-hod', name: 'עין הוד', nameLocal: 'Ein Hod Artists Village', q: 'Ein Hod', category: 'attraction', description: 'כפר אמנים על מדרון הכרמל, עם גלריות וסדנאות פתוחות. קטן ונוח להליכה של שעה-שעתיים.', durationMin: 120, priceLevel: 1, tags: ['art', 'romantic'] },
      { id: 'hfa-maritime-museum', name: 'המוזיאון הימי הלאומי', nameLocal: 'National Maritime Museum', q: 'National Maritime Museum Haifa', category: 'museum', description: 'חמשת אלפים שנות שיט בים התיכון, עם ממצאים מספינות טרופות. קרוב לחוף בת גלים.', durationMin: 90, priceLevel: 1, tags: ['history'] },
      { id: 'hfa-madatech', name: 'מדעטק', nameLocal: 'MadaTech Science Museum', q: 'MadaTech Haifa', category: 'museum', description: 'מוזיאון מדע וטכנולוגיה בבניין הטכניון ההיסטורי, עם מתקנים התנסותיים. יום שלם עם ילדים.', durationMin: 180, priceLevel: 2, tags: ['families'] },
      { id: 'hfa-stella-maris', name: 'סטלה מאריס', nameLocal: 'Stella Maris Monastery', q: 'Stella Maris Monastery Haifa', category: 'historic', description: 'מנזר כרמליטי על ראש הכרמל, מעל מערת אליהו. לידו התחנה העליונה של הרכבל.', durationMin: 60, priceLevel: 0, tags: ['history'] },
      { id: 'hfa-louis-promenade', name: 'טיילת לואי', nameLocal: 'Louis Promenade', q: 'Louis Promenade Haifa', category: 'viewpoint', description: 'טיילת תצפית על שפת הכרמל, מעל המפרץ והגנים. יפה במיוחד בלילה.', durationMin: 45, priceLevel: 0, tags: ['romantic'], mustSee: true },
      { id: 'hfa-muhraka', name: 'מוחרקה', nameLocal: 'Muhraka Carmelite Monastery', q: 'Muhraka Monastery', category: 'viewpoint', description: 'הנקודה הגבוהה בכרמל, עם תצפית מהגג אל עמק יזרעאל ועד החרמון ביום בהיר.', durationMin: 45, priceLevel: 1, tags: ['outdoors'] },
      { id: 'hfa-dado-beach', name: 'חוף דדו', nameLocal: 'Dado Beach', q: 'Dado Beach Haifa', category: 'nature', description: 'החוף המרכזי של העיר, עם טיילת רצופה וכיכרות ישיבה. חול נקי ומצילים בעונה.', durationMin: 120, priceLevel: 0, tags: ['families', 'outdoors'] },
      { id: 'hfa-hecht', name: 'מוזיאון הכט', nameLocal: 'Hecht Museum', q: 'Hecht Museum Haifa', category: 'museum', description: 'ארכיאולוגיה ואמנות בקמפוס אוניברסיטת חיפה, ובו ספינת מעגן מיכאל. כניסה חופשית.', durationMin: 90, priceLevel: 0, tags: ['history', 'art'] },
    ],
    itinerary: [
      { day: 1, title: 'הגנים והמושבה', placeIds: ['hfa-bahai', 'hfa-louis-promenade', 'hfa-german-colony'], notes: 'לסיור בתוך הגנים צריך להירשם מראש; התצפית העליונה פתוחה בלי תיאום.' },
      { day: 2, title: 'הכרמל', placeIds: ['hfa-nahal-mearot', 'hfa-ein-hod', 'hfa-muhraka'], notes: 'יום ברכב מחוץ לעיר. עין הוד נעימה אחר הצהריים כשהגלריות פתוחות.' },
      { day: 3, title: 'ים ומוזיאונים', placeIds: ['hfa-maritime-museum', 'hfa-stella-maris', 'hfa-dado-beach', 'hfa-madatech'], notes: 'הרכבל מחבר בין בת גלים לסטלה מאריס וחוסך עלייה ארוכה.' },
    ],
  },

  {
    slug: 'akko-caesarea',
    name: 'עכו וחוף הצפון',
    nameLocal: 'Acre & the Northern Coast',
    center: { lat: 32.92, lng: 35.07 },
    zoom: 10,
    tagline: 'עיר צלבנית מתחת לעיר עות׳מאנית, ונמל רומי מדרום',
    summary:
      'רצועת החוף שבין קיסריה לראש הנקרה מרכזת את האתרים הארכיאולוגיים המרשימים בארץ, ' +
      'וכולם על הים. עכו היא הבולטת - עיר שלמה מהתקופה הצלבנית השתמרה מתחת לעיר העות׳מאנית ' +
      'שנבנתה עליה. הכל בטווח שעת נסיעה אחת מהשני.',
    bestSeason: 'אביב וסתיו. בקיץ לח מאוד, אבל האתרים על הים והרוח מקלה.',
    practical: {
      flights:
        'עכו כשעה וחצי ברכבת מתל אביב ו-20 דקות מחיפה; קיסריה בתחנת בנימינה, כשעה מתל אביב. ' +
        'בין האתרים עצמם צריך רכב - הם פרוסים לאורך 60 קילומטר של חוף.',
      gettingAround:
        'רכב לציר המלא. עכו העתיקה עצמה היא הליכה בלבד, והחניה בכניסה לחומות. בקיסריה החניה ' +
        'צמודה לגן הלאומי.',
      kosherOverview:
        'בעכו יש מסעדות דגים והומוס ידועות, ולא כולן כשרות - בעיר העתיקה כדאי לברר מראש. ' +
        'בקיסריה ובזכרון יעקב הבחירה רחבה יותר. לוודא מול המקום.',
    },
    places: [
      { id: 'acr-old-acre', name: 'עכו העתיקה', nameLocal: 'Old Acre', q: 'Old Acre', category: 'historic', description: 'עיר חומה שלמה על הים, אתר מורשת עולמית. שוק, חאנים ונמל דייגים פעיל - הכל בתוך החומות.', durationMin: 180, priceLevel: 0, tags: ['history', 'foodie'], mustSee: true },
      { id: 'acr-knights-halls', name: 'אולמות האבירים', nameLocal: 'Knights’ Halls', q: 'Knights Halls Acre', category: 'historic', description: 'מתחם צלבני תת-קרקעי מהמאה ה-12 שנחשף מתחת לעיר העות׳מאנית, כולל מנהרת הטמפלרים.', durationMin: 120, priceLevel: 2, tags: ['history'], mustSee: true },
      { id: 'acr-caesarea', name: 'קיסריה', nameLocal: 'Caesarea National Park', q: 'Caesarea National Park', category: 'historic', description: 'עיר הנמל של הורדוס, עם תיאטרון רומי שעדיין מתקיימות בו הופעות, היפודרום ונמל שקוע.', durationMin: 180, priceLevel: 2, tags: ['history'], mustSee: true },
      { id: 'acr-rosh-hanikra', name: 'ראש הנקרה', nameLocal: 'Rosh HaNikra Grottoes', q: 'Rosh HaNikra', category: 'nature', description: 'מערות ים בצוק גיר לבן על גבול לבנון, שיורדים אליהן ברכבל התלול בעולם. הים בתוכן כחול-טורקיז.', durationMin: 120, priceLevel: 2, tags: ['families', 'outdoors'], mustSee: true },
      { id: 'acr-achziv', name: 'אכזיב', nameLocal: 'Achziv National Park', q: 'Achziv National Park', category: 'nature', description: 'לגונות רדודות מוגנות בין סלעים - מהמקומות הבטוחים בארץ לרחצה עם ילדים. מדשאות וצל.', durationMin: 180, priceLevel: 1, tags: ['families', 'outdoors'] },
      { id: 'acr-zichron', name: 'זכרון יעקב', nameLocal: 'Zichron Yaakov', q: 'Zichron Yaakov', category: 'historic', description: 'מושבה מ-1882 על רכס הכרמל, עם מדרחוב מיסדר משוחזר וגלריות. תצפית על החוף מהמצפה.', durationMin: 120, priceLevel: 1, tags: ['romantic', 'history'] },
      { id: 'acr-beit-shearim', name: 'בית שערים', nameLocal: 'Beit She’arim National Park', q: 'Beit Shearim National Park', category: 'historic', description: 'מערכת מערות קבורה יהודית מהמאה השנייה, אתר מורשת עולמית, עם סרקופגים מגולפים. קריר בפנים.', durationMin: 120, priceLevel: 1, tags: ['history'] },
      { id: 'acr-ramhal', name: 'מנהרת הטמפלרים', nameLocal: 'Templars Tunnel', q: 'Templars Tunnel Acre', category: 'historic', description: 'מנהרה צלבנית שחיברה את המצודה לנמל, שהתגלתה במקרה ב-1994. הליכה קצרה ומוארת מתחת לעיר.', durationMin: 45, priceLevel: 1, tags: ['history'] },
      { id: 'acr-ein-afek', name: 'עין אפק', nameLocal: 'Ein Afek Nature Reserve', q: 'Ein Afek Nature Reserve', category: 'nature', description: 'שמורת ביצה עם שביל עץ מוגבה מעל המים ומגדל תצפית. שטוחה ונוחה לעגלה.', durationMin: 90, priceLevel: 1, tags: ['families', 'outdoors'] },
      { id: 'acr-caesarea-aqueduct', name: 'אמת המים של קיסריה', nameLocal: 'Caesarea Aqueduct', q: 'Caesarea Aqueduct Beach', category: 'historic', description: 'אמת מים רומית שרצה לאורך חוף חולי פתוח, צפונית לגן הלאומי. כניסה חופשית, יפה בשקיעה.', durationMin: 45, priceLevel: 0, tags: ['history', 'romantic'] },
    ],
    itinerary: [
      { day: 1, title: 'עכו', placeIds: ['acr-old-acre', 'acr-knights-halls', 'acr-ramhal'], notes: 'כרטיס משולב לאתרי עכו משתלם. העיר העתיקה היא הליכה - להשאיר את הרכב בחניון החומות.' },
      { day: 2, title: 'צפונה', placeIds: ['acr-rosh-hanikra', 'acr-achziv', 'acr-ein-afek'], notes: 'ראש הנקרה בבוקר, לפני שהרכבל מתמלא. אכזיב אחר הצהריים לרחצה.' },
      { day: 3, title: 'דרומה', placeIds: ['acr-caesarea', 'acr-caesarea-aqueduct', 'acr-zichron', 'acr-beit-shearim'], notes: 'אמת המים בשקיעה סוגרת את היום טוב. קיסריה חשופה - כובע ומים.' },
    ],
  },
];
