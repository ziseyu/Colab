addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const apiUrl = 'http://api.skrapp.net/api/serverlist';
  const headers = {
    'accept': '/',
    'accept-language': 'zh-Hans-CN;q=1, en-CN;q=0.9',
    'appversion': '1.3.1',
    'user-agent': 'SkrKK/1.3.1 (iPhone; iOS 13.5; Scale/2.00)',
    'content-type': 'application/x-www-form-urlencoded',
    'Cookie': 'PHPSESSID=fnffo1ivhvt0ouo6ebqn86a0d4'
  };

  const key = new TextEncoder().encode('65151f8d966bf596');
  const iv = new TextEncoder().encode('88ca0f0ea1ecf975');

  try {
    const response = await fetch(apiUrl, { headers });
    const decryptedData = await aes128cbcDecrypt(await response.text(), key, iv);
    const data = JSON.parse(decryptedData.match(/({.*})/)[0]).data;

    const results = data.map(o => ({
      name: `${o.area || '未知区域'}-${o.title || '未命名'}`,
      type: 'ss',
      server: o.ip,
      port: o.port,
      cipher: 'aes-256-cfb',
      password: o.password,
      udp: true
    }));

    const clashConfig = {
      proxies: results,
      "proxy-groups": [{
        name: 'Auto',
        type: 'url-test',
        proxies: results.map(proxy => proxy.name),
        url: 'http://www.gstatic.com/generate_204',
        interval: 300
      }]
    };

    return new Response(JSON.stringify(clashConfig, null, 2), { status: 200 });
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
}

async function aes128cbcDecrypt(encryptedText, key, iv) {
  const encryptedBuffer = hexStringToUint8Array(encryptedText);
  const keyObj = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC', iv }, false, ['decrypt']);
  
  try {
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, keyObj, encryptedBuffer);
    return new TextDecoder().decode(decryptedBuffer).replace(/\0+$/, '');
  } catch {
    throw new Error('解密失败');
  }
}

function hexStringToUint8Array(hexString) {
  const byteArray = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return byteArray;
}