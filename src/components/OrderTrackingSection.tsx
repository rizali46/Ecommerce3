import React, { useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  ArrowRight,
  XCircle,
} from 'lucide-react';
import { OrderRecord, OrderStatus } from '../types';

interface OrderTrackingSectionProps {
  orders: OrderRecord[];
  isAuthenticated: boolean;
  onRequestSignIn: () => void;
  onAdvanceOrderStatus: (order: OrderRecord) => Promise<void>;
  onCancelOrder: (order: OrderRecord) => Promise<void>;
  highlightedOrderId: string | null;
}

const STAGES: {
  key: OrderStatus;
  label: string;
  description: string;
}[] = [
  {
    key: 'processing',
    label: '01. Pesanan Diverifikasi',
    description: 'Pembayaran diterima & pemeriksaan kualitas dimulai di atelier',
  },
  {
    key: 'packed',
    label: '02. Dikemas & Disegel',
    description: 'Kemasan pelindung kayu/busa & sertifikat keaslian disertakan',
  },
  {
    key: 'in_transit',
    label: '03. Dalam Pengiriman',
    description: 'Dikirim melalui pusat logistik berpendingin udara',
  },
  {
    key: 'out_for_delivery',
    label: '04. Menuju Alamat Tujuan',
    description: 'Kurir lokal sedang menuju alamat pengiriman Anda',
  },
  {
    key: 'delivered',
    label: '05. Pesanan Tiba',
    description: 'Diterima dan ditandatangani di alamat tujuan',
  },
];

export const STATUS_LABELS_ID: Record<OrderStatus, string> = {
  processing: 'Diproses',
  packed: 'Dikemas',
  in_transit: 'Dalam Perjalanan',
  out_for_delivery: 'Menuju Lokasi',
  delivered: 'Telah Tiba',
  cancelled: 'Dibatalkan',
};

