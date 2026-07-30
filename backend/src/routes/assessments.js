import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { redis } from '../redis.js';

const router = Router();

const assessmentSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  role: z.string().min(2),
  durationMinutes: z.number().int().positive(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  prompt: z.string().min(10),
  language: z.string().min(2),
  starterCode: z.string().min(1)
});

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const cacheKey = 'assessments:list';

    if (redis.status === 'ready') {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const { rows } = await query(`
      SELECT a.id, a.title, a.description, a.role, a.duration_minutes AS "durationMinutes",
             a.difficulty, a.created_at AS "createdAt", u.name AS "createdBy"
      FROM assessments a
      LEFT JOIN users u ON u.id = a.created_by
      ORDER BY a.created_at DESC
    `);

    if (redis.status === 'ready') {
      await redis.set(cacheKey, JSON.stringify({ assessments: rows }), 'EX', 30);
    }

    return res.json({ assessments: rows });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.id, a.title, a.description, a.role, a.duration_minutes AS "durationMinutes",
              a.difficulty, ct.prompt, ct.language, ct.starter_code AS "starterCode"
       FROM assessments a
       LEFT JOIN coding_tests ct ON ct.assessment_id = a.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Assessment not found' });
    return res.json({ assessment: rows[0] });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAuth, requireRole('recruiter', 'admin'), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const payload = assessmentSchema.parse(req.body);
    await client.query('BEGIN');

    const assessment = await client.query(
      `INSERT INTO assessments (title, description, role, duration_minutes, difficulty, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, role, duration_minutes AS "durationMinutes", difficulty`,
      [
        payload.title,
        payload.description,
        payload.role,
        payload.durationMinutes,
        payload.difficulty,
        req.user.sub
      ]
    );

    await client.query(
      `INSERT INTO coding_tests (assessment_id, prompt, language, starter_code)
       VALUES ($1, $2, $3, $4)`,
      [assessment.rows[0].id, payload.prompt, payload.language, payload.starterCode]
    );

    await client.query('COMMIT');
    if (redis.status === 'ready') await redis.del('assessments:list');

    return res.status(201).json({ assessment: assessment.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally {
    client.release();
  }
});

export default router;
