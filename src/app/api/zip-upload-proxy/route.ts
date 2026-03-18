import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for ZIP file uploads to the Python backend.
 *
 * Using a proper API route instead of a Next.js rewrite is critical for
 * binary file uploads (multipart/form-data). Next.js rewrites can silently
 * corrupt large binary payloads or hit body size limits, causing the Python
 * server to return "500 Internal Server Error" as plain text — which the
 * frontend then fails to parse as JSON.
 *
 * This route streams the raw multipart body directly to the Python backend
 * without buffering or re-encoding it, which works reliably on all environments.
 */


// Allow up to 5 minutes for large ZIP uploads to complete
export const maxDuration = 300;

const TARGET_SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://127.0.0.1:8011';

export async function POST(request: NextRequest) {
  try {
    const targetUrl = `${TARGET_SERVER_BASE_URL}/upload/project`;
    console.log(`[upload-project] Proxying request to: ${targetUrl}`);

    // Forward the raw request body (multipart/form-data) as-is to the Python backend.
    // We pass the body as a ReadableStream to avoid buffering the entire file in memory!
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Expected multipart/form-data request' },
        { status: 400 }
      );
    }

    // Forward to the Python FastAPI backend using direct streaming
    let backendResponse: Response;
    try {
      backendResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': contentType, // Crucial: preserve the exact multipart boundary
        },
        body: request.body as unknown as BodyInit,
        duplex: 'half', // Required for Node.js fetch when body is a stream
      } as RequestInit);
    } catch (networkErr) {
      console.error('[upload-project] Network error reaching Python backend:', networkErr);
      return NextResponse.json(
        {
          error:
            'Cannot reach the backend server. Please ensure the Python API server is running on port 8011.',
        },
        { status: 502 }
      );
    }

    // Read the response body as text first so we can safely handle non-JSON responses
    const responseText = await backendResponse.text();

    // Try to parse as JSON
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // The backend returned non-JSON (e.g., an HTML error page).
      // Log the raw response so it can be debugged in server logs.
      console.error(
        `[upload-project] Backend returned non-JSON response (status ${backendResponse.status}):`,
        responseText.slice(0, 500)
      );
      return NextResponse.json(
        {
          error: `Backend error (HTTP ${backendResponse.status}): ${responseText.slice(0, 200)}`,
        },
        { status: backendResponse.status >= 400 ? backendResponse.status : 502 }
      );
    }

    // Return the parsed JSON response with the same HTTP status code
    return NextResponse.json(responseData, { status: backendResponse.status });
  } catch (error) {
    console.error('[upload-project] Unexpected error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during file upload.',
      },
      { status: 500 }
    );
  }
}
