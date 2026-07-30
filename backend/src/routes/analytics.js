import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/recruiter', requireAuth, requireRole('recruiter', 'admin'), async (_req, res, next) => {
  try {
    const [{ rows: totals }, { rows: funnel }, { rows: topAssessments }] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int AS applications,
          COUNT(*) FILTER (WHERE status = 'shortlisted')::int AS shortlisted,
          COUNT(*) FILTER (WHERE status = 'hired')::int AS hired,
          ROUND(AVG(score))::int AS "averageScore"
        FROM applications
      `),
      query(`
        SELECT status, COUNT(*)::int AS count
        FROM applications
        GROUP BY status
        ORDER BY count DESC
      `),
      query(`
        SELECT a.title, COUNT(app.id)::int AS submissions
        FROM assessments a
        LEFT JOIN applications app ON app.assessment_id = a.id
        GROUP BY a.id
        ORDER BY submissions DESC, a.created_at DESC
        LIMIT 5
      `)
    ]);

    res.json({
      totals: totals[0],
      funnel,
      topAssessments
    });
  } catch (error) {
    next(error);
  }
});

export default router;
