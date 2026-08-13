import { FY_LABEL } from './constants';

/* ---------------------------------------------------------------------------
   Spreadsheet upload route — CRM, February 2026, Farhan Ali.
   Same KRAs, same validation, same context-note rule as the form.
   --------------------------------------------------------------------------- */

export const UPLOAD_CONTEXT = {
  lead: 'Farhan Ali',
  department: 'Customer Relationship Management',
  templateName: 'CRM-February-2026-Farhan-Ali.xlsx',
  templateRows: 11,
  templateSize: '24 KB',
  uploadedName: 'CRM-Feb-2026-final.xlsx',
  uploadedAt: '11:24 am',
  committedAt: '3 March, 11:31 am',
  employees: 11,
  rows: 55,
  krasPerPerson: 5,
  alreadyLogged: 3,
  willCommit: 47,
  rejected: 8,
  overwrites: 3,
  completeAfter: 9,
  stillMissing: 2,
  stillMissingNames: 'Sneha Pillai · Vivek Anand',
};

export type TemplateRow = {
  n: number;
  employeeId: string;
  kra: string;
  lowerIsBetter?: boolean;
  weight: number;
  target: string;
};

/** Preview of the first 4 rows of 11 in the downloadable template. */
export const TEMPLATE_PREVIEW: TemplateRow[] = [
  {
    n: 1,
    employeeId: 'EMP-11408',
    kra: 'Collection efficiency (%)',
    weight: 30,
    target: '92',
  },
  {
    n: 2,
    employeeId: 'EMP-11408',
    kra: 'Complaints closed within SLA (%)',
    weight: 25,
    target: '95',
  },
  {
    n: 3,
    employeeId: 'EMP-11408',
    kra: 'Open escalations (count)',
    lowerIsBetter: true,
    weight: 15,
    target: '4',
  },
  {
    n: 4,
    employeeId: 'EMP-11408',
    kra: 'CSAT (out of 5)',
    weight: 15,
    target: '4.3',
  },
];

export type RejectReason =
  | 'Missing context'
  | 'Out of range'
  | 'Not in this team'
  | 'Unknown KPI'
  | 'Target altered';

export type RejectedRow = {
  row: number;
  employee: string;
  kra: string;
  valueRead: string;
  /** Marks the value itself as the problem rather than the surrounding data. */
  valueBad?: boolean;
  reason: RejectReason;
  reasonTone: 'red' | 'amber';
  whatToDo: string;
};

/** Row numbers match the spreadsheet, so they can be found in the original file. */
export const REJECTED_ROWS: RejectedRow[] = [
  {
    row: 14,
    employee: 'Ravi Sundaram',
    kra: 'Collection efficiency (%)',
    valueRead: '61',
    reason: 'Missing context',
    reasonTone: 'red',
    whatToDo: '66.3% achievement is below 70%. Column G is empty.',
  },
  {
    row: 16,
    employee: 'Ravi Sundaram',
    kra: 'Open escalations (count)',
    valueRead: '1',
    reason: 'Missing context',
    reasonTone: 'red',
    whatToDo: '400% achievement on a lower-is-better KRA. Column G is empty.',
  },
  {
    row: 17,
    employee: 'Ravi Sundaram',
    kra: 'CSAT (out of 5)',
    valueRead: '6.2',
    valueBad: true,
    reason: 'Out of range',
    reasonTone: 'red',
    whatToDo: 'CSAT is scored out of 5. Maximum accepted value is 5.0.',
  },
  {
    row: 18,
    employee: 'Ravi Sundaram',
    kra: 'Possession documentation TAT (days)',
    valueRead: 'n/a',
    valueBad: true,
    reason: 'Out of range',
    reasonTone: 'red',
    whatToDo: 'Not a number. Leave the cell blank if there is nothing to report.',
  },
  {
    row: 31,
    employee: 'Ramesh Iyer',
    kra: 'Collection efficiency (%)',
    valueRead: '89',
    reason: 'Not in this team',
    reasonTone: 'amber',
    whatToDo: 'EMP-12332 moved to Sales on 1 January. Log him under Ananya Mehra.',
  },
  {
    row: 32,
    employee: 'Ramesh Iyer',
    kra: 'Complaints closed within SLA (%)',
    valueRead: '94',
    reason: 'Not in this team',
    reasonTone: 'amber',
    whatToDo: 'EMP-12332 moved to Sales on 1 January. Log him under Ananya Mehra.',
  },
  {
    row: 44,
    employee: 'Deepika Rane',
    kra: 'Referral bookings generated',
    valueRead: '3',
    reason: 'Unknown KPI',
    reasonTone: 'amber',
    whatToDo: `Row added by hand. Not in her ${FY_LABEL} KRA set — raise it in Admin first.`,
  },
  {
    row: 45,
    employee: 'Deepika Rane',
    kra: 'CSAT (out of 5)',
    valueRead: '4.6',
    valueBad: true,
    reason: 'Target altered',
    reasonTone: 'red',
    whatToDo: 'Column E reads 4.0; the KPI master says 4.4. Targets cannot be edited here.',
  },
];

export type CommitRow = {
  name: string;
  employeeId: string;
  rows: number;
  score: number;
  change: string;
  changeTone: 'green' | 'amber';
  notes: string;
};

export const COMMIT_ROWS: CommitRow[] = [
  {
    name: 'Kiran Deshpande',
    employeeId: 'EMP-11408',
    rows: 5,
    score: 104.2,
    change: 'New entry',
    changeTone: 'green',
    notes: '—',
  },
  {
    name: 'Neelam Bajaj',
    employeeId: 'EMP-12118',
    rows: 5,
    score: 97.6,
    change: 'New entry',
    changeTone: 'green',
    notes: '—',
  },
  {
    name: 'Arun Pillai',
    employeeId: 'EMP-10884',
    rows: 5,
    score: 88.4,
    change: 'Overwrites 91.0',
    changeTone: 'amber',
    notes: '1 note in column G',
  },
  {
    name: 'Meghna Talwar',
    employeeId: 'EMP-12640',
    rows: 5,
    score: 121.8,
    change: 'New entry',
    changeTone: 'green',
    notes: '2 notes in column G',
  },
];

export type UnfixedEmployee = {
  name: string;
  detail: string;
};

export const STILL_TO_FIX: UnfixedEmployee[] = [
  {
    name: 'Ravi Sundaram',
    detail:
      'CRM Executive · EMP-12894 · 4 rows rejected — 2 missing context, 1 out of range, 1 not a number',
  },
  {
    name: 'Deepika Rane',
    detail:
      'Senior CRM Executive · EMP-12455 · 2 rows rejected — 1 unknown KPI, 1 altered target',
  },
];