export const OrderTrackingSection: React.FC<OrderTrackingSectionProps> = ({
  orders,
  isAuthenticated,
  onRequestSignIn,
  onAdvanceOrderStatus,
  onCancelOrder,
  highlightedOrderId,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.trackingNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.shippingDestination.toLowerCase().includes(q)
    );
  });

  const getStageIndex = (status: OrderStatus): number => {
    if (status === 'cancelled') return -1;
    return STAGES.findIndex((s) => s.key === status);
  };

  const handleAdvance = async (order: OrderRecord) => {
    setBusyOrderId(order.id);
    try {
      await onAdvanceOrderStatus(order);
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleCancel = async (order: OrderRecord) => {
    setBusyOrderId(order.id);
    try {
      await onCancelOrder(order);
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Header & Order Lookup Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E4E0D8]">
        <div>
          <div className="text-xs uppercase tracking-wider text-[#71717A] mb-2">
            Logistik &amp; Pelacakan Real-Time
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B]">
            Pelacak Pesanan &amp; Status Pengiriman Langsung
          </h2>
          <p className="text-sm text-[#52525B] mt-2 max-w-2xl">
            Setiap pengiriman Kanso &amp; Co. disinkronkan secara langsung (real-time) melalui Firestore. Pantau tahapan kurir, nomor resi, dan rincian barang di bawah ini.
          </p>
        </div>

        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nomor Pesanan atau Resi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-mono bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
          />
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="p-10 bg-white border border-[#E4E0D8] text-center space-y-4">
          <Package className="w-8 h-8 text-[#18181B] mx-auto stroke-[1.25]" />
          <h3 className="font-display text-2xl font-semibold text-[#18181B]">
            Masuk untuk melacak pengiriman pesanan Anda secara real-time
          </h3>
          <p className="text-sm text-[#52525B] max-w-md mx-auto">
            Demi keamanan privasi dan isolasi data pelanggan, status pengiriman dan rincian transaksi hanya dapat diakses oleh akun terverifikasi Anda.
          </p>
          <button
            type="button"
            onClick={onRequestSignIn}
            className="px-6 py-3 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors"
          >
            Masuk dengan Google
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 bg-white border border-[#E4E0D8] text-center space-y-3">
          <Clock className="w-8 h-8 text-[#71717A] mx-auto stroke-[1.25]" />
          <h3 className="font-display text-2xl font-semibold text-[#18181B]">
            Belum ada pesanan yang ditemukan
          </h3>
          <p className="text-sm text-[#52525B] max-w-md mx-auto">
            {orders.length === 0
              ? 'Silakan buat pesanan dari katalog produk untuk mencoba pelacakan pengiriman real-time.'
              : 'Tidak ada pesanan yang cocok dengan kata kunci pencarian Anda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredOrders.map((order) => {
            const currentStageIdx = getStageIndex(order.status);
            const isHighlighted = highlightedOrderId === order.id;
            const isTerminal =
              order.status === 'delivered' || order.status === 'cancelled';

            return (
              <div
                key={order.id}
                className={`bg-white border transition-colors ${
                  isHighlighted ? 'border-[#18181B]' : 'border-[#E4E0D8]'
                } p-6 sm:p-8 space-y-6`}
              >
                {/* Top Order Metadata Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E4E0D8]">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#71717A]">
                      <span className="font-mono font-semibold text-[#18181B]">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Dipesan{' '}
                        {new Date(order.createdAtMs).toLocaleDateString('id-ID', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Kurir: {order.carrier}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        Resi: {order.trackingNumber}
                      </span>
                    </div>

                    <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                      {order.status === 'cancelled'
                        ? `Pesanan ${order.orderNumber} — Dibatalkan`
                        : order.status === 'delivered'
                        ? `Pesanan ${order.orderNumber} — Telah Tiba di Tujuan`
                        : `Pesanan ${order.orderNumber} — ${order.trackingNote}`}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {!isTerminal && (
                      <button
                        type="button"
                        disabled={busyOrderId === order.id}
                        onClick={() => handleAdvance(order)}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <span>
                          {busyOrderId === order.id
                            ? 'Memperbarui...'
                            : 'Simulasikan Tahap Berikutnya'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {order.status === 'processing' && (
                      <button
                        type="button"
                        disabled={busyOrderId === order.id}
                        onClick={() => handleCancel(order)}
                        className="px-3.5 py-2 text-xs font-medium border border-[#D4CFC7] text-[#991B1B] hover:border-[#991B1B] transition-colors whitespace-nowrap shrink-0"
                      >
                        Batalkan Pesanan
                      </button>
                    )}
                  </div>
                </div>

                {/* 5-Stage Real-Time Fulfillment Stepper */}
                {order.status === 'cancelled' ? (
                  <div className="p-4 bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3 text-xs text-[#991B1B]">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Pesanan ini telah dibatalkan sebelum pengiriman kurir. Referensi transaksi:{' '}
                      <strong className="font-mono">{order.paymentTransactionId}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2">
                    {STAGES.map((stage, idx) => {
                      const isCompleted = idx <= currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <div
                          key={stage.key}
                          className={`pt-3 border-t-2 transition-colors ${
                            isCompleted ? 'border-[#18181B]' : 'border-[#E4E0D8]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-[#18181B]">
                            <span>{stage.label}</span>
                            {isCompleted && (
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${
                                  isCurrent ? 'text-[#166534]' : 'text-[#18181B]'
                                }`}
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                            {stage.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Destination, Payment Telemetry & Itemized Line Items */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-[#E4E0D8]">
                  <div className="lg:col-span-5 space-y-2 text-xs text-[#52525B]">
                    <div className="uppercase tracking-wider text-[#71717A] font-semibold">
                      Detail Pengiriman &amp; Pembayaran
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#18181B] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-[#18181B]">
                          {order.customerName}
                        </div>
                        <div>{order.shippingDestination}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Truck className="w-4 h-4 text-[#18181B] shrink-0" />
                      <span>
                        Estimasi Tiba:{' '}
                        <strong className="text-[#18181B] font-mono">
                          {order.estimatedDelivery}
                        </strong>
                      </span>
                    </div>
                    <div className="pt-1 font-mono text-[11px] text-[#71717A]">
                      ID Transaksi: {order.paymentTransactionId} · Metode:{' '}
                      {order.paymentMethod.toUpperCase()} ({order.paymentStatus})
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="text-xs uppercase tracking-wider text-[#71717A] font-semibold mb-2">
                      Daftar Barang ({order.itemCount} unit)
                    </div>
                    <div className="divide-y divide-[#E4E0D8] border-t border-b border-[#E4E0D8]">
                      {(order.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-medium text-[#18181B]">
                              {item.title}
                            </span>
                            <span className="text-[#71717A]">
                              {' '}
                              · {item.finish} · Jml {item.quantity}
                            </span>
                          </div>
                          <div className="font-mono tabular-nums font-medium text-[#18181B]">
                            ${item.lineTotal.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 text-xs">
                      <span className="text-[#52525B]">
                        Subtotal ${order.subtotal.toFixed(2)} · Ongkir $
                        {order.shippingCost.toFixed(2)} · Pajak ${order.taxAmount.toFixed(2)}
                      </span>
                      <span className="text-sm font-mono tabular-nums font-semibold text-[#18181B]">
                        Total: $
                        {order.totalAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
