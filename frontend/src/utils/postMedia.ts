export const getPostMediaUrl = (rawUrl: string, _mediaType?: string | null) => {
  const driveFileId = rawUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1]
    || rawUrl.match(/[?&]id=([^&/?]+)/)?.[1];

  if (!driveFileId) return rawUrl;
  return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
};

export const getPostMediaDownloadUrl = (rawUrl: string) => {
  const driveFileId = rawUrl.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1]
    || rawUrl.match(/[?&]id=([^&/?]+)/)?.[1];

  if (!driveFileId) return rawUrl;
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
};
