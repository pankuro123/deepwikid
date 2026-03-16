import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // Check if the file is present
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json(
        { detail: "No file was uploaded." },
        { status: 400 }
      );
    }

    // Proxy the request to the local FastAPI server
    const targetBaseUrl = process.env.SERVER_BASE_URL || "http://127.0.0.1:8011";
    const response = await fetch(`${targetBaseUrl}/jira/process_pdf`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            const errorText = await response.text();
            errorData = { detail: errorText || `FastAPI error: ${response.status} ${response.statusText}` };
        }
        console.error("FastAPI Error:", errorData);
        return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("PDF proxy error:", error);
    return NextResponse.json(
      { detail: `Internal Server Error proxying to FastAPI: ${error.message}` },
      { status: 500 }
    );
  }
}
