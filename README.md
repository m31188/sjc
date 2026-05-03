# SJC Corporate Website

A complete Node.js + Express + MySQL + EJS corporate website with admin CMS, built for Plesk hosting (no SSH required).

**Version:** 1.0.0

## Features

### Public-facing Site
- 🏠 **Homepage** with hero slider, about section, stats, businesses, news, sustainability, CTA
- 📄 **About Us** with vision/mission/values + dynamic CMS sections
- 💼 **Businesses** listing + detail pages with related items
- 🌱 **Sustainability** listing + detail pages
- 💡 **Innovation** page with pillars + custom sections
- 📰 **News** with category filter, pagination, full-text search ready
- 📊 **Investor Relations** with documents grouped by category
- 👔 **Careers** with job listings + application via email
- 📞 **Contact** form with map embed, honeypot anti-spam
- 🌐 **Multi-language** via Google Translate widget (TH primary, auto-translate to EN/JA/ZH)
- 📱 **Fully responsive** mobile/tablet/desktop
- ⚡ Image optimization with Sharp
- 🔍 SEO-ready (sitemap.xml, robots.txt, OG tags, Buddhist Era dates)

### Admin Panel (Easy CMS)
- 🔐 Obfuscated admin URL (configurable)
- 📊 Dashboard with stats, recent messages, quick actions
- 🖼️ Slider management with drag-drop reorder
- 📝 News with TinyMCE rich editor + categories
- 🏢 Businesses, Sustainability, Careers CRUD
- 📄 CMS pages with banner + content editing
- 🗂️ Menu builder for header + 3 footer columns
- ⚙️ Site settings grouped by category with **image size hints on every upload**
- 📨 Contact messages inbox
- 👥 Multi-user with roles (admin/staff/editor)
- 🔒 Anti-inspect protection (toggleable)

### Security
- bcrypt password hashing (cost 12)
- Helmet security headers
- Rate limiting (Cloudflare-aware via CF-Connecting-IP)
- Session-based auth with httpOnly cookies
- HTML sanitization on all rich text
- File upload whitelist + size limits
- Honeypot on contact form
- Obfuscated admin URL
- Trust proxy support

---

## 🚀 Deployment to Plesk (No SSH Required)

### 1. Create MySQL Database in Plesk
1. Plesk → **Databases** → **Add Database**
2. Note: database name, user, password
3. Make sure charset is `utf8mb4`

### 2. Upload Files via Plesk File Manager
1. Plesk → **Files** → navigate to `httpdocs/` (or your subdomain dir)
2. Upload the entire ZIP and extract
3. The structure should look like:
   ```
   httpdocs/
   ├── app.js
   ├── package.json
   ├── .npmrc
   ├── config/
   ├── routes/
   ├── views/
   └── public/
   ```

### 3. Configure .env
1. Copy `.env.example` to `.env` (use Plesk File Manager: Right-click → Copy)
2. Edit `.env` and fill in:
   - `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` from step 1
   - `SESSION_SECRET` — generate a long random string (50+ chars)
   - `ADMIN_SLUG` — change to something unique
   - `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` for first login
   - `SITE_URL` — your domain (e.g. `https://sjc.co.th`)
   - `BEHIND_CLOUDFLARE=true` if using Cloudflare

### 4. Enable Node.js in Plesk
1. Plesk → your domain → **Node.js**
2. Click **Enable Node.js**
3. Set:
   - **Node.js version:** 18.x or higher
   - **Application mode:** production
   - **Application root:** `/httpdocs` (or wherever you uploaded)
   - **Application startup file:** `app.js`
   - **Custom environment variables:** (optional, can use .env instead)

### 5. Install Dependencies
1. In Plesk Node.js panel, click **NPM Install**
2. Wait for it to complete (Sharp will use the `.npmrc` ignore-scripts trick)
3. If Sharp fails, try: **NPM run script** → custom command: `npm install sharp --build-from-source`

### 6. Start the App
1. Click **Restart App** in Plesk Node.js panel
2. Visit your domain → you should see the SJC homepage
3. Visit `https://yourdomain.com/sjc-control-panel-x7k2` (or your ADMIN_SLUG) for admin login
4. Login with `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` from .env
5. **CHANGE THE ADMIN PASSWORD IMMEDIATELY** in Profile

### 7. Add Your Real Logo & Content
1. Login to admin
2. Settings → General → upload your logo (240×60px PNG transparent)
3. Settings → Contact → fill in real address/phone/email
4. Settings → Social → add your social links
5. Sliders → replace placeholder slides with real content
6. News, Businesses, etc. → add your real content

---

## 📂 Project Structure

