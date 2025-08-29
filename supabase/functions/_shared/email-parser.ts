// Email parsing utilities for handling multipart MIME messages

export interface ParsedEmailContent {
  text: string;
  html: string;
}

export function parseMultipartEmail(body: string): ParsedEmailContent {
  if (!body || !body.includes('multipart')) {
    // Not a multipart email, return as-is
    return {
      text: body || '',
      html: body || ''
    };
  }

  let textContent = '';
  let htmlContent = '';

  try {
    // Find boundary
    const boundaryMatch = body.match(/boundary[=:][\s]*["']?([^"'\s;]+)/i);
    if (!boundaryMatch) {
      return { text: body, html: body };
    }

    const boundary = boundaryMatch[1];
    
    // Split by boundary
    const parts = body.split(`--${boundary}`);
    
    for (const part of parts) {
      if (!part.trim() || part.includes('--')) continue;
      
      // Parse headers and content
      const headerEndIndex = part.indexOf('\n\n');
      if (headerEndIndex === -1) continue;
      
      const headers = part.substring(0, headerEndIndex);
      let content = part.substring(headerEndIndex + 2).trim();
      
      // Check content type
      const contentTypeMatch = headers.match(/Content-Type:\s*([^;\n]+)/i);
      const transferEncodingMatch = headers.match(/Content-Transfer-Encoding:\s*([^\n]+)/i);
      
      if (!contentTypeMatch) continue;
      
      const contentType = contentTypeMatch[1].trim().toLowerCase();
      const transferEncoding = transferEncodingMatch?.[1]?.trim().toLowerCase() || '7bit';
      
      // Decode content based on transfer encoding
      content = decodeContent(content, transferEncoding);
      
      // Store based on content type
      if (contentType.includes('text/plain')) {
        textContent = content;
      } else if (contentType.includes('text/html')) {
        htmlContent = content;
      }
    }
    
    // If we have HTML but no text, try to extract text from HTML
    if (htmlContent && !textContent) {
      textContent = stripHtml(htmlContent);
    }
    
    // If we have text but no HTML, use text for both
    if (textContent && !htmlContent) {
      htmlContent = textContent.replace(/\n/g, '<br>');
    }
    
    return {
      text: textContent || body,
      html: htmlContent || body
    };
    
  } catch (error) {
    console.error('Error parsing multipart email:', error);
    return { text: body, html: body };
  }
}

function decodeContent(content: string, encoding: string): string {
  try {
    switch (encoding) {
      case 'quoted-printable':
        return decodeQuotedPrintable(content);
      case 'base64':
        return atob(content.replace(/\s/g, ''));
      case '7bit':
      case '8bit':
      case 'binary':
      default:
        return content;
    }
  } catch (error) {
    console.error('Error decoding content:', error);
    return content;
  }
}

function decodeQuotedPrintable(input: string): string {
  return input
    .replace(/=\r?\n/g, '') // soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/=3D/g, '=')
    .replace(/=20/g, ' ')
    .replace(/=22/g, '"');
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}