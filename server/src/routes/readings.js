     const router = require('express').Router();
     const auth = require('../middleware/auth');
     const c = require('../controllers/readings');
     router.use(auth);
     router.post('/', c.create);
     router.get('/', c.list);
     router.put('/:id', c.update);
     router.delete('/:id', c.remove);
     module.exports = router;