import { neon } from '@neondatabase/serverless';

let _sql;
function getSql() {
  if (_sql) return _sql;
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno');
  }
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

function sql(strings, ...values) {
  return getSql()(strings, ...values);
}

sql.transaction = (queries) => getSql().transaction(queries);
sql.unsafe = (str, params) => getSql().unsafe(str, params);

export { sql };
