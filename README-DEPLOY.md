# North Store — دليل الرفع على Railway

## 1. الرفع على GitHub
```
git init
git add .
git commit -m "north store: express + postgres, no supabase"
git branch -M main
git remote add origin <رابط الريبو حقك>
git push -u origin main
```

## 2. Railway
1. أنشئ مشروع جديد → Deploy from GitHub repo → اختر الريبو.
2. أضف **Postgres** plugin من نفس المشروع (New → Database → PostgreSQL). Railway يضيف تلقائيًا متغير `DATABASE_URL` لخدمة الموقع إذا ربطتهم بنفس المشروع (Variables → Add Reference).
3. تأكد إن متغيرات البيئة فيها:
   - `DATABASE_URL` (من الـ Postgres plugin)
4. من إعدادات الخدمة (Settings → Build):
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start` (أو خليه فاضي، لأن فيه `Procfile` يحددها تلقائيًا: `web: node server/index.js`)
   ملاحظة: حذفنا ملف `railway.json` لأنه كان يسبب خطأ "failed to parse railway.json" عند بعض الحسابات — `Procfile` وحده كافي.

## 3. أول تشغيل
- أول ما يشتغل السيرفر، يسوي الجداول تلقائيًا (`ensureSchema`) ويزرع يوزر أدمن افتراضي:
  - **اسم المستخدم:** `North`
  - **كلمة المرور:** `North123`
- سجل دخول فيه من صفحة `/auth`، وتقدر تغيّر الباسورد لاحقًا (عن طريق SQL أو نضيفها بالداشبورد لاحقًا).

## 4. رفع صور المنتجات/الإيصالات
- الصور تُخزَّن محليًا في `server/uploads/` على نفس السيرفر وتُقدَّم عبر `/uploads/...`.
- ⚠️ ملاحظة: تخزين Railway للملفات المرفوعة **مؤقت** إذا ما فعّلت Volume. لو تبي الصور تظل بعد كل إعادة نشر:
  Railway → Settings → Volumes → أضف Volume واربطه بمسار `/app/server/uploads`.

## 5. تسجيل الدخول للعملاء
- الآن بدون Supabase نهائيًا. تسجيل الدخول بالاسم فقط (يتولد إيميل داخلي وهمي خلف الكواليس فقط لأغراض التوافق مع الكود القديم، لا يظهر للمستخدم ولا يُستخدم فعليًا).
- الجلسة تُحفظ عبر كوكي آمن (`north_sid`) لمدة 30 يوم، فتدخل تلقائيًا كل مرة.

## 6. ترقية مستخدم لأدمن
شغّل هذا الاستعلام على قاعدة بيانات Railway (Data tab → Query):
```sql
INSERT INTO user_roles(user_id, role)
SELECT id, 'admin' FROM users WHERE username = 'USERNAME_HERE'
ON CONFLICT DO NOTHING;
```

## 7. تشغيل محلي للتجربة
```
npm install
npm run build
npm run start
```
يفتح على http://localhost:3000
