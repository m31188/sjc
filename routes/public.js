const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { sanitizeContent, formatThaiDate, truncate } = require('../utils/helpers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ===== Resume upload config (PDFs and Word docs) =====
const RESUME_DIR = path.join(__dirname, '..', 'public', 'uploads', 'resumes');
if (!fs.existsSync(RESUME_DIR)) fs.mkdirSync(RESUME_DIR, { recursive: true });

const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dir = path.join(RESUME_DIR, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const hash = crypto.randomBytes(8).toString('hex');
    const safeName = (file.originalname || 'resume').replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 60);
    cb(null, `${Date.now()}-${hash}-${safeName}${safeName.endsWith(ext) ? '' : ext}`);
  }
});
const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, or DOCX files are allowed'));
  }
});

// Make helpers available in views
router.use((req, res, next) => {
  res.locals.formatThaiDate = formatThaiDate;
  res.locals.truncate = truncate;
  next();
});

// ===== HOMEPAGE =====
router.get('/', async (req, res, next) => {
  try {
    const sliders = await query(
      'SELECT * FROM sliders WHERE active = 1 ORDER BY sort_order ASC'
    );
    const featuredNews = await query(
      `SELECT n.*, c.name as category_name, c.slug as category_slug
       FROM news n
       LEFT JOIN news_categories c ON n.category_id = c.id
       WHERE n.published = 1 AND n.featured = 1
       ORDER BY COALESCE(n.updated_at, n.published_at, n.created_at) DESC, n.id DESC LIMIT 4`
    );
    const recentNews = await query(
      `SELECT n.*, c.name as category_name, c.slug as category_slug
       FROM news n
       LEFT JOIN news_categories c ON n.category_id = c.id
       WHERE n.published = 1
       ORDER BY COALESCE(n.updated_at, n.published_at, n.created_at) DESC, n.id DESC LIMIT 6`
    );
    const businesses = await query(
      `SELECT * FROM businesses WHERE active = 1
       ORDER BY COALESCE(updated_at, created_at) DESC, sort_order ASC, id DESC LIMIT 12`
    );
    const sustainability = await query(
      `SELECT * FROM sustainability WHERE active = 1
       ORDER BY COALESCE(updated_at, created_at) DESC, sort_order ASC, id DESC LIMIT 3`
    );
    const investorDocs = await query(
      `SELECT * FROM investor_documents WHERE active = 1
       ORDER BY COALESCE(updated_at, created_at) DESC, year DESC, sort_order ASC, id DESC LIMIT 4`
    ).catch(() => []);

    res.render('pages/home', {
      title: res.locals.settings.meta_title || 'SJC',
      metaDescription: res.locals.settings.meta_description,
      sliders,
      featuredNews,
      recentNews,
      businesses,
      sustainability,
      investorDocs,
      bodyClass: 'page-home'
    });
  } catch (err) { next(err); }
});

// ===== ABOUT =====
router.get('/about', async (req, res, next) => {
  try {
    const page = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['about']);
    const sections = page[0] ? await query(
      'SELECT * FROM page_sections WHERE page_id = ? AND active = 1 ORDER BY sort_order ASC',
      [page[0].id]
    ) : [];
    res.render('pages/about', {
      title: page[0]?.title || 'เกี่ยวกับเรา',
      page: page[0] || {},
      sections,
      bodyClass: 'page-about'
    });
  } catch (err) { next(err); }
});

// ===== ABOUT SUB-PAGES (SCG-style) =====
// Each sub-page is a record in `pages` table with these slugs.
// Admin edits content from the standard pages CRUD, plus can add
// rich content blocks using the existing page builder.
const ABOUT_SUBPAGES = {
  'business-purpose': { slug: 'business-purpose', defaultTitle: 'Business Purpose', titleTh: 'Business Purpose', icon: 'fa-bullseye' },
  'executives-and-board-of-directors': { slug: 'executives-and-board-of-directors', defaultTitle: 'คณะกรรมการบริษัทและผู้บริหารระดับสูง', titleTh: 'คณะกรรมการบริษัทและผู้บริหารระดับสูง', icon: 'fa-users' },
  'organization-structure': { slug: 'organization-structure', defaultTitle: 'โครงสร้างองค์กร', titleTh: 'โครงสร้างองค์กร', icon: 'fa-sitemap' },
  'awards-and-recognition': { slug: 'awards-and-recognition', defaultTitle: 'มาตรฐานระดับโลก', titleTh: 'มาตรฐานระดับโลก', icon: 'fa-trophy' },
  'milestones': { slug: 'milestones', defaultTitle: 'ประวัติความเป็นมา', titleTh: 'ประวัติความเป็นมา', icon: 'fa-flag-checkered' },
  'corporate-governance': { slug: 'corporate-governance', defaultTitle: 'บรรษัทภิบาล', titleTh: 'บรรษัทภิบาล', icon: 'fa-balance-scale' }
};

