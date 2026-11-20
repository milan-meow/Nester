const express = require('express');
const { asyncHandler, authenticate } = require('@nestar/common');

function bookingRoutes(service, jwtSecret) {
  const router = express.Router();
  router.use(authenticate(jwtSecret)); // every booking route needs a logged-in user

  router.post('/', asyncHandler(async (req, res) => {
    res.status(201).json({ booking: await service.create(req.user, req.body) });
  }));

  router.get('/mine', asyncHandler(async (req, res) => res.json({ items: await service.mine(req.user) })));

  router.get('/incoming', asyncHandler(async (req, res) => {
    res.json({ items: await service.incoming(req.user, req.query.status) });
  }));

  router.get('/:id', asyncHandler(async (req, res) => res.json({ booking: await service.get(req.user, req.params.id) })));

  router.patch('/:id/status', asyncHandler(async (req, res) => {
    res.json({ booking: await service.changeStatus(req.user, req.params.id, req.body) });
  }));

  return router;
}

module.exports = { bookingRoutes };
