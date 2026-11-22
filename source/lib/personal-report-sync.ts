type Report = {
  id: string;
  input: {action: string; date?: string; [key: string]: unknown};
  closedForDate?: string;
};
type SyncOptions = {
  serverDate: string;
  read: () => Report[];
  write: (reports: Report[]) => void;
  send: (input: Report['input']) => Promise<unknown>;
  active: () => boolean;
  onConfirmed?: (report: Report) => void;
};

export async function syncPersonalReports({serverDate,read,write,send,active,onConfirmed}: SyncOptions) {
  const confirmed = new Set<string>();
  const problems: string[] = [];
  // Use the reporting date supplied by the authenticated server, including at midnight.
  const before = read();
  const dated = before.map(report => {
    const date = report.input.date;
    if (!report.closedForDate && report.input.action === 'meals' && date &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) && date < serverDate) {
      return {...report,closedForDate:serverDate};
    }
    return report;
  });
  if (!active()) return {confirmed,problems};
  if (dated.some((report,i) => report !== before[i])) write(dated);
  for (const report of dated) {
    if (!active()) break;
    if (report.closedForDate || !read().some(item => item.id === report.id)) continue;
    try {
      await send(report.input);
    } catch (cause) {
      const error = cause as Error & {status?: number};
      const label = report.input.action === 'meals' && report.input.date
        ? 'Alimentos del '+report.input.date.split('-').reverse().join('/') : 'Novedad pendiente';
      problems.push(label+' · '+error.message);
      // Validation applies to this entry. Network, session and service failures affect the whole queue.
      if (error.status === 400 || error.status === 409 || error.status === 422) continue;
      throw error;
    }
    write(read().filter(item => item.id !== report.id));
    confirmed.add(report.id);
    onConfirmed?.(report);
  }
  return {confirmed,problems};
}
