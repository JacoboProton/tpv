import QRCode from 'qrcode'

export async function qrDataUrl(text: string, width = 160): Promise<string> {
  return QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: 'M' })
}