async function renderAboutSubpage(req, res, next, key) {
  try {
    const meta = ABOUT_SUBPAGES[key];
    if (!meta) return next();
    let pageRows = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', [meta.slug]);
    // Auto-create the page record on first visit so admin can edit it
    if (!pageRows[0]) {
      try {
        await query(
          'INSERT INTO pages (slug, title, content, banner_title, active) VALUES (?, ?, ?, ?, 1)',
          [meta.slug, meta.defaultTitle, '', meta.defaultTitle]
        );
        pageRows = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', [meta.slug]);
      } catch (e) {}
    }
    const page = pageRows[0] || { slug: meta.slug, title: meta.defaultTitle };
    let blocks = [];
    try {
      blocks = await query(
        'SELECT * FROM content_blocks WHERE parent_type = ? AND parent_id = ? AND active = 1 ORDER BY sort_order, id',
        ['page', page.id]
      );
    } catch(e) {}
    res.render('pages/about-subpage', {
      title: page.title || meta.defaultTitle,
      page,
      blocks,
      meta,
      breadcrumb: [
        { label: 'Home', url: '/' },
        { label: 'About Us', url: '/about' },
        { label: page.title || meta.defaultTitle, url: null }
      ],
      bodyClass: 'page-about-sub page-about-' + meta.slug
    });
  } catch (err) { next(err); }
}

router.get('/about/business-purpose', (req, res, next) => renderAboutSubpage(req, res, next, 'business-purpose'));
router.get('/about/executives-and-board-of-directors', (req, res, next) => renderAboutSubpage(req, res, next, 'executives-and-board-of-directors'));
router.get('/about/organization-structure', (req, res, next) => renderAboutSubpage(req, res, next, 'organization-structure'));
router.get('/about/awards-and-recognition', (req, res, next) => renderAboutSubpage(req, res, next, 'awards-and-recognition'));
router.get('/about/milestones', (req, res, next) => renderAboutSubpage(req, res, next, 'milestones'));
router.get('/about/corporate-governance', (req, res, next) => renderAboutSubpage(req, res, next, 'corporate-governance'));
router.get('/company-profile', async (req, res, next) => {
  try {
    let pageRows = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['company-profile']);
    if (!pageRows[0]) {
      try {
        await query('INSERT INTO pages (slug, title, content, banner_title, active) VALUES (?, ?, ?, ?, 1)',
          ['company-profile', 'Company Profile', '', 'Company Profile']);
        pageRows = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['company-profile']);
      } catch (e) {}
    }
    const page = pageRows[0] || { slug: 'company-profile', title: 'Company Profile' };
    let blocks = [];
    try {
      blocks = await query(
        'SELECT * FROM content_blocks WHERE parent_type = ? AND parent_id = ? AND active = 1 ORDER BY sort_order, id',
        ['page', page.id]
      );
    } catch(e) {}
    res.render('pages/about-subpage', {
      title: page.title || 'Company Profile',
      page,
      blocks,
      meta: { slug: 'company-profile', defaultTitle: 'Company Profile', titleTh: 'ข้อมูลบริษัท', icon: 'fa-building' },
      breadcrumb: [
        { label: 'Home', url: '/' },
        { label: 'Company Profile', url: null }
      ],
      bodyClass: 'page-about-sub page-company-profile'
    });
  } catch (err) { next(err); }
});

// ===== BUSINESSES =====
router.get('/businesses', async (req, res, next) => {
  try {
    const page = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['businesses']);
    const businesses = await query(
      `SELECT * FROM businesses WHERE active = 1 ORDER BY COALESCE(updated_at, created_at) DESC, sort_order ASC, id DESC`
    );
    res.render('pages/businesses', {
      title: page[0]?.title || 'ธุรกิจของเรา',
      page: page[0] || {},
      businesses,
      bodyClass: 'page-businesses'
    });
  } catch (err) { next(err); }
});

