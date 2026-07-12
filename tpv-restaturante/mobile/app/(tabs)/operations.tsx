import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { C } from '../../lib/theme';
import { classifyError } from '../../lib/errors';
import {
  fetchGestoriaOperations, fetchGestoriaSettings, saveGestoriaSettings,
  fetchGestoriaDocuments, saveGestoriaDocument, deleteGestoriaDocument,
  confirmGestoriaDocument, fetchGestoriaPayrolls, saveGestoriaPayroll,
  deleteGestoriaPayroll, fetchGestoriaTaxModels, calculateGestoriaTaxModel,
  fetchGestoriaAuthorization, saveGestoriaAuthorization,
} from '../../lib/api';
import type {
  GestoriaOperationsResponse, GestoriaOperationEntry,
  GestoriaDocument, GestoriaPayroll, GestoriaTaxModel,
  GestoriaAuthorization,
} from '../../lib/types';

function fmt(n: number): string {
  return n.toFixed(2) + ' €';
}

const QUARTERS = [
  { q: 1, label: '1T', months: 'Ene–Mar' },
  { q: 2, label: '2T', months: 'Abr–Jun' },
  { q: 3, label: '3T', months: 'Jul–Sep' },
  { q: 4, label: '4T', months: 'Oct–Dic' },
];

const ZONE_LABELS: Record<string, string> = { spain: 'España', eu: 'UE', outside_eu: 'Fuera de la UE' };
const TYPE_LABELS: Record<string, string> = { good: 'Bien', service: 'Servicio' };

type TabId = 'modelos' | 'gastos' | 'ingresos' | 'nominas' | 'regimen' | 'autorizacion' | 'operaciones';

export default function OperationsRoute() {
  const [tab, setTab] = useState<TabId>('modelos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState({ taxRegime: 'autonomo', criterionOfCash: 'false', socialSecurityRed: '' });
  const [expenses, setExpenses] = useState<GestoriaDocument[]>([]);
  const [incomes, setIncomes] = useState<GestoriaDocument[]>([]);
  const [payrolls, setPayrolls] = useState<GestoriaPayroll[]>([]);
  const [taxModels, setTaxModels] = useState<GestoriaTaxModel[]>([]);
  const [authorization, setAuthorization] = useState<GestoriaAuthorization | null>(null);
  const [operationsData, setOperationsData] = useState<GestoriaOperationsResponse | null>(null);
  const [calculating, setCalculating] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [s, tx] = await Promise.all([
        fetchGestoriaSettings(),
        fetchGestoriaTaxModels(),
      ]);
      setSettings({ taxRegime: 'autonomo', criterionOfCash: 'false', socialSecurityRed: '', ...s });
      setTaxModels(tx || []);
      const [ex, inc, pr, auth] = await Promise.all([
        fetchGestoriaDocuments('expense'),
        fetchGestoriaDocuments('income'),
        fetchGestoriaPayrolls(),
        fetchGestoriaAuthorization(),
      ]);
      setExpenses(ex || []);
      setIncomes(inc || []);
      setPayrolls(pr || []);
      setAuthorization(auth || null);
    } catch (e: unknown) {
      const { title, message } = classifyError(e);
      setError(`${title}: ${message}`);
    }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, []);

  async function handleUpdateSettings(key: string, value: string) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveGestoriaSettings({ [key]: value });
  }

  async function handleCalculate(code: string, year: number, quarter: number) {
    const key = `${code}-${year}-${quarter}`;
    setCalculating(key);
    try {
      const { data } = await calculateGestoriaTaxModel(code, year, quarter);
      setTaxModels(prev => {
        const idx = prev.findIndex(t => t.model_code === code && t.year === year && t.quarter === quarter);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], data, status: 'draft' } as GestoriaTaxModel;
          return next;
        }
        return [...prev, { id: '', model_code: code, year, quarter, status: 'draft', data, created_at: '', updated_at: '' }];
      });
    } catch (e: unknown) {
      const { message } = classifyError(e);
      Alert.alert('Error', message);
    }
    setCalculating(null);
  }

  function getModelStatus(code: string, year: number, quarter: number): GestoriaTaxModel | null {
    return taxModels.find(t => t.model_code === code && t.year === year && t.quarter === quarter) || null;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.brass} />
        <Text style={styles.loadingText}>Cargando gestoría...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadAll}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Gestoría</Text>
      <Text style={styles.subheader}>
        Tus ventas, gastos y nóminas convertidos en borradores de impuestos.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {([
          ['modelos', 'Modelos'],
          ['gastos', 'Gastos'],
          ['ingresos', 'Ingresos'],
          ['nominas', 'Nóminas'],
          ['regimen', 'Régimen'],
          ['autorizacion', 'Gestoría'],
          ['operaciones', 'Intracomunitarias'],
        ] as [TabId, string][]).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, tab === id && styles.tabActive]}
            onPress={async () => {
              setTab(id);
              if (id === 'operaciones') {
                try {
                  const op = await fetchGestoriaOperations();
                  setOperationsData(op);
                } catch {}
              }
            }}
          >
            <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'modelos' && (
          <PanelTab
            settings={settings}
            taxModels={taxModels}
            currentYear={currentYear}
            calculating={calculating}
            getModelStatus={getModelStatus}
            onCalculate={handleCalculate}
            C={C}
          />
        )}
        {tab === 'gastos' && (
          <DocumentsTab
            type="expense"
            title="Gastos"
            docs={expenses}
            onDataChange={loadAll}
            C={C}
          />
        )}
        {tab === 'ingresos' && (
          <DocumentsTab
            type="income"
            title="Ingresos fuera del TPV"
            docs={incomes}
            onDataChange={loadAll}
            C={C}
          />
        )}
        {tab === 'nominas' && (
          <PayrollsTab
            payrolls={payrolls}
            onDataChange={loadAll}
            C={C}
          />
        )}
        {tab === 'regimen' && (
          <RegimenTab
            settings={settings}
            onUpdate={handleUpdateSettings}
            C={C}
          />
        )}
        {tab === 'autorizacion' && (
          <AuthorizationTab
            authorization={authorization}
            onDataChange={loadAll}
            C={C}
          />
        )}
        {tab === 'operaciones' && (
          <OperationsTab data={operationsData} C={C} />
        )}
      </ScrollView>
    </View>
  );
}

