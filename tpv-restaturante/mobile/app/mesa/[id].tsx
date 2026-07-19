import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, PermissionsAndroid, Platform, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchFloor, saveFloor, fetchCatalog, fetchModifiers, fetchSettings, createPaymentIntent, createTerminalPaymentIntent, fetchTerminalConfig, addSale } from '../../lib/api';
import { broadcastFloorUpdate } from '../../lib/realtime';
import { STRIPE_PK, STRIPE_SIMULATED } from '../../lib/config';
import { useAppContext } from '../../lib/store';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import type { Floor, Order, OrderItem, Product, Category, ModifierGroup, ModifierSelection, Sale } from '../../lib/types';
import { C } from '../../lib/theme';
import { classifyError } from '../../lib/errors';
import { buildTicketHtml } from '../../lib/ticket-template';
import { addItemToOrder, changeItemQuantity, sendItemToKDS, sendAllToKDS as sendAllToKDSOp, sendCourseToKDS as sendCourseToKDSOp, markItemServed } from '../../lib/floor-operations';
import { closeOrderOnTable } from '../../lib/close-order';
import ModifierSelector from '../../components/ModifierSelector';

function confirmPay(floor: Floor, tableId: string): Promise<boolean> {
  const items = Object.values(floor.orders)
    .filter(o => o.tableId === tableId)
    .flatMap(o => o.items as OrderItem[]);
  const unsent = items.filter(i => !i.sent);
  const pending = items.filter(i => i.sent && !i.ready && !i.served);
  const parts: string[] = [];
  if (unsent.length > 0) parts.push(`${unsent.length} sin enviar a cocina`);
  if (pending.length > 0) parts.push(`${pending.length} en preparación`);
  if (parts.length === 0) return Promise.resolve(true);
  return new Promise(resolve => {
    Alert.alert(
      '⚠️ Cobrar',
      `Hay ${parts.join(' y ')}. ¿Seguro que quieres cobrar?`,
      [
        { text: 'Esperar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Cobrar', style: 'destructive', onPress: () => resolve(true) },
      ],
    );
  });
}

function PaymentButton({ floor, tableId, persistFloor, disabled, userName }: {
  floor: Floor; tableId: string; persistFloor: (f: Floor) => Promise<void>; disabled: boolean; userName: string;
}) {
  const { setFloor: setCtxFloor } = useAppContext();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  async function pay() {
    if (!await confirmPay(floor, tableId)) return;
    setLoading(true);
    try {
      const t = floor.tables.find(t => t.id === tableId);
      const total = Object.values(floor.orders).reduce((s, o) =>
        s + o.items.reduce((s2, i) => s2 + i.price * i.qty, 0), 0);
      const { clientSecret } = await createPaymentIntent(total, tableId, t?.name || tableId, userName);
      const { error } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'La Comanda' });
      if (error) { Alert.alert('Error', error.message); return; }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') return;
        Alert.alert('Error', presentError.message);
        return;
      }
      const { floor: nextFloor, sale } = closeOrderOnTable(floor, tableId, userName, 'Tarjeta', [{ method: 'card', amount: total }]);
      await addSale(sale as any);
      setCtxFloor(nextFloor);
      await persistFloor(nextFloor);
      Alert.alert('✅ Pagado', `Total: ${total.toFixed(2)}€`);
      router.back();
    } catch (e: unknown) {
      const { title, message } = classifyError(e);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity style={[styles.cardBtn, disabled && { opacity: 0.4 }]} onPress={pay} disabled={disabled || loading}>
      <Ionicons name="card" size={18} color="#fff" />
      <Text style={styles.cardBtnText}>{loading ? 'Procesando...' : 'Pagar con tarjeta'}</Text>
    </TouchableOpacity>
  );
}

