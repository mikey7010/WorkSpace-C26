const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireHr(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'hr_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'HR Administrator access required.' });
    }
    next();
  });
}

const requireAdmin = requireHr;

module.exports = { requireAuth, requireHr, requireAdmin };