function PanelTab({
  settings, taxModels, currentYear, calculating, getModelStatus, onCalculate, C: _C,
}: {
  settings: { taxRegime: string; criterionOfCash: string };
  taxModels: GestoriaTaxModel[];
  currentYear: number;
  calculating: string | null;
  getModelStatus: (code: string, year: number, quarter: number) => GestoriaTaxModel | null;
  onCalculate: (code: string, year: number, quarter: number) => void;
  C: typeof C;
}) {
  const show130 = settings.taxRegime === 'autonomo';
  const regimeLabel: Record<string, string> = { autonomo: 'Autónomo (Estimación Directa)', modulos: 'Módulos', sl: 'Sociedad (SL)' };
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          Régimen: <Text style={{ fontWeight: '700', color: _C.cream }}>{regimeLabel[settings.taxRegime] || 'Autónomo'}</Text>
          {settings.criterionOfCash === 'true' ? ' · Criterio de caja' : ''}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Trimestrales</Text>
      {years.map(year => (
        <View key={year}>
          {QUARTERS.map(({ q, label, months }) => {
            const models = [
              { code: '303', label: '303 · IVA' },
              { code: '111', label: '111 · IRPF trabajo' },
              { code: '115', label: '115 · IRPF alquiler' },
              ...(show130 ? [{ code: '130', label: '130 · Pago fraccionado' }] : []),
              { code: '349', label: '349 · Intracomunitario' },
            ];
            return (
              <View key={`${year}-${q}`} style={styles.quarterBlock}>
                <View style={styles.quarterHeader}>
                  <Text style={styles.quarterLabel}>{label}</Text>
                  <Text style={styles.quarterMonths}>{months}</Text>
                </View>
                {models.map(({ code, label: ml }) => {
                  const tm = getModelStatus(code, year, q);
                  const isCalc = calculating === `${code}-${year}-${q}`;
                  const statusColor = tm?.status === 'presented' ? C.sage : tm?.status === 'reviewed' ? C.brassLight : C.muted;
                  return (
                    <View key={code} style={styles.modelRow}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: _C.cream, fontSize: 13 }}>{ml}</Text>
                        {tm && (
                          <Text style={{ fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: statusColor + '30', color: statusColor }}>
                            {tm.status === 'presented' ? 'Presentado' : tm.status === 'reviewed' ? 'Revisado' : 'Borrador'}
                          </Text>
                        )}
                      </View>
                      {isCalc ? (
                        <ActivityIndicator size="small" color={_C.brass} />
                      ) : tm ? null : (
                        <TouchableOpacity
                          style={styles.calcBtn}
                          onPress={() => onCalculate(code, year, q)}
                        >
                          <Text style={styles.calcBtnText}>Calcular</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      ))}

      <Text style={styles.sectionTitle}>Anuales</Text>
      <View style={{ gap: 8 }}>
        {[
          { code: '390', label: '390 · IVA anual' },
          { code: '190', label: '190 · IRPF anual' },
          { code: '180', label: '180 · Alquileres anual' },
        ].map(({ code, label: ml }) => {
          const tm = getModelStatus(code, currentYear, 0);
          const isCalc = calculating === `${code}-${currentYear}-0`;
          return (
            <View key={code} style={styles.annualBlock}>
              <Text style={{ color: _C.cream, fontSize: 13, flex: 1 }}>{ml}</Text>
              {tm && (
                <Text style={{ fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: (tm.status === 'presented' ? C.sage : tm.status === 'reviewed' ? C.brassLight : C.muted) + '30', color: tm.status === 'presented' ? C.sage : tm.status === 'reviewed' ? C.brassLight : C.muted }}>
                  {tm.status === 'presented' ? 'Presentado' : tm.status === 'reviewed' ? 'Revisado' : 'Borrador'}
                </Text>
              )}
              {isCalc ? (
                <ActivityIndicator size="small" color={_C.brass} />
              ) : tm ? null : (
                <TouchableOpacity style={styles.calcBtn} onPress={() => onCalculate(code, currentYear, 0)}>
                  <Text style={styles.calcBtnText}>Calcular</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.notaBox}>
        <Text style={styles.notaText}>
          Los borradores son orientativos. Tu gestoría los revisa y presenta ante la AEAT.
        </Text>
      </View>
    </View>
  );
}

function DocumentsTab({ type, title, docs, onDataChange, C: _C }: {
  type: string; title: string; docs: GestoriaDocument[];
  onDataChange: () => void; C: typeof C;
}) {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = docs.filter(d =>
    !searchTerm ||
    (d.provider_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.file_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.provider_nif || '').includes(searchTerm)
  );

  const confirmedCount = docs.filter(d => d.confirmed).length;
  const totalBase = docs.reduce((s, d) => {
    const lines = typeof d.lines === 'string' ? JSON.parse(d.lines) : (d.lines || []);
    return s + lines.reduce((sl: number, l: any) => sl + Number(l.baseAmount || l.base_amount || 0), 0);
  }, 0);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: _C.muted, fontSize: 12 }}>
          {docs.length} docs · {confirmedCount} confirmados · Base: {fmt(totalBase)}
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addBtnText}>{showForm ? 'Cerrar' : 'Añadir'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <DocumentForm
          type={type}
          onSave={async (doc) => {
            const res = await saveGestoriaDocument(doc);
            if (res?.ok) { setShowForm(false); onDataChange(); }
          }}
          C={_C}
        />
      )}

      <TextInput
        placeholder="Buscar por proveedor, NIF..."
        placeholderTextColor={_C.muted}
        value={searchTerm}
        onChangeText={setSearchTerm}
        style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surfaceLight }]}
      />

      {filtered.length === 0 ? (
        <Text style={{ textAlign: 'center', color: _C.muted, paddingVertical: 30, fontSize: 13 }}>
          No hay {title.toLowerCase()} registrados
        </Text>
      ) : (
        filtered.map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            type={type}
            onDelete={async () => {
              Alert.alert('Eliminar', '¿Eliminar este documento?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: async () => {
                  await deleteGestoriaDocument(doc.id);
                  onDataChange();
                }},
              ]);
            }}
            onToggleConfirm={async () => {
              await confirmGestoriaDocument(doc.id);
              onDataChange();
            }}
            C={_C}
          />
        ))
      )}
    </View>
  );
}

