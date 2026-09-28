/**
 * The seed for the Israel catalog: everything about each place EXCEPT its
 * coordinate, which is looked up from OpenStreetMap by `israel-geocode.mjs` rather
 * than typed from memory.
 *
 * Why the coordinates are not in here: `coordPrecision.test.ts` fails any new
 * point-shaped place carrying two decimals or fewer, and its message says to fix the
 * data rather than the test. Two decimals is about 1.1km - the width of the Old City.
 * A coordinate recalled from memory lands in that band, so recalling them was never an
 * option; `q` is the OSM query instead.
 *
 * Categories are deliberately limited to attraction/historic/museum/nature/viewpoint.
 * `types.ts` states the rule for the others - "no new food/market/shopping entry
 * without a source" - and a source means a URL actually read on a stated date. That is
 * a real gap for Tel Aviv in particular, and it is left open rather than filled with
 * invented provenance.
 */

export const COUNTRY = {
  slug: 'israel',
  name: 'ישראל',
  nameLocal: 'Israel',
  flag: '🇮🇱',
  tagline: 'הארץ שכולם מכירים - ורובה עוד לא נראתה',
  summary:
    'טיול בארץ הוא הטיול הזול, הקצר והספונטני ביותר שאפשר לתכנן: בלי טיסה, בלי ויזה ובלי ' +
    'המרת מטבע, ובשלוש שעות נסיעה עוברים ממכתש במדבר לשמורת מים בגליל. הקטלוג כאן בנוי ' +
    'לפי אזורים ולא לפי ערים, כי ככה באמת נוסעים בארץ - בסיס אחד ויוצאים ממנו.',
  practical: {
    visa: 'לאזרחי ישראל אין כמובן צורך בדרכון או בוויזה. גם לא בביטוח נסיעות לחו״ל - מה שנדרש הוא ביטוח הבריאות הרגיל.',
    currency: 'שקל חדש (₪). אין המרת מטבע ואין עמלות המרה - זה החיסכון הגדול ביותר בטיול בארץ לעומת חו״ל.',
    sim: 'הסים הרגיל שלכם עובד. בשמורות במדבר ובנחלים עמוקים בגליל יש נקודות בלי קליטה - כדאי להוריד מפה לא מקוונת לפני יציאה למסלול.',
    payments:
      'אשראי בכל מקום, ביט וכרטיס נטען בשווקים ובדוכנים. בשמורות ובגנים לאומיים כדאי להזמין כרטיס מראש באתר רשות הטבע והגנים - בסופי שבוע ובחגים אתרים פופולריים מגיעים לתפוסה מלאה.',
  },
};

/**
 * Practical text per destination. `flights` is the field name the type gives us and it
 * is the wrong word for a domestic trip - the three places that render it say "flights
 * from Tel Aviv", which is nonsense for Jerusalem. The label is fixed in the UI to read
 * "how to get there" for the home country; the text here answers that question.
 */