```
sjc-website/
├── app.js                    # Main entry point
├── package.json
├── .npmrc                    # Plesk Sharp install fix
├── .env.example              # Copy to .env and configure
├── config/
│   ├── database.js           # MySQL connection pool
│   └── init-db.js            # Auto-creates tables on first run
├── middleware/
│   ├── auth.js               # Session authentication
│   └── upload.js             # Multer + Sharp image processing
├── routes/
│   ├── public.js             # All public-facing routes
│   ├── auth.js               # Admin login/logout
│   ├── admin.js              # Admin CRUD operations
│   └── api.js                # AJAX endpoints (upload, reorder, toggle)
├── utils/
│   └── helpers.js            # Slug, sanitize, Thai date formatting
├── views/
│   ├── layouts/
│   │   ├── public.ejs        # Public site layout
│   │   └── admin.ejs         # Admin panel layout
│   ├── partials/
│   │   ├── topbar.ejs
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   └── page-banner.ejs
│   ├── pages/                # All public pages
│   │   ├── home.ejs
│   │   ├── about.ejs
│   │   ├── businesses.ejs
│   │   ├── business-detail.ejs
│   │   ├── sustainability.ejs
│   │   ├── sustainability-detail.ejs
│   │   ├── innovation.ejs
│   │   ├── news.ejs
│   │   ├── news-detail.ejs
│   │   ├── investor.ejs
│   │   ├── careers.ejs
│   │   ├── career-detail.ejs
│   │   ├── contact.ejs
│   │   ├── generic.ejs
│   │   ├── 404.ejs
│   │   └── error.ejs
│   └── admin/                # Admin views
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── sliders/ (index + form)
│       ├── news/ (index + form)
│       ├── businesses/ (index + form)
│       ├── sustainability/ (index + form)
│       ├── careers/ (index + form)
│       ├── pages/ (index + form)
│       ├── users/ (index + form)
│       ├── menus.ejs
│       ├── settings.ejs
│       ├── messages.ejs
│       ├── message-detail.ejs
│       ├── news-categories.ejs
│       └── profile.ejs
└── public/
    ├── css/
    │   ├── style.css         # Public site CSS
    │   └── admin.css         # Admin panel CSS
    ├── js/
    │   ├── main.js           # Public site JS (sliders, animations)
    │   └── admin.js          # Admin JS (sortable, toggles)
    ├── images/               # Placeholder images (replace these!)
    └── uploads/              # User-uploaded files (auto year/month folders)
```

---

## 🔧 Database

The app **automatically creates all tables on first run** if they don't exist:
- `users` — admin/staff/editor accounts
- `settings` — site-wide settings (40+ pre-configured)
- `sliders` — homepage hero slides
- `news` + `news_categories` — articles
- `pages` + `page_sections` — CMS pages
- `businesses` — business units
- `sustainability` — CSR initiatives
- `careers` — job postings
- `investor_documents` — IR documents
- `menus` — header + footer navigation
- `contact_messages` — form submissions
- `media` — uploaded files library
- `activity_log` — admin actions

---

## 🌐 Translation

Uses Google Translate widget — completely free, no API key needed.
- Thai is the primary/default language
- Click the language selector (🌐 TH) in the topbar to switch
- Default languages: EN, JA, ZH (configurable in admin Settings → Translation)

---

## 🛠️ Customization

### Change brand colors
Edit `public/css/style.css` lines 8-15 (`:root` variables).

### Change admin URL
Edit `.env` → `ADMIN_SLUG=your-secret-path` and restart.

### Add new pages
1. Admin → Pages → edit existing template, OR
2. Add new page in the database and route in `routes/public.js`

### Disable Google Translate
Admin → Settings → Translation → uncheck "Enable Google Translate Widget"

---

## 🐛 Troubleshooting

### Sharp install fails on Plesk
The `.npmrc` is already configured. If it still fails:
- Plesk Node.js → NPM run script: `npm rebuild sharp --update-binary`
- Or contact your host to enable build tools

### "Cannot connect to database"
- Check `.env` credentials match Plesk database
- Make sure database charset is `utf8mb4`
- Check `DB_HOST` is `localhost` (or whatever Plesk shows)

### Admin login redirects in a loop
- Clear cookies for the domain
- Check `SESSION_SECRET` is set in `.env`
- Check session cookies are working (HTTPS recommended)

### Images don't upload
- Check `public/uploads/` directory exists and is writable
- Check `MAX_UPLOAD_SIZE_MB` in `.env`
- Check Plesk PHP/upload limits aren't blocking

### "Cannot find module" after update
- Plesk Node.js → click **NPM Install** again
- Click **Restart App**

---

## 📝 License

Proprietary - For SJC use only.

---

**Built for cairoit.co.th by Mido**
