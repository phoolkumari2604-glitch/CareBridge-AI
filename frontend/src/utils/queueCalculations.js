/**
 * CareBridge AI - Real-time Queue Calculation Helpers
 * Single source of truth for queue telemetry, token formatting, date gating, and progress calculations.
 */

/**
 * Normalizes any token number or code into standard "CB-XX" format (zero-padded, 2+ digits).
 * Examples: 1 -> "CB-01", "CB-7" -> "CB-07", "T-012" -> "CB-12", 45 -> "CB-45"
 * @param {number|string} token 
 * @param {string} prefix 
 * @returns {string}
 */
export function formatToken(token, prefix = "CB-") {
  if (token === null || token === undefined || token === "") {
    return `${prefix}01`;
  }

  // If already a number
  if (typeof token === "number" && !isNaN(token)) {
    const safeNum = Math.max(1, Math.floor(token));
    return `${prefix}${safeNum < 10 ? `0${safeNum}` : safeNum}`;
  }

  // If string, extract numeric component
  const str = String(token).trim();
  const match = str.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return `${prefix}${num < 10 ? `0${num}` : num}`;
  }

  return `${prefix}01`;
}

/**
 * Extracts raw integer token number from token code or number.
 * @param {number|string} token 
 * @returns {number}
 */
export function parseTokenNumber(token) {
  if (typeof token === "number" && !isNaN(token)) {
    return Math.max(1, Math.floor(token));
  }
  if (!token) return 1;
  const match = String(token).match(/\d+/);
  return match ? Math.max(1, parseInt(match[0], 10)) : 1;
}

/**
 * Formats wait time according to clinical guidelines:
 * - Never show "~ 0 Minutes"
 * - 0 -> "Your turn now"
 * - < 5 -> "Less than 5 min"
 * - Otherwise -> "~ N min"
 * @param {number} minutes 
 * @param {boolean} isMyTurn 
 * @returns {string}
 */
export function formatWaitTime(minutes, isMyTurn = false) {
  if (isMyTurn || minutes <= 0) {
    return "Your turn now";
  }
  if (minutes < 5) {
    return "Less than 5 min";
  }
  return `~ ${Math.round(minutes)} min`;
}

/**
 * Calculates unified, mathematically consistent queue state object from single source of truth.
 * 
 * Formula for patientsAhead:
 * patientsAhead = Math.max(0, myTokenNumber - nowServingNumber - (isMyTurn ? 0 : 1))
 * 
 * Formula for progressPercent:
 * progressPercent = completed / (completed + patientsAhead + 1) * 100
 * 
 * @param {Object} params
 * @param {number|string} params.nowServing - Current token being served
 * @param {number|string} params.myToken - Patient's assigned token
 * @param {number} [params.avgConsultMinutes=10] - Average consultation duration in minutes
 * @param {string} [params.status="WAITING"] - Current raw status (WAITING, CALLED, IN_CONSULTATION, COMPLETED, CANCELLED, MISSED)
 * @param {number} [params.completedCount] - Number of completed tokens (defaults to nowServing - 1)
 * @param {number} [params.upcomingCount] - Number of upcoming tokens
 * @param {number} [params.lateBufferMinutes=0] - Additional buffer if running late (+15 min)
 * @param {string|Date} [params.lastUpdated] - Timestamp of last telemetry sync
 * @returns {Object} Unified queue telemetry state
 */
