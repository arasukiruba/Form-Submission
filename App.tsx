
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { analyzeForm, submitResponse } from './services/formService';
import { getUniqueTamilFirstName, resetNameHistory, initializeNamePool } from './services/nameService';
import { api } from './services/apiService';
import { FormStructure, Question, QuestionType, SubmissionResult, QuestionWeights, AuthState, User, PRICING_PLANS } from './types';

// --- STYLES ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  :root {
    /* Premium Color Palette */
    --primary: #4F46E5;
    --primary-dark: #4338CA;
    --primary-light: #E0E7FF;
    --secondary: #0F172A;
    --accent: #8B5CF6;
    
    --surface: #FFFFFF;
    --surface-alt: #F8FAFC;
    --background: #F1F5F9;
    
    --text-main: #0F172A;
    --text-muted: #64748B;
    --text-light: #94A3B8;
    
    --border: #E2E8F0;
    --success: #10B981;
    --success-bg: #ECFDF5;
    --success-text: #065F46;
    --error: #EF4444;
    --error-bg: #FEF2F2;
    --error-text: #991B1B;
    --warning: #F59E0B;

    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 24px;
    
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    --shadow-glow: 0 0 20px rgba(79, 70, 229, 0.15);
  }

  * { box-sizing: border-box; }
  
  body { 
    font-family: 'Inter', sans-serif; 
    background: var(--background); 
    color: var(--text-main); 
    margin: 0; 
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    -webkit-font-smoothing: antialiased;
  }
  
  /* Shared Layout */
  .container { 
    width: 100%;
    max-width: 1100px; 
    margin: 0 auto; 
    padding: 32px 20px; 
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* Landing Page Specific Styles */
  .landing-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; }
  .landing-hero { text-align: center; max-width: 800px; margin: 60px auto 40px; animation: fadeIn 0.6s ease-out; }
  .hero-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; background: var(--primary-light); color: var(--primary); border-radius: 99px; font-size: 0.85rem; font-weight: 600; margin-bottom: 24px; }
  .hero-title { font-size: 3.5rem; line-height: 1.1; font-weight: 800; margin-bottom: 24px; background: linear-gradient(135deg, var(--text-main) 0%, var(--primary) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.03em; }
  .hero-subtitle { font-size: 1.25rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; }
  .hero-actions { display: flex; gap: 16px; justify-content: center; margin-bottom: 60px; }
  .hero-btn { padding: 16px 32px; border-radius: var(--radius-lg); font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
  .hero-btn-primary { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
  .hero-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(79, 70, 229, 0.4); background: var(--primary-dark); }
  .hero-btn-secondary { background: white; color: var(--text-main); border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
  .hero-btn-secondary:hover { border-color: var(--primary); color: var(--primary); background: var(--surface-alt); }
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; width: 100%; margin-bottom: 60px; animation: fadeIn 0.8s ease-out; }
  .feature-card { background: white; padding: 32px 24px; border-radius: var(--radius-xl); border: 1px solid var(--border); transition: all 0.3s; text-align: left; }
  .feature-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); border-color: var(--primary-light); }
  .feature-icon { width: 48px; height: 48px; background: var(--primary-light); color: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 1.5rem; }
  .feature-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main); }
  .feature-desc { font-size: 0.95rem; color: var(--text-muted); line-height: 1.5; }
  .landing-footer { margin-top: auto; padding-top: 40px; border-top: 1px solid var(--border); width: 100%; display: flex; flex-direction: column; align-items: center; gap: 20px; justify-content: center; }
  .admin-link { color: var(--text-light); font-size: 0.9rem; text-decoration: none; font-weight: 500; transition: color 0.2s; background: none; border: none; cursor: pointer; }
  .admin-link:hover { color: var(--primary); }

  @media (max-width: 768px) {
    .hero-title { font-size: 2.5rem; }
    .features-grid { grid-template-columns: 1fr; }
    .hero-actions { flex-direction: column; }
    .hero-btn { width: 100%; }
  }

  /* Dashboard & General UI Components */
  .card { 
    background: var(--surface); 
    border-radius: var(--radius-lg); 
    padding: 40px; 
    box-shadow: var(--shadow-md); 
    margin-bottom: 24px; 
    animation: fadeIn 0.4s ease-out;
    border: 1px solid var(--border);
    position: relative;
  }
  
  .card-header { text-align: center; margin-bottom: 32px; }
  h1 { font-size: 2.5rem; margin: 0 0 16px 0; color: var(--text-main); font-weight: 800; }
  h2 { font-size: 1.5rem; color: var(--text-main); margin-bottom: 24px; font-weight: 700; }
  h3 { font-size: 1.125rem; color: var(--text-main); margin: 0 0 8px 0; font-weight: 600; }
  p { color: var(--text-muted); line-height: 1.6; margin-bottom: 24px; }
  
  .btn {
    width: 100%; padding: 14px; border: none; border-radius: var(--radius-md);
    font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    margin-bottom: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-primary { background: var(--primary); color: white; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3); }
  .btn-primary:hover:not(:disabled) { transform: translateY(-2px); background: var(--primary-dark); }
  .btn-secondary { background: white; border: 1px solid var(--border); color: var(--text-main); }
  .btn-secondary:hover { border-color: var(--primary); color: var(--primary); background: var(--surface-alt); }
  .btn-danger { background: var(--error); color: white; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3); }
  .btn-danger:hover { transform: translateY(-2px); background: #DC2626; }
  
  input, select {
    width: 100%; padding: 12px 16px; margin-bottom: 20px; border: 1px solid var(--border); 
    border-radius: var(--radius-md); font-size: 0.95rem; background: white; color: var(--text-main);
  }
  input:focus, select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-light); }
  
  .switch { position: relative; display: inline-block; width: 44px; height: 24px; margin-right: 12px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
  input:checked + .slider { background-color: var(--primary); }
  input:checked + .slider:before { transform: translateX(20px); }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  
  .plan-card {
    border: 2px solid var(--border); padding: 24px; border-radius: var(--radius-lg);
    cursor: pointer; transition: all 0.2s; text-align: center; background: white;
  }
  .plan-card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: var(--shadow-md); }
  .plan-selected { border-color: var(--primary); background: var(--primary-light); }
  .plan-price { font-size: 2rem; font-weight: 800; color: var(--primary); margin: 12px 0; }
  
  .navbar {
    background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border);
    padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100;
  }
  .nav-logo { font-weight: 800; font-size: 1.25rem; color: var(--primary); }
  
  .badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
  .badge-active { background: #dcfce7; color: #15803d; }
  .badge-pending { background: #fef9c3; color: #a16207; }
  .badge-disabled { background: #fee2e2; color: #b91c1c; }
  .badge-purple { background: #f3e8ff; color: #6b21a8; }
  .badge-gray { background: #f1f5f9; color: #475569; border: 1px solid var(--border); }

  /* New Automation Dashboard Specifics */
  .q-card {
    background: white; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 24px; margin-bottom: 20px;
    transition: all 0.2s ease;
  }
  .q-card:hover { border-color: var(--primary); box-shadow: var(--shadow-sm); }
  
  .q-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
  .q-title { font-weight: 600; font-size: 1.05rem; color: var(--text-main); flex: 1; display: flex; gap: 8px; }
  
  .opt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .opt-row { 
    display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; 
    border-radius: 8px; background: var(--surface-alt); border: 1px solid transparent; transition: all 0.2s;
  }
  .opt-row:focus-within { background: white; border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
  .opt-val { font-size: 0.9rem; font-weight: 500; color: var(--text-main); word-break: break-word; }
  
  .opt-input-wrapper { position: relative; width: 80px; flex-shrink: 0; }
  .opt-input-wrapper input { 
    margin: 0; padding: 6px 24px 6px 8px; text-align: right; font-weight: 700; color: var(--primary); 
    border: 1px solid var(--border); border-radius: 6px; height: 36px; font-family: 'JetBrains Mono', monospace; 
  }
  .opt-input-wrapper span { position: absolute; right: 8px; top: 9px; color: var(--text-muted); font-size: 0.75rem; pointer-events: none; }
  
  .weight-footer {
    display: flex; justify-content: flex-end; align-items: center; gap: 16px;
    margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border);
  }
  .total-pill {
    font-size: 0.85rem; font-weight: 700; padding: 6px 14px; border-radius: 99px;
    display: flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace;
  }
  .total-valid { background: var(--success-bg); color: var(--success-text); border: 1px solid rgba(16, 185, 129, 0.3); }
  .total-invalid { background: var(--error-bg); color: var(--error-text); border: 1px solid rgba(239, 68, 68, 0.3); }

  .terminal-container { 
    background: #0f172a; border-radius: var(--radius-lg); border: 1px solid #334155; 
    overflow: hidden; box-shadow: var(--shadow-lg); display: flex; flex-direction: column;
  }
  .terminal-header { 
    background: #1e293b; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #334155;
  }
  .terminal-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .t-red { background: #EF4444; } .t-yellow { background: #F59E0B; } .t-green { background: #10B981; }
  
  .terminal-body { 
    padding: 20px; height: 320px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; 
    font-size: 0.85rem; color: #e2e8f0; 
  }
  .log-entry { display: grid; grid-template-columns: 80px 50px auto; gap: 12px; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.05); }
  .log-ts { color: #64748B; font-size: 0.75rem; }
  .log-id { color: #38BDF8; font-weight: 600; }
  .log-status { font-weight: 700; text-transform: uppercase; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; }
  .log-status.success { background: rgba(16, 185, 129, 0.2); color: #34D399; }
  .log-status.error { background: rgba(239, 68, 68, 0.2); color: #F87171; }

  /* Table - Compact for Admin Dashboard */
  .table-container { overflow-x: auto; border-radius: var(--radius-md); border: 1px solid var(--border); background: white; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--text-main); }
  thead { background: #f1f5f9; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`;

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, user: null, role: null });
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'admin-login' | 'dashboard' | 'admin-dashboard'>('landing');

  const login = (user: User, role: 'admin' | 'user') => {
    setAuth({ isAuthenticated: true, user, role });
    setView(role === 'admin' ? 'admin-dashboard' : 'dashboard');
  };

  const logout = () => {
    setAuth({ isAuthenticated: false, user: null, role: null });
    setView('landing');
  };

  return (
    <>
      <style>{styles}</style>
      {auth.isAuthenticated && (
        <nav className="navbar">
          <div className="nav-logo">FormGenie Pro</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{auth.user?.name || 'Administrator'}</div>
              {auth.role === 'user' && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Credits: <strong style={{color: 'var(--primary)'}}>{auth.user?.creditsRemaining}</strong></div>}
            </div>
            <button onClick={logout} className="btn-secondary" style={{ padding: '8px 16px', margin: 0, fontSize: '0.9rem', width: 'auto' }}>
              Sign Out
            </button>
          </div>
        </nav>
      )}

      <div className="container">
        {view === 'landing' && <LandingView setView={setView} />}
        {view === 'admin-login' && <AdminLogin onLogin={login} setView={setView} />}
        {view === 'login' && <UserLogin onLogin={login} setView={setView} />}
        {view === 'register' && <UserRegistration setView={setView} />}
        {view === 'admin-dashboard' && <AdminDashboard />}
        {view === 'dashboard' && auth.user && <UserDashboard user={auth.user} updateCredits={(c) => setAuth(prev => ({...prev, user: {...prev.user!, creditsRemaining: c}}))} />}
      </div>
    </>
  );
};

// --- VIEW COMPONENTS ---

const LandingView = ({ setView }: { setView: (v: any) => void }) => (
  <div className="landing-wrapper">
    <div className="landing-hero">
      <div className="hero-badge">✨ AI-Powered Google Form Automation</div>
      <h1 className="hero-title">Automate Submissions with Human-Like Precision</h1>
      <p className="hero-subtitle">
        Generate thousands of randomized, weighted, and context-aware responses in minutes. 
        Completely undetectable. powered by Gemini AI.
      </p>
      
      <div className="hero-actions">
        <button className="hero-btn hero-btn-primary" onClick={() => setView('login')}>
          Login to Dashboard
        </button>
        <button className="hero-btn hero-btn-secondary" onClick={() => setView('register')}>
          Get Credits & Start
        </button>
      </div>
    </div>

    <div className="features-grid">
      <div className="feature-card">
        <div className="feature-icon">⚡</div>
        <h3 className="feature-title">Intelligent Randomization</h3>
        <p className="feature-desc">Set custom probability weights for every option. Ensure data distribution matches your exact research requirements.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon">🤖</div>
        <h3 className="feature-title">Generative AI Answers</h3>
        <p className="feature-desc">Leverage Gemini AI to write unique, context-aware paragraphs and short answers that pass manual review.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon">🛡️</div>
        <h3 className="feature-title">Identity Management</h3>
        <p className="feature-desc">Auto-generates consistent profiles (Name, Gender, Email) for every submission to maintain data integrity.</p>
      </div>
    </div>

    <div className="landing-footer">
      <button className="admin-link" onClick={() => setView('admin-login')}>
        Administrator Portal
      </button>
      <a href="https://wa.me/917708414584" target="_blank" rel="noopener noreferrer" 
         style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '8px', 
             color: '#25D366', 
             textDecoration: 'none', 
             fontWeight: 600, 
             fontSize: '0.95rem',
             marginTop: '10px',
             padding: '8px 16px',
             background: 'rgba(37, 211, 102, 0.1)',
             borderRadius: '50px',
             transition: 'all 0.2s'
         }}>
         <span style={{ fontSize: '1.2rem' }}>💬</span> Contact on WhatsApp: +91 77084 14584
      </a>
    </div>
  </div>
);

const AdminLogin = ({ onLogin, setView }: { onLogin: any, setView: any }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const result = await api.login(id, pw); 
      if (result.role === 'admin') {
         onLogin(result, 'admin');
      } else {
         setErr('This login is for administrators only.');
      }
    } catch(e: any) {
       setErr(e.message || 'Invalid Credentials');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', width: '100%' }}>
      <div className="card">
        <div className="card-header">
          <h2>Admin Access</h2>
          <p>Restricted area for system administrators.</p>
        </div>
        {err && <div className="error-box">{err}</div>}
        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input value={id} onChange={e => setId(e.target.value)} type="text" placeholder="Enter admin username" />
          <label>Password</label>
          <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="••••••••" />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setView('landing')}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

const UserLogin = ({ onLogin, setView }: { onLogin: any, setView: any }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    try {
      const user = await api.login(id, pw);
      if (user.role === 'admin') throw new Error("Please use Admin Login for admin accounts.");
      
      // Fetch names immediately after successful login
      try {
        const names = await api.getNames();
        initializeNamePool(names);
      } catch (poolErr) {
        console.error("Name pool init failed", poolErr);
        throw new Error("Login successful, but failed to load Name Database. Please check connection or admin.");
      }

      onLogin(user, 'user');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', width: '100%' }}>
      <div className="card">
        <div className="card-header">
          <h2>Welcome Back</h2>
          <p>Login to manage your submissions.</p>
        </div>
        {err && <div className="error-box">{err}</div>}
        <form onSubmit={handleSubmit}>
          <label>User ID</label>
          <input value={id} onChange={e => setId(e.target.value)} type="text" placeholder="Your User ID" />
          <label>Password</label>
          <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="••••••••" />
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? 'Authenticating...' : 'Login to Account'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setView('landing')}>Back to Home</button>
        </form>
      </div>
    </div>
  );
};

const UserRegistration = ({ setView }: { setView: any }) => {
  const [form, setForm] = useState<Partial<User>>({ plan: 'Pro (300 Responses)' });
  const [screenshotData, setScreenshotData] = useState<{base64: string, mime: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('https://lh3.googleusercontent.com/d/11aXROhyMJ2v--yIJ1xDh-ehA7oAqmKNS');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (step === 2) {
      api.getQrCode().then(res => {
        if(res.url) setQrCodeUrl(res.url);
      }).catch(e => console.error("QR Fetch failed:", e));
    }
  }, [step]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setScreenshotData({
          base64: result,
          mime: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async () => {
    if (!form.name || !form.contact || !form.email || !form.userId || !form.password || !form.paymentId) {
      alert("Please fill in all text fields.");
      return;
    }
    if (!screenshotData) {
      alert("Please upload the payment screenshot.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { ...form, screenshotData: screenshotData.base64, screenshotMime: screenshotData.mime };
      await api.register(payload);
      setRegistrationSuccess(true);
    } catch (e: any) {
      alert("Registration Failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px', maxWidth: '600px', margin: '40px auto', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '24px', animation: 'fadeIn 1s' }}>🎉</div>
            <h2 style={{ color: 'var(--success)', marginBottom: '16px', fontSize: '2rem' }}>Registration Successful!</h2>
            <div style={{ width: '60px', height: '4px', background: 'var(--success)', margin: '0 auto 24px', borderRadius: '2px' }}></div>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 500 }}>
                Thank you for signing up, {form.name}.
            </p>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '40px', lineHeight: '1.6' }}>
                Your account is currently pending administrator approval.<br/>
                Once your payment is verified, you will receive an <strong>email confirmation</strong> activating your account.
            </p>
            <button className="btn btn-primary" onClick={() => setView('landing')} style={{ maxWidth: '200px' }}>
                Return to Home
            </button>
        </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Create Account</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
          <span style={{ height: '4px', width: '40px', background: step === 1 ? 'var(--primary)' : '#e2e8f0', borderRadius: '2px' }}></span>
          <span style={{ height: '4px', width: '40px', background: step === 2 ? 'var(--primary)' : '#e2e8f0', borderRadius: '2px' }}></span>
        </div>
      </div>
      
      {step === 1 && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <p className="text-center">Select a credit plan that suits your needs.</p>
          <div className="grid-3">
            {PRICING_PLANS.map(p => (
              <div 
                key={p.label} 
                className={`plan-card ${form.plan?.includes(p.label) ? 'plan-selected' : ''}`}
                onClick={() => setForm({...form, plan: `${p.label} (${p.responses} Responses)`})}
              >
                <h3>{p.label}</h3>
                <div className="plan-price">₹{p.price}</div>
                <div style={{ color: 'var(--text-muted)' }}>{p.responses} Auto-Submissions</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '32px' }}>
             <button className="btn btn-primary" onClick={() => setStep(2)}>Continue to Details</button>
             <button className="btn btn-secondary" onClick={() => setView('landing')}>Cancel</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          <div className="grid-2">
            <div>
              <h3>1. Personal Details</h3>
              <input placeholder="Full Name" onChange={e => setForm({...form, name: e.target.value})} type="text" />
              <input placeholder="Contact Number" onChange={e => setForm({...form, contact: e.target.value})} type="text" />
              <input placeholder="Email Address" onChange={e => setForm({...form, email: e.target.value})} type="text" />
              
              <h3 style={{ marginTop: '24px' }}>2. Login Credentials</h3>
              <input placeholder="Choose User ID" onChange={e => setForm({...form, userId: e.target.value})} type="text" />
              <input type="password" placeholder="Choose Password" onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            
            <div>
              <h3>3. Payment</h3>
              <div style={{ background: '#F8FAFC', border: '2px dashed var(--primary-light)', borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Scan via UPI App</p>
                
                <div style={{ 
                  width: '200px', 
                  height: '200px', 
                  margin: '0 auto', 
                  background: 'white', 
                  padding: '5px', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                   {qrCodeUrl ? (
                     <img src={qrCodeUrl} referrerPolicy="no-referrer" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="QR Code" />
                   ) : (
                     <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Loading QR...</div>
                   )}
                </div>
                
                <div style={{ marginTop: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>
                   Pay ₹{PRICING_PLANS.find(p => form.plan?.includes(p.label))?.price}
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>arasukiruba187-2@okaxis</div>
              </div>

              <input placeholder="Enter Transaction / Payment ID" onChange={e => setForm({...form, paymentId: e.target.value})} type="text" />
              
              <div style={{ marginBottom: '20px' }}>
                <label>Upload Payment Screenshot</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ background: 'white', padding: '10px' }}
                />
                {screenshotData && <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✓ File Selected</div>}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
             <button className="btn btn-primary" disabled={loading} onClick={handleRegister}>
               {loading ? 'Uploading & Registering...' : 'Complete & Register'}
             </button>
             <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await api.getUsers();
    setUsers(data);
  };

  const handleSave = async () => {
    if (!editing) return;
    await api.updateUser(editing);
    setEditing(null);
    loadUsers();
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.userId || !newUser.password) {
      alert("Name, User ID, and Password are required.");
      return;
    }
    await api.createUser(newUser);
    setCreating(false);
    setNewUser({});
    loadUsers();
  };

  return (
    <div className="card" style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>User Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={() => setCreating(true)} style={{ width: 'auto', margin: 0 }}>+ Create User</button>
          <button className="btn btn-secondary" onClick={loadUsers} style={{ width: 'auto', margin: 0 }}>🔄 Refresh</button>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {creating && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', margin: 0 }}>
            <h3>Create New User</h3>
            <input placeholder="Name" onChange={e => setNewUser({...newUser, name: e.target.value})} />
            <input placeholder="User ID" onChange={e => setNewUser({...newUser, userId: e.target.value})} />
            <input placeholder="Password" type="password" onChange={e => setNewUser({...newUser, password: e.target.value})} />
            <div className="grid-2">
              <input placeholder="Credits (e.g., 500)" type="number" onChange={e => setNewUser({...newUser, creditsRemaining: Number(e.target.value)})} />
              <input placeholder="Plan Name" onChange={e => setNewUser({...newUser, plan: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-primary" onClick={handleCreateUser}>Create</button>
              <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {/* EDIT USER SECTION */}
      {editing && (
        <div style={{ background: '#f8fafc', padding: '24px', marginBottom: '24px', borderRadius: '12px', border: '1px solid var(--border)', animation: 'fadeIn 0.3s' }}>
          <h3>Editing: {editing.name}</h3>
          <div className="grid-2">
            <div>
              <label>Credits Remaining</label>
              <input type="number" value={editing.creditsRemaining} onChange={e => setEditing({...editing, creditsRemaining: parseInt(e.target.value)})} />
            </div>
            <div>
              <label>Account Status</label>
              <select value={editing.status} onChange={e => setEditing({...editing, status: e.target.value as any})}>
                <option value="Active">Active (Approved)</option>
                <option value="Pending">Pending</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button className="btn btn-primary" style={{ width: 'auto' }} onClick={handleSave}>Save Changes</button>
             <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>User ID</th>
              <th>Contact</th>
              <th>Credits (Rem / Tot)</th>
              <th>Plan</th>
              <th>Proof</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                </td>
                <td>{u.userId}</td>
                <td>{u.contact}</td>
                <td>
                  <span style={{ color: u.creditsRemaining < 10 ? 'var(--error)' : 'var(--success)', fontWeight: 700 }}>
                    {u.creditsRemaining}
                  </span>
                  <span style={{ color: '#94a3b8' }}> / {u.creditsAvailed}</span>
                </td>
                <td>{u.plan}</td>
                <td>
                  {u.screenshotUrl && u.screenshotUrl !== 'No Screenshot' ? (
                     <a href={u.screenshotUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                       View Receipt ↗
                     </a>
                  ) : <span style={{ color: '#cbd5e1' }}>N/A</span>}
                </td>
                <td>
                  <span className={`badge badge-${u.status.toLowerCase()}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', width: 'auto' }} onClick={() => setEditing(u)}>Manage</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={8} className="text-center">No users found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- LOGIC HELPERS ---

function getWeightedRandom(weights: Record<string, number>, options: {value: string}[]): string {
  const entries = options.map(o => ({ val: o.value, w: weights[o.value] || 0 }));
  const totalWeight = entries.reduce((sum, item) => sum + item.w, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of entries) {
    random -= item.w;
    if (random <= 0) return item.val;
  }
  return options[0].value;
}

async function generateAIAnswer(question: string, context: string = ""): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: ${context}\nQuestion: "${question}"\n\nProvide a natural, human-like short answer (1-2 sentences) to this question. Do not start with "Answer:" or quotes.`,
    });
    return res.text?.trim() || "No answer generated";
  } catch (e) {
    console.error(e);
    return "Error generating answer";
  }
}

const UserDashboard = ({ user, updateCredits }: { user: User, updateCredits: (n: number) => void }) => {
  const [formUrl, setFormUrl] = useState('');
  const [submissionCount, setSubmissionCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formStructure, setFormStructure] = useState<FormStructure | null>(null);
  const [results, setResults] = useState<SubmissionResult[]>([]);
  const [weights, setWeights] = useState<QuestionWeights>({});
  const [fieldConfig, setFieldConfig] = useState<Record<string, { include: boolean, generating: boolean, identityType?: 'name'|'gender'|'email' }>>({});
  const stopRequested = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [results]);

  const detectIdentityField = (title: string): 'name'|'gender'|'email'|undefined => {
    const t = title.toLowerCase();
    if(t.includes('name')) return 'name';
    if(t.includes('gender') || t.includes('sex')) return 'gender';
    if(t.includes('email')) return 'email';
    return undefined;
  };

  const initializeFormState = (structure: FormStructure) => {
    const newWeights: QuestionWeights = {};
    const newFieldConfig: Record<string, { include: boolean, generating: boolean, identityType?: 'name'|'gender'|'email' }> = {};
    
    structure.questions.forEach(q => {
      newFieldConfig[q.id] = { 
        include: true, 
        generating: false,
        identityType: detectIdentityField(q.title)
      };
      
      if (q.options) {
        newWeights[q.id] = {};
        const equal = Math.floor(100/Math.max(1, q.options.length));
        q.options.forEach((o, i) => {
            newWeights[q.id][o.value] = i === q.options!.length - 1 ? 100 - (equal * (q.options!.length - 1)) : equal;
        });
      } else if (q.type === QuestionType.LINEAR_SCALE) {
        newWeights[q.id] = {};
        const min = q.scaleLimits?.min || 1;
        const max = q.scaleLimits?.max || 5;
        const count = max - min + 1;
        const equal = Math.floor(100/count);
        for(let j=min; j<=max; j++) {
             newWeights[q.id][String(j)] = j === max ? 100 - (equal * (count - 1)) : equal;
        }
      }
    });
    setWeights(newWeights);
    setFieldConfig(newFieldConfig);
  };

  const handleWeightChange = (qId: string, optValue: string, val: number) => {
    setWeights(prev => ({
      ...prev,
      [qId]: { ...prev[qId], [optValue]: val }
    }));
  };

  const autoBalance = (qId: string) => {
    const q = formStructure?.questions.find(q => q.id === qId);
    if (!q) return;
    let opts: string[] = [];
    if (q.options) opts = q.options.map(o => o.value);
    else if (q.type === QuestionType.LINEAR_SCALE) {
       const min = q.scaleLimits?.min || 1;
       const max = q.scaleLimits?.max || 5;
       for(let i=min; i<=max; i++) opts.push(String(i));
    }
    if (opts.length === 0) return;
    const equal = Math.floor(100 / opts.length);
    const newW: Record<string, number> = {};
    opts.forEach((val, i) => {
      newW[val] = i === opts.length - 1 ? 100 - (equal * (opts.length - 1)) : equal;
    });
    setWeights(prev => ({ ...prev, [qId]: newW }));
  };

  const toggleField = (qId: string) => {
    setFieldConfig(prev => ({
      ...prev,
      [qId]: { ...prev[qId], include: !prev[qId].include }
    }));
  };

  const toggleAiGen = (qId: string) => {
    setFieldConfig(prev => ({
      ...prev,
      [qId]: { ...prev[qId], generating: !prev[qId].generating }
    }));
  };

  const getQuestionTotal = (qId: string) => {
    if (!weights[qId]) return 0;
    return Object.values(weights[qId]).reduce((acc: number, val: number) => acc + val, 0);
  };

  const handleAnalyze = async () => {
    if (!formUrl) { setError('Please paste a valid Google Form URL'); return; }
    setLoading(true);
    setError(null);
    try {
      const structure = await analyzeForm(formUrl);
      setFormStructure(structure);
      initializeFormState(structure);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if(user.creditsRemaining <= 0) { setError("Insufficient credits."); return; }
    if(submissionCount > user.creditsRemaining) { setError("Exceeds remaining credits."); return; }
    
    setIsSubmitting(true);
    stopRequested.current = false;
    setResults([]);
    resetNameHistory();

    let successCount = 0;

    for(let i=1; i<=submissionCount; i++) {
        if(stopRequested.current) break;
        try {
            const responses: any = {};
            let isMale = Math.random() > 0.5;
            let genderDriverResponse: string | null = null;
            let genderDriverId: string | null = null;
            const genderQuestion = formStructure!.questions.find(q => 
                fieldConfig[q.id]?.include && 
                fieldConfig[q.id]?.identityType === 'gender' && 
                q.options && q.options.length > 0
            );

            if (genderQuestion) {
                genderDriverId = genderQuestion.id;
                genderDriverResponse = getWeightedRandom(weights[genderQuestion.id], genderQuestion.options!);
                const lower = genderDriverResponse.toLowerCase().trim();
                if (['female', 'woman', 'girl', 'she', 'lady', 'f'].some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w))) {
                    isMale = false;
                } 
                else if (['male', 'man', 'boy', 'he', 'gentleman', 'm'].some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w))) {
                    isMale = true;
                }
            }
            const name = await getUniqueTamilFirstName(isMale ? 'male' : 'female');
            const genderString = isMale ? 'Male' : 'Female';
            
            for (const q of formStructure!.questions) {
                if(!fieldConfig[q.id]?.include) continue;
                if (q.id === genderDriverId && genderDriverResponse) {
                    responses[q.id] = genderDriverResponse;
                    continue;
                }
                if (fieldConfig[q.id]?.identityType === 'gender') {
                    if (q.options) {
                        const target = isMale ? ['male', 'm', 'man', 'boy'] : ['female', 'f', 'woman', 'girl'];
                        const match = q.options.find(o => target.some(t => o.value.toLowerCase().includes(t)));
                        responses[q.id] = match ? match.value : getWeightedRandom(weights[q.id], q.options);
                    } else {
                        responses[q.id] = genderString;
                    }
                    continue;
                }
                if (fieldConfig[q.id]?.identityType === 'name') {
                    responses[q.id] = name;
                    continue;
                }
                if (fieldConfig[q.id]?.identityType === 'email') {
                    responses[q.id] = `${name.toLowerCase().replace(/\s+/g,'')}${Math.floor(Math.random()*999)}@gmail.com`;
                    continue;
                }
                if (fieldConfig[q.id]?.generating) {
                    responses[q.id] = await generateAIAnswer(q.title);
                    continue;
                }
                if (q.options) {
                    responses[q.id] = getWeightedRandom(weights[q.id], q.options);
                } else if (q.type === QuestionType.LINEAR_SCALE) {
                    const min = q.scaleLimits?.min || 1;
                    const max = q.scaleLimits?.max || 5;
                    const opts = [];
                    for(let j=min; j<=max; j++) opts.push({value: String(j)});
                    responses[q.id] = getWeightedRandom(weights[q.id], opts);
                } else {
                    responses[q.id] = "NA";
                }
            }
            await submitResponse(formStructure!.formId, responses);
            successCount++;
            setResults(prev => [...prev, { id: i, timestamp: new Date().toLocaleTimeString(), status: 'success' }]);
        } catch(e: any) {
             setResults(prev => [...prev, { id: i, timestamp: new Date().toLocaleTimeString(), status: 'error', message: e.message }]);
             if(e.message.includes('Credit')) break;
        }
        await new Promise(r => setTimeout(r, 1500)); 
    }
    
    if (successCount > 0) {
        try {
            setResults(prev => [...prev, { id: 999, timestamp: new Date().toLocaleTimeString(), status: 'success', message: `Syncing ${successCount} credits...` }]);
            const up = await api.deductCredit(user.userId, successCount);
            updateCredits(up.remaining);
            setResults(prev => [...prev, { id: 999, timestamp: new Date().toLocaleTimeString(), status: 'success', message: 'Credits synced.' }]);
        } catch(e) {
            console.error("Failed to sync credits", e);
            setResults(prev => [...prev, { id: 999, timestamp: new Date().toLocaleTimeString(), status: 'error', message: 'Failed to sync credits.' }]);
        }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>New Automation Task</h2>
        <p>Configure intelligent responses and distribution settings</p>
      </div>

      {error && (
        <div className="error-box">
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {/* INPUT STAGE */}
      {!formStructure && (
         <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ textAlign: 'left', marginBottom: '8px', fontWeight: 500 }}>Google Form Public URL</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                value={formUrl} 
                onChange={e => setFormUrl(e.target.value)} 
                placeholder="https://docs.google.com/forms/d/e/.../viewform" 
                style={{ marginBottom: 0 }}
              />
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading} style={{ width: 'auto', padding: '0 32px', marginBottom: 0 }}>
                {loading ? 'Processing...' : 'Analyze'}
              </button>
            </div>
         </div>
      )}

      {/* CONFIGURATION STAGE */}
      {formStructure && (
        <div style={{ animation: 'fadeIn 0.5s' }}>
          
          <div style={{ background: 'var(--surface-alt)', padding: '24px', borderRadius: 'var(--radius-lg)', marginBottom: '32px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
                <h3 style={{marginBottom: '4px'}}>{formStructure.title}</h3>
                <p style={{ marginBottom: 0 }}>{formStructure.questions.length} Fields detected • Ready to configure</p>
             </div>
             <button className="btn btn-secondary" onClick={() => setFormStructure(null)} style={{ width: 'auto', marginBottom: 0 }}>Change Form</button>
          </div>
          
          <div style={{ marginBottom: '40px', display: 'grid', gap: '24px' }}>
            {formStructure.questions.map((q, idx) => {
              const totalWeight = getQuestionTotal(q.id);
              return (
                <div key={q.id} className="q-card">
                    <div className="q-header">
                        <div className="q-title">
                           <span style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono', fontSize: '0.9rem', opacity: 0.8, marginTop: '2px' }}>Q{idx+1}.</span>
                           {q.title} 
                           {q.required && <span style={{ color: 'var(--error)', fontSize: '1.2rem', lineHeight: 0.8, marginLeft: '4px' }}>*</span>}
                        </div>
                        <span className="badge badge-gray">{q.type.replace('_', ' ')}</span>
                    </div>

                    {fieldConfig[q.id]?.include && (
                        <div>
                            {/* TEXT INPUTS HANDLING */}
                            {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.PARAGRAPH) && (
                                <div>
                                    {fieldConfig[q.id]?.identityType ? (
                                        <div className="badge badge-purple" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                                            ✨ Auto-filling: {fieldConfig[q.id]?.identityType?.toUpperCase()}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface-alt)', padding: '16px', borderRadius: 'var(--radius-md)', width: 'fit-content', border: '1px solid var(--border)' }}>
                                            <label className="switch" style={{ margin: 0 }}>
                                              <input type="checkbox" checked={fieldConfig[q.id]?.generating} onChange={() => toggleAiGen(q.id)} />
                                              <span className="slider"></span>
                                            </label>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Use AI Generation</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* OPTIONS HANDLING */}
                            {q.options && (
                                <div>
                                    <div className="opt-grid">
                                        {q.options.map(opt => (
                                            <div key={opt.value} className="opt-row">
                                                <div className="opt-val">{opt.value}</div>
                                                <div className="opt-input-wrapper">
                                                    <input 
                                                        type="number" 
                                                        min="0" max="100" 
                                                        value={weights[q.id]?.[opt.value] || 0} 
                                                        onChange={e => handleWeightChange(q.id, opt.value, parseInt(e.target.value))}
                                                    />
                                                    <span>%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="weight-footer">
                                        <button className="btn btn-secondary" onClick={() => autoBalance(q.id)} style={{ width: 'auto', padding: '6px 16px', fontSize: '0.8rem', margin: 0 }}>
                                          Auto Balance
                                        </button>
                                        <div className={`total-pill ${totalWeight === 100 ? 'total-valid' : 'total-invalid'}`}>
                                           Total: {totalWeight}%
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LINEAR SCALE HANDLING */}
                            {q.type === QuestionType.LINEAR_SCALE && (
                                <div>
                                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                                        {(() => {
                                            const min = q.scaleLimits?.min || 1;
                                            const max = q.scaleLimits?.max || 5;
                                            const range = [];
                                            for(let i=min; i<=max; i++) range.push(i);
                                            return range.map(val => (
                                                <div key={val} style={{ textAlign: 'center', minWidth: '70px', background: 'var(--surface-alt)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontSize: '0.9rem', marginBottom: '8px', fontWeight: 700 }}>{val}</div>
                                                    <div className="opt-input-wrapper" style={{ width: '100%' }}>
                                                        <input 
                                                            type="number" 
                                                            min="0" max="100"
                                                            value={weights[q.id]?.[String(val)] || 0}
                                                            onChange={e => handleWeightChange(q.id, String(val), parseInt(e.target.value))}
                                                            style={{ paddingRight: '20px', textAlign: 'center' }}
                                                        />
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                    <div className="weight-footer">
                                        <button className="btn btn-secondary" onClick={() => autoBalance(q.id)} style={{ width: 'auto', padding: '6px 16px', fontSize: '0.8rem', margin: 0 }}>
                                          Auto Balance
                                        </button>
                                        <div className={`total-pill ${totalWeight === 100 ? 'total-valid' : 'total-invalid'}`}>
                                           Total: {totalWeight}%
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
              );
            })}
          </div>

          <div style={{ padding: '32px', borderRadius: 'var(--radius-lg)', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
             <div className="grid-2" style={{ alignItems: 'end', marginBottom: '32px' }}>
                <div style={{ marginBottom: 0 }}>
                   <label style={{ color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Total Submissions (Max: {user.creditsRemaining})</label>
                   <input 
                      type="number" 
                      value={submissionCount} 
                      onChange={e => setSubmissionCount(Number(e.target.value))} 
                      max={user.creditsRemaining} 
                      disabled={isSubmitting}
                      style={{ fontSize: '1.25rem', fontWeight: 700, padding: '16px', marginBottom: 0 }}
                   />
                </div>
                <div>
                    {!isSubmitting ? (
                        <button className="btn btn-primary" onClick={handleStart} style={{ height: '58px', fontSize: '1.1rem', marginBottom: 0 }}>
                           Start Automation Sequence
                        </button>
                    ) : (
                        <button className="btn btn-danger" onClick={() => stopRequested.current = true} style={{ height: '58px', fontSize: '1.1rem', marginBottom: 0 }}>
                           Stop Operation
                        </button>
                    )}
                </div>
             </div>
             
             <div className="terminal-container">
                <div className="terminal-header">
                   <div style={{display:'flex', gap:'8px'}}>
                     <span className="terminal-dot t-red"></span>
                     <span className="terminal-dot t-yellow"></span>
                     <span className="terminal-dot t-green"></span>
                   </div>
                   <div style={{color: '#94A3B8', fontSize:'0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase'}}>execution_log.txt</div>
                </div>
                <div className="terminal-body" ref={logRef}>
                   {results.length === 0 && <div style={{ color: '#64748B', fontStyle: 'italic' }}>System ready. Waiting to initiate...</div>}
                   {results.map((r, i) => (
                      <div key={i} className="log-entry">
                         <span className="log-ts">{r.timestamp}</span>
                         <span className="log-id">#{r.id}</span>
                         <span>
                             <span className={`log-status ${r.status}`}>{r.status}</span>
                             <span style={{ marginLeft: '12px' }}>{r.status === 'success' ? 'Response submitted successfully' : r.message}</span>
                         </span>
                      </div>
                   ))}
                   {isSubmitting && <div className="log-entry"><span className="log-ts">...</span><span className="log-id">...</span><span style={{color:'#94A3B8'}}>Processing next entry in queue...</span></div>}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
