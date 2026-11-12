const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/reports');

router.use(auth);
router.get('/daily', c.daily);
router.get('/month-to-date', c.monthToDate);
router.get('/monthly', c.monthly);

module.exports = router;