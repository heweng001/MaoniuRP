import { getSessionUser, ROLES } from './authService.js';

export function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return req.headers['x-auth-token'] || '';
}

export function requireAuth() {
  return async (req, res, next) => {
    try {
      const token = getTokenFromRequest(req);
      const user = await getSessionUser(token);
      if (!user) {
        return res.status(401).json({ success: false, message: '请先登录' });
      }
      req.user = user;
      req.authToken = token;
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: error.message || '认证失败' });
    }
  };
}

export function requireAdmin() {
  return (req, res, next) => {
    if (req.user?.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, message: '仅管理员可执行此操作' });
    }
    return next();
  };
}
