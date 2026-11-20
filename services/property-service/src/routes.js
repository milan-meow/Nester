const express = require('express');
const { asyncHandler, authenticate, requireRole, requireInternalKey } = require('@nestar/common');

function propertyRoutes(service, jwtSecret) {
  const router = express.Router();
  const auth = authenticate(jwtSecret);

  router.get('/', asyncHandler(async (req, res) => res.json(await service.search(req.query))));

  // Must be declared before "/:id", otherwise Express treats "mine" as an id.
  router.get('/mine', auth, asyncHandler(async (req, res) => res.json({ items: await service.mine(req.user) })));

  router.get('/:id', asyncHandler(async (req, res) => res.json({ property: await service.get(req.params.id) })));

  router.post('/', auth, requireRole('owner', 'admin'), asyncHandler(async (req, res) => {
    res.status(201).json({ property: await service.create(req.user, req.body) });
  }));

  router.patch('/:id', auth, asyncHandler(async (req, res) => {
    res.json({ property: await service.update(req.user, req.params.id, req.body) });
  }));

  router.delete('/:id', auth, asyncHandler(async (req, res) => {
    await service.remove(req.user, req.params.id);
    res.status(204).end();
  }));

  return router;
}

function internalRoutes(service, internalKey) {
  const router = express.Router();
  router.use(requireInternalKey(internalKey));
  router.get('/properties/:id', asyncHandler(async (req, res) => res.json({ property: await service.get(req.params.id) })));
  router.patch('/properties/:id/status', asyncHandler(async (req, res) => {
    res.json({ property: await service.setStatus(req.params.id, req.body) });
  }));
  return router;
}

module.exports = { propertyRoutes, internalRoutes };
