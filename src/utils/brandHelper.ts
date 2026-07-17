export const getIsMelas = (): boolean => {
  // 1. Check env variable VITE_BRAND
  const envBrand = import.meta.env.VITE_BRAND || '';
  if (envBrand.toLowerCase() === 'melas') return true;
  if (envBrand.toLowerCase() === 'plow') return false;

  // 2. Check URL hostname
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('melas')) return true;
  }

  return false;
};

export const getBrandName = (): string => {
  return getIsMelas() ? 'Clamelas S.A.S.' : 'Arare S.A.S.';
};

export const getBrandLogo = (): string => {
  return getIsMelas() ? '/logos/melas-192x192.png' : '/logos/plow-192x192.png';
};

export const getBrandColor = (): string => {
  return getIsMelas() ? '#fce7f3' : '#f2bfbe';
};

export const getBrandTextColor = (): string => {
  return getIsMelas() ? '#9d174d' : '#6b2a35';
};

export const getBrandInfo = (): string[] => {
  if (getIsMelas()) {
    return [
      'CLAMELAS S.A.S.',
      'NIT: 901980480-4',
      '3136824230',
      'Itagüí (Ant)',
      'Dirección: CRA 52 D # 76 - 67 L 1135',
    ];
  }
  return [
    'ARARE S.A.S.',
    'NIT: 901453438-4',
    '3146320002',
    'Itagüí (Ant)',
    'Dirección: CLL 77 a # 45 a 30 - 301',
  ];
};
