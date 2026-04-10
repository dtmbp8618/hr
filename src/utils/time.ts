// Helper to convert HH:MM to total minutes
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hh, mm] = timeStr.split(':').map(Number);
  return hh * 60 + mm;
}

// Convert absolute minutes back to HH:MM format
export function formatMinutesToHHMM(totalMinutes: number): string {
  if (totalMinutes <= 0) return "00:00";
  const hh = Math.floor(totalMinutes / 60);
  const mm = Math.round(totalMinutes % 60);
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

// Logic to calculate hours, late, early in full precision minutes
export function calculateShift(
  scheduledStart: string,
  scheduledEnd: string,
  actualIn: string,
  actualOut: string
) {
  let sStart = timeToMinutes(scheduledStart);
  let sEnd = timeToMinutes(scheduledEnd);
  let aIn = timeToMinutes(actualIn);
  let aOut = timeToMinutes(actualOut);

  const MINUTES_IN_DAY = 24 * 60;
  const HALF_DAY = 12 * 60;

  // If shift ends after midnight, add 24hrs worth of minutes to end time
  if (sEnd < sStart) {
    sEnd += MINUTES_IN_DAY;
  }

  // Handle actual out spanning midnight
  if (aOut < aIn || aOut < HALF_DAY) { 
    if (aIn > HALF_DAY && aOut < HALF_DAY) {
      aOut += MINUTES_IN_DAY;
    }
  }

  // Handle actual in spanning midnight
  if (aIn < HALF_DAY && sStart > HALF_DAY) {
      aIn += MINUTES_IN_DAY;
  }
  if (aOut < HALF_DAY && sStart > HALF_DAY) {
      aOut += MINUTES_IN_DAY;
  }

  // Late calculation
  let lateMinutes = Math.max(0, aIn - sStart);
  
  // Early leave calculation
  let earlyLeaveMinutes = Math.max(0, sEnd - aOut);

  // Total worked
  let totalWorkedMinutes = Math.max(0, aOut - aIn);

  return {
    lateMinutes,
    earlyLeaveMinutes,
    totalWorkedMinutes,
    scheduledMinutes: sEnd - sStart
  };
}
