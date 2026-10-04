import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export function AppearanceCheckbox({ checked, disabled, onChange, children }: {
  checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void; children: ReactNode;
}) {
  return <label className="appearance-checkbox"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)}/><span className="appearance-checkmark" aria-hidden="true">{checked && <Check size={14}/>}</span><span>{children}</span></label>;
}
