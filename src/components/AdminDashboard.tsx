import React, { useState } from 'react';
import { SeedDatabase } from '../data/seedDatabase';
import { uploadCatalogToFirestore } from '../data/dbSeeder';
import {
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  OrderRecord,
  OrderStatus,
} from '../types';
import { CATEGORY_IMAGES, CATEGORY_LABELS_ID } from '../data/catalog';
import { STATUS_LABELS_ID } from './OrderTrackingSection';

interface AdminDashboardProps {
  products: Product[];
  orders: OrderRecord[];
  isAdminUser: boolean;
  isAuthenticated: boolean;
  userEmail: string;
  onRequestSignIn: () => void;
  onUpdateProductInventory: (
    product: Product,
    newStock: number,
    newPrice: number
  ) => Promise<void>;
  onCreateProduct: (newProduct: Omit<Product, 'id'>) => Promise<void>;
  onSyncAllCatalogToFirestore: () => Promise<void>;
  onAdminUpdateOrderStatus: (
    order: OrderRecord,
    newStatus: OrderStatus,
    note: string
  ) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  orders,
  isAdminUser,
  isAuthenticated,
  userEmail,
  onRequestSignIn,
  onUpdateProductInventory,
  onCreateProduct,
  onSyncAllCatalogToFirestore,
  onAdminUpdateOrderStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'analytics'>(
    'inventory'
  );
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');

