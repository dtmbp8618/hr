import { useState, useEffect } from 'react';
import './index.css';

import type { Employee, TimeEntry, ShiftTemplate } from './types';
import EmployeesView from './components/Employees';
import TrackingView from './components/Tracking';
import DashboardView from './components/Dashboard';

import { i18n } from './i18n';
import type { Lang } from './i18n';

export default function App() {
  const [activeTab, setActiveTab] = useState<'employees' | 'tracking' | 'dashboard'>('tracking');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [lang, setLang] = useState<Lang>('en');
  
  const t = i18n[lang];

  const [dataLoaded, setDataLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);

  // Auth persistence
  useEffect(() => {
    const savedRole = localStorage.getItem('__hr_role');
    if (savedRole === 'admin' || savedRole === 'user') {
      setRole(savedRole as 'admin' | 'user');
    }
  }, []);

  const handleLogin = (r: 'admin' | 'user') => {
    setRole(r);
    localStorage.setItem('__hr_role', r);
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('__hr_role');
  };

  // Load Cloud Data
  useEffect(() => {
    if ((window as any).Telegram?.WebApp) {
      const wa = (window as any).Telegram.WebApp;
      wa.ready();
      wa.expand();
      
      wa.onEvent('fullscreen_changed', () => {
        setIsFullscreen(wa.isFullscreen);
      });
      setIsFullscreen(wa.isFullscreen || false);

      if (typeof wa.requestFullscreen === 'function') {
        wa.requestFullscreen();
      }
    }

    const savedLang = localStorage.getItem('__hr_lang');
    if (savedLang) setLang(savedLang as Lang);

    import('./utils/cloud').then(({ loadFromCloud }) => {
      loadFromCloud().then(data => {
        if (data) {
          if (data.employees) setEmployees(data.employees);
          if (data.entries) setEntries(data.entries);
          if (data.shifts) setShifts(data.shifts);
        }
        setDataLoaded(true);
      });
    });
  }, []);

  // Save Cloud Data On Change
  useEffect(() => {
    if (!dataLoaded) return;
    
    if (role !== 'admin') return; // Only admin persists data upward
    
    import('./utils/cloud').then(({ saveToCloud }) => {
      saveToCloud({ employees, entries, shifts });
    });
  }, [employees, entries, shifts, dataLoaded, role]);

  // UI Config persistence
  useEffect(() => {
    localStorage.setItem('__hr_lang', lang);
  }, [lang]);

  const toggleFullscreen = () => {
    if ((window as any).Telegram?.WebApp) {
      const wa = (window as any).Telegram.WebApp;
      if (wa.isFullscreen) {
         if (typeof wa.exitFullscreen === 'function') wa.exitFullscreen();
      } else {
         if (typeof wa.requestFullscreen === 'function') wa.requestFullscreen();
      }
    }
  };

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ employees, entries, shifts }));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "HR_Backup.json";
    a.click();
  };

  const handleJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.employees) setEmployees(data.employees);
        if (data.entries) setEntries(data.entries);
        if (data.shifts) setShifts(data.shifts);
        alert("Data successfully restored and pushed to cloud.");
      } catch(err) {
        alert("Invalid JSON file format");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  if (!role) {
    return <LoginScreen onLogin={handleLogin} t={t} />;
  }

  return (
    <div className="app-container">
      <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '2.5rem', flexWrap: 'wrap', gap: '0.5rem'}}>
        <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
          <button 
            className="btn" 
            style={{padding: '0.25rem 0.5rem', width: 'auto'}} 
            onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
          >
            {lang.toUpperCase()}
          </button>
          
          {(window as any).Telegram?.WebApp && typeof (window as any).Telegram.WebApp.requestFullscreen === 'function' && (
            <button 
              className="btn" 
              style={{padding: '0.25rem 0.5rem', width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center'}} 
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              )}
            </button>
          )}

          {role === 'admin' && (
            <>
              <button className="btn" style={{padding: '0.25rem 0.5rem', width: 'auto'}} onClick={downloadJSON} title="Backup Data (JSON)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </button>
              <label className="btn" style={{padding: '0.25rem 0.5rem', width: 'auto', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center'}} title="Restore Data (JSON)">
                <input type="file" accept=".json" style={{display: 'none'}} onChange={handleJSONUpload} />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </label>
            </>
          )}

          <button className="btn" style={{padding: '0.25rem 0.5rem', width: 'auto'}} onClick={logout} title="Logout">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
        <span>{t.appTitle}</span>
      </div>
      
      <div className="nav-tabs">
        {role === 'admin' && (
          <>
            <button className={`nav-tab ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
              {t.employees}
            </button>
            <button className={`nav-tab ${activeTab === 'tracking' ? 'active' : ''}`} onClick={() => setActiveTab('tracking')}>
              {t.tracking}
            </button>
          </>
        )}
        <button className={`nav-tab ${activeTab === 'dashboard' || role === 'user' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          {t.dashboard}
        </button>
      </div>

      <div className="content">
        {role === 'admin' && activeTab === 'employees' && <EmployeesView employees={employees} setEmployees={setEmployees} shifts={shifts} setShifts={setShifts} t={t} />}
        {role === 'admin' && activeTab === 'tracking' && <TrackingView employees={employees} entries={entries} setEntries={setEntries} shifts={shifts} t={t} />}
        {(activeTab === 'dashboard' || role === 'user') && <DashboardView employees={employees} entries={entries} setEntries={setEntries} shifts={shifts} t={t} readonly={role !== 'admin'} />}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, t }: { onLogin: (r: 'admin' | 'user') => void, t: any }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'Welcome123$') {
      onLogin('admin');
    } else if (username === 'user' && password === 'HRview2025!') {
      onLogin('user');
    } else {
      setError(true);
    }
  };

  return (
    <div className="app-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh'}}>
      <form className="card" onSubmit={handleSubmit} style={{width: '90%', maxWidth: '350px'}}>
        <h2 style={{textAlign: 'center', marginBottom: '1.5rem'}}>{t.appTitle} Login</h2>
        
        {error && <p style={{color: 'var(--danger)', textAlign: 'center', margin: '0 0 1rem 0', fontSize: '0.9rem'}}>Invalid credentials</p>}
        
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        
        <button type="submit" className="btn" style={{width: '100%', marginTop: '1rem'}}>Login</button>
      </form>
    </div>
  );
}