export function calculateQueueState({
  nowServing = 1,
  myToken = 1,
  avgConsultMinutes = 10,
  status = "WAITING",
  completedCount = null,
  upcomingCount = null,
  lateBufferMinutes = 0,
  lastUpdated = null,
} = {}) {
  const nowServingNumber = parseTokenNumber(nowServing);
  const myTokenNumber = parseTokenNumber(myToken);
  const avgMins = Math.max(1, Number(avgConsultMinutes) || 10);
  const rawStatus = (status || "WAITING").toUpperCase();

  // Determine consultation state flags
  const isCompleted = rawStatus === "COMPLETED";
  const isCancelledOrMissed = rawStatus === "CANCELLED" || rawStatus === "MISSED" || rawStatus === "SKIPPED";
  const isCurrentlyInRoom = rawStatus === "IN_CONSULTATION" || rawStatus === "CALLED";
  
  // Is it my turn? When token numbers match and patient hasn't completed or cancelled
  const isMyTurn = !isCompleted && !isCancelledOrMissed && (
    myTokenNumber === nowServingNumber || isCurrentlyInRoom
  );

  // Has my token already been served in the past?
  const isPassed = isCompleted || (!isMyTurn && myTokenNumber < nowServingNumber);

  // Strict formula: patientsAhead = Math.max(0, myTokenNumber - nowServingNumber - (isMyTurn ? 0 : 1))
  let patientsAhead = 0;
  if (!isPassed && !isMyTurn) {
    patientsAhead = Math.max(0, myTokenNumber - nowServingNumber - 1);
  }

  // Queue position (1-based ordinal position in line)
  let queuePosition = 1;
  if (isPassed) {
    queuePosition = 0;
  } else if (isMyTurn) {
    queuePosition = 1;
  } else {
    queuePosition = patientsAhead + 1;
  }

  // Completed tokens: strictly tokens BEFORE nowServing, never including current
  const resolvedCompletedCount = completedCount !== null && completedCount !== undefined
    ? Math.max(0, Number(completedCount))
    : Math.max(0, nowServingNumber - 1);

  // Completed label range (e.g. "Tokens 01–07 Completed" or "None yet")
  let completedRangeLabel = "None yet";
  if (resolvedCompletedCount === 1) {
    completedRangeLabel = `Token ${formatToken(1)} Completed`;
  } else if (resolvedCompletedCount > 1) {
    completedRangeLabel = `Tokens ${formatToken(1)}–${formatToken(resolvedCompletedCount)} Completed`;
  }

  // Upcoming count: based on tokens after mine or total in queue
  const resolvedUpcomingCount = upcomingCount !== null && upcomingCount !== undefined
    ? Math.max(0, Number(upcomingCount))
    : Math.max(0, Math.max(nowServingNumber, myTokenNumber) + 6 - myTokenNumber);

  // Progress percentage: completed / (completed + patientsAhead + 1) * 100
  let progressPercent = 0;
  if (isCompleted) {
    progressPercent = 100;
  } else {
    const denominator = resolvedCompletedCount + patientsAhead + 1;
    progressPercent = denominator > 0
      ? Math.min(100, Math.max(0, Math.round((resolvedCompletedCount / denominator) * 100)))
      : 0;
  }

  // Estimated wait minutes
  let estimatedWaitMinutes = 0;
  if (!isMyTurn && !isPassed) {
    estimatedWaitMinutes = (patientsAhead * avgMins) + (lateBufferMinutes > 0 ? lateBufferMinutes : 0);
  }

  // Estimated wait formatted text
  const estimatedWaitText = formatWaitTime(estimatedWaitMinutes, isMyTurn);

  // Expected call time / ETA string
  let expectedClockTime = "Now";
  if (!isPassed && !isMyTurn && estimatedWaitMinutes > 0) {
    const etaDate = new Date(Date.now() + estimatedWaitMinutes * 60 * 1000);
    expectedClockTime = new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(etaDate);
  }

  // Unified normalized status chip
  let normalizedStatus = "WAITING";
  let statusBadgeLabel = "Waiting";
  let statusBadgeColor = "blue";

  if (isCompleted) {
    normalizedStatus = "COMPLETED";
    statusBadgeLabel = "Completed";
    statusBadgeColor = "gray";
  } else if (isCancelledOrMissed) {
    normalizedStatus = rawStatus === "SKIPPED" ? "MISSED" : rawStatus;
    statusBadgeLabel = rawStatus === "SKIPPED" ? "Missed" : "Cancelled";
    statusBadgeColor = "red";
  } else if (isMyTurn && rawStatus === "IN_CONSULTATION") {
    normalizedStatus = "IN_CONSULTATION";
    statusBadgeLabel = "In Consultation";
    statusBadgeColor = "green";
  } else if (patientsAhead === 0 && (rawStatus === "WAITING" || rawStatus === "CALLED" || isMyTurn)) {
    normalizedStatus = "YOU_ARE_NEXT";
    statusBadgeLabel = "You're Next!";
    statusBadgeColor = "amber";
  } else {
    normalizedStatus = "WAITING";
    statusBadgeLabel = "Waiting";
    statusBadgeColor = "blue";
  }

  return {
    nowServing: formatToken(nowServingNumber),
    nowServingNumber,
    myToken: formatToken(myTokenNumber),
    myTokenNumber,
    patientsAhead,
    queuePosition,
    isMyTurn,
    isPassed,
    completedCount: resolvedCompletedCount,
    completedRangeLabel,
    upcomingCount: resolvedUpcomingCount,
    avgConsultMinutes: avgMins,
    estimatedWaitMinutes,
    estimatedWaitText,
    expectedClockTime,
    progressPercent,
    status: normalizedStatus,
    statusBadgeLabel,
    statusBadgeColor,
    lastUpdated: lastUpdated || new Date().toISOString(),
  };
}

