const fetch = require('node-fetch');

const SEGMIND_API_KEY = 'SG_ba6fdbd5554401e9';

async function test() {
  try {
    const res = await fetch('https://api.segmind.com/v1/nano-banana-2', {
      method: 'POST',
      headers: {
        'x-api-key': SEGMIND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seed: 12345,
        prompt: 'A beautiful young woman',
        aspect_ratio: "1:1",
        output_format: "jpg",
        output_resolution: "1K",
        base64: true
      }),
    });

    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Body:', text);
  } catch (err) {
    console.error(err);
  }
}

test();
