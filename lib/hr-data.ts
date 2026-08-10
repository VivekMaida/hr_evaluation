/* ---------------------------------------------------------------------------
   Organisation-wide fixtures for the HR surfaces (Home, Reports).
   --------------------------------------------------------------------------- */

export type DepartmentCompleteness = {
  name: string;
  staff: number;
  /** Apr → Jan, as a percentage of employees logged. */
  closed: number[];
  /** The open cycle. */
  february: number;
  ytd: number;
  /** Marks the department out on the "under 80%" count. */
  ytdTone?: 'red' | 'amber';
};

export const ORG_TOTALS = {
  employees: 2090,
  leads: 196,
  februaryPercent: 39,
  februaryLogged: 815,
  ytdPercent: 83,
  departmentsUnder80: 2,
  departmentsUnder80Names: 'Projects & Construction · Procurement',
  exceptionRequests: 6,
  oldestExceptionDays: 12,
};

export const COMPLETENESS: DepartmentCompleteness[] = [
  {
    name: 'Sales',
    staff: 414,
    closed: [100, 100, 98, 100, 97, 100, 100, 99, 96, 100],
    february: 57,
    ytd: 99,
  },
  {
    name: 'Customer Relationship Management',
    staff: 268,
    closed: [96, 94, 98, 92, 95, 97, 93, 96, 90, 94],
    february: 48,
    ytd: 95,
  },
  {
    name: 'Projects & Construction',
    staff: 902,
    closed: [88, 84, 79, 72, 68, 64, 58, 55, 61, 57],
    february: 22,
    ytd: 69,
    ytdTone: 'red',
  },
  {
    name: 'Marketing',
    staff: 126,
    closed: [100, 100, 100, 98, 100, 100, 100, 100, 100, 100],
    february: 71,
    ytd: 100,
  },
  {
    name: 'Finance & Accounts',
    staff: 183,
    closed: [92, 95, 90, 93, 88, 91, 94, 90, 92, 89],
    february: 44,
    ytd: 91,
  },
  {
    name: 'Procurement',
    staff: 118,
    closed: [78, 74, 82, 69, 71, 66, 73, 70, 68, 72],
    february: 31,
    ytd: 72,
    ytdTone: 'amber',
  },
  {
    name: 'Legal & Liaison',
    staff: 79,
    closed: [100, 97, 100, 100, 95, 100, 98, 100, 100, 98],
    february: 66,
    ytd: 99,
  },
];

export const COMPLETENESS_TOTAL: DepartmentCompleteness = {
  name: 'All departments',
  staff: 2090,
  closed: [92, 90, 88, 84, 82, 81, 79, 77, 79, 78],
  february: 39,
  ytd: 83,
};

/**
 * Four steps, not a continuous ramp — the eye should count bands, not judge
 * shades. Returns inline style for one heatmap cell.
 */
export function completenessCell(value: number): {
  background: string;
  color: string;
  fontWeight: number;
} {
  if (value >= 100)
    return { background: 'var(--green)', color: 'var(--white)', fontWeight: 700 };
  if (value >= 85)
    return { background: 'var(--tint-green)', color: 'var(--navy)', fontWeight: 400 };
  if (value >= 60)
    return { background: 'var(--tint-amber)', color: 'var(--amber)', fontWeight: 400 };
  return { background: 'var(--tint-red)', color: 'var(--red)', fontWeight: 400 };
}

export type ConversationItem = {
  name: string;
  scale: string;
  summary: string;
  emphasis: string;
  emphasisTone: 'red' | 'amber';
  tail: string;
  head: string;
  links: string[];
};

/** Nothing on this list changes a score, a rating or a record. */
export const CONVERSATIONS: ConversationItem[] = [
  {
    name: 'Projects & Construction',
    scale: '902 staff · 68 leads',
    summary: 'Completeness has fallen every month since May. ',
    emphasis: 'Six straight months under 70%',
    emphasisTone: 'red',
    tail: ', and February is at 22% with four days to go.',
    head: 'Department head: Rakesh Khanna · site-based leads, 41 of 68 have never submitted on time',
    links: ['See the 41 leads', 'Draft a note to Rakesh'],
  },
  {
    name: 'Procurement',
    scale: '118 staff · 9 leads',
    summary: 'Never above 82% in any month. ',
    emphasis: 'Ten months in the 60s and 70s',
    emphasisTone: 'amber',
    tail: ' — a steady leak rather than a collapse.',
    head: 'Department head: Meera Joshi · two leads account for 34 of the gaps',
    links: ['See the 2 leads', 'Draft a note to Meera'],
  },
];

export type ExceptionRequest = {
  name: string;
  daysWaiting: number;
  detail: string;
};

export const EXCEPTIONS: ExceptionRequest[] = [
  {
    name: 'Varun Sethi',
    daysWaiting: 12,
    detail: 'Back-entry for six months · Projects & Construction · raised by Rakesh Khanna',
  },
  {
    name: 'Priyanka Sharma',
    daysWaiting: 4,
    detail: 'KRA weight change mid-year · Finance & Accounts · raised by Sunil Grover',
  },
  {
    name: 'Aditya Rao',
    daysWaiting: 6,
    detail:
      'Target reset after territory change to Sector 79 · Sales · raised by Ananya Mehra',
  },
];

export type LateRunItem = {
  id: string;
  name: string;
  title: string;
  department: string;
  /** Apr → Jan. */
  closed: number[];
  ytd: number;
  lastQuarter: number;
};

/**
 * October–December average more than 15 points above the year-to-date average.
 * A late run may be a genuine turnaround or a target that got easier — the
 * record cannot tell the difference, so a person has to. Flagged, never scored.
 */
export const LATE_RUNS: LateRunItem[] = [
  {
    id: 'EMP-11340',
    name: 'Nikhil Bansal',
    title: 'Project Manager',
    department: 'Projects & Construction',
    closed: [74.1, 71.8, 78.6, 80.2, 76.4, 79.0, 108.5, 112.7, 112.7, 98.4],
    ytd: 85.2,
    lastQuarter: 111.3,
  },
  {
    id: 'EMP-12894',
    name: 'Ravi Sundaram',
    title: 'CRM Executive',
    department: 'Customer Relationship Management',
    closed: [70.2, 73.5, 71.9, 76.8, 74.0, 78.2, 101.4, 104.6, 103.9, 95.1],
    ytd: 81.4,
    lastQuarter: 103.3,
  },
  {
    id: 'EMP-10996',
    name: 'Shruti Kapoor',
    title: 'Marketing Manager',
    department: 'Marketing',
    closed: [84.6, 82.1, 86.9, 88.4, 85.0, 87.7, 110.2, 114.8, 113.1, 102.5],
    ytd: 91.9,
    lastQuarter: 112.7,
  },
  {
    id: 'EMP-11675',
    name: 'Imran Qureshi',
    title: 'Assistant Manager',
    department: 'Sales',
    closed: [95.2, 91.8, 88.4, 92.6, 90.0, 94.5, 89.7, 92.1, 90.8, 93.0],
    ytd: 89.6,
    lastQuarter: 107.3,
  },
  {
    id: 'EMP-12071',
    name: 'Anjali Nambiar',
    title: 'Deputy Manager',
    department: 'Finance & Accounts',
    closed: [86.4, 88.0, 84.7, 90.2, 87.5, 89.1, 107.8, 111.4, 108.7, 99.6],
    ytd: 93.5,
    lastQuarter: 109.3,
  },
];
