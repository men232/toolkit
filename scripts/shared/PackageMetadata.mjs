import fs from 'fs-extra';
import path from 'node:path';

/**
 * @typedef {Object} ModuleExportEntry
 * @property {string} name
 * @property {string} sourceFileName
 */

/**
 * @typedef {Record<'types' | 'development' | 'production' | 'node' | 'default', string>} ImportCondition
 * @typedef {Record<'types' | 'development' | 'production' | 'default', string>} RequireCondition
 * @typedef {readonly [string, { import: ImportCondition; require: RequireCondition }]} NpmModuleExportEntry
 */

/**
 * Metadata abstraction for a package.json file
 */
export class PackageMetadata {
  /** @type {string} the path to the package.json file */
  packageJsonPath;
  /** @type {Record<string, any>} the parsed package.json */
  packageJson;

  /**
   * @param {string} packageJsonPath the path to the package.json file
   */
  constructor(packageJsonPath) {
    this.packageJsonPath = packageJsonPath;
    this.packageJson = fs.readJsonSync(packageJsonPath);
  }

  /**
   * @param {...string} paths to resolve in this package's directory
   * @returns {string} Resolve a path in this package's directory
   */
  resolve(...paths) {
    return path.resolve(path.dirname(this.packageJsonPath), ...paths);
  }

  /**
   * @returns {string} the directory name of the package, e.g. 'core'
   */
  getDirectoryName() {
    return path.basename(path.dirname(this.packageJsonPath));
  }

  /**
   * @returns {string} the npm name of the package, e.g. '@andrew_l/toolkit'
   */
  getNpmName() {
    return this.packageJson.name;
  }

  /**
   * @returns {boolean} whether the package is marked private (not published to npm)
   */
  isPrivate() {
    return !!this.packageJson.private;
  }

  /**
   * Writes this.packageJson back to this.packageJsonPath
   */
  writeSync() {
    fs.writeJsonSync(this.packageJsonPath, this.packageJson, { spaces: 2 });
  }
}
