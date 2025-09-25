import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  LogOut,
  Check,
  Lock,
  Package,
  CreditCard,
  MapPin,
} from 'lucide-react';
import {
  UserPublicProfile,
  UserPrivateProfile,
  OrderRecord,
} from '../types';
import { STATUS_LABELS_ID } from './OrderTrackingSection';

interface AccountSectionProps {
  isAuthenticated: boolean;
  isAdminUser: boolean;
  userEmail: string;
  publicProfile: UserPublicProfile | null;
  privateProfile: UserPrivateProfile | null;
  orders: OrderRecord[];
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSaveProfile: (
    displayName: string,
    privateData: Omit<UserPrivateProfile, 'uid'>
  ) => Promise<void>;
  onNavigateOrders: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  isAuthenticated,
  isAdminUser,
  userEmail,
  publicProfile,
  privateProfile,
  orders,
  onSignIn,
  onSignOut,
  onSaveProfile,
  onNavigateOrders,
}) => {
  const [displayName, setDisplayName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [postalCode, setPostalCode] = useState<string>('');
  const [country, setCountry] = useState<string>('Indonesia');
  const [defaultPaymentBrand, setDefaultPaymentBrand] = useState<string>('Visa');
  const [defaultPaymentLast4, setDefaultPaymentLast4] = useState<string>('8842');

  const [saving, setSaving] = useState<boolean>(false);
  const [savedBanner, setSavedBanner] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (publicProfile?.displayName) {
      setDisplayName(publicProfile.displayName);
    }
  }, [publicProfile]);

  useEffect(() => {
    if (privateProfile) {
      setPhone(privateProfile.phone || '');
      setStreetAddress(privateProfile.streetAddress || '');
      setCity(privateProfile.city || '');
      setPostalCode(privateProfile.postalCode || '');
      setCountry(privateProfile.country || 'Indonesia');
      setDefaultPaymentBrand(privateProfile.defaultPaymentBrand || 'Visa');
      setDefaultPaymentLast4(privateProfile.defaultPaymentLast4 || '8842');
    }
  }, [privateProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanName = displayName.trim();
    if (cleanName.length < 1 || cleanName.length > 80) {
      setErrorMsg('Nama tampilan harus terdiri dari 1 hingga 80 karakter.');
      return;
    }
    setSaving(true);
    try {
      await onSaveProfile(cleanName, {
        email: (userEmail || privateProfile?.email || 'kolektor@kanso.co').slice(0, 120),
        phone: phone.trim().slice(0, 30),
        streetAddress: streetAddress.trim().slice(0, 160),
        city: city.trim().slice(0, 80),
        postalCode: postalCode.trim().slice(0, 24),
        country: country.trim().slice(0, 60),
        defaultPaymentBrand: defaultPaymentBrand.trim().slice(0, 30),
        defaultPaymentLast4: defaultPaymentLast4.replace(/\D/g, '').slice(-4).padStart(4, '0'),
      });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2500);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan perubahan profil.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white border border-[#E4E0D8] p-8 sm:p-12 text-center space-y-5">
          <User className="w-8 h-8 text-[#18181B] mx-auto stroke-[1.25]" />
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-[#71717A]">
              Akun Pelanggan &amp; Brankas Data
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B]">
              Masuk untuk Mengelola Akun Kanso &amp; Co. Anda
            </h1>
            <p className="text-sm text-[#52525B] max-w-lg mx-auto">
              Autentikasi dengan Google untuk mengatur alamat pengiriman pribadi, metode pembayaran tersimpan, ulasan produk, serta riwayat pesanan real-time.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onSignIn}
              className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors"
            >
              Masuk dengan Akun Google
            </button>
          </div>
        </div>
      </section>
    );
  }

  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <section className="max-w-7xl mx-auto px-6 py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E4E0D8]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#71717A] mb-2">
            <span className="uppercase tracking-wider">Profil Kolektor</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{userEmail}</span>
            {isAdminUser && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#166534] font-medium">
                  Hak Akses Administrator Aktif
                </span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B]">
            {displayName || 'Akun Pelanggan'}
          </h1>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="self-start sm:self-auto px-4 py-2.5 text-xs font-medium border border-[#D4CFC7] bg-white text-[#18181B] hover:border-[#18181B] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Account Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-[#E4E0D8] space-y-1">
          <div className="text-xs uppercase tracking-wider text-[#71717A]">
            Total Pesanan Dibuat
          </div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
            {orders.length}
          </div>
          <button
            type="button"
            onClick={onNavigateOrders}
            className="text-xs text-[#18181B] underline underline-offset-4 pt-1 inline-block"
          >
            Buka Pelacak Pesanan di Toko
          </button>
        </div>

        <div className="p-6 bg-white border border-[#E4E0D8] space-y-1">
          <div className="text-xs uppercase tracking-wider text-[#71717A]">
            Total Nilai Koleksi
          </div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
            ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#71717A] pt-1">
            Terdaftar dalam garansi keaslian seumur hidup
          </div>
        </div>

        <div className="p-6 bg-white border border-[#E4E0D8] space-y-1">
          <div className="text-xs uppercase tracking-wider text-[#71717A]">
            Arsitektur Keamanan Data
          </div>
          <div className="text-sm font-semibold text-[#18181B] flex items-center gap-1.5 pt-1">
            <Shield className="w-4 h-4 text-[#166534]" />
            <span>Isolasi Data Pribadi (Split-Collection)</span>
          </div>
          <div className="text-xs text-[#71717A] pt-1">
            Tersimpan aman di /users/&#123;uid&#125;/private/info
          </div>
        </div>
      </div>

      {/* Profile & Isolated PII Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white border border-[#E4E0D8] p-6 sm:p-8">
          <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#E4E0D8]">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                Alamat Pengiriman &amp; Preferensi Pembayaran
              </h2>
              <p className="text-xs text-[#52525B] mt-1">
                Data Anda divalidasi oleh aturan keamanan Firestore dan otomatis mengisi formulir kasir saat checkout.
              </p>
            </div>
            <Lock className="w-4 h-4 text-[#71717A] shrink-0" />
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA]">
              {errorMsg}
            </div>
          )}

          {savedBanner && (
            <div className="mb-6 p-3.5 text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Profil publik dan data pengiriman pribadi Anda berhasil diperbarui.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#52525B] mb-1">
                  Nama Tampilan Publik *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#52525B] mb-1">
                  Nomor Telepon Penerima (Terenkripsi)
                </label>
                <input
                  type="tel"
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+62 812-3456-7890"
                  className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E4E0D8] space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#18181B]">
                <MapPin className="w-3.5 h-3.5" />
                <span>Alamat Pengiriman Utama</span>
              </div>

              <div>
                <label className="block text-xs text-[#52525B] mb-1">
                  Nama Jalan &amp; Nomor Bangunan
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Jl. Senopati No. 42, Kebayoran Baru"
                  className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#52525B] mb-1">Kota</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta Selatan"
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#52525B] mb-1">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="12190"
                    className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#52525B] mb-1">Negara</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Indonesia"
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E4E0D8] space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#18181B]">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Ringkasan Metode Pembayaran Tersimpan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#52525B] mb-1">
                    Jaringan Kartu
                  </label>
                  <select
                    value={defaultPaymentBrand}
                    onChange={(e) => setDefaultPaymentBrand(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                    <option value="Express Pay">Dompet Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#52525B] mb-1">
                    4 Digit Terakhir
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={defaultPaymentLast4}
                    onChange={(e) => setDefaultPaymentLast4(e.target.value)}
                    placeholder="8842"
                    className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF8F5] border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors whitespace-nowrap shrink-0"
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan Akun'}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Order History Sidebar */}
        <div className="lg:col-span-4 bg-white border border-[#E4E0D8] p-6 space-y-5 self-start">
          <div className="flex items-center justify-between pb-4 border-b border-[#E4E0D8]">
            <h3 className="font-display text-xl font-semibold text-[#18181B]">
              Riwayat Pesanan Terbaru
            </h3>
            <Package className="w-4 h-4 text-[#71717A]" />
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-[#71717A] leading-relaxed">
              Belum ada riwayat pesanan. Pesanan yang dibuat melalui kasir akan muncul secara otomatis di sini.
            </p>
          ) : (
            <div className="divide-y divide-[#E4E0D8]">
              {orders.slice(0, 5).map((ord) => (
                <div key={ord.id} className="py-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-[#18181B]">
                      {ord.orderNumber}
                    </span>
                    <span className="tabular-nums text-[#18181B]">
                      ${ord.totalAmount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#71717A]">
                    <span>{ord.itemCount} unit</span>
                    <span className="uppercase tracking-wider text-[11px]">
                      {STATUS_LABELS_ID[ord.status] || ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onNavigateOrders}
            className="w-full py-2.5 px-4 text-xs font-medium border border-[#18181B] text-[#18181B] hover:bg-[#18181B] hover:text-[#FAF8F5] transition-colors"
          >
            Buka Pelacak Pesanan &amp; Toko
          </button>
        </div>
      </div>
    </section>
  );
};
