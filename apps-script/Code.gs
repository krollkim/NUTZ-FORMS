/**
 * NUTZ · חיבור טפסים ולידים לגיליון
 * ────────────────────────────────────────────────────────────────────────
 * קובץ אחד שמטפל בשלושה מקורות, כל אחד ללשונית משלו:
 *
 *   דפי הנחיתה        → הלשונית הראשונה (הלידים הקיימים)
 *   גליון הרשמה       → לשונית "גליון הרשמה"
 *   גליון הצהרת בריאות → לשונית "גליון הצהרת בריאות"
 *
 * ── התקנה ────────────────────────────────────────────────────────────
 * 1. בעורך ה-Apps Script: סמן הכל (Ctrl+A), מחק, הדבק את הקובץ הזה.
 * 2. שמור (Ctrl+S).
 * 3. הרץ פעם אחת את nutzSelfTest מהתפריט העליון, ואשר הרשאות.
 * 4. לפריסה → ניהול פריסות → עיפרון → גרסה: New version → פריסה.
 *    חשוב: "New version" ולא פריסה חדשה - ככה כתובת ה-exec לא משתנה
 *    ודפי הנחיתה ממשיכים לעבוד בלי שינוי.
 *
 * ── שתי נקודות שהקוד הזה מתקן מול הגרסה הקודמת ───────────────────────
 * 1. getActiveSheet() הוחלף בהפניה מפורשת ללשונית הראשונה.
 *    getActiveSheet מחזיר את הלשונית ה"פעילה", ויצירת לשונית חדשה
 *    הופכת אותה לפעילה - כלומר לידים היו עלולים להיכתב ללשונית הלא נכונה.
 * 2. לשוניות חדשות נוצרות תמיד בסוף, כדי שלשונית הלידים תישאר ראשונה.
 *
 * ── למה צריך שתי צורות קריאה ─────────────────────────────────────────
 * דפי הנחיתה שולחים JSON גולמי   → נקרא ב-e.postData.contents
 * הטפסים שולחים טופס בתוך iframe → נקרא ב-e.parameter.payload
 * parseBody_ מטפל בשתיהן, כך שאף צד לא צריך להשתנות.
 */

var NUTZ_TABS = {
  intake: 'גליון הרשמה',
  health: 'גליון הצהרת בריאות'
};

/** עמודות גליון ההרשמה, לפי הסדר. המפתח הוא השדה שהטופס שולח. */
var INTAKE_COLUMNS = [
  ['חותמת זמן',        '_timestamp'],
  ['שם מלא',           'name'],
  ['גיל',              'age'],
  ['משקל (ק״ג)',       'weight'],
  ['גובה (ס״מ)',       'height'],
  ['התאמן בעבר',       'trained'],
  ['מטרות',            'goals'],
  ['תדירות',           'freq'],
  ['משך אימון',        'duration'],
  ['פיזיות בעבודה',    'job'],
  ['ציוד זמין',        'gear'],
  ['מתח',              'pullups'],
  ['מקבילים',          'dips'],
  ['שכיבות שמיכה',     'pushups'],
  ['מצב רגליים',       'legs'],
  ['תרגילים מתקדמים',  'advanced'],
  ['מקור',             'source']
];

/**
 * שדות שחייבים להישמר כטקסט ולא כמספר.
 * בלי זה Google Sheets מפרש "000000000" כמספר ומוחק את האפסים המובילים -
 * כלומר ת״ז שמתחילה באפס נשמרת שגויה, ובהצהרת בריאות זה מסמך משפטי פגום.
 */
var TEXT_KEYS = {
  id: true,     // ת״ז - אפסים מובילים
  phone: true,  // טלפון - אותה בעיה
  date: true,   // תאריך חתימה - שלא יומר לפורמט תאריך אחר
  sign: true    // החתימה מכילה מספר ת״ז
};

/** עמודות גליון הצהרת הבריאות. תשע התשובות מגיעות כמערך אינדקסים. */
var HEALTH_COLUMNS = [
  ['חותמת זמן',               '_timestamp'],
  ['שם מלא',                  'name'],
  ['ת״ז',                     'id'],
  ['טלפון',                   'phone'],
  ['תאריך חתימה',             'date'],
  ['תשובות "כן"',             '_flags'],
  ['1. בעיית לב / פיקוח',     'a0'],
  ['2. כאב בחזה במאמץ',       'a1'],
  ['3. כאב בחזה במנוחה',      'a2'],
  ['4. סחרחורת / אובדן הכרה', 'a3'],
  ['5. עצמות או מפרקים',      'a4'],
  ['6. תרופות לחץ דם / לב',   'a5'],
  ['7. הריון / לידה',         'a6'],
  ['8. מחלה כרונית',          'a7'],
  ['9. סיבה אחרת',            'a8'],
  ['חתימה דיגיטלית',          'sign'],
  ['מקור',                    'source']
];


