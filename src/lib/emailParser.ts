// Lightweight email MIME parser for client-side rendering
// Extracts readable text from multipart/HTML emails

export interface ParsedEmailContent {
  text: string;
  html: string;
}

function normalizeNewlines(s: string) {
  return (s || '').replace(/\r\n/g, '\n');
}

function findBoundaryMarker(body: string): string | null {
  // Try header-style boundary param first
  const headerBoundary = body.match(/boundary[=:][\s]*["']?([^"'\s;]+)/i)?.[1];
  if (headerBoundary) return `--${headerBoundary.replace(/^["']|["']$/g, '')}`;

  // Fallback: detect first boundary line in body like ------=_NextPart_...
  const markerMatch = body.match(/^(--{2,}[^\s]+)$/m);
  return markerMatch ? markerMatch[1] : null;
}

function findHeaderEndIndex(part: string): number {
  // Look for first blank line separating headers from body
  const idx = part.indexOf('\n\n');
  if (idx !== -1) return idx;
  const match = /\n\s*\n/.exec(part);
  return match ? match.index + match[0].length - 2 : -1;
}

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\n/g, '') // soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/=3D/g, '=');
}

function decodeContent(content: string, encoding: string): string {
  try {
    const enc = (encoding || '').toLowerCase();
    if (enc.includes('quoted-printable')) {
      return decodeQuotedPrintable(content);
    }
    if (enc.includes('base64')) {
      const cleaned = content.replace(/\s+/g, '');
      try {
        return typeof atob === 'function' ? atob(cleaned) : content;
      } catch {
        return content; // fallback
      }
    }
    return content;
  } catch {
    return content;
  }
}

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMultipartEmail(body: string): ParsedEmailContent {
  const normalized = normalizeNewlines(body || '');

  // If it doesn't look like multipart, try to extract HTML or return plain
  if (!/multipart|------=|^--/i.test(normalized)) {
    const htmlGuess = normalized.match(/<html[\s\S]*?<\/html>/i)?.[0] || '';
    return {
      text: htmlGuess ? stripHtml(decodeQuotedPrintable(htmlGuess)) : normalized,
      html: htmlGuess || normalized.replace(/\n/g, '<br>')
    };
  }

  let textContent = '';
  let htmlContent = '';

  try {
    let marker = findBoundaryMarker(normalized);

    if (!marker) {
      // Fallback simple extraction: remove MIME boilerplate and headers
      const simple = normalized
        .replace(/^This is a multipart message in MIME format\.[\s\S]*?\n/gim, '')
        .split('\n')
        .filter(line => !/^Content-/.test(line) && !/^--/.test(line))
        .join('\n')
        .trim();
      const htmlGuess = normalized.match(/<html[\s\S]*?<\/html>/i)?.[0] || '';
      return {
        text: simple || (htmlGuess ? stripHtml(decodeQuotedPrintable(htmlGuess)) : normalized),
        html: htmlGuess || simple.replace(/\n/g, '<br>')
      };
    }

    // Split by detected boundary marker
    const parts = normalized.split(new RegExp(`\n${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\n|--)`));

    for (const raw of parts) {
      const part = raw.trim();
      if (!part || part === '--' || part.endsWith(`${marker}--`)) continue;

      const headerEndIndex = findHeaderEndIndex(part);
      if (headerEndIndex === -1) continue;

      const headers = part.substring(0, headerEndIndex);
      let content = part.substring(headerEndIndex).trim();

      const contentType = headers.match(/content-type:\s*([^;\n]+)/i)?.[1]?.trim().toLowerCase() || '';
      const transferEncoding = headers.match(/content-transfer-encoding:\s*([^\n]+)/i)?.[1]?.trim().toLowerCase() || '7bit';

      content = decodeContent(content, transferEncoding);

      if (contentType.includes('text/plain')) {
        textContent = content.replace(/^This is a multipart message in MIME format\.?/i, '').trim();
      } else if (contentType.includes('text/html')) {
        htmlContent = content;
      }
    }

    if (htmlContent && !textContent) {
      textContent = stripHtml(htmlContent);
    }
    if (textContent && !htmlContent) {
      htmlContent = textContent.replace(/\n/g, '<br>');
    }

    return {
      text: textContent || normalized,
      html: htmlContent || normalized,
    };
  } catch {
    return { text: normalized, html: normalized };
  }
}

export function extractPlainText(body: string): string {
  return parseMultipartEmail(body).text;
}
