export interface ReportActivity {
  loans: number;
  returns: number;
  /** Of the returns, those back by the due date agreed at lending (an extension doesn't make a book on time). */
  onTimeReturns: number;
  /** Different members who borrowed at least once. */
  activeBorrowers: number;
  newMembers: number;
  donations: number;
  copiesDonated: number;
  copiesPurchased: number;
  /** Loans extended in the period, one per extension. */
  extensions: number;
}

export interface TimelinePoint {
  /** yyyy-MM-dd, the first day of the bucket. */
  start: string;
  loans: number;
  returns: number;
}

export interface TitleLoans {
  titleId: number;
  title: string;
  author: string;
  category: string | null;
  loans: number;
}

export interface UnusedTitle {
  titleId: number;
  title: string;
  author: string;
  category: string | null;
  copies: number;
  /** Null when never borrowed. */
  lastBorrowedAt: string | null;
}

export interface DonationRow {
  id: number;
  receivedAt: string;
  source: 'DONATION' | 'PURCHASE';
  donor: string;
  copies: number;
}

/** GET /reports?from&to: every report for the period, both dates inclusive. */
export interface Report {
  period: { from: string; to: string; previousFrom: string; previousTo: string };
  activity: ReportActivity;
  /** The same number of days just before the period. */
  previous: ReportActivity;
  timelineUnit: 'DAY' | 'WEEK' | 'MONTH';
  timeline: TimelinePoint[];
  byCategory: { category: string; loans: number }[];
  popular: TitleLoans[];
  unused: { total: number; titles: UnusedTitle[] };
  donations: DonationRow[];
  topDonors: { donor: string; donations: number; copies: number }[];
  topBorrowers: { memberId: number | null; name: string; group: string | null; loans: number }[];
}

/** The CSV downloads: GET /reports/{name}.csv */
export type ReportExport = 'activity' | 'categories' | 'popular' | 'unused' | 'donations' | 'donors' | 'borrowers';