router.get('/businesses/:slug', async (req, res, next) => {
  try {
    const business = await query(
      'SELECT * FROM businesses WHERE slug = ? AND active = 1 LIMIT 1',
      [req.params.slug]
    );
    if (!business[0]) return res.status(404).render('pages/404', { title: '404' });
    const related = await query(
      'SELECT * FROM businesses WHERE active = 1 AND id != ? ORDER BY sort_order LIMIT 3',
      [business[0].id]
    );
    let blocks = [];
    try {
      blocks = await query(
        'SELECT * FROM content_blocks WHERE parent_type = ? AND parent_id = ? AND active = 1 ORDER BY sort_order, id',
        ['business', business[0].id]
      );
    } catch (e) { /* table may not exist on legacy DB */ }
    res.render('pages/business-detail', {
      title: business[0].name,
      business: business[0],
      blocks,
      related,
      bodyClass: 'page-business-detail'
    });
  } catch (err) { next(err); }
});

// ===== SUSTAINABILITY =====
router.get('/sustainability', async (req, res, next) => {
  try {
    const page = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['sustainability']);
    const items = await query(
      `SELECT * FROM sustainability WHERE active = 1 ORDER BY COALESCE(updated_at, created_at) DESC, sort_order ASC, id DESC`
    );
    res.render('pages/sustainability', {
      title: page[0]?.title || 'ความยั่งยืน',
      page: page[0] || {},
      items,
      bodyClass: 'page-sustainability'
    });
  } catch (err) { next(err); }
});

router.get('/sustainability/:slug', async (req, res, next) => {
  try {
    const item = await query(
      'SELECT * FROM sustainability WHERE slug = ? AND active = 1 LIMIT 1',
      [req.params.slug]
    );
    if (!item[0]) return res.status(404).render('pages/404', { title: '404' });
    res.render('pages/sustainability-detail', {
      title: item[0].title,
      item: item[0],
      bodyClass: 'page-sustainability-detail'
    });
  } catch (err) { next(err); }
});

// ===== INNOVATION =====
router.get('/innovation', async (req, res, next) => {
  try {
    const page = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['innovation']);
    const sections = page[0] ? await query(
      'SELECT * FROM page_sections WHERE page_id = ? AND active = 1 ORDER BY sort_order ASC',
      [page[0].id]
    ) : [];
    res.render('pages/innovation', {
      title: page[0]?.title || 'นวัตกรรม',
      page: page[0] || {},
      sections,
      bodyClass: 'page-innovation'
    });
  } catch (err) { next(err); }
});

