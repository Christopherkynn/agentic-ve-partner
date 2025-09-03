const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined' && window.location.hostname === 'fastdiagram.com'
    ? 'https://api.fastdiagram.com'
    : '');