/* ══════════════════════════════════════════════════════════════════════
   נקודת הכניסה
   ══════════════════════════════════════════════════════════════════════ */

function doPost(e) {
  var data = null;
  try {
    data = parseBody_(e);
  } catch (err) {
    data = null;
  }

  if (!data) {
    return jsonOut_({ status: 'error', error: 'no readable body' });
  }

  try {
    // שני הטפסים מזוהים לפי שדה form ששולח הטופס עצמו.
    if (NUTZ_TABS[data.form]) {
      return handleForm_(data);
    }
    // כל השאר - לידים מדפי הנחיתה, בדיוק כמו קודם.
    return handleLanding_(data);
  } catch (err) {
    logError_(data.form || 'דף נחיתה', err);
    return jsonOut_({ status: 'error', error: String(err) });
  }
}

/** קורא את גוף הבקשה בשתי הצורות שבשימוש. מחזיר null אם אין JSON תקין. */
function parseBody_(e) {
  if (!e) return null;

  // הטפסים: POST של טופס בתוך iframe, השדה נקרא payload.
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  // דפי הנחיתה: JSON גולמי בגוף הבקשה.
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  return null;
}


/* ══════════════════════════════════════════════════════════════════════
   לידים מדפי הנחיתה - התנהגות זהה לקוד הקודם
   ══════════════════════════════════════════════════════════════════════ */

/**
 * מספר העמודה של הטלפון בלשונית הלידים (A=1, B=2, C=3).
 * עד לתיקון הזה היא נכתבה כמספר, ולכן כל טלפון שמתחיל באפס
 * נשמר חסר ספרה: 0525088443 הפך ל-525088443.
 */
var LANDING_PHONE_COLUMN = 3;

/**
 * סדר העמודות כאן חייב להישאר זהה לעמודות שכבר קיימות בלשונית,
 * אחרת שורות חדשות ייכתבו לא מיושרות מול ההיסטוריה.
 */
function handleLanding_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var sheet = landingSheet_();
    var row = sheet.getLastRow() + 1;

    // setValues קורס על undefined, בניגוד ל-appendRow שסלחני יותר.
    // ארבעת דפי הנחיתה לא כולם שולחים את כל השדות, ולכן ממירים לריק.
    var values = [
      data.timestamp,
      data.name,
      data.phone,
      data.track,
      data.experience,
      data.message
    ].map(function (value) {
      return (value === undefined || value === null) ? '' : value;
    });

    // סימון התא כטקסט לפני הכתיבה - אחרת האפס המוביל נמחק.
    sheet.getRange(row, LANDING_PHONE_COLUMN).setNumberFormat('@');
    sheet.getRange(row, 1, 1, values.length).setValues([values]);

    return jsonOut_({ status: 'ok' });
  } finally {
    lock.releaseLock();
  }
}

/**
 * הלשונית הראשונה בקובץ - זו שאליה נכנסים הלידים מאז ומתמיד.
 * הפניה לפי מיקום ולא לפי getActiveSheet(), כדי שיצירת לשוניות
 * חדשות לא תשנה לאן הלידים נכתבים.
 */
function landingSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}


/* ══════════════════════════════════════════════════════════════════════
   שני הטפסים
   ══════════════════════════════════════════════════════════════════════ */

function handleForm_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // שתי הגשות באותה שנייה לא ידרסו זו את זו

  try {
    var columns = data.form === 'health' ? HEALTH_COLUMNS : INTAKE_COLUMNS;
    var sheet = getOrCreateTab_(NUTZ_TABS[data.form], columns);

    appendRow_(sheet, columns, buildRow_(sheet, columns, flatten_(data)));
  } finally {
    lock.releaseLock();
  }

  // המסמך נשמר אחרי שהשורה כבר בגיליון, מחוץ לנעילה ובתוך try משלו.
  // השורה היא הרשומה הקריטית; תקלה ב-Drive לא תפיל אותה ולא תגרום
  // למתאמן למלא שוב. כישלון נרשם ללשונית השגיאות.
  var fileUrl = '';
  if (data.form === 'health' && data.docHtml) {
    try {
      fileUrl = saveDeclarationPdf_(data);
    } catch (err) {
      logError_('שמירת מסמך ל-Drive', err);
    }
  }

  return jsonOut_({ status: 'ok', tab: NUTZ_TABS[data.form], file: fileUrl });
}

