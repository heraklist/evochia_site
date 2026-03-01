// Vercel Function: /api/quote
// Receives JSON payload from the site and sends an email via Resend.
// Configure in Vercel Project Settings:
//   RESEND_API_KEY, TO_EMAIL, FROM_EMAIL (optional), SITE_NAME (optional)

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Allow', 'POST');
      return res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    }

    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.TO_EMAIL;
    const fromEmail = process.env.FROM_EMAIL || 'Evochia <onboarding@resend.dev>';
    const siteName = process.env.SITE_NAME || 'Evochia';

    if (!resendKey || !toEmail) {
      res.statusCode = 503;
      return res.end(JSON.stringify({
        ok: false,
        error: 'Email delivery not configured. Set RESEND_API_KEY and TO_EMAIL in Vercel.'
      }));
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    // Simple honeypot
    if (body['bot-field']) {
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true }));
    }

    const required = ['service', 'date', 'guests', 'location', 'name', 'email', 'consent'];
    const missing = required.filter(k => !body[k]);
    if (missing.length) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: `Missing fields: ${missing.join(', ')}` }));
    }

    const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
    const ua = (req.headers['user-agent'] || '').toString();
    const now = new Date().toISOString();

    const subject = `${siteName} — Quote Request (${body.service})`;
    const text = [
      `Service: ${body.service}`,
      `Date: ${body.date}`,
      `Guests: ${body.guests}`,
      `Location: ${body.location}`,
      `Name: ${body.name}`,
      `Phone: ${body.phone || ''}`,
      `Email: ${body.email}`,
      `Company: ${body.company || ''}`,
      '',
      'Notes:',
      body.notes || '',
      '',
      `Meta: ${now} | IP: ${ip} | UA: ${ua}`
    ].join('\n');

    const html = `
      <div style="font-family:Arial, sans-serif; line-height:1.5">
        <h2>${siteName} — Quote Request</h2>
        <p><b>Service:</b> ${escapeHtml(body.service)}</p>
        <p><b>Date:</b> ${escapeHtml(body.date)} &nbsp; <b>Guests:</b> ${escapeHtml(String(body.guests))}</p>
        <p><b>Location:</b> ${escapeHtml(body.location)}</p>
        <hr/>
        <p><b>Name:</b> ${escapeHtml(body.name)}</p>
        <p><b>Email:</b> ${escapeHtml(body.email)}</p>
        <p><b>Phone:</b> ${escapeHtml(body.phone || '')}</p>
        <p><b>Company:</b> ${escapeHtml(body.company || '')}</p>
        <p><b>Notes:</b><br/>${escapeHtml(body.notes || '').replace(/\n/g,'<br/>')}</p>
        <hr/>
        <p style="color:#666;font-size:12px">Meta: ${escapeHtml(now)} | IP: ${escapeHtml(ip)} | UA: ${escapeHtml(ua)}</p>
      </div>
    `;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject,
        text,
        html
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, error: 'Resend error', details: errText.slice(0, 500) }));
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ ok: false, error: 'Server error' }));
  }
};

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
