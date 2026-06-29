import postgres from 'postgres';

function createSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida en las variables de entorno');
  }
  return postgres(process.env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  });
}

let _sql;
function getSql() {
  if (!_sql) _sql = createSql();
  return _sql;
}

function _call(strings, ...values) {
  return getSql()(strings, ...values);
}

_call.begin = async (fn) => getSql().begin(fn);
_call.transaction = async (fn) => getSql().transaction(fn);
_call.unsafe = (str, params) => getSql().unsafe(str, params);
_call.end = async () => { if (_sql) await _sql.end(); };

export const sql = _call;
