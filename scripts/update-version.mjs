import { packagesManager } from './shared/PackageManager.mjs';
import { PackageMetadata } from './shared/PackageMetadata.mjs';
import { readMonorepoPackageJson } from './shared/readMonorepoPackageJson.mjs';

const version = readMonorepoPackageJson().version;

console.log('VERSION =', version);

/**
 * - Set the version to the monorepo ./package.json version
 * - Update dependencies, devDependencies, and peerDependencies
 * - Update the exports map and set other required default fields
 * @param {PackageMetadata} pkg
 */
function updatePackage(pkg) {
  const newPkg = { ...pkg.packageJson };
  const name = newPkg.name;
  delete newPkg.version;
  delete newPkg.name;

  pkg.packageJson = { name, version, ...newPkg };
  updateDependencies(pkg);
  pkg.writeSync();
}

/**
 * Update every package.json in the packages/ and examples/ directories
 *
 * - Set the version to the monorepo ./package.json version
 * - Update the versions of monorepo dependencies, devDependencies, and peerDependencies
 * - Update the exports map and set other required default fields
 *
 */
function updateVersion() {
  packagesManager.getPackages().forEach(updatePackage);
}

/**
 * Replace the dependency map at packageJson[key] in-place with
 * deps sorted lexically by key. If deps was empty, it will be removed.
 *
 * @param {Record<string, any>} packageJson
 * @param {'dependencies'|'peerDependencies'} key
 * @param {Record<string, string>} deps
 */
function sortDependencies(packageJson, key, deps) {
  const entries = Object.entries(deps);
  if (entries.length === 0) {
    delete packageJson[key];
  } else {
    packageJson[key] = Object.fromEntries(
      entries.sort((a, b) => a[0].localeCompare(b[0])),
    );
  }
}

/**
 * @param {PackageMetadata} pkg
 */
function updateDependencies(pkg) {
  const { packageJson } = pkg;
  const {
    dependencies = {},
    peerDependencies = {},
    devDependencies = {},
  } = packageJson;
  sortDependencies(packageJson, 'dependencies', dependencies);
  sortDependencies(packageJson, 'devDependencies', devDependencies);
  sortDependencies(packageJson, 'peerDependencies', peerDependencies);
}

updateVersion();
