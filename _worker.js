addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
async function handleRequest(request) {
  const apiUrl = 'http://api.skrapp.net/api/serverlist';
  const headers = {
    'accept': '/', 'appversion': '1.3.1', 'user-agent': 'SkrKK/1.3.1',
    'content-type': 'application/x-www-form-urlencoded',
    'Cookie': 'PHPSESSID=fnffo1ivhvt0ouo6ebqn86a0d4'
  };
  const key = new TextEncoder().encode('65151f8d966bf596');
  const iv = new TextEncoder().encode('88ca0f0ea1ecf975');
  try {
    const response = await fetch(apiUrl, { headers });
    const encryptedData = await response.text();
    const decryptedData = await aes128cbcDecrypt(encryptedData, key, iv);
    const data = JSON.parse(decryptedData.match(/({.*})/)[0]).data;
    MainData = data.map(o => {
      const title = encodeURIComponent(o.title || '未命名');
      const organizestrings = btoa(`aes-256-cfb:${o.password}`);
      const connectionString = `${organizestrings}@${o.ip}:${o.port}`;
      return `ss://${connectionString}#${title}`;
    }).join('\n');
    return new Response(MainData, { status: 200 });
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 });
  }
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
async function getSubscription(urls, UA, userAgentHeader) {
  let subscriptionContent = [];
  let unconvertedLinks = [];
  const headers = { "User-Agent": userAgentHeader || UA };
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (response.status === 200) {
        subscriptionContent.push((await response.text()).split("\n"));
      } else {
        unconvertedLinks.push(url);
      }
    } catch {
      unconvertedLinks.push(url);
    }
  }
  return [subscriptionContent.flat(), unconvertedLinks];
}
let mytoken = 'sub';
let FileName = 'Colab';
let MainData = '';
let urls = [];
let subconverter = "SUBAPI.fxxk.dedyn.io";
let subconfig = "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini";
let subProtocol = 'https';
export default {
  async fetch(request, env) {
    const userAgent = (request.headers.get('User-Agent') || "").toLowerCase();
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    mytoken = env.TOKEN || mytoken;
    subconverter = env.SUBAPI || subconverter;
    if (subconverter.includes("http://")) {
      subconverter = subconverter.split("//")[1];
      subProtocol = 'http';
    } else {
      subconverter = subconverter.split("//")[1] || subconverter;
    }
    subconfig = env.SUBCONFIG || subconfig;
    FileName = env.SUBNAME || FileName;
    MainData = env.LINK || MainData;
    urls = env.LINKSUB ? await addLinks(env.LINKSUB) : [];
    if (!MainData) await handleRequest(request);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const timeTemp = Math.ceil(currentDate.getTime() / 1000);
    const fakeToken = await MD5MD5(`${mytoken}${timeTemp}`);
    let allLinks = await addLinks(MainData + '\n' + urls.join('\n'));
    let selfHostedNodes = "";
    let subscriptionLinks = "";
    allLinks.forEach(link => {
      if (link.toLowerCase().startsWith('http')) {
        subscriptionLinks += link + '\n';
      } else {
        selfHostedNodes += link + '\n';
      }
    });
    MainData = selfHostedNodes;
    urls = await addLinks(subscriptionLinks);
    if (!(token == mytoken || token == fakeToken || url.pathname == `/${mytoken}` || url.pathname.includes(`/${mytoken}?`))) {
      return new Response(await forbiddenPage(), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      });
    }
    const subscriptionFormat = getSubscriptionFormat(userAgent, url);
    let subscriptionConversionUrl = `${url.origin}/${await MD5MD5(fakeToken)}?token=${fakeToken}`;
    let req_data = MainData;
    const subscriptionResponse = await getSubscription(urls, "v2rayn", userAgent);
    req_data += subscriptionResponse[0].join('\n');
    subscriptionConversionUrl += "|" + subscriptionResponse[1];
    if (env.WARP) subscriptionConversionUrl += "|" + (await addLinks(env.WARP)).join("|");
    const base64Data = btoa(uniqLines(req_data).join('\n'));
    if (subscriptionFormat === 'base64' || token === fakeToken) {
      return new Response(base64Data, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    try {
      const subconverterUrl = getSubconverterUrl(subscriptionFormat, subscriptionConversionUrl);
      const subconverterResponse = await fetch(subconverterUrl);
      if (!subconverterResponse.ok) throw new Error('Subconverter fetch failed');
      let subconverterContent = await subconverterResponse.text();
      if (subscriptionFormat === 'clash') subconverterContent = await clashFix(subconverterContent);
      return new Response(subconverterContent, {
        headers: {
          "Content-Disposition": `attachment; filename*=utf-8''${encodeURIComponent(FileName)}; filename=${FileName}`,
          "content-type": "text/plain; charset=utf-8",
        },
      });
    } catch (error) {
      return new Response(base64Data, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
  }
};
async function addLinks(data) {
  return data.split("\n").filter(e => e.trim() !== "");
}
function getSubscriptionFormat(userAgent, url) {
  if (userAgent.includes('null') || userAgent.includes('subconverter') || userAgent.includes('nekobox') || userAgent.includes('CF-Workers-SUB')) {
    return 'base64';
  }
  if (userAgent.includes('clash') || (url.searchParams.has('clash') && !userAgent.includes('subconverter'))) {
    return 'clash';
  }
  if (userAgent.includes('sing-box') || userAgent.includes('singbox') || (url.searchParams.has('sb') || url.searchParams.has('singbox'))) {
    return 'singbox';
  }
  return userAgent.includes('surge') || url.searchParams.has('surge') ? 'surge' : 'base64';
}
function getSubconverterUrl(subscriptionFormat, subscriptionConversionUrl) {
  const formatMap = {
    'clash': 'clash',
    'singbox': 'singbox',
    'surge': 'surge'
  };
  return `${subProtocol}://${subconverter}/sub?target=${formatMap[subscriptionFormat] || 'clash'}&url=${encodeURIComponent(subscriptionConversionUrl)}&config=${encodeURIComponent(subconfig)}`;
}
function uniqLines(text) {
  return [...new Set(text.split('\n'))];
}
async function forbiddenPage() {
  return `<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>Access Denied</p></body></html>`;
}
async function MD5MD5(value) {
  const encoded = new TextEncoder().encode(value);
  const buffer = await crypto.subtle.digest("MD5", await crypto.subtle.digest("MD5", encoded));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function clashFix(content) {
  return content.split("\n").map(line => {
    if (line.startsWith("  - name: ")) {
      const nameValue = line.split("name: ")[1];
      return `  - name: ${nameValue}`;
    }
    return line;
  }).join("\n");
}