// ===== NEWS =====
router.get('/news', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 9;
    const offset = (page - 1) * perPage;
    const categorySlug = req.query.category;

    let whereClause = 'n.published = 1';
    const params = [];

    if (categorySlug) {
      whereClause += ' AND c.slug = ?';
      params.push(categorySlug);
    }

    const items = await query(
      `SELECT n.*, c.name as category_name, c.slug as category_slug
       FROM news n
       LEFT JOIN news_categories c ON n.category_id = c.id
       WHERE ${whereClause}
       ORDER BY COALESCE(n.updated_at, n.published_at, n.created_at) DESC, n.id DESC
       LIMIT ${perPage} OFFSET ${offset}`,
      params
    );

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM news n
       LEFT JOIN news_categories c ON n.category_id = c.id
       WHERE ${whereClause}`,
      params
    );

    const categories = await query('SELECT * FROM news_categories ORDER BY sort_order ASC');

    res.render('pages/news', {
      title: 'ข่าวสาร',
      items,
      categories,
      activeCategory: categorySlug || null,
      pagination: {
        current: page,
        total: Math.ceil(total / perPage),
        totalItems: total
      },
      bodyClass: 'page-news'
    });
  } catch (err) { next(err); }
});

router.get('/news/:slug', async (req, res, next) => {
  try {
    const items = await query(
      `SELECT n.*, c.name as category_name, c.slug as category_slug
       FROM news n
       LEFT JOIN news_categories c ON n.category_id = c.id
       WHERE n.slug = ? AND n.published = 1 LIMIT 1`,
      [req.params.slug]
    );
    if (!items[0]) return res.status(404).render('pages/404', { title: '404' });

    // Increment views
    await query('UPDATE news SET views = views + 1 WHERE id = ?', [items[0].id]);

    const related = await query(
      `SELECT n.*, c.name as category_name FROM news n
       LEFT JOIN news_categories c ON n.category_id = c.id
       WHERE n.published = 1 AND n.id != ? AND (n.category_id = ? OR ? IS NULL)
       ORDER BY n.published_at DESC LIMIT 3`,
      [items[0].id, items[0].category_id, items[0].category_id]
    );

    let blocks = [];
    try {
      blocks = await query(
        'SELECT * FROM content_blocks WHERE parent_type = ? AND parent_id = ? AND active = 1 ORDER BY sort_order, id',
        ['news', items[0].id]
      );
    } catch (e) { /* legacy DB */ }

    res.render('pages/news-detail', {
      title: items[0].title,
      metaDescription: items[0].meta_description || items[0].excerpt,
      news: items[0],
      blocks,
      related,
      bodyClass: 'page-news-detail'
    });
  } catch (err) { next(err); }
});

// ===== INVESTOR RELATIONS =====
router.get('/investor-relations', async (req, res, next) => {
  try {
    const page = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['investor-relations']);
    const documents = await query(
      'SELECT * FROM investor_documents WHERE active = 1 ORDER BY year DESC, sort_order ASC'
    );
    const docsByCategory = {};
    documents.forEach(d => {
      if (!docsByCategory[d.category]) docsByCategory[d.category] = [];
      docsByCategory[d.category].push(d);
    });
    res.render('pages/investor', {
      title: page[0]?.title || 'นักลงทุนสัมพันธ์',
      page: page[0] || {},
      docsByCategory,
      bodyClass: 'page-investor'
    });
  } catch (err) { next(err); }
});

// ===== CAREERS =====
router.get('/careers', async (req, res, next) => {
  try {
    const page = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['careers']);
    const jobs = await query(
      'SELECT * FROM careers WHERE active = 1 ORDER BY featured DESC, created_at DESC'
    );
    res.render('pages/careers', {
      title: page[0]?.title || 'ร่วมงานกับเรา',
      page: page[0] || {},
      jobs,
      bodyClass: 'page-careers'
    });
  } catch (err) { next(err); }
});

router.get('/careers/:slug', async (req, res, next) => {
  try {
    const jobs = await query(
      'SELECT * FROM careers WHERE slug = ? AND active = 1 LIMIT 1',
      [req.params.slug]
    );
    if (!jobs[0]) return res.status(404).render('pages/404', { title: '404' });
    let blocks = [];
    try {
      blocks = await query(
        'SELECT * FROM content_blocks WHERE parent_type = ? AND parent_id = ? AND active = 1 ORDER BY sort_order, id',
        ['career', jobs[0].id]
      );
    } catch (e) { /* legacy DB */ }
    res.render('pages/career-detail', {
      title: jobs[0].title,
      job: jobs[0],
      blocks,
      query: req.query,
      bodyClass: 'page-career-detail'
    });
  } catch (err) { next(err); }
});

// Job application submit
router.post('/careers/:slug/apply', (req, res, next) => {
  resumeUpload.single('resume')(req, res, async (err) => {
    if (err) {
      req.flash('error', err.message || 'Resume upload failed. Please try again.');
      return res.redirect(`/careers/${req.params.slug}`);
    }
    try {
      const jobs = await query(
        'SELECT * FROM careers WHERE slug = ? AND active = 1 LIMIT 1',
        [req.params.slug]
      );
      if (!jobs[0]) return res.status(404).render('pages/404', { title: '404' });
      const job = jobs[0];

      // Honeypot
      if (req.body.website && req.body.website.trim() !== '') {
        return res.redirect(`/careers/${job.slug}?applied=1`);
      }

      const fullName = (req.body.full_name || '').toString().trim().substring(0, 255);
      const email = (req.body.email || '').toString().trim().substring(0, 190);
      const phone = (req.body.phone || '').toString().trim().substring(0, 50);
      const coverLetter = (req.body.cover_letter || '').toString().trim().substring(0, 5000);

      if (!fullName || !email) {
        req.flash('error', 'กรุณากรอกชื่อและอีเมล / Name and email are required');
        return res.redirect(`/careers/${job.slug}`);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        req.flash('error', 'รูปแบบอีเมลไม่ถูกต้อง / Invalid email format');
        return res.redirect(`/careers/${job.slug}`);
      }

      let resumePath = null;
      let resumeSize = null;
      if (req.file) {
        const rel = path.relative(path.join(__dirname, '..', 'public'), req.file.path).replace(/\\/g, '/');
        resumePath = '/' + rel;
        resumeSize = req.file.size;
      }

      const ip = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().substring(0, 45);
      const ua = (req.headers['user-agent'] || '').substring(0, 500);

      await query(
        `INSERT INTO career_applications
          (career_id, job_title, full_name, email, phone, cover_letter, resume_path, resume_size, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [job.id, job.title, fullName, email, phone, coverLetter, resumePath, resumeSize, ip, ua]
      );

      req.flash('success', 'ส่งใบสมัครเรียบร้อย เราจะติดต่อกลับทางอีเมล / Application submitted! We will contact you via email.');
      res.redirect(`/careers/${job.slug}?applied=1`);
    } catch (err) {
      console.error('Apply error:', err);
      req.flash('error', 'เกิดข้อผิดพลาด กรุณาลองใหม่ / Something went wrong, please try again');
      res.redirect(`/careers/${req.params.slug}`);
    }
  });
});

