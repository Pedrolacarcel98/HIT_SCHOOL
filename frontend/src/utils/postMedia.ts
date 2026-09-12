const getDriveFileId = (rawUrl: string) => {
  try {
    const parsedUrl = new URL(rawUrl);
    const pathMatch = parsedUrl.pathname.match(/\/file\/d\/([^/]+)/);
    if (parsedUrl.hostname === 'lh3.googleusercontent.com') {
      return parsedUrl.pathname.match(/\/d\/([^=/?]+)/)?.[1] || null;
    }
    return pathMatch?.[1] || parsedUrl.searchParams.get('id');
  } catch {
    return rawUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1]
      || rawUrl.match(/[?&]id=([^&/?]+)/)?.[1]
      || rawUrl.match(/lh3\.googleusercontent\.com\/d\/([^=/?]+)/)?.[1]
      || null;
  }
};

export const getPostMediaUrl = (rawUrl: string, mediaType?: string | null) => {
  const driveFileId = getDriveFileId(rawUrl);

  if (!driveFileId) return rawUrl;
  if (!mediaType || mediaType.startsWith('image')) {
    return `https://lh3.googleusercontent.com/d/${driveFileId}=w1600`;
  }
  return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
};

export const getPostMediaFallbackUrl = (rawUrl: string, mediaType?: string | null) => {
  const driveFileId = getDriveFileId(rawUrl);
  if (!driveFileId || (mediaType && !mediaType.startsWith('image'))) return null;
  return `https://lh3.googleusercontent.com/d/${driveFileId}=w1600`;
};

export const getPostMediaDownloadUrl = (rawUrl: string) => {
  const driveFileId = getDriveFileId(rawUrl);

  if (!driveFileId) return rawUrl;
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
};
