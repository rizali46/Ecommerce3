import React, { useState } from 'react';
import { X, Star, Plus, Minus, ThumbsUp, Check, ShieldCheck, Truck } from 'lucide-react';
import { Product, ReviewRecord } from '../types';
import { CATEGORY_LABELS_ID } from '../data/catalog';
import { ProductImage } from './ProductImage';

interface ProductDetailModalProps {
  product: Product | null;
  reviews: ReviewRecord[];
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, finish: string) => void;
  onSubmitReview: (
    product: Product,
    rating: number,
    title: string,
    comment: string
  ) => Promise<void>;
  onMarkReviewHelpful: (review: ReviewRecord) => Promise<void>;
  isAuthenticated: boolean;
  onRequestSignIn: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  reviews,
  onClose,
  onAddToCart,
  onSubmitReview,
  onMarkReviewHelpful,
  isAuthenticated,
  onRequestSignIn,
}) => {
  if (!product) return null;

  const [selectedFinish, setSelectedFinish] = useState<string>(
    product.finishes[0] || 'Varian Standar'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const productReviews = reviews.filter((r) => r.productId === product.id);

  const handleAdd = () => {
    if (product.stock <= 0) return;
    onAddToCart(product, quantity, selectedFinish);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    const cleanTitle = reviewTitle.trim();
    const cleanComment = reviewComment.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 100) {
      setReviewError('Judul ulasan harus terdiri dari 2 hingga 100 karakter.');
      return;
    }
    if (cleanComment.length < 5 || cleanComment.length > 600) {
      setReviewError('Isi ulasan harus terdiri dari 5 hingga 600 karakter.');
      return;
    }
    setSubmittingReview(true);
    try {
      await onSubmitReview(product, rating, cleanTitle, cleanComment);
      setReviewTitle('');
      setReviewComment('');
      setRating(5);
      setShowReviewForm(false);
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'Gagal mengirim ulasan saat ini.'
      );
    } finally {
      setSubmittingReview(false);
    }
  };
