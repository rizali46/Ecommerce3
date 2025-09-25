import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Lock,
  CreditCard,
  Wallet,
  Banknote,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  CartItem,
  PaymentMethodType,
  UserPrivateProfile,
} from '../types';
import { ProductImage } from './ProductImage';

interface CartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, finish: string, delta: number) => void;
  onRemoveItem: (productId: string, finish: string) => void;
  onClearCart: () => void;
  isAuthenticated: boolean;
  userDisplayName: string;
  userEmail: string;
  privateProfile: UserPrivateProfile | null;
  onRequestSignIn: () => Promise<void>;
  onPlaceOrder: (payload: {
    customerName: string;
    phone: string;
    streetAddress: string;
    city: string;
    postalCode: string;
    country: string;
    paymentMethod: PaymentMethodType;
    cardBrand: string;
    cardLast4: string;
    savePaymentPreference: boolean;
  }) => Promise<string>;
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  isAuthenticated,
  userDisplayName,
  userEmail,
  privateProfile,
  onRequestSignIn,
  onPlaceOrder,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');

  // Shipping & Customer Verification Form
  const [customerName, setCustomerName] = useState<string>(userDisplayName || '');
  const [phone, setPhone] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [country, setCountry] = useState<string>('Indonesia');

  // Card Gateway Fields
  const [cardNumber, setCardNumber] = useState<string>('4532 •••• •••• 8842');
  const [cardExpiry, setCardExpiry] = useState<string>('08/29');
  const [cardCvc, setCardCvc] = useState<string>('842');
  const [savePaymentPreference, setSavePaymentPreference] = useState<boolean>(true);

  const [processingGateway, setProcessingGateway] = useState<boolean>(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  useEffect(() => {
    if (userDisplayName && !customerName) {
      setCustomerName(userDisplayName);
    }
  }, [userDisplayName, customerName]);

  useEffect(() => {
    if (privateProfile) {
      if (privateProfile.phone) setPhone(privateProfile.phone);
      if (privateProfile.streetAddress) setStreetAddress(privateProfile.streetAddress);
      if (privateProfile.city) setCity(privateProfile.city);
      if (privateProfile.postalCode) setPostalCode(privateProfile.postalCode);
      if (privateProfile.country) setCountry(privateProfile.country);
      if (
        privateProfile.defaultPaymentLast4 &&
        privateProfile.defaultPaymentLast4.length === 4
      ) {
        setCardNumber(`4532 •••• •••• ${privateProfile.defaultPaymentLast4}`);
      }
    }
  }, [privateProfile]);

  if (!isOpen) return null;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const freeShippingThreshold = 500;
  const shippingCost = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : 35;
  const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
  const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const detectCardBrand = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('4')) return 'Visa';
    if (digits.startsWith('5')) return 'Mastercard';
    if (digits.startsWith('3')) return 'Amex';
    return 'Visa';
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGatewayError(null);

    if (!isAuthenticated) {
      try {
        await onRequestSignIn();
      } catch {
        setGatewayError('Silakan masuk dengan Google untuk menyelesaikan pesanan Anda.');
      }
      return;
    }

    const cleanName = customerName.trim();
    const cleanStreet = streetAddress.trim();
    const cleanCity = city.trim();
    const cleanPostal = postalCode.trim();
    const cleanCountry = country.trim();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2) {
      setGatewayError('Mohon masukkan nama lengkap penerima.');
      return;
    }
    if (cleanStreet.length < 4 || cleanCity.length < 2 || cleanPostal.length < 3) {
      setGatewayError('Mohon lengkapi alamat jalan, kota, dan kode pos pengiriman.');
      return;
    }
    if (paymentMethod === 'cod' && cleanPhone.length < 6) {
      setGatewayError('Nomor telepon aktif wajib diisi untuk verifikasi Bayar di Tempat (COD).');
      return;
    }

    const digitsOnly = cardNumber.replace(/\D/g, '');
    const last4 =
      paymentMethod === 'card'
        ? (digitsOnly.slice(-4) || '8842').padStart(4, '4')
        : paymentMethod === 'express_wallet'
        ? '9012'
        : '0000';
    const brand =
      paymentMethod === 'card'
        ? detectCardBrand(cardNumber)
        : paymentMethod === 'express_wallet'
        ? 'Express Pay'
        : 'COD';

    setProcessingGateway(true);
    try {
      await onPlaceOrder({
        customerName: cleanName.slice(0, 80),
        phone: cleanPhone.slice(0, 30),
        streetAddress: cleanStreet.slice(0, 160),
        city: cleanCity.slice(0, 80),
        postalCode: cleanPostal.slice(0, 24),
        country: cleanCountry.slice(0, 60),
        paymentMethod,
        cardBrand: brand,
        cardLast4: last4,
        savePaymentPreference,
      });
      setStep('cart');
      onClose();
    } catch (err) {
      setGatewayError(
        err instanceof Error
          ? err.message
          : 'Otorisasi pembayaran gagal. Mohon periksa kembali detail Anda.'
      );
    } finally {
      setProcessingGateway(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Tas Belanja dan Kasir Pembayaran"
    >
      <div className="relative w-full max-w-xl bg-[#FAF8F5] h-full flex flex-col border-l border-[#E4E0D8] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4E0D8]">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-[#18181B]">
              {step === 'cart' ? 'Tas Belanja Anda' : 'Gerbang Pembayaran Terpadu'}
            </h2>
            <span className="text-xs font-mono tabular-nums text-[#71717A]">
              ({totalUnits} unit)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#52525B] hover:text-[#18181B] transition-colors"
            aria-label="Tutup tas belanja"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Courier Threshold Bar */}
        <div className="px-6 py-3 bg-[#F4F1EA] border-b border-[#E4E0D8] text-xs text-[#52525B]">
          {subtotal >= freeShippingThreshold ? (
            <div className="flex items-center justify-between">
              <span className="text-[#166534] font-medium">
                Pengiriman Kurir Berasuransi Gratis telah aktif
              </span>
              <span className="font-mono tabular-nums">Ongkir $0.00</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span>
                Tambah{' '}
                <strong className="font-mono tabular-nums text-[#18181B]">
                  ${(freeShippingThreshold - subtotal).toFixed(2)}
                </strong>{' '}
                lagi untuk mendapatkan pengiriman kurir gratis
              </span>
              <span className="font-mono tabular-nums">
                {Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))}%
              </span>
            </div>
          )}
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <p className="font-display text-2xl text-[#18181B] mb-2">
                Tas belanja Anda masih kosong
              </p>
              <p className="text-sm text-[#52525B] max-w-xs mb-6">
                Jelajahi 42 produk furnitur arsitektural, audio, horologi, dan keramik pilihan kami.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors"
              >
                Mulai Belanja
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-5">
              {cart.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedFinish}`}
                  className="flex gap-4 pb-5 border-b border-[#E4E0D8]"
                >
                  <div className="w-24 shrink-0">
                    <ProductImage
                      product={item.product}
                      aspectClass="aspect-square"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#18181B] truncate">
                          {item.product.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveItem(item.product.id, item.selectedFinish)
                          }
                          className="text-[#71717A] hover:text-[#991B1B] transition-colors p-1"
                          aria-label={`Hapus ${item.product.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-[#71717A] mt-0.5">
                        <span>{item.selectedFinish}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono">{item.product.sku}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-[#D4CFC7] bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              item.selectedFinish,
                              -1
                            )
                          }
                          className="p-1.5 text-[#52525B] hover:text-[#18181B]"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-mono tabular-nums font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              item.selectedFinish,
                              1
                            )
                          }
                          className="p-1.5 text-[#52525B] hover:text-[#18181B]"
                          aria-label="Tambah jumlah"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-sm font-mono tabular-nums font-semibold text-[#18181B]">
                        ${(item.product.price * item.quantity).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form
              id="checkout-gateway-form"
              onSubmit={handleCheckoutSubmit}
              className="space-y-6"
            >
              {/* Authentication Check Banner */}
              {!isAuthenticated ? (
                <div className="p-4 bg-[#F4F1EA] border border-[#D4CFC7] flex items-center justify-between gap-4">
                  <div className="text-xs text-[#18181B]">
                    <p className="font-semibold">Diperlukan Autentikasi Akun</p>
                    <p className="text-[#52525B] mt-0.5">
                      Masuk dengan Google untuk mengenkripsi riwayat pesanan dan mengaktifkan pelacakan pesanan langsung.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onRequestSignIn}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] whitespace-nowrap shrink-0"
                  >
                    Masuk
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-[#52525B] pb-3 border-b border-[#E4E0D8]">
                  <span>
                    Masuk sebagai <strong className="text-[#18181B]">{userEmail}</strong>
                  </span>
                  <span className="text-[#166534] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sesi Terverifikasi
                  </span>
                </div>
              )}

              {gatewayError && (
                <div className="p-3.5 text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA]">
                  {gatewayError}
                </div>
              )}

              {/*Delivery & Verification Address */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#18181B]">
                  01. Alamat Pengiriman &amp; Verifikasi Penerima
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">
                      Nama Lengkap Penerima *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Budi Santoso"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">
                      Nomor Telepon Kurir {paymentMethod === 'cod' ? '*' : ''}
                    </label>
                    <input
                      type="tel"
                      required={paymentMethod === 'cod'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+62 812-3456-7890"
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#52525B] mb-1">
                    Alamat Lengkap &amp; Nomor Rumah *
                  </label>
                  <input
                    type="text"
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Jl. Senopati No. 42, Kebayoran Baru"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">Kota *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Jakarta Selatan"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">
                      Kode Pos *
                    </label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="12190"
                      className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#52525B] mb-1">Negara *</label>
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="Indonesia"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                    />
                  </div>
                </div>
              </div>

              {/*  Payment Gateway Method Selector */}
              <div className="space-y-3 pt-3 border-t border-[#E4E0D8]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#18181B]">
                  02. Pilih Metode Pembayaran
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 border text-left transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-[#18181B] bg-[#18181B] text-[#FAF8F5]'
                        : 'border-[#D4CFC7] bg-white text-[#18181B] hover:border-[#18181B]'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1.5" />
                    <div className="text-xs font-semibold">Kartu Kredit/Debit</div>
                    <div className="text-[11px] opacity-75">Enkripsi TLS 256-Bit</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('express_wallet')}
                    className={`p-3 border text-left transition-colors ${
                      paymentMethod === 'express_wallet'
                        ? 'border-[#18181B] bg-[#18181B] text-[#FAF8F5]'
                        : 'border-[#D4CFC7] bg-white text-[#18181B] hover:border-[#18181B]'
                    }`}
                  >
                    <Wallet className="w-4 h-4 mb-1.5" />
                    <div className="text-xs font-semibold">Dompet Digital</div>
                    <div className="text-[11px] opacity-75">Token Instan</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3 border text-left transition-colors ${
                      paymentMethod === 'cod'
                        ? 'border-[#18181B] bg-[#18181B] text-[#FAF8F5]'
                        : 'border-[#D4CFC7] bg-white text-[#18181B] hover:border-[#18181B]'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-1.5" />
                    <div className="text-xs font-semibold">Bayar di Tempat</div>
                    <div className="text-[11px] opacity-75">Bayar ke Kurir (COD)</div>
                  </button>
                </div>

                {/* Method-Specific Details */}
                {paymentMethod === 'card' && (
                  <div className="p-4 bg-white border border-[#D4CFC7] space-y-3">
                    <div>
                      <label className="block text-xs text-[#52525B] mb-1">
                        Nomor Kartu
                      </label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4532 •••• •••• 8842"
                        className="w-full px-3 py-2 text-sm font-mono bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#52525B] mb-1">
                          Masa Berlaku (BB/TT)
                        </label>
                        <input
                          type="text"
                          required
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="08/29"
                          className="w-full px-3 py-2 text-sm font-mono bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#52525B] mb-1">
                          Kode Keamanan (CVC)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={4}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="842"
                          className="w-full px-3 py-2 text-sm font-mono bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#52525B] pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={savePaymentPreference}
                        onChange={(e) => setSavePaymentPreference(e.target.checked)}
                        className="accent-[#18181B]"
                      />
                      <span>
                        Simpan ringkasan 4 digit terakhir kartu dan alamat pengiriman ke brankas profil pribadi saya
                      </span>
                    </label>
                  </div>
                )}

                {paymentMethod === 'express_wallet' && (
                  <div className="p-4 bg-white border border-[#D4CFC7] space-y-2 text-xs text-[#52525B]">
                    <div className="font-semibold text-[#18181B] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#166534]" />
                      Otorisasi Dompet Digital Siap Diproses
                    </div>
                    <p>
                      Transaksi Anda sebesar{' '}
                      <strong className="font-mono tabular-nums text-[#18181B]">
                        ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </strong>{' '}
                      akan langsung diverifikasi menggunakan token perangkat terenkripsi.
                    </p>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="p-4 bg-white border border-[#D4CFC7] space-y-2 text-xs text-[#52525B]">
                    <div className="flex items-center justify-between font-semibold text-[#18181B]">
                      <span>Verifikasi Bayar di Tempat (COD)</span>
                      <span className="font-mono tabular-nums">
                        Tagihan Saat Tiba: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p>
                      Pesanan di atas $500 mendapat fasilitas pengiriman kurir gratis. Pastikan nomor telepon dan kode pos di atas sudah benar untuk konfirmasi kurir.
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

       r {/* Drawer Footer */}
        {cart.length > 0 && (
          <div className="p-6 bg-[#F4F1EA] border-t border-[#E4E0D8] space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#52525B]">
                <span>Subtotal Produk</span>
                <span className="font-mono tabular-nums">
                  ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-[#52525B]">
                <span>Pengiriman Kurir Berasuransi</span>
                <span className="font-mono tabular-nums">
                  {shippingCost === 0 ? 'Gratis ($0.00)' : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-[#52525B]">
                <span>Estimasi Pajak (8%)</span>
                <span className="font-mono tabular-nums">
                  ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#18181B] pt-2 border-t border-[#D4CFC7]">
                <span>Total Pembayaran</span>
                <span className="font-mono tabular-nums">
                  ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-6 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Lanjut ke Pembayaran Aman</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="px-4 py-3.5 text-xs font-medium border border-[#D4CFC7] bg-white text-[#18181B] hover:border-[#18181B] transition-colors whitespace-nowrap shrink-0"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  form="checkout-gateway-form"
                  disabled={processingGateway}
                  className="flex-1 py-3.5 px-6 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {processingGateway
                      ? 'Memproses Pesanan...'
                      : `Konfirmasi & Bayar $${totalAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
