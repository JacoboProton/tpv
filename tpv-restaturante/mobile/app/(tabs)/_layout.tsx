import { Tabs } from 'expo-router';
import { C } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

function TabIcon({ name, color, size }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.surface },
        headerTintColor: C.cream,
        tabBarStyle: { backgroundColor: C.surface, borderTopColor: C.base },
        tabBarActiveTintColor: C.brass,
        tabBarInactiveTintColor: C.muted,
      }}
    >
      <Tabs.Screen
        name="saloon"
        options={{
          title: 'Salón',
          tabBarIcon: ({ color, size }) => <TabIcon name="grid-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color, size }) => <TabIcon name="receipt-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => <TabIcon name="receipt" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: 'Operaciones',
          tabBarIcon: ({ color, size }) => <TabIcon name="analytics-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
