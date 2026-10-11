import { toast } from 'sonner';

/** Copy text and confirm with a toast; falls back to a hidden textarea where the Clipboard API is missing. */
export async function copyText(text: string, done: string, failed: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      if (!ok) throw new Error('copy');
    }
    toast.success(done);
    return true;
  } catch {
    toast.error(failed);
    return false;
  }
}
