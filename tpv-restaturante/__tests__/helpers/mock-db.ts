type Rows = any[];

export function mockDb() {
  const tables: Record<string, Rows> = {};
  let executeResult: Rows = [];

  function getTableData(table: any): Rows {
    if (!table || !table._ || !table._.name) return [];
    return tables[table._.name.toLowerCase()] || [];
  }

  function chain(data: Rows) {
    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        if (prop === 'then') return (fn: (v: any) => any) => Promise.resolve(data).then(fn);
        if (prop === 'returning') return () => Promise.resolve(data);
        if (prop === 'catch') return (fn: (e: any) => any) => Promise.resolve(data);
        if (prop === 'finally') return (fn: () => any) => Promise.resolve(data);
        if (prop === Symbol.toStringTag) return 'Promise';
        if (prop === 'map' || prop === 'filter' || prop === 'reduce') return (data as any)[prop];
        return () => chain(data);
      },
      apply() { return chain(data); },
    };
    return new Proxy({}, handler);
  }

  const db: any = new Proxy({}, {
    get(_t, method: string) {
      if (method === 'then' || method === 'catch' || method === 'finally') return undefined;
      if (method === 'Symbol') return undefined;

      if (method === 'execute') {
        return (_query: any) => Promise.resolve({ rows: executeResult });
      }

      if (method === 'transaction') {
        return (cb: (tx: any) => Promise<any>) => cb(db);
      }

      if (method === 'select') {
        return (_fields?: any) => ({
          from: (table: any) => {
            const data = getTableData(table);
            return {
              where: (..._args: any[]) => chain(data),
              orderBy: (..._args: any[]) => chain(data),
              limit: (n: number) => chain(data.slice(0, n)),
              innerJoin: (..._args: any[]) => chain(data),
              leftJoin: (..._args: any[]) => chain(data),
            };
          },
        });
      }

      if (method === 'insert') {
        return (table: any) => ({
          values: (_v: any) => ({
            onConflictDoUpdate: (_conf: any) => chain(getTableData(table)),
            returning: () => chain(getTableData(table)),
          }),
        });
      }

      if (method === 'update') {
        return (table: any) => ({
          set: (_v: any) => ({
            where: (..._args: any[]) => chain(getTableData(table)),
          }),
        });
      }

      if (method === 'delete') {
        return (table: any) => ({
          where: (..._args: any[]) => chain(getTableData(table)),
        });
      }

      return chain([]);
    },
  });

  return {
    db,
    seed(table: string, data: Rows) { tables[table.toLowerCase()] = data; },
    setExecuteResult(data: Rows) { executeResult = data; },
    reset() {
      for (const k of Object.keys(tables)) delete tables[k];
      executeResult = [];
    },
  };
}

export type MockDbHelper = ReturnType<typeof mockDb>;
