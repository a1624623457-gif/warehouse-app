import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import { mkdir } from "fs/promises";
import sharp from "sharp";

// Compress image to under 200KB
async function compressImage(buffer: Buffer, contentType: string): Promise<Buffer> {
  try {
    let quality = 80;
    let result = buffer;

    // Try progressively lower quality until under 200KB
    while (result.length > 200 * 1024 && quality >= 20) {
      if (contentType.includes("png")) {
        result = await sharp(buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
      } else {
        result = await sharp(buffer)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }
      quality -= 20;
    }

    // If still over 200KB, reduce dimensions
    if (result.length > 200 * 1024) {
      result = await sharp(buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 60, mozjpeg: true })
        .toBuffer();
    }

    return result;
  } catch {
    // If sharp fails, return original buffer
    return buffer;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "admin" && role !== "editor") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }

  // Validate type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // Generate unique filename (always jpg after compression)
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
  const filepath = path.join(uploadsDir, filename);

  const originalBuffer = Buffer.from(await file.arrayBuffer());
  const compressedBuffer = await compressImage(originalBuffer, file.type);

  await writeFile(filepath, compressedBuffer);

  const url = `/uploads/${filename}`;

  const originalKB = (originalBuffer.length / 1024).toFixed(1);
  const compressedKB = (compressedBuffer.length / 1024).toFixed(1);

  return NextResponse.json({
    url,
    originalSize: `${originalKB}KB`,
    compressedSize: `${compressedKB}KB`,
  });
}
