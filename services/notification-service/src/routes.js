const express = require('express');
const { asyncHandler, authenticate, notFound } = require('@nestar/common');

function notificationRoutes(notifications, jwtSecret) {
  const router = express.Router();
  router.use(authenticate(jwtSecret));

  router.get('/', asyncHandler(async (req, res) => {
    const filter = { userId: req.user.id };
    if (req.query.unread === 'true') filter.read = false;
    const [items, unreadCount] = await Promise.all([
      notifications.find(filter, { limit: 50 }),
      notifications.count({ userId: req.user.id, read: false }),
    ]);
    res.json({ items, unreadCount });
  }));

  router.patch('/read-all', asyncHandler(async (req, res) => {
    const updated = await notifications.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ updated });
  }));

  router.patch('/:id/read', asyncHandler(async (req, res) => {
    const n = await notifications.findById(req.params.id);
    // Someone else's notification → 404, not 403, so ids can't be probed.
    if (!n || n.userId !== req.user.id) throw notFound('Notification not found');
    res.json({ notification: await notifications.updateById(n.id, { read: true }) });
  }));

  return router;
}

module.exports = { notificationRoutes };
