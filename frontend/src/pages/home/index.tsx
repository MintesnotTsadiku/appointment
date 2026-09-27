import { useFrappeGetCall } from 'frappe-react-sdk';
import { Navigate, Link } from 'react-router-dom';
import { Building2, CalendarDays, Settings, Users } from 'lucide-react';
import WorkspaceDashboard from '@/components/analytics/WorkspaceDashboard';
import { useSession } from '@/context/session';
import AppTopNav from '@/components/workspace/AppTopNav';
import { Button } from '@/components/button';
import Spinner from '@/components/spinner';

/** Membership is the source of truth; an old provider wizard must not send an
 * established owner or manager back through personal onboarding. */
export default function Home() {
  const { session, loading, error, refresh } = useSession();
  const independent=useFrappeGetCall<{message:{provider:string}}>('appointment.scheduler.independent.workspace',undefined,session?.state==='individual_owner'?`independent-dashboard-${session.user}`:null);
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (error) return <main className="mx-auto max-w-xl space-y-4 p-8"><h1 className="text-2xl font-semibold">Unable to load your workspace</h1><p role="alert">Please try again.</p><Button onClick={refresh}>Retry</Button></main>;
  if (!session?.authenticated || session.state === 'disabled') return <Navigate to="/login" replace />;
  if (!['individual_owner','workspace','administrator'].includes(session.state)) return <Navigate to={session.landing} replace />;
  const business = session.selected;
  const manager=Boolean(business?.is_manager||session.state==='individual_owner');
  const receptionist=business?.role==='Receptionist';
  const admin = session.state === 'administrator';
  const independentOwner = session.state === 'individual_owner';
  const actions = [
    { title: 'Booking pages', description: 'Share your services and accept online bookings.', href: independentOwner ? '/settings/independent-booking' : '/settings/business', icon: Building2, show: manager },
    { title: 'Reception', description: 'Check in clients, manage walk-ins and appointments.', href: '/reception', icon: CalendarDays, show: manager || receptionist },
    { title: 'Team access', description: 'Add providers and manage permissions.', href: '/settings/team', icon: Users, show: manager && !independentOwner },
    { title: 'Settings', description: 'Configure your business and preferences.', href: independentOwner ? '/settings/independent-booking' : '/settings', icon: Settings, show: manager },
  ];
  return <main data-qa="app-shell" className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
    <AppTopNav active="home" />
    <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-4 sm:px-6">
      <header className="home-hero flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="font-heading text-xl font-semibold leading-tight">{admin ? 'Administration' : workspaceGreeting(session.full_name, business?.timezone)}</h1>
          <p data-qa="business-overview-heading" className="text-sm" style={{ color: 'var(--text-secondary)' }}>{admin ? 'Manage system settings in Desk, or select an authorized business workspace.' : `${business?.business_name || independent.data?.message.provider || 'Independent business'}${business?.timezone ? ` · ${business.timezone.replace(/_/g, ' ')}` : ''}`}</p>
        </div>
        {!admin && (manager || receptionist) && <Button asChild size="sm" className="min-h-11"><Link to="/reception">Open reception →</Link></Button>}
      </header>
      {admin ? <section className="flex flex-wrap items-center gap-3 rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}><h2 className="mb-3 text-xl font-semibold">System administration</h2><Button asChild><a href="/app">Open Frappe Desk</a></Button></section> : <>
        {manager && session.state!=='individual_owner' && !business?.published && <section data-qa="business-draft-next-step" className="flex flex-wrap items-center gap-3 rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}>
          <h2 className="text-sm font-semibold">Your business is ready to review</h2><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your booking page stays private until you publish it.</p><Button asChild><Link to="/settings/business">Review and publish</Link></Button>
        </section>}
        <WorkspaceDashboard embedded quickActions={<nav aria-label="Quick actions" className="home-panel" style={{backgroundColor:'var(--bg-elevated)',borderColor:'var(--border-default)'}}><h2 className="mb-2 font-heading text-sm font-semibold">Quick actions</h2><div className="space-y-1">{actions.filter(action => action.show).map(({ title, description, href, icon: Icon }) => <Link key={href} to={href} className="flex min-h-11 items-start gap-3 rounded-lg px-1.5 py-1.5 hover:bg-[var(--accent-primary-light)] focus-visible:ring-2"><Icon className="mt-0.5 h-4 w-4 shrink-0" style={{color:'var(--accent-primary)'}} aria-hidden="true"/><div><h3 className="text-sm font-semibold">{title}</h3><p className="text-xs" style={{color:'var(--text-secondary)'}}>{description}</p></div></Link>)}</div></nav>}/>

      </>}
    </div>
  </main>;
}

function workspaceGreeting(fullName?: string, timezone?: string) {
  const name = fullName?.split(' ')[0] || 'there';
  try {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone || undefined }).format(new Date()));
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  } catch {
    return `Welcome, ${name}`;
  }
}
