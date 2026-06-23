const fetch = require('node-fetch');
const fs = require('fs');

const SEGMIND_API_KEY = 'SG_ba6fdbd5554401e9';

// A simple small 1x1 black pixel base64 image to test upload
const base64Image = 'R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';

async function test() {
  try {
    console.log('Testing upload...');
    const uploadRes = await fetch('https://workflows-api.segmind.com/upload-asset', {
      method: 'POST',
      headers: {
        'x-api-key': SEGMIND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data_urls: [`data:image/gif;base64,${base64Image}`] }),
    });

    console.log('Upload Status:', uploadRes.status);
    const uploadData = await uploadRes.json();
    console.log('Upload Response:', uploadData);

    let uploadUrl = '';
    if (Array.isArray(uploadData) && uploadData.length > 0) uploadUrl = uploadData[0];
    else if (uploadData.file_urls && uploadData.file_urls.length > 0) uploadUrl = uploadData.file_urls[0];

    if (!uploadUrl) {
      console.log('Upload failed, no URL returned.');
      return;
    }

    console.log('Testing generation with uploadUrl:', uploadUrl);
    const res = await fetch('https://api.segmind.com/v1/nano-banana-2', {
      method: 'POST',
      headers: {
        'x-api-key': SEGMIND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seed: 12345,
        prompt: 'A beautiful young woman',
        image_urls: [uploadUrl],
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

    console.log('Generation Status:', res.status);
    const genText = await res.text();
    console.log('Generation Response (first 500 chars):', genText.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}

test();
