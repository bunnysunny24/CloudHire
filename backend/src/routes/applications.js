import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  }
});

const statusSchema = z.object({
  status: z.enum(['submitted', 'in_review', 'shortlisted', 'rejected', 'hired']),
  score: z.number().int().min(0).max(100).optional()
});

router.post('/:assessmentId', requireAuth, requireRole('candidate'), upload.single('resume'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `INSERT INTO applications (candidate_id, assessment_id, resume_path)
       VALUES ($1, $2, $3)
       RETURNING id, assessment_id AS "assessmentId", resume_path AS "resumePath", status, submitted_at AS "submittedAt"`,
      [req.user.sub, req.params.assessmentId, req.file?.path || null]
    );

    res.status(201).json({ application: rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/mine/list', requireAuth, requireRole('candidate'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT app.id, app.status, app.score, app.submitted_at AS "submittedAt",
              a.title, a.role, a.difficulty
       FROM applications app
       JOIN assessments a ON a.id = app.assessment_id
       WHERE app.candidate_id = $1
       ORDER BY app.submitted_at DESC`,
      [req.user.sub]
    );

    res.json({ applications: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, requireRole('recruiter', 'admin'), async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT app.id, app.status, app.score, app.resume_path AS "resumePath", app.submitted_at AS "submittedAt",
             candidate.name AS "candidateName", candidate.email AS "candidateEmail",
             a.title AS "assessmentTitle", a.role
      FROM applications app
      JOIN users candidate ON candidate.id = app.candidate_id
      JOIN assessments a ON a.id = app.assessment_id
      ORDER BY app.submitted_at DESC
    `);

    res.json({ applications: rows });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, requireRole('recruiter', 'admin'), async (req, res, next) => {
  try {
    const payload = statusSchema.parse(req.body);
    const { rows } = await query(
      `UPDATE applications
       SET status = $1, score = COALESCE($2, score)
       WHERE id = $3
       RETURNING id, status, score`,
      [payload.status, payload.score ?? null, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ message: 'Application not found' });
    return res.json({ application: rows[0] });
  } catch (error) {
    return next(error);
  }
});

export default router;
