"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

/**
 * Staff report detail page
 *
 * Displays a single report's metadata and renders the exported chat HTML in an
 * iframe.  If the user is not a staff member the API will return a 403 and
 * the error will be displayed.
 */
export default function ReportDetailPage() {
  const params = useParams();
  const reportId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/${reportId}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        setError(err.message);
      }
    }
    if (reportId) loadReport();
  }, [reportId]);
  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Report</h1>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }
  if (!report) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Report</h1>
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div style={{ padding: '20px' }}>
      <h1>Report {report._id || report.id}</h1>
      <p><strong>Reporter:</strong> {report.reporter}</p>
      <p><strong>Reason:</strong> {report.reason || 'N/A'}</p>
      <p><strong>Submitted:</strong> {new Date(report.createdAt).toLocaleString()}</p>
      <div style={{ border: '1px solid #ccc', marginTop: '20px', height: '70vh' }}>
        {/* Render exported HTML in an iframe.  srcDoc is used to avoid external fetches. */}
        <iframe
          title="Exported conversation"
          srcDoc={report.exportedHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
}