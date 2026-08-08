import sharp from 'sharp';

// Defaults tuned for small square assets (avatars, coin icons).
const MAX_SIZE = 128;
const WEBP_QUALITY = 50;

export interface ProcessedImage {
    buffer: Buffer;
    contentType: string;
    size: number;
}

export interface ProcessImageOptions {
    /** Max width/height in px, aspect ratio preserved. Default 128 (icon-sized). */
    maxSize?: number;
    /** WebP quality 1-100. Default 50 (fine for tiny icons, too low for banners). */
    quality?: number;
}

export async function processImage(
    inputBuffer: Buffer,
    options: ProcessImageOptions = {},
): Promise<ProcessedImage> {
    const maxSize = options.maxSize ?? MAX_SIZE;
    const quality = options.quality ?? WEBP_QUALITY;

    try {
        const image = sharp(inputBuffer, { animated: true });

        const processedBuffer = await image
            .resize(maxSize, maxSize, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({
                quality,
                effort: 6
            })
            .toBuffer();

        return {
            buffer: processedBuffer,
            contentType: 'image/webp',
            size: processedBuffer.length
        };

    } catch (error) {
        console.error('Image processing failed:', error);
        throw new Error('Failed to process image');
    }
}
