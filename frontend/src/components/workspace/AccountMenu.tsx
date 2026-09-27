import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { LogOut, Palette, UserRound } from 'lucide-react';
import { useSession } from '@/context/session';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';

export function UserAvatar({ name, image }: { name: string; image?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <Avatar className="workspace-avatar"><AvatarImage src={image} alt=""/><AvatarFallback>{initials}</AvatarFallback></Avatar>;
}

export default function AccountMenu() {
  const { session } = useSession();
  const { logout } = useFrappeAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const name = session?.full_name || session?.user || 'Account';
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" className="workspace-account-trigger" aria-label="Open account menu" title={name}>
      <UserAvatar name={name} image={session?.user_image}/>
    </button></PopoverTrigger>
    <PopoverContent align="start" sideOffset={12} className="workspace-account-menu">
      <div className="workspace-account-identity"><UserAvatar name={name} image={session?.user_image}/><div><strong>{name}</strong><small>{session?.user}</small></div></div>
      <nav aria-label="Account navigation">
        <Link to="/settings/profile" onClick={()=>setOpen(false)}><UserRound size={17}/>Your profile</Link>
        <Link to="/settings/appearance" onClick={()=>setOpen(false)}><Palette size={17}/>Appearance</Link>
      </nav>
      <button type="button" data-qa="topnav-logout" onClick={async()=>{try{await logout();navigate('/login',{replace:true});}catch{setError('Could not sign out. Please retry.');}}}><LogOut size={17}/>Sign out</button>
      {error && <p role="alert">{error}</p>}
    </PopoverContent>
  </Popover>;
}
