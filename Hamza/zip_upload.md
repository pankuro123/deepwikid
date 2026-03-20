# How to Upload a ZIP Archive in DeepWiki

DeepWiki provides a functionality to analyze local projects dynamically without direct access to their Git hosting platforms by allowing the upload of a `.zip` file containing the project's source code. This is particularly useful for internal prototypes or air-gapped deployments.

## Technical Explanation

The process spans both the frontend (Next.js) and the backend (FastAPI, Python).

1. **Frontend Selection:** The user selects a `.zip` file using a hidden file input triggered by a button in `src/app/page.tsx` (`handleZipUpload` function).
2. **Next.js Proxy API Route:** The frontend POSTs the file to an API route (`/api/zip-upload-proxy`) configured in Next.js (`src/app/api/zip-upload-proxy/route.ts`). Next.js acts as a proxy to stream the file.
3. **Direct Streaming to Backend:** It is crucial that the upload is routed via a true Next.js API Route using a Node.js `ReadableStream` (`duplex: 'half'`) rather than Next.js standard rewrites. Standard rewrites or traditional body parsers might buffer large binaries into memory and hit size limits, leading to `500 Internal Server Error`.
4. **Backend Processing:** The FastAPI backend server (`api/main.py` -> `/upload/project`) receives the raw multiplexed stream, saves it to a temporary directory, and extracts it, treating the extracted directory as the repository path.

## Relevant Code Snippets

### 1. Frontend Upload Handler (`src/app/page.tsx`)
```typescript
const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.name.endsWith('.zip')) {
    setError('Please select a .zip file');
    return;
  }

  setIsUploading(true);
  setError(null);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/zip-upload-proxy', {
      method: 'POST',
      body: formData,
    });
    
    // ...error handling omitted for brevity
    
    const data = await response.json();
    setRepositoryInput(data.path); // Use the temporary extracted path for the wiki
    setIsConfigModalOpen(true);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
  } finally {
    setIsUploading(false);
  }
};
```

### 2. Next.js Streaming Proxy (`src/app/api/zip-upload-proxy/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // Allow 5 minutes for large uploads
const TARGET_SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://127.0.0.1:8011';

export async function POST(request: NextRequest) {
  try {
    const targetUrl = `${TARGET_SERVER_BASE_URL}/upload/project`;
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data request' }, { status: 400 });
    }

    // Direct streaming to the backend avoiding memory buffering!
    const backendResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: request.body as unknown as BodyInit,
      duplex: 'half', // Required for Node.js fetch when body is a stream
    } as RequestInit);

    const responseText = await backendResponse.text();
    return NextResponse.json(JSON.parse(responseText), { status: backendResponse.status });
  } catch (error) {
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
```
