import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Employee, TimeEntry, ShiftTemplate } from '../types';
import { formatMinutesToHHMM, timeToMinutes } from '../utils/time';

export default function Dashboard({ 
  employees, 
  entries,
  shifts,
  setEntries,
  t,
  readonly
}: { 
  employees: Employee[], 
  entries: TimeEntry[],
  shifts: ShiftTemplate[],
  setEntries: (e: TimeEntry[]) => void,
  t: any,
  readonly?: boolean
}) {
  const [monthStr, setMonthStr] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleCellClick = (empId: string, dateStr: string) => {
    if (readonly) return;
    const existingEnt = entries.find(e => e.employeeId === empId && e.date === dateStr);
    
    const workedInput = window.prompt(t.editDashboardWorkedTitle, existingEnt ? formatMinutesToHHMM(existingEnt.totalWorkedMinutes) : '');
    if (workedInput === null) return; 
    
    if (workedInput.trim() === '') {
      if (existingEnt) {
         setEntries(entries.filter(e => e.id !== existingEnt.id));
      }
      return;
    }

    const lateInput = window.prompt(t.editDashboardLateTitle, existingEnt ? formatMinutesToHHMM(existingEnt.lateMinutes) : '00:00');
    if (lateInput === null) return;

    const workedMins = timeToMinutes(workedInput);
    const lateMins = timeToMinutes(lateInput);

    if (existingEnt) {
      setEntries(entries.map(e => e.id === existingEnt.id ? { ...e, totalWorkedMinutes: workedMins, lateMinutes: lateMins } : e));
    } else {
      const newEntry: TimeEntry = {
        id: Date.now().toString(),
        employeeId: empId,
        date: dateStr,
        timeIn: 'NA', 
        timeOut: 'NA', 
        totalWorkedMinutes: workedMins,
        lateMinutes: lateMins,
        earlyLeaveMinutes: 0
      };
      setEntries([...entries, newEntry]);
    }
  };

  const stats = employees.map(emp => {
    const empEntries = entries.filter(e => e.employeeId === emp.id && e.date.startsWith(monthStr));
    
    let totalWorkedMonth = 0;
    let totalLateMonth = 0;
    let totalScheduledMonth = 0;

    let shiftsScheduledCount = 0;
    let shiftsWorkedCount = 0;
    let lateTimesMonth = 0;

    const dayMap: Record<number, { worked: number, late: number, early: number, isOff: boolean, dateStr: string }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthStr}-${day.toString().padStart(2, '0')}`;
      const localDow = new Date(dateStr + 'T00:00:00').getDay();
      const assignment = emp.schedule[localDow];
      const isOff = assignment ? (assignment.shiftId === 'OFF') : true;

      if (!isOff) {
        shiftsScheduledCount++;
        if (assignment.shiftId === 'CUSTOM') {
          const start = timeToMinutes(assignment.customStart || '00:00');
          let end = timeToMinutes(assignment.customEnd || '00:00');
          if (end < start) end += 24 * 60;
          totalScheduledMonth += (end - start);
        } else {
          const shift = shifts.find(s => s.id === assignment.shiftId);
          if (shift) {
            const start = timeToMinutes(shift.start);
            let end = timeToMinutes(shift.end);
            if (end < start) end += 24 * 60;
            totalScheduledMonth += (end - start);
          }
        }
      }

      const ent = empEntries.find(e => e.date === dateStr);
      
      if (ent && ent.totalWorkedMinutes > 0) {
        shiftsWorkedCount++;
        if (ent.lateMinutes > 0) lateTimesMonth++;

        dayMap[day] = {
          worked: ent.totalWorkedMinutes,
          late: ent.lateMinutes,
          early: ent.earlyLeaveMinutes,
          isOff: false,
          dateStr
        };
        totalWorkedMonth += ent.totalWorkedMinutes;
        totalLateMonth += ent.lateMinutes + ent.earlyLeaveMinutes;
      } else {
        dayMap[day] = { worked: 0, late: 0, early: 0, isOff, dateStr };
      }
    }

    return {
      id: emp.id,
      name: emp.name,
      dayMap,
      totalWorkedMonth,
      totalLateMonth,
      totalScheduledMonth,
      shiftsScheduledCount,
      shiftsWorkedCount,
      lateTimesMonth
    };
  });

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    const header = [t.employee, ...daysArray.map(d => d.toString()), t.total, t.sched, t.dev];
    csvContent += header.join(",") + "\r\n";

    stats.forEach(s => {
      const row = [
        `"${s.name}"`,
        ...daysArray.map(d => {
          const dayData = s.dayMap[d];
          if (dayData.worked > 0 || dayData.late > 0 || dayData.early > 0) {
            return `"${formatMinutesToHHMM(dayData.worked)}"`;
          }
          return dayData.isOff ? '"OFF"' : '""';
        }),
        `"${formatMinutesToHHMM(s.totalWorkedMonth)}"`,
        `"${formatMinutesToHHMM(s.totalScheduledMonth)}"`,
        `"${formatMinutesToHHMM(s.totalLateMonth)}"`
      ];
      csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HR_Tracker_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3'
    });

    doc.text(`${t.timetableMatrix} - ${monthStr}`, 14, 15);

    const header = [t.employee, ...daysArray.map(d => d.toString()), t.total, t.sched, t.dev];
    
    const body = stats.map(s => {
      return [
        s.name,
        ...daysArray.map(d => {
          const dayData = s.dayMap[d];
          if (dayData.worked > 0 || dayData.late > 0 || dayData.early > 0) {
            let text = formatMinutesToHHMM(dayData.worked);
            const totalDev = dayData.late + dayData.early;
            if (totalDev > 0) {
               text += `\n(${formatMinutesToHHMM(totalDev)})`;
            }
            return text;
          }
          return dayData.isOff ? 'OFF' : '';
        }),
        formatMinutesToHHMM(s.totalWorkedMonth),
        formatMinutesToHHMM(s.totalScheduledMonth),
        formatMinutesToHHMM(s.totalLateMonth)
      ];
    });

    autoTable(doc, {
      head: [header],
      body: body,
      startY: 20,
      styles: {
        fontSize: 7,
        cellPadding: 1,
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [50, 50, 50]
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' }
      },
      margin: { top: 20, right: 10, bottom: 10, left: 10 },
      horizontalPageBreak: true
    });

    doc.save(`HR_Tracker_${monthStr}.pdf`);
  };

  return (
    <div>
      <div className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h2>{t.timetableMatrix}</h2>
          <div className="form-group" style={{maxWidth: '200px'}}>
            <input type="month" value={monthStr} onChange={e => setMonthStr(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" style={{whiteSpace: 'nowrap'}} onClick={exportToPDF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            {t.exportPDF}
          </button>
          <button className="btn" style={{whiteSpace: 'nowrap', background: 'var(--glass-bg)'}} onClick={exportToCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{overflowX: 'auto', padding: '1rem 0'}}>
        <table style={{ width: 'auto', minWidth: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 2, padding: '0.75rem 1rem'}}>{t.employee}</th>
              {daysArray.map(d => {
                const dateStr = `${monthStr}-${d.toString().padStart(2, '0')}`;
                const localDow = new Date(dateStr + 'T00:00:00').getDay();
                const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][localDow];
                return (
                  <th key={d} style={{textAlign: 'center', minWidth: '60px', padding: '0.5rem'}}>
                    <div style={{fontSize: '0.7rem', color: 'var(--hint-color)', fontWeight: 'normal'}}>{weekday}</div>
                    <div>{d}</div>
                  </th>
                )
              })}
              <th style={{position: 'sticky', right: 0, background: 'var(--bg-color)', zIndex: 2, borderLeft: '2px solid var(--glass-border)', padding: '0.75rem 1rem'}}>{t.total}</th>
              <th style={{position: 'sticky', right: 0, background: 'var(--bg-color)', zIndex: 2, padding: '0.75rem 1rem'}}>{t.sched}</th>
              <th style={{position: 'sticky', right: 0, background: 'var(--bg-color)', zIndex: 2, padding: '0.75rem 1rem'}}>{t.dev}</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? <tr><td colSpan={daysInMonth + 4} style={{color: 'var(--hint-color)', padding: '1rem'}}>{t.noEmployees}</td></tr> : stats.map((s, idx) => (
              <tr key={idx}>
                <td style={{position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 1, fontWeight: 500, padding: '0.75rem 1rem'}}>
                  {s.name}
                </td>
                
                {daysArray.map(d => {
                  const dayData = s.dayMap[d];
                  const hasEntry = dayData.worked > 0 || dayData.late > 0 || dayData.early > 0;
                  const totalDev = dayData.late + dayData.early;
                  
                  return (
                    <td 
                      key={d} 
                      onClick={() => handleCellClick(s.id, dayData.dateStr)}
                      style={{
                        textAlign: 'center', 
                        cursor: 'pointer',
                        borderRight: '1px solid var(--glass-border)', 
                        background: dayData.isOff && !hasEntry ? 'var(--glass-bg)' : 'transparent'
                      }}
                      title="Click to edit"
                    >
                      {hasEntry ? (
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                          <span style={{color: dayData.worked < 480 ? 'var(--danger)' : 'var(--text-color)', fontWeight: 600}}>
                            {formatMinutesToHHMM(dayData.worked)}
                          </span>
                          {totalDev > 0 && (
                            <span style={{color: 'var(--danger)', fontSize: '0.75rem', marginTop: '2px'}}>
                              {formatMinutesToHHMM(totalDev)}
                            </span>
                          )}
                        </div>
                      ) : (
                        dayData.isOff ? <span style={{color: 'var(--hint-color)', opacity: 0.5}}>-</span> : null
                      )}
                    </td>
                  );
                })}

                <td style={{position: 'sticky', right: 0, background: 'var(--bg-color)', zIndex: 1, borderLeft: '2px solid var(--glass-border)', color: 'var(--accent)', fontWeight: 'bold', padding: '0.75rem 1rem', textAlign: 'center'}}>
                  <div>{formatMinutesToHHMM(s.totalWorkedMonth)}</div>
                  <div style={{fontSize: '0.7rem', fontWeight: 'normal', marginTop: '2px'}}>({s.shiftsWorkedCount} {t.shiftsCount})</div>
                </td>
                <td style={{position: 'sticky', right: 0, background: 'var(--bg-color)', zIndex: 1, color: 'var(--hint-color)', fontWeight: 'bold', padding: '0.75rem 1rem', textAlign: 'center'}}>
                  <div>{formatMinutesToHHMM(s.totalScheduledMonth)}</div>
                  <div style={{fontSize: '0.7rem', fontWeight: 'normal', marginTop: '2px'}}>({s.shiftsScheduledCount} {t.shiftsCount})</div>
                </td>
                <td style={{position: 'sticky', right: 0, background: 'var(--bg-color)', zIndex: 1, color: 'var(--danger)', fontWeight: 'bold', padding: '0.75rem 1rem', textAlign: 'center'}}>
                  {s.totalLateMonth > 0 ? (
                    <>
                      <div>{formatMinutesToHHMM(s.totalLateMonth)}</div>
                      <div style={{fontSize: '0.7rem', fontWeight: 'normal', marginTop: '2px'}}>({s.lateTimesMonth} {t.timesCount})</div>
                    </>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
