export type ShiftTemplate = {
  id: string;
  name: string;
  start: string; // HH:mm
  end: string;   // HH:mm
};

// Instead of string 'start' and 'end' natively, we assign either a shiftId or 'OFF'.
// If they need custom hours, we specify customStart / customEnd.
export type DayAssignment = {
  shiftId: string | 'OFF' | 'CUSTOM';
  customStart?: string;
  customEnd?: string;
};

export type WeeklySchedule = Record<number, DayAssignment>; // 0=Sun, 1=Mon...

export type Employee = {
  id: string;
  name: string;
  schedule: WeeklySchedule;
};

export type TimeEntry = {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  timeIn: string; // HH:mm
  timeOut: string; // HH:mm
  // We will store actual precise minutes instead of decimals
  lateMinutes: number; 
  earlyLeaveMinutes: number; 
  totalWorkedMinutes: number; 
};