/**
 * שם התיקייה ב-Drive שאליה נשמרות ההצהרות.
 * נוצרת ב-Drive של *בעל הסקריפט* ופרטית כברירת מחדל. היא מכילה
 * תעודות זהות ומידע רפואי - לא לשתף בהרחבה.
 */
var DECLARATION_FOLDER = 'NUTZ · הצהרות בריאות';

/**
 * ממיר את ה-HTML שהטופס שלח למסמך PDF ושומר אותו ב-Drive.
 * ה-HTML נלכד בדפדפן מאותו אלמנט שהמתאמן רואה ומוריד, כך שאין
 * שתי גרסאות עיצוב שעלולות להתפצל.
 */
function saveDeclarationPdf_(data) {
  var name = String(data.name || 'ללא שם').replace(/[\\\/:*?"<>|]/g, '-').trim();

  // השם ראשון כדי ש-Drive יקבץ יחד את כל המסמכים של אותו מתאמן.
  // התאריך אינו לתיעוד - הוא קיים גם בתוך המסמך - אלא כדי להבדיל
  // בין הצהרות חוזרות של אותו אדם, שאחרת היו נושאות שם זהה.
  var fileName = name + ' · הצהרת בריאות · ' + isoDate_(data.date) + '.pdf';

  var pdf = Utilities
    .newBlob(data.docHtml, 'text/html', fileName)
    .getAs('application/pdf')
    .setName(fileName);

  return declarationFolder_().createFile(pdf).getUrl();
}

/**
 * תיקיית האב שבתוכה תיווצר תיקיית ההצהרות.
 *
 * השאר ריק כדי שהיא תיווצר *לצד קובץ הגיליון* - כך היא הולכת
 * לאן שהגיליון מסודר, ולא נוחתת בשורש ה-Drive כקובץ יתום.
 *
 * למיקום אחר: פתח את התיקייה הרצויה ב-Drive והעתק מהכתובת את
 * מה שאחרי folders/ ‒
 *   drive.google.com/drive/folders/1AbC...XyZ   ←   זה המזהה
 */
var DECLARATION_PARENT_ID = '';

/**
 * מחזיר את תיקיית ההצהרות, ויוצר אותה בהרצה הראשונה.
 *
 * החיפוש הוא לפי שם ובכל ה-Drive, ולכן אפשר לגרור את התיקייה
 * לכל מקום בלי לשבור כלום - היא תימצא גם אחרי שהוזזה. המיקום
 * שלמטה קובע רק היכן היא *נוצרת* בפעם הראשונה.
 */
function declarationFolder_() {
  var existing = DriveApp.getFoldersByName(DECLARATION_FOLDER);
  if (existing.hasNext()) return existing.next();

  return declarationParent_().createFolder(DECLARATION_FOLDER);
}

/**
 * תיקיית האב ליצירה: המזהה שהוגדר ידנית, ואם אין - התיקייה שבה
 * יושב הגיליון. נפילה לשורש קורית רק אם הגיליון עצמו בשורש.
 */
function declarationParent_() {
  if (DECLARATION_PARENT_ID) {
    return DriveApp.getFolderById(DECLARATION_PARENT_ID);
  }

  var parents = DriveApp
    .getFileById(SpreadsheetApp.getActiveSpreadsheet().getId())
    .getParents();

  return parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
}

/**
 * משטח את המבנה שהטופס שולח לשדות פשוטים:
 * answers[0..8] → a0..a8, ומוסיף חותמת זמן ומונה תשובות "כן".
 */
function flatten_(data) {
  var flat = {};
  for (var key in data) {
    if (key !== 'answers') flat[key] = data[key];
  }

  flat._timestamp = israeliTimestamp_();

  if (data.answers) {
    var yes = 0;
    for (var i = 0; i < 9; i++) {
      var answer = data.answers[i] || data.answers[String(i)] || '';
      flat['a' + i] = answer;
      if (answer === 'כן') yes++;
    }
    flat._flags = yes;
  }

  return flat;
}

/**
 * בונה את השורה לפי שורת הכותרות שבגיליון בפועל, ולא לפי הסדר בקוד.
 * כך אפשר לגרור עמודות בגיליון בלי שהנתונים ייכתבו למקום הלא נכון.
 */
function buildRow_(sheet, columns, flat) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var keyByHeader = {};
  for (var i = 0; i < columns.length; i++) {
    keyByHeader[columns[i][0]] = columns[i][1];
  }

  return headers.map(function (header) {
    var key = keyByHeader[header];
    if (!key) return '';                 // עמודה שהוספת ידנית - לא נוגעים בה
    var value = flat[key];
    return (value === undefined || value === null) ? '' : value;
  });
}

/**
 * מחזיר את הלשונית, ויוצר אותה עם כותרות מעוצבות בהרצה הראשונה.
 * הלשונית נוצרת תמיד בסוף, כדי שלשונית הלידים תישאר הראשונה.
 */
function getOrCreateTab_(name, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (sheet) return sheet;

  sheet = ss.insertSheet(name, ss.getNumSheets());
  sheet.setRightToLeft(true);

  var headers = columns.map(function (column) { return column[0]; });
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold').setBackground('#1a130d').setFontColor('#efd9a8');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);

  applyTextFormats_(sheet, columns);

  return sheet;
}

/**
 * מוצא את מספרי העמודות שצריכות להישמר כטקסט, לפי שורת הכותרות
 * שבגיליון בפועל. חיפוש לפי שם ולא לפי מיקום בקוד, כדי שגרירת
 * עמודה בגיליון לא תגרום לסימון העמודה הלא נכונה.
 */
function textColumnIndexes_(sheet, columns) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var keyByHeader = {};
  for (var i = 0; i < columns.length; i++) {
    keyByHeader[columns[i][0]] = columns[i][1];
  }

  var indexes = [];
  for (var j = 0; j < headers.length; j++) {
    if (TEXT_KEYS[keyByHeader[headers[j]]]) indexes.push(j + 1);
  }
  return indexes;
}

