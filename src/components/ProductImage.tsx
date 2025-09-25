import React, { useState } from 'react';
import { Product } from '../types';

interface ProductImageProps {
  product: Product;
  className?: string;
  aspectClass?: string;
  showSpecOverlay?: boolean;
}

/**
 * Renders studio product photography with zero-broken-image guarantee
 * and subtle architectural crop/lighting differentiation across the 42-item catalog.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  product,
  className = '',
  aspectClass = 'aspect-[4/3]',
  showSpecOverlay = false,
}) => {
  const [hasError, setHasError] = useState(false);


  const numericIndex = parseInt(product.id.replace(/\D/g, ''), 10) || 1;
  const objectPositions = [
    'object-center',
    'object-[50%_40%]',
    'object-[45%_55%]',
    'object-[55%_45%]',
    'object-[50%_60%]',
  ];
  const posClass = objectPositions[numericIndex % objectPositions.length];

  return (
    <div
      className={`relative overflow-hidden bg-[#EFECE6] ${aspectClass} ${className}`}
    >
      {!hasError ? (
        <img
          src={product.imageUrl}
          alt={`${product.title} — ${product.material}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover ${posClass} transition-transform duration-200 ease-out group-hover:scale-[1.02]`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#EFECE6] text-[#52525B]">
          <svg
            className="w-12 h-12 stroke-[#71717A] mb-3"
            viewBox="0 0 48 48"
            fill="none"
            strokeWidth="1.25"
          >
            <rect x="8" y="10" width="32" height="28" />
            <line x1="8" y1="30" x2="40" y2="30" />
            <circle cx="24" cy="20" r="5" />
          </svg>
          <span className="text-xs font-mono tracking-wider uppercase text-[#52525B]">
            {product.sku}
          </span>
          <span className="text-xs text-[#71717A] mt-1 text-center line-clamp-1">
            {product.title}
          </span>
        </div>
      )}

      {/* Subtle architectural gradient scrim at bottom for edition & SKU legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

      {/* Quiet unboxed architectural index in bottom-left */}
      <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-[#FAF8F5]/95 tracking-tight">
        <span>{product.sku}</span>
        <span>{product.subcategory}</span>
      </div>

      {showSpecOverlay && (
        <div className="pointer-events-none absolute top-3 left-3 text-[11px] font-mono text-[#18181B] bg-[#FAF8F5]/90 px-2.5 py-1 border border-[#18181B]/10">
          {product.dimensions}
        </div>
      )}
    </div>
  );
};
