import { onShutdown, processGraceful } from '@andrew_l/graceful';
import { assert, defer, isSkip, noop } from '@andrew_l/toolkit';
import { Command, Option } from 'commander';

import fs from 'node:fs';
import path from 'node:path';
import {
  type AppDefinition,
  type AppInstance,
  appWaitShutdown,
  isAppDefinition,
  shutdownApp,
  startApp,
} from '../app.js';
import { createAppHub } from '../appHub.js';
import { createAppThread } from '../appThread.ts';
import { CONFIG } from '../config.js';
import { log } from '../logger.js';
import {
  type Project,
  createProject,
  projectAutoImport,
  projectImportFile,
  projectLoadEnv,
  projectPrintInfo,
} from '../project.js';
import { isHelpArgument } from '../utils/args.js';
import { db } from '../utils/db.js';
import { propsToOptions } from '../utils/props.js';

export interface RunAppOptions {
  scriptFile?: string;
  cliName?: string;
  cliDescription?: string;
  argv?: string[];
}

export function runApp({
  scriptFile,
  cliName = 'app',
  cliDescription = 'Application cli',
  argv = process.argv,
}: RunAppOptions): Promise<void> {
  const promise = scriptFile
    ? loadScriptCommand(scriptFile)
    : Promise.resolve(buildRootCommand({ cliName, cliDescription }));

  return promise
    .then(program => program.parseAsync(['node', cliName, ...argv]))
    .then(noop)
    .catch(error => {
      log.error('Failed to run app:', error);
      process.exit(1);
    });
}

function buildRootCommand({
  cliDescription,
  cliName,
}: Omit<Required<RunAppOptions>, 'scriptFile' | 'argv'>): Command {
  const program = new Command()
    .name(cliName)
    .description(cliDescription)
    .enablePositionalOptions()
    .passThroughOptions()
    .helpOption(false)
    .helpCommand(false)
    .action(function () {
      const cmd = this;
      if (isHelpArgument(cmd.args)) {
        return cmd.help();
      }
    });

  program
    .command('start', { isDefault: true })
    .argument('<string...>', 'Path to script file')
    .description('Start application.')
    .addOption(new Option('--watch', 'Watch file changes'))
    .addOption(new Option('--dev', 'Allow to import ts files'))
    .passThroughOptions(true)
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(function (scriptFiles: string[], _opts) {
      assert.arrayStrings(scriptFiles, 'scriptFiles expected string[]');

      const cmd = this;
      const remainingArgs = cmd.args;
      const flagIdx = scriptFiles.findIndex(v => v.startsWith('-'));

      scriptFiles = (
        flagIdx > -1 ? scriptFiles.slice(0, flagIdx) : scriptFiles
      ).filter(v => !v.startsWith('-'));

      if (!scriptFiles.length) {
        return cmd.parent?.args?.includes('start')
          ? cmd.help()
          : program.help();
      }

      const project = createProject(path.resolve(scriptFiles[0]));

      return Promise.resolve()
        .then(() => registerTsx(project))
        .then(() => loadProject(project))
        .then(() =>
          Promise.all(scriptFiles.map(f => loadAppDefinition(project, f))),
        )
        .then(apps => buildStartCommand(apps))
        .then(appCmd => {
          if (isHelpArgument(remainingArgs)) {
            return appCmd.help();
          }

          return appCmd.parseAsync(remainingArgs, { from: 'user' });
        })
        .then(noop);
    });

  program
    .command('json')
    .description(
      'Start apps from a JSON file containing an array of script paths.',
    )
    .argument('[string]', 'Path to JSON file')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(function (jsonFile) {
      const cmd = this;
      if (!jsonFile || isHelpArgument(jsonFile)) {
        return cmd.help();
      }

      const project = createProject(path.dirname(path.resolve(jsonFile)));
      const remainingArgs = cmd.args;

      return Promise.resolve()
        .then(() => registerTsx(project))
        .then(() => loadProject(project))
        .then(() =>
          projectImportFile<{ default: unknown }>(
            project,
            path.resolve(jsonFile),
          ),
        )
        .then(m => {
          const paths = m.default;

          assert.arrayStrings(paths, 'JSON file must contain a string[].');

          return paths.map(p =>
            path.resolve(path.dirname(path.resolve(jsonFile)), p),
          );
        })
        .then(scriptFiles =>
          Promise.all(scriptFiles.map(f => loadAppDefinition(project, f))),
        )
        .then(apps => buildStartCommand(apps))
        .then(appCmd => {
          if (isHelpArgument(remainingArgs)) {
            return appCmd.help();
          }

          return appCmd.parseAsync(remainingArgs, { from: 'user' });
        })
        .then(noop);
    });

  program
    .command('list')
    .description('Interactively pick apps to run from a folder.')
    .argument('[string]', 'Path to folder', '.')
    .addOption(
      new Option('--pattern <glob>', 'Glob pattern for app files').default(
        '**/*.{app,worker}.{ts,js}',
      ),
    )
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(function (folderPath, opts) {
      const cmd = this;
      if (isHelpArgument(cmd.args)) {
        return cmd.help();
      }

      const remainingArgs = cmd.args;
      const project = createProject(path.resolve(folderPath));

      return Promise.resolve()
        .then(() => registerTsx(project))
        .then(() => loadProject(project))
        .then(() => findAppFiles(path.resolve(folderPath), opts.pattern))
        .then(scriptFiles => {
          if (!scriptFiles.length) {
            log.error('No files found. Pattern: %s', opts.pattern);
            process.exit(1);
          }

          const lastRun = (() => {
            const stored = db.get('app_last_run');
            if (!stored) return undefined;
            try {
              return JSON.parse(stored) as string[];
            } catch {
              return [stored];
            }
          })();

          return log.prompt('Pick apps to run.', {
            type: 'multiselect',
            options: scriptFiles.map(f => ({
              label: path.basename(f),
              value: f,
            })),
            initial: lastRun,
            cancel: 'null',
          });
        })
        .then(selected => {
          const selectedFiles = (selected as string[] | null) || [];
          if (!selectedFiles.length) process.exit(0);

          db.set('app_last_run', JSON.stringify(selectedFiles));
          db.save();

          return Promise.all(
            selectedFiles.map(f => loadAppDefinition(project, f)),
          );
        })
        .then(apps => buildStartCommand(apps))
        .then(appCmd => {
          if (isHelpArgument(remainingArgs)) {
            return appCmd.help();
          }

          return appCmd.parseAsync(remainingArgs, { from: 'user' });
        })
        .then(noop);
    });

  program
    .command('folder')
    .description('Start all apps found in a folder.')
    .argument('<string>', 'Path to folder')
    .addOption(
      new Option('--pattern <glob>', 'Glob pattern for app files').default(
        '**/*.{ts,js}',
      ),
    )
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(function (folderPath, opts) {
      const cmd = this;
      if (!folderPath || isHelpArgument(folderPath)) {
        return cmd.help();
      }

      const remainingArgs = cmd.args;
      const project = createProject(path.resolve(folderPath));

      return Promise.resolve()
        .then(() => registerTsx(project))
        .then(() => loadProject(project))
        .then(() => findAppFiles(path.resolve(folderPath), opts.pattern))
        .then(scriptFiles => {
          if (!scriptFiles.length) {
            log.error('No files found. Pattern: %s', opts.pattern);
            process.exit(1);
          }

          return Promise.all(
            scriptFiles.map(f => loadAppDefinition(project, f)),
          );
        })

        .then(apps => {
          if (!apps.length) {
            log.error('No valid AppDefinitions found in folder.');
            process.exit(1);
          }

          return apps;
        })
        .then(apps => buildStartCommand(apps))
        .then(appCmd => {
          if (isHelpArgument(remainingArgs)) {
            return appCmd.help();
          }

          return appCmd.parseAsync(remainingArgs, { from: 'user' });
        })
        .then(noop);
    });

  return program;
}

