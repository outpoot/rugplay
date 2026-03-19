import fs from 'fs';
import path from 'path';
import { createCanvas, registerFont, CanvasRenderingContext2D  } from 'canvas';
import { imagePrefix, tablePrefix } from '$lib/server/games/poker/engine';
import { PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client } from '$lib/server/s3';
import { PUBLIC_B2_BUCKET, PUBLIC_BETTER_AUTH_URL } from '$env/static/public';
import { redis } from '$lib/server/redis';
import sharp from 'sharp';
import { randomBytes } from 'crypto';

const fontPath = path.join(process.cwd(), 'src', 'lib', 'utils', 'poker', 'inter-black.ttf');
const fontFamily = 'Inter Black';
registerFont(fontPath, { family: fontFamily });

const templatePath = path.join(process.cwd(), 'src', 'lib', 'utils', 'poker', 'template.png');
const templateBuffer = fs.readFileSync(templatePath);

const width = 1200;
const height = 630;

const drawText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize = 63
) => {
  ctx.fillStyle = '#2f363d';
  ctx.font = `${fontSize}px '${fontFamily}', Inter, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
};

const randomString = (length = 8) =>
  randomBytes(length).toString('base64url').slice(0, length);

export async function image(
  code: string,
  buyin: string,
  lobbysize: string
): Promise<string> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);

  drawText(ctx, `Code: ${code}`, 75, 220);
  drawText(ctx, buyin, 130, 483, 33);
  drawText(ctx, lobbysize, 370, 483, 33);

  const textBuffer = canvas.toBuffer('image/png');

  const finalBuffer = await sharp(templateBuffer)
    .composite([{ input: textBuffer }])
    .withMetadata()
    .png()
    .toBuffer();

  const key = `poker/meta/${randomString()}.png`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: PUBLIC_B2_BUCKET,
      Key: key,
      Body: finalBuffer,
      ContentType: 'image/png'
    })
  );

  const imageUrl = `${PUBLIC_BETTER_AUTH_URL}/api/proxy/s3/${key}`;

  await redis.set(`${imagePrefix}${code}`, imageUrl);

  return imageUrl;
}

// Clear old images
// Gets called from the main scheduler
export async function clear(): Promise<void> {
  const prefix = 'poker/meta/';

  const [s3Keys, redisUrls] = await Promise.all([
    // These two work at the same time
    (async () => {
      let continuationToken: string | undefined;
      const keys: string[] = [];

      do {
        const res = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: PUBLIC_B2_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken
          })
        );

        for (const obj of res.Contents ?? []) {
          if (obj.Key) keys.push(obj.Key);
        }

        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (continuationToken);

      return keys;
    })(),
    (async () => {
      let cursor = '0';
      const urls = new Set<string>();

      do {
        const { cursor: nextCursor, keys } = await redis.scan(cursor, {
          MATCH: `${imagePrefix}*`,
          COUNT: 500
        });

        cursor = nextCursor;

        if (keys.length === 0) continue;

        const values: any = await redis.mGet(keys);

        for (const v of values) {
          if (v) urls.add(v);
        }

        for (const v of values) {
          if (v) urls.add(v);
        }
      } while (cursor !== '0');

      return urls;
    })()
  ]);

  const toDelete: { Key: string }[] = [];

  for (const key of s3Keys) {
    const url = `${PUBLIC_BETTER_AUTH_URL}/api/proxy/s3/${key}`;

    if (!redisUrls.has(url)) {
      toDelete.push({ Key: key });
    }
  }

  if (toDelete.length === 0) return;

  // and actually remove them.
  for (let i = 0; i < toDelete.length; i += 1000) {
    const chunk = toDelete.slice(i, i + 1000);

    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: PUBLIC_B2_BUCKET,
        Delete: { Objects: chunk }
      })
    );
  }
}