export const DESTINATIONS = [
  {
    slug: 'jerusalem',
    name: 'ירושלים',
    nameLocal: 'Jerusalem',
    center: { lat: 31.7767, lng: 35.2345 },
    zoom: 13,
    tagline: 'ארבעה רבעים, שלוש דתות, ואלף שנה בכל רחוב',
    summary:
      'ירושלים היא היעד היחיד בארץ שאפשר להקדיש לו שלושה ימים ולהרגיש שראית חצי. העיר ' +
      'העתיקה היא הליבה, אבל רוב מה שמפתיע מבקרים נמצא דווקא מחוץ לחומות - מוזיאון ישראל, ' +
      'יד ושם ועין כרם. העיר בנויה על גבעות, והמרחקים על המפה מטעים: מה שנראה קרוב הוא לרוב עלייה.',
    bestSeason: 'אביב (מרץ-מאי) וסתיו (ספטמבר-נובמבר). בקיץ חם ויבש אבל נסבל בזכות הגובה, ובחורף קר ולעיתים יורד שלג.',
    practical: {
      flights:
        'שעה נסיעה מתל אביב. הרכבת המהירה מנתב״ג ומתל אביב מגיעה לתחנת יצחק נבון תוך 30 דקות ' +
        'ומשם קלה קלילה ברכבת הקלה - זו הדרך המהירה והזולה ביותר, ובשבת היא לא פועלת.',
      gettingAround:
        'הרכבת הקלה חוצה את העיר מצפון לדרום ועוברת ליד שער שכם ומחנה יהודה. בעיר העתיקה הולכים ' +
        'ברגל בלבד - הסמטאות מדרגות. חניה במרכז יקרה ומועטה; עדיף חניוני "חנה וסע" בכניסה לעיר.',
      kosherOverview:
        'רוב המסעדות בעיר כשרות, כולל רשתות, ובשכונות החרדיות כמעט הכל. בשבת חלק ניכר מהעיר סגור ' +
        'והתחבורה הציבורית מושבתת - כדאי לקנות מראש. תמיד לוודא מול המקום.',
    },
    places: [
      { id: 'jlm-kotel', name: 'הכותל המערבי', nameLocal: 'Western Wall', q: 'Western Wall Jerusalem', category: 'historic', description: 'שריד החומה התומכת של הר הבית, ומקום התפילה המרכזי ביהדות. פתוח תמיד וללא תשלום, עם הפרדה בין עזרת גברים לנשים.', durationMin: 45, priceLevel: 0, tags: ['history'], mustSee: true },
      { id: 'jlm-old-city', name: 'העיר העתיקה', nameLocal: 'Jerusalem Old City', q: 'Jaffa Gate Jerusalem', category: 'historic', description: 'קילומטר מרובע בתוך חומות מהמאה ה-16, מחולק לרובע יהודי, מוסלמי, נוצרי וארמני. נכנסים משער יפו או משער שכם.', durationMin: 180, priceLevel: 0, tags: ['history'], mustSee: true },
      { id: 'jlm-holy-sepulchre', name: 'כנסיית הקבר', nameLocal: 'Church of the Holy Sepulchre', q: 'Church of the Holy Sepulchre Jerusalem', category: 'historic', description: 'המקום המקודש ביותר בנצרות, מנוהל במשותף בידי שש עדות. כניסה חופשית, לבוש צנוע נדרש.', durationMin: 60, priceLevel: 0, tags: ['history'] },
      { id: 'jlm-yad-vashem', name: 'יד ושם', nameLocal: 'Yad Vashem', q: 'Yad Vashem Jerusalem', category: 'museum', description: 'מוזיאון השואה הלאומי בהר הרצל. המוזיאון ההיסטורי הוא מסלול אחד ארוך; הכניסה חופשית ולא מתאימה לילדים מתחת לגיל 10.', durationMin: 180, priceLevel: 0, tags: ['history'], mustSee: true },
      { id: 'jlm-israel-museum', name: 'מוזיאון ישראל', nameLocal: 'Israel Museum', q: 'Israel Museum Jerusalem', category: 'museum', description: 'המוזיאון הגדול בארץ: היכל הספר עם מגילות ים המלח, דגם ירושלים של בית שני, וארכיאולוגיה ואמנות.', durationMin: 180, priceLevel: 2, tags: ['art', 'history'], mustSee: true },
      { id: 'jlm-tower-david', name: 'מגדל דוד', nameLocal: 'Tower of David Museum', q: 'Tower of David Jerusalem', category: 'museum', description: 'מצודה בשער יפו ובתוכה מוזיאון תולדות ירושלים. מהחומה נשקפת תצפית טובה על העיר העתיקה.', durationMin: 120, priceLevel: 2, tags: ['history'] },
      { id: 'jlm-city-of-david', name: 'עיר דוד', nameLocal: 'City of David', q: 'City of David Jerusalem', category: 'historic', description: 'אתר ארכיאולוגי מדרום להר הבית. נקבת השילוח היא מנהרת מים שהולכים בה במים - צריך נעליים ופנס.', durationMin: 150, priceLevel: 2, tags: ['history'] },
      { id: 'jlm-kotel-tunnels', name: 'מנהרות הכותל', nameLocal: 'Western Wall Tunnels', q: 'Western Wall Tunnels Jerusalem', category: 'historic', description: 'סיור מודרך לאורך ההמשך התת-קרקעי של הכותל. בהזמנה מראש בלבד, והמעברים צרים.', durationMin: 75, priceLevel: 2, tags: ['history'] },
      { id: 'jlm-mount-olives', name: 'תצפית הר הזיתים', nameLocal: 'Mount of Olives Observation Point', q: 'Mount of Olives Observation Point Jerusalem', category: 'viewpoint', description: 'התצפית המוכרת ביותר על העיר העתיקה וכיפת הסלע. הכי יפה בשעת בוקר, כשהשמש מאירה את החומות.', durationMin: 30, priceLevel: 0, tags: ['history'], mustSee: true },
      { id: 'jlm-mahane-yehuda', name: 'שוק מחנה יהודה', nameLocal: 'Mahane Yehuda Market', q: 'Mahane Yehuda Market Jerusalem', category: 'attraction', description: 'השוק המרכזי של ירושלים. ביום שישי לפני הצהריים הוא בשיאו, ובערב חלק מהדוכנים הופכים לברים.', durationMin: 90, priceLevel: 1, tags: ['foodie'], mustSee: true },
      { id: 'jlm-zoo', name: 'גן החיות התנ״כי', nameLocal: 'Jerusalem Biblical Zoo', q: 'Jerusalem Biblical Zoo', category: 'attraction', description: 'גן חיות גדול בדרום העיר, עם דגש על חיות המוזכרות בתנ״ך. יום שלם עם ילדים, והשטח מדרוני.', durationMin: 240, priceLevel: 2, tags: ['families'] },
      { id: 'jlm-science-museum', name: 'מוזיאון המדע בלומפילד', nameLocal: 'Bloomfield Science Museum', q: 'Bloomfield Science Museum Jerusalem', category: 'museum', description: 'מוזיאון מדע התנסותי בקמפוס גבעת רם, בנוי סביב מתקנים שנוגעים בהם. מכוון לגילאי 5 ומעלה.', durationMin: 150, priceLevel: 2, tags: ['families'] },
      { id: 'jlm-ein-kerem', name: 'עין כרם', nameLocal: 'Ein Kerem', q: 'Ein Kerem Jerusalem', category: 'historic', description: 'שכונה כפרית בהרים במערב העיר, עם מנזרים, מעיין וסמטאות אבן. נעימה במיוחד אחרי הצהריים.', durationMin: 120, priceLevel: 0, tags: ['romantic', 'history'] },
      { id: 'jlm-first-station', name: 'התחנה הראשונה', nameLocal: 'First Station Jerusalem', q: 'First Station Jerusalem', category: 'attraction', description: 'תחנת הרכבת העות׳מאנית שהוסבה למתחם פנאי. נקודת התחלה נוחה למסילת הרכבת - טיילת הליכה ואופניים.', durationMin: 60, priceLevel: 0, tags: ['families'] },
      { id: 'jlm-bible-lands', name: 'מוזיאון ארצות המקרא', nameLocal: 'Bible Lands Museum', q: 'Bible Lands Museum Jerusalem', category: 'museum', description: 'ארכיאולוגיה של תרבויות המזרח הקדום, ממוקם מול מוזיאון ישראל. שקט ולא עמוס, גם בעונה.', durationMin: 90, priceLevel: 2, tags: ['history'] },
      { id: 'jlm-machtesh-cross', name: 'מנזר המצלבה', nameLocal: 'Monastery of the Cross', q: 'Monastery of the Cross Jerusalem', category: 'historic', description: 'מנזר אורתודוקסי מהמאה ה-11 בתוך עמק ירוק במרכז העיר, מוקף עצי זית.', durationMin: 60, priceLevel: 1, tags: ['history'] },
    ],
    itinerary: [
      { day: 1, title: 'העיר העתיקה', placeIds: ['jlm-old-city', 'jlm-kotel', 'jlm-holy-sepulchre', 'jlm-tower-david'], notes: 'להתחיל מוקדם ולנעול נעליים סגורות - הסמטאות אבן ומדרגות. לבוש צנוע במקומות הקדושים.' },
      { day: 2, title: 'מוזיאונים ומערב העיר', placeIds: ['jlm-israel-museum', 'jlm-bible-lands', 'jlm-yad-vashem', 'jlm-ein-kerem'], notes: 'יד ושם תובעני רגשית - עדיף לסיים בו את היום ולא לפתוח בו.' },
      { day: 3, title: 'מתחת לעיר ומעליה', placeIds: ['jlm-city-of-david', 'jlm-kotel-tunnels', 'jlm-mount-olives', 'jlm-mahane-yehuda'], notes: 'מנהרות הכותל בהזמנה מראש בלבד. את נקבת השילוח עוברים במים - בגדים להחלפה.' },
    ],
  },

  {
    slug: 'tel-aviv',
    name: 'תל אביב-יפו',
    nameLocal: 'Tel Aviv-Yafo',
    center: { lat: 32.0853, lng: 34.7818 },
    zoom: 13,
    tagline: 'עיר שנבנתה על חול לפני מאה שנה, ולא נעצרה מאז',
    summary:
      'תל אביב היא היעד הכי פחות "אתרים" בקטלוג הזה ואחד הנעימים לטייל בו: רוב מה שעושים ' +
      'בה הוא ללכת - מיפו העתיקה לאורך הטיילת עד הנמל זה מסלול רצוף אחד. העיר שטוחה, מה ' +
      'שהופך אופניים לדרך התחבורה הטובה ביותר בה.',
    bestSeason: 'אביב וסתיו. הקיץ חם ולח מאוד, אבל עונת הים נמשכת בו ממאי עד אוקטובר.',
    practical: {
      flights:
        'מרכז הארץ, ולכן נקודת המוצא של רוב הטיולים בארץ ולא יעד שמגיעים אליו. מנתב״ג רכבת ' +
        'ישירה של 20 דקות לתחנות העיר; מירושלים שעה, מחיפה כשעה ברכבת.',
      gettingAround:
        'אופניים או קורקינט שיתופי הם הדרך המהירה בעיר, ויש שביל אופניים לאורך הטיילת ולאורך ' +
        'הירקון. הקו האדום של הרכבת הקלה חוצה את גוש דן. חניה קשה ויקרה - כחול-לבן בתשלום באפליקציה.',
      kosherOverview:
        'מגוון רחב אבל לא ברירת מחדל: בתל אביב חלק ניכר מהמסעדות אינן כשרות, בשונה מירושלים. ' +
        'יש כשרות בעיקר במרכז העיר וברמת אביב, ובשבת חלק מהעיר פעיל. לוודא מול המקום.',
    },
    places: [
      { id: 'tlv-old-jaffa', name: 'יפו העתיקה', nameLocal: 'Old Jaffa', q: 'Old Jaffa Tel Aviv', category: 'historic', description: 'נמל בן אלפי שנים עם סמטאות אבן, גלריות וכיכר קדומים. התצפית מגן הפסגה משקיפה על קו הרקיע של תל אביב.', durationMin: 150, priceLevel: 0, tags: ['history', 'romantic'], mustSee: true },
      { id: 'tlv-promenade', name: 'טיילת תל אביב', nameLocal: 'Tel Aviv Promenade', q: 'Tel Aviv Promenade', category: 'attraction', description: 'טיילת רצופה לאורך כל חופי העיר, מיפו ועד הנמל. הליכה מלאה היא כשעתיים, ובשקיעה היא הדבר שהעיר הכי מזוהה איתו.', durationMin: 90, priceLevel: 0, tags: ['romantic', 'outdoors'], mustSee: true },
      { id: 'tlv-carmel-market', name: 'שוק הכרמל', nameLocal: 'Carmel Market', q: 'Carmel Market Tel Aviv', category: 'attraction', description: 'השוק הגדול בעיר, צר וצפוף. נגמר בשעות אחר הצהריים ובשישי הוא עמוס במיוחד.', durationMin: 75, priceLevel: 1, tags: ['foodie'] },
      { id: 'tlv-port', name: 'נמל תל אביב', nameLocal: 'Tel Aviv Port', q: 'Tel Aviv Port', category: 'attraction', description: 'נמל ישן שהוסב למתחם בילוי על הים, עם רחבת דק גלית. פתוח גם בשבת ונוח עם עגלה.', durationMin: 90, priceLevel: 1, tags: ['families'] },
      { id: 'tlv-museum-art', name: 'מוזיאון תל אביב לאמנות', nameLocal: 'Tel Aviv Museum of Art', q: 'Tel Aviv Museum of Art', category: 'museum', description: 'אוסף אמנות ישראלית ובינלאומית בבניין שהאדריכלות שלו היא חלק מהביקור. סגור בימי ראשון.', durationMin: 150, priceLevel: 2, tags: ['art'], mustSee: true },
      { id: 'tlv-anu', name: 'מוזיאון אנו', nameLocal: 'ANU Museum of the Jewish People', q: 'ANU Museum of the Jewish People Tel Aviv', category: 'museum', description: 'סיפור העם היהודי בתפוצות, בקמפוס אוניברסיטת תל אביב. מוזיאון גדול ומודרני - להקצות חצי יום.', durationMin: 180, priceLevel: 2, tags: ['history'] },
      { id: 'tlv-neve-tzedek', name: 'נווה צדק', nameLocal: 'Neve Tzedek', q: 'Neve Tzedek Tel Aviv', category: 'historic', description: 'השכונה הראשונה שנבנתה מחוץ ליפו, היום סמטאות משופצות עם חנויות מעצבים. קטנה - שעה מספיקה.', durationMin: 60, priceLevel: 0, tags: ['romantic'] },
      { id: 'tlv-rothschild', name: 'שדרות רוטשילד', nameLocal: 'Rothschild Boulevard', q: 'Rothschild Boulevard Tel Aviv', category: 'attraction', description: 'השדרה המרכזית של העיר, ולאורכה ריכוז בנייני באוהאוס. שביל הליכה ואופניים באמצע.', durationMin: 60, priceLevel: 0, tags: ['history'] },
      { id: 'tlv-hayarkon', name: 'פארק הירקון', nameLocal: 'HaYarkon Park', q: 'HaYarkon Park Tel Aviv', category: 'nature', description: 'הפארק הגדול של גוש דן, עם אגם סירות, גן הסלעים וטיילת לאורך הנחל. יום שלם עם ילדים.', durationMin: 180, priceLevel: 0, tags: ['families', 'outdoors'], mustSee: true },
      { id: 'tlv-eretz-israel', name: 'מוזיאון ארץ ישראל', nameLocal: 'Eretz Israel Museum', q: 'Eretz Israel Museum Tel Aviv', category: 'museum', description: 'קמפוס מוזיאונים סביב תל קסילה, עם ביתנים לזכוכית, פסיפס ותרבות חומרית. שטח פתוח - נוח עם ילדים.', durationMin: 150, priceLevel: 2, tags: ['families', 'history'] },
      { id: 'tlv-independence-hall', name: 'היכל העצמאות', nameLocal: 'Independence Hall', q: 'Independence Hall Tel Aviv', category: 'museum', description: 'האולם שבו הוכרזה המדינה ב-1948, בשדרות רוטשילד. ביקור קצר ומאוד ממוקד.', durationMin: 60, priceLevel: 1, tags: ['history'] },
      { id: 'tlv-jaffa-flea', name: 'שוק הפשפשים ביפו', nameLocal: 'Jaffa Flea Market', q: 'Jaffa Flea Market', category: 'attraction', description: 'סמטאות של רהיטים משומשים, וינטג׳ ודוכנים, שהפכו גם לאזור בילוי ערב. סגור בשבת.', durationMin: 90, priceLevel: 1, tags: ['foodie'] },
      { id: 'tlv-gordon-beach', name: 'חוף גורדון', nameLocal: 'Gordon Beach', q: 'Gordon Beach Tel Aviv', category: 'nature', description: 'חוף מרכזי עם מצילים, מתקני כושר ומגרשי מטקות. עמוס בסופי שבוע ובקיץ.', durationMin: 120, priceLevel: 0, tags: ['families', 'outdoors'] },
      { id: 'tlv-sarona', name: 'שרונה', nameLocal: 'Sarona Tel Aviv', q: 'Sarona Tel Aviv', category: 'historic', description: 'מושבה טמפלרית מהמאה ה-19 שבתיה שוחזרו והוסבו למתחם קניות ואוכל, בלב העיר.', durationMin: 90, priceLevel: 1, tags: ['foodie'] },
      { id: 'tlv-azrieli-observatory', name: 'מצפה עזריאלי', nameLocal: 'Azrieli Observatory', q: 'Azrieli Observatory Tel Aviv', category: 'viewpoint', description: 'תצפית 360 מעלות מהקומה ה-49 של המגדל העגול. הזמן הטוב ביותר הוא כשעה לפני השקיעה.', durationMin: 45, priceLevel: 1, tags: ['families'] },
    ],
    itinerary: [
      { day: 1, title: 'יפו והטיילת', placeIds: ['tlv-old-jaffa', 'tlv-jaffa-flea', 'tlv-neve-tzedek', 'tlv-promenade'], notes: 'הכל רצוף ברגל מדרום לצפון - בערך 5 קילומטר בסך הכל, עם עצירות.' },
      { day: 2, title: 'העיר הלבנה והמוזיאונים', placeIds: ['tlv-rothschild', 'tlv-independence-hall', 'tlv-museum-art', 'tlv-sarona'], notes: 'מוזיאון תל אביב סגור בימי ראשון - לבדוק לפני שמתכננים את היום הזה.' },
      { day: 3, title: 'צפון העיר והים', placeIds: ['tlv-hayarkon', 'tlv-eretz-israel', 'tlv-port', 'tlv-gordon-beach'], notes: 'יום נוח עם ילדים. אופניים לאורך הירקון חוסכים הרבה הליכה.' },
    ],
  },

  {
    slug: 'dead-sea',
    name: 'ים המלח ומצדה',
    nameLocal: 'Dead Sea & Masada',
    center: { lat: 31.5, lng: 35.39 },
    zoom: 10,
    tagline: 'הנקודה הנמוכה בעולם, ומבצר מעליה',
    summary:
      'אזור שמתוכנן סביב שלושה דברים: מצדה בזריחה, נחל בשמורת עין גדי, וצף בים. החום הוא ' +
      'המשתנה שקובע הכל - מאמצע מאי עד ספטמבר מטיילים רק מוקדם בבוקר. הים נסוג בקצב של ' +
      'כמטר בשנה, ולכן חופים שסומנו במפות ישנות כבר לא קיימים.',
    bestSeason: 'נובמבר עד מרץ. בקיץ הטמפרטורות עוברות 40 מעלות, והמסלולים בשמורות נסגרים בשעות היום.',
    practical: {
      flights:
        'כשעה וחצי נסיעה מירושלים ושעתיים וחצי מתל אביב, דרך כביש 90. יש אוטובוסים מירושלים ' +
        'ומבאר שבע, אבל בלי רכב קשה מאוד לשלב בין האתרים - הם פרוסים לאורך עשרות קילומטרים.',
      gettingAround:
        'רכב הוא כמעט הכרחי. כביש 90 מחבר את כל האתרים בציר אחד. חשוב: תדלוק לפני הכניסה לאזור, ' +
        'ומים - ליטר לאדם לשעת הליכה, לא פחות.',
      kosherOverview:
        'מלונות עין בוקק ברובם כשרים ועם מטבח גדול, וכך גם הקפיטריות בגנים הלאומיים. מחוץ למלונות ' +
        'כמעט אין מסעדות - כדאי לצאת עם אוכל. לוודא מול המקום.',
    },
    places: [
      { id: 'ds-masada', name: 'מצדה', nameLocal: 'Masada National Park', q: 'Masada National Park', category: 'historic', description: 'מבצר הרודוס על צוק מעל ים המלח, ואתר מורשת עולמית. עולים ברכבל או בשביל הנחש - כשעה של טיפוס, ובקיץ רק לפני הזריחה.', durationMin: 210, priceLevel: 2, tags: ['history', 'outdoors'], mustSee: true },
      { id: 'ds-ein-gedi', name: 'שמורת עין גדי', nameLocal: 'Ein Gedi Nature Reserve', q: 'Ein Gedi Nature Reserve', category: 'nature', description: 'נווה מדבר עם מפלים וברֵכות בלב מדבר יהודה. מסלול נחל דוד קצר ומתאים למשפחות; יעלים ושפנֵי סלע נראים בו כמעט תמיד.', durationMin: 180, priceLevel: 2, tags: ['families', 'outdoors'], mustSee: true },
      { id: 'ds-ein-bokek', name: 'חוף עין בוקק', nameLocal: 'Ein Bokek Beach', q: 'Ein Bokek Beach', category: 'nature', description: 'החוף הציבורי המרכזי, עם מקלחות מים מתוקים ומצילים - הכרחי, כי שטיפה אחרי הצפה אינה אופציונלית.', durationMin: 120, priceLevel: 0, tags: ['families'], mustSee: true },
      { id: 'ds-qumran', name: 'קומראן', nameLocal: 'Qumran National Park', q: 'Qumran National Park', category: 'historic', description: 'היישוב שבמערות שלידו נמצאו מגילות ים המלח. ביקור קצר, ומשלים את היכל הספר במוזיאון ישראל.', durationMin: 75, priceLevel: 1, tags: ['history'] },
      { id: 'ds-nahal-arugot', name: 'נחל ערוגות', nameLocal: 'Nahal Arugot', q: 'Nahal Arugot Ein Gedi', category: 'nature', description: 'הנחל השני בשמורת עין גדי, ארוך ופחות עמוס מנחל דוד. מסלול המים דורש הליכה בתוך הזרם.', durationMin: 180, priceLevel: 2, tags: ['outdoors'] },
      { id: 'ds-einot-tzukim', name: 'עינות צוקים', nameLocal: 'Einot Tzukim Nature Reserve', q: 'Einot Tzukim Nature Reserve', category: 'nature', description: 'נווה המדבר הנמוך בעולם, עם ברֵכות מעיין רדודות. שקט ופחות מוכר משאר האזור.', durationMin: 120, priceLevel: 1, tags: ['families', 'outdoors'] },
      { id: 'ds-qasr-el-yahud', name: 'קאסר אל יהוד', nameLocal: 'Qasr el Yahud', q: 'Qasr el Yahud', category: 'historic', description: 'אתר הטבילה על הירדן, בגבול עם ירדן. מקום שקט למעט בימי עלייה לרגל; לבוש צנוע.', durationMin: 60, priceLevel: 0, tags: ['history'] },
      { id: 'ds-mount-sodom', name: 'הר סדום', nameLocal: 'Mount Sodom', q: 'Mount Sodom', category: 'nature', description: 'הר מלח בקצה הדרומי של הים, ובו מערות ותצפיות. המסלולים חשופים לחלוטין - רק בחורף ובבוקר.', durationMin: 150, priceLevel: 0, tags: ['outdoors'] },
      { id: 'ds-metzoke-dragot', name: 'תצפית מצוקי דרגות', nameLocal: 'Metzoke Dragot Viewpoint', q: 'Metzoke Dragot', category: 'viewpoint', description: 'תצפית מצוק גבוה על כל אגן הים הצפוני. עצירה קצרה בדרך, ומרשימה במיוחד בשעת בוקר.', durationMin: 30, priceLevel: 0, tags: ['outdoors'] },
      { id: 'ds-ein-gedi-botanical', name: 'הגן הבוטני עין גדי', nameLocal: 'Ein Gedi Botanical Garden', q: 'Ein Gedi Botanical Garden', category: 'nature', description: 'גן בוטני שהוא גם קיבוץ מיושב, עם מאות מיני צמחים מהמדבר ומאפריקה. צל אמיתי - נדיר באזור.', durationMin: 90, priceLevel: 1, tags: ['families'] },
    ],
    itinerary: [
      { day: 1, title: 'מצדה והים', placeIds: ['ds-masada', 'ds-ein-bokek'], notes: 'לצאת לפני הזריחה. אחרי מצדה החום כבר לא מאפשר מסלול נוסף - הים הוא ההמשך הנכון.' },
      { day: 2, title: 'נחלים בשמורה', placeIds: ['ds-ein-gedi', 'ds-nahal-arugot', 'ds-ein-gedi-botanical'], notes: 'הכניסה האחרונה לשמורה מוקדמת - לבדוק שעות באתר רשות הטבע והגנים לפני היציאה.' },
      { day: 3, title: 'צפון הים', placeIds: ['ds-qumran', 'ds-einot-tzukim', 'ds-qasr-el-yahud', 'ds-metzoke-dragot'], notes: 'יום קליל בעיקרו, מתאים גם לחום. הכל על ציר כביש 90.' },
    ],
  },

  {
    slug: 'eilat',
    name: 'אילת והערבה',
    nameLocal: 'Eilat & the Arava',
    center: { lat: 29.5577, lng: 34.9519 },
    zoom: 11,
    tagline: 'שונית אלמוגים בקצה המדבר',
    summary:
      'אילת היא היעד היחיד בארץ עם שונית אלמוגים טרופית, וזו הסיבה האמיתית להגיע אליה. ' +
      'מעליה, בתוך שעת נסיעה, נמצאים פארק תמנע והרי אילת - נופי מדבר שאין להם דומה בארץ. ' +
      'החורף כאן הוא העונה הנוחה, בזמן שכל שאר הארץ קרה.',
    bestSeason: 'אוקטובר עד אפריל. בקיץ החום עובר 40 מעלות, והצלילה נמשכת כל השנה כי המים חמים.',
    practical: {
      flights:
        'ארבע שעות נסיעה מתל אביב וכשלוש וחצי מירושלים, או טיסה פנימית של 50 דקות לשדה התעופה ' +
        'רמון. יש גם אוטובוסים ישירים מתל אביב ומירושלים, ובחגים כדאי להזמין מקום מראש.',
      gettingAround:
        'בתוך העיר אפשר ברגל ובאוטובוס, אבל לתמנע, לחי-בר ולקניון האדום צריך רכב. אילת היא ' +
        'אזור סחר חופשי - אין מע״מ, וזה מורגש במחירים.',
      kosherOverview:
        'רוב מלונות העיר כשרים ובעלי מטבח גדול, ובטיילת יש מגוון. מחוץ לעיר, בתמנע ובערבה, ' +
        'כמעט אין אפשרויות - לצאת עם אוכל. לוודא מול המקום.',
    },
    places: [
      { id: 'eil-observatory', name: 'האובזרבטוריום התת-ימי', nameLocal: 'Coral World Underwater Observatory', q: 'Underwater Observatory Marine Park Eilat', category: 'attraction', description: 'תצפית מתחת לפני הים אל תוך השונית, בלי להירטב, לצד בריכות כרישים וצבי ים. האתר המתאים ביותר בעיר למשפחות.', durationMin: 180, priceLevel: 3, tags: ['families'], mustSee: true },
      { id: 'eil-coral-beach', name: 'שמורת האלמוגים', nameLocal: 'Coral Beach Nature Reserve', q: 'Coral Beach Nature Reserve Eilat', category: 'nature', description: 'השונית הנגישה ביותר בארץ - נכנסים מהחוף עם שנורקל ורואים אלמוגים ודגים בתוך מטרים ספורים.', durationMin: 150, priceLevel: 1, tags: ['families', 'outdoors'], mustSee: true },
      { id: 'eil-timna', name: 'פארק תמנע', nameLocal: 'Timna Park', q: 'Timna Park', category: 'nature', description: 'בקעת מדבר עם מכרות נחושת מהתקופה המצרית, עמודי שלמה וסלעי חול אדומים. נוסעים בין האתרים ברכב בתוך הפארק.', durationMin: 240, priceLevel: 2, tags: ['families', 'history', 'outdoors'], mustSee: true },
      { id: 'eil-dolphin-reef', name: 'חוף הדולפינים', nameLocal: 'Dolphin Reef Eilat', q: 'Dolphin Reef Eilat', category: 'attraction', description: 'חוף שבו חיה קבוצת דולפינים אפורים בסביבה פתוחה. אפשר לצפות מהמזחים בלי להיכנס למים.', durationMin: 120, priceLevel: 2, tags: ['families'] },
      { id: 'eil-hai-bar', name: 'חי-בר יטבתה', nameLocal: 'Yotvata Hai-Bar Nature Reserve', q: 'Yotvata Hai-Bar Nature Reserve', category: 'nature', description: 'שמורה לחיות מדבר מקראיות - ראמים, פראים ובנות יענה - שנוסעים בה ברכב פרטי. כ-40 דקות צפונה מהעיר.', durationMin: 120, priceLevel: 2, tags: ['families'] },
      { id: 'eil-red-canyon', name: 'הקניון האדום', nameLocal: 'Red Canyon Eilat', q: 'Red Canyon Eilat', category: 'nature', description: 'קניון צר בסלע חול אדום, עם סולמות ושלבי ברזל. מסלול קצר ומרשים - כשעה וחצי, לא בקיץ.', durationMin: 120, priceLevel: 0, tags: ['outdoors'], mustSee: true },
      { id: 'eil-mount-yoash', name: 'תצפית הר יואש', nameLocal: 'Mount Yoash', q: 'Mount Yoash Eilat', category: 'viewpoint', description: 'מהפסגה רואים ארבע מדינות ביום בהיר: ישראל, ירדן, מצרים וסעודיה. מגיעים ברכב עד קרוב מאוד.', durationMin: 45, priceLevel: 0, tags: ['outdoors'] },
      { id: 'eil-promenade', name: 'טיילת אילת', nameLocal: 'Eilat Promenade', q: 'Eilat Promenade', category: 'attraction', description: 'הטיילת סביב המרינה והלגונה, מרכז הערב של העיר. פעילה גם בשבת.', durationMin: 90, priceLevel: 1, tags: ['families', 'nightlife'] },
      { id: 'eil-ice-park', name: 'נחל שלמה', nameLocal: 'Nahal Shlomo', q: 'Nahal Shlomo Eilat', category: 'nature', description: 'נחל אכזב בהרי אילת עם מסלולי הליכה ואופני הרים סמוך לעיר. שילוט טוב ומגוון אורכי מסלול.', durationMin: 150, priceLevel: 0, tags: ['outdoors'] },
    ],
    itinerary: [
      { day: 1, title: 'השונית', placeIds: ['eil-coral-beach', 'eil-observatory', 'eil-promenade'], notes: 'שנורקל בבוקר כשהים רגוע. משקפת ונעלי ים - הקרקעית אלמוגית וחדה.' },
      { day: 2, title: 'מדבר', placeIds: ['eil-timna', 'eil-hai-bar'], notes: 'יום ארוך ברכב. יציאה מוקדמת, ומים לכל היום - אין ברז בין האתרים.' },
      { day: 3, title: 'הרי אילת', placeIds: ['eil-red-canyon', 'eil-mount-yoash', 'eil-dolphin-reef'], notes: 'הקניון האדום בבוקר, לפני שהשמש נכנסת לתוך הקניון.' },
    ],
  },
];