// ===== CONTACT =====
router.get('/contact', async (req, res, next) => {
  try {
    const page = await query('SELECT * FROM pages WHERE slug = ? LIMIT 1', ['contact']);
    res.render('pages/contact', {
      title: page[0]?.title || 'ติดต่อเรา',
      page: page[0] || {},
      bodyClass: 'page-contact'
    });
  } catch (err) { next(err); }
});

router.post('/contact', async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, website } = req.body;
    // Honeypot
    if (website) return res.redirect('/contact?sent=1');

    if (!name || !email || !message) {
      req.flash('error', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return res.redirect('/contact');
    }

    const ip = req.headers['cf-connecting-ip'] || req.ip;
    await query(
      `INSERT INTO contact_messages (name, email, phone, subject, message, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, phone || null, subject || null, message, ip]
    );

    req.flash('success', 'ส่งข้อความเรียบร้อยแล้ว เราจะติดต่อกลับโดยเร็วที่สุด');
    res.redirect('/contact?sent=1');
  } catch (err) { next(err); }
});

// ===== GENERIC PAGE FALLBACK =====
router.get('/page/:slug', async (req, res, next) => {
  try {
    const pages = await query(
      'SELECT * FROM pages WHERE slug = ? AND active = 1 LIMIT 1',
      [req.params.slug]
    );
    if (!pages[0]) return res.status(404).render('pages/404', { title: '404' });
    const sections = await query(
      'SELECT * FROM page_sections WHERE page_id = ? AND active = 1 ORDER BY sort_order ASC',
      [pages[0].id]
    );
    res.render('pages/generic', {
      title: pages[0].title,
      page: pages[0],
      sections,
      bodyClass: 'page-generic'
    });
  } catch (err) { next(err); }
});

// ===== SITEMAP =====
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const baseUrl = res.locals.siteUrl;
    const news = await query('SELECT slug, updated_at FROM news WHERE published = 1');
    const businesses = await query('SELECT slug, updated_at FROM businesses WHERE active = 1');
    const sustainability = await query('SELECT slug, updated_at FROM sustainability WHERE active = 1');

    const staticPages = ['', '/about', '/businesses', '/sustainability', '/innovation',
      '/news', '/investor-relations', '/careers', '/contact'];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    staticPages.forEach(p => {
      xml += `<url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq></url>\n`;
    });
    news.forEach(n => {
      xml += `<url><loc>${baseUrl}/news/${n.slug}</loc><lastmod>${new Date(n.updated_at).toISOString()}</lastmod></url>\n`;
    });
    businesses.forEach(b => {
      xml += `<url><loc>${baseUrl}/businesses/${b.slug}</loc></url>\n`;
    });
    sustainability.forEach(s => {
      xml += `<url><loc>${baseUrl}/sustainability/${s.slug}</loc></url>\n`;
    });
    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) { next(err); }
});

router.get('/robots.txt', (req, res) => {
  const baseUrl = res.locals.siteUrl;
  res.type('text/plain').send(
`User-agent: *
Allow: /
Disallow: /${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml`
  );
});

module.exports = router;
