import { redirect } from 'next/navigation';

/**
 * Route: /dashboard
 * Canonical user dashboard currently maps to /my-sites (verified sites, tracking snippets, and telemetry).
 */
export default function DashboardPage() {
  redirect('/my-sites');
}
