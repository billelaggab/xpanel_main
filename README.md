# XPanel

![Python 3.8+](https://img.shields.io/badge/Python-3.8%2B-3776AB?style=flat-square&logo=python&logoColor=white) ![واجهة Cairo RTL](https://img.shields.io/badge/UI-Cairo%20%2F%20RTL-cc785c?style=flat-square) ![GitHub Releases](https://img.shields.io/badge/Distribution-GitHub%20Releases-24292f?style=flat-square&logo=github&logoColor=white)

**لوحة عربية لإدارة سجلات القنوات والمشتركين والخوادم.** واجهة متجاوبة بخط Cairo، مع إحصاءات المشاهدة والبحث وتصدير CSV. تُوزّع ملفات اللوحة في حزمة واحدة: **`xpanel.zip`**.

[دليل XPanel](xpanel/README.md) · [تحليل اللوحة القديمة](ui-analysis.md) · [التقرير التقني](report.md)

## 🚀 البدء السريع

**للموزّع:** من جذر المشروع، باستخدام Node.js ‏20.9+ وPython ‏3.8+:

```bash
npm ci
node xpanel/build.mjs
python3 install.py --check-xpanel
```

سينتج البناء **`xpanel/xpanel.zip`** و**`xpanel/xpanel.zip.sha256`**، بالإضافة إلى نسخة الملفات الجاهزة في `xpanel/release/`. ويمكن تنزيل الحزمة الجاهزة أيضًا من **الإعدادات ← حزمة التثبيت** في المعاينة.

**للمستخدم:** ضع `xpanel.zip` بجانب `install.py` (وملف بصمتها إن توفر)، ثم نفّذ `python3 install.py --check-xpanel`. لا يتطلب الفحص صلاحيات الجذر ولا يثبّت شيئًا. لاستخدام مسار آخر، أضف `--xpanel-zip /path/to/xpanel.zip`.

> [!TIP]
> لا تحتاج إلى الضغط يدويًا. إن فضّلت ذلك، شغّل البناء أولًا ثم اضغط محتويات `xpanel/release/` باسم `xpanel.zip`. يقبل المثبّت أيضًا ضغط مجلد `xpanel/` كاملًا بعد البناء؛ سيقرأ ملفات النشر من `xpanel/release/` ويتجاهل ملفات المصدر. من المجلد الذي يحتوي على ZIP الجديد، أنشئ بصمته بـ `sha256sum xpanel.zip > xpanel.zip.sha256`.

## 📦 النشر على GitHub Releases

1. افتح **Releases → Draft a new release** في مستودعك، واختر وسمًا مثل `v1.0.0`.
2. أرفق **`xpanel.zip`** ضمن **Assets** بالاسم نفسه. أرفق **`xpanel.zip.sha256`** أيضًا ليسهل التحقق، ثم انشر الإصدار في مستودع عام.
3. جرّب التنزيل باستخدام `install.py` وبصمة الملف الذي رفعته:

   ```bash
   python3 install.py --check-xpanel \
     --github-repo OWNER/REPO \
     --release-tag v1.0.0 \
     --sha256 SHA256_OF_UPLOADED_ZIP
   ```

   استبدل `OWNER/REPO` باسم مستودعك و`SHA256_OF_UPLOADED_ZIP` بالبصمة الفعلية (أول قيمة في ملف `.sha256`).

إذا لم تُحدّد `--release-tag`، يستخدم المثبّت المسار الذي توثّقه [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases):

```text
https://github.com/OWNER/REPO/releases/latest/download/xpanel.zip
```

> [!IMPORTANT]
> ارفع الأصل ZIP بنفسك؛ أرشيف **Source code (zip)** الذي يولّده GitHub ليس أصل الإصدار المقصود. يتطلب المثبّت بصمة SHA-256 متوقّعة عند التنزيل ولا يرجع إلى حزمة أخرى عند الفشل. استخدم بصمة من ناشر تثق به؛ المطابقة تثبت سلامة الملف لا موثوقية كوده.

## 🛠️ تثبيت اللوحة وحدها

استخدم **`--xpanel-only`** لتجهيز ملفات PHP وNginx من دون تثبيت خدمات البث القديمة. المثال التالي يستخدم ملفًا محليًا؛ ويمكنك بدل `--xpanel-zip` تمرير خيارات GitHub الثلاثة من المثال أعلاه:

```bash
python3 install.py --xpanel-only --xpanel-zip ./xpanel/xpanel.zip \
  --target "$HOME/xpanel-site" \
  --state-dir "$HOME/xpanel-data"
```

ينشئ الأمر حساب إدارة عند الإعداد الأول، من دون كلمة مرور افتراضية. تُحفظ السجلات وبيانات الدخول خارج جذر العرض. راجع [دليل التشغيل المحلي وPHP-FPM](xpanel/README.md) بعد تجهيز الملفات.

| الخيار | متغير البيئة المقابل | الغرض |
| :--- | :--- | :--- |
| `--xpanel-zip PATH` | `XPANEL_ZIP` | مسار ZIP محلي بدل الكشف التلقائي. |
| `--github-repo OWNER/REPO` | `XPANEL_GITHUB_REPO` | اسم المستودع العام الذي نشر أصل الإصدار. |
| `--release-tag TAG` | `XPANEL_GITHUB_TAG` | وسم محدد بدل `latest`. |
| `--sha256 HASH` | `XPANEL_SHA256` | البصمة المتوقّعة؛ مطلوبة للتنزيل. إذا كانت بجوار الملف المحلي بصيغة `.sha256` يقرأها المثبّت تلقائيًا. |

## 🧭 المسارات القديمة والحدود

- **`MAIN`** يستخدم المصدر نفسه لحزمة اللوحة ويفحص `xpanel.zip` قبل إعداد النظام. لا يطلب `release_22f.zip` أو `newstuff.zip`.
- **`LB`** لا يثبّت لوحة ولا يحتاج إلى `xpanel.zip`.
- **المعاينة `/xpanel`** تستخدم بيانات تجريبية على PostgreSQL. **اللوحة المنصّبة** تستخدم سجلًا مستقلًا، ولا ترحّل قاعدة Xtream ولا تشغّل تدفقات البث.

> [!NOTE]
> الحزمة تستبدل **واجهة الإدارة فقط**. بقية مكوّنات مسارَي التثبيت القديمين لم تُحزم مع XPanel ولم تُختبر بتثبيت شامل؛ لتجربة اللوحة استخدم المعاينة أو `--xpanel-only`.
