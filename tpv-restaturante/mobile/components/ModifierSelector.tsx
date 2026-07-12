import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import type { ModifierGroup, ModifierSelection } from '../lib/types';
import { C } from '../lib/theme';

interface Props {
  visible: boolean;
  groups: ModifierGroup[];
  initial?: ModifierSelection[];
  onConfirm: (mods: ModifierSelection[]) => void;
  onCancel: () => void;
}

function defaultSelections(groups: ModifierGroup[]): ModifierSelection[] {
  const s: ModifierSelection[] = [];
  for (const g of groups) {
    const def = g.options.find(o => o.is_default);
    if (def) {
      s.push({ groupId: g.id, groupName: g.name, optionId: def.id, optionName: def.name, priceDelta: def.price_delta });
    }
  }
  return s;
}

export default function ModifierSelector({ visible, groups, initial, onConfirm, onCancel }: Props) {
  const [sel, setSel] = useState<ModifierSelection[]>(initial && initial.length > 0 ? initial : defaultSelections(groups));

  function toggleOption(g: ModifierGroup, opt: typeof g.options[0]) {
    if (g.type === 'single') {
      setSel(prev => {
        const without = prev.filter(m => m.groupId !== g.id);
        return [...without, { groupId: g.id, groupName: g.name, optionId: opt.id, optionName: opt.name, priceDelta: opt.price_delta }];
      });
    } else {
      setSel(prev => {
        const exists = prev.find(m => m.optionId === opt.id);
        if (exists) return prev.filter(m => m.optionId !== opt.id);
        return [...prev, { groupId: g.id, groupName: g.name, optionId: opt.id, optionName: opt.name, priceDelta: opt.price_delta }];
      });
    }
  }

  function isSelected(g: ModifierGroup, optId: string) {
    if (g.type === 'single') return sel.find(m => m.groupId === g.id)?.optionId === optId;
    return !!sel.find(m => m.optionId === optId);
  }

  function canConfirm() {
    return groups.every(g => !g.required || sel.some(m => m.groupId === g.id));
  }

  const extraTotal = sel.reduce((s, m) => s + m.priceDelta, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Personalizar</Text>
          <ScrollView style={styles.scroll}>
            {groups.map(g => (
              <View key={g.id} style={styles.group}>
                <Text style={styles.groupName}>
                  {g.name}{g.required ? ' *' : ''}
                </Text>
                {g.options.map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.option, isSelected(g, o.id) && styles.optionSelected]}
                    onPress={() => toggleOption(g, o)}
                  >
                    <View style={[styles.radio, isSelected(g, o.id) && styles.radioSelected]}>
                      {isSelected(g, o.id) && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.optionName, isSelected(g, o.id) && styles.optionNameSelected]}>
                      {o.name}
                    </Text>
                    {o.price_delta > 0 && (
                      <Text style={styles.priceDelta}>+{o.price_delta.toFixed(2)}€</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
          {extraTotal > 0 && (
            <Text style={styles.extra}>Extras: +{extraTotal.toFixed(2)}€</Text>
          )}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !canConfirm() && { opacity: 0.4 }]}
              onPress={() => canConfirm() && onConfirm(sel)}
              disabled={!canConfirm()}
            >
              <Text style={styles.confirmText}>Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  card: { backgroundColor: C.base, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: C.cream, marginBottom: 16, textAlign: 'center' },
  scroll: { maxHeight: 400 },
  group: { marginBottom: 20 },
  groupName: { fontSize: 14, fontWeight: '600', color: C.brass, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 4 },
  optionSelected: { backgroundColor: C.surfaceLight },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioSelected: { borderColor: C.brass },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.brass },
  optionName: { fontSize: 15, color: C.cream, flex: 1 },
  optionNameSelected: { fontWeight: '600' },
  priceDelta: { fontSize: 13, color: C.sage },
  extra: { textAlign: 'center', fontSize: 14, color: C.brass, fontWeight: '600', marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: C.surface, alignItems: 'center' },
  cancelText: { color: C.muted, fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: C.brass, alignItems: 'center' },
  confirmText: { color: C.base, fontSize: 15, fontWeight: '700' },
});
