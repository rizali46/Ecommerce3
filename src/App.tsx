import React, { useState, useEffect, useMemo } from 'react';

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import {
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Plus,
  Check,
  X,
  ShoppingBag,
  Truck,
  Heart,
  ShieldCheck,
  Trash2,
  Minus,
  ArrowRight,
  ChevronDown,
  Layers,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  OperationType,
  handleFirestoreError,
} from './firebase';
import {
  Product,
  ProductCategory,
  CartItem,
  OrderRecord,
  OrderItemRecord,
  OrderStatus,
  ReviewRecord,
  UserPublicProfile,
  UserPrivateProfile,
  PaymentMethodType,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_REVIEWS,
  HERO_IMAGE_PATH,
  CATEGORY_LABELS_ID,
  CATEGORY_DESCRIPTIONS_ID,
  CATEGORY_IMAGES,
  ROOM_AND_RITUAL_GROUPS,
  MATERIAL_CRAFT_GROUPS,
} from './data/catalog';
import { ProductImage } from './components/ProductImage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartCheckoutModal } from './components/CartCheckoutModal';
import { OrderTrackingSection } from './components/OrderTrackingSection';
import { AccountSection } from './components/AccountSection';
import { AdminDashboard } from './components/AdminDashboard';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CollectionPage } from './pages/CollectionPage';
import { ShopPage } from './pages/ShopPage';
import { AdminPage } from './pages/AdminPage';

type ActiveView =
  | 'home'
  | 'collection'
  | 'shop'
  | 'account'
  | 'admin';

export interface CollectionPresetFilter {
  type: 'none' | 'room' | 'material' | 'edition';
  id: string;
  label: string;
  description: string;
}


