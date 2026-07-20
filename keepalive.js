import https from 'https';
import http from 'http';

const url = 'https://lovestream.ankitak.com.np/';

// Ping every 10 minutes (600,000 milliseconds)
setInterval(() => {
  const req = url.startsWith('https') ? https : http;
  req.get(url, (res) => {
    console.log(`Keep-alive ping sent to ${url}. Status code: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`Keep-alive ping failed: ${err.message}`);
  });
}, 10 * 60 * 1000);

console.log(`Keep-alive service started. Pinging ${url} every 10 minutes.`);
