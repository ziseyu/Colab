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
      'Cookie': 'PHPSESSID=fnffo1ivhvt0ouo6ebqn86a0d4',
    };
  
    const key = new TextEncoder().encode('65151f8d966bf596');
    const iv = new TextEncoder().encode('88ca0f0ea1ecf975');
  
    try {
      const response = await fetch(apiUrl, { headers });
      const encryptedData = await response.text();
      const decryptedData = await aes128cbcDecrypt(encryptedData, key, iv);
      const data = JSON.parse(decryptedData.match(/({.*})/)[0]).data;
  
      const singboxConfig = generateSingboxConfig(data);
  
      return new Response(JSON.stringify(singboxConfig, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response('Error: ' + error.message, { status: 500 });
    }
  }
  
  function generateSingboxConfig(data) {
    return {
      inbounds: [
        {
          type: "mixed",
          tag: "mixed-in",
          listen: "::",
          listen_port: 1080,
          sniff: true,
          set_system_proxy: false,
        },
      ],
      outbounds: data.map(o => ({
        type: "shadowsocks",
        tag: `${decodeURIComponent(o.area || '未知区域')}-${decodeURIComponent(o.title || '未命名')}`,
        method: 'aes-256-cfb', // 可根据实际情况更改
        password: o.password,
        server: o.ip,
        server_port: parseInt(o.port, 10), // 确保转换为数字类型
      })),
    };
  }
  
  async function aes128cbcDecrypt(encryptedText, key, iv) {
    const encryptedBuffer = hexStringToUint8Array(encryptedText);
    const algorithm = { name: 'AES-CBC', iv };
    const keyObj = await crypto.subtle.importKey('raw', key, algorithm, false, ['decrypt']);
  
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(algorithm, keyObj, encryptedBuffer);
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
  