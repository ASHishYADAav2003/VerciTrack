// app/api/upload-pdf/route.ts
// Saves a PDF file to public/certificates/ and returns the public URL.
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const certDir = path.join(process.cwd(), "public", "certificates");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("pdf") as File | null;
    const batchId  = (formData.get("batchId") as string | null)?.trim();

    if (!file || !batchId) {
      return NextResponse.json({ error: "pdf and batchId required." }, { status: 400 });
    }

    // Sanitise batchId for use as filename
    const safeName = batchId.replace(/[^a-zA-Z0-9_\-]/g, "_") + ".pdf";

    await fs.mkdir(certDir, { recursive: true });
    const dest = path.join(certDir, safeName);
    const buf  = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dest, buf);

    return NextResponse.json({ url: `/certificates/${safeName}` });
  } catch (err) {
    console.error("upload-pdf error:", err);
    return NextResponse.json({ error: "Failed to save PDF." }, { status: 500 });
  }
}
