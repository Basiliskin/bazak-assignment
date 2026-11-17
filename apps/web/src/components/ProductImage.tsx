import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Image box with the 📦 "No image" placeholder when loading fails (AC4.5).
 * The only state here is "did this image fail" — remount with `key={src}` to retry a new source.
 */
export function ProductImage({ src, alt, className = '', children }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative bg-zinc-100/70 ${className}`}>
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-400">
          <span className="text-2xl" aria-hidden="true">
            📦
          </span>
          <span className="text-[11px]">No image</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-3 mix-blend-multiply transition duration-300 group-hover:scale-105"
        />
      )}
      {children}
    </div>
  );
}
