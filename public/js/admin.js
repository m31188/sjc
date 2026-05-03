// SJC Admin Panel JavaScript

document.addEventListener('DOMContentLoaded', function() {

  // ===== Sidebar toggle (mobile) =====
  const sidebar = document.getElementById('adminSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarClose = document.getElementById('sidebarClose');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
    document.body.style.overflow = '';
  }
  if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeSidebar);

  // ===== User dropdown =====
  const userMenu = document.getElementById('userMenu');
  if (userMenu) {
    const toggle = userMenu.querySelector('.user-toggle');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => userMenu.classList.remove('open'));
  }

  // ===== Sortable tables (drag & drop reorder) =====
  if (typeof Sortable !== 'undefined') {
    document.querySelectorAll('.sortable').forEach(el => {
      const tableName = el.dataset.tableName;
      Sortable.create(el, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: () => {
          const items = Array.from(el.querySelectorAll('[data-id]')).map(r => r.dataset.id);
          fetch('/api/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ table: tableName, items })
          }).then(r => r.json()).then(data => {
            if (data.success) showToast('จัดเรียงเรียบร้อย', 'success');
          }).catch(() => showToast('เกิดข้อผิดพลาด', 'error'));
        }
      });
    });
  }

  // ===== Status toggle (active/inactive) =====
  document.querySelectorAll('.status-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const table = btn.dataset.table;
      const id = btn.dataset.id;
      try {
        const res = await fetch('/api/toggle-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table, id })
        });
        const data = await res.json();
        if (data.success) {
          btn.classList.toggle('active');
          const wasActive = btn.classList.contains('active');
          // Update text based on table type
          if (table === 'news') btn.textContent = wasActive ? 'เผยแพร่' : 'แบบร่าง';
          else if (table === 'careers') btn.textContent = wasActive ? 'เปิดรับ' : 'ปิด';
          else btn.textContent = wasActive ? 'เปิด' : 'ปิด';
          showToast('อัปเดตเรียบร้อย', 'success');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด', 'error');
      }
    });
  });

  // ===== File upload preview =====
  document.querySelectorAll('.upload-area input[type="file"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const wrap = input.closest('.upload-area');
      const text = wrap.querySelector('span');
      if (text) text.textContent = '✓ ' + file.name;
      wrap.style.borderColor = 'var(--success)';
      wrap.style.background = 'rgba(40,167,69,0.05)';

      // Show preview if image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          let preview = wrap.parentElement.querySelector('.upload-preview');
          if (!preview) {
            preview = document.createElement('div');
            preview.className = 'current-image upload-preview';
            wrap.parentElement.insertBefore(preview, wrap);
          }
          preview.innerHTML = `<img src="${ev.target.result}" alt=""><small>ภาพใหม่ที่เลือก</small>`;
        };
        reader.readAsDataURL(file);
      }
    });
  });

  // ===== Toast notifications =====
  window.showToast = function(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle');
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // ===== Auto-dismiss flash messages =====
  document.querySelectorAll('.alert').forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });

  // ===== Confirm before leaving page if form is dirty =====
  let formDirty = false;
  document.querySelectorAll('form').forEach(form => {
    if (form.querySelector('button[type="submit"]')) {
      form.addEventListener('change', () => { formDirty = true; });
      form.addEventListener('input', () => { formDirty = true; });
      form.addEventListener('submit', () => { formDirty = false; });
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (formDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

});

// Toast CSS injected
const toastCss = `
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: white;
  padding: 14px 20px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  z-index: 9999;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s;
  border-left: 4px solid var(--primary);
}
.toast.show { opacity: 1; transform: translateY(0); }
.toast-success { border-left-color: #28a745; color: #155724; }
.toast-success i { color: #28a745; }
.toast-error { border-left-color: #dc3545; color: #721c24; }
.toast-error i { color: #dc3545; }
.sortable-ghost { opacity: 0.4; background: #f0f0f0; }
.alert { transition: opacity 0.3s, transform 0.3s; }
`;
const styleEl = document.createElement('style');
styleEl.textContent = toastCss;
document.head.appendChild(styleEl);

// ===== Homepage Manager: clear background image =====
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.hpm-bg-clear-btn');
  if (!btn) return;
  e.preventDefault();
  const url = btn.getAttribute('data-url');
  const msg = btn.getAttribute('data-confirm') || 'Clear?';
  if (!url) return;
  if (!confirm(msg)) return;

  fetch(url, {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin'
  }).then(() => {
    location.reload();
  }).catch(err => {
    alert('Error: ' + err.message);
  });
});

// ===== Homepage Manager: prevent form submit issues + show loading state =====
document.addEventListener('DOMContentLoaded', function() {
  const hpmForm = document.querySelector('.hpm-form');
  if (!hpmForm) return;

  hpmForm.addEventListener('submit', function(e) {
    const btn = hpmForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      // Re-enable in case server is slow / never comes back
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
      }, 30000);
    }
  });
});

// ===== Auto-attach media library picker to image upload fields =====
// Adds a "Choose from library" button next to every <input type="file" accept="image/...">
document.addEventListener('DOMContentLoaded', function() {
  // Skip on the media library list page itself
  if (location.pathname.endsWith('/media')) return;

  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(function(input) {
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    // Only for image inputs (not PDF/video uploads)
    if (!accept.includes('image') && accept !== '') return;
    if (input.dataset.libraryAttached) return;
    input.dataset.libraryAttached = '1';

    const inputName = input.getAttribute('name');
    if (!inputName) return;

    // Create the "Choose from library" button
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'media-picker-btn';
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:#f5f6f8;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;color:#1a2540;cursor:pointer;margin-top:6px;text-decoration:none;';
    btn.innerHTML = '<i class="fas fa-photo-film"></i> Choose from library';

    btn.addEventListener('click', function() {
      // Open picker - the callback receives the selected URL
      window.openMediaPicker(function(url) {
        // Find or create a sibling hidden input that holds the URL
        // (so the form submits the URL even when no file is chosen)
        const existingHidden = input.parentElement.querySelector('input[type="hidden"][data-from-library="' + inputName + '"]');
        let hidden = existingHidden;
        if (!hidden) {
          hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = inputName + '_url';
          hidden.dataset.fromLibrary = inputName;
          input.parentElement.appendChild(hidden);
        }
        hidden.value = url;

        // Update preview if visible
        const preview = input.parentElement.querySelector('.image-preview, .img-preview, .hpm-image-preview, [data-image-preview]');
        if (preview) {
          let img = preview.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.style.cssText = 'max-width:200px;border-radius:6px;';
            preview.appendChild(img);
          }
          img.src = url;
        } else {
          // Create a small inline preview right after the input
          const newPreview = document.createElement('div');
          newPreview.className = 'image-preview';
          newPreview.style.cssText = 'margin-top:8px;';
          newPreview.innerHTML = '<img src="' + url + '" style="max-width:200px;border-radius:6px;border:1px solid #e5e7eb;"><div style="font-size:11px;color:#6b7280;margin-top:4px;">From library: ' + url + '</div>';
          input.parentElement.appendChild(newPreview);
        }

        // Clear the file input (we're using URL now)
        try { input.value = ''; } catch(e) {}
      });
    });

    // Insert button right after the file input
    if (input.parentElement) {
      input.insertAdjacentElement('afterend', btn);
    }
  });
});
