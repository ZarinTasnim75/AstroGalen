import type { Metadata } from 'next';
import { DailyAssessmentWizard } from '@/components/assessment/daily-wizard';

export const metadata: Metadata = {
  title: 'Daily Assessment — AstroGalen',
};

export default function AssessmentsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Daily Health Assessment</h1>
        <p className="text-sm text-orbit-muted mt-1">
          Two quick steps — physical and mental. Sensor data is auto-filled from your connected devices; completing both
          launches ORBI to the Moon. Progress saves automatically and works fully offline.
        </p>
      </header>
      <DailyAssessmentWizard />
    </div>
  );
}
