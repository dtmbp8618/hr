import { useState } from 'react';
import type { Employee, TimeEntry, ShiftTemplate } from '../types';
import { calculateShift, formatMinutesToHHMM } from '../utils/time';

export default function Tracking({ 
  employees, 
  entries, 
  setEntries,
  shifts,
  t
}: { 
  employees: Employee[], 
  entries: TimeEntry[], 
  setEntries: (e: TimeEntry[]) => void,
  shifts: ShiftTemplate[],
  t: any
}) {
  const [empId, setEmpId] = useState('');
  const [empQuery, setEmpQuery] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExcused, setIsExcused] = useState(false);
  const [excuseNote, setExcuseNote] = useState('');

  const saveEntry = () => {
    if (!empId || !date || !timeIn || !timeOut) return;
    
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const localDate = new Date(date + 'T00:00:00');
    const dow = localDate.getDay();
    
    const assignment = emp.schedule[dow];

    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let totalWorkedMinutes = 0;

    let sStart = '';
    let sEnd = '';

    if (assignment.shiftId === 'CUSTOM') {
      sStart = assignment.customStart || '00:00';
      sEnd = assignment.customEnd || '00:00';
    } else if (assignment.shiftId !== 'OFF') {
      const shift = shifts.find(s => s.id === assignment.shiftId);
      if (shift) {
        sStart = shift.start;
        sEnd = shift.end;
      }
    }

    if (sStart && sEnd) {
      const calc = calculateShift(sStart, sEnd, timeIn, timeOut);
      lateMinutes = calc.lateMinutes;
      earlyLeaveMinutes = calc.earlyLeaveMinutes;
      totalWorkedMinutes = calc.totalWorkedMinutes;
    } else {
      const calc = calculateShift("00:00", "00:00", timeIn, timeOut);
      totalWorkedMinutes = calc.totalWorkedMinutes;
    }

    if (isExcused) {
      lateMinutes = 0;
      earlyLeaveMinutes = 0;
    }

    if (editingId) {
      setEntries(entries.map(e => e.id === editingId ? {
        ...e,
        employeeId: emp.id,
        date,
        timeIn,
        timeOut,
        lateMinutes,
        earlyLeaveMinutes,
        totalWorkedMinutes,
        isExcused,
        excuseNote
      } : e));
      setEditingId(null);
    } else {
      const newEntry: TimeEntry = {
        id: Date.now().toString(),
        employeeId: emp.id,
        date,
        timeIn,
        timeOut,
        lateMinutes,
        earlyLeaveMinutes,
        totalWorkedMinutes,
        isExcused,
        excuseNote
      };
      setEntries([...entries, newEntry]);
    }
    
    setTimeIn('');
    setTimeOut('');
    setEmpQuery('');
    setEmpId('');
    setIsExcused(false);
    setExcuseNote('');
  };

  const handleEdit = (ent: TimeEntry) => {
    setEditingId(ent.id);
    const emp = employees.find(e => e.id === ent.employeeId);
    if (emp) {
      setEmpId(emp.id);
      setEmpQuery(emp.name);
    }
    setDate(ent.date);
    setTimeIn(ent.timeIn);
    setTimeOut(ent.timeOut);
    setIsExcused(ent.isExcused || false);
    setExcuseNote(ent.excuseNote || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEntry = (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  return (
    <div>
      <div className="card">
        <h2>{t.addTimeEntry}</h2>
        
        <div className="form-group" style={{ position: 'relative' }}>
          <label>{t.employee}</label>
          <input 
            type="text" 
            value={empQuery} 
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={e => {
              setEmpQuery(e.target.value);
              setEmpId('');
              setShowSuggestions(true);
            }}
            placeholder={`${t.employee}...`}
          />
          {showSuggestions && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {employees.filter(e => e.name.toLowerCase().includes(empQuery.toLowerCase())).map(e => (
                <div 
                  key={e.id}
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}
                  onMouseDown={() => {
                    setEmpQuery(e.name);
                    setEmpId(e.id);
                    setShowSuggestions(false);
                  }}
                >
                  {e.name}
                </div>
              ))}
              {employees.filter(e => e.name.toLowerCase().includes(empQuery.toLowerCase())).length === 0 && (
                <div style={{ padding: '0.75rem 1rem', color: 'var(--hint-color)' }}>{t.noData}</div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>{t.date}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.in}</label>
            <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>{t.out}</label>
            <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="excuseLate" 
            checked={isExcused} 
            onChange={e => setIsExcused(e.target.checked)} 
            style={{ width: 'auto', margin: 0 }}
          />
          <label htmlFor="excuseLate" style={{ margin: 0, cursor: 'pointer' }}>{t.excuseLate}</label>
        </div>

        {isExcused && (
          <div className="form-group">
            <input 
              type="text" 
              placeholder={t.excuseNote} 
              value={excuseNote} 
              onChange={e => setExcuseNote(e.target.value)} 
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn" onClick={saveEntry}>{editingId ? t.updateEntry : t.saveEntry}</button>
          {editingId && (
            <button className="btn" style={{ background: 'var(--glass-bg)' }} onClick={() => {
              setEditingId(null);
              setEmpId('');
              setEmpQuery('');
              setTimeIn('');
              setTimeOut('');
              setIsExcused(false);
              setExcuseNote('');
            }}>{t.close}</button>
          )}
        </div>
      </div>

      <div className="card" style={{overflowX: 'auto'}}>
        <h2>{t.recentEntries}</h2>
        {entries.length === 0 ? <p style={{color: 'var(--hint-color)'}}>{t.noData}</p> : (
           <table>
             <thead>
               <tr>
                 <th>{t.name}</th>
                 <th>{t.date}</th>
                 <th>{t.in}</th>
                 <th>{t.out}</th>
                 <th>{t.late} / {t.early}</th>
                 <th>{t.total}</th>
                 <th></th>
               </tr>
             </thead>
             <tbody>
               {entries.slice(-10).reverse().map(ent => {
                 const emp = employees.find(e => e.id === ent.employeeId);
                 return (
                   <tr key={ent.id}>
                     <td>{emp?.name || 'Unknown'}</td>
                     <td>{ent.date}</td>
                     <td>{ent.timeIn}</td>
                     <td>{ent.timeOut}</td>
                     <td className={(ent.lateMinutes > 0 || ent.earlyLeaveMinutes > 0) ? 'text-danger' : ''}>
                        {ent.isExcused ? (
                          <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }} title={ent.excuseNote || ''}>
                            {t.excuseLate}
                          </span>
                        ) : (
                          <>
                            {ent.lateMinutes > 0 ? `L: ${formatMinutesToHHMM(ent.lateMinutes)}` : ''}
                            {(ent.lateMinutes > 0 && ent.earlyLeaveMinutes > 0) ? ' | ' : ''}
                            {ent.earlyLeaveMinutes > 0 ? `E: ${formatMinutesToHHMM(ent.earlyLeaveMinutes)}` : ''}
                            {(ent.lateMinutes === 0 && ent.earlyLeaveMinutes === 0) ? '-' : ''}
                          </>
                        )}
                     </td>
                     <td className="text-accent">{formatMinutesToHHMM(ent.totalWorkedMinutes)}</td>
                     <td>
                       <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                         <span style={{cursor:'pointer', color:'var(--text-color)'}} onClick={() => handleEdit(ent)}>✎</span>
                         <span style={{cursor:'pointer', color:'var(--danger)'}} onClick={() => deleteEntry(ent.id)}>✕</span>
                       </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
        )}
      </div>
    </div>
  );
}
