import fs from 'fs';
import path from 'path';
import { createCanvas, registerFont, CanvasRenderingContext2D  } from 'canvas';
import { imagePrefix } from '$lib/server/games/poker/engine';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '$lib/server/s3';
import { PUBLIC_B2_BUCKET, PUBLIC_B2_ENDPOINT } from '$env/static/public';
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

  const imageUrl = `${PUBLIC_B2_ENDPOINT}/${PUBLIC_B2_BUCKET}/${key}`;

  await redis.set(`${imagePrefix}${code}`, imageUrl);

  return imageUrl;
}