import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { C } from '../../lib/theme';
import { fetchSales } from '../../lib/api';
import { useAppContext } from '../../lib/store';
import type { Sale, Floor } from '../../lib/types';

interface DebtInfo {
  tableId: string;
  tableName: string;
  amount: number;
  mostRecent: number;
  daysPending: number;
  originalSales: Sale[];
  customerName: string;
}

function computeDebts(sales: Sale[], floor: Floor | null): DebtInfo[] {
  const fiadoSales = sales
    .filter(s => s.isFiado && !s.isDebtPayment)
    .sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

  const paidTableIds = new Set(
    sales.filter(s => s.isDebtPayment).map(s => s.tableId)
  );

  const now = Date.now();
  const pendingByTable: Record<string, DebtInfo> = {};

  for (const s of fiadoSales) {
    if (paidTableIds.has(s.tableId)) continue;
    const existing = pendingByTable[s.tableId];
    if (existing) {
      existing.amount += s.totalWithTip || 0;
      existing.originalSales.push(s);
      if (s.closedAt > existing.mostRecent) existing.mostRecent = s.closedAt;
    } else {
      pendingByTable[s.tableId] = {
        tableId: s.tableId,
        tableName: s.tableName,
        amount: s.totalWithTip || 0,
        mostRecent: s.closedAt,
        daysPending: Math.floor((now - s.closedAt) / 86400000),
        originalSales: [s],
        customerName: '',
      };
    }
  }

  const floorTable = floor?.tables?.find(t => pendingByTable[t.id]);
  if (floorTable) {
    const debt = pendingByTable[floorTable.id];
    if (debt) {
      debt.customerName = '';
    }
  }

  return Object.values(pendingByTable).sort((a, b) => b.mostRecent - a.mostRecent);
}

export default function FiadosScreen() {
  const { floor } = useAppContext();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFiados = useCallback(async () => {
    try {
      const data = await fetchSales();
      setSales(data || []);
    } catch (e) {
      console.error('Error loading sales for fiados', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadFiados();
  }, [loadFiados]));

  const debts = computeDebts(sales, floor);
  const totalDebt = debts.reduce((s, d) => s + d.amount, 0);

  async function onRefresh() {
    setRefreshing(true);
    await loadFiados();
    setRefreshing(false);
  }

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
        <Text style={styles.title}>Fiados</Text>
        {debts.length > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>
              {totalDebt.toFixed(2)}€ · {debts.length} mesa{debts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brass} />}
      >
        {debts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay deudas pendientes</Text>
          </View>
        ) : (
          debts.map(d => (
            <View key={d.tableId} style={styles.debtCard}>
              <View style={styles.debtLeft}>
                <Text style={styles.debtTable}>{d.tableName}</Text>
                <Text style={styles.debtMeta}>
                  {d.originalSales.length} venta{d.originalSales.length !== 1 ? 's' : ''} fiada{d.originalSales.length !== 1 ? 's' : ''}
                  {d.originalSales.length > 0 && (
                    <> · {new Date(d.mostRecent).toLocaleDateString('es-ES')}</>
                  )}
                </Text>
                <Text style={[styles.debtDays, d.daysPending > 7 && { color: C.wine }]}>
                  {d.daysPending === 0 ? 'Hoy' : `${d.daysPending}d`}
                </Text>
              </View>
              <Text style={styles.debtAmount}>{d.amount.toFixed(2)}€</Text>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
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
  totalBadge: {
    backgroundColor: C.wine + '30',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  totalText: { color: C.wineLight, fontSize: 11, fontWeight: '600' },
  list: { flex: 1, padding: 12 },
  debtCard: {
    backgroundColor: C.surface, borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderLeftWidth: 3, borderLeftColor: C.wine,
  },
  debtLeft: { flex: 1, gap: 2 },
  debtTable: { fontSize: 15, fontWeight: '600', color: C.cream },
  debtMeta: { fontSize: 11, color: C.muted },
  debtDays: { fontSize: 11, color: C.muted },
  debtAmount: { fontSize: 16, fontWeight: '700', color: C.wineLight, marginLeft: 12 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: C.muted, fontSize: 14 },
});
