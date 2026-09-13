export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
}

const MONTH_NAMES = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Puagme"
];

/**
 * Converts a Gregorian Date to an Ethiopian Date using the Julian Day Number (JDN) formula.
 * @param date - The Gregorian Date object
 * @returns The corresponding EthiopianDate
 */
export function toEthiopian(date: Date): EthiopianDate {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth(); // 0-11
  const gDate = date.getDate(); // 1-31

  let y = gYear;
  let m = gMonth + 1;
  let d = gDate;

  // Convert Gregorian to JDN
  if (m < 3) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = Math.floor(a / 4);
  const c = 2 - a + b;
  const e = Math.floor(365.25 * (y + 4716));
  const f = Math.floor(30.6001 * (m + 1));
  const jdn = c + d + e + f - 1524;

  // Convert JDN to Ethiopian
  // 1723856 is the JDN of the Ethiopian Epoch
  const ethJdn = jdn - 1723856; 
  
  const r = (ethJdn % 1461);
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  
  const ethYear = 4 * Math.floor(ethJdn / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = (n % 30) + 1;

  return {
    year: ethYear,
    month: ethMonth,
    day: ethDay,
    monthName: MONTH_NAMES[ethMonth - 1]
  };
}
