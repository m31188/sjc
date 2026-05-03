const { query, pool } = require('./database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const schemas = [
  // Users (admin/staff/editor)
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(190) NOT NULL,
    role ENUM('admin','staff','editor') DEFAULT 'editor',
    active TINYINT(1) DEFAULT 1,
    last_login DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Settings (site-wide)
  `CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    setting_type ENUM('text','image','json','bool') DEFAULT 'text',
    setting_group VARCHAR(50) DEFAULT 'general',
    label VARCHAR(190),
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Hero slider
  `CREATE TABLE IF NOT EXISTS sliders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    subtitle VARCHAR(500),
    description TEXT,
    image VARCHAR(255) NOT NULL,
    video_url VARCHAR(500),
    button_text VARCHAR(100),
    button_url VARCHAR(500),
    text_position ENUM('left','center','right') DEFAULT 'left',
    text_color VARCHAR(20) DEFAULT '#ffffff',
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sort (sort_order),
    INDEX idx_active (active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // News categories
  `CREATE TABLE IF NOT EXISTS news_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL,
    slug VARCHAR(190) UNIQUE NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // News articles
  `CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content LONGTEXT,
    section2_heading VARCHAR(255) NULL,
    section2_body LONGTEXT NULL,
    section2_image VARCHAR(255) NULL,
    section3_heading VARCHAR(255) NULL,
    section3_body LONGTEXT NULL,
    section3_image VARCHAR(255) NULL,
    section4_heading VARCHAR(255) NULL,
    section4_body LONGTEXT NULL,
    section4_image VARCHAR(255) NULL,
    thumbnail VARCHAR(255),
    banner VARCHAR(255),
    author VARCHAR(190),
    tags VARCHAR(500),
    views INT DEFAULT 0,
    featured TINYINT(1) DEFAULT 0,
    published TINYINT(1) DEFAULT 1,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_published (published, published_at),
    INDEX idx_featured (featured),
    FULLTEXT idx_search (title, excerpt, content)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Pages (CMS pages with editable sections)
  `CREATE TABLE IF NOT EXISTS pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(190) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    banner_image VARCHAR(255),
    banner_title VARCHAR(255),
    banner_subtitle VARCHAR(500),
    content LONGTEXT,
    template VARCHAR(50) DEFAULT 'default',
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    sort_order INT DEFAULT 0,
    show_in_menu TINYINT(1) DEFAULT 1,
    parent_id INT NULL,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_parent (parent_id),
    INDEX idx_active (active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Page sections (modular blocks per page)
  `CREATE TABLE IF NOT EXISTS page_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id INT NOT NULL,
    section_type ENUM('text','image_text','gallery','cta','stats','team','timeline','accordion','quote','video') DEFAULT 'text',
    title VARCHAR(255),
    subtitle VARCHAR(500),
    content LONGTEXT,
    image VARCHAR(255),
    extra_data JSON,
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    INDEX idx_page_sort (page_id, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Businesses / Services / Products
  `CREATE TABLE IF NOT EXISTS businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT,
    full_description LONGTEXT,
    icon VARCHAR(255),
    thumbnail VARCHAR(255),
    banner VARCHAR(255),
    website_url VARCHAR(500),
    sort_order INT DEFAULT 0,
    featured TINYINT(1) DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Sustainability / CSR initiatives
  `CREATE TABLE IF NOT EXISTS sustainability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT,
    full_description LONGTEXT,
    thumbnail VARCHAR(255),
    banner VARCHAR(255),
    category VARCHAR(100),
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Careers / Job postings
  `CREATE TABLE IF NOT EXISTS careers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(190),
    location VARCHAR(190),
    job_type ENUM('full-time','part-time','contract','internship') DEFAULT 'full-time',
    description LONGTEXT,
    requirements LONGTEXT,
    benefits LONGTEXT,
    salary_range VARCHAR(100),
    apply_email VARCHAR(190),
    closing_date DATE NULL,
    featured TINYINT(1) DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Job applications submitted via the careers page
  `CREATE TABLE IF NOT EXISTS career_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    career_id INT NULL,
    job_title VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(50),
    cover_letter TEXT,
    resume_path VARCHAR(500),
    resume_size INT,
    status ENUM('new','reviewing','contacted','rejected','hired') DEFAULT 'new',
    admin_notes TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_career_id (career_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    FOREIGN KEY (career_id) REFERENCES careers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Content blocks - reusable page builder for news/business/career detail pages
  `CREATE TABLE IF NOT EXISTS content_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_type ENUM('news','business','career','sustainability','page') NOT NULL,
    parent_id INT NOT NULL,
    block_type ENUM('heading','text','image','video','gallery','quote','divider','cta','embed') NOT NULL,
    heading TEXT,
    body LONGTEXT,
    image_url VARCHAR(500),
    image_alt VARCHAR(255),
    video_url VARCHAR(500),
    embed_code TEXT,
    cta_text VARCHAR(100),
    cta_url VARCHAR(500),
    settings JSON,
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_type, parent_id),
    INDEX idx_sort (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Investor relations documents
  `CREATE TABLE IF NOT EXISTS ir_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(190) NOT NULL,
    name_en VARCHAR(190),
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sort (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS investor_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) DEFAULT 'other',
    year INT,
    file_path VARCHAR(500),
    file_size INT,
    description TEXT,
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_year (year)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Menu items (header/footer nav)
  `CREATE TABLE IF NOT EXISTS menus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location ENUM('header','footer','footer_2','footer_3') DEFAULT 'header',
    label VARCHAR(190) NOT NULL,
    url VARCHAR(500),
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    open_new_tab TINYINT(1) DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    INDEX idx_location_sort (location, sort_order),
    INDEX idx_parent (parent_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Contact form submissions
  `CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190),
    email VARCHAR(190),
    phone VARCHAR(50),
    subject VARCHAR(255),
    message TEXT,
    ip_address VARCHAR(45),
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Media library
  `CREATE TABLE IF NOT EXISTS media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INT,
    width INT,
    height INT,
    alt_text VARCHAR(255),
    uploaded_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_uploaded_by (uploaded_by),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Activity log
  `CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id INT,
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
];

const defaultSettings = [
  // General
  ['site_name', 'SJC', 'text', 'general', 'Site Name', 'The company/site name shown in browser tab'],
  ['site_tagline', 'นวัตกรรมเพื่ออนาคตที่ยั่งยืน', 'text', 'general', 'Site Tagline (Thai)', 'Short tagline shown under logo'],
  ['site_logo', '/images/logo-placeholder.png', 'image', 'general', 'Site Logo', 'Header logo. Recommended: 240×60px PNG with transparency'],
  ['site_logo_white', '/images/logo-white-placeholder.png', 'image', 'general', 'White Logo', 'Used on dark backgrounds. Recommended: 240×60px PNG'],
  ['site_favicon', '/images/favicon.png', 'image', 'general', 'Favicon', 'Browser tab icon. Recommended: 32×32px PNG'],

  // Contact
  ['contact_address', 'กรุงเทพมหานคร, ประเทศไทย', 'text', 'contact', 'Address', 'Company address shown in footer and contact page'],
  ['contact_phone', '+66 2 000 0000', 'text', 'contact', 'Phone', 'Main contact phone'],
  ['contact_email', 'info@sjc.co.th', 'text', 'contact', 'Email', 'Main contact email'],
  ['contact_hours', 'จันทร์-ศุกร์ 8:30-17:30', 'text', 'contact', 'Business Hours', 'Working hours'],
  ['contact_map_embed', '', 'text', 'contact', 'Google Maps Embed', 'Paste Google Maps iframe embed code'],

  // Social
  ['social_facebook', '', 'text', 'social', 'Facebook URL', 'Full Facebook page URL'],
  ['social_line', '', 'text', 'social', 'LINE Official URL', 'LINE Official Account URL'],
  ['social_youtube', '', 'text', 'social', 'YouTube URL', 'YouTube channel URL'],
  ['social_linkedin', '', 'text', 'social', 'LinkedIn URL', 'LinkedIn company page'],
  ['social_instagram', '', 'text', 'social', 'Instagram URL', 'Instagram handle URL'],

  // SEO
  ['meta_title', 'SJC - นวัตกรรมเพื่ออนาคตที่ยั่งยืน', 'text', 'seo', 'Default Meta Title', 'Default page title for SEO'],
  ['meta_description', 'SJC ผู้นำด้านนวัตกรรมและความยั่งยืน', 'text', 'seo', 'Default Meta Description', 'Default meta description (150-160 chars)'],
  ['meta_keywords', 'SJC, นวัตกรรม, ความยั่งยืน', 'text', 'seo', 'Meta Keywords', 'Comma-separated keywords'],
  ['og_image', '/images/og-default.jpg', 'image', 'seo', 'Default OG Image', 'Social share image. Recommended: 1200×630px'],

  // Translation
  ['enable_translate', '1', 'bool', 'translation', 'Enable Google Translate Widget', 'Show language switcher with TH/EN/JA/ZH'],
  ['translate_languages', 'en,ja,zh-CN', 'text', 'translation', 'Available Languages', 'Comma-separated language codes (TH is default)'],

  // Homepage sections toggles
  ['home_show_about', '1', 'bool', 'homepage', 'Show About Section on Homepage', ''],
  ['home_show_businesses', '1', 'bool', 'homepage', 'Show Businesses Section', ''],
  ['home_show_news', '1', 'bool', 'homepage', 'Show News Section', ''],
  ['home_show_sustainability', '1', 'bool', 'homepage', 'Show Sustainability Section', ''],
  ['home_show_stats', '1', 'bool', 'homepage', 'Show Stats Counter', ''],
  ['home_about_title', 'เกี่ยวกับ SJC', 'text', 'homepage', 'About Section Title', ''],
  ['home_about_text', 'SJC คือผู้นำด้านนวัตกรรมและการพัฒนาอย่างยั่งยืน ที่มุ่งมั่นสร้างสรรค์อนาคตที่ดีกว่าสำหรับทุกคน', 'text', 'homepage', 'About Section Text', ''],
  ['home_about_image', '/images/about-placeholder.jpg', 'image', 'homepage', 'About Section Image', 'Recommended: 800×600px'],
  ['home_stats_1_number', '50+', 'text', 'homepage', 'Stat 1 Number', ''],
  ['home_stats_1_label', 'ปีแห่งประสบการณ์', 'text', 'homepage', 'Stat 1 Label', ''],
  ['home_stats_2_number', '1000+', 'text', 'homepage', 'Stat 2 Number', ''],
  ['home_stats_2_label', 'พนักงาน', 'text', 'homepage', 'Stat 2 Label', ''],
  ['home_stats_3_number', '20+', 'text', 'homepage', 'Stat 3 Number', ''],
  ['home_stats_3_label', 'ประเทศที่ดำเนินงาน', 'text', 'homepage', 'Stat 3 Label', ''],
  ['home_stats_4_number', '100+', 'text', 'homepage', 'Stat 4 Number', ''],
  ['home_stats_4_label', 'รางวัลที่ได้รับ', 'text', 'homepage', 'Stat 4 Label', ''],

  // Footer
  ['footer_about', 'SJC เป็นบริษัทชั้นนำที่มุ่งมั่นในการสร้างสรรค์นวัตกรรมและพัฒนาอย่างยั่งยืน เพื่ออนาคตที่ดีกว่า', 'text', 'footer', 'Footer About Text', ''],
  ['footer_copyright', '© 2026 SJC | All Rights Reserved', 'text', 'footer', 'Copyright Text', ''],
  ['footer_company_name', 'บริษัท เอสเจซี จำกัด (มหาชน) สำนักงานใหญ่', 'text', 'footer', 'Company Full Name', 'Shown in footer'],

  // Stock ticker
  ['show_stock_ticker', '1', 'bool', 'topbar', 'Show Stock Ticker in Topbar', ''],
  ['stock_symbol', 'SJC', 'text', 'topbar', 'Stock Symbol', 'e.g. SJC, SCC'],
  ['stock_price', '240.00', 'text', 'topbar', 'Stock Price', 'Current trading price'],
  ['stock_change', '+12.00', 'text', 'topbar', 'Stock Change', 'e.g. +12.00 or -5.50'],

  // Homepage extra
  ['highlights_title', 'SJC Highlights', 'text', 'homepage', 'Highlights Section Title', ''],
  ['feature_stories_lead', 'เดินหน้าขับเคลื่อนธุรกิจด้วยนวัตกรรมกรีน พร้อมจับมือทุกภาคส่วนใน supply chain สู่สังคมคาร์บอนต่ำ', 'text', 'homepage', 'Feature Stories Lead Text', ''],
  ['business_panel_desc', 'ธุรกิจหลากหลายพร้อมส่งมอบนวัตกรรมกรีน เพื่อคุณภาพชีวิตที่ดีและโลกที่ยั่งยืน', 'text', 'homepage', 'Business Panel Description', ''],

  // Stat units
  ['home_stats_1_unit', 'ลบ.', 'text', 'homepage', 'Stat 1 Unit', 'e.g. ลบ., %, +'],
  ['home_stats_2_unit', '%', 'text', 'homepage', 'Stat 2 Unit', ''],
  ['home_stats_3_unit', '+', 'text', 'homepage', 'Stat 3 Unit', ''],
  ['home_stats_4_unit', 'ลบ.', 'text', 'homepage', 'Stat 4 Unit', ''],
  ['home_stats_5_number', 'TOP 1', 'text', 'homepage', 'Stat 5 Number', ''],
  ['home_stats_5_unit', '%', 'text', 'homepage', 'Stat 5 Unit', ''],
  ['home_stats_5_label', 'Corporate Sustainability ในกลุ่มอุตสาหกรรม', 'text', 'homepage', 'Stat 5 Label', ''],

  // IR documents on homepage
  ['ir_doc_1_name', 'Sustainability Narrative', 'text', 'investor', 'IR Doc 1 Name', ''],
  ['ir_doc_1_meta', 'PDF Format', 'text', 'investor', 'IR Doc 1 Meta', 'e.g. date | size'],
  ['ir_doc_1_url', '/investor-relations', 'text', 'investor', 'IR Doc 1 URL', 'Link to PDF'],
  ['ir_doc_2_name', 'รายงานประจำปี (One Report)', 'text', 'investor', 'IR Doc 2 Name', ''],
  ['ir_doc_2_meta', 'PDF Format', 'text', 'investor', 'IR Doc 2 Meta', ''],
  ['ir_doc_2_url', '/investor-relations', 'text', 'investor', 'IR Doc 2 URL', ''],
  ['ir_doc_3_name', 'Company Profile', 'text', 'investor', 'IR Doc 3 Name', ''],
  ['ir_doc_3_meta', 'PDF Format', 'text', 'investor', 'IR Doc 3 Meta', ''],
  ['ir_doc_3_url', '/investor-relations', 'text', 'investor', 'IR Doc 3 URL', ''],

  // Security
  ['admin_anti_inspect', '1', 'bool', 'security', 'Block Right-Click & DevTools on Admin', 'Anti-inspect protection for admin panel'],

  // Topbar / Stock Ticker
  ['country_label', 'Thailand', 'text', 'topbar', 'Country Label', 'Country shown top-left of the topbar'],
  ['stock_symbol', '', 'text', 'topbar', 'Stock Symbol', 'e.g. SJC — leave empty to hide stock ticker'],
  ['stock_price', '', 'text', 'topbar', 'Stock Price', 'e.g. 240.00'],
  ['stock_change', '', 'text', 'topbar', 'Stock Change', 'e.g. +12.00 or -5.50'],

  // Section Background Images (custom backgrounds for homepage sections)
  ['about_bg_image', '', 'image', 'section_backgrounds', 'About Block Background', 'Optional. Recommended: 1920×800px.'],
  ['about_bg_opacity', '92', 'text', 'section_backgrounds', 'About Background Overlay Opacity (%)', '0-100. Default 92'],
  ['highlights_bg_image', '', 'image', 'section_backgrounds', 'Highlights Section Background', 'Optional. Recommended: 1920×800px. Leave empty for default style.'],
  ['highlights_bg_opacity', '92', 'text', 'section_backgrounds', 'Highlights Background Overlay Opacity (%)', '0 = fully transparent (image fully visible), 100 = fully opaque (white). Default 92'],
  ['latest_news_bg_image', '', 'image', 'section_backgrounds', 'Latest News Section Background', 'Optional. Recommended: 1920×800px.'],
  ['latest_news_bg_opacity', '92', 'text', 'section_backgrounds', 'Latest News Background Overlay Opacity (%)', '0-100. Default 92'],
  ['feature_stories_bg_image', '', 'image', 'section_backgrounds', 'Feature Stories Section Background', 'Optional. Recommended: 1920×800px.'],
  ['feature_stories_bg_opacity', '92', 'text', 'section_backgrounds', 'Feature Stories Background Overlay Opacity (%)', '0-100. Default 92'],
  ['whatwedo_bg_image', '', 'image', 'section_backgrounds', 'What We Do Section Background', 'Optional. Recommended: 1920×600px.'],
  ['whatwedo_bg_opacity', '92', 'text', 'section_backgrounds', 'What We Do Background Overlay Opacity (%)', '0-100. Default 92'],
  ['metrics_bg_image', '', 'image', 'section_backgrounds', 'Metrics Strip Section Background', 'Optional. Recommended: 1920×600px.'],
  ['metrics_bg_opacity', '85', 'text', 'section_backgrounds', 'Metrics Background Overlay Opacity (%)', '0-100. Default 85'],
  ['ir_bg_image', '', 'image', 'section_backgrounds', 'Investor Relations Section Background', 'Optional. Recommended: 1920×800px.'],
  ['ir_bg_opacity', '92', 'text', 'section_backgrounds', 'IR Background Overlay Opacity (%)', '0-100. Default 92'],
  ['careers_bg_image', '', 'image', 'section_backgrounds', 'Careers CTA Background', 'Recommended: 1920×600px.'],
  ['careers_bg_opacity', '50', 'text', 'section_backgrounds', 'Careers Background Overlay Opacity (%)', '0-100. Default 50'],

  // Big Banner (homepage section under What we do)
  ['big_banner_image', '/images/banner-default.jpg', 'image', 'homepage', 'Big Banner Image (Desktop)', 'Full-width banner. Recommended: 1920×800px'],
  ['big_banner_image_mobile', '', 'image', 'homepage', 'Big Banner Image (Mobile)', 'Optional separate image for mobile. Recommended: 750×900px portrait. If empty, desktop image is used.'],

  // Logo NEW badge - controllable from admin
  ['logo_badge_enabled', '1', 'bool', 'general', 'Show NEW Badge on Logo', 'Toggle the small badge that appears in the top-right corner of the logo'],
  ['logo_badge_text', 'NEW', 'text', 'general', 'Logo Badge Text', 'Text shown in the corner badge (e.g. NEW, BETA, 2026, v2)'],

  // Frontend translation - manual via admin Translate button (no Google Translate)
  ['enable_translate', '1', 'bool', 'general', 'Enable Frontend Language Switcher', 'Show TH/EN/ZH/JA toggle on the public site. Posts use auto-translation or stored translations.'],

  // Translation provider settings (Translation Manager uses these)
  ['translation_provider', 'mymemory', 'select', 'translation', 'Translation Provider', 'Which API to use for auto-translation. Options: mymemory (free, basic quality), anthropic (Claude AI - high quality, requires API key), deepl (high quality, requires API key)'],
  ['anthropic_api_key', '', 'password', 'translation', 'Anthropic API Key (Claude)', 'Get yours at console.anthropic.com. Used when translation_provider = anthropic. Stored encrypted in DB.'],
  ['deepl_api_key', '', 'password', 'translation', 'DeepL API Key', 'Get yours at deepl.com/pro-api. Used when translation_provider = deepl.'],

  // Default fallback banners/thumbnails for posts that don't have one set
  ['default_news_banner', '', 'image', 'defaults', 'Default News Banner', 'Used when a news article has no banner. Recommended: 1920×600px'],
  ['default_news_thumb', '', 'image', 'defaults', 'Default News Thumbnail', 'Used when a news article has no thumbnail. Recommended: 800×600px'],
  ['default_business_banner', '', 'image', 'defaults', 'Default Business Banner', 'Used when a business has no banner. Recommended: 1920×600px'],
  ['default_business_thumb', '', 'image', 'defaults', 'Default Business Thumbnail', 'Used when a business has no thumbnail. Recommended: 800×600px'],
  ['default_career_banner', '', 'image', 'defaults', 'Default Career Banner', 'Used when a job posting has no banner. Recommended: 1920×600px'],
  ['default_sustainability_banner', '', 'image', 'defaults', 'Default Sustainability Banner', 'Used when a sustainability page has no banner. Recommended: 1920×600px'],
  ['default_sustainability_thumb', '', 'image', 'defaults', 'Default Sustainability Thumbnail', 'Used when a sustainability page has no thumbnail. Recommended: 800×600px'],
  ['default_page_banner', '', 'image', 'defaults', 'Master Default Banner (all pages)', 'Used as fallback for ANY page (about, contact, innovation, investor, etc.) that has no banner of its own. Recommended: 1920×600px'],
  ['big_banner_tag', 'INNOVATION FOR FUTURE', 'text', 'homepage', 'Big Banner Tag', 'Small tag above title (English uppercase)'],
  ['big_banner_title', 'นวัตกรรมเพื่ออนาคตที่ดีกว่า', 'text', 'homepage', 'Big Banner Title', ''],
  ['big_banner_desc', 'ผสานเทคโนโลยี ความเชี่ยวชาญ และความใส่ใจ เพื่อสร้างคุณค่าให้กับลูกค้า สังคม และสิ่งแวดล้อม อย่างยั่งยืน', 'text', 'homepage', 'Big Banner Description', ''],
  ['big_banner_btn_text', 'เรียนรู้เพิ่มเติม', 'text', 'homepage', 'Big Banner Button Text', ''],
  ['big_banner_url', '/about', 'text', 'homepage', 'Big Banner Link URL', '']
];

const defaultMenus = [
  // Header menu
  { location: 'header', label: 'หน้าแรก', url: '/', sort_order: 1 },
  { location: 'header', label: 'เกี่ยวกับเรา', url: '/about', sort_order: 2 },
  { location: 'header', label: 'ธุรกิจของเรา', url: '/businesses', sort_order: 3 },
  { location: 'header', label: 'ความยั่งยืน', url: '/sustainability', sort_order: 4 },
  { location: 'header', label: 'นวัตกรรม', url: '/innovation', sort_order: 5 },
  { location: 'header', label: 'ข่าวสาร', url: '/news', sort_order: 6 },
  { location: 'header', label: 'นักลงทุนสัมพันธ์', url: '/investor-relations', sort_order: 7 },
  { location: 'header', label: 'ร่วมงานกับเรา', url: '/careers', sort_order: 8 },
  { location: 'header', label: 'ติดต่อเรา', url: '/contact', sort_order: 9 },

  // Footer menu 1
  { location: 'footer', label: 'เกี่ยวกับ SJC', url: '/about', sort_order: 1 },
  { location: 'footer', label: 'วิสัยทัศน์', url: '/about#vision', sort_order: 2 },
  { location: 'footer', label: 'ผู้บริหาร', url: '/about#leadership', sort_order: 3 },
  { location: 'footer', label: 'ประวัติบริษัท', url: '/about#history', sort_order: 4 },

  // Footer menu 2
  { location: 'footer_2', label: 'ธุรกิจของเรา', url: '/businesses', sort_order: 1 },
  { location: 'footer_2', label: 'ความยั่งยืน', url: '/sustainability', sort_order: 2 },
  { location: 'footer_2', label: 'นวัตกรรม', url: '/innovation', sort_order: 3 },
  { location: 'footer_2', label: 'ข่าวสาร', url: '/news', sort_order: 4 },

  // Footer menu 3
  { location: 'footer_3', label: 'ร่วมงานกับเรา', url: '/careers', sort_order: 1 },
  { location: 'footer_3', label: 'ติดต่อเรา', url: '/contact', sort_order: 2 },
  { location: 'footer_3', label: 'นักลงทุนสัมพันธ์', url: '/investor-relations', sort_order: 3 }
];

const defaultPages = [
  { slug: 'about', title: 'เกี่ยวกับเรา', banner_title: 'เกี่ยวกับ SJC', banner_subtitle: 'นวัตกรรมเพื่ออนาคตที่ยั่งยืน', sort_order: 1 },
  { slug: 'businesses', title: 'ธุรกิจของเรา', banner_title: 'ธุรกิจของเรา', banner_subtitle: 'ครอบคลุมทุกความต้องการ', sort_order: 2 },
  { slug: 'sustainability', title: 'ความยั่งยืน', banner_title: 'ความยั่งยืน', banner_subtitle: 'มุ่งมั่นสู่อนาคตที่ยั่งยืน', sort_order: 3 },
  { slug: 'innovation', title: 'นวัตกรรม', banner_title: 'นวัตกรรม', banner_subtitle: 'สร้างสรรค์ คิดค้น พัฒนา', sort_order: 4 },
  { slug: 'investor-relations', title: 'นักลงทุนสัมพันธ์', banner_title: 'นักลงทุนสัมพันธ์', banner_subtitle: 'ข้อมูลสำหรับผู้ถือหุ้น', sort_order: 5 },
  { slug: 'careers', title: 'ร่วมงานกับเรา', banner_title: 'ร่วมงานกับเรา', banner_subtitle: 'เติบโตไปพร้อมกับ SJC', sort_order: 6 },
  { slug: 'contact', title: 'ติดต่อเรา', banner_title: 'ติดต่อเรา', banner_subtitle: 'พร้อมรับฟังทุกข้อเสนอแนะ', sort_order: 7 },
  // About sub-pages (SCG-style)
  { slug: 'business-purpose', title: 'Business Purpose', banner_title: 'Business Purpose', banner_subtitle: '', sort_order: 11 },
  { slug: 'executives-and-board-of-directors', title: 'คณะกรรมการบริษัทและผู้บริหารระดับสูง', banner_title: 'คณะกรรมการบริษัทและผู้บริหารระดับสูง', banner_subtitle: '', sort_order: 12 },
  { slug: 'organization-structure', title: 'โครงสร้างองค์กร', banner_title: 'โครงสร้างองค์กร', banner_subtitle: '', sort_order: 13 },
  { slug: 'awards-and-recognition', title: 'มาตรฐานระดับโลก', banner_title: 'มาตรฐานระดับโลก', banner_subtitle: '', sort_order: 14 },
  { slug: 'milestones', title: 'ประวัติความเป็นมา', banner_title: 'ประวัติความเป็นมา', banner_subtitle: '', sort_order: 15 },
  { slug: 'corporate-governance', title: 'บรรษัทภิบาล', banner_title: 'บรรษัทภิบาล', banner_subtitle: '', sort_order: 16 },
  { slug: 'company-profile', title: 'Company Profile', banner_title: 'Company Profile', banner_subtitle: '', sort_order: 17 }
];

const defaultCategories = [
  { name: 'ข่าวบริษัท', slug: 'company-news' },
  { name: 'กิจกรรม', slug: 'activities' },
  { name: 'นวัตกรรม', slug: 'innovation' },
  { name: 'ความยั่งยืน', slug: 'sustainability' },
  { name: 'ประกาศ', slug: 'announcements' }
];

const defaultBusinesses = [
  { name: 'ธุรกิจหลัก 1', slug: 'business-1', short_description: 'คำอธิบายสั้นเกี่ยวกับธุรกิจ', sort_order: 1, featured: 1 },
  { name: 'ธุรกิจหลัก 2', slug: 'business-2', short_description: 'คำอธิบายสั้นเกี่ยวกับธุรกิจ', sort_order: 2, featured: 1 },
  { name: 'ธุรกิจหลัก 3', slug: 'business-3', short_description: 'คำอธิบายสั้นเกี่ยวกับธุรกิจ', sort_order: 3, featured: 1 },
  { name: 'ธุรกิจหลัก 4', slug: 'business-4', short_description: 'คำอธิบายสั้นเกี่ยวกับธุรกิจ', sort_order: 4, featured: 0 }
];

async function initialize() {
  console.log('→ Initializing database schema...');

  // Create tables
  for (const sql of schemas) {
    try {
      await query(sql);
    } catch (err) {
      console.error('Schema error:', err.message);
      throw err;
    }
  }
  console.log('✓ All tables created/verified');

  // ===== Migrations: add columns that might be missing on older installs =====
  const migrations = [
    "ALTER TABLE sliders ADD COLUMN video_url VARCHAR(500) NULL AFTER image",
    "ALTER TABLE sliders ADD COLUMN mobile_image VARCHAR(255) NULL AFTER image",
    "ALTER TABLE investor_documents MODIFY COLUMN category VARCHAR(64) DEFAULT 'other'",
    "ALTER TABLE investor_documents ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    // Extra content sections - added in v32 (replaces broken Page Builder)
    "ALTER TABLE news ADD COLUMN section2_heading VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section2_body LONGTEXT NULL",
    "ALTER TABLE news ADD COLUMN section2_image VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section3_heading VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section3_body LONGTEXT NULL",
    "ALTER TABLE news ADD COLUMN section3_image VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section4_heading VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section4_body LONGTEXT NULL",
    "ALTER TABLE news ADD COLUMN section4_image VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section2_heading VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section2_body LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN section2_image VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section3_heading VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section3_body LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN section3_image VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section4_heading VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section4_body LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN section4_image VARCHAR(255) NULL",
    "ALTER TABLE sustainability ADD COLUMN section2_heading VARCHAR(255) NULL",
    "ALTER TABLE sustainability ADD COLUMN section2_body LONGTEXT NULL",
    "ALTER TABLE sustainability ADD COLUMN section2_image VARCHAR(255) NULL",
    "ALTER TABLE sustainability ADD COLUMN section3_heading VARCHAR(255) NULL",
    "ALTER TABLE sustainability ADD COLUMN section3_body LONGTEXT NULL",
    "ALTER TABLE sustainability ADD COLUMN section3_image VARCHAR(255) NULL",
    "ALTER TABLE sustainability ADD COLUMN section4_heading VARCHAR(255) NULL",
    "ALTER TABLE sustainability ADD COLUMN section4_body LONGTEXT NULL",
    "ALTER TABLE sustainability ADD COLUMN section4_image VARCHAR(255) NULL",
    "ALTER TABLE careers ADD COLUMN section2_heading VARCHAR(255) NULL",
    "ALTER TABLE careers ADD COLUMN section2_body LONGTEXT NULL",
    "ALTER TABLE careers ADD COLUMN section3_heading VARCHAR(255) NULL",
    "ALTER TABLE careers ADD COLUMN section3_body LONGTEXT NULL",
    // ===== v33: English translation fields =====
    "ALTER TABLE news ADD COLUMN title_en VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN excerpt_en TEXT NULL",
    "ALTER TABLE news ADD COLUMN content_en LONGTEXT NULL",
    "ALTER TABLE news ADD COLUMN section2_heading_en VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section2_body_en LONGTEXT NULL",
    "ALTER TABLE news ADD COLUMN section3_heading_en VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section3_body_en LONGTEXT NULL",
    "ALTER TABLE news ADD COLUMN section4_heading_en VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN section4_body_en LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN name_en VARCHAR(190) NULL",
    "ALTER TABLE businesses ADD COLUMN short_description_en TEXT NULL",
    "ALTER TABLE businesses ADD COLUMN full_description_en LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN section2_heading_en VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section2_body_en LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN section3_heading_en VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section3_body_en LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN section4_heading_en VARCHAR(255) NULL",
    "ALTER TABLE businesses ADD COLUMN section4_body_en LONGTEXT NULL",
    "ALTER TABLE sustainability ADD COLUMN title_en VARCHAR(255) NULL",
    "ALTER TABLE sustainability ADD COLUMN description_en LONGTEXT NULL",
    // ===== v35: Chinese and Japanese translation fields =====
    "ALTER TABLE news ADD COLUMN title_zh VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN excerpt_zh TEXT NULL",
    "ALTER TABLE news ADD COLUMN content_zh LONGTEXT NULL",
    "ALTER TABLE news ADD COLUMN title_ja VARCHAR(255) NULL",
    "ALTER TABLE news ADD COLUMN excerpt_ja TEXT NULL",
    "ALTER TABLE news ADD COLUMN content_ja LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN name_zh VARCHAR(190) NULL",
    "ALTER TABLE businesses ADD COLUMN short_description_zh TEXT NULL",
    "ALTER TABLE businesses ADD COLUMN full_description_zh LONGTEXT NULL",
    "ALTER TABLE businesses ADD COLUMN name_ja VARCHAR(190) NULL",
    "ALTER TABLE businesses ADD COLUMN short_description_ja TEXT NULL",
    "ALTER TABLE businesses ADD COLUMN full_description_ja LONGTEXT NULL",
  ];
  for (const m of migrations) {
    try {
      await query(m);
      console.log(`✓ Migration: ${m.substring(0, 60)}...`);
    } catch (err) {
      // Ignore "duplicate column" errors — means migration already applied
      if (!err.message.includes('Duplicate column') && !err.message.includes('check that column')) {
        console.error(`Migration error: ${err.message}`);
      }
    }
  }

  // Seed default IR categories
  const irCats = [
    { slug: 'annual_report',  name: 'รายงานประจำปี',         name_en: 'Annual Reports',     sort_order: 1 },
    { slug: 'quarterly',      name: 'รายงานรายไตรมาส',        name_en: 'Quarterly Reports',  sort_order: 2 },
    { slug: 'financial',      name: 'งบการเงิน',              name_en: 'Financial Statements', sort_order: 3 },
    { slug: 'presentation',   name: 'งานนำเสนอ',              name_en: 'Presentations',      sort_order: 4 },
    { slug: 'announcement',   name: 'ประกาศ',                 name_en: 'Announcements',      sort_order: 5 },
    { slug: 'other',          name: 'เอกสารอื่นๆ',            name_en: 'Other',              sort_order: 99 }
  ];
  for (const c of irCats) {
    try {
      await query(
        `INSERT IGNORE INTO ir_categories (slug, name, name_en, sort_order, active) VALUES (?, ?, ?, ?, 1)`,
        [c.slug, c.name, c.name_en, c.sort_order]
      );
    } catch (e) { /* ignore */ }
  }
  console.log('✓ Default IR categories seeded');

  // Seed default settings
  for (const [key, value, type, group, label, desc] of defaultSettings) {
    await query(
      `INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, setting_group, label, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [key, value, type, group, label, desc]
    );
  }
  console.log('✓ Default settings seeded');

  // Seed default menus (only if empty)
  const [{ cnt: menuCount }] = await query(`SELECT COUNT(*) as cnt FROM menus`);
  if (menuCount === 0) {
    for (const m of defaultMenus) {
      await query(
        `INSERT INTO menus (location, label, url, sort_order) VALUES (?, ?, ?, ?)`,
        [m.location, m.label, m.url, m.sort_order]
      );
    }
    console.log('✓ Default menus seeded');
  }

  // Auto-add About sub-page menu items as children of "เกี่ยวกับเรา" / About Us
  // (idempotent - only adds if missing)
  try {
    const aboutParents = await query(
      `SELECT id FROM menus WHERE location = 'header' AND (url = '/about' OR label IN ('เกี่ยวกับเรา', 'About Us', 'เกี่ยวกับ SJC')) LIMIT 1`
    );
    if (aboutParents[0]) {
      const aboutId = aboutParents[0].id;
      const subItems = [
        { label: 'Business Purpose', url: '/about/business-purpose', sort_order: 1 },
        { label: 'คณะกรรมการบริษัทและผู้บริหารระดับสูง', url: '/about/executives-and-board-of-directors', sort_order: 2 },
        { label: 'โครงสร้างองค์กร', url: '/about/organization-structure', sort_order: 3 },
        { label: 'มาตรฐานระดับโลก', url: '/about/awards-and-recognition', sort_order: 4 },
        { label: 'ประวัติความเป็นมา', url: '/about/milestones', sort_order: 5 },
        { label: 'บรรษัทภิบาล', url: '/about/corporate-governance', sort_order: 6 },
        { label: 'Company Profile', url: '/company-profile', sort_order: 7 }
      ];
      for (const s of subItems) {
        // Check if any menu item exists for this URL (whether under About or not)
        const existing = await query(
          `SELECT id, parent_id, label FROM menus WHERE location = 'header' AND url = ? LIMIT 1`,
          [s.url]
        );
        if (!existing[0]) {
          await query(
            `INSERT INTO menus (location, label, url, parent_id, sort_order) VALUES ('header', ?, ?, ?, ?)`,
            [s.label, s.url, aboutId, s.sort_order]
          );
        } else {
          // Update existing - move under About + update label
          await query(
            `UPDATE menus SET label = ?, parent_id = ?, sort_order = ? WHERE id = ?`,
            [s.label, aboutId, s.sort_order, existing[0].id]
          );
        }
      }
      console.log('✓ About sub-page menu items ensured');
    }
  } catch (e) {
    console.error('Could not seed About sub-menu:', e.message);
  }

  // Seed default pages
  for (const p of defaultPages) {
    await query(
      `INSERT IGNORE INTO pages (slug, title, banner_title, banner_subtitle, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [p.slug, p.title, p.banner_title, p.banner_subtitle, p.sort_order]
    );
  }
  console.log('✓ Default pages seeded');

  // Seed content blocks for About sub-pages (SCG-style content)
  // Only seeds if no blocks exist yet for that page
  const aboutPagesContent = {
    'business-purpose': [
      { type: 'embed', body: '<div class="cb-twocol"><div><h2>Inclusive Green Growth</h2><p>ในโลกที่เผชิญกับวิกฤต ทั้งราคาพลังงานที่ผันผวน และความขัดแย้งระหว่างประเทศ ทำให้ทั่วโลกหันมาให้ความสำคัญ กับความยั่งยืนมากขึ้น เอสเจซีเดินหน้าพัฒนาธุรกิจอย่างไม่หยุดยั้ง ปรับตัวสอดรับกับบริบทโลกในทุกช่วงเวลา มุ่งสร้างความมั่นคงระยะยาว ผ่านนวัตกรรมกรีน ด้วย Deep Tech เพื่อลดการปล่อยคาร์บอนในทุกกลุ่มธุรกิจ อีกทั้งร่วมกับทุกภาคส่วนใน supply chain เพื่อสร้างการเติบโตได้ด้วยกันสู่เป้าหมาย Low Carbon, Carbon Neutrality และ Net Zero 2050 ตามแนวทาง Inclusive Green Growth ผ่านการขับเคลื่อนใน 4 มิติ</p><ol><li>องค์กรคล่องตัว ยืดหยุ่น</li><li>นวัตกรรมกรีน</li><li>องค์กรแห่งโอกาส</li><li>สร้างสังคมคาร์บอนต่ำไปด้วยกัน</li></ol></div><div><img src="/uploads/about-placeholder.jpg" alt="" style="border-radius:12px;"><blockquote style="background:rgba(232,245,240,0.6);padding:20px;border-radius:12px;margin-top:14px;font-style:italic;font-size:14px;line-height:1.7;color:#1a3a2f;">"เอสเจซี พร้อมนำความรู้ ความเชี่ยวชาญ เทคโนโลยี มาเร่งพัฒนานวัตกรรมที่เป็นมิตรต่อสิ่งแวดล้อม ลดการปล่อยก๊าซเรือนกระจก และช่วยให้การใช้ชีวิตสะดวกสบาย ปลอดภัย ตอบรับกับไลฟ์สไตล์ยุคใหม่ เพื่อให้ทุกคนทั้งเอเชียนและระดับโลก มีคุณภาพชีวิตที่ดีบนสังคม Net Zero"<br><strong style="display:block;margin-top:10px;font-style:normal;color:#1a2540;">— ธรรมศักดิ์ เศรษฐอุดม กรรมการผู้จัดการใหญ่ เอสเจซี</strong></blockquote></div></div>' },

      { type: 'embed', body: '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin:40px 0;"><div style="background:linear-gradient(135deg,#1a2540 0%,#2a3a5f 100%);color:#fff;padding:30px 24px;border-radius:12px;min-height:240px;display:flex;flex-direction:column;justify-content:flex-end;background-image:url(/uploads/about-placeholder.jpg);background-size:cover;background-position:center;background-blend-mode:overlay;"><h3 style="font-size:20px;margin:0;color:#fff;">องค์กรคล่องตัว ยืดหยุ่น</h3></div><div style="background:linear-gradient(135deg,#00937c 0%,#00b896 100%);color:#fff;padding:30px 24px;border-radius:12px;min-height:240px;display:flex;flex-direction:column;justify-content:flex-end;"><h3 style="font-size:20px;margin:0;color:#fff;">นวัตกรรมกรีน</h3></div><div style="background:linear-gradient(135deg,#c8102e 0%,#e63946 100%);color:#fff;padding:30px 24px;border-radius:12px;min-height:240px;display:flex;flex-direction:column;justify-content:flex-end;"><h3 style="font-size:20px;margin:0;color:#fff;">องค์กรแห่งโอกาส</h3></div><div style="background:linear-gradient(135deg,#0d2820 0%,#1a3a2f 100%);color:#fff;padding:30px 24px;border-radius:12px;min-height:240px;display:flex;flex-direction:column;justify-content:flex-end;"><h3 style="font-size:20px;margin:0;color:#fff;">สร้างสังคมคาร์บอนต่ำไปด้วยกัน</h3></div></div>' },

      { type: 'embed', body: '<div class="cb-stats-panel"><h3>ผลการดำเนินงานอย่างยั่งยืน</h3><p class="cb-stats-sub">เอสเจซี มุ่งสร้างผลิตภัณฑ์ที่ยั่งยืน ใส่ใจสังคมและสิ่งแวดล้อม พร้อมเป็นแรงขับเคลื่อน เพื่อรักษาทรัพยากรให้เพียงพอ ทั้งวันนี้และอนาคต</p><div class="cb-stats-grid"><div class="cb-stat-card"><div class="cb-stat-label">สัดส่วนการปล่อย GHG ต่อรายได้ เทียบเท่า/ล้านบาท</div><div class="cb-stat-value">58.48<sub>tCO2e</sub></div></div><div class="cb-stat-card"><div class="cb-stat-label">การใช้เชื้อเพลิงทดแทน ของการใช้พลังงานความร้อน</div><div class="cb-stat-value">23<sub>%</sub></div></div><div class="cb-stat-card"><div class="cb-stat-label">พลังงานไฟฟ้าหมุนเวียน ของการใช้พลังงานไฟฟ้าทั้งหมด</div><div class="cb-stat-value">21<sub>%</sub></div></div><div class="cb-stat-card"><div class="cb-stat-label">ปริมาณการปล่อย GHG Scope 1 และ 2 ลดลง 15.14% เทียบกับปีฐาน 2563</div><div class="cb-stat-value">29.06<sub>MtCO2e</sub></div></div><div class="cb-stat-card"><div class="cb-stat-label">SCGP บรรจุภัณฑ์ที่สามารถใช้ซ้ำ รีไซเคิล หรือสลายได้</div><div class="cb-stat-value">99.7<sub>%</sub></div></div></div></div>' },

      { type: 'embed', body: '<div class="cb-twocol"><div><h2>จาก Inclusive Green Growth</h2><p>แนวทาง Inclusive Green Growth ไม่ใช่กระแส จะเห็นได้ว่าโลกร้อน (Global Warming) รุนแรงขึ้นเรื่อย ๆ เพราะ "Climate change is real" ดังนั้น การเดินโตอย่างยั่งยืน หลักการคือพัฒนาผลิตภัณฑ์ที่เป็นมิตรต่อสิ่งแวดล้อม และเปลี่ยนมาใช้แหล่งพลังงานสะอาด ทั้งพลังงานแสงอาทิตย์ เชื้อเพลิงชีวมวล และพลังงานไฮโดรเจน (Green Hydrogen)</p></div><div><img src="/uploads/about-placeholder.jpg" alt="Net Zero" style="border-radius:12px;"></div></div>' },

      { type: 'embed', body: '<div class="cb-twocol right-image"><div><img src="/uploads/about-placeholder.jpg" alt="Net Zero 2050" style="border-radius:12px;"></div><div><h2>สู่ Net Zero 2050 ที่ยั่งยืน</h2><p>ESG ไม่ใช่เป็นเพียงการทำงานตามมาตรฐานสิ่งแวดล้อม แต่คือส่วนหนึ่งของการสร้างมูลค่าเพิ่มให้กับธุรกิจ ดังนั้นการผสมผสาน ESG กับกลยุทธ์ทางธุรกิจที่ทำได้จริง จะช่วยยกระดับการเติบโตที่มีความยั่งยืนในทุกมิติ พร้อมทั้งสร้างมูลค่าที่ในระยะยาว ทั้งด้านการแข่งขันและการรับมือ กับความไม่แน่นอน ตามแนวทาง Inclusive Green Growth ที่ขับเคลื่อนการเติบโตอย่างสมดุล ระหว่างผลกำไร สังคม และสิ่งแวดล้อม เพื่อให้ผู้ส่วนได้เสียมีให้ได้ว่า ทุกสถานการณ์ที่เกิดขึ้น จะข้ามผ่านไปได้ด้วยการดำเนินงานอย่างรอบคอบและเหมาะสม เพื่อให้องค์กรแห่งโอกาสอย่างเอสเจซี เติบโต ก้าวหน้าอย่างสมดุลและยั่งยืนต่อไป</p></div></div>' },

      { type: 'embed', body: '<div class="cb-awards-section"><div class="cb-awards-inner"><h2>ดำเนินธุรกิจสู่การพัฒนาอย่างยั่งยืน ตามแนวทาง ESG</h2><p>เอสเจซี ได้รับการยอมรับจากสถาบันชั้นนำของโลก ในฐานะผู้นำด้านความยั่งยืน — ความสำเร็จดังกล่าวสะท้อนถึงความมุ่งมั่นของเอสเจซี และพันธมิตรทางธุรกิจที่ไม่หยุดยั้งร่วมกันคือการเร่งพัฒนานวัตกรรมคาร์บอนต่ำ ที่มีต้นทุนแข่งขันได้ให้เป็นจริงและรวดเร็ว ให้ผู้คนมีคุณภาพชีวิตที่ดีขึ้นบนโลกที่น่าอยู่ร่วมกัน โดยที่ทุกใครไว้ข้างหลัง ส่งผลให้ธุรกิจเติบโตแข็งแกร่ง ยั่งยืน ดังคำมั่นสัญญา Inclusive Green Growth</p><div class="cb-awards-grid"><div class="cb-award-card"><h4>MSCI ESG Ratings</h4><div class="award-level">ระดับ AA</div><p>การจัดอันดับประเมินความเสี่ยง ด้านการเงิน สิ่งแวดล้อม สังคม และการกำกับแต่ละการ (ESG) จัดอันดับโดย Morgan Stanley Capital International (MSCI) ผู้ให้บริการชั้นนำระดับโลก</p></div><div class="cb-award-card"><h4>Morningstar Sustainalytics</h4><div class="award-level">2026 ESG Leader</div><p>จากการประเมินความยั่งยืนโดย Morningstar Sustainalytics ในกลุ่ม Industrial Conglomerates</p></div><div class="cb-award-card"><h4>Carbon Disclosure Project (CDP)</h4><div class="award-level">ระดับ A-</div><p>การประเมินศักยภาพ การบริหารจัดการ การเปลี่ยนแปลงสภาพภูมิอากาศระดับ A-, การบริหารจัดการน้ำ ระดับ A-</p></div><div class="cb-award-card"><h4>FTSE4Good</h4><div class="award-level">Index Series</div><p>การประเมินศักยภาพ การดำเนินธุรกิจอย่างยั่งยืน ด้านสิ่งแวดล้อม สังคม และธรรมาภิบาล เป็นสมาชิก ดัชนีความยั่งยืนระดับโลก FTSE4Good Index Series</p></div><div class="cb-award-card"><h4>Sustainability Yearbook Member</h4><div class="award-level">2026</div><p>การได้รับคัดเลือกเป็นบริษัทชั้นนำระดับโลก The Sustainability Yearbook 2026 โดย S&P Global ในสาขาอุตสาหกรรมวัสดุก่อสร้าง</p></div></div></div></div>' }
    ],
    'executives-and-board-of-directors': [
      { type: 'heading', heading: 'Leadership Team' },
      { type: 'text', body: '<p>SJC is led by an experienced Board of Directors and a senior management team dedicated to long-term, sustainable value creation. Our leaders bring deep expertise across the industries we operate in — cement and building materials, chemicals, packaging, distribution, and investment.</p>' },
      { type: 'heading', heading: 'Board of Directors' },
      { type: 'text', body: '<p>The Board provides strategic direction and oversight, ensuring SJC operates with the highest standards of corporate governance, ethics, and accountability. The Board comprises a balance of executive and independent directors with diverse skills, backgrounds, and perspectives.</p><p>Key responsibilities include:</p><ul><li>Setting the company\'s vision, mission, and long-term strategy</li><li>Overseeing risk management and internal controls</li><li>Approving major investments and capital allocation</li><li>Ensuring transparency in financial reporting</li><li>Promoting sustainable business practices and ESG performance</li></ul>' },
      { type: 'image', image_url: '/images/about-placeholder.jpg', image_alt: 'SJC Board of Directors', body: 'Our Board comprises industry leaders with deep expertise in business strategy, finance, governance, and sustainability.' },
      { type: 'heading', heading: 'Executive Committee' },
      { type: 'text', body: '<p>Our Executive Committee, led by the President & CEO, is responsible for the day-to-day management and execution of SJC\'s strategy. The team includes the Chief Financial Officer, Chief Sustainability Officer, Chief Innovation Officer, and the Presidents of each business unit.</p>' },
      { type: 'cta', heading: 'Investor Relations', body: 'For detailed information on our directors and executive officers, including profiles, qualifications, and committee memberships, please visit our Investor Relations page.', cta_text: 'View IR Information', cta_url: '/investor-relations' }
    ],
    'awards-and-recognition': [
      { type: 'heading', heading: 'A Legacy of Excellence' },
      { type: 'text', body: '<p>SJC has been recognized by leading global institutions for our commitment to sustainability, corporate governance, innovation, and operational excellence. These awards reflect the dedication of our employees and the trust of our stakeholders.</p>' },
      { type: 'heading', heading: 'Sustainability Recognition' },
      { type: 'text', body: '<p><strong>Top 1% in S&P Global ESG Score</strong> — SJC has been assessed within the top 1% with the highest scores in the construction materials industry group, according to the Corporate Sustainability Assessment (CSA) by S&P Global.</p><p><strong>ESG Industry Top Rated</strong> — Ranked first out of 125 companies worldwide in the industrial conglomerates\' category from Morningstar Sustainalytics.</p><p><strong>MSCI ESG Rating: AA (Leader)</strong> — Recognized as a leader in construction materials by Morgan Stanley Capital International.</p>' },
      { type: 'heading', heading: 'Corporate Excellence Awards' },
      { type: 'text', body: '<ul><li><strong>Thailand Corporate Excellence Awards</strong> — Recognized in multiple categories including Sustainable Development Excellence and Innovation Excellence</li><li><strong>SET Awards</strong> — Multiple wins including Best Sustainability Awards and Outstanding Investor Relations</li><li><strong>Asia Sustainability Reporting Awards</strong> — Gold for Best Sustainability Report</li><li><strong>Asia\'s Best Companies for CSR</strong> — Recognized by Corporate Governance Asia</li></ul>' },
      { type: 'image', image_url: '/images/about-placeholder.jpg', image_alt: 'SJC Awards and Recognition', body: 'Our trophy case reflects decades of commitment to excellence across all dimensions of business.' },
      { type: 'heading', heading: 'Innovation Awards' },
      { type: 'text', body: '<p>SJC is recognized as Thailand\'s leading innovation-driven enterprise:</p><ul><li><strong>Thailand\'s Most Innovative Companies</strong> — Featured in regional rankings for R&D investment and patent output</li><li><strong>National Innovation Awards</strong> — Multiple wins for breakthrough green products and circular economy solutions</li><li><strong>ASEAN Energy Awards</strong> — Recognized for renewable energy and energy efficiency innovations</li></ul>' },
      { type: 'heading', heading: 'Workplace Recognition' },
      { type: 'text', body: '<p>SJC has been ranked among the top employers in Thailand and Southeast Asia, including Top Graduate Employer of the Year and Best Companies to Work For. We invest in our people through continuous learning, career development, and an inclusive workplace culture.</p>' }
    ],
    'milestones': [
      { type: 'heading', heading: 'Our Journey' },
      { type: 'text', body: '<p>From our founding to today, SJC has grown from a single business into a diversified industrial group with operations across Southeast Asia. Each milestone reflects our commitment to innovation, sustainability, and creating long-term value for our stakeholders.</p>' },
      { type: 'heading', heading: '1913 — Foundation' },
      { type: 'text', body: '<p>SJC was founded by royal decree to set up the country\'s first cement plant. From day one, our purpose has been to build the foundations of a modern economy with quality materials and forward-looking innovation.</p>' },
      { type: 'heading', heading: '1950s — 1970s — Industrialization' },
      { type: 'text', body: '<p>SJC played a central role in the country\'s industrialization, expanding from cement into building materials, paper, and chemicals. We invested in modern manufacturing technologies and built a network of subsidiaries across the region.</p>' },
      { type: 'heading', heading: '1980s — 1990s — Regional Expansion' },
      { type: 'text', body: '<p>SJC expanded operations into neighboring countries, becoming one of the first ASEAN industrial groups with cross-border manufacturing and distribution. We listed on the Stock Exchange and established our flagship businesses in cement, chemicals, and packaging.</p>' },
      { type: 'image', image_url: '/images/about-placeholder.jpg', image_alt: 'SJC manufacturing facility', body: 'Our manufacturing footprint spans cement, chemicals, packaging, distribution, and investment businesses across ASEAN.' },
      { type: 'heading', heading: '2000s — Innovation & Sustainability' },
      { type: 'text', body: '<p>SJC formalized its commitment to sustainability with the launch of our Sustainable Development Framework. We invested heavily in R&D, opening innovation centers and developing high-value-added products with reduced environmental impact.</p>' },
      { type: 'heading', heading: '2010s — Digital Transformation' },
      { type: 'text', body: '<p>We embraced digital transformation across all business units — from smart manufacturing and predictive maintenance to e-commerce platforms and digital customer experiences. SJC also expanded into new businesses including renewable energy and smart living solutions.</p>' },
      { type: 'heading', heading: '2020s — Net Zero Commitment' },
      { type: 'text', body: '<p>SJC committed to <strong>Net Zero greenhouse gas emissions by 2050</strong>, integrating ESG 4 Plus across all business operations. We continue to lead the transition to a low-carbon economy through green products, circular economy initiatives, and clean energy investments.</p>' },
      { type: 'cta', heading: 'Learn more about our future', body: 'See our latest sustainability report and innovation roadmap.', cta_text: 'View Reports', cta_url: '/investor-relations' }
    ],
    'organization-structure': [
      { type: 'heading', heading: 'โครงสร้างองค์กร' },
      { type: 'text', body: '<p>SJC ดำเนินธุรกิจในรูปแบบการลงทุนผ่านบริษัทย่อยและบริษัทร่วมในกลุ่มธุรกิจหลัก 4 กลุ่ม ที่ครอบคลุมทั้งการผลิต การจัดจำหน่าย และการลงทุนเชิงกลยุทธ์ในภูมิภาคอาเซียน</p>' },
      { type: 'heading', heading: 'กลุ่มธุรกิจหลัก' },
      { type: 'embed', body: '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin:30px 0;"><div style="background:linear-gradient(135deg,#1a2540 0%,#2a3a5f 100%);color:#fff;padding:28px;border-radius:14px;"><h3 style="font-size:18px;color:#fff;margin:0 0 10px;">SJC Cement and Green Solutions</h3><p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;line-height:1.6;">ธุรกิจซีเมนต์ คอนกรีตผสมเสร็จ และวัสดุก่อสร้างที่เป็นมิตรต่อสิ่งแวดล้อม</p></div><div style="background:linear-gradient(135deg,#00937c 0%,#00b896 100%);color:#fff;padding:28px;border-radius:14px;"><h3 style="font-size:18px;color:#fff;margin:0 0 10px;">SJC Smart Living</h3><p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;line-height:1.6;">ธุรกิจกระเบื้อง สุขภัณฑ์ ห้องครัว และโซลูชันสมาร์ทโฮม</p></div><div style="background:linear-gradient(135deg,#c8102e 0%,#e63946 100%);color:#fff;padding:28px;border-radius:14px;"><h3 style="font-size:18px;color:#fff;margin:0 0 10px;">SJC Distribution and Retail</h3><p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;line-height:1.6;">เครือข่ายการจัดจำหน่ายและธุรกิจค้าปลีกที่ครอบคลุมหลายช่องทาง</p></div><div style="background:linear-gradient(135deg,#0d2820 0%,#1a3a2f 100%);color:#fff;padding:28px;border-radius:14px;"><h3 style="font-size:18px;color:#fff;margin:0 0 10px;">SJC Investment</h3><p style="font-size:13px;color:rgba(255,255,255,0.85);margin:0;line-height:1.6;">การลงทุนเชิงกลยุทธ์ในธุรกิจเคมิคอลส์ บรรจุภัณฑ์ และพลังงานสะอาด</p></div></div>' },
      { type: 'heading', heading: 'การกำกับดูแล' },
      { type: 'text', body: '<p>คณะกรรมการบริษัทกำกับดูแลการดำเนินงานของแต่ละกลุ่มธุรกิจผ่านคณะกรรมการเฉพาะเรื่อง ได้แก่ คณะกรรมการตรวจสอบ คณะกรรมการสรรหาและพิจารณาค่าตอบแทน คณะกรรมการธรรมาภิบาลและการพัฒนาอย่างยั่งยืน และคณะกรรมการบริหารความเสี่ยง</p>' },
      { type: 'cta', heading: 'อ่านรายงานประจำปี', body: 'ดูข้อมูลโครงสร้างกลุ่มธุรกิจและผลการดำเนินงานในรายงานประจำปีล่าสุด', cta_text: 'ดาวน์โหลดรายงาน', cta_url: '/investor-relations' }
    ],
    'company-profile': [
      { type: 'heading', heading: 'SJC at a Glance' },
      { type: 'text', body: '<p>SJC is a leading industrial conglomerate in Southeast Asia, with diversified operations spanning cement and building materials, chemicals, packaging, distribution and retail, and strategic investments. We operate across multiple countries and serve customers in more than 100 markets worldwide.</p>' },
      { type: 'heading', heading: 'Business Structure' },
      { type: 'text', body: '<p>Our portfolio is organized around four core business units, each a market leader in its industry:</p><ul><li><strong>SJC Cement and Green Solutions</strong> — Cement, ready-mix concrete, building materials, and green construction solutions</li><li><strong>SJC Smart Living</strong> — Tiles, sanitary ware, kitchens, smart-home, and lifestyle products</li><li><strong>SJC Distribution and Retail</strong> — Multi-channel distribution platforms and modern retail formats</li><li><strong>SJC Investment</strong> — Strategic investments in chemicals, packaging, clean energy, and emerging businesses</li></ul>' },
      { type: 'image', image_url: '/images/about-placeholder.jpg', image_alt: 'SJC business structure', body: 'Our diversified portfolio creates resilience and unlocks synergies across industries.' },
      { type: 'heading', heading: 'Key Numbers' },
      { type: 'text', body: '<ul><li><strong>50+ years</strong> of operations</li><li><strong>1,000+ employees</strong> across the group</li><li><strong>20+ countries</strong> of operation</li><li><strong>100+ awards</strong> received internationally</li><li><strong>Top 1%</strong> Sustainability Index — S&P Global ESG</li></ul>' },
      { type: 'heading', heading: 'Global Presence' },
      { type: 'text', body: '<p>SJC has manufacturing facilities, distribution centers, and representative offices across ASEAN, with strategic partnerships and customer relationships extending globally. Our regional optimization strategy ensures we deliver the right products and solutions to each market efficiently and sustainably.</p>' },
      { type: 'heading', heading: 'Sustainability Leadership' },
      { type: 'text', body: '<p>SJC is consistently recognized as a sustainability leader by major global rating agencies including S&P Global, MSCI, and Morningstar Sustainalytics. We integrate ESG considerations into every business decision, with the goal of creating long-term value for all stakeholders while protecting the planet.</p>' },
      { type: 'cta', heading: 'Download Company Profile PDF', body: 'Get the full company profile with detailed financials, operations, and strategic outlook.', cta_text: 'Download', cta_url: '/investor-relations' }
    ],
    'corporate-governance': [
      { type: 'heading', heading: 'Governance Framework' },
      { type: 'text', body: '<p>SJC is committed to operating with the highest standards of corporate governance, business ethics, and transparency. Our governance framework is designed to protect shareholder rights, treat all stakeholders fairly, and ensure long-term sustainable value creation.</p><p>We adhere to the principles of good corporate governance set out by the Stock Exchange, the Securities and Exchange Commission, and international best practices including the OECD Principles of Corporate Governance.</p>' },
      { type: 'heading', heading: 'The Five Principles of Good Governance' },
      { type: 'text', body: '<p>SJC\'s governance framework is built on five core principles:</p><ol><li><strong>Rights of Shareholders</strong> — Protecting and facilitating the exercise of shareholder rights</li><li><strong>Equitable Treatment of Shareholders</strong> — Ensuring equal treatment, including minority and foreign shareholders</li><li><strong>Role of Stakeholders</strong> — Recognizing the rights of all stakeholders and encouraging active cooperation</li><li><strong>Disclosure and Transparency</strong> — Timely and accurate disclosure on all material matters</li><li><strong>Responsibilities of the Board</strong> — Strategic guidance, effective monitoring of management, and accountability to shareholders</li></ol>' },
      { type: 'heading', heading: 'Board of Directors' },
      { type: 'text', body: '<p>The Board provides strategic oversight and is accountable for SJC\'s long-term success. Composition emphasizes independence, diversity, and relevant expertise. The Board operates through several specialized committees:</p><ul><li>Audit Committee</li><li>Nomination and Compensation Committee</li><li>Corporate Governance and Sustainability Committee</li><li>Risk Management Committee</li></ul>' },
      { type: 'image', image_url: '/images/about-placeholder.jpg', image_alt: 'SJC Corporate Governance', body: 'Our governance structure ensures balance, oversight, and accountability across all decision-making.' },
      { type: 'heading', heading: 'Code of Conduct' },
      { type: 'text', body: '<p>Every employee, director, and business partner is expected to operate in accordance with the SJC Code of Conduct. This document covers ethics, anti-corruption, conflicts of interest, fair competition, human rights, environmental protection, and workplace safety.</p><p>We provide regular training, maintain a clear escalation channel, and ensure consequences for violations.</p>' },
      { type: 'heading', heading: 'Whistleblower System' },
      { type: 'text', body: '<p>SJC operates an independent whistleblower channel that allows any employee, customer, supplier, or third party to confidentially report suspected violations of law, regulations, or our Code of Conduct. Reports are investigated by the Audit Committee, and we have a strict no-retaliation policy.</p>' },
      { type: 'heading', heading: 'Risk Management' },
      { type: 'text', body: '<p>SJC maintains a comprehensive Enterprise Risk Management framework that identifies, assesses, and mitigates strategic, operational, financial, and emerging risks including climate-related risks. The Risk Management Committee oversees the framework and reports to the Board.</p>' },
      { type: 'cta', heading: 'Read the full Corporate Governance Manual', body: 'Detailed policies, procedures, and committee charters are available in the IR section.', cta_text: 'View Documents', cta_url: '/investor-relations' }
    ]
  };

  // Insert/refresh blocks. Uses a version marker so we can force a re-seed
  // when content changes (e.g. switching from v18 simple text to v20 SCG-style).
  // Bump ABOUT_CONTENT_VERSION to trigger a clean re-seed.
  const ABOUT_CONTENT_VERSION = 'v26-scg';
  let currentVer = '';
  try {
    const verRows = await query(`SELECT setting_value FROM settings WHERE setting_key = 'about_content_version' LIMIT 1`);
    currentVer = verRows[0] ? verRows[0].setting_value : '';
  } catch(e) {}

  const needsReseed = currentVer !== ABOUT_CONTENT_VERSION;
  if (needsReseed) {
    console.log(`Re-seeding About content blocks (current=${currentVer || 'none'} -> ${ABOUT_CONTENT_VERSION})`);
  }

  for (const [pageSlug, blocks] of Object.entries(aboutPagesContent)) {
    const pageRows = await query('SELECT id FROM pages WHERE slug = ? LIMIT 1', [pageSlug]);
    if (!pageRows[0]) continue;
    const pageId = pageRows[0].id;
    if (needsReseed) {
      // Clear old blocks - new SCG-style content replaces them
      await query('DELETE FROM content_blocks WHERE parent_type = ? AND parent_id = ?', ['page', pageId]);
    } else {
      // Standard idempotent skip
      const existing = await query(
        'SELECT COUNT(*) as cnt FROM content_blocks WHERE parent_type = ? AND parent_id = ?',
        ['page', pageId]
      );
      if (existing[0] && existing[0].cnt > 0) continue;
    }
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      await query(
        `INSERT INTO content_blocks (parent_type, parent_id, block_type, heading, body, image_url, image_alt, cta_text, cta_url, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        ['page', pageId, b.type, b.heading || null, b.body || null, b.image_url || null, b.image_alt || null, b.cta_text || null, b.cta_url || null, i]
      );
    }
  }

  // Mark version as current so we don't re-seed on next restart
  if (needsReseed) {
    try {
      await query(
        `INSERT INTO settings (setting_key, setting_value, setting_type, setting_group, label) VALUES (?, ?, 'string', 'system', 'About content version') ON DUPLICATE KEY UPDATE setting_value = ?`,
        ['about_content_version', ABOUT_CONTENT_VERSION, ABOUT_CONTENT_VERSION]
      );
    } catch(e) {
      console.error('Could not save about_content_version:', e.message);
    }
  }
  console.log('✓ About sub-pages content seeded');

  // Seed news categories
  for (const c of defaultCategories) {
    await query(
      `INSERT IGNORE INTO news_categories (name, slug) VALUES (?, ?)`,
      [c.name, c.slug]
    );
  }
  console.log('✓ Default categories seeded');

  // Seed sample businesses
  const [{ cnt: bizCount }] = await query(`SELECT COUNT(*) as cnt FROM businesses`);
  if (bizCount === 0) {
    for (const b of defaultBusinesses) {
      await query(
        `INSERT INTO businesses (name, slug, short_description, sort_order, featured) VALUES (?, ?, ?, ?, ?)`,
        [b.name, b.slug, b.short_description, b.sort_order, b.featured]
      );
    }
    console.log('✓ Sample businesses seeded');
  }

  // Seed sample sliders
  const [{ cnt: sliderCount }] = await query(`SELECT COUNT(*) as cnt FROM sliders`);
  if (sliderCount === 0) {
    const sampleSliders = [
      ['นวัตกรรมเพื่ออนาคต', 'สร้างสรรค์สิ่งใหม่ทุกวัน', 'SJC ก้าวสู่ผู้นำด้านนวัตกรรม ด้วยเทคโนโลยีและความคิดสร้างสรรค์', '/images/slide-1-placeholder.jpg', 'เรียนรู้เพิ่มเติม', '/about', 'left', 1],
      ['ความยั่งยืน', 'เพื่อโลกที่ดีกว่า', 'มุ่งมั่นพัฒนาเพื่อสร้างความยั่งยืนในทุกมิติ', '/images/slide-2-placeholder.jpg', 'ดูรายละเอียด', '/sustainability', 'center', 2],
      ['ร่วมงานกับเรา', 'เติบโตไปด้วยกัน', 'มาเป็นส่วนหนึ่งของทีม SJC ร่วมสร้างสิ่งดีๆ ด้วยกัน', '/images/slide-3-placeholder.jpg', 'สมัครงาน', '/careers', 'right', 3]
    ];
    for (const s of sampleSliders) {
      await query(
        `INSERT INTO sliders (title, subtitle, description, image, button_text, button_url, text_position, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        s
      );
    }
    console.log('✓ Sample sliders seeded');
  }

  // Seed sample news
  const [{ cnt: newsCount }] = await query(`SELECT COUNT(*) as cnt FROM news`);
  if (newsCount === 0) {
    const sampleNews = [
      ['ข่าวประชาสัมพันธ์ล่าสุด', 'sample-news-1', 'ข่าวสำคัญจากบริษัท', '<p>เนื้อหาข่าวตัวอย่าง สามารถแก้ไขได้จากระบบหลังบ้าน</p>', '/images/news-placeholder.jpg', 1, 1],
      ['กิจกรรม CSR ประจำปี', 'sample-news-2', 'กิจกรรมเพื่อสังคม', '<p>เนื้อหาข่าวตัวอย่าง สามารถแก้ไขได้จากระบบหลังบ้าน</p>', '/images/news-placeholder.jpg', 1, 1],
      ['รางวัลแห่งความสำเร็จ', 'sample-news-3', 'ความภาคภูมิใจของเรา', '<p>เนื้อหาข่าวตัวอย่าง สามารถแก้ไขได้จากระบบหลังบ้าน</p>', '/images/news-placeholder.jpg', 0, 1],
      ['นวัตกรรมใหม่ล่าสุด', 'sample-news-4', 'เทคโนโลยีเพื่ออนาคต', '<p>เนื้อหาข่าวตัวอย่าง สามารถแก้ไขได้จากระบบหลังบ้าน</p>', '/images/news-placeholder.jpg', 0, 1]
    ];
    for (const n of sampleNews) {
      await query(
        `INSERT INTO news (title, slug, excerpt, content, thumbnail, featured, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        n
      );
    }
    console.log('✓ Sample news seeded');
  }

  // Create initial admin user
  const [{ cnt: userCount }] = await query(`SELECT COUNT(*) as cnt FROM users`);
  if (userCount === 0) {
    const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@sjc.local';
    const pass = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeMe123!';
    const name = process.env.INITIAL_ADMIN_NAME || 'Administrator';
    const hash = await bcrypt.hash(pass, 12);
    await query(
      `INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, 'admin')`,
      [email, hash, name]
    );
    console.log(`✓ Initial admin created: ${email}`);
    console.log(`  Password: ${pass} (CHANGE THIS IMMEDIATELY)`);
  }

  console.log('✓ Database initialization complete');
}

module.exports = { initialize, DEFAULT_SETTINGS: defaultSettings };
