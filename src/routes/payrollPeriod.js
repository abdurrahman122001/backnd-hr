// backend/src/routes/payrollPeriods.js
const router = require('express').Router();
const {
  getPayrollPeriod,
  createPayrollPeriod,
  updatePayrollPeriod,
  deletePayrollPeriod
} = require('../controllers/payrollPeriodController');

router.get('/', getPayrollPeriod);
router.post('/', createPayrollPeriod);
router.put('/:id', updatePayrollPeriod);
router.delete('/:id', deletePayrollPeriod);

module.exports = router;
