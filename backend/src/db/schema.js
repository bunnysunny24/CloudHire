import bcrypt from 'bcryptjs';
import { query } from './pool.js';

export async function migrate() {
  await query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter', 'admin')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      role TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
      difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS coding_tests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      language TEXT NOT NULL,
      starter_code TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      resume_path TEXT,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'shortlisted', 'rejected', 'hired')),
      score INTEGER CHECK (score BETWEEN 0 AND 100),
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(candidate_id, assessment_id)
    );
  `);

  await seed();
}

async function seed() {
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM users');
  if (rows[0].count > 0) return;

  const passwordHash = await bcrypt.hash('password123', 10);
  const users = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES
      ('Aarav Candidate', 'candidate@cloudhire.dev', $1, 'candidate'),
      ('Riya Recruiter', 'recruiter@cloudhire.dev', $1, 'recruiter'),
      ('Admin User', 'admin@cloudhire.dev', $1, 'admin')
     RETURNING id, role`,
    [passwordHash]
  );

  const recruiter = users.rows.find(user => user.role === 'recruiter');
  await query(
    `INSERT INTO assessments (title, description, role, duration_minutes, difficulty, created_by)
     VALUES
      ('Frontend React Challenge', 'Build a responsive interview scheduling dashboard.', 'Frontend Engineer', 75, 'medium', $1),
      ('Backend API Design', 'Design REST APIs for assessments, uploads, and analytics.', 'Backend Engineer', 90, 'hard', $1),
      ('SQL Debugging Sprint', 'Optimize queries and explain indexing choices.', 'Full Stack Engineer', 45, 'easy', $1)`,
    [recruiter.id]
  );

  await query(
    `INSERT INTO coding_tests (assessment_id, prompt, language, starter_code)
     SELECT id, 'Implement the required feature and include edge-case handling.', 'javascript', 'export function solution(input) {\\n  return input;\\n}'
     FROM assessments`
  );
}
