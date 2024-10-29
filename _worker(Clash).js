addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const apiUrl = 'http://api.skrapp.net/api/serverlist';

  try {
    const responseData = await fetchServerData(apiUrl);
    return new Response(responseData, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
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
  const parsedData = JSON.parse(decryptedData.match(/({.*})/)[0]).data;

  const proxies = formatProxies(parsedData);
  const config = generateClashConfig(proxies);
  return config;
}

function formatProxies(data) {
  return data.map(o => ({
    name: `${o.area || '未知区域'}-${o.title || '未命名'}`,
    type: 'ss',
    server: o.ip,
    port: o.port,
    cipher: 'aes-256-cfb',
    password: o.password,
    udp: true
  }));
}

function generateClashConfig(proxies) {
  const proxyEntries = proxies.map(p => (
    `  - name: "${p.name}"\n    type: ${p.type}\n    server: "${p.server}"\n    port: "${p.port}"\n    cipher: ${p.cipher}\n    password: "${p.password}"\n    udp: ${p.udp}`
  )).join('\n');
  const proxyNames = proxies.map(p => `- "${p.name}"`).join('\n      ');
  const proxyGroups = `
proxy-groups:
  - name: "🚀 节点选择"
    type: select
    proxies:
      - "♻️ 自动选择"
      - "DIRECT"
      ${proxyNames}
  - name: "♻️ 自动选择"
    type: url-test
    url: "https://www.gstatic.com/generate_204"
    interval: 300
    tolerance: 50
    proxies:
      ${proxyNames}
  - name: "🌍 国外媒体"
    type: select
    proxies:
      - "🚀 节点选择"
      - "♻️ 自动选择"
      - "🎯 全球直连"
      ${proxyNames}
  - name: "📲 电报信息"
    type: select
    proxies:
      - "🚀 节点选择"
      - "🎯 全球直连"
      ${proxyNames}
  - name: "Ⓜ️ 微软服务"
    type: select
    proxies:
      - "🎯 全球直连"
      - "🚀 节点选择"
      ${proxyNames}
  - name: "🍎 苹果服务"
    type: select
    proxies:
      - "🚀 节点选择"
      - "🎯 全球直连"
      ${proxyNames}
  - name: "🎯 全球直连"
    type: select
    proxies:
      - "DIRECT"
      - "🚀 节点选择"
      - "♻️ 自动选择"
      ${proxyNames}
  - name: "🛑 全球拦截"
    type: select
    proxies:
      - "REJECT"
      - "DIRECT"
  - name: "🍃 应用净化"
    type: select
    proxies:
      - "REJECT"
      - "DIRECT"
  - name: "🐟 漏网之鱼"
    type: select
    proxies:
      - "🚀 节点选择"
      - "🎯 全球直连"
      - "♻️ 自动选择"
      ${proxyNames}
rules:
  - MATCH,🚀 节点选择
`;
  return `proxies:\n${proxyEntries}\n\n${proxyGroups}`;
}
// AES 解密函数
async function aes128cbcDecrypt(encryptedText, key, iv) {
  const encryptedBuffer = hexStringToUint8Array(encryptedText);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: new Uint8Array(iv.split('').map(c => c.charCodeAt(0))),
    },
    await crypto.subtle.importKey("raw", new Uint8Array(key.split('').map(c => c.charCodeAt(0))), "AES-CBC", false, ["decrypt"]),
    encryptedBuffer
  );
  // 使用 TextDecoder 解码，指定 utf-8
  return new TextDecoder('utf-8').decode(decryptedBuffer);
}
function hexStringToUint8Array(hexString) {
  const byteArray = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return byteArray;
}
