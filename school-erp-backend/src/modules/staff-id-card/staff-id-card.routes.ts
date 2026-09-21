import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  getAllIDCards,
  getIDCardById,
  searchStaff,
  printIDCard,
  getStatistics,
} from './staff-id-card.controller';

export const staffIDCardRoutes = Router();
const router = staffIDCardRoutes;

// ⚠️ Every route below — including printIDCard — MUST go through
// `authenticate` for req.user to be populated. If printIDCard was
// previously registered without it (which is why the old code had to
// manually decode a JWT from the query string as a workaround), that's
// almost certainly why print doesn't work now: req.user is undefined,
// so it silently falls back to DEFAULT_TENANT_ID and the lookup
// fails/404s for any staff member not in that tenant.
router.get('/', authenticate, getAllIDCards);
router.get('/search', authenticate, searchStaff);
router.get('/statistics', authenticate, getStatistics);
router.get('/print/:staffId', authenticate, printIDCard);
router.get('/:staffId', authenticate, getIDCardById);