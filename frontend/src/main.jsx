import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Code2,
  FileUp,
  LayoutDashboard,
  LogIn,
  ShieldCheck,
  Users
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const demoUsers = {
  candidate: { email: 'candidate@cloudhire.dev', password: 'password123' },
  recruiter: { email: 'recruiter@cloudhire.dev', password: 'password123' },
  admin: { email: 'admin@cloudhire.dev', password: 'password123' }
};

const fallbackAssessments = [
  {
    id: 'demo-1',
    title: 'Frontend React Challenge',
    role: 'Frontend Engineer',
    difficulty: 'medium',
    durationMinutes: 75,
    description: 'Build a responsive scheduling dashboard with candidate status filters.'
  },
  {
    id: 'demo-2',
    title: 'Backend API Design',
    role: 'Backend Engineer',
    difficulty: 'hard',
    durationMinutes: 90,
    description: 'Design REST APIs for assessments, resume uploads, and recruiter analytics.'
  },
  {
    id: 'demo-3',
    title: 'SQL Debugging Sprint',
    role: 'Full Stack Engineer',
    difficulty: 'easy',
    durationMinutes: 45,
    description: 'Optimize interview query reports and explain indexing tradeoffs.'
  }
];

function App() {
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem('cloudhire-session');
    return stored ? JSON.parse(stored) : null;
  });
  const [assessments, setAssessments] = useState(fallbackAssessments);
  const [applications, setApplications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [message, setMessage] = useState('Demo mode is ready. Login connects to the API when Docker is running.');

  const role = session?.user?.role || 'guest';
  const stats = useMemo(() => buildStats(assessments, applications, analytics), [assessments, applications, analytics]);

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async function login(nextRole) {
    try {
      const data = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoUsers[nextRole])
      }).then(async response => {
        if (!response.ok) throw new Error('API unavailable');
        return response.json();
      });

      localStorage.setItem('cloudhire-session', JSON.stringify(data));
      setSession(data);
      setMessage(`Signed in as ${data.user.name}.`);
      await refresh(data.token, data.user.role);
    } catch {
      const offlineSession = {
        token: '',
        user: { name: `${capitalize(nextRole)} Demo`, role: nextRole, email: demoUsers[nextRole].email }
      };
      localStorage.setItem('cloudhire-session', JSON.stringify(offlineSession));
      setSession(offlineSession);
      setMessage('API is offline, so the interface is showing seeded demo data.');
    }
  }

  async function refresh(token = session?.token, activeRole = session?.user?.role) {
    if (!token) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const assessmentData = await fetch(`${API_URL}/assessments`, { headers }).then(response => response.json());
      setAssessments(assessmentData.assessments || fallbackAssessments);

      if (activeRole === 'candidate') {
        const data = await fetch(`${API_URL}/applications/mine/list`, { headers }).then(response => response.json());
        setApplications(data.applications || []);
      }

      if (activeRole === 'recruiter' || activeRole === 'admin') {
        const [apps, metrics] = await Promise.all([
          fetch(`${API_URL}/applications`, { headers }).then(response => response.json()),
          fetch(`${API_URL}/analytics/recruiter`, { headers }).then(response => response.json())
        ]);
        setApplications(apps.applications || []);
        setAnalytics(metrics);
      }
    } catch {
      setMessage('Could not refresh from API. Keeping local demo data visible.');
    }
  }

  async function createAssessment(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get('title'),
      role: form.get('role'),
      description: form.get('description'),
      durationMinutes: Number(form.get('durationMinutes')),
      difficulty: form.get('difficulty'),
      prompt: form.get('prompt'),
      language: 'javascript',
      starterCode: 'export function solution(input) {\n  return input;\n}'
    };

    if (!session?.token) {
      setAssessments([{ ...payload, id: crypto.randomUUID() }, ...assessments]);
      setMessage('Assessment added locally. Start Docker to persist it in PostgreSQL.');
      event.currentTarget.reset();
      return;
    }

    try {
      const data = await request('/assessments', { method: 'POST', body: JSON.stringify(payload) });
      setAssessments([data.assessment, ...assessments]);
      setMessage('Assessment created and coding test attached.');
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function applyToAssessment(id) {
    if (!session?.token) {
      setApplications([{ id, title: 'Local application', status: 'submitted', submittedAt: new Date().toISOString() }]);
      setMessage('Application staged locally. Start Docker to upload resumes.');
      return;
    }

    try {
      const data = await request(`/applications/${id}`, { method: 'POST', body: new FormData() });
      setApplications([data.application, ...applications]);
      setMessage('Application submitted.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  function logout() {
    localStorage.removeItem('cloudhire-session');
    setSession(null);
    setApplications([]);
    setAnalytics(null);
    setMessage('Signed out.');
  }

  return (
    <main>
      <aside className="sidebar">
        <div className="brand">
          <Cloud size={28} />
          <span>CloudHire</span>
        </div>
        <nav>
          <a className="active"><LayoutDashboard size={18} /> Dashboard</a>
          <a><ClipboardList size={18} /> Assessments</a>
          <a><FileUp size={18} /> Applications</a>
          <a><BarChart3 size={18} /> Analytics</a>
        </nav>
        <div className="session-card">
          <ShieldCheck size={20} />
          <strong>{role.toUpperCase()}</strong>
          <span>{session?.user?.email || 'Choose a demo login'}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Cloud-native interview platform</p>
            <h1>Assessment operations for candidates, recruiters, and admins</h1>
          </div>
          <div className="login-row">
            {Object.keys(demoUsers).map(item => (
              <button key={item} onClick={() => login(item)} className={role === item ? 'selected' : ''}>
                <LogIn size={16} /> {capitalize(item)}
              </button>
            ))}
            {session && <button onClick={logout}>Logout</button>}
          </div>
        </header>

        <div className="notice">{message}</div>

        <section className="metrics">
          {stats.map(stat => (
            <article key={stat.label}>
              <stat.icon size={22} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel wide">
            <div className="panel-heading">
              <h2>Open Assessments</h2>
              <span>{assessments.length} active</span>
            </div>
            <div className="assessment-list">
              {assessments.map(item => (
                <article className="assessment" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <div className="chips">
                      <span>{item.role}</span>
                      <span>{item.difficulty}</span>
                      <span>{item.durationMinutes} min</span>
                    </div>
                  </div>
                  {role === 'candidate' && (
                    <button onClick={() => applyToAssessment(item.id)}>
                      <CheckCircle2 size={16} /> Apply
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>

          {(role === 'recruiter' || role === 'admin') && (
            <form className="panel form-panel" onSubmit={createAssessment}>
              <h2>Create Assessment</h2>
              <input name="title" placeholder="Assessment title" required />
              <input name="role" placeholder="Hiring role" required />
              <textarea name="description" placeholder="Assessment description" required />
              <div className="form-row">
                <input name="durationMinutes" type="number" min="15" defaultValue="60" required />
                <select name="difficulty" defaultValue="medium">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <textarea name="prompt" placeholder="Coding test prompt" required />
              <button><Code2 size={16} /> Publish</button>
            </form>
          )}

          <div className="panel">
            <div className="panel-heading">
              <h2>{role === 'candidate' ? 'My Applications' : 'Recruiter Funnel'}</h2>
              <span>{applications.length} records</span>
            </div>
            <div className="timeline">
              {(applications.length ? applications : demoTimeline(role)).map(item => (
                <article key={item.id || item.status}>
                  <strong>{item.assessmentTitle || item.title || item.status}</strong>
                  <span>{item.candidateName || item.status || 'submitted'}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function buildStats(assessments, applications, analytics) {
  return [
    { label: 'Assessments', value: assessments.length, icon: ClipboardList },
    { label: 'Applications', value: analytics?.totals?.applications ?? applications.length, icon: Users },
    { label: 'Avg Score', value: analytics?.totals?.averageScore ? `${analytics.totals.averageScore}%` : '82%', icon: BarChart3 },
    { label: 'Roles', value: '3', icon: BriefcaseBusiness }
  ];
}

function demoTimeline(role) {
  if (role === 'candidate') {
    return [
      { id: 't1', title: 'Frontend React Challenge', status: 'submitted' },
      { id: 't2', title: 'Backend API Design', status: 'in_review' }
    ];
  }

  return [
    { id: 't1', assessmentTitle: 'Frontend React Challenge', candidateName: 'Aarav Candidate' },
    { id: 't2', assessmentTitle: 'SQL Debugging Sprint', candidateName: 'Meera Shah' }
  ];
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

createRoot(document.getElementById('root')).render(<App />);
