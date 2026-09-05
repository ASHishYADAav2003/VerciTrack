import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const batchId = formData.get("batchId") as string | null;

    if (!file || !batchId) {
      return NextResponse.json(
        { error: "Missing file or batchId" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const certificatesDir = path.join(
      process.cwd(),
      "public",
      "certificates"
    );

    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }

    const safeBatchId = batchId.replace(/[^a-zA-Z0-9-_]/g, "");
    const fileName = `${safeBatchId}.pdf`;

    const filePath = path.join(certificatesDir, fileName);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      certificateUrl: `/certificates/${fileName}`,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Certificate upload failed" },
      { status: 500 }
    );
  }
}