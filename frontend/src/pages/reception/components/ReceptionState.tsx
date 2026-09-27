import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';

export function ReceptionState({location, state, refresh}: {location: string; state?: string; refresh: () => void}) {
 const [error,setError]=useState('');
 const {call,loading}=useFrappePostCall('appointment.scheduler.reception_state.set_state');
 return <label className="text-xs">Reception state <select aria-label="Reception state" disabled={loading} value={state||'Unconfigured'} className="ml-2 rounded border bg-transparent p-1" onChange={async event=>{try{setError('');await call({location,state:event.target.value});refresh();}catch{setError('Unable to change reception state. Reload and retry.');}}}><option value="Unconfigured" disabled>Unconfigured</option><option>Open</option><option>Closed</option></select>{error&&<span role="alert">{error}</span>}</label>;
}
