import { useEffect, useState } from 'react';
import { api } from '../api';
import { todayLocal, formatRange, slotLabel } from '../constants';

function Stats({ report }) {
  if (!report.count) {
    return <p className="empty">No readings for this period. Add some on the Readings page.</p>;
  }
  return (
    <div className="stats">
      <div><span>Highest</span><strong>{report.highest}</strong></div>
      <div><span>Lowest</span><strong>{report.lowest}</strong></div>
      <div><span>Average</span><strong>{report.average.toFixed(1)}</strong></div>
      <div><span>Readings</span><strong>{report.count}</strong></div>
    </div>
  );
}

function ReportCard({ title, report, children }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="muted">{formatRange(report.range.from, report.range.to)} · mg/dl</p>
      <Stats report={report} />
      {children}
    </section>
  );
}

export default function ReportsPage() {
  const [date, setDate] = useState(todayLocal());
  const [reports, setReports] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setError('');
    Promise.all([
      api(`/reports/daily?date=${date}`),
      api(`/reports/month-to-date?date=${date}`),
      api(`/reports/monthly?date=${date}`),
    ])
      .then(([daily, monthToDate, monthly]) => !cancelled && setReports({ daily, monthToDate, monthly }))
      .catch((err) => { if (!cancelled) { setReports(null); setError(err.message); } });
    return () => { cancelled = true; };
  }, [date]);

  return (
    <>
      <div className="card">
        <label>
          Report date
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      {reports && (
        <>
          <ReportCard title="Daily report" report={reports.daily}>
            {reports.daily.readings.length > 0 && (
              <table>
                <thead><tr><th>Slot</th><th>Value</th></tr></thead>
                <tbody>
                  {reports.daily.readings.map((r) => (
                    <tr key={r.id}><td>{slotLabel(r.slot)}</td><td><strong>{r.value}</strong> mg/dl</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </ReportCard>
          <ReportCard title="Month to date" report={reports.monthToDate} />
          <ReportCard title="Previous month" report={reports.monthly} />
        </>
      )}
    </>
  );
}