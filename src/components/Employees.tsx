import { useState } from 'react';
import type { Employee, ShiftTemplate } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Employees({ 
  employees, 
  setEmployees,
  shifts,
  setShifts,
  t
}: { 
  employees: Employee[], 
  setEmployees: (e: Employee[]) => void,
  shifts: ShiftTemplate[],
  setShifts: (s: ShiftTemplate[]) => void,
  t: any
}) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');

  const addEmployee = () => {
    if (!name) return;
    const newEmp: Employee = {
      id: Date.now().toString(),
      name,
      schedule: {
        0: { shiftId: 'OFF' },
        1: { shiftId: 'OFF' },
        2: { shiftId: 'OFF' },
        3: { shiftId: 'OFF' },
        4: { shiftId: 'OFF' },
        5: { shiftId: 'OFF' },
        6: { shiftId: 'OFF' },
      }
    };
    if (shifts.length > 0) {
       for(let i=1; i<=5; i++) newEmp.schedule[i] = { shiftId: shifts[0].id };
    }
    setEmployees([...employees, newEmp]);
    setName('');
  };

  const addShift = () => {
    if (!shiftName) return;
    setShifts([...shifts, {
      id: Date.now().toString(),
      name: shiftName,
      start: shiftStart,
      end: shiftEnd
    }]);
    setShiftName('');
  };
  
  const deleteShift = (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    setShifts(shifts.filter(s => s.id !== id));
    setEmployees(employees.map(emp => {
      const newS = { ...emp.schedule };
      for (let i = 0; i < 7; i++) {
        if (newS[i].shiftId === id) {
          newS[i] = { shiftId: 'OFF' };
        }
      }
      return { ...emp, schedule: newS };
    }));
  };

  const updateScheduleShift = (empId: string, dayIdx: number, newShiftId: string) => {
    setEmployees(employees.map(e => {
      if (e.id === empId) {
        const newSched = { ...e.schedule };
        newSched[dayIdx] = { shiftId: newShiftId, customStart: '09:00', customEnd: '17:00' };
        return { ...e, schedule: newSched };
      }
      return e;
    }));
  };

  const updateCustomTime = (empId: string, dayIdx: number, field: 'customStart'|'customEnd', val: string) => {
    setEmployees(employees.map(e => {
      if (e.id === empId) {
        const newSched = { ...e.schedule };
        newSched[dayIdx] = { ...newSched[dayIdx], [field]: val };
        return { ...e, schedule: newSched };
      }
      return e;
    }));
  };

  const deleteEmployee = (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    setEmployees(employees.filter(e => e.id !== id));
  }

  return (
    <div>
      <div className="card">
        <h2>{t.shiftTemplates}</h2>
        <div style={{display:'flex', gap: '0.5rem', marginBottom:'1rem'}}>
          <input style={{flex: 2}} value={shiftName} onChange={e=>setShiftName(e.target.value)} placeholder={t.namePlaceholder} className="form-group input" />
          <input style={{flex: 1}} type="time" value={shiftStart} onChange={e=>setShiftStart(e.target.value)} />
          <input style={{flex: 1}} type="time" value={shiftEnd} onChange={e=>setShiftEnd(e.target.value)} />
          <button className="btn" style={{width: 'auto', padding: '0 1rem'}} onClick={addShift}>{t.add}</button>
        </div>
        {shifts.length === 0 && <p style={{color: 'var(--hint-color)', fontSize:'0.85rem'}}>{t.noShifts}</p>}
        {shifts.map(s => (
          <div key={s.id} style={{display:'flex', justifyContent:'space-between', padding:'0.5rem', background:'var(--secondary-bg-color)', marginBottom:'4px', borderRadius:'6px'}}>
            <span>{s.name} ({s.start} - {s.end})</span>
            <span style={{cursor:'pointer', color:'var(--danger)'}} onClick={()=>deleteShift(s.id)}>✕</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>{t.addEmployee}</h2>
        <div className="form-group">
          <label>{t.fullName}</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>
        <button className="btn" onClick={addEmployee}>{t.add}</button>
      </div>

      <div className="card">
        <h2>{t.employeeList}</h2>
        {employees.length === 0 ? <p style={{color: 'var(--hint-color)'}}>{t.noEmployees}</p> : (
          employees.map(e => (
            <div key={e.id} style={{ marginBottom: '1rem' }}>
              <div 
                className="employee-item" 
                onClick={() => setEditingId(editingId === e.id ? null : e.id)}
              >
                <span>{e.name}</span>
                <span style={{fontSize: '0.8rem', color: 'var(--hint-color)'}}>
                  {editingId === e.id ? t.close : t.editSchedule}
                </span>
              </div>
              
              {editingId === e.id && (
                <div style={{ padding: '1rem', background: 'var(--secondary-bg-color)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <h4 style={{marginTop: 0}}>{t.weeklySchedule}</h4>
                  {DAYS.map((day, idx) => {
                    const dayAss = e.schedule[idx];
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ width: '40px', fontSize: '0.9rem' }}>{day}</span>
                        <select 
                          value={dayAss.shiftId}
                          onChange={(ev) => updateScheduleShift(e.id, idx, ev.target.value)}
                          style={{ padding: '4px 8px', flex: 1, minWidth: '120px' }}
                        >
                          <option value="OFF">{t.off}</option>
                          <option value="CUSTOM">{t.customHours}</option>
                          {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start}-{s.end})</option>)}
                        </select>
                        
                        {dayAss.shiftId === 'CUSTOM' && (
                          <div style={{display:'flex', gap:'8px'}}>
                            <input 
                              type="time" 
                              value={dayAss.customStart || ''}
                              onChange={(ev) => updateCustomTime(e.id, idx, 'customStart', ev.target.value)}
                              style={{ width: '90px', padding: '4px' }}
                            />
                            <span>-</span>
                            <input 
                              type="time" 
                              value={dayAss.customEnd || ''}
                              onChange={(ev) => updateCustomTime(e.id, idx, 'customEnd', ev.target.value)}
                              style={{ width: '90px', padding: '4px' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button className="btn" style={{marginTop:'1rem', background:'var(--danger)'}} onClick={() => deleteEmployee(e.id)}>
                    {t.deleteEmployee}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
