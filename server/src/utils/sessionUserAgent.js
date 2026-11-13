const firstMatch = (userAgent, patterns) => {
  for (const [pattern, name] of patterns) {
    const match = userAgent.match(pattern);
    if (match) return { name, version: match[1] || "" };
  }
  return { name: "Unknown browser", version: "" };
};

export const parseSessionUserAgent = (value = "") => {
  const userAgent = typeof value === "string" ? value : "";
  const isIPad = /iPad/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent));
  const isIPhone = /iPhone|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = /Mobile|iPhone|iPod|Windows Phone/i.test(userAgent);
  const isTablet = isIPad || /Tablet/i.test(userAgent) || (isAndroid && !isMobile);

  let os = "Unknown OS";
  if (isIPad || isIPhone) {
    os = "iOS";
  } else if (isAndroid) {
    os = "Android";
  } else if (/Windows NT/i.test(userAgent)) {
    os = "Windows";
  } else if (/Mac OS X|Macintosh/i.test(userAgent)) {
    os = "macOS";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
  }

  const browser = firstMatch(userAgent, [
    [/(?:Edg|Edge)\/([\d.]+)/i, "Edge"],
    [/(?:OPR|Opera)\/([\d.]+)/i, "Opera"],
    [/Firefox\/([\d.]+)/i, "Firefox"],
    [/(?:Chrome|CriOS)\/([\d.]+)/i, "Chrome"],
    [/(?:Version)\/([\d.]+).*Safari/i, "Safari"],
    [/Safari\/([\d.]+)/i, "Safari"],
  ]);

  const deviceType = isIPad
    ? "iPad"
    : isTablet
      ? "Tablet"
      : isMobile
        ? "Mobile Phone"
        : /Macintosh|Windows NT|X11|Linux/i.test(userAgent)
          ? "Desktop"
          : "Unknown device";
  const androidModel = isAndroid
    ? userAgent
      .match(/Android\s+[^;)]*;\s*([^;)]+)/i)?.[1]
      ?.replace(/\s+Build\/.*$/i, "")
      .trim()
    : "";
  const deviceName = isIPad
    ? "iPad"
    : isIPhone
      ? "iPhone"
      : isAndroid
          ? androidModel && !/^(?:mobile|tablet|wv)$/i.test(androidModel)
            ? androidModel
            : "Android device"
        : os === "Unknown OS"
          ? "Unknown device"
          : `${os} device`;

  return {
    deviceType,
    deviceName,
    os,
    browser: browser.name,
    browserVersion: browser.version,
  };
};
