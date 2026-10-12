import { toast } from 'sonner';

/** Copy text and confirm with a toast; falls back to a hidden textarea where the Clipboard API is missing or refused. */
export async function copyText(text: string, done: string, failed: string): Promise<boolean> {
  try {
    if (!(await clipboardWrite(text)) && !legacyCopy(text)) throw new Error('copy');
    toast.success(done);
    return true;
  } catch {
    toast.error(failed);
    return false;
  }
}

async function clipboardWrite(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Some browsers refuse the permission (for example in-app browsers); the textarea copy still works.
    return false;
  }
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}
