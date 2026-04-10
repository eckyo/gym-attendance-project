export const injectGymId = (req, res, next) => {
  if (!req.user?.gymId) {
    return res.status(500).json({ error: 'gymId missing from token — auth middleware not applied' });
  }
  req.gymId = req.user.gymId;
  next();
};
