import { globSync } from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PackageMetadata } from './PackageMetadata.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 *
 * @param {PackageMetadata} a
 * @param {PackageMetadata} b
 * @returns {number}
 */
function packageSort(a, b) {
  return a.getDirectoryName().localeCompare(b.getDirectoryName());
}

/** Cache of all PackageMetadata for the packages directory */
class PackagesManager {
  /** @type {Array<PackageMetadata>} */
  packages;
  /** @type {Map<string, PackageMetadata>} */
  packagesByNpmName = new Map();
  /** @type {Map<string, PackageMetadata>} */
  packagesByDirectoryName = new Map();

  /**
   * @param {Array<string>} packagePaths
   */
  constructor(packagePaths) {
    this.packages = packagePaths
      .map(packagePath => new PackageMetadata(packagePath))
      .sort(packageSort);
    for (const pkg of this.packages) {
      this.packagesByNpmName.set(pkg.getNpmName(), pkg);
      this.packagesByDirectoryName.set(pkg.getDirectoryName(), pkg);
    }
  }

  /**
   * Get the PackageMetadata for a package by its npm name.
   * @param {string} name
   * @returns {PackageMetadata}
   */
  getPackageByNpmName(name) {
    const pkg = this.packagesByNpmName.get(name);
    if (!pkg) {
      throw new Error(`Missing package with npm name '${name}'`);
    }
    return pkg;
  }

  /**
   * Get the PackageMetadata for a package by its npm name.
   * @param {string} name
   * @returns {PackageMetadata}
   */
  getPackageByDirectoryName(name) {
    const pkg = this.packagesByDirectoryName.get(name);
    if (!pkg) {
      throw new Error(`Missing package with directory name '${name}'`);
    }
    return pkg;
  }

  /**
   * Get the cached metadata for all packages in the packages directory,
   * sorted by directory name.
   * @returns {Array<PackageMetadata>}
   */
  getPackages() {
    return this.packages;
  }

  /**
   * Get the cached metadata for packages in the packages directory
   * where the private field is not set to true.
   * @returns {Array<PackageMetadata>}
   */
  getPublicPackages() {
    return this.packages.filter(pkg => !pkg.isPrivate());
  }
}

export const packagesManager = new PackagesManager(
  globSync(
    path.resolve(
      path.dirname(path.dirname(__dirname)),
      'packages/*/package.json',
    ),
    { windowsPathsNoEscape: true },
  ),
);
