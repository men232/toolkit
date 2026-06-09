import path from 'node:path';

export function filePathFromStack(stack: string) {
  const stackLines = stack.trim().split('\n');

  // Find the caller line (skip Error, current function)
  const callerLine = stackLines[0];

  // Handle different stack trace formats across platforms
  let filePath = null;

  // Try different regex patterns for different formats
  const patterns = [
    /\((.+):(\d+):(\d+)\)$/, // (file:line:col)
    /at\s+(.+):(\d+):(\d+)$/, // at file:line:col
    /\s+at\s+(.+):(\d+):(\d+)$/, // at file:line:col with spaces
    /\(file:\/\/(.+):(\d+):(\d+)\)$/, // (file://path:line:col)
    /file:\/\/(.+):(\d+):(\d+)$/, // file://path:line:col
  ];

  for (const pattern of patterns) {
    const match = callerLine.match(pattern);
    if (match) {
      filePath = match[1];
      break;
    }
  }

  if (!filePath) {
    return null;
  }

  // Remove file:// protocol if present
  if (filePath.startsWith('file://')) {
    filePath = filePath.replace('file://', '');
  }

  // Handle Windows drive letters (C:/ becomes C:\)
  if (process.platform === 'win32') {
    // Fix Windows paths that might have forward slashes
    filePath = filePath.replace(/\//g, '\\');

    // Handle UNC paths or drive letters
    if (filePath.match(/^[A-Za-z]:\\/)) {
      // Already a valid Windows path
    } else if (filePath.startsWith('\\')) {
      // UNC path, keep as is
    } else {
      // Might need to add drive letter - use path.resolve
      filePath = path.resolve(filePath);
    }
  }

  // Normalize the path for the current OS
  return path.normalize(filePath);
}
