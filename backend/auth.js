// Simple authentication middleware. In a real deployment you should
// integrate with Clerk, Auth.js or your existing system. This stub
// attaches a static user id to every request so development can
// proceed without a login flow.

export function authenticate(req, _res, next) {
  // TODO: replace with real authentication logic. For now we always
  // assign a fake user to illustrate project isolation. If you
  // integrate with Clerk/Auth.js you can extract the user id from
  // req.session or req.auth.
  req.user = { id: '00000000-0000-0000-0000-000000000000' };
  next();
}