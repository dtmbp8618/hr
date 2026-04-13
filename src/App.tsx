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

  // Load Cloud Data
  useEffect(() => {
    if ((window as any).Telegram?.WebApp) {
      const wa = (window as any).Telegram.WebApp;
      wa.ready();
      wa.expand();
      if (typeof wa.requestFullscreen === 'function') {
        wa.requestFullscreen();
      }
    }

    const savedLang = localStorage.getItem('__hr_lang');
    if (savedLang) setLang(savedLang as Lang);

    import('./utils/cloud').then(({ loadChunkedArray }) => {
      Promise.all([
        loadChunkedArray('hr_employees'),
        loadChunkedArray('hr_entries'),
        loadChunkedArray('hr_shifts')
      ]).then(([emps, ents, shfs]) => {
        if (emps.length) setEmployees(emps);
        if (ents.length) setEntries(ents);
        if (shfs.length) setShifts(shfs);
        setDataLoaded(true);
      }).catch(err => {
        console.error("Cloud Storage Load Error:", err);
        setDataLoaded(true);
      });
    });
  }, []);

  // Save Cloud Data On Change
  useEffect(() => {
    if (!dataLoaded) return;
    
    import('./utils/cloud').then(({ saveChunkedArray }) => {
      saveChunkedArray('hr_employees', employees, 20);
      saveChunkedArray('hr_entries', entries, 20);
      saveChunkedArray('hr_shifts', shifts, 20);
    }).catch(err => console.error("Cloud Storage Save Error:", err));
  }, [employees, entries, shifts, dataLoaded]);

  // UI Config persistence
  useEffect(() => {
    localStorage.setItem('__hr_lang', lang);
  }, [lang]);

  return (
    <div className="app-container">
      <div className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '3rem'}}>
        <button 
          className="btn" 
          style={{padding: '0.25rem 0.5rem', width: 'auto'}} 
          onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
        >
          {lang.toUpperCase()}
        </button>
        <span>{t.appTitle}</span>
      </div>
      
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          {t.employees}
        </button>
        <button 
          className={`nav-tab ${activeTab === 'tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracking')}
        >
          {t.tracking}
        </button>
        <button 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          {t.dashboard}
        </button>
      </div>

      <div className="content">
        {activeTab === 'employees' && <EmployeesView employees={employees} setEmployees={setEmployees} shifts={shifts} setShifts={setShifts} t={t} />}
        {activeTab === 'tracking' && <TrackingView employees={employees} entries={entries} setEntries={setEntries} shifts={shifts} t={t} />}
        {activeTab === 'dashboard' && <DashboardView employees={employees} entries={entries} setEntries={setEntries} shifts={shifts} t={t} />}
      </div>
    </div>
  );
}