function DocumentForm({ type, onSave, C: _C }: {
  type: string; onSave: (doc: Record<string, unknown>) => Promise<void>; C: typeof C;
}) {
  const [providerName, setProviderName] = useState('');
  const [providerNif, setProviderNif] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState('');
  const [isPeriodic, setIsPeriodic] = useState(false);
  const [lines, setLines] = useState([{ description: '', baseAmount: 0, vatRate: 21, vatAmount: 0, withholding: 0, zone: 'spain', type: 'good', category: '' }]);

  function updateLine(idx: number, field: string, value: string | number) {
    setLines(prev => {
      const next = [...prev];
      (next as any)[idx][field] = value;
      if (field === 'baseAmount' || field === 'vatRate') {
        const base = Number(next[idx].baseAmount || 0);
        const rate = Number(next[idx].vatRate || 0);
        next[idx].vatAmount = Math.round(base * rate * 100) / 10000;
      }
      return next;
    });
  }

  return (
    <View style={[styles.formCard, { backgroundColor: _C.surfaceLight, borderColor: _C.line }]}>
      <View style={{ gap: 8 }}>
        <TextInput placeholder="Proveedor" placeholderTextColor={_C.muted}
          value={providerName} onChangeText={setProviderName}
          style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
        <TextInput placeholder="NIF" placeholderTextColor={_C.muted}
          value={providerNif} onChangeText={setProviderNif}
          style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: _C.muted }}>Fecha</Text>
            <TextInput value={documentDate} onChangeText={setDocumentDate}
              style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: _C.muted }}>Archivo</Text>
            <TextInput placeholder="factura.pdf" placeholderTextColor={_C.muted}
              value={fileName} onChangeText={setFileName}
              style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Switch value={isPeriodic} onValueChange={setIsPeriodic} trackColor={{ false: _C.line, true: _C.brass }} />
          <Text style={{ color: _C.muted, fontSize: 12 }}>Gasto/ingreso periódico</Text>
        </View>

        <Text style={{ color: _C.muted, fontSize: 11 }}>Líneas</Text>
        {lines.map((l, i) => (
          <View key={i} style={[styles.lineBox, { backgroundColor: _C.surface, borderColor: _C.line }]}>
            <TextInput placeholder="Descripción" placeholderTextColor={_C.muted}
              value={l.description} onChangeText={v => updateLine(i, 'description', v)}
              style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surfaceLight }]} />
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: _C.muted }}>Base</Text>
                <TextInput keyboardType="decimal-pad" value={String(l.baseAmount)} onChangeText={v => updateLine(i, 'baseAmount', Number(v))}
                  style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surfaceLight }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: _C.muted }}>IVA %</Text>
                <TextInput keyboardType="decimal-pad" value={String(l.vatRate)} onChangeText={v => updateLine(i, 'vatRate', Number(v))}
                  style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surfaceLight }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, color: _C.muted }}>Ret. %</Text>
                <TextInput keyboardType="decimal-pad" value={String(l.withholding)} onChangeText={v => updateLine(i, 'withholding', Number(v))}
                  style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surfaceLight }]} />
              </View>
            </View>
            {lines.length > 1 && (
              <TouchableOpacity onPress={() => setLines(prev => prev.filter((_, j) => j !== i))}>
                <Text style={{ color: _C.wine, fontSize: 11 }}>Eliminar línea</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={() => setLines(prev => [...prev, { description: '', baseAmount: 0, vatRate: 21, vatAmount: 0, withholding: 0, zone: 'spain', type: 'good', category: '' }])}>
          <Text style={{ color: _C.sage, fontSize: 12 }}>+ Añadir línea</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={async () => {
        const validLines = lines.filter(l => l.description && Number(l.baseAmount) > 0);
        if (validLines.length === 0) return;
        await onSave({ type, fileName, providerName, providerNif, documentDate, isPeriodic, lines: validLines });
      }}>
        <Text style={styles.saveBtnText}>Guardar {type === 'expense' ? 'gasto' : 'ingreso'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function DocumentCard({ doc, type: _type, onDelete, onToggleConfirm, C: _C }: {
  doc: GestoriaDocument; type: string; onDelete: () => void; onToggleConfirm: () => void; C: typeof C;
}) {
  const lines = typeof doc.lines === 'string' ? JSON.parse(doc.lines) : (doc.lines || []);
  const totalBase = lines.reduce((s: number, l: any) => s + Number(l.baseAmount || l.base_amount || 0), 0);
  const totalVat = lines.reduce((s: number, l: any) => s + Number(l.vatAmount || l.vat_amount || 0), 0);
  const hasEu = lines.some((l: any) => (l.zone || 'spain') !== 'spain');

  return (
    <View style={[styles.docCard, { backgroundColor: _C.surfaceLight, borderColor: doc.confirmed ? C.sage : C.line }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontWeight: '600', color: _C.cream, fontSize: 14, flexShrink: 1 }}>
              {doc.provider_name || doc.file_name || 'Sin nombre'}
            </Text>
            <Text style={{ fontSize: 12, color: doc.confirmed ? C.sage : C.muted }}>
              {doc.confirmed ? '✓' : '○'}
            </Text>
            {doc.is_periodic && (
              <Text style={[styles.badgeSmall, { backgroundColor: C.brass + '30', color: C.brassLight }]}>Periódico</Text>
            )}
            {hasEu && (
              <Text style={[styles.badgeSmall, { backgroundColor: C.sage + '30', color: C.sage }]}>UE / Extranjero</Text>
            )}
          </View>
          <Text style={{ color: _C.muted, fontSize: 11 }}>
            {doc.provider_nif ? `NIF: ${doc.provider_nif}` : ''}
            {doc.document_date ? ` · ${doc.document_date}` : ''}
          </Text>
          <Text style={{ color: _C.brassLight, fontSize: 13, marginTop: 4 }}>
            {fmt(totalBase)} · IVA: {fmt(totalVat)}
          </Text>
          {lines.map((l: any, i: number) => (
            <Text key={i} style={{ color: _C.muted, fontSize: 10 }}>
              {l.description} — {ZONE_LABELS[l.zone || 'spain']} ({TYPE_LABELS[l.type || 'good']})
            </Text>
          ))}
        </View>
        <View style={{ gap: 4 }}>
          <TouchableOpacity onPress={onToggleConfirm} style={[styles.iconBtn, { backgroundColor: doc.confirmed ? C.sage + '20' : 'transparent' }]}>
            <Text style={{ fontSize: 14, color: doc.confirmed ? C.sage : C.muted }}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.iconBtn}>
            <Text style={{ color: _C.wine, fontSize: 14 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PayrollsTab({ payrolls, onDataChange, C: _C }: {
  payrolls: GestoriaPayroll[]; onDataChange: () => void; C: typeof C;
}) {
  const [showForm, setShowForm] = useState(false);

  const byMonth: Record<string, GestoriaPayroll[]> = {};
  for (const p of payrolls) {
    const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(p);
  }

  const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: _C.muted, fontSize: 12 }}>{payrolls.length} nóminas</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addBtnText}>{showForm ? 'Cerrar' : 'Añadir nómina'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <PayrollForm onSave={async (p) => {
          const res = await saveGestoriaPayroll(p);
          if (res?.ok) { setShowForm(false); onDataChange(); }
        }} C={_C} />
      )}

      {Object.keys(byMonth).length === 0 ? (
        <Text style={{ textAlign: 'center', color: _C.muted, paddingVertical: 30, fontSize: 13 }}>
          No hay nóminas registradas
        </Text>
      ) : (
        Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([key, noms]) => {
          const [, month] = key.split('-');
          const monthName = monthNames[parseInt(month)] || month;
          const totalGross = noms.reduce((s, p) => s + Number(p.gross_amount || 0), 0);
          const totalIrpf = noms.reduce((s, p) => s + Number(p.irpf_withholding || 0), 0);
          return (
            <View key={key} style={[styles.quarterBlock, { backgroundColor: _C.surface + '60' }]}>
              <View style={styles.quarterHeader}>
                <Text style={{ color: _C.brassLight, fontWeight: '600', fontSize: 13 }}>{monthName}</Text>
                <Text style={{ color: _C.muted, fontSize: 10 }}>
                  Bruto: {fmt(totalGross)} · IRPF: {fmt(totalIrpf)}
                </Text>
              </View>
              {noms.map(p => (
                <View key={p.id} style={[styles.modelRow, { borderTopWidth: 1, borderTopColor: _C.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: _C.cream, fontSize: 13 }}>{p.employee_name}</Text>
                    <Text style={{ color: _C.muted, fontSize: 10 }}>{p.employee_nif}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ color: _C.muted, fontSize: 11 }}>Neto: {fmt(p.net_amount)}</Text>
                    <TouchableOpacity onPress={async () => {
                      Alert.alert('Eliminar', '¿Eliminar esta nómina?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: async () => {
                          await deleteGestoriaPayroll(p.id);
                          onDataChange();
                        }},
                      ]);
                    }}>
                      <Text style={{ color: _C.wine, fontSize: 11 }}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}

function PayrollForm({ onSave, C: _C }: {
  onSave: (p: Record<string, unknown>) => Promise<void>; C: typeof C;
}) {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNif, setEmployeeNif] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [grossAmount, setGrossAmount] = useState('0');
  const [irpfWithholding, setIrpfWithholding] = useState('0');
  const [ssWorker, setSsWorker] = useState('0');
  const [ssCompany, setSsCompany] = useState('0');
  const [netAmount, setNetAmount] = useState('0');
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <View style={[styles.formCard, { backgroundColor: _C.surfaceLight, borderColor: _C.line }]}>
      <View style={{ gap: 8 }}>
        <TextInput placeholder="Empleado" placeholderTextColor={_C.muted}
          value={employeeName} onChangeText={setEmployeeName}
          style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
        <TextInput placeholder="NIF" placeholderTextColor={_C.muted}
          value={employeeNif} onChangeText={setEmployeeNif}
          style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: _C.muted }}>Mes</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity onPress={() => setMonth(m => m > 1 ? m - 1 : 12)}>
                <Text style={{ color: _C.brass, fontSize: 16, paddingHorizontal: 4 }}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={{ flex: 1, color: _C.cream, fontSize: 13, textAlign: 'center' }}>
                {monthNames[month - 1]}
              </Text>
              <TouchableOpacity onPress={() => setMonth(m => m < 12 ? m + 1 : 1)}>
                <Text style={{ color: _C.brass, fontSize: 16, paddingHorizontal: 4 }}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: _C.muted }}>Año</Text>
            <TextInput value={year} onChangeText={setYear} keyboardType="number-pad"
              style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: _C.muted }}>Bruto</Text>
            <TextInput keyboardType="decimal-pad" value={grossAmount} onChangeText={setGrossAmount}
              style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: _C.muted }}>IRPF</Text>
            <TextInput keyboardType="decimal-pad" value={irpfWithholding} onChangeText={setIrpfWithholding}
              style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: _C.muted }}>SS trab.</Text>
            <TextInput keyboardType="decimal-pad" value={ssWorker} onChangeText={setSsWorker}
              style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: _C.muted }}>SS emp.</Text>
            <TextInput keyboardType="decimal-pad" value={ssCompany} onChangeText={setSsCompany}
              style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, color: _C.muted }}>Neto</Text>
            <TextInput keyboardType="decimal-pad" value={netAmount} onChangeText={setNetAmount}
              style={[styles.smallInput, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={async () => {
        const gross = Number(grossAmount);
        const irpf = Number(irpfWithholding);
        const ssW = Number(ssWorker);
        const ssC = Number(ssCompany);
        const net = Number(netAmount) || Math.round((gross - irpf - ssW) * 100) / 100;
        await onSave({
          employeeName, employeeNif, month,
          year: Number(year), grossAmount: gross,
          irpfWithholding: irpf, ssWorker: ssW,
          ssCompany: ssC, netAmount: net,
        });
      }}>
        <Text style={styles.saveBtnText}>Guardar nómina</Text>
      </TouchableOpacity>
    </View>
  );
}

