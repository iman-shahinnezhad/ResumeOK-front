const fetch = require('node-fetch');

const SEGMIND_API_KEY = 'SG_ba6fdbd5554401e9';
const SAMPLE_IMAGE_URL = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80';

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
        image_urls: [SAMPLE_IMAGE_URL],
        web_search: false,
        aspect_ratio: "1:1",
        output_format: "jpg",
        thinking_level: "minimal",
        safety_tolerance: 4,
        output_resolution: "1K",
        response_modalities: "IMAGE",
        base64: true
      }),
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text.substring(0, 1000));
  } catch (err) {
    console.error(err);
  }
}

test();
