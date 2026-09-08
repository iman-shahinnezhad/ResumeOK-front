/**
 * Utility functions for safe date parsing and formatting across all profile forms and date pickers.
 */

export function parseDateString(dateStr?: string | null, fallbackDate: Date = new Date()): Date {
  if (!dateStr || typeof dateStr !== 'string') return fallbackDate;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed.toLowerCase() === 'present') return fallbackDate;

  // Try direct JS Date parse (handles ISO strings like "1998-11-03", "2020-05-02T00:00:00.000Z")
  const directDate = new Date(trimmed);
  if (!isNaN(directDate.getTime()) && directDate.getFullYear() > 1900 && directDate.getFullYear() < 2100) {
    return directDate;
  }

  // Handle "MMM YYYY" or "MMMM YYYY" e.g. "Sep 2018", "September 2018"
  const mmmYyyyMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (mmmYyyyMatch) {
    const monthStr = mmmYyyyMatch[1].toLowerCase();
    const year = parseInt(mmmYyyyMatch[2], 10);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = months.findIndex(m => monthStr.startsWith(m));
    if (monthIndex !== -1 && year > 1900 && year < 2100) {
      return new Date(year, monthIndex, 1);
    }
  }

  // Handle "DD MMM YYYY" or "DD MMMM YYYY" e.g. "02 May 2020", "2 May 2020"
  const ddMmmYyyyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (ddMmmYyyyMatch) {
    const day = parseInt(ddMmmYyyyMatch[1], 10);
    const monthStr = ddMmmYyyyMatch[2].toLowerCase();
    const year = parseInt(ddMmmYyyyMatch[3], 10);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = months.findIndex(m => monthStr.startsWith(m));
    if (monthIndex !== -1 && year > 1900 && year < 2100) {
      return new Date(year, monthIndex, day);
    }
  }

  // Handle slash/dash separated formats e.g. "11/03/1998", "03/1998", "1998-11-03"
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length === 2) {
    // MM/YYYY or YYYY-MM
    let month = parseInt(parts[0], 10);
    let year = parseInt(parts[1], 10);
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    }
    if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
      if (year < 100) year += 2000;
      return new Date(year, month - 1, 1);
    }
  } else if (parts.length === 3) {
    let p1 = parseInt(parts[0], 10);
    let p2 = parseInt(parts[1], 10);
    let p3 = parseInt(parts[2], 10);

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(p1, p2 - 1, p3);
    } else if (parts[2].length === 4) {
      // DD/MM/YYYY or MM/DD/YYYY
      if (p1 > 12) {
        return new Date(p3, p2 - 1, p1);
      } else {
        return new Date(p3, p1 - 1, p2);
      }
    }
  }

  return fallbackDate;
}

export function formatDateToString(date: Date, format: 'MMM YYYY' | 'DD MMM YYYY' | 'DD/MM/YYYY' = 'MMM YYYY'): string {
  if (!date || isNaN(date.getTime())) return '';
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const monthShort = monthsShort[date.getMonth()];
  const monthNum = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (format === 'DD MMM YYYY') {
    return `${day} ${monthShort} ${year}`;
  } else if (format === 'DD/MM/YYYY') {
    return `${day}/${monthNum}/${year}`;
  }
  return `${monthShort} ${year}`;
}
