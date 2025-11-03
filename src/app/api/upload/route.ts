/**
 * FILE UPLOAD API ROUTE
 *
 * Purpose: Upload files to Cloudinary and extract text content from text-based files
 * Features:
 * - Upload to Cloudinary
 * - Extract text from .txt, .docx, .pdf files
 * - Return FileAttachment with textContent for text files
 * - Return URL for images and other non-text files
 */

import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import mammoth from "mammoth";

// @ts-expect-error - pdf-parse doesn't have proper TypeScript types
import pdfParse from "pdf-parse";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface FileAttachment {
  name: string;
  contentType: string;
  url: string;
  size: number;
  textContent?: string; // Extracted text for txt/docx/pdf files
}

// Helper to extract text from different file types
async function extractTextContent(
  buffer: Buffer,
  contentType: string,
  fileName: string
): Promise<string | undefined> {
  try {
    // Plain text files
    if (contentType === "text/plain" || fileName.endsWith(".txt")) {
      return buffer.toString("utf-8");
    }

    // DOCX files
    if (
      contentType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    // PDF files
    if (contentType === "application/pdf" || fileName.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      return data.text;
    }

    return undefined;
  } catch (error) {
    console.error("[Upload] Text extraction error:", error);
    return undefined;
  }
}

// Helper to upload to Cloudinary
async function uploadToCloudinary(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "chat-attachments",
        resource_type: "auto",
        public_id: `${Date.now()}-${fileName}`,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result.secure_url);
        else reject(new Error("Upload failed"));
      }
    );

    uploadStream.end(buffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    console.log(`[Upload] Processing ${files.length} file(s)`);

    const attachments: FileAttachment[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      console.log(`[Upload] Processing: ${file.name} (${file.type}, ${buffer.length} bytes)`);

      // Upload to Cloudinary
      const url = await uploadToCloudinary(buffer, file.name, file.type);

      // Extract text content if applicable
      const textContent = await extractTextContent(
        buffer,
        file.type,
        file.name
      );

      const attachment: FileAttachment = {
        name: file.name,
        contentType: file.type,
        url,
        size: buffer.length,
        textContent,
      };

      attachments.push(attachment);

      console.log(
        `[Upload] ✅ ${file.name} - ${textContent ? "Text extracted" : "URL only"}`
      );
    }

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
