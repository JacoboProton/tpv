import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchFloor, saveFloor, fetchCatalog } from '../../lib/api';
import { globalFloor, setGlobalFloor, globalUser } from '../_layout';
import type { Floor, Table, Order, OrderItem, Product, Category } from '../../lib/types';

const C = {
  base: '#3d424f', surface: '#4d5363', surfaceLight: '#5f6578',
  brass: '#e0c06a', brassLight: '#f0d88a', cream: '#f5f0e8',
  muted: '#c0b8ac', wine: '#d08080', sage: '#9abaa0', line: '#7a8095',
};

const MODIFIERS_LIST = [
  'Sin cebolla', 'Sin gluten', 'Poco hecho', 'Bien hecho', 'Sin sal',
  'Sin lactosa', 'Extra queso', 'A la plancha', 'Frito', 'Sin ajo',
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function MesaScreen() {
  const { id: tableId } = useLocalSearchParams<{ id: string }>();
  const [floor, setFloor] = useState<Floor | null>(globalFloor);
  const [catalog, setCatalog] = useState<{ categories: Category[]; products: Product[] } | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showModifiers, setShowModifiers] = useState<Product | null>(null);
  const [modifierSelection, setModifierSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [f, cat] = await Promise.all([fetchFloor(), fetchCatalog()]);
      setFloor(f);
      setGlobalFloor(f);
      setCatalog(cat);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    }
  }

  const table = floor?.tables.find(t => t.id === tableId);
  const activeOrders = (table?.orderIds?.map(oid => floor?.orders?.[oid]).filter(Boolean) as Order[]) || [];
  const allItems = activeOrders.flatMap(o => o.items);

  const categories = useMemo(() => {
    if (!catalog) return [];
    const cats = catalog.categories.filter(c => c.active);
    return [{ id: 'all', name: 'Todos' }, ...cats];
  }, [catalog]);

  const products = useMemo(() => {
    if (!catalog) return [];
    let prods = catalog.products.filter(p => p.show_tpv !== false && !p.agotado);
    if (activeCategory !== 'Todos') {
      prods = prods.filter(p => p.category === activeCategory);
    }
    return prods;
  }, [catalog, activeCategory]);

  function getItemCount(productId: string): number {
    return allItems.filter(i => i.productId === productId).reduce((sum, i) => sum + i.qty, 0);
  }

  async function addToOrder(product: Product) {
    if (!floor || !table) return;
    const f = JSON.parse(JSON.stringify(floor)) as Floor;
    const t = f.tables.find(t => t.id === tableId)!;

    let order: Order;
    if (t.orderIds && t.orderIds.length > 0) {
      order = f.orders[t.orderIds[0]];
    } else {
      const oid = generateId();
      order = {
        id: oid, tableId, items: [], createdAt: Date.now(),
        employeeName: globalUser?.name || 'Camarero',
      };
      f.orders[oid] = order;
      t.orderIds = [oid];
      t.orderId = oid;
      t.status = 'ocupado';
    }

    const existing = order.items.find(i => i.productId === product.id && (!i.modifiers || i.modifiers.length === 0));
    if (existing && !showModifiers) {
      existing.qty += 1;
    } else {
      order.items.push({
        id: generateId(), productId: product.id, name: product.name,
        price: product.price, qty: 1, course: product.course || '',
      });
    }

    setFloor(f);
    setGlobalFloor(f);
    await persistFloor(f);
  }

  async function updateItemQty(itemId: string, delta: number) {
    if (!floor) return;
    const f = JSON.parse(JSON.stringify(floor)) as Floor;

    for (const order of Object.values(f.orders)) {
      const item = order.items.find(i => i.id === itemId);
      if (item) {
        item.qty = Math.max(0, item.qty + delta);
        if (item.qty === 0) {
          order.items = order.items.filter(i => i.id !== itemId);
        }
        // Clean up empty orders
        for (const o of Object.values(f.orders)) {
          if (o.items.length === 0) {
            delete f.orders[o.id];
            f.tables.forEach(t => {
              t.orderIds = (t.orderIds || []).filter(oid => oid !== o.id);
              if (t.orderId === o.id) t.orderId = t.orderIds[0] || null;
            });
          }
        }
        // Update table status
        f.tables.forEach(t => {
          const hasItems = (t.orderIds || []).some(oid => f.orders[oid]?.items?.length > 0);
          t.status = hasItems ? 'ocupado' : 'libre';
          if (!t.orderId && t.orderIds?.length === 0) t.orderId = null;
        });
        break;
      }
    }

    setFloor(f);
    setGlobalFloor(f);
    await persistFloor(f);
  }

  async function sendToKDS(itemId: string) {
    if (!floor) return;
    const f = JSON.parse(JSON.stringify(floor)) as Floor;

    for (const order of Object.values(f.orders)) {
      const item = order.items.find(i => i.id === itemId);
      if (item) {
        item.sent = true;
        break;
      }
    }

    setFloor(f);
    setGlobalFloor(f);
    await persistFloor(f);
  }

  async function sendAllToKDS() {
    if (!floor) return;
    const f = JSON.parse(JSON.stringify(floor)) as Floor;

    for (const order of Object.values(f.orders)) {
      order.items.forEach(i => { if (!i.sent) i.sent = true; });
    }

    setFloor(f);
    setGlobalFloor(f);
    await persistFloor(f);
    Alert.alert('Enviado', 'Todos los productos han sido enviados a cocina');
  }

  async function persistFloor(f: Floor) {
    setSaving(true);
    try {
      await saveFloor(f);
    } catch (e) {
      console.error('Error saving floor', e);
    } finally {
      setSaving(false);
    }
  }

  function getTotal(): number {
    return allItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  if (!floor || !table) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.brass} />
      </View>
    );
  }

  const pendingItems = allItems.filter(i => !i.sent);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={C.cream} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.tableName}>{table.name}</Text>
          <Text style={styles.totalText}>Total: {getTotal().toFixed(2)}€</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={C.brass} />}
      </View>

      {/* Order items */}
      {allItems.length > 0 && (
        <View style={styles.orderSection}>
          <Text style={styles.sectionLabel}>Comanda actual</Text>
          <ScrollView style={styles.orderList} nestedScrollEnabled>
            {allItems.map(item => {
              const isSent = item.sent;
              const isReady = item.ready;
              return (
                <View key={item.id} style={styles.orderItem}>
                  <View style={styles.orderItemInfo}>
                    <View style={styles.orderItemRow}>
                      <TouchableOpacity onPress={() => updateItemQty(item.id, -1)} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={14} color={C.cream} />
                      </TouchableOpacity>
                      <Text style={styles.itemQty}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => updateItemQty(item.id, 1)} style={styles.qtyBtn}>
                        <Ionicons name="add" size={14} color={C.cream} />
                      </TouchableOpacity>
                      <Text style={styles.itemName}>{item.name}</Text>
                    </View>
                    <Text style={styles.itemPrice}>{(item.price * item.qty).toFixed(2)}€</Text>
                  </View>
                  <View style={styles.orderItemActions}>
                    {isSent ? (
                      <View style={[styles.statusBadge, isReady ? styles.readyBadge : styles.sentBadge]}>
                        <Text style={styles.statusText}>{isReady ? 'Listo' : 'En cocina'}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.sendBtn} onPress={() => sendToKDS(item.id)}>
                        <Text style={styles.sendBtnText}>Enviar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          {pendingItems.length > 0 && (
            <TouchableOpacity style={styles.sendAllBtn} onPress={sendAllToKDS}>
              <Ionicons name="send" size={16} color={C.base} />
              <Text style={styles.sendAllText}>Enviar todo a cocina</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category bar */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryBtn, activeCategory === cat.name && styles.categoryBtnActive]}
              onPress={() => setActiveCategory(cat.name)}
            >
              <Text style={[styles.categoryText, activeCategory === cat.name && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Product grid */}
      <ScrollView style={styles.productGrid}>
        <View style={styles.productRow}>
          {products.map(product => {
            const count = getItemCount(product.id);
            return (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => addToOrder(product)}
              >
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.price.toFixed(2)}€</Text>
                {count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>Cerrar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.payBtn, allItems.length === 0 && { opacity: 0.4 }]}
          onPress={() => {
            // Mark table as cuenta, same as web app does
            if (!floor) return;
            const f = JSON.parse(JSON.stringify(floor)) as Floor;
            const t = f.tables.find(t => t.id === tableId);
            if (t) t.status = 'cuenta';
            setFloor(f);
            setGlobalFloor(f);
            persistFloor(f);
            Alert.alert('Ok', 'Mesa marcada como pendiente de pago');
          }}
        >
          <Text style={styles.payBtnText}>Solicitar cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base },
  center: { flex: 1, backgroundColor: C.base, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  headerInfo: { flex: 1 },
  tableName: { fontSize: 18, fontWeight: '700', color: C.cream },
  totalText: { fontSize: 13, color: C.brass, marginTop: 2 },
  orderSection: { maxHeight: 220, borderBottomWidth: 1, borderBottomColor: C.line, padding: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  orderList: { maxHeight: 140 },
  orderItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.surfaceLight,
  },
  orderItemInfo: { flex: 1 },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  itemQty: { fontSize: 13, fontWeight: '700', color: C.cream, minWidth: 20, textAlign: 'center' },
  itemName: { fontSize: 13, color: C.cream, flex: 1 },
  itemPrice: { fontSize: 11, color: C.muted, marginTop: 2 },
  orderItemActions: { marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sentBadge: { backgroundColor: C.brass },
  readyBadge: { backgroundColor: C.sage },
  statusText: { fontSize: 10, color: C.base, fontWeight: '600' },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.brass, borderRadius: 6 },
  sendBtnText: { fontSize: 11, color: C.base, fontWeight: '600' },
  sendAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, backgroundColor: C.brass, borderRadius: 8, marginTop: 8,
  },
  sendAllText: { fontSize: 12, color: C.base, fontWeight: '700' },
  categoryBar: { paddingVertical: 8, paddingLeft: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: C.surface, marginRight: 8 },
  categoryBtnActive: { backgroundColor: C.brass },
  categoryText: { fontSize: 12, color: C.muted },
  categoryTextActive: { color: C.base, fontWeight: '600' },
  productGrid: { flex: 1, padding: 8 },
  productRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productCard: {
    backgroundColor: C.surface, borderRadius: 10, padding: 12,
    width: '47%', flexGrow: 1, minWidth: 140,
  },
  productName: { fontSize: 13, fontWeight: '600', color: C.cream, marginBottom: 4 },
  productPrice: { fontSize: 12, color: C.brass, fontWeight: '500' },
  countBadge: {
    position: 'absolute', top: 6, right: 6, backgroundColor: C.brass,
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  countText: { fontSize: 10, color: C.base, fontWeight: '700' },
  bottomBar: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface,
  },
  closeBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.surfaceLight, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: C.muted, fontWeight: '600' },
  payBtn: { flex: 2, paddingVertical: 12, backgroundColor: C.brass, borderRadius: 8, alignItems: 'center' },
  payBtnText: { color: C.base, fontWeight: '700' },
});
