import sharp from 'sharp';

const MAX_SIZE = 128;
const WEBP_QUALITY = 50;

export interface ProcessedImage {
    buffer: Buffer;
    contentType: string;
    size: number;
}

export async function processImage(
    inputBuffer: Buffer,
): Promise<ProcessedImage> {
    try {
        const image = sharp(inputBuffer, { animated: true });

        const processedBuffer = await image
            .resize(MAX_SIZE, MAX_SIZE, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({
                quality: WEBP_QUALITY,
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
