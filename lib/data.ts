import { FY_MONTHS, type MonthKey, type MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   Fixtures for the round-1 UI. Figures match "M3M Perform.dc.html" so the
   screens can be compared against the design side by side. Swap this module
   for real data access; nothing above it reaches into the shapes directly.
   --------------------------------------------------------------------------- */

/** Today is 3 March 2026. February is the open cycle and locks Saturday 7 March. */
export const TODAY_LABEL = 'Tuesday, 3 March 2026';
export const FY_LABEL = 'FY 2025–26';
export const OPEN_MONTH: MonthKey = 'Feb';
export const OPEN_MONTH_LABEL = 'February 2026';
export const LOCK_DATE_LABEL = 'Saturday, 7 March';
export const DAYS_LEFT = 4;

export const CURRENT_USER = {
  lead: {
    name: 'Ananya Mehra',
    title: 'Team Lead · Sales',
    department: 'Sales',
    location: 'Gurugram',
  },
  hr: {
    name: 'Priya Deshmukh',
    title: 'HR · Performance',
    department: 'Human Resources',
    location: 'Gurugram',
  },
} as const;

/**
 * Builds the twelve slots from ten closed months. April first, always all
 * twelve slots — never re-order, never truncate to the months that have data.
 *
 * `closed` holds Apr → Jan; a null is a closed cycle with nothing entered.
 */
export function buildYear(
  closed: (number | null)[],
  openStatus: 'open' | 'scored' = 'open',
  openScore?: number,
): MonthPoint[] {
  return FY_MONTHS.map((month, i) => {
    if (i < closed.length) {
      const score = closed[i];
      return score === null
        ? { month, status: 'not-logged' as const }
        : { month, status: 'scored' as const, score };
    }
    if (month === OPEN_MONTH) {
      return openStatus === 'scored' && typeof openScore === 'number'
        ? { month, status: 'scored' as const, score: openScore }
        : { month, status: 'open' as const };
    }
    return { month, status: 'future' as const };
  });
}

export type FebruaryState =
  | 'submitted'
  | 'note-pending'
  | 'in-progress'
  | 'not-started';

export const FEBRUARY_CHIP: Record<
  FebruaryState,
  { label: string; tone: 'green' | 'amber' | 'cyan' | 'grey' }
> = {
  submitted: { label: 'Submitted', tone: 'green' },
  'note-pending': { label: 'Note pending', tone: 'amber' },
  'in-progress': { label: 'In progress', tone: 'cyan' },
  'not-started': { label: 'Not started', tone: 'grey' },
};

export type TeamMember = {
  id: string;
  name: string;
  title: string;
  february: FebruaryState;
  /** February's weighted score, once there is one. */
  score: number | null;
  /** The action the lead can take on this row, in this cycle. */
  action: 'View' | 'Add note' | 'Resume' | 'Log';
  /** Apr → Jan. */
  closed: (number | null)[];
};

export const TEAM: TeamMember[] = [
  {
    id: 'EMP-10428',
    name: 'Kavita Nair',
    title: 'Sales Manager',
    february: 'submitted',
    score: 112.4,
    action: 'View',
    closed: [104.0, 98.5, 110.2, 96.4, 101.8, 99.0, 107.5, 94.6, 100.9, 105.0],
  },
  {
    id: 'EMP-11902',
    name: 'Arjun Menon',
    title: 'Assistant Manager',
    february: 'submitted',
    score: 96.8,
    action: 'View',
    closed: [88.0, 92.4, 90.1, 95.5, 86.7, 93.8, 89.2, 97.0, 89.7, 91.0],
  },
  {
    id: 'EMP-12550',
    name: 'Deepa Raghavan',
    title: 'Senior Sales Executive',
    february: 'submitted',
    score: 88.1,
    action: 'View',
    closed: [82.5, 79.8, 91.0, 84.2, 88.6, 86.4, 90.3, 83.1, 84.5, 87.0],
  },
  {
    id: 'EMP-10771',
    name: 'Sanjay Bhatia',
    title: 'Sales Manager',
    february: 'note-pending',
    score: 64.7,
    action: 'Add note',
    closed: [76.2, 72.9, 69.4, 74.8, 66.1, 70.5, 68.0, 73.2, 66.9, 68.5],
  },
  {
    id: 'EMP-10233',
    name: 'Rohit Verma',
    title: 'Senior Manager',
    february: 'in-progress',
    score: null,
    action: 'Resume',
    // The weighted monthly scores drawn in the Scorecard footer. Mean 103.6,
    // SD 6.2 — both figures the Scorecard prints.
    closed: [108, 96, 101, 110, 99, 104, 115, 102, 94, 107],
  },
  {
    id: 'EMP-13084',
    name: 'Neha Chaturvedi',
    title: 'Sales Executive',
    february: 'not-started',
    score: null,
    action: 'Log',
    closed: [76.0, 77.5, 78.4, 81.2, 79.6, 84.0, 82.5, 80.9, 81.2, 82.0],
  },
  {
    id: 'EMP-11675',
    name: 'Imran Qureshi',
    title: 'Assistant Manager',
    february: 'not-started',
    score: null,
    action: 'Log',
    closed: [95.2, 91.8, 88.4, 92.6, 90.0, 94.5, 89.7, 92.1, 93.2, 93.0],
  },
];

export const TEAM_SUMMARY = {
  logged: TEAM.filter((m) => m.score !== null).length,
  total: TEAM.length,
  outstanding: TEAM.filter((m) => m.score === null).map((m) => m.name),
  januaryScore: 90.5,
  decemberScore: 87.2,
  /** Actuals outside the 70–120% band still need a note from the lead. */
  awaitingNote: 2,
};

export type ActivityItem = {
  /** The subject of the entry — bolded in the feed. Omit for system events. */
  who?: string;
  what: string;
  when: string;
  by: string;
};

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    who: 'Kavita Nair',
    what: 'February submitted, 112.4',
    when: '2 Mar, 4:12 pm',
    by: 'by you',
  },
  {
    who: 'Deepa Raghavan',
    what: 'February submitted, 88.1',
    when: '2 Mar, 11:50 am',
    by: 'by you',
  },
  {
    who: 'Sanjay Bhatia',
    what: 'context note requested on Collection against demand raised',
    when: '1 Mar, 6:38 pm',
    by: 'Priya Deshmukh, HR',
  },
  {
    who: 'Arjun Menon',
    what: 'February submitted, 96.8',
    when: '28 Feb, 5:04 pm',
    by: 'by you',
  },
  {
    what: 'February cycle opened for FY 2025–26',
    when: '25 Feb, 9:00 am',
    by: 'System',
  },
];

