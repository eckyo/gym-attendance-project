const GRAPH_API = 'https://graph.facebook.com/v19.0';

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+62' + digits.slice(1);
  if (digits.startsWith('62')) return '+' + digits;
  return '+' + digits;
}

export async function sendQRCode(phoneNumber, memberName, qrImageBuffer) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  if (!token || !phoneNumberId || !templateName) {
    console.warn('[WhatsApp] Missing env vars — skipping send');
    return { success: false };
  }

  try {
    const normalized = normalizePhone(phoneNumber);

    // Step 1: Upload QR image as WhatsApp media
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'image/png');
    formData.append('file', new Blob([qrImageBuffer], { type: 'image/png' }), 'qr.png');

    const mediaRes = await fetch(`${GRAPH_API}/${phoneNumberId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!mediaRes.ok) {
      const err = await mediaRes.json().catch(() => ({}));
      const reason = err?.error?.message || `Media upload HTTP ${mediaRes.status}`;
      console.error('[WhatsApp] Media upload failed:', JSON.stringify(err));
      return { success: false, reason };
    }

    const { id: mediaId } = await mediaRes.json();

    // Step 2: Send template message with the uploaded image as header
    const msgRes = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalized,
        type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US' },
          components: [
            {
              type: 'header',
              parameters: [{ type: 'image', image: { id: mediaId } }],
            },
            {
              type: 'body',
              parameters: [{ type: 'text', text: memberName }],
            },
          ],
        },
      }),
    });

    if (!msgRes.ok) {
      const err = await msgRes.json().catch(() => ({}));
      const reason = err?.error?.message || `Message send HTTP ${msgRes.status}`;
      console.error('[WhatsApp] Send failed:', JSON.stringify(err));
      return { success: false, reason };
    }

    const msgData = await msgRes.json();
    return { success: true, messageId: msgData.messages?.[0]?.id };
  } catch (err) {
    console.error('[WhatsApp] Unexpected error:', err);
    return { success: false, reason: err.message };
  }
}
