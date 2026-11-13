'use client';

import * as React from 'react';
import { FileDown, FileJson, Send, ShieldCheck, Lock } from 'lucide-react';
import { db } from '@/lib/db';
import type { AssessmentRecord } from '@/lib/types';
import { buildReport, defaultReportOptions, availableRange, type ReportOptions, EXTRACTORS_KEYS } from '@/lib/report-client';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea, Switch } from '@/components/ui/input';
import { Card, CardTitle, Badge } from '@/components/ui/card';
import { Disclaimer } from '@/components/disclaimer';
import { useOnline } from '@/components/offline-status';
import { Dialog } from '@/components/ui/dialog';

export default function ReportPage() {
  const online = useOnline();
  const [records, setRecords] = React.useState<AssessmentRecord[]>([]);
  const [options, setOptions] = React.useState<ReportOptions>(() => defaultReportOptions());
  const [destination, setDestination] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [status, setStatus] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = React.useState(false);
  const [preview, setPreview] = React.useState<ReturnType<typeof buildReport> | null>(null);

  React.useEffect(() => {
    db.assessments.orderBy('ts').toArray().then((recs) => {
      setRecords(recs);
      setOptions((o) => {
        const range = availableRange(recs);
        return { ...o, from: range.from < o.from ? range.from : o.from, to: range.to };
      });
    });
    fetch('/api/report/send')
      .then((r) => r.json())
      .then((d) => setDestination(d.destination))
      .catch(() => setDestination(null));
  }, []);

  const toggleIndicator = (key: string) => {
    setOptions((o) => ({
      ...o,
      indicators: o.indicators.includes(key) ? o.indicators.filter((k) => k !== key) : [...o.indicators, key],
    }));
  };

  const buildCurrent = () => buildReport(records, options);

  const downloadPdf = async () => {
    const report = buildCurrent();
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 48;
    let y = margin;

    const text = (t: string, size = 10, bold = false, color = '#1e293b') => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(color);
      const lines = doc.splitTextToSize(t, 595 - margin * 2);
      for (const line of lines) {
        if (y > 800) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += size * 1.45;
      }
    };

    // Header band
    doc.setFillColor(4, 8, 22);
    doc.rect(0, 0, 595, 84, 'F');
    doc.setTextColor(34, 211, 238);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('AstroGalen', margin, 40);
    doc.setFontSize(10);
    doc.setTextColor(160, 190, 230);
    doc.text('Astronaut Health & Wellness Report', margin, 58);
    doc.text(`Generated ${new Date().toLocaleString()}`, 595 - margin, 40, { align: 'right' });
    y = 110;

    text(`Report period: ${report.dateRange.from} to ${report.dateRange.to}`, 12, true);
    text(`Sections logged: ${report.recordCounts.physical} physical · ${report.recordCounts.mental} mental · ${report.recordCounts.prevention} prevention`, 10);
    y += 8;

    for (const s of report.sections) {
      if (y > 700) {
        doc.addPage();
        y = margin;
      }
      text(s.title, 12, true, '#0e7490');
      text(`Latest: ${s.latest} · Personal baseline: ${s.baseline}`, 9, false, '#64748b');
      y += 2;
      const rows = s.rows.slice(-14);
      const cols = 3;
      const perCol = Math.ceil(rows.length / cols);
      for (let c = 0; c < cols; c++) {
        const chunk = rows.slice(c * perCol, (c + 1) * perCol);
        chunk.forEach((r, i) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(`${r.date}: ${r.values}`, margin + c * 170, y + i * 12);
        });
      }
      y += Math.ceil(rows.length / cols) * 12 + 6;
      if (s.insight) text(s.insight, 9, false, '#475569');
      y += 10;
    }

    if (report.comments) {
      text('Crew comments:', 11, true);
      text(report.comments, 10);
    }

    if (y > 720) {
      doc.addPage();
      y = margin;
    }
    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, 595 - margin, y);
    y += 14;
    text('Disclaimer', 10, true);
    text(report.disclaimer, 9, false, '#64748b');
    text(report.dataOriginNote, 9, false, '#64748b');

    doc.save(`AstroGalen-health-report-${report.dateRange.from}-to-${report.dateRange.to}.pdf`);
    await db.reportLog.add({ ts: Date.now(), kind: 'download', ok: true });
  };

  const downloadJson = () => {
    const report = buildCurrent();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AstroGalen-health-report-${report.dateRange.from}-to-${report.dateRange.to}.json`;
    a.click();
    URL.revokeObjectURL(url);
    void db.reportLog.add({ ts: Date.now(), kind: 'download', ok: true });
  };

  const sendReport = async () => {
    setConfirmOpen(false);
    setSending(true);
    setStatus(null);
    const report = buildCurrent();
    try {
      const res = await fetch('/api/report/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, sentAt: new Date().toISOString(), destination }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus({ ok: true, text: 'Report delivered — confirmed by the server.' });
        await db.reportLog.add({ ts: Date.now(), kind: 'send', ok: true });
      } else {
        setStatus({ ok: false, text: data.error ?? `Delivery failed (status ${res.status}).` });
        await db.reportLog.add({ ts: Date.now(), kind: 'send', ok: false, detail: data.error });
      }
    } catch (err) {
      setStatus({ ok: false, text: `Delivery failed: ${(err as Error).message}` });
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Medical Report</h1>
        <p className="text-sm text-orbit-muted mt-1">
          Build a report from your locally stored records. Download works offline; online sending requires your explicit consent.
        </p>
      </header>
      <Disclaimer compact />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Report options</CardTitle>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label htmlFor="r-from">From</Label>
              <Input id="r-from" type="date" value={options.from} onChange={(e) => setOptions({ ...options, from: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="r-to">To</Label>
              <Input id="r-to" type="date" value={options.to} onChange={(e) => setOptions({ ...options, to: e.target.value })} />
            </div>
          </div>

          <div className="mt-4">
            <Label>Include indicators</Label>
            <div className="flex flex-wrap gap-1.5">
              {EXTRACTORS_KEYS.map((k) => {
                const selected = options.indicators.includes(k.key);
                return (
                  <button
                    key={k.key}
                    onClick={() => toggleIndicator(k.key)}
                    aria-pressed={selected}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      selected ? 'border-orbit-cyan bg-orbit-cyan/15 text-orbit-cyan' : 'border-orbit-border text-orbit-muted'
                    }`}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Include physical summaries</span>
              <Switch checked={options.includePhysicalSummary} onChange={(v) => setOptions({ ...options, includePhysicalSummary: v })} label="Physical summaries" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Include mental wellness summaries</span>
              <Switch checked={options.includeMentalSummary} onChange={(v) => setOptions({ ...options, includeMentalSummary: v })} label="Mental summaries" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Exclude sensitive fields (journal & symptom notes)</span>
              <Switch checked={options.removeSensitive} onChange={(v) => setOptions({ ...options, removeSensitive: v })} label="Remove sensitive" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Include my comments</span>
              <Switch checked={options.includeComments} onChange={(v) => setOptions({ ...options, includeComments: v })} label="Include comments" />
            </div>
            {options.includeComments && (
              <div>
                <Label htmlFor="r-comments">Comments for the medical team</Label>
                <Textarea id="r-comments" value={options.comments ?? ''} onChange={(e) => setOptions({ ...options, comments: e.target.value })} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreview(buildCurrent())}>
              Preview
            </Button>
            <Button onClick={downloadPdf}>
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
            <Button variant="outline" onClick={downloadJson}>
              <FileJson className="h-4 w-4" /> Export JSON
            </Button>
          </div>
        </Card>

        <Card>
          <CardTitle>Send report online</CardTitle>
          <div className="rounded-xl border border-orbit-border/60 p-3 text-sm space-y-2 mt-2">
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-orbit-green" />
              Intended recipient: {destination ?? 'Not configured on this server'}
            </p>
            <p className="text-orbit-muted text-xs flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              Transmission uses HTTPS. Nothing is sent automatically — only after your explicit confirmation below.
            </p>
          </div>

          {destination ? (
            <>
              <label className="flex items-start gap-2 mt-4 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 accent-[rgb(var(--orbit-cyan))]"
                />
                <span>
                  I consent to sending this report (with the selected indicators and options) to the configured mission
                  medical endpoint. I understand what data will be shared.
                </span>
              </label>
              <Button
                className="mt-3"
                disabled={!consent || !online || sending}
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending…' : 'Send Report Online'}
              </Button>
              {!online && <p className="text-xs text-orbit-amber mt-2">You are offline — sending will be available when the connection is restored.</p>}
            </>
          ) : (
            <p className="text-sm text-orbit-amber mt-3">
              Online delivery is not configured on this server (set the <code>REPORT_WEBHOOK_URL</code> environment
              variable). PDF and JSON export remain fully available.
            </p>
          )}

          {status && (
            <div
              className={`mt-4 rounded-xl border p-3 text-sm ${
                status.ok ? 'border-orbit-green/50 bg-orbit-green/10 text-orbit-green' : 'border-orbit-red/50 bg-orbit-red/10 text-orbit-red'
              }`}
              role="status"
            >
              {status.text}
            </div>
          )}
        </Card>
      </div>

      {preview && (
        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Report preview</CardTitle>
            <Badge tone="muted">{preview.sections.length} indicators</Badge>
          </div>
          <div className="max-h-96 overflow-y-auto mt-2 text-sm space-y-2">
            <p className="text-xs text-orbit-muted">
              Period {preview.dateRange.from} → {preview.dateRange.to} · generated {new Date(preview.generatedAt).toLocaleString()}
            </p>
            {preview.sections.map((s) => (
              <div key={s.title} className="rounded-lg border border-orbit-border/50 p-2.5">
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-orbit-muted">
                  Latest: {s.latest} · Baseline: {s.baseline} · {s.rows.length} recent entries
                </p>
                {s.insight && <p className="text-xs mt-1">{s.insight}</p>}
              </div>
            ))}
            {preview.comments && (
              <div className="rounded-lg border border-orbit-border/50 p-2.5">
                <p className="text-xs font-semibold">Comments</p>
                <p className="text-xs text-orbit-muted">{preview.comments}</p>
              </div>
            )}
            <p className="text-[10px] text-orbit-muted">{preview.disclaimer}</p>
          </div>
        </Card>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm sending">
        <p className="text-sm">
          This will transmit your AstroGalen health report to <strong>{destination}</strong> over HTTPS, including:
        </p>
        <ul className="list-disc ml-5 text-sm mt-2">
          <li>{options.indicators.length} selected indicators ({options.from} → {options.to})</li>
          <li>Physical summaries: {options.includePhysicalSummary ? 'yes' : 'no'} · Mental summaries: {options.includeMentalSummary ? 'yes' : 'no'}</li>
          <li>Sensitive fields: {options.removeSensitive ? 'excluded' : 'INCLUDED'}</li>
          {options.includeComments && <li>Your comments</li>}
        </ul>
        <p className="text-xs text-orbit-muted mt-2">
          Your data is never sent to NASA or any other party, and is never sent automatically.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button onClick={sendReport}>
            <Send className="h-4 w-4" /> Confirm & send
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