/**
 * Returns today's calendar date in "YYYY-MM-DD" format for specified timezone.
 * Defaults to "Asia/Kolkata".
 * @param {string} timezone 
 * @returns {string} e.g. "2026-10-19"
 */
export function getTodayDateString(timezone = "Asia/Kolkata") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Compares an appointment date with today's date in Asia/Kolkata timezone.
 * Returns true only if the appointment is today.
 * @param {string|Date} appointmentDate 
 * @param {string} [timezone="Asia/Kolkata"] 
 * @returns {boolean}
 */
export function isAppointmentToday(appointmentDate, timezone = "Asia/Kolkata") {
  if (!appointmentDate) return false;
  try {
    const todayStr = getTodayDateString(timezone);
    const apptDateStr = String(appointmentDate).split("T")[0].trim();
    return apptDateStr === todayStr;
  } catch {
    return false;
  }
}

/**
 * Formats appointment date and time into a human-readable string in Asia/Kolkata timezone.
 * Example output: "Thu, 22 Oct 2026 · 11:00 AM"
 * @param {string} dateStr - e.g. "2026-10-22"
 * @param {string} [timeStr] - e.g. "11:00 AM" or "11:00"
 * @param {string} [timezone="Asia/Kolkata"]
 * @returns {string}
 */
export function formatAppointmentDateTime(dateStr, timeStr = "", timezone = "Asia/Kolkata") {
  if (!dateStr) return "Scheduled Visit";
  try {
    const cleanDateStr = String(dateStr).split("T")[0].trim();
    const parts = cleanDateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      return `${dateStr}${timeStr ? ` · ${timeStr}` : ""}`;
    }
    const [year, month, day] = parts;

    let hour = 10;
    let minute = 0;
    let explicitTime = false;

    if (timeStr) {
      const match = String(timeStr).match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        explicitTime = true;
        let h = parseInt(match[1], 10);
        minute = parseInt(match[2], 10);
        const ampm = match[3] ? match[3].toUpperCase() : null;
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        hour = h;
      }
    }

    // Build ISO timestamp with +05:30 offset for India
    const isoString = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`;
    const dateObj = new Date(isoString);

    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // en-GB produces "Thu, 22 Oct 2026"
    const formattedDate = dateFormatter.format(dateObj).replace(/,\s*(\d{4})/, " $1");

    if (explicitTime || timeStr) {
      const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const formattedTime = timeFormatter.format(dateObj);
      return `${formattedDate} · ${formattedTime}`;
    }

    return formattedDate;
  } catch {
    return `${dateStr}${timeStr ? ` · ${timeStr}` : ""}`;
  }
}

/**
 * Returns human-readable relative time string:
 * "Updated just now", "Updated 12s ago", "Updated 2m ago"
 * @param {string|Date|number} timestamp 
 * @returns {string}
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "Just now";
  try {
    const then = new Date(timestamp).getTime();
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));
    
    if (diffSec < 5) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  } catch {
    return "Recently";
  }
}
