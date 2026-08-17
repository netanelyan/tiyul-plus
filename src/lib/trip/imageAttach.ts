'use client';

/**
 * Attaching an image to the conversation with the agent - a screenshot of a booking
 * confirmation, a boarding pass, a sign or a menu. Everything happens in the browser, with
 * no new library and no storage: the file is downscaled to a small data URL (canvas,
 * exactly like imageToAvatar in the profile) and sent to /api/chat in the request body
 * only. The image is not stored on the server and is not written to any log.
 *
 * The resolution was chosen so that small text in a screenshot stays legible to the model
 * (1400px on the long edge), while the image still stays in the hundreds of KB.
 */

/** The long edge after downscaling - enough to read text in a screenshot */
const MAX_EDGE = 1400;
/** The size ceiling after downscaling (data URL characters) - the server enforces the same limit */
export const MAX_IMAGE_CHARS = 1_400_000;
/** What the browser is allowed to pick in the first place */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
/** A raw-file ceiling before downscaling - protection against enormous files */
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export interface AttachError {
  /** A Hebrew message to show the user */
  message: string;
}

/**
 * Converts a selected file into a downscaled JPEG data URL. Returns null when the file is
 * not a readable image, is too large, or could not be compressed enough.
 */
export function fileToChatImage(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/') || file.size > MAX_SOURCE_BYTES) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      // A white background: screenshots with transparency must not come out black in JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      // Step the quality down until it fits the ceiling - a slightly soft image beats a failure
      for (const q of [0.82, 0.7, 0.6, 0.5]) {
        const data = canvas.toDataURL('image/jpeg', q);
        if (data.length <= MAX_IMAGE_CHARS) return resolve(data);
      }
      resolve(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
