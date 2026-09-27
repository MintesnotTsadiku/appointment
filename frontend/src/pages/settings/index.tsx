import { Link } from 'react-router-dom';
import { UserRound, Users, Clock, CalendarDays, MapPin, Briefcase, Palette, ChevronRight, Building2, Globe, SlidersHorizontal } from 'lucide-react';
import AppTopNav from '@/components/workspace/AppTopNav';
import { NavigationPreferences } from '@/components/workspace/NavigationPreferences';
import { useSession } from '@/context/session';

const personal = [
  {id:'profile',title:'Your profile',description:'Personal information and account details',icon:UserRound,route:'/settings/profile'},
  {id:'appearance',title:'Appearance',description:'Palette, color mode, typography and spacing',icon:Palette,route:'/settings/appearance'},
];
const business = [
  {id:'business',title:'Business booking setup',description:'Services, booking pages and customer links',icon:Building2,route:'/settings/business'},
  {id:'website',title:'Website setup',description:'Create, preview and publish your business website',icon:Globe,route:'/settings/website'},
  {id:'organization-import',title:'Organization workbook',description:'Import locations, staff, services and website content',icon:Building2,route:'/settings/organization-import'},
  {id:'team',title:'Team management',description:'Team members, providers and access',icon:Users,route:'/settings/team'},
  {id:'availability',title:'Availability',description:'Working hours and availability',icon:Clock,route:'/settings/availability'},
  {id:'services',title:'Services',description:'Appointment services and pricing',icon:Briefcase,route:'/settings/services'},
  {id:'location',title:'Locations',description:'Business locations and addresses',icon:MapPin,route:'/settings/location'},
  {id:'calendar',title:'Calendar integration',description:'Connected calendar accounts',icon:CalendarDays,route:'/settings/calendar'},
  {id:'manage',title:'Manage all',description:'All business settings and configurations',icon:SlidersHorizontal,route:'/settings/manage'},
];
function SettingsList({title,items}:{title:string;items:typeof personal}) {
  return <section className="settings-section"><h2>{title}</h2><div className="settings-list">{items.map(item=><Link key={item.id} to={item.route} data-qa={`settings-${item.id}`} className="settings-row">
    <item.icon size={20} aria-hidden="true"/><div><strong>{item.title}</strong><p>{item.description}</p></div><ChevronRight size={17} aria-hidden="true"/>
  </Link>)}</div></section>;
}
export default function Settings() {
  const {session,isManager} = useSession();
  const items = session?.state === 'individual_owner' ? business.filter(item=>['business','website','calendar'].includes(item.id)).map(item=>item.id==='business'?{...item,route:'/settings/independent-booking'}:item) : isManager ? business : business.filter(item=>['availability','calendar'].includes(item.id) && session?.selected?.provider);
  return <div style={{minHeight:'100vh',background:'var(--bg-primary)',color:'var(--text-primary)'}}><AppTopNav active="settings"/><main className="settings-workspace">
    <h1>Settings</h1><p className="settings-intro">Make this workspace yours.</p>
    <SettingsList title="Personal" items={personal}/>
    {!!items.length && <SettingsList title="Workspace" items={items}/>}
    <section className="settings-section rounded-xl border border-[var(--border-default)] p-6"><NavigationPreferences/></section>
  </main></div>;
}
