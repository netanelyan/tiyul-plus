/**
 * Builds the transactional email templates into `emails/*.html`.
 *
 *   node scripts/build-emails.mjs
 *
 * Why a generator rather than thirteen HTML files: every email shares one
 * shell (brand header, card, footer). Written by hand thirteen times the
 * shells drift apart - the same failure the trip-screen panel headers had
 * before `PanelSection`. The shell lives once, here; the bodies are the only
 * thing that differs per email.
 *
 * Two placeholder conventions, on purpose:
 *   - Supabase Auth templates keep Go-template syntax: {{ .Token }},
 *     {{ .ConfirmationURL }}. Supabase fills them; we paste the HTML in.
 *   - App templates (sent by a future `lib/server/mail.ts` through the Resend
 *     REST API) use UPPERCASE tokens: {{TRIP_NAME}}, {{AMOUNT}}. The sender
 *     fills them and MUST HTML-escape every value - trip names and enquiry
 *     messages are user-typed.
 *
 * Email-client constraints baked into the shell: tables not flex, inline
 * styles, Arial (Heebo will not load in mail clients), a hosted PNG logo
 * (Gmail strips SVG), `dir="rtl"` on every text cell, and an RLM (&#8207;)
 * after every "+" in the brand name so it does not jump to the wrong end of
 * the line - the bidi bug the original OTP subject line shipped with.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'emails');

const SITE = 'https://www.tiyulplus.com';
const BRAND = 'טיול+&#8207;';
const FONT = "font-family:Arial,Helvetica,sans-serif;";

// Brand tokens, copied from globals.css. Mail clients cannot read CSS
// variables, so the values are literal here and this comment says where
// they come from.
const C = {
  cream: '#fdf6ec',
  shell: '#fffdf8',
  night: '#241b4d',
  muted: '#5b5480',
  faint: '#8a83a8',
  hairline: '#f0e6d6',
  sunset: '#ff5941',
  zest: '#ffc531',
  lagoon: '#00a896',
};

/* ---------- shell pieces ---------- */

const heading = (text) =>
  `<tr><td align="right" dir="rtl" style="${FONT}font-size:26px;font-weight:bold;color:${C.night};line-height:1.25;padding:0 0 8px;">${text}</td></tr>`;

const para = (text, opts = {}) =>
  `<tr><td align="right" dir="rtl" style="${FONT}font-size:${opts.size ?? 15}px;color:${opts.color ?? C.muted};line-height:1.65;padding:0 0 ${opts.pad ?? 16}px;">${text}</td></tr>`;

const button = (href, label, opts = {}) => `
<tr><td align="center" style="padding:6px 0 ${opts.pad ?? 24}px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" style="background:${C.sunset};border-radius:999px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;${FONT}font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
    </td>
  </tr></table>
</td></tr>`;

/** A key/value block - order number, amount, date. Label on the right, value on the left. */
const facts = (rows) => `
<tr><td style="padding:0 0 22px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};border-radius:14px;border:1px solid ${C.hairline};">
    ${rows
      .map(
        ([k, v], i) => `
    <tr>
      <td align="right" dir="rtl" style="${FONT}font-size:14px;color:${C.faint};padding:${i === 0 ? 14 : 8}px 16px ${i === rows.length - 1 ? 14 : 0}px;">${k}</td>
      <td align="left" dir="rtl" style="${FONT}font-size:15px;font-weight:bold;color:${C.night};padding:${i === 0 ? 14 : 8}px 16px ${i === rows.length - 1 ? 14 : 0}px;">${v}</td>
    </tr>`,
      )
      .join('')}
  </table>
</td></tr>`;

/** Three tiles side by side - emoji, title, one line. The "what you get" row. */
const features = (items) => `
<tr><td style="padding:0 0 22px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    ${items
      .map(
        ([emoji, title, text]) => `
    <td width="33%" valign="top" align="center" style="padding:4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};border-radius:14px;border:1px solid ${C.hairline};"><tr>
        <td align="center" style="padding:14px 8px;">
          <div style="font-size:26px;line-height:1;padding:0 0 8px;">${emoji}</div>
          <div style="${FONT}font-size:13px;font-weight:bold;color:${C.night};line-height:1.3;padding:0 0 4px;">${title}</div>
          <div style="${FONT}font-size:12px;color:${C.faint};line-height:1.4;">${text}</div>
        </td>
      </tr></table>
    </td>`,
      )
      .join('')}
  </tr></table>
</td></tr>`;