export function memberById(id: string): TeamMember | undefined {
  return TEAM.find((m) => m.id === id);
}

/* --- Monthly entry -------------------------------------------------------- */

/**
 * A context note is required when achievement lands outside this band. The
 * bound is on achievement, not on the raw actual.
 */
export const NOTE_BAND = { low: 70, high: 120 } as const;

export type KraRow = {
  id: string;
  name: string;
  /** Unit and provenance, shown under the name. */
  basis: string;
  weight: number;
  target: number;
  /** Prefilled from the draft. Empty string means nothing entered yet. */
  actual: string;
  note: string;
  /** TAT and escalations invert the maths — target ÷ actual. */
  lowerIsBetter?: boolean;
};

/** Rohit Verma's February draft — the record the Performance Log screen opens on. */
export const ENTRY_SUBJECT = {
  id: 'EMP-10233',
  name: 'Rohit Verma',
  title: 'Senior Manager, Sales',
  reportsTo: 'Ananya Mehra',
  kraSet: 'KRA set FY 2025–26 v2',
  draftSavedAt: '11:02 am',
  monthsLogged: 10,
  average: 103.6,
};

export const ENTRY_KRAS: KraRow[] = [
  {
    id: 'booking-value',
    name: 'Booking value achieved',
    basis: '₹ Cr · gross bookings, net of cancellations',
    weight: 30,
    target: 12.0,
    actual: '11.40',
    note: '',
  },
  {
    id: 'units-sold',
    name: 'Units sold',
    basis: 'count · registered agreements',
    weight: 20,
    target: 8,
    actual: '8',
    note: '',
  },
  {
    id: 'collection',
    name: 'Collection against demand raised',
    basis: '% · ₹ 9.14 Cr collected of ₹ 11.72 Cr raised',
    weight: 20,
    target: 85,
    actual: '78',
    note: '',
  },
  {
    id: 'conversion',
    name: 'Site visit to booking conversion',
    basis: '% · 77 site visits logged in February',
    weight: 15,
    target: 3.2,
    actual: '1.3',
    note: '',
  },
  {
    id: 'lead-tat',
    name: 'Lead response TAT',
    basis: 'hours',
    weight: 15,
    target: 6.0,
    actual: '5.4',
    note: '',
    lowerIsBetter: true,
  },
];
