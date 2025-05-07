exports.verifyRole = (...allowedRoles) => {
    return (req, res, next) => {
      if (!allowedRoles.includes(req.user.role)) return res.sendStatus(403);
      next();
    };
  };