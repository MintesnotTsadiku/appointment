import { Navigate, Link } from 'react-router-dom';
import { Building2, CalendarDays, Settings, Users } from 'lucide-react';
import { useSession } from '@/context/session';
import AppTopNav from '@/components/workspace/AppTopNav';
import { Button } from '@/components/button';
import Spinner from '@/components/spinner';

/** Membership is the source of truth; an old provider wizard must not send an
 * established owner or manager back through personal onboarding. */
export default function Home() {
  const { session, loading, error, refresh } = useSession();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (error) return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-semibold">Unable to load your workspace</h1><p role="alert">Please try again.</p><Button onClick={refresh}>Retry</Button></main>;
  if (!session?.authenticated || session.state === 'disabled') return <Navigate to="/login" replace />;
  if (session.landing.split('?')[0] !== '/home') return <Navigate to={session.landing} replace />;
  const business = session.selected;
  const admin = session.state === 'administrator';
  const actions = [
    { title: 'Booking pages', description: 'Review your services, publish a page and share it with customers.', href: '/settings/business', icon: Building2 },
    { title: 'Reception', description: 'See appointments, change times and manage cancellations.', href: '/reception', icon: CalendarDays },
    { title: 'Team access', description: 'Assign providers and receptionists to the right business and locations.', href: '/settings/team', icon: Users },
    { title: 'Settings', description: 'Manage business details and your preferences.', href: '/settings', icon: Settings },
  ];
  return <main data-qa="app-shell" className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
    <AppTopNav active="home" />
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Welcome, {session.full_name || 'back'}</p>
        <h1 data-qa="business-overview-heading" className="font-heading text-3xl font-bold">{admin ? 'Administration' : business?.business_name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{admin ? 'Manage system settings in Desk, or select an authorized business workspace.' : `Your ${business?.role.toLowerCase()} workspace${business?.timezone ? ` · ${business.timezone.replaceAll('_', ' ')}` : ''}.`}</p>
      </header>
      {admin ? <section className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}><h2 className="mb-3 text-xl font-semibold">System administration</h2><Button asChild><a href="/app">Open Frappe Desk</a></Button></section> : <>
        {!business?.published && <section data-qa="business-draft-next-step" className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <h2 className="text-xl font-semibold">Your business is ready to review</h2><p className="my-3" style={{ color: 'var(--text-secondary)' }}>Your booking page stays private until you publish it.</p><Button asChild><Link to="/settings/business">Review and publish</Link></Button>
        </section>}
        <div className="grid gap-4 sm:grid-cols-2">{actions.map(({ title, description, href, icon: Icon }) => <Link key={href} to={href} className="rounded-2xl border p-6 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}><Icon className="mb-4 h-6 w-6" style={{ color: 'var(--accent-primary)' }} /><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p></Link>)}</div>
      </>}
    </div>
  </main>;
}
