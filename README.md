# NUTZ · Forms

שני טפסים סטטיים, כל אחד קובץ HTML עצמאי אחד (פונטים, CSS ו-JS מוטמעים
בפנים — אפס תלויות חיצוניות, אין שלב build).

## מבנה

```
netlify.toml            הגדרות Netlify (publish = dist)
dist/                   ← זו התיקייה שעולה לאוויר
  index.html            עמוד ריכוז עם קישור לשני הטפסים
  robots.txt            חוסם אינדוקס בגוגל (מחק אם רוצים שיופיעו בחיפוש)
  _headers              כותרות אבטחה (עובד גם בהעלאה ידנית)
  NUTZ/HEALTH/FORM/index.html   ← הצהרת בריאות
  NUTZ/INTAKE/FORM/index.html   ← שאלון קבלת מתאמן
```

## הנתיבים הציבוריים

| טופס | כתובת |
|---|---|
| הצהרת בריאות | `https://<site>.netlify.app/NUTZ/HEALTH/FORM` |
| שאלון קבלת מתאמן | `https://<site>.netlify.app/NUTZ/INTAKE/FORM` |

⚠️ נתיבים ב-Netlify הם **case-sensitive**. הקישורים חייבים להישלח באותיות
גדולות בדיוק כמו למעלה. `/nutz/health/form` יחזיר 404.

## איך מעלים

**דרך 1 — גרירה (הכי מהיר):**
נכנסים ל-[app.netlify.com/drop](https://app.netlify.com/drop) וגוררים
את התיקייה **`dist`** (לא את `FORMS`). זהו.

**דרך 2 — Git:**
מחברים את הריפו ל-Netlify. ה-`netlify.toml` כבר מגדיר `publish = "dist"`
ו-`command = ""`, אז אין מה להגדיר ידנית.

## עדכון טופס

עורכים ישירות את `dist/NUTZ/HEALTH/FORM/index.html` או
`dist/NUTZ/INTAKE/FORM/index.html` ומעלים מחדש. אין קובץ מקור נפרד.

## שליחת הטפסים

בראש הסקריפט בכל טופס יש בלוק `CONFIG`:

```js
const CONFIG = {
  ENDPOINT: "",              // Web App URL של Google Apps Script
  WHATSAPP: "972509007640",
  SOURCE:   "הצהרת בריאות"
};
```

`ENDPOINT` ריק בשני הטפסים — כרגע הגשה **לא** נשמרת בגיליון Google Sheets,
היא רק נפתחת כהודעת WhatsApp לליאב. כדי להפעיל שמירה לגיליון:
מפרסמים את ה-Apps Script כ-Web App ומדביקים את הכתובת ב-`ENDPOINT`
בשני הקבצים.