function RegimenTab({ settings, onUpdate, C: _C }: {
  settings: { taxRegime: string; criterionOfCash: string; socialSecurityRed: string };
  onUpdate: (key: string, value: string) => void;
  C: typeof C;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.formCard, { backgroundColor: _C.surfaceLight, borderColor: _C.line }]}>
        <Text style={{ color: _C.cream, fontSize: 13, marginBottom: 8 }}>Régimen fiscal</Text>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {['autonomo', 'modulos', 'sl'].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.optionChip, settings.taxRegime === v && { backgroundColor: _C.brass }]}
              onPress={() => onUpdate('taxRegime', v)}
            >
              <Text style={[styles.optionChipText, settings.taxRegime === v && { color: '#000' }]}>
                {v === 'autonomo' ? 'Autónomo' : v === 'modulos' ? 'Módulos' : 'Sociedad (SL)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: _C.muted, fontSize: 10 }}>
          {settings.taxRegime === 'autonomo' && 'Modelo 130 disponible. IVA trimestral con modelo 303.'}
          {settings.taxRegime === 'modulos' && 'No se genera Modelo 130. IVA trimestral con modelo 303.'}
          {settings.taxRegime === 'sl' && 'Impuesto de Sociedades gestionado por tu gestoría. No se genera Modelo 130.'}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Switch value={settings.criterionOfCash === 'true'}
            onValueChange={v => onUpdate('criterionOfCash', v ? 'true' : 'false')}
            trackColor={{ false: _C.line, true: _C.brass }} />
          <Text style={{ color: _C.cream, fontSize: 12 }}>Criterio de caja</Text>
        </View>
        <Text style={{ color: _C.muted, fontSize: 10, marginTop: 4 }}>
          Declaras los ingresos cuando los cobras (no cuando facturas).
        </Text>
      </View>

      <View style={[styles.formCard, { backgroundColor: _C.surfaceLight, borderColor: _C.line }]}>
        <Text style={{ color: _C.cream, fontSize: 13, marginBottom: 8 }}>Seguridad Social</Text>
        <Text style={{ color: _C.muted, fontSize: 10, marginBottom: 8 }}>
          Número de afiliación RED (SILTRA) para presentar TC2.
        </Text>
        <TextInput
          placeholder="Nº RED / SILTRA (opcional)"
          placeholderTextColor={_C.muted}
          value={settings.socialSecurityRed}
          onChangeText={v => onUpdate('socialSecurityRed', v)}
          style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]}
        />
      </View>
    </View>
  );
}

