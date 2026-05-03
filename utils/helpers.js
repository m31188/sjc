const slugify = require('slugify');
const sanitizeHtml = require('sanitize-html');

// Generate URL-safe slug supporting Thai
function makeSlug(text) {
  if (!text) return '';
  // For Thai text, slugify might return empty; fallback to timestamp
  const slug = slugify(text, {
    lower: true,
    strict: false,
    locale: 'th',
    remove: /[*+~.()'"!:@?#]/g
  });
  if (!slug || slug.length < 2) {
    return 'item-' + Date.now().toString(36);
  }
  return slug.substring(0, 200);
}

// Sanitize rich text HTML (from TinyMCE/Quill)
function sanitizeContent(html) {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'iframe',
      'img', 'span', 'figure', 'figcaption', 'u', 's'
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style', 'class'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen'],
      '*': ['style', 'class', 'id']
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'www.google.com'],
    allowedSchemes: ['http', 'https', 'mailto', 'tel']
  });
}

// Format date for Thai locale (Buddhist Era)
function formatThaiDate(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543; // Buddhist Era
  if (options.short) {
    return `${day}/${d.getMonth() + 1}/${year}`;
  }
  return `${day} ${month} ${year}`;
}

// Format Gregorian date
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-GB');
}

// Truncate text for excerpts
function truncate(text, length = 150) {
  if (!text) return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  if (stripped.length <= length) return stripped;
  return stripped.substring(0, length).trim() + '...';
}

// Escape HTML for safe output
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format file size
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = {
  makeSlug,
  sanitizeContent,
  formatThaiDate,
  formatDate,
  truncate,
  escapeHtml,
  formatFileSize
};