function NfcPaymentButton({ floor, tableId, persistFloor, disabled, userName }: {
  floor: Floor; tableId: string; persistFloor: (f: Floor) => Promise<void>; disabled: boolean; userName: string;
}) {
  const { setFloor: setCtxFloor } = useAppContext();
  const { initialize, isInitialized, easyConnect, disconnectReader, retrievePaymentIntent, collectPaymentMethod, processPaymentIntent, connectionStatus } = useStripeTerminal();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const isConnected = connectionStatus === 'connected';

  async function payWithNfc() {
    if (!await confirmPay(floor, tableId)) return;
    setLoading(true);
    try {
      setStep('Inicializando...');
      if (!isInitialized) {
        const { error: initErr } = await initialize();
        if (initErr) { Alert.alert('Error al inicializar', initErr.message); return; }
      }

      setStep('Solicitando permisos...');
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          { title: 'Permiso de localización', message: 'La app necesita acceso a la ubicación para usar NFC', buttonPositive: 'OK' },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permiso denegado', 'Activa la localización en Ajustes para usar NFC');
          return;
        }
      }

      setStep('Conectando NFC...');
      const { locationId } = await fetchTerminalConfig();
      setStep('Acerca el terminal al móvil...');
      const { reader, error: connectErr } = await easyConnect({
        discoveryMethod: 'tapToPay', simulated: STRIPE_SIMULATED, locationId, merchantDisplayName: 'La Comanda',
      });
      if (connectErr) {
        if (connectErr.code === 'TAP_TO_PAY_UNSUPPORTED_DEVICE') {
          Alert.alert('No disponible', 'NFC no disponible en este dispositivo. Usa "Pagar con tarjeta".');
        } else {
          Alert.alert('Error NFC', connectErr.message);
        }
        return;
      }

      const t = floor.tables.find(t => t.id === tableId);
      const total = Object.values(floor.orders).reduce((s, o) =>
        s + o.items.reduce((s2, i) => s2 + i.price * i.qty, 0), 0);
      const totalCents = Math.round(total * 100);

      setStep('Creando pago...');
      const { clientSecret } = await createTerminalPaymentIntent(totalCents, tableId, t?.name || tableId, userName);

      setStep('Acerca tarjeta/iPhone al móvil...');
      const { paymentIntent, error: retrieveErr } = await retrievePaymentIntent(clientSecret);
      if (retrieveErr) { Alert.alert('Error', retrieveErr.message); return; }

      const { error: collectErr } = await collectPaymentMethod({ paymentIntent });
      if (collectErr) {
        if (collectErr.code === 'canceled') return;
        Alert.alert('Error', collectErr.message); return;
      }

      setStep('Procesando...');
      const { error: processErr } = await processPaymentIntent({ paymentIntent });
      if (processErr) { Alert.alert('Error', processErr.message); return; }

      await disconnectReader();

      const { floor: nextFloor, sale } = closeOrderOnTable(floor, tableId, userName, 'Tarjeta (NFC)', [{ method: 'card', amount: total }]);
      await addSale(sale as any);
      setCtxFloor(nextFloor);
      await persistFloor(nextFloor);
      Alert.alert('✅ Pagado con NFC', `Total: ${total.toFixed(2)}€`);
      router.back();
    } catch (e: unknown) {
      const { title, message } = classifyError(e);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
      setStep('');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {isConnected && !loading && (
        <Text style={{ fontSize: 9, color: C.sage, textAlign: 'center', marginBottom: 2 }}>NFC conectado</Text>
      )}
      <TouchableOpacity
        style={[styles.nfcBtn, disabled && { opacity: 0.4 }, isConnected && !loading && { backgroundColor: C.brass }]}
        onPress={payWithNfc} disabled={disabled || loading}
      >
        <Ionicons name="phone-portrait" size={18} color="#fff" />
        <Text style={styles.nfcBtnText}>{loading ? step : 'NFC'}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MesaScreen() {
  const { id: tableId } = useLocalSearchParams<{ id: string }>();
  const { floor: ctxFloor, setFloor: setCtxFloor, user } = useAppContext();
  const [floor, setFloor] = useState<Floor | null>(ctxFloor);
  const [catalog, setCatalog] = useState<{ categories: Category[]; products: Product[] } | null>(null);
  const [modifierData, setModifierData] = useState<{ groups: ModifierGroup[]; productModifiers: Record<string, string[]> } | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [modifyProduct, setModifyProduct] = useState<{ product: Product; groups: ModifierGroup[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData() }, []);

  useEffect(() => {
    if (ctxFloor && ctxFloor !== floor) setFloor(ctxFloor);
  }, [ctxFloor]);

  function syncFloor(f: Floor) { setFloor(f); setCtxFloor(f); }

  async function loadData() {
    try {
      const [f, cat, mods] = await Promise.all([fetchFloor(), fetchCatalog(), fetchModifiers()]);
      syncFloor(f); setCatalog(cat); if (mods) setModifierData(mods);
    } catch (e: unknown) {
      const { title, message } = classifyError(e);
      Alert.alert(title, message || 'No se pudieron cargar los datos');
    }
  }

  const table = floor?.tables.find(t => t.id === tableId);
  const activeOrders = (table?.orderIds?.map(oid => floor?.orders?.[oid]).filter(Boolean) as Order[]) || [];
  const allItems = activeOrders.flatMap(o => o.items);

  const categories = useMemo(() => {
    if (!catalog) return [];
    return [{ id: 'all', name: 'Todos' }, ...catalog.categories.filter(c => c.active)];
  }, [catalog]);

  const products = useMemo(() => {
    if (!catalog) return [];
    let prods = catalog.products.filter(p => p.show_tpv !== false && !p.agotado);
    if (activeCategory !== 'Todos') prods = prods.filter(p => p.category === activeCategory);
    return prods;
  }, [catalog, activeCategory]);

  function getItemCount(productId: string): number {
    return allItems.filter(i => i.productId === productId).reduce((sum, i) => sum + i.qty, 0);
  }

  function getModifierGroupsForProduct(productId: string): ModifierGroup[] {
    if (!modifierData) return [];
    return modifierData.groups.filter(g => (modifierData.productModifiers[productId] || []).includes(g.id));
  }

  function addToOrder(product: Product) {
    if (!floor || !table) return;
    const groups = getModifierGroupsForProduct(product.id);
    if (groups.length > 0) { setModifyProduct({ product, groups }); return }
    const next = addItemToOrder(floor, tableId, product, [], 0, user?.name || 'Camarero');
    syncFloor(next); persistFloor(next);
  }

  function doAddItem(product: Product, modifiers: ModifierSelection[], extraPrice: number) {
    if (!floor || !table) return;
    const next = addItemToOrder(floor, tableId, product, modifiers, extraPrice, user?.name || 'Camarero');
    syncFloor(next); persistFloor(next);
  }

  async function updateItemQty(itemId: string, delta: number) {
    if (!floor) return;
    const next = changeItemQuantity(floor, itemId, delta);
    syncFloor(next); await persistFloor(next);
  }

  async function sendToKDS(itemId: string) {
    if (!floor) return;
    const next = sendItemToKDS(floor, itemId);
    syncFloor(next); await persistFloor(next);
  }

  async function sendAllToKDS(ubicacionFilter?: string) {
    if (!floor) return;
    const { floor: next, count } = sendAllToKDSOp(floor, ubicacionFilter);
    syncFloor(next); await persistFloor(next);
    const label = ubicacionFilter === 'Bar' ? 'barra' : ubicacionFilter === 'Cocina' ? 'cocina' : 'cocina/barra';
    Alert.alert('Enviado', `${count} producto(s) enviado(s) a ${label}`);
  }

  async function sendCourseToKDS(course: string) {
    if (!floor) return;
    const { floor: next, count } = sendCourseToKDSOp(floor, course);
    syncFloor(next); await persistFloor(next);
    if (count) Alert.alert('Enviado', `${course} enviado (${count} producto(s))`);
  }

  async function serveItem(itemId: string) {
    if (!floor) return;
    const next = markItemServed(floor, itemId, user?.name || 'Camarero');
    syncFloor(next); await persistFloor(next);
  }

  async function printTicket() {
    if (!floor || !table || !catalog) return;
    const items = Object.values(floor.orders).filter(o => o.tableId === tableId).flatMap(o => o.items);
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const date = new Date();
    const dateStr = `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
    let settings: Record<string, string> = {};
    try { settings = await fetchSettings(); } catch {}

    const html = buildTicketHtml({
      restaurantName: settings.restaurantName, companyCif: settings.companyCif,
      companyAddress: settings.companyAddress, companyPhone: settings.companyPhone,
      logoUrl: settings.logoUrl, footerText: settings.footerText,
      ticketWidth: settings.ticketWidth || '80mm', tableName: table.name,
      employeeName: user?.name, date: dateStr, items, catalogProducts: catalog.products,
      subtotal: total, discountAmount: 0, tip: 0, total, totalWithTip: total,
    });

    try { const Print = require('expo-print'); await Print.printAsync({ html }); return } catch {}
    try {
      let text = `${table.name} · ${dateStr}\n${'─'.repeat(32)}\n`;
      for (const i of items) text += `${i.qty}x ${i.name}\n   ${(i.price * i.qty).toFixed(2)}€\n`;
      text += `${'─'.repeat(32)}\nTOTAL: ${total.toFixed(2)}€`;
      await Share.share({ message: text, title: `Ticket ${table.name}` });
    } catch {}
  }

  async function persistFloor(f: Floor) {
    setSaving(true);
    try { await saveFloor(f); broadcastFloorUpdate(f) }
    catch (e) { console.error('Error saving floor', e) }
    finally { setSaving(false) }
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

      {allItems.length > 0 && (
        <View style={styles.orderSection}>
          <Text style={styles.sectionLabel}>Comanda actual</Text>
          <ScrollView style={styles.orderList} nestedScrollEnabled>
            {allItems.map(item => {
              const isSent = item.sent; const isReady = item.ready; const isDelivered = item.delivered || item.served;
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
                    {item.modifiers && item.modifiers.length > 0 && (
                      <Text style={styles.itemMods}>{item.modifiers.map(m => m.optionName).join(', ')}</Text>
                    )}
                    <Text style={styles.itemPrice}>{(item.price * item.qty).toFixed(2)}€</Text>
                  </View>
                  <View style={styles.orderItemActions}>
                    {isDelivered ? (
                      <View style={[styles.statusBadge, styles.deliveredBadge]}>
                        <Text style={styles.statusText}>✓ Servido</Text>
                      </View>
                    ) : isReady ? (
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.statusBadge, styles.readyBadge]}>
                          <Text style={styles.statusText}>✅ Listo</Text>
                        </View>
                        <TouchableOpacity style={styles.serveBtn} onPress={() => serveItem(item.id)}>
                          <Text style={styles.serveBtnText}>Servir</Text>
                        </TouchableOpacity>
                      </View>
                    ) : isSent ? (
                      <View style={[styles.statusBadge, styles.sentBadge]}>
                        <Text style={styles.statusText}>{item.ubicacion === 'Bar' ? 'En barra' : 'En cocina'}</Text>
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
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {pendingItems.some(i => i.ubicacion === 'Cocina') && (
                  <TouchableOpacity style={[styles.sendAllBtn, { flex: 1 }]} onPress={() => sendAllToKDS('Cocina')}>
                    <Ionicons name="send" size={16} color={C.base} /><Text style={styles.sendAllText}>Cocina</Text>
                  </TouchableOpacity>
                )}
                {pendingItems.some(i => i.ubicacion === 'Bar') && (
                  <TouchableOpacity style={[styles.sendAllBtn, { flex: 1 }]} onPress={() => sendAllToKDS('Bar')}>
                    <Ionicons name="send" size={16} color={C.base} /><Text style={styles.sendAllText}>Barra</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(() => {
                const courses = [...new Set(pendingItems.map(i => i.course).filter(Boolean))] as string[];
                return (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <TouchableOpacity style={[styles.sendAllBtn, { flex: 1, minWidth: 80 }]} onPress={() => sendAllToKDS()}>
                      <Ionicons name="send" size={14} color={C.base} /><Text style={styles.sendAllText}>Todo</Text>
                    </TouchableOpacity>
                    {courses.map(course => {
                      const count = pendingItems.filter(i => i.course === course).length;
                      const colors: Record<string, string> = { Entrantes: '#7a9a7c', Principales: '#c4a04a', Postres: '#b05e5e' };
                      return (
                        <TouchableOpacity key={course}
                          style={[styles.sendAllBtn, { flex: 1, backgroundColor: colors[course] || C.brass }]}
                          onPress={() => sendCourseToKDS(course)}>
                          <Text style={styles.sendAllText}>{course} ({count})</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}
            </>
          )}
        </View>
      )}

      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryBtn, activeCategory === cat.name && styles.categoryBtnActive]}
              onPress={() => setActiveCategory(cat.name)}
            >
              <Text style={[styles.categoryText, activeCategory === cat.name && styles.categoryTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.productGrid}>
        <View style={styles.productRow}>
          {products.map(product => {
            const count = getItemCount(product.id);
            return (
              <TouchableOpacity key={product.id} style={styles.productCard} onPress={() => addToOrder(product)}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.price.toFixed(2)}€</Text>
                {count > 0 && (
                  <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>Cerrar</Text>
        </TouchableOpacity>
        {floor && allItems.length > 0 && (
          <>
            <StripeProvider publishableKey={STRIPE_PK}>
              <PaymentButton floor={floor} tableId={tableId} persistFloor={persistFloor} disabled={saving} userName={user?.name || 'Camarero'} />
            </StripeProvider>
            <NfcPaymentButton floor={floor} tableId={tableId} persistFloor={persistFloor} disabled={saving} userName={user?.name || 'Camarero'} />
            <TouchableOpacity onPress={printTicket} style={styles.printBtn}>
              <Ionicons name="print" size={16} color={C.cream} />
              <Text style={{ fontSize: 10, color: C.cream }}>Imprimir</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.payBtn, allItems.length === 0 && { opacity: 0.4 }]}
          onPress={async () => {
            if (!floor) return;
            if (!await confirmPay(floor, tableId)) return;
            const { floor: nextFloor, sale } = closeOrderOnTable(floor, tableId, user?.name || 'Camarero', 'Efectivo', [{ method: 'efectivo', amount: getTotal() }]);
            await addSale(sale as any); setCtxFloor(nextFloor); await persistFloor(nextFloor);
            Alert.alert('✅ Pagado', `Total: ${getTotal().toFixed(2)}€`); router.back();
          }}
        >
          <Text style={styles.payBtnText}>Efectivo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fiadoBtn, allItems.length === 0 && { opacity: 0.4 }]}
          onPress={async () => {
            if (!floor) return;
            if (!await confirmPay(floor, tableId)) return;
            const { floor: nextFloor, sale } = closeOrderOnTable(floor, tableId, user?.name || 'Camarero', 'Fiado', [{ method: 'fiado', amount: getTotal() }]);
            await addSale(sale as any); setCtxFloor(nextFloor); await persistFloor(nextFloor);
            Alert.alert('✅ Fiado registrado', `Total: ${getTotal().toFixed(2)}€ — pendiente de cobro`); router.back();
          }}
        >
          <Ionicons name="cash" size={16} color={C.base} />
          <Text style={styles.fiadoBtnText}>Fiado</Text>
        </TouchableOpacity>
      </View>

      <ModifierSelector
        visible={modifyProduct !== null}
        groups={modifyProduct?.groups || []}
        onConfirm={(mods) => {
          if (!modifyProduct) return;
          const p = modifyProduct.product;
          const extra = mods.reduce((s, m) => s + m.priceDelta, 0);
          doAddItem(p, mods, extra);
          setModifyProduct(null);
        }}
        onCancel={() => setModifyProduct(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base },
  center: { flex: 1, backgroundColor: C.base, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line },
  headerInfo: { flex: 1 },
  tableName: { fontSize: 18, fontWeight: '700', color: C.cream },
  totalText: { fontSize: 13, color: C.brass, marginTop: 2 },
  orderSection: { maxHeight: 220, borderBottomWidth: 1, borderBottomColor: C.line, padding: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: C.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  orderList: { maxHeight: 140 },
  orderItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.surfaceLight },
  orderItemInfo: { flex: 1 },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  itemQty: { fontSize: 13, fontWeight: '700', color: C.cream, minWidth: 20, textAlign: 'center' },
  itemName: { fontSize: 13, color: C.cream, flex: 1 },
  itemPrice: { fontSize: 11, color: C.muted, marginTop: 2 },
  itemMods: { fontSize: 10, color: C.muted, marginTop: 1, paddingLeft: 56 },
  orderItemActions: { marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sentBadge: { backgroundColor: C.brass },
  readyBadge: { backgroundColor: C.sage },
  deliveredBadge: { backgroundColor: C.surfaceLight },
  statusText: { fontSize: 10, color: C.base, fontWeight: '600' },
  serveBtn: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: C.sage, borderRadius: 6 },
  serveBtnText: { fontSize: 10, color: C.base, fontWeight: '700' },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.brass, borderRadius: 6 },
  sendBtnText: { fontSize: 11, color: C.base, fontWeight: '600' },
  sendAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: C.brass, borderRadius: 8, marginTop: 8 },
  sendAllText: { fontSize: 12, color: C.base, fontWeight: '700' },
  categoryBar: { paddingVertical: 8, paddingLeft: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  categoryBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: C.surface, marginRight: 8 },
  categoryBtnActive: { backgroundColor: C.brass },
  categoryText: { fontSize: 12, color: C.muted },
  categoryTextActive: { color: C.base, fontWeight: '600' },
  productGrid: { flex: 1, padding: 8 },
  productRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productCard: { backgroundColor: C.surface, borderRadius: 10, padding: 12, width: '47%', flexGrow: 1, minWidth: 140 },
  productName: { fontSize: 13, fontWeight: '600', color: C.cream, marginBottom: 4 },
  productPrice: { fontSize: 12, color: C.brass, fontWeight: '500' },
  countBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: C.brass, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 10, color: C.base, fontWeight: '700' },
  bottomBar: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.surface },
  closeBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.surfaceLight, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: C.muted, fontWeight: '600' },
  payBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.brass, borderRadius: 8, alignItems: 'center' },
  payBtnText: { color: C.base, fontWeight: '700' },
  cardBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#635bff', borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  cardBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  nfcBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.sage, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  nfcBtnText: { color: C.base, fontWeight: '700', fontSize: 13 },
  printBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.surfaceLight, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  fiadoBtn: { flex: 1, paddingVertical: 12, backgroundColor: C.wine, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  fiadoBtnText: { color: C.base, fontWeight: '700', fontSize: 13 },
});
