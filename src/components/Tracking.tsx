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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');

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

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      employeeId: emp.id,
      date,
      timeIn,
      timeOut,
      lateMinutes,
      earlyLeaveMinutes,
      totalWorkedMinutes
    };

    setEntries([...entries, newEntry]);
    
    setTimeIn('');
    setTimeOut('');
  };

  const deleteEntry = (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  return (
    <div>
      <div className="card">
        <h2>{t.addTimeEntry}</h2>
        
        <div className="form-group">
          <label>{t.employee}</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)}>
            <option value="">{t.employee}...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
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

        <button className="btn" onClick={saveEntry}>{t.saveEntry}</button>
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
                 <th>{t.late}</th>
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
                     <td className={ent.lateMinutes > 0 ? 'text-danger' : ''}>
                        {ent.lateMinutes > 0 ? formatMinutesToHHMM(ent.lateMinutes) : '-'}
                     </td>
                     <td className="text-accent">{formatMinutesToHHMM(ent.totalWorkedMinutes)}</td>
                     <td>
                       <span style={{cursor:'pointer', color:'var(--danger)'}} onClick={() => deleteEntry(ent.id)}>✕</span>
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