/** The one-line note under a hairline at the bottom of the card. */
const footnote = (text) =>
  `<tr><td align="right" dir="rtl" style="${FONT}font-size:13px;color:${C.faint};line-height:1.55;border-top:1px solid ${C.hairline};padding:18px 0 0;">${text}</td></tr>`;

/**
 * The login code: a night-coloured box with the digits in zest - the one place
 * the rare highlight colour earns its keep. Forced LTR so digits cannot
 * reorder in an RTL cell.
 */
const codeBox = (token) => `
<tr><td align="center" style="padding:4px 0 10px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td align="center" dir="ltr" style="background:${C.night};border-radius:16px;padding:26px 16px;font-family:'Courier New',Courier,monospace;font-size:42px;font-weight:bold;letter-spacing:12px;color:${C.zest};">${token}</td>
  </tr></table>
</td></tr>
<tr><td align="center" style="${FONT}font-size:13px;color:${C.faint};padding:0 0 22px;">
  <span style="display:inline-block;background:${C.cream};border:1px solid ${C.hairline};border-radius:999px;padding:5px 12px;">&#9201;&#65039; תקף ל-60 דקות · לכניסה אחת</span>
</td></tr>`;

/**
 * Optional photo strip between the header and the card. Only for emails about
 * a specific trip, where the sender fills PHOTO_URL from the trip's own city -
 * a verified catalog photo, never a stock image.
 */
const hero = (src, alt) =>
  `<!--hero--><tr><td style="padding:0;line-height:0;"><img src="${src}" width="480" alt="${alt}" style="display:block;width:100%;max-width:480px;height:200px;object-fit:cover;border:0;"></td></tr><!--/hero-->`;

function shell({ title, preheader, eyebrow, heroPhoto, body, footerExtra = '' }) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};" dir="rtl">
  <!-- Preheader: the preview line Gmail shows under the subject. Hidden in the body. -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${C.cream};">${preheader}${'&#8203;&nbsp;'.repeat(12)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;border-radius:22px;overflow:hidden;background:${C.shell};box-shadow:0 8px 30px rgba(36,27,77,0.10);">

        <!-- Brand header: the site's night band -->
        <tr><td style="background:${C.night};padding:28px 28px 24px;" dir="rtl">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="right" valign="middle">
              <a href="${SITE}" style="text-decoration:none;">
                <span style="${FONT}font-size:26px;font-weight:bold;color:${C.cream};line-height:1;">${BRAND}</span><br>
                <span style="${FONT}font-size:12px;color:#b9b2d9;line-height:1.6;">סוכן הנסיעות החכם לישראלים</span>
              </a>
            </td>
            <td align="left" valign="middle" width="56">
              <img src="${SITE}/icon-192.png" width="52" height="52" alt="" style="display:block;border:0;border-radius:14px;">
            </td>
          </tr></table>
          ${
            eyebrow
              ? `<div style="padding:18px 0 0;"><span style="display:inline-block;background:${C.sunset};color:#ffffff;${FONT}font-size:12px;font-weight:bold;border-radius:999px;padding:5px 12px;">${eyebrow}</span></div>`
              : ''
          }
        </td></tr>
        <tr><td style="background:${C.sunset};height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
        ${heroPhoto ? hero(heroPhoto.src, heroPhoto.alt) : ''}

        <!-- Body -->
        <tr><td style="background:${C.shell};padding:32px 28px 26px;" dir="rtl">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${body}
          </table>
        </td></tr>

      </table>

      <!-- Footer, outside the card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr><td align="center" style="${FONT}font-size:12px;color:${C.faint};line-height:1.8;padding:22px 8px 0;">
          <a href="${SITE}" style="color:${C.faint};text-decoration:underline;">tiyulplus.com</a>
          &nbsp;·&nbsp;
          <a href="${SITE}/privacy" style="color:${C.faint};text-decoration:underline;">פרטיות</a>
          &nbsp;·&nbsp;
          <a href="${SITE}/contact" style="color:${C.faint};text-decoration:underline;">צרו קשר</a>
          ${footerExtra}<br>
          <span style="color:#b3adcc;">נשלח על ידי טיול+&#8207; · יש שאלה? ענו למייל הזה ואדם יקרא.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;
}

