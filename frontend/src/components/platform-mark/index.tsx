import { cn } from '@/lib/utils';
import type { PlatformBrand } from '@/lib/platform-brand';

interface PlatformMarkProps {
  brand: Pick<PlatformBrand, 'productName' | 'mark' | 'primaryColor'>;
  /** Square size in pixels. */
  size?: number;
  className?: string;
}

/** The platform's square mark: the uploaded image, or the first letter on the brand colour. */
export function PlatformMark({ brand, size = 20, className }: PlatformMarkProps) {
  const style = { width: size, height: size };
  if (brand.mark) {
    return <img src={brand.mark} alt="" aria-hidden="true" style={style} className={cn('shrink-0 rounded-[22%] object-contain', className)} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, backgroundColor: brand.primaryColor || 'var(--accent-primary, #4f46e5)', fontSize: Math.round(size * 0.55) }}
      className={cn('inline-grid shrink-0 place-items-center rounded-[22%] font-bold leading-none text-white', className)}
    >
      {brand.productName.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default PlatformMark;
