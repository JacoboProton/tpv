import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { fetchGestoriaOperations } from '../lib/api';

export default function OperationsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchGestoriaOperations();
        setData(result);
      } catch (e) {
        setError(e.message || 'Error fetching operations');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Cargando operaciones...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  // Expected shape: { entregas_intra: [], adquisiciones_intra: [], total_operaciones: number }
  const items = data?.adquisiciones_intra || [];

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.title}>NIF: {item.nif}</Text>
      <Text>Nombre: {item.name}</Text>
      <Text>Base: {item.base.toFixed(2)} €</Text>
      <Text>Operación: {item.operacion}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Operaciones (modelo 347/349)</Text>
      <FlatList
        data={items}
        keyExtractor={(item, index) => item.nif + '-' + index}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No hay operaciones.</Text>}
      />
      <View style={styles.totalBox}>
        <Text style={styles.total}>Total operaciones: {data?.total_operaciones?.toFixed(2) ?? 0} €</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  item: { padding: 12, marginVertical: 6, backgroundColor: '#fff', borderRadius: 8, elevation: 2 },
  title: { fontWeight: '600', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 20, color: '#777' },
  totalBox: { padding: 12, marginTop: 10, backgroundColor: '#e0e0e0', borderRadius: 8 },
  total: { fontSize: 18, fontWeight: '600' },
  error: { color: 'red' },
});
