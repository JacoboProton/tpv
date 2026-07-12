import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | undefined;

function getSql() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno');
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

const sql: NeonQueryFunction<false, false> & {
  transaction: NeonQueryFunction<false, false>['transaction'];
  unsafe: NeonQueryFunction<false, false>['unsafe'];
} = function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  return getSql()(strings, ...values);
} as unknown as typeof sql;

sql.transaction = (queries, opts) => getSql().transaction(queries, opts);
sql.unsafe = (rawSQL) => getSql().unsafe(rawSQL);

export { sql };
