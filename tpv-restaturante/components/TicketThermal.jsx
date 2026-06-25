import { TICKET_PRINT_STYLE, euros as fmtEuros } from './constants';

export default function TicketThermal({ sale, tableName, items, showModifiers }) {
  const restaurantName = 'LA COMANDA';
  const date = sale?.closedAt
    ? new Date(sale.closedAt).toLocaleString('es-ES')
    : new Date().toLocaleString('es-ES');

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discountPct = sale?.discount || 0;
  const discountAmount = subtotal * (discountPct / 100);
  const total = subtotal - discountAmount;
  const tip = sale?.tip || 0;
  const finalTotal = total + tip;

  return (
    <div id="thermal-ticket" style={TICKET_PRINT_STYLE}>
      <div className="ticket-header">{restaurantName}</div>
      <div style={{ textAlign: 'center', fontSize: 9, marginBottom: 4 }}>
        CIF: 78406450W<br />
        {date}<br />
        Mesa: {tableName}
      </div>
      <div className="ticket-divider" />

      {items.map((item, i) => (
        <div key={i}>
          <div style={{ fontWeight: 'bold' }}>{item.name}</div>
          {showModifiers && item.modifiers?.length > 0 && item.modifiers.map((m, j) => (
            <div key={j} style={{ fontSize: 9, paddingLeft: 8, color: '#555' }}>
              + {m.optionName}
            </div>
          ))}
          <div className="ticket-row" style={{ fontSize: 9 }}>
            <span>{item.qty} x {item.price.toFixed(2)}€</span>
            <span>{(item.qty * item.price).toFixed(2)}€</span>
          </div>
        </div>
      ))}

      <div className="ticket-divider" />
      <div className="ticket-row" style={{ fontSize: 9 }}>
        <span>Subtotal</span><span>{fmtEuros(subtotal)}</span>
      </div>
      {discountPct > 0 && (
        <div className="ticket-row" style={{ fontSize: 9, color: '#666' }}>
          <span>Dto. {discountPct}%</span><span>-{fmtEuros(discountAmount)}</span>
        </div>
      )}
      {tip > 0 && (
        <div className="ticket-row" style={{ fontSize: 9, color: '#666' }}>
          <span>Propina</span><span>+{fmtEuros(tip)}</span>
        </div>
      )}
      <div className="ticket-total ticket-row">
        <span>TOTAL</span><span>{fmtEuros(finalTotal)}</span>
      </div>
      <div className="ticket-divider" />
      <div style={{ textAlign: 'center', fontSize: 9, marginTop: 4 }}>
        Gracias por su visita
      </div>
    </div>
  );
}