function AuthorizationTab({ authorization, onDataChange, C: _C }: {
  authorization: GestoriaAuthorization | null; onDataChange: () => void; C: typeof C;
}) {
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [socialRed, setSocialRed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (authorization) {
      setName(authorization.accountant_name || '');
      setNif(authorization.accountant_nif || '');
      setSocialRed(authorization.social_security_red || false);
    }
  }, [authorization]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isAuthorized = authorization?.signed_at && !authorization?.revoked;

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.formCard, { backgroundColor: _C.surfaceLight, borderColor: _C.line }]}>
        <Text style={{ color: _C.cream, fontSize: 15, marginBottom: 8 }}>Tu gestoría</Text>
        <Text style={{ color: _C.muted, fontSize: 11, marginBottom: 12 }}>
          Autoriza a tu gestoría a presentar tus impuestos y gestionar la Seguridad Social.
        </Text>

        {isAuthorized ? (
          <View style={{ gap: 12 }}>
            <View style={{ backgroundColor: C.sage + '20', borderColor: C.sage + '40', borderWidth: 1, borderRadius: 8, padding: 12 }}>
              <Text style={{ color: C.sage, fontWeight: '600', fontSize: 14 }}>Gestoría autorizada</Text>
              <Text style={{ color: _C.muted, fontSize: 11, marginTop: 4 }}>
                {authorization!.accountant_name} ({authorization!.accountant_nif})
              </Text>
              <Text style={{ color: _C.muted, fontSize: 10 }}>
                Desde {authorization!.signed_at}
              </Text>
              {authorization!.social_security_red && (
                <Text style={{ color: C.sage, fontSize: 11, marginTop: 2 }}>
                  ✓ Asignación RED de la Seguridad Social confirmada
                </Text>
              )}
            </View>
            <TouchableOpacity style={[styles.revokeBtn]} onPress={() => {
              Alert.alert('Revocar', '¿Revocar la autorización? Tu gestoría ya no podrá presentar impuestos.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Revocar', style: 'destructive', onPress: async () => {
                  await saveGestoriaAuthorization({ revoke: true });
                  onDataChange();
                }},
              ]);
            }}>
              <Text style={styles.revokeBtnText}>Revocar autorización</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <TextInput placeholder="Nombre de la gestoría" placeholderTextColor={_C.muted}
              value={name} onChangeText={setName}
              style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
            <TextInput placeholder="NIF de la gestoría" placeholderTextColor={_C.muted}
              value={nif} onChangeText={setNif}
              style={[styles.input, { color: _C.cream, borderColor: _C.line, backgroundColor: _C.surface }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Switch value={socialRed} onValueChange={setSocialRed}
                trackColor={{ false: _C.line, true: _C.brass }} />
              <Text style={{ color: _C.cream, fontSize: 12 }}>Asignación RED de la Seguridad Social</Text>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={async () => {
              if (!name || !nif) return;
              await saveGestoriaAuthorization({ name, nif, signedAt: new Date().toISOString(), socialRed });
              onDataChange();
            }}>
              <Text style={styles.saveBtnText}>Autorizar gestoría</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function OperationsTab({ data, C: _C }: {
  data: GestoriaOperationsResponse | null; C: typeof C;
}) {
  const [section, setSection] = useState<'adquisiciones' | 'entregas'>('adquisiciones');

  if (!data) {
    return <ActivityIndicator size="large" color={_C.brass} />;
  }

  const items: GestoriaOperationEntry[] =
    section === 'adquisiciones' ? data.adquisiciones_intra || [] : data.entregas_intra || [];

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: _C.cream, fontSize: 16, fontWeight: '700' }}>Operaciones intracomunitarias</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={[styles.tab, section === 'adquisiciones' && styles.tabActive]}
          onPress={() => setSection('adquisiciones')}
        >
          <Text style={[styles.tabText, section === 'adquisiciones' && styles.tabTextActive]}>
            Adquisiciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, section === 'entregas' && styles.tabActive]}
          onPress={() => setSection('entregas')}
        >
          <Text style={[styles.tabText, section === 'entregas' && styles.tabTextActive]}>
            Entregas
          </Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={{ textAlign: 'center', color: _C.muted, paddingVertical: 20 }}>No hay operaciones.</Text>
      ) : (
        items.map((item, i) => (
          <View key={item.nif + '-' + i} style={[styles.docCard, { backgroundColor: _C.surface, borderColor: _C.line }]}>
            <Text style={{ fontWeight: '600', color: _C.cream }}>NIF: {item.nif || '—'}</Text>
            <Text style={{ color: _C.muted, fontSize: 12 }}>Nombre: {item.name || '—'}</Text>
            <Text style={{ color: _C.muted, fontSize: 12 }}>Base: {fmt(item.base)}</Text>
            <Text style={{ color: _C.muted, fontSize: 12 }}>Operación: {item.operacion}</Text>
          </View>
        ))
      )}

      <View style={[styles.totalBox, { backgroundColor: _C.surfaceLight }]}>
        <Text style={{ color: _C.brass, fontWeight: '600', fontSize: 15 }}>
          Total: {fmt(data.total_operaciones || 0)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: C.base },
  center: { flex: 1, backgroundColor: C.base, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.muted, marginTop: 8 },
  errorText: { color: C.wine, fontSize: 14 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.surface, borderRadius: 8 },
  retryText: { color: C.brass, fontWeight: '600' },
  header: { fontSize: 20, fontWeight: '700', color: C.cream, marginBottom: 4 },
  subheader: { color: C.muted, fontSize: 11, marginBottom: 12 },
  tabRow: { flexDirection: 'row', marginBottom: 12, maxHeight: 36 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: C.surface, marginRight: 6 },
  tabActive: { backgroundColor: C.brass },
  tabText: { color: C.muted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: C.base },
  content: { flex: 1 },
  badge: { padding: 10, borderRadius: 8, backgroundColor: C.surfaceLight, borderWidth: 1, borderColor: C.line },
  badgeText: { color: C.muted, fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: C.cream, marginTop: 8 },
  quarterBlock: { borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  quarterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.surfaceLight },
  quarterLabel: { color: C.brassLight, fontWeight: '600', fontSize: 13 },
  quarterMonths: { color: C.muted, fontSize: 10 },
  modelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8 },
  calcBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: C.brass + '30' },
  calcBtnText: { color: C.brassLight, fontSize: 11, fontWeight: '600' },
  annualBlock: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 12, backgroundColor: C.surface + '60' },
  notaBox: { padding: 10, borderRadius: 8, backgroundColor: C.brass + '15', borderWidth: 1, borderColor: C.brass + '40' },
  notaText: { color: C.brassLight, fontSize: 11 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.brass + '30' },
  addBtnText: { color: C.brassLight, fontWeight: '600', fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  smallInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 4, fontSize: 12 },
  formCard: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  lineBox: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 6 },
  saveBtn: { borderRadius: 8, paddingVertical: 10, backgroundColor: C.brass, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '600', fontSize: 13 },
  docCard: { borderWidth: 1, borderRadius: 8, padding: 12 },
  badgeSmall: { fontSize: 9, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  iconBtn: { padding: 6, borderRadius: 6, alignItems: 'center' },
  optionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  optionChipText: { color: C.muted, fontSize: 12, fontWeight: '500' },
  revokeBtn: { borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: C.wine + '30', borderWidth: 1, borderColor: C.wine + '60' },
  revokeBtnText: { color: C.wine, fontWeight: '600', fontSize: 13 },
  totalBox: { padding: 12, borderRadius: 8, alignItems: 'center' },
});
