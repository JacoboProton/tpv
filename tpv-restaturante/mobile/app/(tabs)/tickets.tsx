import { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';
import { fetchSales } from '../../lib/api';
import type { Sale } from '../../lib/types';

const RANGES = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'all', label: 'Todo' },
];

function getCutoff(range: string): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === 'today') return d.getTime();
  if (range === 'week') { d.setDate(d.getDate() - 7); return d.getTime(); }
  if (range === 'month') { d.setMonth(d.getMonth() - 1); return d.getTime(); }
  return 0;
}

export default function TicketsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('week');
  const [filterMethod, setFilterMethod] = useState('all');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSales();
      setSales(data || []);
    } catch (e) {
      console.error('Error loading tickets', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadTickets();
  }, [loadTickets]));

  const cutoff = getCutoff(range);

  const filtered = sales.filter(s => {
    if (!s.closedAt) return false;
    const t = Number(s.closedAt) || new Date(s.closedAt).getTime();
    if (cutoff > 0 && t < cutoff) return false;
    if (filterMethod !== 'all') {
      const m = (s.paymentMethod || '').toLowerCase();
      if (m !== filterMethod) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, s) => sum + (s.total || 0), 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.brass} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tickets</Text>
        <Text style={styles.count}>{filtered.length} tickets — {totalAmount.toFixed(2)}€</Text>
      </View>

      <View style={styles.filterRow}>
        {RANGES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[styles.filterBtn, range === r.key && styles.filterBtnActive]}
            onPress={() => setRange(r.key)}
          >
            <Text style={[styles.filterText, range === r.key && styles.filterTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterRow}>
        {['all', 'efectivo', 'tarjeta', 'bizum', 'fiado'].map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.filterBtn, filterMethod === m && styles.filterBtnActive]}
            onPress={() => setFilterMethod(m)}
          >
            <Text style={[styles.filterText, filterMethod === m && styles.filterTextActive]}>
              {m === 'all' ? 'Todos' : m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={C.muted} />
            <Text style={styles.emptyText}>No hay tickets en este período</Text>
          </View>
        ) : (
          filtered.map(s => {
            const d = new Date(s.closedAt);
            const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
            const fecha = String(d.getDate()).padStart(2,'0') + ' ' + meses[d.getMonth()];
            const hora = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
            const items = (s.items || []).slice(0, 3);
            const extra = (s.items || []).length - 3;
            return (
              <View key={s.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketNum}>#{s.ticketNumber || '-'}</Text>
                  <Text style={styles.ticketTime}>
                    {fecha} · {hora}
                  </Text>
                  <Text style={styles.ticketTotal}>{Number(s.total ?? 0).toFixed(2)}€</Text>
                </View>
                <View style={styles.ticketBody}>
                  <Text style={styles.ticketTable}>{s.tableName || '—'}</Text>
                  <Text style={styles.ticketEmployee}>{s.employeeName || '—'}</Text>
                  <Text style={styles.ticketMethod}>{s.paymentMethod || '—'}</Text>
                </View>
                <View style={styles.ticketItems}>
                  {(items || []).filter(Boolean).map(i => {
                    const itemId = i?.id || Math.random();
                    return (
                      <Text key={String(itemId)} style={styles.ticketItem}>{String(i?.qty ?? '')}x {String(i?.name ?? '')}</Text>
                    );
                  })}
                  {extra > 0 && <Text style={styles.ticketMore}>+{extra} más</Text>}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.base },
  center: { flex: 1, backgroundColor: C.base, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.surface,
  },
  title: { fontSize: 18, fontWeight: '700', color: C.cream },
  count: { fontSize: 12, color: C.brass },
  filterRow: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.surface,
  },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14,
    backgroundColor: C.surface,
  },
  filterBtnActive: { backgroundColor: C.brass },
  filterText: { fontSize: 11, color: C.muted },
  filterTextActive: { color: C.base, fontWeight: '600' },
  list: { flex: 1, padding: 12 },
  ticketCard: {
    backgroundColor: C.surface, borderRadius: 10, padding: 12,
    marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.brass,
  },
  ticketHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  ticketTime: { fontSize: 12, fontFamily: 'monospace', color: C.cream },
  ticketNum: { fontSize: 11, fontFamily: 'monospace', color: C.muted, fontWeight: '600' },
  ticketTable: { fontSize: 14, fontWeight: '600', color: C.cream },
  ticketTotal: { fontSize: 14, fontWeight: '700', color: C.brassLight },
  ticketBody: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  ticketEmployee: { fontSize: 11, color: C.muted },
  ticketMethod: {
    fontSize: 10, color: C.base, backgroundColor: C.sage,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden',
  },
  ticketItems: { gap: 2 },
  ticketItem: { fontSize: 11, color: C.muted },
  ticketMore: { fontSize: 10, color: C.brass, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 14, marginTop: 8 },
});
