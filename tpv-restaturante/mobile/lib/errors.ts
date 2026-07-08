export function classifyError(e: unknown): { title: string; message: string } {
  if (!e || typeof e !== 'object') {
    return { title: 'Error', message: String(e) };
  }

  const err = e as Record<string, unknown>;
  const msg = typeof err.message === 'string' ? err.message : '';
  const code = typeof err.code === 'string' ? err.code : '';

  // Stripe Terminal errors (NFC reader)
  if (code === 'NotConnected' || code === 'NotLoggedIn' || msg.includes('reader')) {
    return { title: 'Error de conexión NFC', message: 'No se pudo conectar con el lector NFC. Verifica que esté encendido y cerca del dispositivo.' };
  }
  if (code === 'BluetoothError' || msg.includes('bluetooth') || msg.includes('Bluetooth')) {
    return { title: 'Bluetooth', message: 'Activa el Bluetooth y vuelve a intentarlo.' };
  }
  if (code === 'canceled' || code === 'Canceled') {
    return { title: 'Pago cancelado', message: '' };
  }

  // Stripe API / card errors
  if (code === 'card_error' || code === 'processing_error' || code === 'invalid_request_error') {
    return { title: 'Error de pago', message: msg || 'La tarjeta fue rechazada. Prueba con otro método de pago.' };
  }
  if (code === 'api_connection_error' || code === 'api_error') {
    return { title: 'Error de Stripe', message: 'No se pudo procesar el pago. Revisa la conexión e inténtalo de nuevo.' };
  }
  if (code === 'Failed' || code === 'PaymentFailed') {
    return { title: 'Pago fallido', message: msg || 'El pago no se completó. Inténtalo de nuevo.' };
  }

  // Network errors
  const lower = msg.toLowerCase();
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed') ||
    msg.includes('ERR_NETWORK') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timed out') ||
    msg.includes('abort') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    lower.includes('network') ||
    lower.includes('timeout')
  ) {
    return { title: 'Error de red', message: 'No se pudo conectar con el servidor. Comprueba tu conexión a Internet.' };
  }

  // NFC / permissions
  if (msg.includes('permission') || msg.includes('Permission') || msg.includes('NFC') || msg.includes('nfc')) {
    return { title: 'Permiso NFC', message: 'No se concedió el permiso NFC. Actívalo en Ajustes del dispositivo.' };
  }

  // Generic fallback
  return { title: 'Error', message: msg || 'Ocurrió un error inesperado.' };
}