/* ---------- the templates ---------- */

const TEMPLATES = [
  // ----- Supabase Auth (paste into the dashboard) -----
  {
    file: 'auth-magic-link.html',
    subject: 'קוד ההתחברות: {{ .Token }}',
    title: 'קוד ההתחברות: {{ .Token }}',
    preheader: 'הקוד תקף ל-60 דקות. לא ביקשתם? אפשר להתעלם.',
    eyebrow: 'קוד התחברות',
    body:
      heading('הנה הקוד שלכם') +
      para('הקלידו אותו במסך ההתחברות ותיכנסו ישר לטיולים שלכם.', { pad: 20 }) +
      codeBox('{{ .Token }}') +
      para(`<span style="color:${C.faint};">לא ליד המסך שממנו ביקשתם?</span> אפשר להיכנס גם מכאן, בלי להקליד:`, { size: 14, pad: 4 }) +
      button('{{ .ConfirmationURL }}', 'כניסה בלחיצה אחת') +
      footnote(
        `<strong style="color:${C.night};">לא ביקשתם להתחבר?</strong> אפשר להתעלם מהמייל הזה - בלי הקוד אף אחד לא נכנס לחשבון. ` +
          'טיול+&#8207; לעולם לא יבקש מכם את הקוד בטלפון או בהודעה.',
      ),
  },

  // ----- App transactional (sent by lib/server/mail.ts, not built yet) -----
  {
    file: 'welcome.html',
    subject: 'ברוכים הבאים לטיול+‏',
    title: 'ברוכים הבאים לטיול+',
    preheader: 'ספרו לסוכן לאן, מתי ועם מי - והטיול נבנה על המפה.',
    eyebrow: 'ברוכים הבאים',
    body:
      heading('החשבון שלכם מוכן') +
      para('מעכשיו הטיולים שלכם נשמרים ונפתחים מכל מכשיר - ועובדים גם בלי אינטרנט בחו״ל.', { pad: 20 }) +
      features([
        ['💬', 'מספרים', 'לאן, מתי, עם מי - במשפט אחד'],
        ['🗺️', 'רואים', 'טיול אמיתי על המפה, יום אחרי יום'],
        ['✏️', 'משנים', 'בשיחה, בלי טפסים'],
      ]) +
      button(`${SITE}/chat`, 'לתכנן טיול') +
      para(
        `יש גם <a href="${SITE}/countries" style="color:${C.sunset};">קטלוג יעדים</a> לדפדוף, ו<a href="${SITE}/kosher" style="color:${C.sunset};">שכבת כשרות</a> למי שצריך - כברירת מחדל היא כבויה, ומדליקים אותה רק אם רוצים.`,
        { size: 14 },
      ) +
      footnote('קיבלתם את המייל הזה כי נפתח חשבון בטיול+ עם הכתובת הזו.'),
  },

  {
    file: 'check-receipt.html',
    subject: 'קבלה: בדיקה לפני הנסיעה ל{{TRIP_NAME}}',
    title: 'קבלה - בדיקה לפני הנסיעה',
    preheader: 'התשלום התקבל והדוח מחכה במסך הטיול.',
    eyebrow: 'קבלה',
    heroPhoto: { src: '{{PHOTO_URL}}', alt: '{{TRIP_NAME}}' },
    body:
      heading('התשלום התקבל, תודה') +
      para('הבדיקה לפני הנסיעה ל<strong>{{TRIP_NAME}}</strong> הושלמה, והדוח מחכה לכם במסך הטיול - הוא גם מודפס יחד עם הטיול.') +
      facts([
        ['מספר הזמנה', '{{ORDER_ID}}'],
        ['סכום', '{{AMOUNT}}'],
        ['תאריך', '{{DATE}}'],
        ['אמצעי תשלום', 'PayPal'],
      ]) +
      button('{{TRIP_URL}}', 'לפתוח את הדוח') +
      footnote(
        `זו קבלה על תשלום חד-פעמי; לא נפתח מנוי ולא יתבצע חיוב נוסף. שאלה על החיוב? <a href="${SITE}/refunds" style="color:${C.faint};">מדיניות ההחזרים</a> או פשוט השיבו למייל הזה.`,
      ),
  },

  {
    file: 'subscription-activated.html',
    subject: 'המנוי שלכם פעיל - {{PLAN_NAME}}',
    title: 'המנוי פעיל',
    preheader: 'תודה שהצטרפתם. הנה מה שנפתח לכם עכשיו.',
    eyebrow: 'המנוי פעיל',
    body:
      heading('ברוכים הבאים ל{{PLAN_NAME}}') +
      para('הכול כבר פתוח בחשבון - אין מה להפעיל. זה מה שיש לכם מעכשיו:', { pad: 20 }) +
      features([
        ['🤝', 'טיול משותף', 'חברים מצביעים ומציעים - בחינם'],
        ['🛫', 'בדיקה לפני הנסיעה', 'כלולה לכל טיול'],
        ['⚡', 'מסלול אישי לסוכן', 'לא נחסם כשהאתר עמוס'],
      ]) +
      facts([
        ['תוכנית', '{{PLAN_NAME}}'],
        ['מחיר', '{{PRICE}} לחודש'],
        ['החיוב הבא', '{{NEXT_BILLING_DATE}}'],
      ]) +
      button(`${SITE}/chat`, 'לטיול שלי') +
      footnote(
        `ביטול בלחיצה אחת, בלי התחייבות, מ<a href="${SITE}/account" style="color:${C.faint};">האזור האישי</a>. מה שבניתם נשאר שלכם גם אחרי ביטול.`,
      ),
  },

  {
    file: 'subscription-ended.html',
    subject: 'המנוי שלכם הסתיים',
    title: 'המנוי הסתיים',
    preheader: 'הטיולים שלכם נשארים. הנה מה שהשתנה.',
    eyebrow: 'המנוי הסתיים',
    body:
      heading('המנוי שלכם הסתיים') +
      para('המנוי <strong>{{PLAN_NAME}}</strong> הסתיים ב-{{END_DATE}}, ולא יתבצעו חיובים נוספים.') +
      para('<strong>כל הטיולים שלכם נשארים</strong> - שמורים בחשבון, פתוחים לעריכה ולשיתוף כמו קודם. מה שנסגר: יצירת קישור לטיול משותף חדש, והבדיקה לפני הנסיעה חוזרת להיות בתשלום לכל טיול.') +
      button(`${SITE}/premium`, 'לחדש את המנוי') +
      footnote('ביטלתם בטעות, או שמשהו לא עבד? השיבו למייל הזה ונסדר את זה.'),
  },

  {
    file: 'payment-failed.html',
    subject: 'החיוב על המנוי לא עבר',
    title: 'החיוב לא עבר',
    preheader: 'המנוי עדיין פעיל. כדאי לעדכן את אמצעי התשלום ב-PayPal.',
    eyebrow: 'דורש תשומת לב',
    body:
      heading('החיוב החודשי לא עבר') +
      para('PayPal לא הצליח לחייב את המנוי <strong>{{PLAN_NAME}}</strong>. זה קורה בדרך כלל כשכרטיס פג תוקף או הוחלף.') +
      para('<strong>המנוי עדיין פעיל.</strong> PayPal ינסה לחייב שוב {{RETRY_DATE}}; אם גם הניסיון הזה ייכשל, המנוי ייסגר והטיולים שלכם יישארו שמורים בחשבון.') +
      button('https://www.paypal.com/myaccount/autopay/', 'לעדכן אמצעי תשלום ב-PayPal') +
      footnote('כבר עדכנתם? אין צורך לעשות כלום - החיוב הבא יעבור לבד.'),
  },

  {
    file: 'agent-enquiry-ack.html',
    subject: 'קיבלנו את הפנייה שלכם',
    title: 'קיבלנו את הפנייה',
    preheader: 'נחזור אליכם תוך יום עסקים.',
    eyebrow: 'לסוכני נסיעות',
    body:
      heading('קיבלנו את הפנייה, {{NAME}}') +
      para('תודה שפניתם בעניין <strong>{{BUSINESS}}</strong>. נחזור אליכם <strong>תוך יום עסקים</strong> עם הצעה שמתאימה לנפח העבודה שלכם.') +
      para(
        'בינתיים, אם עוד לא ניסיתם: הכלים שסוכנים מקבלים הם בדיוק אלה שבאתר - שכבת הכשרות, זמני שבת מחושבים לכל עיר ויום, כמה טיולים של לקוחות במקביל, וייצוא ספר טיול להדפסה.',
        { size: 14 },
      ) +
      button(`${SITE}/chat`, 'לנסות את הסוכן') +
      footnote('לא אתם פניתם? אפשר להתעלם מהמייל הזה.'),
  },

  {
    file: 'agent-enquiry-alert.html',
    subject: 'פנייה חדשה מסוכן נסיעות: {{BUSINESS}}',
    title: 'פנייה חדשה - {{BUSINESS}}',
    preheader: '{{NAME}} · {{CONTACT}}',
    eyebrow: 'פנייה חדשה · פנימי',
    body:
      heading('פנייה חדשה מסוכן נסיעות') +
      facts([
        ['שם', '{{NAME}}'],
        ['עסק', '{{BUSINESS}}'],
        ['ליצירת קשר', '{{CONTACT}}'],
        ['התקבלה', '{{DATE}}'],
      ]) +
      para('<strong>ההודעה:</strong><br>{{MESSAGE}}', { color: C.night }) +
      button('{{ADMIN_URL}}', 'לפתוח בדשבורד') +
      footnote('מייל פנימי - נשלח אליך בלבד. ההנחיה למחיר ולפיילוט נמצאת ליד הפנייה בדשבורד.'),
  },

  {
    file: 'trip-reminder.html',
    subject: 'עוד {{DAYS_HE}} לטיול ל{{TRIP_NAME}}',
    title: 'עוד {{DAYS_HE}} לטיול',
    preheader: 'הטיול מתחיל ב-{{START_DATE}}. הכול מוכן?',
    eyebrow: 'עוד {{DAYS_HE}}',
    heroPhoto: { src: '{{PHOTO_URL}}', alt: '{{TRIP_NAME}}' },
    body:
      heading('עוד {{DAYS_HE}} לטיול ל{{TRIP_NAME}}') +
      para('הטיול מתחיל ב-<strong>{{START_DATE}}</strong>. הנה כמה דברים ששווה לסגור לפני שיוצאים:') +
      para(
        '• לפתוח את הטיול פעם אחת בטלפון - כך הוא נשמר גם בלי אינטרנט בחו״ל.<br>• להדפיס או לשמור את ספר הטיול כ-PDF.<br>• לוודא שהמלון מסומן על המפה, כדי שהניווט יתחיל ממנו.',
        { size: 14 },
      ) +
      button('{{TRIP_URL}}', 'לפתוח את הטיול') +
      para(
        `תכננתם לפני זמן? <a href="{{TRIP_URL}}" style="color:${C.sunset};">בדיקה לפני הנסיעה</a> עוברת על כל תחנה ואומרת מה השתנה מאז.`,
        { size: 14 },
      ) +
      footnote(
        `קיבלתם תזכורת כי ביקשתם אותה לטיול הזה. <a href="{{UNSUBSCRIBE_URL}}" style="color:${C.faint};">לא לשלוח תזכורות</a>`,
      ),
  },

  {
    file: 'group-digest.html',
    subject: 'חדש בטיול המשותף: {{TRIP_NAME}}',
    title: 'חדש בטיול המשותף',
    preheader: '{{SUMMARY}}',
    eyebrow: 'טיול משותף',
    heroPhoto: { src: '{{PHOTO_URL}}', alt: '{{TRIP_NAME}}' },
    body:
      heading('חדש בטיול המשותף') +
      para('מאז הפעם האחרונה שפתחתם את <strong>{{TRIP_NAME}}</strong>:') +
      facts([
        ['הצעות חדשות למקומות', '{{SUGGESTIONS}}'],
        ['הצבעות חדשות', '{{VOTES}}'],
        ['תגובות חדשות', '{{COMMENTS}}'],
        ['ענו על תאריכים / הגעה', '{{ANSWERS}}'],
      ]) +
      button('{{TRIP_URL}}', 'לראות מה חדש') +
      footnote(
        `נשלח רק אליכם, כמי שיצר את הקישור - חברים שהצטרפו לא מקבלים מיילים. <a href="{{UNSUBSCRIBE_URL}}" style="color:${C.faint};">להפסיק עדכונים לטיול הזה</a>`,
      ),
  },

  {
    file: 'newsletter-confirm.html',
    subject: 'רגע אחד - לאשר את ההרשמה',
    title: 'לאשר את ההרשמה',
    preheader: 'לחיצה אחת ואתם רשומים.',
    eyebrow: 'אישור הרשמה',
    body:
      heading('לאשר את ההרשמה') +
      para('מישהו - כנראה אתם - הזין את הכתובת הזו לעדכונים מטיול+. כדי שנדע שזה באמת אתם, לחצו על הכפתור:') +
      button('{{CONFIRM_URL}}', 'כן, לרשום אותי') +
      para('נשלח לעיתים רחוקות: יעדים חדשים בקטלוג, שינויים שמשפיעים על טיולים, ופיצ׳רים חדשים. בלי ספאם, ואפשר להסיר את הכתובת בלחיצה בכל מייל.', { size: 14 }) +
      footnote('לא אתם? אפשר להתעלם מהמייל הזה - בלי לחיצה על הכפתור לא נרשמתם לכלום.'),
  },

  {
    file: 'newsletter-welcome.html',
    subject: 'נרשמתם. הנה מה שמגיע',
    title: 'נרשמתם',
    preheader: 'יעדים חדשים, שינויים בשטח, ופיצ׳רים - לעיתים רחוקות.',
    eyebrow: 'עדכונים',
    body:
      heading('נרשמתם, תודה') +
      para('מעכשיו תקבלו מאיתנו מייל כשיש משהו ששווה לדעת: יעדים חדשים בקטלוג, שינויים שמשפיעים על טיולים (סגירות, אירועים גדולים), ופיצ׳רים חדשים באתר.') +
      para('בינתיים, אם עוד לא ניסיתם - הסוכן בונה טיול אמיתי על המפה מתוך משפט אחד בעברית:', { size: 14 }) +
      button(`${SITE}/chat`, 'לתכנן טיול') +
      footnote(`לא רוצים? <a href="{{UNSUBSCRIBE_URL}}" style="color:${C.faint};">להסיר את הכתובת</a> - לחיצה אחת, בלי שאלות.`),
    footerExtra: `<br><a href="{{UNSUBSCRIBE_URL}}" style="color:${C.faint};text-decoration:underline;">הסרה מרשימת התפוצה</a>`,
  },
];

