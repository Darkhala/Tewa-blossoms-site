export async function startMpesaStkPush(totalAmount, billing) {
  const amount = Math.round(Number(totalAmount || 0));
  if (!amount || amount <= 0) throw new Error('Invalid amount');
  const phone = billing?.phone || '';
  if (!phone) throw new Error('Phone required');

  const body = {
    amount,
    phone,
    reference: `TEWA-${Date.now()}`,
  };

  const res = await fetch('http://localhost:3001/api/mpesa/stkpush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`STK push failed: ${t}`);
  }
  return res.json();
}
