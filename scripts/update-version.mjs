import { packagesManager } from './shared/PackageManager.mjs';
import { PackageMetadata } from './shared/PackageMetadata.mjs';
import { readMonorepoPackageJson } from './shared/readMonorepoPackageJson.mjs';

const version = readMonorepoPackageJson().version;

console.log('VERSION =', version);

const AUTHOR = 'Andrew L. <andrew.io.dev@gmail.com>';
const REPOSITORY_URL = 'https://github.com/men232/toolkit';
const DOCS_URL = 'https://men232.github.io/toolkit';

/** Fields listed first in every package.json, in this order */
const FIELD_ORDER = [
  'name',
  'version',
  'description',
  'keywords',
  'author',
  'license',
  'homepage',
  'repository',
  'bugs',
];

/**
 * - Set the version to the monorepo ./package.json version
 * - Update dependencies, devDependencies, and peerDependencies
 * - Update the exports map and set other required default fields
 * @param {PackageMetadata} pkg
 */
function updatePackage(pkg) {
  const newPkg = { ...pkg.packageJson, version };

  updateMetadata(pkg, newPkg);

  // Re-key so FIELD_ORDER leads, with any remaining fields kept in place after
  pkg.packageJson = {
    ...Object.fromEntries(
      FIELD_ORDER.filter(key => newPkg[key] !== undefined).map(key => [
        key,
        newPkg[key],
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(newPkg).filter(([key]) => !FIELD_ORDER.includes(key)),
    ),
  };

  updateDependencies(pkg);
  pkg.writeSync();
}

/**
 * Set the fields npm renders on a package page — without them the published
 * package has no link back to its documentation or issue tracker.
 *
 * @param {PackageMetadata} pkg
 * @param {Record<string, any>} packageJson the draft being assembled
 */
function updateMetadata(pkg, packageJson) {
  packageJson.author = AUTHOR;
  packageJson.license ??= 'MIT';
  packageJson.homepage = `${DOCS_URL}/reference/${pkg.getNpmName()}/`;
  packageJson.bugs = `${REPOSITORY_URL}/issues`;
  packageJson.repository = {
    type: 'git',
    url: `git+${REPOSITORY_URL}.git`,
    directory: `packages/${pkg.getDirectoryName()}`,
  };
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