export default function App() {
  // Navigation & Modal State — Default to 'home' (Beranda full of products, summary, and catchy slogan)
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [shopSubTab, setShopSubTab] = useState<
    'bag_and_tracker' | 'wishlist' | 'shipping_warranty'
  >('bag_and_tracker');
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] =
    useState<boolean>(false);
  const [collectionPreset, setCollectionPreset] =
    useState<CollectionPresetFilter>({
      type: 'none',
      id: 'all',
      label: 'Semua Koleksi (42 Objek)',
      description: 'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
    });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);

  // Saved Wishlist IDs in localStorage for the "Toko" hub
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kanso_wishlist_v1');
      return saved ? JSON.parse(saved) : ['prod-01', 'prod-12', 'prod-32'];
    } catch {
      return ['prod-01', 'prod-12', 'prod-32'];
    }
  });
  

  // Firebase Auth & Profile State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [publicProfile, setPublicProfile] = useState<UserPublicProfile | null>(
    null
  );
  const [privateProfile, setPrivateProfile] =
    useState<UserPrivateProfile | null>(null);

  // Catalog, Cart, Orders, Reviews State
  const [firestoreProducts, setFirestoreProducts] = useState<
    Record<string, Product>
  >({});
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kanso_cart_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>(INITIAL_REVIEWS);

  // Dynamic Search & Filter State (Used in Koleksi & Beranda quick search)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceBracket, setPriceBracket] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');

  const isAdminUser = Boolean(
    currentUser?.email === 'babybau1010@gmail.com' ||
      publicProfile?.role === 'admin'
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  useEffect(() => {
    try {
      localStorage.setItem('kanso_cart_v1', JSON.stringify(cart));
    } catch {
      // Ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('kanso_wishlist_v1', JSON.stringify(wishlistIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [wishlistIds]);

  const toggleWishlist = (productId: string) => {
    setWishlistIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      showToast(
        exists
          ? 'Dihapus dari daftar simpanan.'
          : 'Disimpan ke daftar favorit di menu Toko.'
      );
      return next;
    });
  };

  // 1. Auth Listener & User Document Initialization
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        setPublicProfile(null);
        setPrivateProfile(null);
        setOrders([]);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const privDocRef = doc(db, 'users', user.uid, 'private', 'info');

      try {
        const snap = await getDoc(userDocRef);
        const defaultRole =
          user.email === 'babybau1010@gmail.com' ? 'admin' : 'customer';

        if (!snap.exists()) {
          const initialName = (
            user.displayName ||
            user.email?.split('@')[0] ||
            'Kolektor'
          ).slice(0, 80);

          await setDoc(userDocRef, {
            uid: user.uid,
            displayName: initialName,
            role: defaultRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setPublicProfile({
            uid: user.uid,
            displayName: initialName,
            role: defaultRole,
          });
        } else {
          const data = snap.data();
          setPublicProfile({
            uid: data.uid,
            displayName: data.displayName,
            role: data.role === 'admin' ? 'admin' : 'customer',
          });
        }

        const privSnap = await getDoc(privDocRef);
        if (!privSnap.exists()) {
          const defaultPriv: UserPrivateProfile = {
            uid: user.uid,
            email: (user.email || 'kolektor@kanso.co').slice(0, 120),
            phone: '',
            streetAddress: '',
            city: '',
            postalCode: '',
            country: 'Indonesia',
            defaultPaymentBrand: 'Visa',
            defaultPaymentLast4: '8842',
          };
          await setDoc(privDocRef, {
            ...defaultPriv,
            updatedAt: serverTimestamp(),
          });
          setPrivateProfile(defaultPriv);
        } else {
          const pData = privSnap.data();
          setPrivateProfile({
            uid: pData.uid,
            email: pData.email || user.email || '',
            phone: pData.phone || '',
            streetAddress: pData.streetAddress || '',
            city: pData.city || '',
            postalCode: pData.postalCode || '',
            country: pData.country || 'Indonesia',
            defaultPaymentBrand: pData.defaultPaymentBrand || 'Visa',
            defaultPaymentLast4: pData.defaultPaymentLast4 || '8842',
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
    });

    return () => unsub();
  }, []);

  // 2. Real-Time Catalog Products Listener
  useEffect(() => {
    const q = query(
      collection(db, 'products'),
      where('isPublished', '==', true)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, Product> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const seedMatch = INITIAL_PRODUCTS.find((p) => p.id === docSnap.id);
          map[docSnap.id] = {
            id: docSnap.id,
            sku: d.sku,
            title: seedMatch ? seedMatch.title : d.title,
            category: d.category as ProductCategory,
            subcategory: seedMatch ? seedMatch.subcategory : d.subcategory,
            price: Number(d.price),
            stock: Number(d.stock),
            soldCount: Number(d.soldCount),
            rating: Number(d.rating),
            reviewCount: Number(d.reviewCount),
            material: seedMatch ? seedMatch.material : d.material,
            dimensions: d.dimensions,
            origin: seedMatch ? seedMatch.origin : d.origin,
            description: seedMatch ? seedMatch.description : d.description,
            imageUrl: d.imageUrl,
            badge: seedMatch ? seedMatch.badge : d.badge || 'Tersedia',
            finishes: seedMatch?.finishes || ['Varian Standar'],
            isPublished: Boolean(d.isPublished),
          };
        });
        setFirestoreProducts(map);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    );
    return () => unsub();
  }, []);

  // 3. Real-Time Customer Reviews Listener
  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      where('isPublished', '==', true)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const liveReviews: ReviewRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const createdTs =
            d.createdAt instanceof Timestamp
              ? d.createdAt.toMillis()
              : Date.now();
          liveReviews.push({
            id: docSnap.id,
            productId: d.productId,
            userId: d.userId,
            authorName: d.authorName,
            rating: Number(d.rating),
            title: d.title,
            comment: d.comment,
            verifiedPurchase: Boolean(d.verifiedPurchase),
            helpfulCount: Number(d.helpfulCount || 0),
            isPublished: Boolean(d.isPublished),
            createdAtMs: createdTs,
          });
        });
        const merged = [
          ...liveReviews,
          ...INITIAL_REVIEWS.filter(
            (seed) => !liveReviews.some((lr) => lr.id === seed.id)
          ),
        ].sort((a, b) => b.createdAtMs - a.createdAtMs);
        setReviews(merged);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    );
    return () => unsub();
  }, []);

  // 4. Real-Time Orders Listener
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        const fetchedOrders: OrderRecord[] = [];

        for (const docSnap of snapshot.docs) {
          const d = docSnap.data();
          const createdMs =
            d.createdAt instanceof Timestamp
              ? d.createdAt.toMillis()
              : Date.now();
          const updatedMs =
            d.updatedAt instanceof Timestamp
              ? d.updatedAt.toMillis()
              : createdMs;

          let orderItems: OrderItemRecord[] = [];
          try {
            const itemsQuery = query(
              collection(db, 'orders', docSnap.id, 'items'),
              where('userId', '==', currentUser.uid)
            );
            const itemsSnap = await getDocs(itemsQuery);
            orderItems = itemsSnap.docs.map((itemDoc) => {
              const idata = itemDoc.data();
              return {
                id: itemDoc.id,
                orderId: idata.orderId,
                userId: idata.userId,
                productId: idata.productId,
                title: idata.title,
                category: idata.category,
                finish: idata.finish,
                unitPrice: Number(idata.unitPrice),
                quantity: Number(idata.quantity),
                lineTotal: Number(idata.lineTotal),
              };
            });
          } catch (err) {
            handleFirestoreError(
              err,
              OperationType.LIST,
              `orders/${docSnap.id}/items`
            );
          }

          fetchedOrders.push({
            id: docSnap.id,
            orderNumber: d.orderNumber,
            userId: d.userId,
            customerName: d.customerName,
            shippingDestination: d.shippingDestination,
            subtotal: Number(d.subtotal),
            shippingCost: Number(d.shippingCost),
            taxAmount: Number(d.taxAmount),
            totalAmount: Number(d.totalAmount),
            itemCount: Number(d.itemCount),
            paymentMethod: d.paymentMethod,
            paymentStatus: d.paymentStatus,
            paymentTransactionId: d.paymentTransactionId,
            carrier: d.carrier,
            trackingNumber: d.trackingNumber,
            status: d.status,
            trackingNote: d.trackingNote,
            estimatedDelivery: d.estimatedDelivery,
            createdAtMs: createdMs,
            updatedAtMs: updatedMs,
            items: orderItems,
          });
        }

        fetchedOrders.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setOrders(fetchedOrders);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    return () => unsub();
  }, [authReady, currentUser]);

  // Merge initial 42 products with live Firestore overrides
  const allProducts: Product[] = useMemo(() => {
    const mergedBase = INITIAL_PRODUCTS.map((seed) =>
      firestoreProducts[seed.id] ? firestoreProducts[seed.id] : seed
    );
    const additionalFirestoreProducts = Object.values(firestoreProducts).filter(
      (fp) => !INITIAL_PRODUCTS.some((seed) => seed.id === fp.id)
    );
    return [...additionalFirestoreProducts, ...mergedBase];
  }, [firestoreProducts]);

  useEffect(() => {
    if (selectedProduct) {
      const updated = allProducts.find((p) => p.id === selectedProduct.id);
      if (updated) setSelectedProduct(updated);
    }
  }, [allProducts, selectedProduct]);

  // Helper to select an item from the Koleksi Navbar Dropdown
  const handleSelectCollectionDropdown = (options: {
    category?: string;
    preset?: CollectionPresetFilter;
    sort?: string;
  }) => {
    setActiveView('collection');
    setIsCollectionDropdownOpen(false);
    setSelectedCategory(options.category ?? 'all');
    setCollectionPreset(
      options.preset ?? {
        type: 'none',
        id: 'all',
        label: 'Semua Koleksi (42 Objek)',
        description: 'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
      }
    );
    if (options.sort) {
      setSortBy(options.sort);
    }
    setTimeout(() => {
      const el = document.getElementById('catalog-grid');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  // Filtered & Sorted Products for Collection View
  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }
        if (collectionPreset.type === 'room') {
          const grp = ROOM_AND_RITUAL_GROUPS.find(
            (g) => g.id === collectionPreset.id
          );
          if (grp && !grp.filterFn(p)) return false;
        }
        if (collectionPreset.type === 'material') {
          const grp = MATERIAL_CRAFT_GROUPS.find(
            (g) => g.id === collectionPreset.id
          );
          if (grp && !grp.filterFn(p)) return false;
        }
        if (collectionPreset.type === 'edition') {
          if (
            collectionPreset.id === 'bestseller' &&
            p.badge !== 'Terlaris' &&
            p.soldCount < 85
          ) {
            return false;
          }
          if (
            collectionPreset.id === 'limited' &&
            p.badge !== 'Edisi Terbatas' &&
            p.badge !== 'Seri Bernomor' &&
            p.badge !== 'Edisi Studio' &&
            p.badge !== 'Unggulan'
          ) {
            return false;
          }
          if (collectionPreset.id === 'essential' && p.price >= 200) {
            return false;
          }
        }
        if (inStockOnly && p.stock <= 0) {
          return false;
        }
        if (minRating > 0 && p.rating < minRating) {
          return false;
        }
        if (priceBracket === 'under150' && p.price >= 150) return false;
        if (priceBracket === '150to500' && (p.price < 150 || p.price > 500))
          return false;
        if (priceBracket === '500to1500' && (p.price <= 500 || p.price > 1500))
          return false;
        if (priceBracket === 'over1500' && p.price <= 1500) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (CATEGORY_LABELS_ID[p.category] || '').toLowerCase().includes(q) ||
            p.subcategory.toLowerCase().includes(q) ||
            p.material.toLowerCase().includes(q) ||
            p.origin.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        if (sortBy === 'popular') return b.soldCount - a.soldCount;
        return 0;
      });
  }, [
    allProducts,
    selectedCategory,
    collectionPreset,
    inStockOnly,
    minRating,
    priceBracket,
    searchQuery,
    sortBy,
  ]);

  // Catalog Summary Statistics for the Home Screen (Beranda)
  const catalogSummary = useMemo(() => {
    const totalSkus = allProducts.length;
    const totalStock = allProducts.reduce((s, p) => s + p.stock, 0);
    const minPrice = Math.min(...allProducts.map((p) => p.price));
    const maxPrice = Math.max(...allProducts.map((p) => p.price));
    const avgRating =
      allProducts.reduce((s, p) => s + p.rating, 0) /
      Math.max(1, allProducts.length);
    return {
      totalSkus,
      totalStock,
      minPrice,
      maxPrice,
      avgRating: avgRating.toFixed(2),
    };
  }, [allProducts]);

  const ensureProductInFirestore = async (product: Product) => {
    const prodRef = doc(db, 'products', product.id);
    const snap = await getDoc(prodRef);
    if (!snap.exists()) {
      await setDoc(prodRef, {
        sku: product.sku.slice(0, 40),
        title: product.title.slice(0, 120),
        category: product.category,
        subcategory: product.subcategory.slice(0, 60),
        price: product.price,
        stock: product.stock,
        soldCount: product.soldCount,
        rating: product.rating,
        reviewCount: product.reviewCount,
        material: product.material.slice(0, 100),
        dimensions: product.dimensions.slice(0, 80),
        origin: product.origin.slice(0, 80),
        description: product.description.slice(0, 800),
        imageUrl: product.imageUrl.slice(0, 300),
        badge: (product.badge || 'Tersedia').slice(0, 40),
        isPublished: true,
        updatedAt: serverTimestamp(),
      });
    }
  };

  // Authentication Actions
  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Berhasil masuk dengan akun Google.');
    } catch (err) {
      console.error('Sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveView('home');
    showToast('Anda telah keluar dari akun.');
  };

  // Shopping Cart Actions
  const handleAddToCart = (
    product: Product,
    quantity: number = 1,
    finish?: string
  ) => {
    const chosenFinish = finish || product.finishes[0] || 'Varian Standar';
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedFinish === chosenFinish
      );
      if (existingIndex > -1) {
        const next = [...prev];
        const maxAllowed = Math.max(1, product.stock);
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: Math.min(
            maxAllowed,
            next[existingIndex].quantity + quantity
          ),
        };
        return next;
      }
      return [
        ...prev,
        {
          product,
          quantity: Math.min(Math.max(1, product.stock), quantity),
          selectedFinish: chosenFinish,
        },
      ];
    });
    setQuickAddedId(product.id);
    setTimeout(() => {
      setQuickAddedId((curr) => (curr === product.id ? null : curr));
    }, 1100);
  };

  const handleUpdateCartQuantity = (
    productId: string,
    finish: string,
    delta: number
  ) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedFinish === finish
          ) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: Math.min(Math.max(1, item.product.stock), nextQty),
            };
          }
          return item;
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const handleRemoveCartItem = (productId: string, finish: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(item.product.id === productId && item.selectedFinish === finish)
      )
    );
  };

  // Checkout & Payment Gateway Execution
  const handlePlaceOrder = async (payload: {
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
  }): Promise<string> => {
    if (!currentUser) {
      throw new Error('Silakan masuk terlebih dahulu untuk membuat pesanan.');
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const shippingCost = subtotal >= 500 ? 0 : 35;
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount =
      Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const orderId = `ord-${Date.now()}-${randomDigits}`;
    const orderNumber = `KNS-${randomDigits}`;
    const trackingNumber = `TRK-${Math.floor(
      10000000 + Math.random() * 90000000
    )}`;
    const paymentTransactionId = `tx-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const arrivalDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 4);
    const estimatedDelivery = arrivalDate.toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const shippingDestination =
      `${payload.streetAddress}, ${payload.city}, ${payload.postalCode}, ${payload.country}`.slice(
        0,
        240
      );

    try {
      for (const item of cart) {
        await ensureProductInFirestore(item.product);
        const prodRef = doc(db, 'products', item.product.id);
        const currentLive =
          firestoreProducts[item.product.id] || item.product;
        const nextStock = Math.max(0, currentLive.stock - item.quantity);
        const nextSold = currentLive.soldCount + item.quantity;

        await updateDoc(prodRef, {
          stock: nextStock,
          soldCount: nextSold,
          updatedAt: serverTimestamp(),
        });
      }

      const batch = writeBatch(db);
      const orderRef = doc(db, 'orders', orderId);

      batch.set(orderRef, {
        orderNumber,
        userId: currentUser.uid,
        customerName: payload.customerName.slice(0, 80),
        shippingDestination,
        subtotal,
        shippingCost,
        taxAmount,
        totalAmount,
        itemCount,
        paymentMethod: payload.paymentMethod,
        paymentStatus:
          payload.paymentMethod === 'cod' ? 'cod_pending' : 'paid',
        paymentTransactionId,
        carrier: 'Kurir Kanso White-Glove',
        trackingNumber,
        status: 'processing',
        trackingNote:
          'Pembayaran terverifikasi — Pemeriksaan kualitas dimulai di Atelier Kanso',
        estimatedDelivery,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      cart.forEach((item, idx) => {
        const itemId = `item-${idx + 1}-${item.product.id}`;
        const itemRef = doc(db, 'orders', orderId, 'items', itemId);
        batch.set(itemRef, {
          orderId,
          userId: currentUser.uid,
          productId: item.product.id,
          title: item.product.title.slice(0, 120),
          category: item.product.category.slice(0, 60),
          finish: item.selectedFinish.slice(0, 60),
          unitPrice: item.product.price,
          quantity: item.quantity,
          lineTotal:
            Math.round(item.product.price * item.quantity * 100) / 100,
          createdAt: serverTimestamp(),
        });
      });

      if (payload.savePaymentPreference) {
        const privRef = doc(db, 'users', currentUser.uid, 'private', 'info');
        batch.set(privRef, {
          uid: currentUser.uid,
          email: (currentUser.email || 'kolektor@kanso.co').slice(0, 120),
          phone: payload.phone.slice(0, 30),
          streetAddress: payload.streetAddress.slice(0, 160),
          city: payload.city.slice(0, 80),
          postalCode: payload.postalCode.slice(0, 24),
          country: payload.country.slice(0, 60),
          defaultPaymentBrand: payload.cardBrand.slice(0, 30),
          defaultPaymentLast4: payload.cardLast4.slice(0, 4),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      setCart([]);
      setHighlightedOrderId(orderId);
      setActiveView('shop');
      setShopSubTab('bag_and_tracker');
      showToast(
        `Pesanan ${orderNumber} berhasil dibuat! Pelacak pesanan real-time telah aktif di menu Toko.`
      );
      return orderId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  // Real-Time Order Tracking Progression Action
  const handleAdvanceOrderStatus = async (order: OrderRecord) => {
    const progression: Record<
      OrderStatus,
      { next: OrderStatus; note: string } | null
    > = {
      processing: {
        next: 'packed',
        note: 'Kemasan pelindung kayu disegel & sertifikat keaslian disertakan',
      },
      packed: {
        next: 'in_transit',
        note: 'Berangkat dari gudang regional melalui armada kargo berpendingin',
      },
      in_transit: {
        next: 'out_for_delivery',
        note: 'Kurir lokal sedang menuju alamat tujuan untuk serah terima',
      },
      out_for_delivery: {
        next: 'delivered',
        note: 'Pesanan telah diterima dan ditandatangani di lokasi tujuan',
      },
      delivered: null,
      cancelled: null,
    };

    const step = progression[order.status];
    if (!step) return;

    const orderRef = doc(db, 'orders', order.id);
    try {
      await updateDoc(orderRef, {
        status: step.next,
        trackingNote: step.note,
        updatedAt: serverTimestamp(),
      });
      showToast(`Status pesanan ${order.orderNumber} diperbarui.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const handleCancelOrder = async (order: OrderRecord) => {
    if (order.status !== 'processing') return;
    const orderRef = doc(db, 'orders', order.id);
    try {
      await updateDoc(orderRef, {
        status: 'cancelled',
        trackingNote: 'Dibatalkan oleh pelanggan sebelum pengemasan kurir',
        updatedAt: serverTimestamp(),
      });
      showToast(`Pesanan ${order.orderNumber} telah dibatalkan.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };
  

  // Customer Review Actions
  const handleSubmitReview = async (
    product: Product,
    rating: number,
    title: string,
    comment: string
  ) => {
    if (!currentUser) {
      throw new Error('Silakan masuk untuk mengirim ulasan.');
    }

    const reviewId = `rev-${Date.now()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    const hasPurchased = orders.some((o) =>
      (o.items || []).some((i) => i.productId === product.id)
    );

    try {
      await ensureProductInFirestore(product);

      const revRef = doc(db, 'reviews', reviewId);
      await setDoc(revRef, {
        productId: product.id,
        userId: currentUser.uid,
        authorName: (
          publicProfile?.displayName ||
          currentUser.displayName ||
          'Kolektor Terverifikasi'
        ).slice(0, 80),
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        title: title.slice(0, 100),
        comment: comment.slice(0, 600),
        verifiedPurchase: hasPurchased,
        helpfulCount: 0,
        isPublished: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const prodRef = doc(db, 'products', product.id);
      const nextCount = product.reviewCount + 1;
      const nextRating =
        Math.round(
          ((product.rating * product.reviewCount + rating) / nextCount) * 10
        ) / 10;

      await updateDoc(prodRef, {
        rating: Math.min(5, Math.max(1, nextRating)),
        reviewCount: nextCount,
        updatedAt: serverTimestamp(),
      });

      showToast('Ulasan produk Anda telah diterbitkan.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reviews/${reviewId}`);
    }
  };

  const handleMarkReviewHelpful = async (review: ReviewRecord) => {
    if (review.id.startsWith('rev-seed-')) {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r
        )
      );
      return;
    }

    if (!currentUser) {
      await handleSignIn();
      return;
    }

    const revRef = doc(db, 'reviews', review.id);
    try {
      await updateDoc(revRef, {
        helpfulCount: review.helpfulCount + 1,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reviews/${review.id}`);
    }
  };

  // Profile Update Action
  const handleSaveProfile = async (
    newDisplayName: string,
    privateData: Omit<UserPrivateProfile, 'uid'>
  ) => {
    if (!currentUser) return;
    const userRef = doc(db, 'users', currentUser.uid);
    const privRef = doc(db, 'users', currentUser.uid, 'private', 'info');

    try {
      await updateDoc(userRef, {
        displayName: newDisplayName.slice(0, 80),
        updatedAt: serverTimestamp(),
      });
      await setDoc(privRef, {
        uid: currentUser.uid,
        ...privateData,
        updatedAt: serverTimestamp(),
      });

      setPublicProfile((prev) =>
        prev ? { ...prev, displayName: newDisplayName } : null
      );
      setPrivateProfile({
        uid: currentUser.uid,
        ...privateData,
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${currentUser.uid}`
      );
    }
  };

  // Admin Inventory & Order Management Actions
  const handleUpdateProductInventory = async (
    product: Product,
    newStock: number,
    newPrice: number
  ) => {
    if (!currentUser) {
      throw new Error('Silakan masuk untuk mengubah inventaris.');
    }
    try {
      await ensureProductInFirestore(product);
      const prodRef = doc(db, 'products', product.id);
      await updateDoc(prodRef, {
        stock: newStock,
        price: newPrice,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleCreateProduct = async (newProd: Omit<Product, 'id'>) => {
    if (!currentUser) {
      throw new Error('Silakan masuk sebagai admin untuk menambah produk.');
    }
    const newId = `prod-${allProducts.length + 1}-${Date.now()
      .toString()
      .slice(-4)}`;
    const prodRef = doc(db, 'products', newId);
    try {
      await setDoc(prodRef, {
        sku: newProd.sku.slice(0, 40),
        title: newProd.title.slice(0, 120),
        category: newProd.category,
        subcategory: newProd.subcategory.slice(0, 60),
        price: newProd.price,
        stock: newProd.stock,
        soldCount: 0,
        rating: 5.0,
        reviewCount: 1,
        material: newProd.material.slice(0, 100),
        dimensions: newProd.dimensions.slice(0, 80),
        origin: newProd.origin.slice(0, 80),
        description: newProd.description.slice(0, 800),
        imageUrl: newProd.imageUrl.slice(0, 300),
        badge: 'Rilis Baru',
        isPublished: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${newId}`);
    }
  };

  const handleSyncAllCatalogToFirestore = async () => {
    if (!currentUser) {
      throw new Error('Silakan masuk untuk menyinkronkan katalog.');
    }
    try {
      const batch = writeBatch(db);
      allProducts.forEach((product) => {
        const prodRef = doc(db, 'products', product.id);
        batch.set(prodRef, {
          sku: product.sku.slice(0, 40),
          title: product.title.slice(0, 120),
          category: product.category,
          subcategory: product.subcategory.slice(0, 60),
          price: product.price,
          stock: product.stock,
          soldCount: product.soldCount,
          rating: product.rating,
          reviewCount: product.reviewCount,
          material: product.material.slice(0, 100),
          dimensions: product.dimensions.slice(0, 80),
          origin: product.origin.slice(0, 80),
          description: product.description.slice(0, 800),
          imageUrl: product.imageUrl.slice(0, 300),
          badge: (product.badge || 'Tersedia').slice(0, 40),
          isPublished: true,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  const handleAdminUpdateOrderStatus = async (
    order: OrderRecord,
    newStatus: OrderStatus,
    note: string
  ) => {
    const orderRef = doc(db, 'orders', order.id);
    try {
      await updateDoc(orderRef, {
        status: newStatus,
        trackingNote: note.slice(0, 200),
        updatedAt: serverTimestamp(),
      });
      showToast(`Status pesanan ${order.orderNumber} diperbarui.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  const totalBagCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const bagSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Reusable Product Card Component used across Beranda, Kategori, and Koleksi
  const renderProductCard = (product: Product, showFullSummary = false) => {
    const isQuickAdded = quickAddedId === product.id;
    const isWishlisted = wishlistIds.includes(product.id);

    return (
      <article
        key={product.id}
        className="group bg-white border border-[#E4E0D8] flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      >
        <div>
          <div className="relative">
            <div
              onClick={() => setSelectedProduct(product)}
              className="cursor-pointer"
            >
              <ProductImage product={product} aspectClass="aspect-[4/3]" />
            </div>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Simpan ke favorit"
              className="absolute top-3 right-3 p-2 bg-[#FAF8F5]/90 hover:bg-[#FAF8F5] text-[#18181B] border border-[#18181B]/10 transition-colors"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isWishlisted
                    ? 'fill-[#18181B] text-[#18181B]'
                    : 'text-[#52525B]'
                }`}
              />
            </button>
            
          </div>

          <div className="p-5 space-y-2">
          
            <div className="flex items-center justify-between text-[12px] text-[#71717A]">
              <div className="uppercase tracking-wider truncate">
                <span>
                  {CATEGORY_LABELS_ID[product.category] || product.category}
                </span>
                <span aria-hidden="true"> · </span>
                <span>{product.origin}</span>
              </div>
              <span className="font-mono tabular-nums shrink-0 ml-2">
                {product.rating.toFixed(1)} ★ ({product.reviewCount})
              </span>
            </div>

            <h2
              onClick={() => setSelectedProduct(product)}
              className="text-base font-semibold text-[#18181B] group-hover:underline underline-offset-4 cursor-pointer leading-snug line-clamp-1"
            >
              {product.title}
            </h2>

            <p className="text-xs text-[#52525B] font-medium line-clamp-1">
              {product.material} · <span className="font-mono">{product.dimensions}</span>
            </p>

            {showFullSummary && (
              <p className="text-xs text-[#71717A] leading-relaxed line-clamp-2 pt-0.5">
                {product.description}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-[#E4E0D8] flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-mono tabular-nums font-semibold text-[#18181B]">
              ${product.price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-[#71717A] font-mono tabular-nums">
              {product.badge} · Stok {product.stock}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedProduct(product)}
              className="px-3 py-2 text-xs font-medium border border-[#D4CFC7] text-[#18181B] hover:border-[#18181B] transition-colors whitespace-nowrap shrink-0"
            >
              Ringkasan
            </button>

            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={() => handleAddToCart(product, 1)}
              className={`px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                product.stock <= 0
                  ? 'bg-[#E4E0D8] text-[#71717A] cursor-not-allowed'
                  : isQuickAdded
                  ? 'bg-[#166534] text-white'
                  : 'bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A]'
              }`}
            >
              {isQuickAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Masuk Tas</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Beli</span>
                </>
              )}
            </button>
          </div>
        </div>
      </article>
    );
    
  };


  return (

    
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#18181B]">
      {/* NAVBAR*/}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-8 px-6 py-4 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E4E0D8]">
       
        <a
          href="#beranda"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('home');
          }}
          className="font-display text-2xl font-semibold tracking-tight text-[#18181B] whitespace-nowrap shrink-0"
        >
          Kanso &amp; Co.
        </a>
       

       
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium uppercase tracking-wider text-[#52525B]">
          <a
            href="#beranda"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('home');
              setIsCollectionDropdownOpen(false);
            }}
            className={`hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'home'
                ? 'text-[#18181B] border-b border-[#18181B]'
                : ''
            }`}
          >
            Beranda
          </a>

          {/*DROPDOWN */}
          <div
            className="relative"
            onMouseEnter={() => setIsCollectionDropdownOpen(true)}
            onMouseLeave={() => setIsCollectionDropdownOpen(false)}
          >
            <button
              type="button"
              onClick={() => {
                setActiveView('collection');
                setIsCollectionDropdownOpen((prev) => !prev);
              }}
              aria-expanded={isCollectionDropdownOpen}
              className={`flex items-center gap-1.5 hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 py-1 uppercase tracking-wider ${
                activeView === 'collection'
                  ? 'text-[#18181B] border-b border-[#18181B]'
                  : ''
              }`}
            >
              <span>Koleksi</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  isCollectionDropdownOpen ? 'rotate-180 text-[#18181B]' : ''
                }`}
              />
            </button>

            {isCollectionDropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 w-[760px]">
                <div className="bg-[#FAF8F5] border border-[#18181B] shadow-2xl p-6 text-left normal-case tracking-normal">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E4E0D8]">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                        Direktori Kurasi Kanso &amp; Co.
                      </div>
                      <div className="font-display text-xl font-semibold text-[#18181B]">
                        Jelajahi 42 Koleksi Berdasarkan Departemen, Ruang &amp; Material
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectCollectionDropdown({
                          category: 'all',
                          preset: {
                            type: 'none',
                            id: 'all',
                            label: 'Semua Koleksi (42 Objek)',
                            description:
                              'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
                          },
                        })
                      }
                      className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <span>Lihat Semua (42)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                  
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A] border-b border-[#E4E0D8] pb-1.5">
                        01. Departemen Utama
                      </div>
                      <ul className="space-y-1.5">
                        {(
                          [
                            {
                              cat: 'Furniture & Lighting' as ProductCategory,
                              sub: 'Kursi ek, meja travertine & lampu alabaster',
                            },
                            {
                              cat: 'Audio & Horology' as ProductCategory,
                              sub: 'Turntable referensi, speaker & jam meja mekanis',
                            },
                            {
                              cat: 'Apothecary & Skincare' as ProductCategory,
                              sub: 'Serum botani dingin, dupa Hinoki & minyak murni',
                            },
                            {
                              cat: 'Ceramics & Tableware' as ProductCategory,
                              sub: 'Porselen Arita, ketel tembaga & kaca tiup',
                            },
                          ] as const
                        ).map((item) => (
                          <li key={item.cat}>
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectCollectionDropdown({
                                  category: item.cat,
                                  preset: {
                                    type: 'none',
                                    id: item.cat,
                                    label: CATEGORY_LABELS_ID[item.cat],
                                    description:
                                      CATEGORY_DESCRIPTIONS_ID[item.cat],
                                  },
                                })
                              }
                              className="w-full text-left p-2 hover:bg-[#EFECE6] transition-colors group"
                            >
                              <div className="text-xs font-semibold text-[#18181B] group-hover:underline underline-offset-4">
                                {CATEGORY_LABELS_ID[item.cat]}
                              </div>
                              <div className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                                {item.sub}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A] border-b border-[#E4E0D8] pb-1.5 flex items-center gap-1.5">
                        <Compass className="w-3 h-3 text-[#18181B]" />
                        <span>02. Ruang &amp; Ritual</span>
                      </div>
                      <ul className="space-y-1.5">
                        {ROOM_AND_RITUAL_GROUPS.map((grp) => (
                          <li key={grp.id}>
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectCollectionDropdown({
                                  category: 'all',
                                  preset: {
                                    type: 'room',
                                    id: grp.id,
                                    label: grp.title,
                                    description: grp.tagline,
                                  },
                                })
                              }
                              className="w-full text-left p-2 hover:bg-[#EFECE6] transition-colors group"
                            >
                              <div className="text-xs font-semibold text-[#18181B] group-hover:underline underline-offset-4">
                                {grp.title}
                              </div>
                              <div className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                                {grp.subtitle}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

            
                    <div className="space-y-3">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A] border-b border-[#E4E0D8] pb-1.5 flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-[#18181B]" />
                        <span>03. Material &amp; Kurasi</span>
                      </div>
                      <ul className="space-y-1.5">
                        {MATERIAL_CRAFT_GROUPS.slice(0, 3).map((mat) => (
                          <li key={mat.id}>
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectCollectionDropdown({
                                  category: 'all',
                                  preset: {
                                    type: 'material',
                                    id: mat.id,
                                    label: mat.title,
                                    description: mat.tagline,
                                  },
                                })
                              }
                              className="w-full text-left p-2 hover:bg-[#EFECE6] transition-colors group"
                            >
                              <div className="text-xs font-semibold text-[#18181B] group-hover:underline underline-offset-4">
                                {mat.title}
                              </div>
                              <div className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                                {mat.subtitle}
                              </div>
                            </button>
                          </li>
                        ))}
                        <li>
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectCollectionDropdown({
                                category: 'all',
                                sort: 'popular',
                                preset: {
                                  type: 'edition',
                                  id: 'bestseller',
                                  label: 'Karya Terlaris (Best Sellers)',
                                  description:
                                    'Objek dengan permintaan tertinggi dari arsitek dan kolektor residensial.',
                                },
                              })
                            }
                            className="w-full text-left p-2 hover:bg-[#EFECE6] transition-colors group"
                          >
                            <div className="text-xs font-semibold text-[#18181B] flex items-center gap-1 group-hover:underline underline-offset-4">
                              <Sparkles className="w-3 h-3 text-[#18181B]" />
                              <span>Karya Terlaris &amp; Populer</span>
                            </div>
                            <div className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                              Pilihan favorit kolektor Kanso &amp; Co.
                            </div>
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectCollectionDropdown({
                                category: 'all',
                                preset: {
                                  type: 'edition',
                                  id: 'limited',
                                  label: 'Edisi Terbatas & Seri Bernomor',
                                  description:
                                    'Produksi batch kecil dengan sertifikat keaslian bernomor seri.',
                                },
                              })
                            }
                            className="w-full text-left p-2 hover:bg-[#EFECE6] transition-colors group"
                          >
                            <div className="text-xs font-semibold text-[#18181B] group-hover:underline underline-offset-4">
                              Edisi Terbatas &amp; Studio
                            </div>
                            <div className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                              Koleksi eksklusif bernomor seri
                            </div>
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <a
            href="#toko"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('shop');
              setIsCollectionDropdownOpen(false);
            }}
            className={`hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'shop'
                ? 'text-[#18181B] border-b border-[#18181B]'
                : ''
            }`}
          >
            Toko &amp; Lacak
          </a>
          <a
            href="#akun"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('account');
              setIsCollectionDropdownOpen(false);
            }}
            className={`hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeView === 'account' || activeView === 'admin'
                ? 'text-[#18181B] border-b border-[#18181B]'
                : ''
            }`}
          >
            {currentUser ? 'Akun & Admin' : 'Masuk'}
          </a>
        </nav>

   
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#FAF8F5] bg-[#18181B] hover:bg-[#27272A] transition-colors whitespace-nowrap shrink-0 font-mono tabular-nums"
          >
            Tas Belanja ({totalBagCount})
          </button>
        </div>
      </header>

    
      <div className="md:hidden border-b border-[#E4E0D8] bg-[#F4F1EA]">
        <div className="flex items-center justify-around px-3 py-2.5 text-xs font-medium text-[#52525B]">
          <button
            type="button"
            onClick={() => {
              setActiveView('home');
              setIsCollectionDropdownOpen(false);
            }}
            className={`py-1 whitespace-nowrap shrink-0 ${
              activeView === 'home' ? 'text-[#18181B] font-semibold' : ''
            }`}
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={() =>
              setIsCollectionDropdownOpen((prev) => !prev)
            }
            className={`py-1 flex items-center gap-1 whitespace-nowrap shrink-0 ${
              activeView === 'collection' || isCollectionDropdownOpen
                ? 'text-[#18181B] font-semibold'
                : ''
            }`}
          >
            <span>Koleksi</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                isCollectionDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('shop');
              setIsCollectionDropdownOpen(false);
            }}
            className={`py-1 whitespace-nowrap shrink-0 ${
              activeView === 'shop' ? 'text-[#18181B] font-semibold' : ''
            }`}
          >
            Toko ({totalBagCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('account');
              setIsCollectionDropdownOpen(false);
            }}
            className={`py-1 whitespace-nowrap shrink-0 ${
              activeView === 'account' || activeView === 'admin'
                ? 'text-[#18181B] font-semibold'
                : ''
            }`}
          >
            Akun
          </button>
        </div>

        {isCollectionDropdownOpen && (
          <div className="px-4 py-4 bg-[#FAF8F5] border-t border-[#E4E0D8] space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase tracking-wider text-[11px] text-[#71717A]">
                Pilih Kurasi Koleksi
              </span>
              <button
                type="button"
                onClick={() =>
                  handleSelectCollectionDropdown({
                    category: 'all',
                    preset: {
                      type: 'none',
                      id: 'all',
                      label: 'Semua Koleksi (42 Objek)',
                      description:
                        'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
                    },
                  })
                }
                className="text-[#18181B] font-semibold underline underline-offset-4"
              >
                Lihat Semua (42)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  'Furniture & Lighting',
                  'Audio & Horology',
                  'Apothecary & Skincare',
                  'Ceramics & Tableware',
                ] as ProductCategory[]
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    handleSelectCollectionDropdown({
                      category: cat,
                      preset: {
                        type: 'none',
                        id: cat,
                        label: CATEGORY_LABELS_ID[cat],
                        description: CATEGORY_DESCRIPTIONS_ID[cat],
                      },
                    })
                  }
                  className="p-2.5 text-left bg-white border border-[#E4E0D8] font-medium text-[#18181B]"
                >
                  {CATEGORY_LABELS_ID[cat]}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#E4E0D8]">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                Berdasarkan Ruang &amp; Edisi
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_AND_RITUAL_GROUPS.map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() =>
                      handleSelectCollectionDropdown({
                        category: 'all',
                        preset: {
                          type: 'room',
                          id: grp.id,
                          label: grp.title,
                          description: grp.tagline,
                        },
                      })
                    }
                    className="p-2 text-left bg-white border border-[#E4E0D8] text-[#52525B] hover:text-[#18181B]"
                  >
                    {grp.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

     
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18181B] text-[#FAF8F5] px-5 py-3.5 text-xs font-medium shadow-xl flex items-center gap-3 border border-[#3F3F46]">
          <Check className="w-4 h-4 text-[#4ADE80] shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[#A1A1AA] hover:text-white ml-2"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/*MAIN */}
      <main className="flex-1">
        {/* BERANDA HALAMAN UTAMA*/}
        {activeView === 'home' && (
          <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
     
            <div className="bg-white border border-[#E4E0D8] p-6 sm:p-10 space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#E4E0D8] pb-8">
                <div className="space-y-3 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-[#71717A]">
                    <span>Kanso &amp; Co. Indonesia</span>
                    <span aria-hidden="true">·</span>
                    <span>Edisi Kurasi Lengkap</span>
                    <span aria-hidden="true">·</span>
                    <span>Siap Kirim ke Seluruh Indonesia</span>
                  </div>

                  <h1
                    className="font-display font-semibold text-[#18181B] leading-[1.08] tracking-tight"
                    style={{
                      fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)',
                      textWrap: 'balance',
                    }}
                  >
                    “Sentuhan Kriya Abadi untuk Ruang Hidup yang Tenang — Setiap Objek Punya Cerita.”
                  </h1>

                  <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
                    Selamat datang di etalase utama Kanso &amp; Co. Temukan seluruh{' '}
                    <strong className="text-[#18181B]">
                      {catalogSummary.totalSkus} produk pilihan
                    </strong>{' '}
                    lengkap dengan ringkasan material, dimensi fisik, asal studio, dan ketersediaan stok langsung di satu layar.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveView('collection')}
                    className="px-5 py-3 text-xs font-medium border border-[#18181B] text-[#18181B] hover:bg-[#18181B] hover:text-[#FAF8F5] transition-colors whitespace-nowrap"
                  >
                    Eksplorasi Kurasi Koleksi
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('shop')}
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors whitespace-nowrap"
                  >
                    Buka Toko &amp; Lacak Pesanan
                  </button>
                </div>
              </div>

              {/* Ringkasan Produk  */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
                <div className="space-y-1">
                  <div className="text-[#71717A] uppercase tracking-wider">
                    Total Koleksi Produk
                  </div>
                  <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
                    {catalogSummary.totalSkus} Produk Aktif
                  </div>
                  <div className="text-[#52525B]">
                    Terbagi dalam 4 departemen kurasi
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[#71717A] uppercase tracking-wider">
                    Ringkasan Stok Tersedia
                  </div>
                  <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
                    {catalogSummary.totalStock.toLocaleString('en-US')} Unit Siap Kirim
                  </div>
                  <div className="text-[#166534]">
                    Sinkronisasi gudang real-time
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[#71717A] uppercase tracking-wider">
                    Rentang Harga Katalog
                  </div>
                  <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
                    ${catalogSummary.minPrice} – ${catalogSummary.maxPrice.toLocaleString('en-US')}
                  </div>
                  <div className="text-[#52525B]">
                    Gratis kurir berasuransi di atas $500
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[#71717A] uppercase tracking-wider">
                    Kepuasan Kolektor
                  </div>
                  <div className="text-2xl font-mono tabular-nums font-semibold text-[#18181B]">
                    {catalogSummary.avgRating} / 5.00 ★
                  </div>
                  <div className="text-[#52525B]">
                    Garansi struktural resmi 5 tahun
                  </div>
                </div>
              </div>
            </div>

            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4E0D8]">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
                  Katalog Lengkap &amp; Ringkasan Produk ({allProducts.length} Item)
                </h2>
                <p className="text-xs text-[#52525B] mt-0.5">
                  Klik pada foto atau tombol Ringkasan untuk membaca spesifikasi lengkap dan ulasan pembeli.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari cepat nama produk atau bahan..."
                  className="w-full pl-10 pr-8 py-2 text-xs bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

          
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {allProducts
                .filter((p) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    p.title.toLowerCase().includes(q) ||
                    p.sku.toLowerCase().includes(q) ||
                    p.material.toLowerCase().includes(q) ||
                    p.description.toLowerCase().includes(q) ||
                    p.subcategory.toLowerCase().includes(q)
                  );
                })
                .map((product) => renderProductCard(product, true))}
            </div>
          </div>
        )}

        {/* KOLEKSI */}
        {activeView === 'collection' && (
          <>
            {/* SECTION 1: STOREFRONT HERO */}
            <section className="border-b border-[#E4E0D8]">
              <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-between space-y-6 py-2">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#71717A]">
                        <span>Monograf Musim Gugur / Dingin</span>
                        <span aria-hidden="true">·</span>
                        <span>42 Objek Arsitektural</span>
                        <span aria-hidden="true">·</span>
                        <span>Kyoto &amp; Milan</span>
                      </div>

                      <h1
                        className="font-display font-semibold text-[#18181B] leading-[1.08] tracking-tight"
                        style={{
                          fontSize: 'clamp(2.25rem, 4vw, 3.75rem)',
                          textWrap: 'balance',
                        }}
                      >
                        Keabadian bentuk dan ketenangan untuk ruang hunian modern.
                      </h1>

                      <p className="text-base text-[#52525B] leading-relaxed max-w-xl">
                        Setiap karya dalam arsip Kanso &amp; Co. dibuat secara presisi dalam jumlah terbatas menggunakan kayu ek putih solid, batu travertine Romawi, baja bedah 316L, serta ekstrak botani murni.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <a
                        href="#catalog-grid"
                        className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors whitespace-nowrap shrink-0"
                      >
                        Jelajahi {allProducts.length} Koleksi
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const sora = allProducts[0];
                          if (sora) setSelectedProduct(sora);
                        }}
                        className="px-5 py-3.5 text-xs font-medium border border-[#18181B] text-[#18181B] hover:bg-[#18181B] hover:text-[#FAF8F5] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                      >
                        <span>Lihat Kursi Santai Utama</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6 relative min-h-[320px] lg:min-h-[440px] bg-[#EFECE6] overflow-hidden">
                    <img
                      src={HERO_IMAGE_PATH}
                      alt="Kursi Santai Kayu Ek Sora dan Lampu Lantai Aurelia di ruang tamu travertine"
                      referrerPolicy="no-referrer"
                      className="w-full h-full lg:h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/75 via-black/35 to-transparent text-[#FAF8F5] flex items-end justify-between">
                      <div className="text-xs">
                        <div className="font-mono uppercase tracking-wider text-[#FAF8F5]/80">
                          Karya Utama — KNS-FL-001
                        </div>
                        <div className="font-display text-xl font-medium">
                          Kursi Santai Kayu Ek Sora Sculptural
                        </div>
                      </div>
                      <div className="font-mono tabular-nums text-sm font-semibold">
                        $1,850.00
                      </div>
                    </div>
                  </div>
                </div>

              
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10 pt-8 border-t border-[#E4E0D8] text-xs">
                  <div>
                    <div className="font-semibold text-[#18181B] uppercase tracking-wider">
                      01. Keaslian Bernomor Seri
                    </div>
                    <p className="text-[#52525B] mt-1">
                      Setiap edisi studio dilengkapi sertifikat keaslian dari bengkel pengrajin.
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-[#18181B] uppercase tracking-wider">
                      02. Kurir White-Glove Gratis
                    </div>
                    <p className="text-[#52525B] mt-1">
                      Gratis pengiriman kurir berasuransi untuk setiap transaksi di atas $500.
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-[#18181B] uppercase tracking-wider">
                      03. Pelacakan Pesanan Langsung
                    </div>
                    <p className="text-[#52525B] mt-1">
                      Pantau 5 tahap pengiriman secara real-time di halaman Toko &amp; Lacak.
                    </p>
                  </div>
                  <div>
                    <div className="font-semibold text-[#18181B] uppercase tracking-wider">
                      04. Pembayaran Multi-Metode
                    </div>
                    <p className="text-[#52525B] mt-1">
                      Mendukung Kartu Kredit/Debit, Dompet Digital Instan, dan Bayar di Tempat (COD).
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SEARCH KATALOG*/}
            <section
              id="catalog-grid"
              className="max-w-7xl mx-auto px-6 py-12 space-y-8"
            >
              <div className="space-y-5 pb-6 border-b border-[#E4E0D8]">
             
                {collectionPreset.type !== 'none' && (
                  <div className="p-5 bg-white border border-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                        Filter Kurasi Koleksi Aktif
                      </div>
                      <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                        {collectionPreset.label}
                      </h2>
                      <p className="text-xs text-[#52525B]">
                        {collectionPreset.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCollectionPreset({
                          type: 'none',
                          id: 'all',
                          label: 'Semua Koleksi (42 Objek)',
                          description:
                            'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
                        })
                      }
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-[#18181B] text-[#18181B] hover:bg-[#18181B] hover:text-[#FAF8F5] transition-colors whitespace-nowrap self-start sm:self-center"
                    >
                      Tampilkan Semua Koleksi (42)
                    </button>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 p-1 bg-[#EFECE6] overflow-x-auto">
                    {[
                      { id: 'all', label: `Semua Koleksi (${allProducts.length})` },
                      {
                        id: 'Furniture & Lighting',
                        label: 'Furnitur & Pencahayaan',
                      },
                      { id: 'Audio & Horology', label: 'Audio & Horologi' },
                      {
                        id: 'Apothecary & Skincare',
                        label: 'Apotek & Perawatan Diri',
                      },
                      {
                        id: 'Ceramics & Tableware',
                        label: 'Keramik & Ruang Makan',
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(tab.id);
                          setCollectionPreset({
                            type: 'none',
                            id: 'all',
                            label: 'Semua Koleksi (42 Objek)',
                            description:
                              'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
                          });
                        }}
                        className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          selectedCategory === tab.id &&
                          collectionPreset.type === 'none'
                            ? 'bg-white text-[#18181B] shadow-xs'
                            : 'text-[#52525B] hover:text-[#18181B]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full lg:w-80">
                    <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari 42 produk berdasarkan nama, bahan, asal..."
                      className="w-full pl-10 pr-8 py-2 text-xs bg-white border border-[#D4CFC7] focus:outline-none focus:border-[#18181B]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B]"
                        aria-label="Hapus pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

           
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[#52525B]">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#18181B]" />
                      <span className="uppercase tracking-wider font-medium">
                        Filter:
                      </span>
                    </div>

                    <select
                      value={priceBracket}
                      onChange={(e) => setPriceBracket(e.target.value)}
                      aria-label="Filter rentang harga"
                      className="px-3 py-1.5 bg-white border border-[#D4CFC7] text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    >
                      <option value="all">Semua Harga</option>
                      <option value="under150">Di Bawah $150</option>
                      <option value="150to500">$150 – $500</option>
                      <option value="500to1500">$500 – $1,500</option>
                      <option value="over1500">Di Atas $1,500</option>
                    </select>

                    <select
                      value={minRating}
                      onChange={(e) => setMinRating(Number(e.target.value))}
                      aria-label="Filter rating pelanggan"
                      className="px-3 py-1.5 bg-white border border-[#D4CFC7] text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    >
                      <option value={0}>Semua Rating</option>
                      <option value={4.8}>4.8 ★ ke Atas</option>
                      <option value={4.9}>4.9 ★ ke Atas</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setInStockOnly((prev) => !prev)}
                      className={`px-3 py-1.5 border transition-colors whitespace-nowrap shrink-0 ${
                        inStockOnly
                          ? 'border-[#18181B] bg-[#18181B] text-[#FAF8F5]'
                          : 'border-[#D4CFC7] bg-white text-[#52525B] hover:border-[#18181B]'
                      }`}
                    >
                      Hanya yang Tersedia
                    </button>

                    {(selectedCategory !== 'all' ||
                      collectionPreset.type !== 'none' ||
                      priceBracket !== 'all' ||
                      minRating > 0 ||
                      inStockOnly ||
                      searchQuery.trim() !== '') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory('all');
                          setCollectionPreset({
                            type: 'none',
                            id: 'all',
                            label: 'Semua Koleksi (42 Objek)',
                            description:
                              'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
                          });
                          setPriceBracket('all');
                          setMinRating(0);
                          setInStockOnly(false);
                          setSearchQuery('');
                        }}
                        className="text-[#18181B] underline underline-offset-4 whitespace-nowrap shrink-0"
                      >
                        Atur Ulang Filter
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[#71717A] font-mono tabular-nums">
                      Menampilkan {filteredProducts.length} dari {allProducts.length}{' '}
                      produk
                    </span>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      aria-label="Urutkan produk"
                      className="px-3 py-1.5 bg-white border border-[#D4CFC7] text-[#18181B] focus:outline-none focus:border-[#18181B]"
                    >
                      <option value="featured">Urutan: Kurasi Utama</option>
                      <option value="popular">Urutan: Paling Banyak Terjual</option>
                      <option value="rating">Urutan: Rating Tertinggi</option>
                      <option value="price-asc">Urutan: Harga Terendah</option>
                      <option value="price-desc">Urutan: Harga Tertinggi</option>
                    </select>
                  </div>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center bg-white border border-[#E4E0D8] space-y-3">
                  <p className="font-display text-2xl text-[#18181B]">
                    Tidak ada produk yang sesuai dengan filter Anda
                  </p>
                  <p className="text-xs text-[#52525B]">
                    Coba hapus kata kunci pencarian atau pilih rentang harga yang lebih luas.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setCollectionPreset({
                        type: 'none',
                        id: 'all',
                        label: 'Semua Koleksi (42 Objek)',
                        description:
                          'Menampilkan seluruh arsip objek arsitektural Kanso & Co.',
                      });
                      setPriceBracket('all');
                      setMinRating(0);
                      setInStockOnly(false);
                      setSearchQuery('');
                    }}
                    className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5]"
                  >
                    Tampilkan Semua {allProducts.length} Produk
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((product) =>
                    renderProductCard(product, false)
                  )}
                </div>
              )}
            </section>

            {/* REVIEW */}
            <section className="border-t border-[#E4E0D8] bg-[#F4F1EA]">
              <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[#71717A] mb-2">
                      Evaluasi &amp; Ulasan Pembeli Terverifikasi
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B]">
                      Dipercaya oleh arsitek residensial &amp; studio suara
                    </h2>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-[#52525B]">
                    4.88 / 5.00 Rata-rata Penilaian dari {reviews.length} ulasan
                    terbit
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {reviews.slice(0, 3).map((rev) => {
                    const matchedProduct = allProducts.find(
                      (p) => p.id === rev.productId
                    );
                    return (
                      <div
                        key={rev.id}
                        className="bg-[#FAF8F5] border border-[#E4E0D8] p-6 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-[#71717A]">
                            <span className="font-mono text-[#18181B] font-semibold">
                              {'★'.repeat(rev.rating)}
                            </span>
                            <span className="font-mono tabular-nums">
                              {new Date(rev.createdAtMs).toLocaleDateString(
                                'id-ID',
                                {
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-[#18181B]">
                            “{rev.title}”
                          </h3>
                          <p className="text-xs text-[#52525B] leading-relaxed">
                            {rev.comment}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-[#E4E0D8] space-y-1 text-xs">
                          <div className="font-semibold text-[#18181B]">
                            {rev.authorName}
                          </div>
                          {matchedProduct && (
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(matchedProduct)}
                              className="text-[#71717A] hover:text-[#18181B] underline underline-offset-4 text-left"
                            >
                              Produk: {matchedProduct.title}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {/* SHOPPING FEATURE*/}
        {activeView === 'shop' && (
          <div className="space-y-6">
         
            <div className="bg-white border-b border-[#E4E0D8]">
              <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#71717A] mb-2">
                    Pusat Belanja &amp; Layanan Pelanggan Terpadu
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B]">
                    Toko, Tas Belanja &amp; Pelacak Pesanan Real-Time
                  </h1>
                  <p className="text-sm text-[#52525B] mt-1 max-w-2xl">
                    Kelola isi tas belanja Anda, lanjutkan ke pembayaran aman, pantau pengiriman pesanan langsung, dan simpan produk favorit Anda di satu tempat.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#EFECE6] self-start">
                  <button
                    type="button"
                    onClick={() => setShopSubTab('bag_and_tracker')}
                    className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      shopSubTab === 'bag_and_tracker'
                        ? 'bg-white text-[#18181B] shadow-xs'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    Tas Belanja ({totalBagCount}) &amp; Lacak Pesanan ({orders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShopSubTab('wishlist')}
                    className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      shopSubTab === 'wishlist'
                        ? 'bg-white text-[#18181B] shadow-xs'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    Daftar Favorit ({wishlistIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShopSubTab('shipping_warranty')}
                    className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      shopSubTab === 'shipping_warranty'
                        ? 'bg-white text-[#18181B] shadow-xs'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    Simulasi Ongkir &amp; Garansi
                  </button>
                </div>
              </div>
            </div>

            {shopSubTab === 'bag_and_tracker' && (
              <div className="space-y-4">
         
                <section className="max-w-7xl mx-auto px-6 pt-6">
                  <div className="bg-white border border-[#E4E0D8] p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E4E0D8]">
                      <div className="flex items-center gap-3">
                        <ShoppingBag className="w-5 h-5 text-[#18181B]" />
                        <div>
                          <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                            Ringkasan Tas Belanja Anda ({totalBagCount} Unit)
                          </h2>
                          <p className="text-xs text-[#52525B]">
                            {bagSubtotal >= 500
                              ? 'Pesanan Anda memenuhi syarat Pengiriman Kurir Berasuransi Gratis ($0.00).'
                              : `Tambah $${(500 - bagSubtotal).toFixed(
                                  2
                                )} lagi untuk mendapatkan pengiriman kurir gratis.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {cart.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="px-5 py-3 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5] hover:bg-[#27272A] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                          >
                            <span>Proses Checkout &amp; Bayar (${bagSubtotal.toLocaleString('en-US')})</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {cart.length === 0 ? (
                      <div className="py-8 text-center space-y-3">
                        <p className="text-sm text-[#52525B]">
                          Tas belanja Anda saat ini kosong. Tambahkan produk dari Beranda atau Kategori untuk mulai berbelanja.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveView('home')}
                          className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider bg-[#18181B] text-[#FAF8F5]"
                        >
                          Lihat Katalog Produk di Beranda
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cart.map((item) => (
                          <div
                            key={`${item.product.id}-${item.selectedFinish}`}
                            className="p-4 bg-[#FAF8F5] border border-[#E4E0D8] flex gap-4 items-center"
                          >
                            <div className="w-20 shrink-0">
                              <ProductImage
                                product={item.product}
                                aspectClass="aspect-square"
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <h3 className="text-sm font-semibold text-[#18181B] truncate">
                                {item.product.title}
                              </h3>
                              <div className="text-xs text-[#71717A]">
                                {item.selectedFinish} ·{' '}
                                <span className="font-mono">
                                  ${item.product.price}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center border border-[#D4CFC7] bg-white">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCartQuantity(
                                        item.product.id,
                                        item.selectedFinish,
                                        -1
                                      )
                                    }
                                    className="p-1 text-[#52525B] hover:text-[#18181B]"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="px-2.5 text-xs font-mono tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCartQuantity(
                                        item.product.id,
                                        item.selectedFinish,
                                        1
                                      )
                                    }
                                    className="p-1 text-[#52525B] hover:text-[#18181B]"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono tabular-nums font-semibold text-[#18181B]">
                                    $
                                    {(
                                      item.product.price * item.quantity
                                    ).toLocaleString('en-US')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveCartItem(
                                        item.product.id,
                                        item.selectedFinish
                                      )
                                    }
                                    className="text-[#71717A] hover:text-[#991B1B]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

            
                <OrderTrackingSection
                  orders={orders}
                  isAuthenticated={Boolean(currentUser)}
                  onRequestSignIn={handleSignIn}
                  onAdvanceOrderStatus={handleAdvanceOrderStatus}
                  onCancelOrder={handleCancelOrder}
                  highlightedOrderId={highlightedOrderId}
                />
              </div>
            )}

            {shopSubTab === 'wishlist' && (
              <section className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                <div className="flex items-center justify-between border-b border-[#E4E0D8] pb-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                      Daftar Produk Favorit Tersimpan ({wishlistIds.length})
                    </h2>
                    <p className="text-xs text-[#52525B]">
                      Simpan produk incaran Anda untuk ditambahkan ke tas belanja kapan saja.
                    </p>
                  </div>
                </div>

                {wishlistIds.length === 0 ? (
                  <div className="p-12 bg-white border border-[#E4E0D8] text-center space-y-3">
                    <Heart className="w-7 h-7 text-[#71717A] mx-auto" />
                    <p className="text-sm text-[#52525B]">
                      Belum ada produk di daftar favorit Anda. Klik ikon hati pada kartu produk untuk menyimpan.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {allProducts
                      .filter((p) => wishlistIds.includes(p.id))
                      .map((p) => renderProductCard(p, true))}
                  </div>
                )}
              </section>
            )}

            {shopSubTab === 'shipping_warranty' && (
              <section className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-white border border-[#E4E0D8] space-y-3">
                    <Truck className="w-6 h-6 text-[#18181B]" />
                    <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                      Standar Pengiriman Kurir White-Glove
                    </h3>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Setiap pembelian di atas $500 mendapatkan fasilitas pengiriman kurir berasuransi penuh tanpa biaya tambahan ($0.00). Untuk pesanan di bawah $500, berlaku tarif tetap $35 dengan kemasan peti kayu pelindung.
                    </p>
                  </div>

                  <div className="p-6 bg-white border border-[#E4E0D8] space-y-3">
                    <ShieldCheck className="w-6 h-6 text-[#18181B]" />
                    <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                      Garansi Struktural 5 Tahun &amp; Keaslian
                    </h3>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Seluruh furnitur kayu solid, lampu batu alam, dan perangkat audio Kanso &amp; Co. dilindungi garansi struktural 5 tahun serta sertifikat nomor seri yang tercatat di akun Anda.
                    </p>
                  </div>

                  <div className="p-6 bg-white border border-[#E4E0D8] space-y-3">
                    <ShoppingBag className="w-6 h-6 text-[#18181B]" />
                    <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                      Opsi Pembayaran Aman &amp; COD
                    </h3>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Kami menerima Kartu Kredit/Debit berenkripsi TLS 256-bit, Dompet Digital Instan, serta layanan Bayar di Tempat (Cash on Delivery) dengan verifikasi nomor telepon kurir.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* AKUN DAN ADMIN */}
        {(activeView === 'account' || activeView === 'admin') && (
          <div>
     
            <div className="bg-white border-b border-[#E4E0D8]">
              <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveView('account')}
                    className={`px-3.5 py-1.5 font-medium transition-colors ${
                      activeView === 'account'
                        ? 'bg-[#18181B] text-[#FAF8F5]'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    Profil &amp; Akun Pelanggan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('admin')}
                    className={`px-3.5 py-1.5 font-medium transition-colors ${
                      activeView === 'admin'
                        ? 'bg-[#18181B] text-[#FAF8F5]'
                        : 'text-[#52525B] hover:text-[#18181B]'
                    }`}
                  >
                    Dasbor Admin (Inventaris &amp; Analitik)
                  </button>
                </div>
              </div>
            </div>

            {activeView === 'account' ? (
              <AccountSection
                isAuthenticated={Boolean(currentUser)}
                isAdminUser={isAdminUser}
                userEmail={currentUser?.email || ''}
                publicProfile={publicProfile}
                privateProfile={privateProfile}
                orders={orders}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                onSaveProfile={handleSaveProfile}
                onNavigateOrders={() => {
                  setActiveView('shop');
                  setShopSubTab('bag_and_tracker');
                }}
              />
            ) : (
              <AdminDashboard
                products={allProducts}
                orders={orders}
                isAdminUser={isAdminUser}
                isAuthenticated={Boolean(currentUser)}
                userEmail={currentUser?.email || ''}
                onRequestSignIn={handleSignIn}
                onUpdateProductInventory={handleUpdateProductInventory}
                onCreateProduct={handleCreateProduct}
                onSyncAllCatalogToFirestore={handleSyncAllCatalogToFirestore}
                onAdminUpdateOrderStatus={handleAdminUpdateOrderStatus}
              />
            )}
          </div>
        )}
      </main>

      
      <footer className="border-t border-[#E4E0D8] bg-[#FAF8F5] px-6 py-10 text-xs text-[#71717A]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="font-display text-lg font-semibold text-[#18181B]">
              Kanso &amp; Co. — Objek Arsitektural &amp; Ruang Hidup
            </div>
            <p>
              42 Produk Kurasi · Kyoto · Milan · Kopenhagen · Jakarta
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hover:text-[#18181B] transition-colors"
            >
              Beranda Produk
            </button>
            <button
              type="button"
              onClick={() => setActiveView('collection')}
              className="hover:text-[#18181B] transition-colors"
            >
              Koleksi
            </button>
            <button
              type="button"
              onClick={() => setActiveView('shop')}
              className="hover:text-[#18181B] transition-colors"
            >
              Toko &amp; Lacak Pesanan
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-[#18181B] transition-colors"
            >
              Dasbor Admin
            </button>
          </div>
        </div>
      </footer>

   
      <ProductDetailModal
        product={selectedProduct}
        reviews={reviews}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onSubmitReview={handleSubmitReview}
        onMarkReviewHelpful={handleMarkReviewHelpful}
        isAuthenticated={Boolean(currentUser)}
        onRequestSignIn={handleSignIn}
      />

      {/* CUSTOM SHOPPING BAG & INTEGRATED PAYMENT GATEWAY DRAWER */}
      <CartCheckoutModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        isAuthenticated={Boolean(currentUser)}
        userDisplayName={
          publicProfile?.displayName || currentUser?.displayName || ''
        }
        userEmail={currentUser?.email || ''}
        privateProfile={privateProfile}
        onRequestSignIn={handleSignIn}
        onPlaceOrder={handlePlaceOrder}
      />
    </div>
  );
}
