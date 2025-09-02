import jwt from 'jsonwebtoken';

/**
 * Simple JWT authentication middleware. Expects the Authorization header to
 * contain a Bearer token. When verified the decoded payload is attached
 * to req.user. If verification fails the request is rejected.
 */
export function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}