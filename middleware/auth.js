// Auth middleware - protects admin routes

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error', 'กรุณาเข้าสู่ระบบ');
    return res.redirect(`/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}/auth/login`);
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect(`/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}/auth/login`);
    }
    if (!roles.includes(req.session.user.role)) {
      req.flash('error', 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
      return res.redirect(`/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}/dashboard`);
    }
    next();
  };
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect(`/${process.env.ADMIN_SLUG || 'sjc-control-panel-x7k2'}/dashboard`);
  }
  next();
}

module.exports = { requireAuth, requireRole, redirectIfAuth };
