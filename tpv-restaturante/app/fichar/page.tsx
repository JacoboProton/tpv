'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, User, Search, Loader2 } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position?: string;
}

export default function FicharIndex() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(data => setEmployees(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen flex flex-col items-center p-6" style={{ background: '#1a1a1a' }}>
      <div className="w-full max-w-md space-y-6 pt-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: '#c4a04a20' }}>
            <Clock className="w-7 h-7" style={{ color: '#c4a04a' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#e8e0d4' }}>Fichaje</h1>
          <p className="text-xs capitalize" style={{ color: '#8a8275' }}>{today}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#c4a04a' }} />
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6b655a' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Busca tu nombre…"
                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm"
                style={{ background: '#222', color: '#e8e0d4', border: '1px solid #333' }}
              />
            </div>

            <div className="space-y-1">
              {filtered.length === 0 ? (
                <p className="text-center text-sm py-8" style={{ color: '#6b655a' }}>
                  {search ? 'No encontrado' : 'No hay empleados'}
                </p>
              ) : (
                filtered.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => router.push(`/fichar/${emp.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:opacity-80 transition-opacity"
                    style={{ background: '#222', border: '1px solid #333' }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#c4a04a15' }}>
                      <User className="w-4 h-4" style={{ color: '#c4a04a' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#e8e0d4' }}>{emp.name}</p>
                      {emp.position && (
                        <p className="text-[10px] truncate" style={{ color: '#6b655a' }}>{emp.position}</p>
                      )}
                    </div>
                    <Clock className="w-4 h-4" style={{ color: '#6b655a' }} />
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
