// Vercel Function: /api/newsletter
// Sends a notification email when someone signs up.
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
    if (body['bot-field']) {
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true }));
    }

    const email = (body.email || '').toString().trim();
    const consent = !!body.consent;
    if (!email || !consent) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ ok: false, error: 'Email + consent required' }));
    }

    const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
    const ua = (req.headers['user-agent'] || '').toString();
    const now = new Date().toISOString();

    const subject = `${siteName} — Newsletter signup`;
    const text = `Email: ${email}\nMeta: ${now} | IP: ${ip} | UA: ${ua}`;

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
        text
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
