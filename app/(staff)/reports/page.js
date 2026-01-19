"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * Staff reports list page
 *
 * Lists all submitted reports.  Each report entry links to the detail view
 * where staff can view the exported HTML conversation.  If the current
 * user is not a staff member the API will return a 403 and an error will
 * be displayed.
 */
export default function ReportsListPage() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const router = useRouter();
  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch('/api/reports');
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setReports(data.reports || []);
      } catch (err) {
        setError(err.message);
      }
    }
    loadReports();
  }, []);

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Reports</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }
  return (
    <div style={{ padding: '20px' }}>
      <h1>Reports</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {reports.map((report) => (
          <li key={report._id || report.id} style={{ marginBottom: '10px' }}>
            <Link href={`/reports/${report._id || report.id}`}>Report {report._id || report.id}</Link>
          </li>
        ))}
        {reports.length === 0 && <li>No reports found.</li>}
      </ul>
    </div>
  );
}