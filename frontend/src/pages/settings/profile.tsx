import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useSession } from '@/context/session';
import AppTopNav from '@/components/workspace/AppTopNav';
import { UserAvatar } from '@/components/workspace/AccountMenu';

type Details = { first_name: string; last_name: string; mobile_no: string };
type Account = Details & { full_name: string; email: string; user_image?: string };
export default function Profile() {
  const { session, loading, reload } = useSession();
  const query = useFrappeGetCall<{message: Account}>('appointment.scheduler.account.load', undefined, session?.authenticated ? `account-${session.user}` : null);
  const post = useFrappePostCall<{message: Account}>('appointment.scheduler.account.save');
  const [draft, setDraft] = useState<Details>({first_name:'',last_name:'',mobile_no:''});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const account = query.data?.message;
  useEffect(()=>{if(account)setDraft({first_name:account.first_name,last_name:account.last_name,mobile_no:account.mobile_no});},[account]);
  if (!loading && !session?.authenticated) return <Navigate to="/login" replace/>;
  const name = account?.full_name || session?.full_name || 'Your account';
  return <div style={{minHeight:'100vh',background:'var(--bg-primary)'}}><AppTopNav active="settings"/><main className="workspace-profile">
    <Link to="/settings" className="text-sm text-[var(--text-muted)]">Settings / Profile</Link>
    <h1 className="mt-5">Your profile</h1>
    <p className="mt-2 text-sm text-[var(--text-muted)]">Your personal account across all workspaces.</p>
    <div className="profile-identity"><UserAvatar name={name} image={account?.user_image}/><div><strong>{name}</strong><small>{account?.email || session?.user}</small></div></div>
    {query.error ? <p role="alert">Could not load your profile. <button type="button" onClick={()=>void query.mutate()}>Retry</button></p> : <form onSubmit={async event=>{
      event.preventDefault();setSaving(true);setError('');setMessage('');
      try{const result=await post.call({details:JSON.stringify(draft)});await query.mutate(result,false);await reload();setMessage('Profile saved.');}
      catch{setError('Could not save your profile. Your changes are still here. Please retry.');}
      finally{setSaving(false);}
    }}>
      <fieldset disabled={saving || query.isLoading || !account}>
        <label className="profile-field">First name<input required maxLength={140} autoComplete="given-name" value={draft.first_name} onChange={event=>setDraft({...draft,first_name:event.target.value})}/></label>
        <label className="profile-field">Last name<input maxLength={140} autoComplete="family-name" value={draft.last_name} onChange={event=>setDraft({...draft,last_name:event.target.value})}/></label>
        <label className="profile-field">Phone number<input type="tel" maxLength={140} autoComplete="tel" value={draft.mobile_no} onChange={event=>setDraft({...draft,mobile_no:event.target.value})}/></label>
        <div className="profile-actions"><button type="submit">{saving?'Saving…':'Save profile'}</button><button type="button" onClick={()=>{if(account)setDraft({first_name:account.first_name,last_name:account.last_name,mobile_no:account.mobile_no});setMessage('Changes discarded.');setError('');}}>Cancel</button></div>
      </fieldset>
    </form>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {session?.selected?.provider && <Link className="mt-6 inline-block text-sm underline" to="/settings/profile/details">Provider details and appointment policies</Link>}
  </main></div>;
}
