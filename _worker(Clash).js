addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const apiUrl = 'http://api.skrapp.net/api/serverlist';
  const templateUrl = 'https://templates.xyhk.us.kg/';

  try {
    const responseData = await fetchServerData(apiUrl);
    const clashConfig = await generateClashConfig(responseData, templateUrl);
    return new Response(clashConfig, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
}

async function fetchServerData(apiUrl) {
  const headers = {
    'accept': '/',
    'accept-language': 'zh-Hans-CN;q=1, en-CN;q=0.9',
    'appversion': '1.3.1',
    'user-agent': 'SkrKK/1.3.1 (iPhone; iOS 13.5; Scale/2.00)',
    'content-type': 'application/x-www-form-urlencoded',
    'Cookie': 'PHPSESSID=fnffo1ivhvt0ouo6ebqn86a0d4'
  };

  const response = await fetch(apiUrl, { headers });
  const data = await response.text();
  const decryptedData = await aes128cbcDecrypt(data, '65151f8d966bf596', '88ca0f0ea1ecf975');
  return formatProxies(JSON.parse(decryptedData.match(/({.*})/)[0]).data);
}

function formatProxies(data) {
  return data.map(({ area = '未知区域', title = '未命名', ip, port, password, type = 'ss', udp = true }) => ({
    area, title, ip, port, password, type, udp
  }));
}

async function fetchApiTemplate(templateUrl) {
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error('Failed to fetch template: ' + response.statusText);
  return await response.text();
}

async function generateClashConfig(data, templateUrl) {
  const template = await fetchApiTemplate(templateUrl);
  const proxies = data.map(({ area, title, ip, port, type, password, udp }) =>
    `  - {name: "${area}-${title}", server: "${ip}", port: "${port}", type: "${type}", password: "${password}", cipher: "aes-256-cfb", udp: ${udp}}`
  ).join('\n');

  const proxyNames = data.map(({ area, title }) => `${area}-${title}`).join('\n        - ');

  return template.replace(/{proxy}/g, proxies).replace(/{proxyNames}/g, proxyNames);
}

async function aes128cbcDecrypt(encryptedText, key, iv) {
  const encryptedBuffer = hexStringToUint8Array(encryptedText);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: new Uint8Array(iv.split('').map(c => c.charCodeAt(0))) },
    await crypto.subtle.importKey("raw", new Uint8Array(key.split('').map(c => c.charCodeAt(0))), "AES-CBC", false, ["decrypt"]),
    encryptedBuffer
  );
  return new TextDecoder('utf-8').decode(decryptedBuffer);
}

function hexStringToUint8Array(hexString) {
  const byteArray = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return byteArray;
}