  // Inline editing state
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [syncingCatalog, setSyncingCatalog] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // New Product Modal State
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newSku, setNewSku] = useState<string>('KNS-FL-043');
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Furniture & Lighting');
  const [newSubcategory, setNewSubcategory] = useState<string>('Objek Arsitektural');
  const [newPrice, setNewPrice] = useState<number>(480);
  const [newStock, setNewStock] = useState<number>(15);
  const [newMaterial, setNewMaterial] = useState<string>('Batu Travertine & Kuningan');
  const [newDimensions, setNewDimensions] = useState<string>('30 × 24 × 18 cm');
  const [newOrigin, setNewOrigin] = useState<string>('Milan, Italia');
  const [newDescription, setNewDescription] = useState<string>('');

  // Analytics Calculations
  const totalCatalogRevenue = products.reduce(
    (sum, p) => sum + p.price * p.soldCount,
    0
  );

 

  const liveOrderRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const combinedRevenue = totalCatalogRevenue + liveOrderRevenue;

  const totalUnitsSold =
    products.reduce((sum, p) => sum + p.soldCount, 0) +
    orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.itemCount, 0);

  const totalInventoryUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalInventoryValuation = products.reduce(
    (sum, p) => sum + p.price * p.stock,
    0
  );
  const lowStockProducts = products.filter((p) => p.stock <= 12);

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (stockFilter === 'low' && p.stock > 12) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.material.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditStock(product.stock);
    setEditPrice(product.price);
  };

  const saveEdit = async (product: Product) => {
    setSavingId(product.id);
    setStatusFeedback(null);
    try {
      await onUpdateProductInventory(
        product,
        Math.max(0, Math.round(editStock)),
        Math.max(1, Number(editPrice))
      );
      setEditingId(null);
      setStatusFeedback(`Stok dan harga ${product.sku} berhasil diperbarui di Firestore.`);
    } catch (err) {
      setStatusFeedback(
        err instanceof Error ? err.message : 'Gagal memperbarui produk di Firestore.'
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleSyncCatalog = async () => {
    setSyncingCatalog(true);
    setStatusFeedback(null);
    try {
      await onSyncAllCatalogToFirestore();
      setStatusFeedback(
        `Seluruh ${products.length} produk katalog berhasil disinkronkan ke database Firestore.`
      );
    } catch (err) {
      setStatusFeedback(
        err instanceof Error ? err.message : 'Gagal menyinkronkan katalog.'
      );
    } finally {
      setSyncingCatalog(false);
    }
  };
  
  const handleSeed = async () => {
  setIsUploading(true);
  setStatusFeedback(null);
  const success = await uploadCatalogToFirestore();
  setIsUploading(false);
  
  if (success) {
    setStatusFeedback('Berhasil mengunggah 42 produk ke Firestore!');
  } else {
    setStatusFeedback('Gagal mengunggah. Cek console log.');
  }
};

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;
    setSyncingCatalog(true);
    try {
      await onCreateProduct({
        sku: newSku.trim().toUpperCase(),
        title: newTitle.trim(),
        category: newCategory,
        subcategory: newSubcategory.trim(),
        price: Math.max(1, Number(newPrice)),
        stock: Math.max(0, Math.round(newStock)),
        soldCount: 0,
        rating: 5.0,
        reviewCount: 1,
        material: newMaterial.trim(),
        dimensions: newDimensions.trim(),
        origin: newOrigin.trim(),
        description: newDescription.trim(),
        imageUrl:
          CATEGORY_IMAGES[newCategory] ||
          '/src/assets/images/lighting-furniture.jpg',
        badge: 'Rilis Baru',
        finishes: ['Varian Studio Standar'],
        isPublished: true,
      });
      setShowNewModal(false);
      setNewTitle('');
      setNewDescription('');
      setStatusFeedback('Produk baru berhasil ditambahkan ke katalog Firestore.');
    } catch (err) {
      setStatusFeedback(
        err instanceof Error ? err.message : 'Gagal membuat produk baru.'
      );
    } finally {
      setSyncingCatalog(false);
    }
  };

  const categories: ProductCategory[] = [
    'Furniture & Lighting',
    'Audio & Horology',
    'Apothecary & Skincare',
    'Ceramics & Tableware',
  ];

  const categoryStats = categories.map((cat) => {
    const items = products.filter((p) => p.category === cat);
    const revenue = items.reduce((sum, p) => sum + p.price * p.soldCount, 0);
    const units = items.reduce((sum, p) => sum + p.soldCount, 0);
    const stockCount = items.reduce((sum, p) => sum + p.stock, 0);
    return {
      category: cat,
      label: CATEGORY_LABELS_ID[cat] || cat,
      skuCount: items.length,
      revenue,
      units,
      stockCount,
      sharePercent:
        totalCatalogRevenue > 0
          ? Math.round((revenue / totalCatalogRevenue) * 100)
          : 25,
    };
  });

  return (
    <section className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E4E0D8]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#71717A] mb-1">
            <span>Ruang Kerja</span>
            <span aria-hidden="true">/</span>
            <span>Konsol Operasional</span>
            <span aria-hidden="true">/</span>
            <span className="text-[#18181B] font-medium">
              Manajemen Inventaris &amp; Analitik Penjualan
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B]">
            Dasbor Admin Inventaris &amp; Analitik Penjualan
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={onRequestSignIn}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] whitespace-nowrap shrink-0"
            >
              Masuk sebagai Administrator
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={syncingCatalog || !isAdminUser}
                onClick={handleSyncCatalog}
                className="px-4 py-2.5 text-xs font-medium border border-[#D4CFC7] bg-white text-[#18181B] hover:border-[#18181B] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${syncingCatalog ? 'animate-spin' : ''}`}
                />
                <span>Sinkronkan {products.length} SKU ke Firestore</span>
              </button>
              
              <button
                type="button"
                disabled={!isAdminUser}
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk Baru</span>
              </button>
            </>
          )}
        </div>
      </div>

  
      {!isAdminUser && (
        <div className="p-4 bg-[#F4F1EA] border border-[#D4CFC7] flex items-center justify-between gap-4 text-xs text-[#52525B]">
          <div>
            <strong className="text-[#18181B]">Mode Pratinjau Analitik:</strong>{' '}
            {isAuthenticated
              ? `Anda masuk sebagai ${userEmail}. Perubahan stok dan harga katalog memerlukan akun administrator utama (babybau1010@gmail.com).`
              : 'Masuk dengan akun Google administrator (babybau1010@gmail.com) untuk menyimpan perubahan stok dan status pesanan ke Firestore.'}
          </div>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={onRequestSignIn}
              className="px-3 py-1.5 font-semibold text-[#18181B] border border-[#18181B] whitespace-nowrap shrink-0"
            >
              Masuk
            </button>
          )}
        </div>
      )}

      {statusFeedback && (
        <div className="p-3.5 bg-white border border-[#18181B] text-xs text-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#166534]" />
            <span>{statusFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-[#71717A] hover:text-[#18181B]"
          >
            Tutup
          </button>
        </div>
      )}

   
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#E4E0D8] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span className="uppercase tracking-wider">Total Nilai Penjualan (GMV)</span>
            <DollarSign className="w-4 h-4 text-[#18181B]" />
          </div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
            ${combinedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-[#166534] font-mono tabular-nums">
            +18.4% vs 30 hari terakhir
          </div>
        </div>

        <div className="p-5 bg-white border border-[#E4E0D8] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span className="uppercase tracking-wider">Total Unit Terjual</span>
            <TrendingUp className="w-4 h-4 text-[#18181B]" />
          </div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
            {totalUnitsSold.toLocaleString('en-US')} unit
          </div>
          <div className="text-xs text-[#52525B] font-mono tabular-nums">
            Rata-rata Nilai per Unit: $
            {Math.round(combinedRevenue / Math.max(1, totalUnitsSold)).toLocaleString(
              'en-US'
            )}
          </div>
        </div>

        <div className="p-5 bg-white border border-[#E4E0D8] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span className="uppercase tracking-wider">SKU Aktif &amp; Stok Gudang</span>
            <Layers className="w-4 h-4 text-[#18181B]" />
          </div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
            {products.length} SKU · {totalInventoryUnits.toLocaleString('en-US')} unit
          </div>
          <div className="text-xs text-[#52525B] font-mono tabular-nums">
            Valuasi Stok: ${totalInventoryValuation.toLocaleString('en-US')}
          </div>
        </div>

        <div className="p-5 bg-white border border-[#E4E0D8] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#71717A]">
            <span className="uppercase tracking-wider">Peringatan Stok Menipis (≤12)</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
            {lowStockProducts.length} SKU
          </div>
          <div className="text-xs text-[#D97706] font-mono tabular-nums">
            Perlu penambahan stok studio
          </div>
        </div>
      </div>

     
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-4">
        <div className="flex items-center gap-1 p-1 bg-[#EFECE6] self-start">
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'inventory'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            Daftar Inventaris ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            Analitik Penjualan &amp; Kategori
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'orders'
                ? 'bg-white text-[#18181B] shadow-xs'
                : 'text-[#52525B] hover:text-[#18181B]'
            }`}
          >
            Antrean Pengiriman Pesanan ({orders.length})
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari SKU, nama, material..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
            >
              <option value="all">Semua Kategori (4)</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS_ID[c]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                setStockFilter((prev) => (prev === 'all' ? 'low' : 'all'))
              }
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                stockFilter === 'low'
                  ? 'border-[#D97706] bg-[#FEF3C7] text-[#92400E]'
                  : 'border-[#D4CFC7] bg-white text-[#52525B]'
              }`}
            >
              {stockFilter === 'low' ? 'Menampilkan Stok Menipis' : 'Filter Stok Menipis'}
            </button>
           
          </div>
        )}
        
      </div>
      

      {/* TABEL PRODUK */}
      {activeTab === 'inventory' && (
     
        <div className="bg-white border border-[#E4E0D8] overflow-x-auto">
           <div className='flex py-3 justify-end'>
              <button 
                type="button"
                onClick={handleSeed} 
                disabled={isUploading || !isAdminUser}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {isUploading ? 'Memproses...' : 'Upload Katalog ke Firestore'}
              </button>
            </div>
            
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E4E0D8] bg-[#F4F1EA] text-[11px] uppercase tracking-wider text-[#52525B]">
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold">Nama Produk</th>
                <th className="py-3 px-4 font-semibold">Kategori</th>
                <th className="py-3 px-4 font-semibold text-right">Harga Satuan</th>
                <th className="py-3 px-4 font-semibold text-right">Sisa Stok</th>
                <th className="py-3 px-4 font-semibold text-right">Terjual</th>
                <th className="py-3 px-4 font-semibold text-right">Pendapatan SKU</th>
                <th className="py-3 px-4 font-semibold text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D8] text-xs">
              {filteredProducts.map((prod) => {
                const isEditing = editingId === prod.id;
                const isLow = prod.stock <= 12;
                const skuRev = prod.price * prod.soldCount;

                return (
                  <tr
                    key={prod.id}
                    className="hover:bg-[#FAF8F5] transition-colors h-11"
                  >
                    <td className="py-2.5 px-4 font-mono text-[#52525B] whitespace-nowrap">
                      {prod.sku}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#18181B]">
                      <div className="truncate max-w-xs">{prod.title}</div>
                    </td>
                    <td className="py-2.5 px-4 text-[#52525B] whitespace-nowrap">
                      {CATEGORY_LABELS_ID[prod.category] || prod.category}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#18181B]">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-24 px-2 py-1 text-right bg-white border border-[#18181B] font-mono"
                        />
                      ) : (
                        `$${prod.price.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}`
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editStock}
                          onChange={(e) => setEditStock(Number(e.target.value))}
                          className="w-20 px-2 py-1 text-right bg-white border border-[#18181B] font-mono"
                        />
                      ) : (
                        <span
                          className={
                            prod.stock === 0
                              ? 'text-[#DC2626] font-semibold'
                              : isLow
                              ? 'text-[#D97706] font-semibold'
                              : 'text-[#16A34A]'
                          }
                        >
                          {prod.stock} unit
                          {isLow ? ' (Menipis)' : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#52525B]">
                      {prod.soldCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#18181B]">
                      ${skuRev.toLocaleString('en-US')}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={savingId === prod.id}
                            onClick={() => saveEdit(prod)}
                            className="px-2.5 py-1 text-xs font-semibold bg-[#18181B] text-[#FAF8F5]"
                          >
                            {savingId === prod.id ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs text-[#52525B] hover:text-[#18181B]"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(prod)}
                          className="px-2.5 py-1 text-xs font-medium border border-[#D4CFC7] hover:border-[#18181B] text-[#18181B] transition-colors"
                        >
                          Ubah Stok / Harga
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PENJUALAN */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white border border-[#E4E0D8] p-6 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                Pendapatan &amp; Penjualan per Kategori Koleksi
              </h2>
              <p className="text-xs text-[#52525B] mt-1">
                Rincian kontribusi pendapatan di keempat departemen utama
              </p>
            </div>

            <div className="space-y-5">
              {categoryStats.map((stat) => (
                <div key={stat.category} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#18181B]">
                        {stat.label}
                      </span>
                      <span className="text-[#71717A]">
                        {' '}
                        · {stat.skuCount} SKU · {stat.units} unit terjual
                      </span>
                    </div>
                    <div className="font-mono tabular-nums font-semibold text-[#18181B]">
                      ${stat.revenue.toLocaleString('en-US')} ({stat.sharePercent}%)
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-[#EFECE6]">
                    <div
                      className="h-full bg-[#18181B]"
                      style={{ width: `${Math.max(8, stat.sharePercent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#E4E0D8] p-6 space-y-5">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                Produk Terlaris Berdasarkan Pendapatan
              </h2>
              <p className="text-xs text-[#52525B] mt-1">
                6 produk dengan kontribusi penjualan tertinggi
              </p>
            </div>

            <div className="divide-y divide-[#E4E0D8]">
              {[...products]
                .sort((a, b) => b.price * b.soldCount - a.price * a.soldCount)
                .slice(0, 6)
                .map((item, idx) => (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-medium text-[#18181B] truncate">
                        0{idx + 1}. {item.title}
                      </div>
                      <div className="text-[#71717A] font-mono">
                        {item.sku} · {item.soldCount} terjual · sisa {item.stock}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums font-semibold text-[#18181B] shrink-0">
                      ${(item.price * item.soldCount).toLocaleString('en-US')}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* PESANAN */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-[#E4E0D8]">
          {orders.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Package className="w-7 h-7 text-[#71717A] mx-auto stroke-[1.25]" />
              <div className="text-sm font-medium text-[#18181B]">
                Belum ada antrean pesanan pelanggan
              </div>
              <p className="text-xs text-[#71717A]">
                Pesanan yang masuk melalui kasir akan tampil secara langsung di sini untuk pengaturan pengiriman.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E4E0D8] bg-[#F4F1EA] text-[11px] uppercase tracking-wider text-[#52525B]">
                    <th className="py-3 px-4 font-semibold">No. Pesanan</th>
                    <th className="py-3 px-4 font-semibold">Pelanggan</th>
                    <th className="py-3 px-4 font-semibold">Tujuan Pengiriman</th>
                    <th className="py-3 px-4 font-semibold text-right">Total</th>
                    <th className="py-3 px-4 font-semibold">Status Saat Ini</th>
                    <th className="py-3 px-4 font-semibold text-right">
                      Ubah Status Pengiriman
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D8] text-xs">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                      <td className="py-3 px-4 font-mono font-semibold text-[#18181B]">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-[#18181B]">
                        {ord.customerName}
                      </td>
                      <td className="py-3 px-4 text-[#52525B] max-w-xs truncate">
                        {ord.shippingDestination}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#18181B]">
                        ${ord.totalAmount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono uppercase text-[11px] text-[#18181B]">
                        {STATUS_LABELS_ID[ord.status] || ord.status}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={ord.status}
                          onChange={(e) =>
                            onAdminUpdateOrderStatus(
                              ord,
                              e.target.value as OrderStatus,
                              `Status diperbarui oleh Admin ke: ${
                                STATUS_LABELS_ID[e.target.value as OrderStatus] ||
                                e.target.value
                              }`
                            )
                          }
                          className="px-2.5 py-1 text-xs bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                        >
                          <option value="processing">01. Diproses</option>
                          <option value="packed">02. Dikemas</option>
                          <option value="in_transit">03. Dalam Perjalanan</option>
                          <option value="out_for_delivery">
                            04. Menuju Lokasi
                          </option>
                          <option value="delivered">05. Telah Tiba</option>
                          <option value="cancelled">Dibatalkan</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#FAF8F5] border border-[#E4E0D8] w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E4E0D8] pb-3">
              <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                Tambah Produk Katalog Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-xs text-[#52525B] hover:text-[#18181B]"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#52525B] mb-1">Kode SKU *</label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-[#D4CFC7]"
                  />
                </div>
                <div>
                  <label className="block text-[#52525B] mb-1">Kategori *</label>
                  <select
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as ProductCategory)
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D4CFC7]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS_ID[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#52525B] mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Lampu Meja Perunggu Kyudo"
                  className="w-full px-3 py-2 bg-white border border-[#D4CFC7]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#52525B] mb-1">Harga (USD) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono bg-white border border-[#D4CFC7]"
                  />
                </div>
                <div>
                  <label className="block text-[#52525B] mb-1">Stok Awal *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono bg-white border border-[#D4CFC7]"
                  />
                </div>
                <div>
                  <label className="block text-[#52525B] mb-1">Subkategori *</label>
                  <input
                    type="text"
                    required
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D4CFC7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#52525B] mb-1">Material *</label>
                  <input
                    type="text"
                    required
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D4CFC7]"
                  />
                </div>
                <div>
                  <label className="block text-[#52525B] mb-1">Dimensi *</label>
                  <input
                    type="text"
                    required
                    value={newDimensions}
                    onChange={(e) => setNewDimensions(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-[#D4CFC7]"
                  />
                </div>
                <div>
                  <label className="block text-[#52525B] mb-1">Asal Studio *</label>
                  <input
                    type="text"
                    required
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D4CFC7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#52525B] mb-1">
                  Deskripsi Produk *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Jelaskan keunikan bahan, proses pembuatan, dan fungsi..."
                  className="w-full px-3 py-2 bg-white border border-[#D4CFC7]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-[#D4CFC7] bg-white text-[#18181B]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5]"
                >
                  Terbitkan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
