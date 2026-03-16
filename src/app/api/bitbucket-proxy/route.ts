import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint for Bitbucket Server (Data Center) REST API calls.
 * 
 * This is needed because Bitbucket Server instances (like bitbucket.cib.echonet)
 * typically block CORS requests from browser-side JavaScript. By routing through
 * the Next.js backend, we avoid CORS issues entirely.
 * 
 * Usage: POST /api/bitbucket-proxy
 * Body: { url: string, token?: string }
 * 
 * The `url` should be the full Bitbucket Server REST API URL, e.g.:
 *   https://bitbucket.cib.echonet/rest/api/1.0/projects/CORIX/repos/comet-ckeditor/files?at=master
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, token } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 });
    }

    // Validate the URL to prevent SSRF - only allow Bitbucket-like REST API paths
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Only allow HTTPS/HTTP protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS protocols are allowed' }, { status: 400 });
    }

    // Only allow Bitbucket REST API paths
    if (!parsedUrl.pathname.includes('/rest/api/')) {
      return NextResponse.json({ error: 'Only Bitbucket REST API paths are allowed' }, { status: 400 });
    }

    // Build headers for the upstream request
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Determine SSL verification settings
    // In Node.js, we can use an HTTPS agent to control SSL verification
    const isSslNoVerify = process.env.GIT_SSL_NO_VERIFY === 'true' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
    
    // For Node.js fetch (undici), we'd usually use a Dispatcher, 
    // but a simpler way for corporate environments is to use the global setting
    // if the user has requested it via GIT_SSL_NO_VERIFY.
    if (isSslNoVerify) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      // Return raw text (for README or raw file content)
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': contentType || 'text/plain' },
      });
    }
  } catch (error) {
    console.error('Bitbucket proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}
