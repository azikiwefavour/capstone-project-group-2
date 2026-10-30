const apiKey = 'tlv_dS7UHojFToSO5qZNfQX6cXeAqlrF8NX4aMwUH566c3w';
const testPhone = '2349162868224';

async function testSend() {
  const senders = ['MedTrail', 'student', 'Termii', 'N-Alert'];
  const channels = ['generic', 'dnd'];
  const urls = ['https://v4.api.termii.com', 'https://api.ng.termii.com'];

  for (const sender of senders) {
    for (const channel of channels) {
      for (const url of urls) {
        try {
          console.log(`\nTesting URL: ${url} | from: "${sender}" | channel: "${channel}"...`);
          const res = await fetch(`${url}/api/sms/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: testPhone,
              from: sender,
              sms: 'MedTrail test verification SMS to patient',
              type: 'plain',
              channel: channel,
              api_key: apiKey,
            }),
          });
          const data = await res.json();
          console.log(`HTTP ${res.status}:`, data);
          if (res.ok && data.message_id) {
            console.log(' SUCCESS! Message sent with message_id:', data.message_id);
            return;
          }
        } catch (e) {
          console.error(e.message);
        }
      }
    }
  }
}

testSend();