/**
 * מסמן כטקסט את העמודות שאסור ל-Sheets להמיר למספר.
 * חייב לרוץ לפני שנכתבות שורות - המרה שכבר קרתה לא ניתנת לשחזור,
 * כי האפסים המובילים פשוט אינם שם יותר.
 */
function applyTextFormats_(sheet, columns) {
  var indexes = textColumnIndexes_(sheet, columns);
  var rows = Math.max(sheet.getMaxRows() - 1, 1);

  for (var i = 0; i < indexes.length; i++) {
    sheet.getRange(2, indexes[i], rows, 1).setNumberFormat('@');
  }
}

/**
 * כותב שורה אחת, ומסמן את תאי הטקסט שלה כטקסט *לפני* הכתיבה.
 *
 * appendRow לא מכבד באופן עקבי פורמט שהוגדר מראש על הטווח, ועלול
 * להמיר "012345678" למספר תוך כדי הכתיבה. סימון התא הספציפי רגע
 * לפני setValues מבטיח שהערך נשמר כפי שנשלח.
 */
function appendRow_(sheet, columns, values) {
  var row = sheet.getLastRow() + 1;
  var indexes = textColumnIndexes_(sheet, columns);

  for (var i = 0; i < indexes.length; i++) {
    sheet.getRange(row, indexes[i]).setNumberFormat('@');
  }

  sheet.getRange(row, 1, 1, values.length).setValues([values]);
}


/* ══════════════════════════════════════════════════════════════════════
   עזר
   ══════════════════════════════════════════════════════════════════════ */

/**
 * ממיר 19.09.2026 ל-2026-09-19, לשימוש בשמות קבצים.
 *
 * הסדר ההפוך הוא מה שגורם לכמה הצהרות של אותו מתאמן להסתדר
 * כרונולוגית ברשימת הקבצים. בפורמט הישראלי 01.02.2027 היה
 * מופיע לפני 19.09.2026, כי המיון הוא אלפביתי ולא לפי תאריך.
 *
 * ערך שאינו בפורמט הצפוי מוחלף בתאריך של היום, כדי שלעולם לא
 * ייווצר שם קובץ עם תו אסור או בלי תאריך בכלל.
 */
