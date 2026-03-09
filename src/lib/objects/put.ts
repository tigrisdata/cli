import { createReadStream, statSync } from 'fs';
import { Readable } from 'stream';
import { getOption } from '../../utils/options.js';
import { formatOutput, formatSize } from '../../utils/format.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { put } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';
import { calculateUploadParams } from '../../utils/upload.js';

const context = msg('objects', 'put');

export default async function putObject(options: Record<string, unknown>) {
  printStart(context);

  const bucket = getOption<string>(options, ['bucket']);
  const key = getOption<string>(options, ['key']);
  const file = getOption<string>(options, ['file']);
  const access = getOption<string>(options, ['access', 'a', 'A'], 'private');
  const contentType = getOption<string>(options, [
    'content-type',
    'contentType',
    't',
    'T',
  ]);
  const format = getOption<string>(options, ['format', 'f', 'F'], 'table');

  if (!bucket) {
    handleError({ message: 'Bucket name is required' });
  }

  if (!key) {
    handleError({ message: 'Object key is required' });
  }

  // Check for stdin or file input
  const hasStdin = !process.stdin.isTTY;

  if (!file && !hasStdin) {
    handleError({ message: 'File path is required (or pipe data via stdin)' });
  }

  let body: ReadableStream;
  let fileSize: number | undefined;

  if (file) {
    // Read from file
    try {
      const stats = statSync(file);
      fileSize = stats.size;
    } catch {
      handleError({ message: `File not found: ${file}` });
    }
    const fileStream = createReadStream(file);
    body = Readable.toWeb(fileStream) as ReadableStream;
  } else {
    // Read from stdin
    body = Readable.toWeb(process.stdin) as ReadableStream;
  }

  const config = await getStorageConfig({ withCredentialProvider: true });

  // For stdin (no file), always use multipart since we don't know the size
  const uploadParams = file
    ? calculateUploadParams(fileSize)
    : { multipart: true, partSize: 5 * 1024 * 1024, queueSize: 8 };

  const { data, error } = await put(key, body, {
    access: access === 'public' ? 'public' : 'private',
    contentType,
    ...uploadParams,
    onUploadProgress: isJsonMode() ? undefined : ({ loaded, percentage }) => {
      if (fileSize !== undefined && fileSize > 0) {
        process.stdout.write(
          `\rUploading: ${formatSize(loaded)} / ${formatSize(fileSize)} (${percentage}%)`
        );
      } else {
        process.stdout.write(`\rUploading: ${formatSize(loaded)}`);
      }
    },
    config: {
      ...config,
      bucket,
    },
  });

  // Clear the progress line
  if (!isJsonMode()) {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
  }

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({
      key,
      bucket,
      path: data.path,
      size: data.size ?? fileSize ?? 0,
      contentType: data.contentType || undefined,
      modified: data.modified,
    });
    return;
  }

  const result = [
    {
      path: data.path,
      size: formatSize(data.size ?? fileSize ?? 0),
      contentType: data.contentType || '-',
      modified: data.modified,
    },
  ];

  const output = formatOutput(result, format!, 'objects', 'object', [
    { key: 'path', header: 'Path' },
    { key: 'size', header: 'Size' },
    { key: 'contentType', header: 'Content-Type' },
    { key: 'modified', header: 'Modified' },
  ]);

  console.log(output);
  printSuccess(context, { key, bucket });
}
