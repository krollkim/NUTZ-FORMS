# NUTZ · Forms

שני טפסים סטטיים, כל אחד קובץ HTML עצמאי אחד (פונטים, CSS ו-JS מוטמעים
בפנים — אפס תלויות חיצוניות, אין שלב build).

אתר Netlify: **nutz-forms.netlify.app**

## הלינקים לשליחה

| טופס | כתובת |
|---|---|
| שאלון קבלת מתאמן | `https://nutz-forms.netlify.app/intake/form` |
| הצהרת בריאות | `https://nutz-forms.netlify.app/health/form` |

הנתיבים באותיות קטנות. מי שיכתוב `/INTAKE/FORM` או סתם `/intake`
יופנה אוטומטית לכתובת הנכונה (ראה `dist/_redirects`).

## מבנה

```
netlify.toml            הגדרות Netlify (publish = dist)
dist/                   ← זו התיקייה שעולה לאוויר
  index.html            עמוד ריכוז עם קישור לשני הטפסים
  _redirects            הפניות מנתיבים חלופיים לנתיב הקנוני
  _headers              כותרות אבטחה
  robots.txt            חוסם אינדוקס בגוגל (מחק אם רוצים שיופיעו בחיפוש)
  intake/form/index.html   ← שאלון קבלת מתאמן
  health/form/index.html   ← הצהרת בריאות
```

## איך מעלים

**דרך 1 — גרירה (הכי מהיר):**
נכנסים ל-[app.netlify.com/drop](https://app.netlify.com/drop) וגוררים
את התיקייה **`dist`** (לא את `FORMS`). זהו.

**דרך 2 — Git:**
מחברים את הריפו ל-Netlify. ה-`netlify.toml` כבר מגדיר `publish = "dist"`
ו-`command = ""`, אז אין מה להגדיר ידנית.

## עדכון טופס

עורכים ישירות את `dist/intake/form/index.html` או
`dist/health/form/index.html` ומעלים מחדש. אין קובץ מקור נפרד.

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
