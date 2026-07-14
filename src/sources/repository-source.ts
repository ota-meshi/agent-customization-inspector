import path from 'node:path';

import { SourceRoot } from './tool-homes.js';

export function createRepositorySource(repositoryRoot: string): SourceRoot {
  return new SourceRoot({
    layer: 'repository',
    locatorId: 'root',
    label: 'Repository',
    rootPath: path.resolve(repositoryRoot),
  });
}
