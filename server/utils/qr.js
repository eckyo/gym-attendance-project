import QRCode from 'qrcode';

export async function generateQRBuffer(scanToken) {
  return QRCode.toBuffer(scanToken, {
    width: 400,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });
}
