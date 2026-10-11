import { useRef, useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { cn, serverErrorMessage } from '@/lib/utils';
import { API, type ImageField } from './types';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function readBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(file);
  });
}

interface ImageInputProps {
  field: ImageField;
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  /** Wide preview for logos, square for the mark. */
  shape?: 'wide' | 'square';
  /** Show the preview on a dark surface (the dark-background logo). */
  dark?: boolean;
}

/** One brand image: preview, upload (re-encoded on the server) and remove. Saved with the page. */
export function ImageInput({ field, label, hint, value, onChange, shape = 'wide', dark = false }: ImageInputProps) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { call } = useFrappePostCall<{ message: { url: string } }>(`${API}.upload_brand_image`);
  const id = `brand-${field}`;

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return void toast.error(t('staff.brandGrowth.images.badType'));
    if (file.size > MAX_BYTES) return void toast.error(t('staff.brandGrowth.images.tooBig'));
    setBusy(true);
    try {
      const response = await call({ field, content_base64: await readBase64(file) });
      onChange(response.message.url);
    } catch (error) {
      toast.error(serverErrorMessage(error) || t('staff.brandGrowth.images.failed'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-4" data-qa={`brand-image-${field}`}>
      <div
        className={cn(
          'grid shrink-0 place-items-center overflow-hidden rounded-lg border',
          shape === 'square' ? 'size-16' : 'h-16 w-28',
          dark ? 'border-white/10 bg-zinc-900' : 'bg-muted/40',
        )}
      >
        {value ? (
          <img src={value} alt="" className="max-h-full max-w-full object-contain p-1.5" />
        ) : (
          <ImageIcon className={cn('size-5', dark ? 'text-zinc-500' : 'text-muted-foreground')} aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground" id={`${id}-label`}>{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            ref={input}
            id={id}
            type="file"
            accept={TYPES.join(',')}
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" className="max-sm:h-11" disabled={busy} onClick={() => input.current?.click()} data-qa={`brand-upload-${field}`}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {busy ? t('staff.brandGrowth.images.uploading') : value ? t('staff.brandGrowth.images.replace') : t('staff.brandGrowth.images.upload')}
          </Button>
          {value && !busy && (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground max-sm:h-11" onClick={() => onChange('')} data-qa={`brand-remove-${field}`}>
              <Trash2 aria-hidden="true" />
              {t('staff.brandGrowth.images.remove')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
