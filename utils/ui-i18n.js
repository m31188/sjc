// utils/ui-i18n.js
// Static UI string translations for the public frontend (TH/EN/ZH/JA).
// Used via res.locals.tUI(key) in templates.
// Add new strings here as you find untranslated text.

const STRINGS = {
  // ===== Navigation / Menu =====
  'nav.home':          { th: 'หน้าแรก',          en: 'Home',              zh: '首页',         ja: 'ホーム' },
  'nav.about':         { th: 'เกี่ยวกับเรา',     en: 'About',             zh: '关于我们',     ja: '会社について' },
  'nav.businesses':    { th: 'ธุรกิจของเรา',     en: 'Our Businesses',    zh: '我们的业务',   ja: '事業内容' },
  'nav.sustainability':{ th: 'ความยั่งยืน',      en: 'Sustainability',    zh: '可持续发展',   ja: '持続可能性' },
  'nav.innovation':    { th: 'นวัตกรรม',         en: 'Innovation',        zh: '创新',         ja: 'イノベーション' },
  'nav.news':          { th: 'ข่าวสาร',          en: 'News',              zh: '新闻',         ja: 'ニュース' },
  'nav.investor':      { th: 'นักลงทุนสัมพันธ์', en: 'Investor Relations',zh: '投资者关系',   ja: '投資家情報' },
  'nav.careers':       { th: 'ร่วมงานกับเรา',    en: 'Careers',           zh: '招聘',         ja: '採用情報' },
  'nav.contact':       { th: 'ติดต่อเรา',        en: 'Contact',           zh: '联系我们',     ja: 'お問い合わせ' },

  // ===== Common Actions =====
  'btn.read_more':     { th: 'อ่านเพิ่มเติม',    en: 'Read more',         zh: '了解更多',     ja: '続きを読む' },
  'btn.learn_more':    { th: 'เรียนรู้เพิ่มเติม',en: 'Learn more',        zh: '了解更多',     ja: '詳しく見る' },
  'btn.view_all':      { th: 'ดูทั้งหมด',        en: 'View all',          zh: '查看全部',     ja: 'すべて見る' },
  'btn.view_details':  { th: 'ดูรายละเอียด',     en: 'View details',      zh: '查看详情',     ja: '詳細を見る' },
  'btn.explore':       { th: 'สำรวจ',            en: 'Explore',           zh: '探索',         ja: '探索' },
  'btn.submit':        { th: 'ส่ง',              en: 'Submit',            zh: '提交',         ja: '送信' },
  'btn.send':          { th: 'ส่งข้อความ',       en: 'Send Message',      zh: '发送消息',     ja: 'メッセージを送る' },
  'btn.apply':         { th: 'สมัครงาน',         en: 'Apply now',         zh: '立即申请',     ja: '今すぐ応募' },
  'btn.download':      { th: 'ดาวน์โหลด',        en: 'Download',          zh: '下载',         ja: 'ダウンロード' },
  'btn.visit_website': { th: 'เยี่ยมชมเว็บไซต์', en: 'Visit website',     zh: '访问网站',     ja: 'ウェブサイトへ' },
  'btn.back_to_news':  { th: 'กลับสู่ข่าวสาร',   en: 'Back to news',      zh: '返回新闻',     ja: 'ニュース一覧へ' },
  'btn.back':          { th: 'กลับ',             en: 'Back',              zh: '返回',         ja: '戻る' },
  'btn.search':        { th: 'ค้นหา',            en: 'Search',            zh: '搜索',         ja: '検索' },
  'btn.subscribe':     { th: 'สมัครสมาชิก',      en: 'Subscribe',         zh: '订阅',         ja: '購読' },

  // ===== Page banners / breadcrumbs =====
  'page.news_title':   { th: 'ข่าวสารและกิจกรรม',en: 'News & Events',     zh: '新闻和活动',   ja: 'ニュースとイベント' },
  'page.news_subtitle':{ th: 'ติดตามความเคลื่อนไหวล่าสุด', en: 'Stay updated with our latest activities', zh: '关注我们的最新动态', ja: '最新の活動情報をお届けします' },
  'page.businesses_title': { th: 'ธุรกิจของเรา', en: 'Our Businesses',   zh: '我们的业务',   ja: '事業内容' },
  'page.businesses_subtitle': { th: 'กลุ่มธุรกิจที่หลากหลาย ขับเคลื่อนด้วยนวัตกรรม', en: 'A diversified group driven by innovation', zh: '多元化业务,以创新为动力', ja: 'イノベーションで多角的に展開' },
  'page.sustainability_title': { th: 'ความยั่งยืน', en: 'Sustainability',  zh: '可持续发展',   ja: '持続可能性' },
  'page.about_title':  { th: 'เกี่ยวกับเรา',     en: 'About us',          zh: '关于我们',     ja: '会社について' },
  'page.innovation_title': { th: 'นวัตกรรม',     en: 'Innovation',        zh: '创新',         ja: 'イノベーション' },
  'page.contact_title':{ th: 'ติดต่อเรา',        en: 'Contact us',        zh: '联系我们',     ja: 'お問い合わせ' },
  'page.investor_title':{ th: 'นักลงทุนสัมพันธ์',en: 'Investor Relations',zh: '投资者关系',   ja: '投資家情報' },
  'page.careers_title':{ th: 'ร่วมงานกับเรา',    en: 'Careers at SJC',    zh: 'SJC 职业机会', ja: 'SJC でのキャリア' },
  'page.detail':       { th: 'รายละเอียด',       en: 'Detail',            zh: '详情',         ja: '詳細' },

  // ===== Homepage sections =====
  'home.welcome':      { th: 'ยินดีต้อนรับ',     en: 'Welcome to SJC',    zh: '欢迎来到 SJC', ja: 'SJC へようこそ' },
  'home.our_businesses_eyebrow': { th: 'ธุรกิจของเรา', en: 'OUR BUSINESSES', zh: '我们的业务', ja: '事業内容' },
  'home.what_we_do':   { th: 'สิ่งที่เราทำ',     en: 'What we do',        zh: '业务领域',     ja: '事業領域' },
  'home.what_we_do_desc': { th: 'กลุ่มธุรกิจหลากหลายที่ขับเคลื่อนด้วยนวัตกรรมและความยั่งยืน ส่งมอบคุณภาพและคุณค่าครอบคลุมหลายอุตสาหกรรม', en: 'A diversified group driven by innovation and sustainability, delivering quality and value across multiple industries.', zh: '我们是一家多元化集团,以创新和可持续发展为动力,在多个行业提供优质产品和价值。', ja: 'イノベーションと持続可能性を原動力とする多角的なグループとして、複数の業界で品質と価値を提供しています。' },
  'home.business_units': { th: 'หน่วยธุรกิจ',   en: 'Business Units',    zh: '业务单元',     ja: '事業ユニット' },
  'home.years_experience': { th: 'ปีประสบการณ์',en: 'Years Experience',  zh: '年经验',       ja: '年の経験' },
  'home.explore_all':  { th: 'ดูธุรกิจทั้งหมด', en: 'Explore all businesses', zh: '探索全部业务', ja: 'すべての事業を見る' },
  'home.latest_news':  { th: 'ข่าวสารล่าสุด',   en: 'Latest News',       zh: '最新新闻',     ja: '最新ニュース' },
  'home.highlights':   { th: 'ไฮไลต์',          en: 'Highlights',        zh: '亮点',         ja: 'ハイライト' },
  'home.sustainability_eyebrow': { th: 'ความยั่งยืน', en: 'SUSTAINABILITY', zh: '可持续发展', ja: '持続可能性' },

  // ===== News =====
  'news.published':    { th: 'เผยแพร่เมื่อ',    en: 'Published',         zh: '发布于',       ja: '公開日' },
  'news.author':       { th: 'ผู้เขียน',         en: 'Author',            zh: '作者',         ja: '著者' },
  'news.share':        { th: 'แชร์',             en: 'Share',             zh: '分享',         ja: 'シェア' },
  'news.related':      { th: 'ข่าวที่เกี่ยวข้อง',en: 'Related news',      zh: '相关新闻',     ja: '関連ニュース' },
  'news.tags':         { th: 'แท็ก',             en: 'Tags',              zh: '标签',         ja: 'タグ' },
  'news.no_news':      { th: 'ยังไม่มีข่าวสาร',  en: 'No news yet',       zh: '暂无新闻',     ja: 'ニュースはまだありません' },
  'news.all_categories': { th: 'ทั้งหมด',        en: 'All',               zh: '全部',         ja: 'すべて' },

  // ===== Contact form =====
  'contact.heading':   { th: 'ติดต่อเรา',        en: 'Get in touch',      zh: '联系我们',     ja: 'お問い合わせ' },
  'contact.name':      { th: 'ชื่อ-นามสกุล',     en: 'Full name',         zh: '姓名',         ja: 'お名前' },
  'contact.email':     { th: 'อีเมล',            en: 'Email',             zh: '邮箱',         ja: 'メールアドレス' },
  'contact.phone':     { th: 'เบอร์โทรศัพท์',   en: 'Phone',             zh: '电话',         ja: '電話番号' },
  'contact.subject':   { th: 'หัวข้อ',           en: 'Subject',           zh: '主题',         ja: '件名' },
  'contact.message':   { th: 'ข้อความ',          en: 'Message',           zh: '留言',         ja: 'メッセージ' },
  'contact.address':   { th: 'ที่อยู่',          en: 'Address',           zh: '地址',         ja: '住所' },
  'contact.business_hours': { th: 'เวลาทำการ',  en: 'Business hours',    zh: '营业时间',     ja: '営業時間' },
  'contact.required':  { th: 'จำเป็นต้องกรอก',  en: 'Required',          zh: '必填',         ja: '必須' },

  // ===== Careers =====
  'careers.position':  { th: 'ตำแหน่ง',          en: 'Position',          zh: '职位',         ja: 'ポジション' },
  'careers.location':  { th: 'สถานที่',          en: 'Location',          zh: '地点',         ja: '勤務地' },
  'careers.type':      { th: 'ประเภท',           en: 'Type',              zh: '类型',         ja: '雇用形態' },
  'careers.posted':    { th: 'ประกาศเมื่อ',      en: 'Posted',            zh: '发布日期',     ja: '掲載日' },
  'careers.apply_now': { th: 'สมัครเลย',         en: 'Apply now',         zh: '立即申请',     ja: '今すぐ応募' },
  'careers.no_jobs':   { th: 'ยังไม่มีตำแหน่งงานเปิดรับ', en: 'No open positions at the moment', zh: '目前没有空缺职位', ja: '現在募集中のポジションはありません' },
  'careers.requirements': { th: 'คุณสมบัติ',    en: 'Requirements',      zh: '任职要求',     ja: '応募資格' },

  // ===== Footer =====
  'footer.quick_links':{ th: 'ลิงก์ด่วน',        en: 'Quick links',       zh: '快速链接',     ja: 'クイックリンク' },
  'footer.connect':    { th: 'ติดตามเรา',        en: 'Connect',           zh: '关注我们',     ja: 'フォロー' },
  'footer.copyright':  { th: 'สงวนลิขสิทธิ์',    en: 'All rights reserved', zh: '版权所有',   ja: '全著作権所有' },
  'footer.subscribe':  { th: 'รับข่าวสาร',       en: 'Newsletter',        zh: '订阅',         ja: 'ニュースレター' },
  'footer.subscribe_placeholder': { th: 'อีเมลของคุณ', en: 'Your email', zh: '您的邮箱',     ja: 'メールアドレス' },

  // ===== Investor =====
  'investor.financial_reports': { th: 'รายงานทางการเงิน', en: 'Financial Reports', zh: '财务报告', ja: '財務報告' },
  'investor.annual_reports':    { th: 'รายงานประจำปี',   en: 'Annual Reports',   zh: '年度报告', ja: '年次報告' },
  'investor.documents':         { th: 'เอกสาร',          en: 'Documents',        zh: '文件',     ja: '資料' },
  'investor.stock_info':        { th: 'ข้อมูลหุ้น',      en: 'Stock Information',zh: '股票信息', ja: '株式情報' },

  // ===== Search / pagination =====
  'pagination.previous': { th: 'ก่อนหน้า',       en: 'Previous',          zh: '上一页',       ja: '前へ' },
  'pagination.next':     { th: 'ถัดไป',          en: 'Next',              zh: '下一页',       ja: '次へ' },
  'pagination.page':     { th: 'หน้า',           en: 'Page',              zh: '第',           ja: 'ページ' },

  // ===== Misc =====
  'misc.loading':      { th: 'กำลังโหลด...',     en: 'Loading...',        zh: '加载中...',    ja: '読み込み中...' },
  'misc.no_results':   { th: 'ไม่พบผลลัพธ์',     en: 'No results found',  zh: '未找到结果',   ja: '結果が見つかりません' },
  'misc.thank_you':    { th: 'ขอบคุณ',           en: 'Thank you',         zh: '谢谢',         ja: 'ありがとうございます' },
  'misc.welcome':      { th: 'ยินดีต้อนรับ',     en: 'Welcome',           zh: '欢迎',         ja: 'ようこそ' },
};

// Returns translated string for the given key + lang.
// Fallback chain: requested lang -> Thai -> key itself
function tUI(key, lang) {
  const entry = STRINGS[key];
  if (!entry) return key; // missing key - return key so dev sees it
  if (entry[lang]) return entry[lang];
  return entry.th || key;
}

module.exports = { tUI, STRINGS };
