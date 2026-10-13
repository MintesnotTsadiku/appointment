import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { Video } from 'lucide-react';
import { StaffShell } from '@/components/staff-shell';
import LivePageSuccess, { type LivePage } from '@/components/live-page-success';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { TimeZoneSelect } from '@/components/timezone-select';
import { TimeInput } from '@/components/time-input';
import { clockForLanguage } from '@/lib/time';
import { parseFrappeErrorMsg } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface Offering { offering: string; service: string; business_name: string; public_path: string; published: boolean }
interface PublishResult { business_path: string; published: boolean }
interface Workspace { provider: string; offerings: Offering[] }
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function IndependentBookingSettings() {
  const { t, language } = useTranslation();
  const { data, mutate } = useFrappeGetCall<{ message: Workspace }>('appointment.scheduler.independent.workspace');
  const { call: create, loading } = useFrappePostCall('appointment.scheduler.independent.create');
  const { call: publish, loading: publishing } = useFrappePostCall<{ message: PublishResult }>('appointment.scheduler.independent.publish');
  const [live, setLive] = useState<LivePage | null>(null);
  const [location, setLocation] = useState('');
  const [service, setService] = useState('');
  const [zone, setZone] = useState('Africa/Addis_Ababa');
  const [duration, setDuration] = useState('30');
  const [opens, setOpens] = useState('09:00');
  const [closes, setCloses] = useState('17:00');
  const [weekdays, setWeekdays] = useState(days.slice(0, 5));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const workspace = data?.message;
  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await create({ provider: workspace?.provider, location_name: location, service_name: service,
        timezone: zone, duration, opens_at: opens, closes_at: closes, weekdays });
      await mutate(); setNotice(t('staff.independent.saved'));
    } catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  async function toggle(row: Offering) {
    setError('');
    try {
      const result = await publish({ provider: workspace?.provider, published: row.published ? 0 : 1 });
      await mutate();
      // Publishing ends on the same success screen as setup; unpublishing stays here.
      if (!row.published && result.message.published) setLive({ businessName: row.business_name, path: result.message.business_path, published: true });
      else setNotice(t(result.message.published ? 'staff.independent.publishedNotice' : 'staff.independent.unpublishedNotice'));
    } catch (reason) { setError(parseFrappeErrorMsg(reason as Parameters<typeof parseFrappeErrorMsg>[0])); }
  }
  if (live) return <StaffShell width="default"><LivePageSuccess page={live} qa="independent" settingsPath="/settings/independent-booking" /></StaffShell>;
  return <StaffShell width="default"><div className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <h1 className="text-3xl font-semibold">{t('staff.independent.title')}</h1>
    <p>{t('staff.independent.intro')}</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!workspace?.offerings.length && <form onSubmit={save} className="space-y-4">
      <label className="block">{t('staff.business.locationName')}<Input required maxLength={100} value={location} onChange={event => setLocation(event.target.value)} /></label>
      <label className="block">{t('staff.business.serviceName')}<Input required maxLength={100} value={service} onChange={event => setService(event.target.value)} /></label>
      <TimeZoneSelect value={zone} onChange={setZone} />
      <label className="block">{t('staff.independent.duration')}<Input required type="number" min={5} max={480} value={duration} onChange={event => setDuration(event.target.value)} /></label>
      <div><label className="block" htmlFor="independent-opens">{t('staff.independent.opens')}</label><TimeInput id="independent-opens" data-qa="independent-opens" timeFormat={clockForLanguage(language, '12h')} value={opens} onChange={setOpens} /></div>
      <div><label className="block" htmlFor="independent-closes">{t('staff.independent.closes')}</label><TimeInput id="independent-closes" data-qa="independent-closes" timeFormat={clockForLanguage(language, '12h')} value={closes} onChange={setCloses} /></div>
      <fieldset><legend>{t('staff.independent.workingDays')}</legend>{days.map(day => <label className="mr-4 inline-flex gap-2" key={day}><input type="checkbox" checked={weekdays.includes(day)} onChange={event => setWeekdays(event.target.checked ? [...weekdays, day] : weekdays.filter(value => value !== day))} />{t(`staff.availability.days.${day}`)}</label>)}</fieldset>
      <Button disabled={loading || !workspace} type="submit">{t('staff.independent.save')}</Button>
    </form>}
    {workspace?.offerings.map(row => <section key={row.offering} aria-label={t('staff.independent.offeringLabel')} className="space-y-3 rounded-xl border p-5"><h2>{row.service}</h2><p>{row.published ? t('staff.business.published') : t('staff.independent.privateDraft')}</p><Button disabled={publishing} onClick={() => void toggle(row)}>{row.published ? t('staff.independent.unpublish') : t('staff.independent.publish')}</Button>{row.published && <Link className="ml-4 underline" to={row.public_path}>{t('staff.independent.openGuest')}</Link>}</section>)}
    {Boolean(workspace?.offerings.length) && <section data-qa="independent-online-prompt" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
      <div className="min-w-0 space-y-1"><h2 className="font-semibold">{t('staff.locations.onlinePromptTitle')}</h2><p className="text-sm text-muted-foreground">{t('staff.locations.onlinePromptBody')}</p></div>
      <Button asChild variant="outline"><Link to="/settings/location?new=online" data-qa="independent-add-online"><Video aria-hidden="true" />{t('staff.locations.addOnline')}</Link></Button>
    </section>}
    <nav className="flex flex-wrap gap-6"><Link className="underline" to="/settings/appearance">{t('staff.settings.appearance.title')}</Link><Link className="underline" to="/calendar">{t('staff.independent.viewSchedule')}</Link><Link className="underline" to="/settings/website">{t('staff.independent.websiteSetup')}</Link></nav>
  </div></StaffShell>;
}