function findAppFiles(folderPath: string, pattern: string): string[] {
  return fs
    .globSync(pattern, {
      cwd: folderPath,
      exclude: f => f.includes('node_modules'),
    })
    .map(f => path.resolve(folderPath, f))
    .sort();
}

function loadScriptCommand(scriptFile: string): Promise<Command> {
  const project = createProject(path.dirname(scriptFile));

  return Promise.resolve()
    .then(() => registerTsx(project))
    .then(() => loadProject(project))
    .then(() => loadAppDefinition(project, scriptFile))
    .then(app => buildStartCommand([app]));
}

function registerTsx(project: Project): Promise<void> {
  if (CONFIG.TS_MODE === 'tsx') {
    project.allowTs = true;
    return Promise.resolve();
  }

  if (CONFIG.TS_MODE === 'tsx-register') {
    return Promise.resolve()
      .then(() => import('tsx/esm/api'))
      .then(m => m.register({ tsconfig: project.tsconfigPath || false }))
      .then(() => {
        project.allowTs = true;
      });
  }

  return Promise.resolve();
}

function loadProject(project: Project): Promise<void> {
  projectPrintInfo(project);

  return Promise.resolve()
    .then(() => projectLoadEnv(project))
    .then(() => projectAutoImport(project))
    .then(noop);
}

function loadAppDefinition(
  project: Project,
  scriptFile: string,
): Promise<AppDefinition> {
  return projectImportFile(project, scriptFile).then(appModule => {
    const app = appModule.default;

    if (!isAppDefinition(app)) {
      log.warn(`Default export must be a app definition: ${scriptFile}`);
      process.exit(1);
    }

    return app;
  });
}

function buildStartCommand(definitions: AppDefinition[]): Command {
  const rootDefinition =
    definitions.length > 1 ? createAppHub(definitions) : definitions[0];

  const program = new Command()
    .name(rootDefinition.name)
    .description(rootDefinition.description || 'An application');

  if (rootDefinition.props) {
    for (const option of propsToOptions(rootDefinition.props)) {
      program.addOption(option);
    }
  }

  program
    .addOption(
      new Option('--threads <number>', 'Amount of threads')
        .default(0)
        .argParser(v => parseInt(v)),
    )
    .addOption(new Option('--watch', 'Watch file changes'))
    .addOption(new Option('--dev', 'Allow to import ts files'))
    .helpCommand(false)
    .command('start', { isDefault: true, hidden: true })
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(() => {
      const props = program.optsWithGlobals();

      if (definitions.length === 1 && props.threads > 1) {
        return launchApp(createAppThread(rootDefinition), props);
      }

      return launchApp(rootDefinition, props);
    });

  return program;
}

function launchApp(
  definition: AppDefinition,
  props: Record<string, any>,
): Promise<void> {
  const startDefer = defer<void>();
  let app: AppInstance | undefined;

  onShutdown('app', () => {
    log.warn('Graceful shutdown initiated, waiting for process to complete');

    if (CONFIG.TS_MODE === 'tsx') {
      log.warn('Graceful in tsx + watch mode is not supported.');
    }

    // Wait until app fully started
    return startDefer.promise.then(() => {
      if (app) {
        return shutdownApp(app);
      }
    });
  });

  return startApp(definition, props)
    .then(startResult => {
      if (isSkip(startResult)) {
        startDefer.resolve();
        log.warn('Failed to start %s', startResult);
        return;
      }

      app = startResult.app;
      startDefer.resolve();

      return appWaitShutdown(app);
    })
    .then(() => processGraceful());
}
