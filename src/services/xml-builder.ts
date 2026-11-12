function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface UploadMetadataRequest {
  batch_name: string;
  description?: string;
  file_name: string;
  file_size: number;
  file_sha256: string;
}

export class XmlBuilder {
  public static buildUploadRequest(data: UploadMetadataRequest): string {
    const desc = data.description ? `<description>${escapeXml(data.description)}</description>` : '<description></description>';
    return `<?xml version="1.0" encoding="UTF-8"?>
<upload_request>
  <batch_name>${escapeXml(data.batch_name.trim())}</batch_name>
  ${desc}
  <file_name>${escapeXml(data.file_name.trim())}</file_name>
  <file_size>${Math.floor(data.file_size)}</file_size>
  <file_sha256>${escapeXml(data.file_sha256.toLowerCase().trim())}</file_sha256>
</upload_request>`;
  }

  public static buildCommitRequest(reviewConfirmed = true): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<commit_request>
  <review_confirmed>${reviewConfirmed ? 'true' : 'false'}</review_confirmed>
</commit_request>`;
  }
}

