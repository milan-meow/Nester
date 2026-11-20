const express = require('express');
const { asyncHandler, authenticate } = require('@nestar/common');

function authRoutes(service, jwtSecret) {
  const router = express.Router();
  const auth = authenticate(jwtSecret);

  router.post('/register', asyncHandler(async (req, res) => {
    res.status(201).json(await service.register(req.body));
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    res.json(await service.login(req.body));
  }));

  router.get('/me', auth, asyncHandler(async (req, res) => {
    res.json({ user: await service.me(req.user.id) });
  }));

  router.patch('/me', auth, asyncHandler(async (req, res) => {
    res.json(await service.updateMe(req.user.id, req.body));
  }));

  router.get('/users/:id', asyncHandler(async (req, res) => {
    res.json({ user: await service.publicProfile(req.params.id) });
  }));

  return router;
}

module.exports = { authRoutes };
