'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Package, 
  Clock, 
  Layers, 
  Plus, 
  Edit3, 
  ShoppingCart, 
  Wallet,
  X,
  Printer,
  FileText,
  ChevronRight,
  MoreVertical,
  SlidersHorizontal,
  Bell,
  Search
} from 'lucide-react';

interface Ingredient {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
  cost_per_unit: number;
  min_stock_alert: number;
}

interface Sale {
  id: number;
  qty: number;
  total_price: number;
  created_at: string;
  products?: { name: string; selling_price?: number };
}

interface ProductHPP {
  id: number;
  name: string;
  selling_price: number;
  stock_qty: number;
}

export default function DipsumeDashboard() {
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'penjualan' | 'inventori' | 'produk'>('ringkasan');
  const [timeFilter, setTimeFilter] = useState<'hari' | 'bulan' | 'tahun'>('hari');
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<ProductHPP[]>([]);
  const [stats, setStats] = useState({ omzet: 0, porsi: 0, belanjaBahan: 0, kritisCount: 0 });

  // Modal State
  const [modalType, setModalType] = useState<'sale' | 'purchase' | 'edit_stock' | 'product' | 'invoice' | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [saleForm, setSaleForm] = useState({ product_id: '', qty: 1, total_price: '' });
  const [purchaseForm, setPurchaseForm] = useState({ ingredient_id: '', qty: '', total_cost: '' });
  const [stockEditForm, setStockEditForm] = useState({ id: 0, name: '', current_stock: '', unit: '' });
  const [productForm, setProductForm] = useState({ name: '', selling_price: '', stock_qty: 0 });

  const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1VOUJLiY_m5-0EwRgA4jh8filNXtP_dkcr9-PUlGJOdo";

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data: ingData } = await supabase.from('ingredients').select('*').order('name');
    const { data: salesData } = await supabase
      .from('sales')
      .select('id, qty, total_price, created_at, products(name, selling_price)')
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });
    const { data: prodData } = await supabase.from('products').select('*').order('name');
    const { data: purchaseData } = await supabase.from('purchases').select('total_cost');

    if (ingData) {
      setIngredients(ingData);
      const kritis = ingData.filter(i => Number(i.current_stock) <= Number(i.min_stock_alert || 0));
      setStats(prev => ({ ...prev, kritisCount: kritis.length }));
    }

    if (salesData) {
      setTodaySales(salesData as any);
      const totalOmzet = salesData.reduce((acc, curr) => acc + Number(curr.total_price), 0);
      const totalPorsi = salesData.reduce((acc, curr) => acc + Number(curr.qty), 0);
      setStats(prev => ({ ...prev, omzet: totalOmzet, porsi: totalPorsi }));
    }

    if (purchaseData) {
      const totalBelanja = purchaseData.reduce((acc, curr) => acc + Number(curr.total_cost || 0), 0);
      setStats(prev => ({ ...prev, belanjaBahan: totalBelanja }));
    }

    if (prodData) {
      setProducts(prodData);
      if (prodData.length > 0 && !saleForm.product_id) {
        setSaleForm(prev => ({
          ...prev,
          product_id: String(prodData[0].id),
          total_price: String(prodData[0].selling_price)
        }));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.from('sales').insert([{
      product_id: Number(saleForm.product_id),
      qty: Number(saleForm.qty),
      total_price: Number(saleForm.total_price)
    }]).select('id, qty, total_price, created_at, products(name, selling_price)').single();

    if (!error && data) {
      setModalType('invoice');
      setSelectedInvoice(data as any);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ing = ingredients.find(i => i.id === Number(purchaseForm.ingredient_id));
    if (ing) {
      const addedQty = Number(purchaseForm.qty);
      const newStock = Number(ing.current_stock) + addedQty;
      const newCost = Number(purchaseForm.total_cost) / addedQty;

      await supabase.from('ingredients').update({
        current_stock: newStock,
        cost_per_unit: newCost
      }).eq('id', ing.id);

      await supabase.from('purchases').insert([{
        ingredient_id: ing.id,
        qty: addedQty,
        total_cost: Number(purchaseForm.total_cost)
      }]);

      setModalType(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('ingredients').update({
      current_stock: Number(stockEditForm.current_stock)
    }).eq('id', stockEditForm.id);

    if (!error) {
      setModalType(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('products').insert([{
      name: productForm.name,
      selling_price: Number(productForm.selling_price),
      stock_qty: Number(productForm.stock_qty || 0)
    }]);

    if (!error) {
      setProductForm({ name: '', selling_price: '', stock_qty: 0 });
      setModalType(null);
      fetchData();
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2F6] via-[#F5F7FA] to-[#E9EFF5] text-slate-700 antialiased">
      {/* Top Navbar Gaya Kledo */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 h-16 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white font-black shadow-md shadow-indigo-500/20 text-base">
              🥟
            </div>
            <div>
              <div className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                Dipsume
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Kitchen ERP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">PT Dipsume Berhati Nyaman</p>
            </div>
          </div>

          {/* Tombol Cepat Jual, Beli, Biaya ala Kledo */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setModalType('sale')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-800 shadow-sm hover:text-indigo-600 transition"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-indigo-500" /> + Jual
            </button>
            <button
              onClick={() => {
                if (ingredients.length > 0) {
                  setPurchaseForm({ ingredient_id: String(ingredients[0].id), qty: '', total_cost: '' });
                }
                setModalType('purchase');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/70 hover:text-slate-900 transition"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-500" /> + Beli
            </button>
            <button
              onClick={() => setModalType('product')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white/70 hover:text-slate-900 transition"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" /> + Menu
            </button>
          </div>
        </div>

        {/* Action Header Kanan */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={SPREADSHEET_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Google Sheets
          </a>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            D
          </div>
        </div>
      </header>

      {/* Breadcrumb & Navigation Sub-bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-2 w-full">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer" onClick={() => setActiveTab('ringkasan')}>Beranda</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hover:text-slate-600 cursor-pointer capitalize">{activeTab}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-semibold">Overview</span>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pb-12 space-y-6 w-full">
        {/* Title Bar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Overview Penjualan & Operasional</h1>
            <p className="text-xs text-slate-500 mt-1">Laporan harian kas, porsi dimsum, dan persediaan dapur.</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Filter Toggle Bulan / Tahun ala Kledo */}
            <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-600">
              <button
                onClick={() => setTimeFilter('hari')}
                className={`px-3 py-1 rounded-lg transition ${timeFilter === 'hari' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-slate-900'}`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => setTimeFilter('bulan')}
                className={`px-3 py-1 rounded-lg transition ${timeFilter === 'bulan' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-slate-900'}`}
              >
                Bulan
              </button>
              <button
                onClick={() => setTimeFilter('tahun')}
                className={`px-3 py-1 rounded-lg transition ${timeFilter === 'tahun' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:text-slate-900'}`}
              >
                Tahun
              </button>
            </div>

            <button 
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
            </button>
          </div>
        </div>

        {/* 4 Cards Overview Ala Kledo */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Penjualan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-indigo-300 transition group">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase">
              <span>PENJUALAN</span>
              <MoreVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  Rp {stats.omzet.toLocaleString('id-ID')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{todaySales.length} Transaksi Selesai</div>
              </div>
              <div className="flex flex-col items-end">
                <span className="inline-flex items-center text-xs font-bold text-emerald-600 gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" /> +12%
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
              vs kemarin di jam yang sama
            </div>
          </div>

          {/* Card 2: Pembayaran Diterima / Porsi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-indigo-300 transition group">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase">
              <span>PORSI TERJUAL</span>
              <MoreVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {stats.porsi} <span className="text-sm font-normal text-slate-500">Porsi</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Dimsum siap saji</div>
              </div>
              <span className="inline-flex items-center text-xs font-bold text-emerald-600 gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> +4.0%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
              Target harian: 50 porsi
            </div>
          </div>

          {/* Card 3: Belanja Bahan / Biaya */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-indigo-300 transition group">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase">
              <span>BIAYA BELANJA</span>
              <MoreVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
            </div>
            <div className="my-3 flex items-baseline justify-between">
              <div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  Rp {stats.belanjaBahan.toLocaleString('id-ID')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Restok Pasar & Pabrik</div>
              </div>
              <span className="inline-flex items-center text-xs font-bold text-rose-600 gap-0.5 bg-rose-50 px-2 py-0.5 rounded-full">
                <TrendingDown className="w-3 h-3" /> Arus Keluar
              </span>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
              Tercatat dari bot / web
            </div>
          </div>

          {/* Card 4: Gauge / Rasio Kesehatan Stok ala Kledo */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-indigo-300 transition group">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 tracking-wider uppercase">
              <span>KESEHATAN STOK</span>
              <MoreVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" />
            </div>
            <div className="my-2 flex items-center justify-between">
              <div>
                <div className="text-lg font-black text-slate-800">
                  {stats.kritisCount === 0 ? 'Optimal (100%)' : `${stats.kritisCount} Perlu Restok`}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {stats.kritisCount > 0 ? 'Bahan baku kritis' : 'Semua bahan aman'}
                </div>
              </div>
              {/* Mini Speedometer Bar Simulation */}
              <div className="w-16 h-8 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 rounded-t-full relative flex items-end justify-center overflow-hidden">
                <div 
                  className="w-1.5 h-6 bg-slate-900 rounded-full origin-bottom transition-transform duration-500"
                  style={{ transform: `rotate(${stats.kritisCount > 0 ? '30deg' : '-45deg'})` }}
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
              Batas min. alert otomatis
            </div>
          </div>
        </section>

        {/* Tab Selection Filter Menu */}
        <div className="border-b border-slate-200 flex items-center gap-6 text-sm font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('ringkasan')}
            className={`pb-3 transition relative ${activeTab === 'ringkasan' ? 'text-indigo-600' : 'hover:text-slate-800'}`}
          >
            Semua Aktivitas
            {activeTab === 'ringkasan' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('penjualan')}
            className={`pb-3 transition relative ${activeTab === 'penjualan' ? 'text-indigo-600' : 'hover:text-slate-800'}`}
          >
            Tagihan & Penjualan
            {activeTab === 'penjualan' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('inventori')}
            className={`pb-3 transition relative ${activeTab === 'inventori' ? 'text-indigo-600' : 'hover:text-slate-800'}`}
          >
            Inventori & Bahan Pabrik
            {activeTab === 'inventori' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('produk')}
            className={`pb-3 transition relative ${activeTab === 'produk' ? 'text-indigo-600' : 'hover:text-slate-800'}`}
          >
            Katalog Menu
            {activeTab === 'produk' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
          </button>
        </div>

        {/* Content Section: Penjualan & Tagihan */}
        {(activeTab === 'ringkasan' || activeTab === 'penjualan') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Daftar Tagihan & Penjualan Masuk</h2>
                <p className="text-xs text-slate-400">Sinkron otomatis dengan rekapan Telegram bot</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalType('sale')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Transaksi Baru
                </button>
              </div>
            </div>

            {todaySales.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">Belum ada transaksi tercatat hari ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-400 border-b border-slate-100 uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-6 py-3.5">ID / Waktu</th>
                      <th className="px-6 py-3.5">Produk Menu</th>
                      <th className="px-6 py-3.5">Kuantitas</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Total Tagihan</th>
                      <th className="px-6 py-3.5 text-center">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {todaySales.map((s) => (
                      <tr key={s.id} className="hover:bg-indigo-50/20 transition">
                        <td className="px-6 py-3.5 text-slate-400 font-mono">
                          #{s.id} • {s.created_at.substring(11, 16)} WIB
                        </td>
                        <td className="px-6 py-3.5 text-slate-800 font-bold">
                          {s.products?.name || 'Dimsum Regular'}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-semibold">{s.qty} Porsi</td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Lunas
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-black text-slate-900 font-mono">
                          Rp {Number(s.total_price).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedInvoice(s);
                              setModalType('invoice');
                            }}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                            title="Buka Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Content Section: Inventori & Bahan Baku */}
        {(activeTab === 'ringkasan' || activeTab === 'inventori') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Inventori Bahan Baku & Pasokan Pabrik</h2>
                <p className="text-xs text-slate-400">Kontrol persediaan fisik (pack/butir) dan modal HPP</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (ingredients.length > 0) {
                      setPurchaseForm({ ingredient_id: String(ingredients[0].id), qty: '', total_cost: '' });
                    }
                    setModalType('purchase');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition"
                >
                  <Wallet className="w-3.5 h-3.5" /> + Belanja Bahan
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-400 border-b border-slate-100 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Nama Bahan</th>
                    <th className="px-6 py-3.5">Biaya Satuan</th>
                    <th className="px-6 py-3.5">Sisa Fisik</th>
                    <th className="px-6 py-3.5">Kondisi</th>
                    <th className="px-6 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ingredients.map((ing) => {
                    const isKritis = Number(ing.current_stock) <= Number(ing.min_stock_alert || 0);
                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-3.5 font-bold text-slate-800">{ing.name}</td>
                        <td className="px-6 py-3.5 text-slate-500 font-mono">
                          Rp {Math.round(Number(ing.cost_per_unit || 0)).toLocaleString('id-ID')} / {ing.unit}
                        </td>
                        <td className="px-6 py-3.5 font-black text-slate-900 font-mono text-sm">
                          {ing.current_stock} <span className="text-xs font-normal text-slate-400">{ing.unit}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          {isKritis ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Restok
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Aman
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setStockEditForm({
                                id: ing.id,
                                name: ing.name,
                                current_stock: String(ing.current_stock),
                                unit: ing.unit
                              });
                              setModalType('edit_stock');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Stok
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Section: Katalog Menu Siap Jual */}
        {(activeTab === 'ringkasan' || activeTab === 'produk') && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Katalog Varian Menu Dipsume</h2>
                <p className="text-xs text-slate-400">Harga jual dan ketersediaan porsi siap saji</p>
              </div>
              <button
                onClick={() => setModalType('product')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" /> + Tambah Varian
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 hover:shadow-md hover:border-indigo-200 transition flex flex-col justify-between">
                  <div>
                    <div className="font-black text-slate-900 text-sm">{p.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Stok siap jual: {p.stock_qty} porsi</div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Harga Jual</span>
                    <span className="font-black text-base text-indigo-600 font-mono">
                      Rp {Number(p.selling_price).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL INVOICE ELEGAN ALA KLEDO */}
      {modalType === 'invoice' && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button 
              onClick={() => setModalType(null)} 
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Invoice Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">🥟</span>
                  <span className="font-black text-slate-900 text-lg">Dipsume</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">PT Dipsume Berhati Nyaman</p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-widest font-black text-indigo-600">INVOICE</span>
                <div className="text-xs font-mono text-slate-400 mt-0.5">INV/#{selectedInvoice.id}</div>
                <div className="text-xs text-slate-400">{new Date(selectedInvoice.created_at).toLocaleDateString('id-ID')}</div>
              </div>
            </div>

            {/* Invoice Body */}
            <div className="py-6 space-y-4">
              <div className="text-xs text-slate-500 flex justify-between">
                <span>Tagihan Untuk:</span>
                <span className="font-bold text-slate-800">Pelanggan Dipsume</span>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-indigo-600 text-white font-bold">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Produk</th>
                      <th className="px-4 py-2.5 text-center">Jumlah</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">{selectedInvoice.products?.name || 'Dimsum Fresh'}</td>
                      <td className="px-4 py-3 text-center font-mono">{selectedInvoice.qty} porsi</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                        Rp {Number(selectedInvoice.total_price).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-slate-700 text-sm">Total Tagihan</span>
                <span className="text-xl font-black text-indigo-600 font-mono">
                  Rp {Number(selectedInvoice.total_price).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Invoice Footer Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                <Printer className="w-4 h-4" /> Cetak Struk
              </button>
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Form Jual */}
      {modalType === 'sale' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900 text-base">Catat Tagihan Penjualan</h3>
              <button onClick={() => setModalType(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSale} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pilih Menu Dimsum</label>
                <select 
                  value={saleForm.product_id}
                  onChange={(e) => {
                    const sel = products.find(p => p.id === Number(e.target.value));
                    setSaleForm({
                      ...saleForm,
                      product_id: e.target.value,
                      total_price: sel ? String(sel.selling_price * Number(saleForm.qty)) : ''
                    });
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                  required
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - Rp {Number(p.selling_price).toLocaleString('id-ID')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Porsi</label>
                <input 
                  type="number"
                  min="1"
                  value={saleForm.qty}
                  onChange={(e) => {
                    const q = Number(e.target.value);
                    const sel = products.find(p => p.id === Number(saleForm.product_id));
                    setSaleForm({
                      ...saleForm,
                      qty: q,
                      total_price: sel ? String(sel.selling_price * q) : saleForm.total_price
                    });
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Penerimaan (Rp)</label>
                <input 
                  type="number"
                  value={saleForm.total_price}
                  onChange={(e) => setSaleForm({ ...saleForm, total_price: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-black text-indigo-600"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-xl font-bold text-slate-500">Batal</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                  {submitting ? 'Menyimpan...' : 'Simpan & Buat Struk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup: Form Beli Bahan */}
      {modalType === 'purchase' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900 text-base">Catat Belanja Bahan Pasar / Pabrik</h3>
              <button onClick={() => setModalType(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Bahan Baku</label>
                <select 
                  value={purchaseForm.ingredient_id}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, ingredient_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                  required
                >
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (satuan: {i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Beli</label>
                <input 
                  type="number"
                  step="any"
                  placeholder="Misal: 5"
                  value={purchaseForm.qty}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, qty: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Total Biaya Belanja (Rp)</label>
                <input 
                  type="number"
                  placeholder="Misal: 325000"
                  value={purchaseForm.total_cost}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, total_cost: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-xl font-bold text-slate-500">Batal</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition">
                  {submitting ? 'Menyimpan...' : 'Perbarui Stok & Modal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup: Edit Stok */}
      {modalType === 'edit_stock' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900 text-base">Ubah Sisa Stok Fisik</h3>
              <button onClick={() => setModalType(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStock} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Item Bahan</label>
                <div className="font-black text-sm text-slate-800">{stockEditForm.name}</div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Stok Fisik Saat Ini ({stockEditForm.unit})</label>
                <input 
                  type="number"
                  step="any"
                  value={stockEditForm.current_stock}
                  onChange={(e) => setStockEditForm({ ...stockEditForm, current_stock: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-xl font-bold text-slate-500">Batal</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                  {submitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup: Tambah Menu */}
      {modalType === 'product' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900 text-base">Tambah Menu Baru</h3>
              <button onClick={() => setModalType(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Menu</label>
                <input 
                  type="text"
                  placeholder="Misal: Dimsum Mozzarella"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Harga Jual (Rp)</label>
                <input 
                  type="number"
                  placeholder="Misal: 20000"
                  value={productForm.selling_price}
                  onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Stok Porsi Awal</label>
                <input 
                  type="number"
                  value={productForm.stock_qty}
                  onChange={(e) => setProductForm({ ...productForm, stock_qty: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-xl font-bold text-slate-500">Batal</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
                  {submitting ? 'Menyimpan...' : 'Simpan Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}