function isoDate_(raw) {
  var parts = String(raw || '').trim().match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (parts) {
    return parts[3] + '-' + pad2_(parts[2]) + '-' + pad2_(parts[1]);
  }
  return Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
}

function pad2_(value) {
  return String(value).length === 1 ? '0' + value : String(value);
}

/** חותמת זמן ישראלית. נוצרת בשרת, כדי שלא תהיה תלויה באזור הזמן של הדפדפן. */
function israeliTimestamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm');
}

/** כישלון כתיבה לא נאבד בשקט - נרשם ללשונית שגיאות לבדיקה. */
function logError_(source, err) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('שגיאות');
    if (!sheet) {
      sheet = ss.insertSheet('שגיאות', ss.getNumSheets());
      sheet.appendRow(['מתי', 'מקור', 'שגיאה']);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([israeliTimestamp_(), source, String(err)]);
  } catch (ignored) {
    // אם גם הרישום נכשל, אין מה לעשות - לא מפילים את הבקשה בגלל זה
  }
}

function jsonOut_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ══════════════════════════════════════════════════════════════════════
   בדיקה
   ══════════════════════════════════════════════════════════════════════ */

/**
 * הרץ אותי פעם אחת על לשוניות שכבר נוצרו, כדי לסמן את עמודות
 * הטקסט בדיעבד. getOrCreateTab_ מדלג על לשונית קיימת, ולכן לשוניות
 * שנוצרו לפני התיקון לא קיבלו את הפורמט.
 *
 * שים לב: זה מתקן את הפורמט להמשך, אבל לא משחזר ערכים שכבר נפגעו.
 * ת״ז שנשמרה כ-0 תישאר 0 - צריך למחוק את השורה ולמלא מחדש.
 */
function nutzApplyTextFormats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var done = [];

  var pairs = [
    [NUTZ_TABS.intake, INTAKE_COLUMNS],
    [NUTZ_TABS.health, HEALTH_COLUMNS]
  ];

  for (var i = 0; i < pairs.length; i++) {
    var sheet = ss.getSheetByName(pairs[i][0]);
    if (!sheet) continue;
    applyTextFormats_(sheet, pairs[i][1]);
    done.push(pairs[i][0]);
  }

  Logger.log('פורמט טקסט הוחל על: ' + (done.join(', ') || 'אף לשונית'));
}

/**
 * הרץ אותי פעם אחת כדי לתקן טלפונים בלשונית הלידים שאיבדו את
 * האפס המוביל, ולסמן את העמודה כטקסט כדי שזה לא יקרה שוב.
 *
 * הכלל שמרני בכוונה: מתוקן רק מה שחד-משמעי - בדיוק תשע ספרות
 * שמתחילות ב-5, כלומר נייד ישראלי שאיבד את האפס. כל השאר נשאר
 * כפי שהוא:
 *   972505592919  קידומת בינלאומית - לא ברור מה היה במקור
 *   18329519000   אורך חריג - לא מנחשים
 *
 * כל שינוי נרשם ליומן הביצוע, כדי שיהיה תיעוד למה שנגענו בו.
 */
function nutzRepairLandingPhones() {
  var sheet = landingSheet_();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    Logger.log('לשונית "' + sheet.getName() + '" ריקה - אין מה לתקן.');
    return;
  }

  var values = sheet.getRange(2, LANDING_PHONE_COLUMN, lastRow - 1, 1).getValues();
  var fixed = [];
  var skipped = [];

  for (var i = 0; i < values.length; i++) {
    var raw = String(values[i][0]).trim();
    if (raw === '') continue;

    if (!/^5\d{8}$/.test(raw)) {
      if (!/^0/.test(raw)) skipped.push('שורה ' + (i + 2) + ': ' + raw);
      continue;
    }

    var cell = sheet.getRange(i + 2, LANDING_PHONE_COLUMN);
    cell.setNumberFormat('@');
    cell.setValue('0' + raw);
    fixed.push('שורה ' + (i + 2) + ': ' + raw + ' ← 0' + raw);
  }

  // סימון כל העמודה כטקסט - מונע הישנות בכתיבות ידניות או עתידיות
  sheet.getRange(2, LANDING_PHONE_COLUMN, Math.max(sheet.getMaxRows() - 1, 1), 1)
    .setNumberFormat('@');

  Logger.log(
    'לשונית: ' + sheet.getName() + '\n' +
    'תוקנו ' + fixed.length + ':\n' + (fixed.join('\n') || '  (אין)') + '\n\n' +
    'נותרו ללא שינוי (בדוק ידנית) ' + skipped.length + ':\n' + (skipped.join('\n') || '  (אין)')
  );
}

