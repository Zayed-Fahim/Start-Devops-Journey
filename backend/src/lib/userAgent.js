const BROWSERS = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Brave/, 'Brave'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
  [/curl\//, 'curl'],
  [/node|undici/i, 'Node'],
];

const PLATFORMS = [
  [/Windows NT/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad|iOS/, 'iOS'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

const match = (table, value) => {
  const found = table.find(([pattern]) => pattern.test(value));
  return found ? found[1] : null;
};

const describeUserAgent = (userAgent) => {
  if (!userAgent) return 'Unknown device';

  const browser = match(BROWSERS, userAgent);
  const platform = match(PLATFORMS, userAgent);

  if (browser && platform) return `${browser} on ${platform}`;
  if (browser) return browser;
  if (platform) return platform;
  return 'Unknown device';
};

module.exports = { describeUserAgent };
