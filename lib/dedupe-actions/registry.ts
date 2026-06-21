import { deleteWithRetentionDefinition, deleteWithRetentionExecutor } from '@/lib/dedupe-actions/builtins/delete-with-retention';
import { moveToArchiveDefinition, moveToArchiveExecutor } from '@/lib/dedupe-actions/builtins/move-to-archive';
import { moveToDupesDefinition, moveToDupesExecutor } from '@/lib/dedupe-actions/builtins/move-to-dupes';
import { moveToFolderDefinition, moveToFolderExecutor } from '@/lib/dedupe-actions/builtins/move-to-folder';
import { moveToTrashDefinition, moveToTrashExecutor } from '@/lib/dedupe-actions/builtins/move-to-trash';
import { reviewOnlyDefinition, reviewOnlyExecutor } from '@/lib/dedupe-actions/builtins/review-only';
import type {
  DedupeActionContext,
  DedupeActionDefinition,
  DedupeActionExecutor,
  DedupeActionId,
} from '@/lib/dedupe-actions/types';

const definitions: DedupeActionDefinition[] = [
  reviewOnlyDefinition,
  moveToFolderDefinition,
  moveToDupesDefinition,
  moveToTrashDefinition,
  moveToArchiveDefinition,
  deleteWithRetentionDefinition,
];

const executors = new Map<DedupeActionId, DedupeActionExecutor>([
  ['review_only', reviewOnlyExecutor],
  ['move_to_folder', moveToFolderExecutor],
  ['move_to_dupes', moveToDupesExecutor],
  ['move_to_trash', moveToTrashExecutor],
  ['move_to_archive', moveToArchiveExecutor],
  ['delete_with_retention', deleteWithRetentionExecutor],
]);

export function registerBuiltinActions(): void {
  // Built-ins are registered at module load via the maps above.
}

export function getActionDefinitions(): DedupeActionDefinition[] {
  return [...definitions];
}

export function getExecutor(id: DedupeActionId): DedupeActionExecutor | undefined {
  return executors.get(id);
}

export function listEnabledActions(ctx: DedupeActionContext): DedupeActionDefinition[] {
  return definitions.filter((definition) => definition.enabled(ctx));
}

registerBuiltinActions();