/**
 * הרץ אותי פעם אחת מהעורך כדי לוודא שהכל מחובר.
 * כותב שורת בדיקה לכל אחת משתי הלשוניות החדשות - מחק אותן אחר כך.
 * שים לב: לא נכתבת שורת בדיקה ללשונית הלידים, כדי לא ללכלך אותה.
 */
function nutzSelfTest() {
  handleForm_({
    form: 'intake',
    name: 'בדיקה - מחק אותי',
    age: '30', weight: '75', height: '175',
    trained: 'כן', goals: 'בדיקת חיבור',
    source: 'בדיקה'
  });

  handleForm_({
    form: 'health',
    name: 'בדיקה - מחק אותי',
    // ת״ז וטלפון שמתחילים באפס - הערך הזה נבחר בכוונה.
    // אם בגיליון יופיע 12345678 במקום 012345678, פורמט הטקסט לא הוחל.
    id: '012345678', phone: '0501234567', date: '01.01.2026',
    answers: ['לא', 'לא', 'לא', 'לא', 'כן', 'לא', 'לא', 'לא', 'לא'],
    sign: 'בדיקה 000000000',
    source: 'בדיקה',
    // בלי השדה הזה ענף ה-PDF מדולג, ואז הבדיקה לא נוגעת ב-Drive:
    // לא נוצר קובץ, ולא נדרשת הרשאה. זו הייתה נקודה עיוורת בבדיקה.
    docHtml: selfTestDocHtml_()
  });

  // בייצור, כשל בשמירת המסמך נבלע בכוונה ונרשם ללשונית "שגיאות",
  // כדי שלא יפיל את ההגשה. בבדיקה זה בדיוק ההפך ממה שרוצים:
  // הקריאה כאן ישירה ובלי רשת ביטחון, כדי שהתוצאה - הצלחה או
  // שגיאה מלאה - תופיע כאן ביומן ולא תדרוש חיפוש במקום אחר.
  var verdict;
  try {
    var url = saveDeclarationPdf_({
      form: 'health',
      name: 'בדיקה - מחק אותי',
      date: '01.01.2026',
      docHtml: selfTestDocHtml_()
    });
    verdict = '✅ המסמך נוצר.\n' +
      'קישור: ' + url + '\n' +
      'פתח אותו ובדוק שהעברית קריאה ושת״ז מופיעה כ-012345678.';
  } catch (err) {
    verdict = '❌ יצירת המסמך נכשלה:\n' + String(err) + '\n' +
      'השורות בגיליון נכתבו בכל זאת - זו ההפרדה שתוכננה.';
  }

  Logger.log('נכתבו שתי שורות בדיקה בלשוניות.\n\n' + verdict +
    '\n\nמחק אחר כך את שורות הבדיקה ואת הקובץ.');
}

/**
 * מסמך מוקטן לבדיקת ההמרה של Apps Script מ-HTML ל-PDF.
 *
 * המסמך האמיתי נלכד בדפדפן ונשלח בשדה docHtml. כאן, כשמריצים
 * מהעורך, אין דפדפן - ולכן נבנה מסמך מינימלי שבודק בדיוק את מה
 * שעלול להישבר בהמרה: עברית, כיווניות RTL, ואפס מוביל בת״ז.
 */
function selfTestDocHtml_() {
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">' +
    '<style>@page{size:A4;margin:13mm 12mm}' +
    'body{margin:0;font-family:Arial,sans-serif;direction:rtl}' +
    'h1{font-size:16pt}td{padding:4px 10px;border-bottom:1px solid #ddd}</style>' +
    '</head><body>' +
    '<h1>בדיקת המרה - גליון הצהרת בריאות</h1>' +
    '<p>אם העברית כאן קריאה והספרות למטה נכונות, ההמרה עובדת.</p>' +
    '<table><tr><td>שם מלא</td><td>בדיקה - מחק אותי</td></tr>' +
    '<tr><td>ת״ז</td><td>012345678</td></tr>' +
    '<tr><td>טלפון</td><td>0501234567</td></tr></table>' +
    '<p>ת״ז אמורה להופיע עם האפס המוביל: <b>012345678</b></p>' +
    '</body></html>';
}
