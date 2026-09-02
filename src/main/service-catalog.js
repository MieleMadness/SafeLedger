'use strict';

const SERVICES = Object.freeze([
  ['Chain Games','CG','#171c2c',['chain games','chaingames','chaingames.io']],
  ['Facebook','f','#1877f2',['facebook','facebook.com','fb']],
  ['Yahoo','Y!','#6001d2',['yahoo','yahoo.com']],
  ['Google','G','#4285f4',['google','google.com']],
  ['Gmail','M','#ea4335',['gmail','gmail.com']],
  ['Microsoft','M','#737373',['microsoft','microsoft.com']],
  ['Outlook','O','#0078d4',['outlook','outlook.com','hotmail','hotmail.com']],
  ['Apple','A','#111111',['apple','apple.com','icloud','icloud.com']],
  ['Amazon','a','#ff9900',['amazon','amazon.com']],
  ['PayPal','P','#003087',['paypal','paypal.com']],
  ['eBay','e','#e53238',['ebay','ebay.com']],
  ['Instagram','IG','#c13584',['instagram','instagram.com']],
  ['X / Twitter','X','#111111',['x','x.com','twitter','twitter.com']],
  ['LinkedIn','in','#0a66c2',['linkedin','linkedin.com']],
  ['Reddit','R','#ff4500',['reddit','reddit.com']],
  ['Discord','D','#5865f2',['discord','discord.com']],
  ['Dropbox','D','#0061ff',['dropbox','dropbox.com']],
  ['GitHub','GH','#24292f',['github','github.com']],
  ['Netflix','N','#e50914',['netflix','netflix.com']],
  ['Spotify','S','#1db954',['spotify','spotify.com']],
  ['Steam','S','#1b2838',['steam','steampowered.com','steamcommunity.com']],
  ['Twitch','T','#9146ff',['twitch','twitch.tv']],
  ['TikTok','TT','#111111',['tiktok','tiktok.com']],
  ['YouTube','YT','#ff0000',['youtube','youtube.com']],
  ['Proton','P','#6d4aff',['proton','proton.me','protonmail']],
  ['Adobe','A','#e60023',['adobe','adobe.com']],
  ['Slack','S','#4a154b',['slack','slack.com']],
  ['Zoom','Z','#2d8cff',['zoom','zoom.us']]
].map(([name,mark,color,aliases]) => Object.freeze({name,mark,color,aliases:Object.freeze(aliases)})));

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/$/,'');
}

function find(value) {
  const key = normalize(value);
  if (!key) return null;
  return SERVICES.find((service) => service.aliases.some((alias) => {
    const candidate = normalize(alias);
    return key === candidate || key.endsWith(`.${candidate}`);
  }) || normalize(service.name) === key) || null;
}

function escapeXml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
}

function iconDataUrl(value) {
  const service = typeof value === 'object' && value ? value : find(value);
  if (!service) return null;
  const mark = escapeXml(service.mark);
  const label = escapeXml(service.name);
  const fontSize = mark.length > 2 ? 23 : mark.length > 1 ? 28 : 36;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${label}"><rect width="96" height="96" rx="22" fill="${service.color}"/><text x="48" y="52" fill="white" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif" font-weight="700" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${mark}</text></svg>`;

  // Renderer code runs inside Electron's sandbox with Node globals disabled.
  // URI-encode the SVG instead of relying on Buffer/btoa so the same local
  // icon generator works in both the trusted Node test process and renderer.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createIcon(value, className = 'known-service-brand-image') {
  const service = find(value);
  if (!service || typeof document === 'undefined') return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = iconDataUrl(service);
  img.alt = `${service.name} icon`;
  img.draggable = false;
  return img;
}

exports.SERVICES = SERVICES;
exports.normalize = normalize;
exports.find = find;
exports.iconDataUrl = iconDataUrl;
exports.createIcon = createIcon;