/* ---------- write ---------- */

mkdirSync(OUT, { recursive: true });
const index = [];
for (const t of TEMPLATES) {
  const html = shell(t);
  writeFileSync(join(OUT, t.file), html, 'utf8');
  index.push({ file: t.file, subject: t.subject });
}
// subjects.json is what the sender reads for the subject line, so the subject
// and the body of one email live in one place and cannot drift apart.
writeFileSync(join(OUT, 'subjects.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');

/*
  The same templates as a TypeScript module, for `lib/server/mail.ts`. Vercel
  bundles a serverless function from what it can statically trace, and a
  directory read through a dynamic path is precisely what it cannot - so the
  server imports this module instead of reading `emails/` at runtime. The
  HTML files stay the human-facing copy (paste, preview); a test asserts the
  two never drift.
*/
const APP_TEMPLATES = TEMPLATES.filter((t) => !t.file.startsWith('auth-'));
const tsLines = [
  '// GENERATED by scripts/build-emails.mjs - do not edit. Edit the script and rerun it.',
  '/* eslint-disable */',
  'export const EMAIL_TEMPLATES = {',
  ...APP_TEMPLATES.map((t) => {
    const key = t.file.replace(/\.html$/, '');
    return `  ${JSON.stringify(key)}: { subject: ${JSON.stringify(t.subject)}, html: ${JSON.stringify(shell(t))} },`;
  }),
  '} as const;',
  'export type EmailTemplateName = keyof typeof EMAIL_TEMPLATES;',
  '',
];
writeFileSync(join(ROOT, 'src', 'lib', 'server', 'emailTemplatesGenerated.ts'), tsLines.join('\n'), 'utf8');
console.log(`wrote ${TEMPLATES.length} templates to emails/ and ${APP_TEMPLATES.length} to src/lib/server/emailTemplatesGenerated.ts`);
