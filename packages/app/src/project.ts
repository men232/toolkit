import { assert, getFileExtension, isString, uniq } from '@andrew_l/toolkit';

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

import { getColor } from 'consola/utils';
import { CONFIG } from './config.js';
import { log } from './logger.js';

const TYPESCRIPT_EXTENSIONS = ['mts', 'cts', 'ts'];
const JAVASCRIPT_EXTENSIONS = ['js', 'mjs', 'cjs'];

const ALL_EXTENSIONS = [
  ...TYPESCRIPT_EXTENSIONS,
  ...JAVASCRIPT_EXTENSIONS,
  'json',
];

export interface Project {
  /**
   * Project absolute path
   */
  path: string;

  /**
   * Project name from package.json
   */
  name: string;

  /**
   * Project description form package.json
   */
  description: string;

  /**
   * Project version from package.json
   */
  version: string;

  /**
   * tsconfig file absolute path
   */
  tsconfigPath: string | null;

  /**
   * Dotenv file absolute path
   */
  dotenvPath: string | null;

  /**
   * Files to be auto imported during application launching.
   */
  autoImports: string[];

  /**
   * A list of directories to check where a file can be located for import
   */
  importLookupPaths: string[];

  /**
   * Package json data
   */
  packageJson: Record<string, any>;

  /**
   * Indicates typescript import supports
   */
  allowTs: boolean;
}

/**
 * Create a project instance from path
 */
export function createProject(projectPath: string): Project {
  const packageJsonPath = locateNearestFile(projectPath, 'package.json');

  assert.ok(
    packageJsonPath,
    'package.json not found in path: ' + path.dirname(projectPath),
  );

  const packageJson = importJson(packageJsonPath);
  const projectLocation = path.dirname(packageJsonPath);

  const project: Project = {
    path: projectLocation,
    name: packageJson.name || path.basename(projectPath),
    description: packageJson.description || '',
    version: packageJson.version || '0.0.0',
    tsconfigPath: locateNearestFile(projectLocation, 'tsconfig.json'),
    dotenvPath: locateNearestFile(projectLocation, '.env'),
    autoImports: ['inversify.config'],
    importLookupPaths: createImportLookupPaths(projectLocation),
    allowTs: false,
    packageJson,
  };

  project.autoImports = project.autoImports
    .map(v => projectResolveFile(project, v))
    .filter(isString);

  return project;
}

/**
 * Lookup and import file from project
 */
export function projectImportFile<T = any>(
  project: Project,
  filePath: string,
): Promise<T> {
  const existedFile = projectResolveFile(project, filePath);

  if (!existedFile) {
    throw new Error(
      `Cannot resolve import for path.\n Path:\n  ${filePath}\n Available extensions: ${ALL_EXTENSIONS.join(', ')}`,
    );
  }

  const ext = getFileExtension(existedFile, false);

  if (ext === 'json') {
    const data = importJson(existedFile);
    return Promise.resolve({ default: data } as T);
  }

  return import(existedFile);
}

/**
 * Resolve absolute file path for import
 */
export function projectResolveFile(
  project: Project,
  filePath: string,
): string | null {
  const pathVariants: string[] = project.importLookupPaths.map(dir =>
    path.resolve(dir, filePath),
  );

  for (const filePath of pathVariants) {
    const pathVariants = ALL_EXTENSIONS.includes(
      getFileExtension(filePath, false)!,
    )
      ? [filePath]
      : [...ALL_EXTENSIONS.map(ext => `${filePath}.${ext}`)];

    const existedPath = pathVariants.find(v => fs.existsSync(v));

    if (existedPath) {
      return existedPath;
    }
  }

  return null;
}

export async function projectLoadEnv(project: Project): Promise<boolean> {
  if (!project.dotenvPath) {
    return false;
  }

  dotenv.config({
    path: project.dotenvPath,
    quiet: true,
  });

  return true;
}

export async function projectAutoImport(project: Project): Promise<string[]> {
  const result: string[] = [];
  const filePaths = project.autoImports.map(filePath =>
    projectResolveFile(project, filePath),
  );

  for (const filePath of filePaths) {
    if (filePath) {
      await projectImportFile(project, filePath);
      result.push(filePath.replace(project.path, ''));
    }
  }

  return result;
}

export function projectPrintInfo(project: Project) {
  const tags: string[] = [];

  if (project.allowTs) {
    tags.push(getColor('bgBlue')(' TS '));
  }

  if (CONFIG.WATCH_MODE) {
    tags.push(getColor('bgMagenta')(' WATCH '));
  }

  if (project.dotenvPath) {
    tags.push(getColor('bgYellow')(` ${path.basename(project.dotenvPath)} `));
  }

  if (project.autoImports.length) {
    tags.push(
      getColor('bgGreen')(
        ` IMPORT: ${project.autoImports.map(v => path.relative(project.path, v)).join(' | ')} `,
      ),
    );
  }

  log.info(
    '%s (%s)%s',
    project.name,
    project.version,
    tags.length ? ` ${tags.join(' ')}` : '',
  );
}

function createImportLookupPaths(
  projectPath: string,
  appRoot: string | null = CONFIG.APP_ROOT,
): string[] {
  const cwd = process.cwd();
  const result: string[] = [];

  if (appRoot) {
    result.push(path.resolve(cwd, appRoot));
  }

  result.push(path.resolve(cwd));
  result.push(path.resolve(projectPath));

  return uniq(result);
}

function locateNearestFile(location: string, fileName: string): string | null {
  let currentDir = path.extname(location)
    ? path.dirname(path.resolve(location))
    : path.resolve(location);

  while (currentDir) {
    const filePath = path.join(currentDir, fileName);

    if (fs.existsSync(filePath)) {
      return filePath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;

    currentDir = parentDir;
  }

  return null;
}

function importJson(filePath: string): any {
  if (!filePath.endsWith('.json')) {
    filePath += '.json';
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON file not found.\n Path:\n  ${filePath}`);
  }

  const data = fs.readFileSync(filePath, { encoding: 'utf-8' });
  return JSON.parse(data);
}