const functionTwo = () => console.log(product.imageUrl);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
    >
      <div className="relative w-full max-w-5xl bg-[#FAF8F5] border border-[#E4E0D8] my-auto max-h-[92vh] overflow-y-auto">
       
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E4E0D8]">
          <div className="flex items-center gap-2 text-xs text-[#71717A]">
            <span className="uppercase tracking-wider">
              {CATEGORY_LABELS_ID[product.category] || product.category}
            </span>
            <span aria-hidden="true">·</span>
            <span>{product.subcategory}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{product.sku}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#52525B] hover:text-[#18181B] transition-colors"
            aria-label="Tutup detail produk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

     
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 items-start">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <ProductImage
              product={product}
              aspectClass="aspect-[4/3]"
              showSpecOverlay={true}
            />

          
            <div className="border-t border-b border-[#E4E0D8] py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-[#71717A] uppercase tracking-wider mb-1">
                  Material Utama
                </div>
                <div className="text-[#18181B] font-medium">{product.material}</div>
              </div>
              <div>
                <div className="text-[#71717A] uppercase tracking-wider mb-1">
                  Dimensi Fisik
                </div>
                <div className="text-[#18181B] font-mono tabular-nums">
                  {product.dimensions}
                </div>
              </div>
              <div>
                <div className="text-[#71717A] uppercase tracking-wider mb-1">
                  Asal Studio Kriya
                </div>
                <div className="text-[#18181B] font-medium">{product.origin}</div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
            
              <div className="flex items-center gap-2 text-xs text-[#71717A] mb-2">
                <span>{product.badge}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {product.rating.toFixed(1)} ★ ({product.reviewCount} ulasan)
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {product.stock > 0 ? `Stok: ${product.stock} unit` : 'Stok Habis'}
                </span>
              </div>

              <h2
                id="pdp-modal-title"
                className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B] leading-tight"
              >
                {product.title}
              </h2>

              <div className="mt-3 text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
                ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>

              <p className="mt-4 text-sm text-[#52525B] leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Finish Selector */}
            <div className="space-y-2 pt-2 border-t border-[#E4E0D8]">
              <label className="block text-xs uppercase tracking-wider text-[#52525B]">
                Pilihan Akhir (Finish):{' '}
                <span className="text-[#18181B] font-semibold">{selectedFinish}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.finishes.map((finish) => (
                  <button
                    key={finish}
                    type="button"
                    onClick={() => setSelectedFinish(finish)}
                    className={`px-3 py-2 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      selectedFinish === finish
                        ? 'border-[#18181B] bg-[#18181B] text-[#FAF8F5]'
                        : 'border-[#D4CFC7] bg-transparent text-[#52525B] hover:border-[#18181B] hover:text-[#18181B]'
                    }`}
                  >
                    {finish}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Primary Add to Bag Action */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-[#D4CFC7] bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-[#52525B] hover:text-[#18181B] transition-colors"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-mono tabular-nums font-medium">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))
                    }
                    className="p-2.5 text-[#52525B] hover:text-[#18181B] transition-colors"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={handleAdd}
                  className={`flex-1 py-3 px-5 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2 ${
                    product.stock <= 0
                      ? 'bg-[#E4E0D8] text-[#71717A] cursor-not-allowed'
                      : addedFeedback
                      ? 'bg-[#166534] text-white'
                      : 'bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A]'
                  }`}
                >
                  {product.stock <= 0 ? (
                    'Stok Habis'
                  ) : addedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      Ditambahkan ke Tas Belanja
                    </>
                  ) : (
                    `Tambah ke Tas — $${(product.price * quantity).toLocaleString('en-US')}`
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-[#E4E0D8] space-y-2 text-xs text-[#52525B]">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#18181B] shrink-0" />
                  <span>Gratis pengiriman kurir berasuransi untuk pesanan di atas $500</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#18181B] shrink-0" />
                  <span>Garansi struktural 5 tahun &amp; sertifikat keaslian bernomor seri</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews & Field Reports Section */}
        <div className="border-t border-[#E4E0D8] px-6 sm:px-8 py-8 bg-[#F4F1EA]/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                Ulasan Pelanggan &amp; Evaluasi Studio
              </h3>
              <p className="text-xs text-[#52525B] mt-1 font-mono tabular-nums">
                Rata-rata {product.rating.toFixed(1)} dari 5.0 · Berdasarkan{' '}
                {Math.max(product.reviewCount, productReviews.length)} ulasan terverifikasi
              </p>
            </div>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setShowReviewForm((prev) => !prev)}
                className="px-4 py-2 text-xs font-medium border border-[#18181B] text-[#18181B] hover:bg-[#18181B] hover:text-[#FAF8F5] transition-colors whitespace-nowrap shrink-0"
              >
                {showReviewForm ? 'Batalkan Ulasan' : 'Tulis Ulasan'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequestSignIn}
                className="px-4 py-2 text-xs font-medium border border-[#18181B] text-[#18181B] hover:bg-[#18181B] hover:text-[#FAF8F5] transition-colors whitespace-nowrap shrink-0"
              >
                Masuk untuk Menulis Ulasan
              </button>
            )}
          </div>

          {showReviewForm && (
            <form
              onSubmit={handleCreateReview}
              className="mb-8 p-5 bg-[#FAF8F5] border border-[#D4CFC7] space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#18181B]">
                  Kirim Evaluasi Produk
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className="p-1 text-[#18181B]"
                      aria-label={`Beri ${starVal} bintang`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          starVal <= rating
                            ? 'fill-[#18181B] text-[#18181B]'
                            : 'text-[#A1A1AA]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {reviewError && (
                <div className="p-3 text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA]">
                  {reviewError}
                </div>
              )}

              <div>
                <label className="block text-xs text-[#52525B] mb-1">
                  Judul Ulasan (2–100 karakter)
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Contoh: Kualitas pengerjaan sangat rapi dan kokoh"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#52525B] mb-1">
                  Detail Pengalaman Anda (5–600 karakter)
                </label>
                <textarea
                  required
                  minLength={5}
                  maxLength={600}
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ceritakan pengalaman Anda menggunakan produk ini..."
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors whitespace-nowrap shrink-0"
                >
                  {submittingReview ? 'Menerbitkan...' : 'Terbitkan Ulasan'}
                </button>
              </div>
            </form>
          )}

          {productReviews.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-[#D4CFC7] bg-[#FAF8F5]">
              <p className="text-sm text-[#52525B]">
                Belum ada ulasan tertulis untuk {product.title}.
              </p>
              <p className="text-xs text-[#71717A] mt-1">
                Jadilah pembeli pertama yang membagikan pengalaman Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {productReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 bg-[#FAF8F5] border border-[#E4E0D8] flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-[#71717A]">
                      <span className="font-mono text-[#18181B] font-semibold">
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#18181B]">{rev.authorName}</span>
                      {rev.verifiedPurchase && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#166534]">Pembeli Terverifikasi</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(rev.createdAtMs).toLocaleDateString('id-ID', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-[#18181B]">{rev.title}</h4>
                    <p className="text-sm text-[#52525B] leading-relaxed max-w-3xl">
                      {rev.comment}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onMarkReviewHelpful(rev)}
                    className="self-start flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#52525B] hover:text-[#18181B] border border-[#E4E0D8] hover:border-[#18181B] transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Membantu ({rev.helpfulCount})</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
