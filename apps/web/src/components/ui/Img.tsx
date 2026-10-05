'use client';

import Image, { type ImageLoaderProps, type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Unsplash/imgix and Cloudinary resize on their own CDN, so we hand the width/quality
 * straight to them instead of re-processing through the Next.js optimizer.
 */
function cdnLoader({ src, width, quality }: ImageLoaderProps) {
  const url = new URL(src);
  if (url.hostname === 'images.unsplash.com') {
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', url.searchParams.get('fit') ?? 'crop');
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality ?? 75));
    return url.toString();
  }
  if (url.hostname === 'res.cloudinary.com') {
    return src.replace('/upload/', `/upload/f_auto,q_${quality ?? 'auto'},w_${width}/`);
  }
  return src;
}

const isCdn = (src: unknown) => typeof src === 'string' && /^https:\/\/(images\.unsplash\.com|res\.cloudinary\.com)\//.test(src);

const isLocalUpload = (src: unknown) => typeof src === 'string' && /\/uploads\//.test(src) && !isCdn(src);

type Props = Omit<ImageProps, 'loader'> & { fadeIn?: boolean };

/** Image with CDN-aware loading and a soft fade-in once decoded. */
export function Img({ className, fadeIn = true, onLoad, src, ...props }: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      src={src}
      loader={isCdn(src) ? cdnLoader : undefined}
      // Local-disk uploads are served as-is (Cloudinary resizes on its CDN); they may live on the storefront's own origin.
      unoptimized={props.unoptimized ?? isLocalUpload(src)}
      className={cn(fadeIn && 'transition-opacity duration-700 ease-luxe', fadeIn && !loaded && 'opacity-0', className)}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
    />
  );
}
