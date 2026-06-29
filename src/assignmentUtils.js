/**
 * Shared assignee and watcher resolution for Taiga work items
 */

import { z } from 'zod';
import { TaigaService } from './taigaService.js';
import { STATUS_LABELS } from './constants.js';

const taigaService = new TaigaService();

export const ASSIGNEE_UNASSIGN_VALUES = ['unassign', 'none'];
export const WATCHERS_NONE_VALUES = ['none'];

export const assigneeSchema = z.string().optional().describe(
  'Assignee username, email, full name, or user ID. Omit to assign current user on create. Use "unassign" or "none" for no assignee.'
);

export const watchersSchema = z.union([
  z.array(z.string()),
  z.literal('none'),
]).optional().describe(
  'Watchers as usernames, emails, full names, or user IDs. Omit for no watchers on create. Use "none" or [] for explicit no watchers.'
);

/**
 * @param {'issue' | 'user_story' | 'task' | 'epic' | 'milestone' | 'wiki'} itemType
 */
export function getAssigneeField(itemType) {
  return itemType === 'epic' ? 'owner' : 'assigned_to';
}

export function supportsAssignee(itemType) {
  return itemType !== 'milestone' && itemType !== 'wiki';
}

export function formatMembersList(members) {
  return members.map(m =>
    `- ${m.full_name} (${m.user_email || m.email || m.username}) - ID: ${m.user}`
  ).join('\n');
}

export async function resolveProjectMember(projectId, userIdentifier, members = null) {
  const projectMembers = members || await taigaService.getProjectMembers(projectId);
  const parsedId = parseInt(userIdentifier, 10);

  let member = projectMembers.find(m =>
    m.full_name === userIdentifier ||
    (!Number.isNaN(parsedId) && m.user === parsedId) ||
    m.email === userIdentifier ||
    m.user_email === userIdentifier ||
    m.username === userIdentifier ||
    m.full_name?.toLowerCase() === userIdentifier.toLowerCase()
  );

  if (!member) {
    const currentUser = await taigaService.getCurrentUser();
    const normalized = userIdentifier.toLowerCase();
    const matchesCurrentUser =
      currentUser.username?.toLowerCase() === normalized ||
      currentUser.full_name?.toLowerCase() === normalized ||
      currentUser.full_name_display?.toLowerCase() === normalized ||
      currentUser.email?.toLowerCase() === normalized;

    if (matchesCurrentUser) {
      member = projectMembers.find(m => m.user === currentUser.id);
    }
  }

  return member;
}

export async function resolveAssignee(projectId, assignee, { defaultToCurrentUser = false } = {}) {
  if (assignee === undefined) {
    if (defaultToCurrentUser) {
      return await taigaService.getCurrentUserId();
    }
    return undefined;
  }

  if (ASSIGNEE_UNASSIGN_VALUES.includes(assignee.toLowerCase())) {
    return null;
  }

  const member = await resolveProjectMember(projectId, assignee);
  if (!member) {
    const members = await taigaService.getProjectMembers(projectId);
    throw new Error(
      `User "${assignee}" not found in project. Available members:\n${formatMembersList(members)}`
    );
  }

  return member.user;
}

export async function resolveWatchers(projectId, watchers, { defaultToEmpty = true, skipIfUndefined = false } = {}) {
  if (watchers === undefined) {
    if (skipIfUndefined) {
      return undefined;
    }
    return defaultToEmpty ? [] : undefined;
  }

  if (watchers === 'none' || (Array.isArray(watchers) && watchers.length === 0)) {
    return [];
  }

  if (!Array.isArray(watchers)) {
    throw new Error('Invalid watchers format. Use an array of user identifiers or "none".');
  }

  const members = await taigaService.getProjectMembers(projectId);
  const watcherIds = [];

  for (const watcher of watchers) {
    if (typeof watcher === 'string' && ASSIGNEE_UNASSIGN_VALUES.includes(watcher.toLowerCase())) {
      continue;
    }

    const member = await resolveProjectMember(projectId, watcher, members);
    if (!member) {
      throw new Error(
        `Watcher "${watcher}" not found in project. Available members:\n${formatMembersList(members)}`
      );
    }

    watcherIds.push(member.user);
  }

  return [...new Set(watcherIds)];
}

export function mergeBatchAssignment(batchAssignee, batchWatchers, itemAssignee, itemWatchers) {
  return {
    assignee: itemAssignee !== undefined ? itemAssignee : batchAssignee,
    watchers: itemWatchers !== undefined ? itemWatchers : batchWatchers,
  };
}

export async function buildCreateAssignmentFields(itemType, projectId, assignee, watchers) {
  const fields = {};
  let assignedTo;
  let watcherIds;

  if (supportsAssignee(itemType)) {
    assignedTo = await resolveAssignee(projectId, assignee, { defaultToCurrentUser: true });
    fields[getAssigneeField(itemType)] = assignedTo;
  }

  watcherIds = await resolveWatchers(projectId, watchers, { defaultToEmpty: true });
  return { fields, assignedTo, watcherIds };
}

export async function buildUpdateAssignmentFields(itemType, projectId, assignee, watchers) {
  const fields = {};
  let assignedTo;
  let watcherIds;

  if (assignee !== undefined && supportsAssignee(itemType)) {
    assignedTo = await resolveAssignee(projectId, assignee, { defaultToCurrentUser: false });
    fields[getAssigneeField(itemType)] = assignedTo;
  }

  if (watchers !== undefined) {
    watcherIds = await resolveWatchers(projectId, watchers, { defaultToEmpty: true, skipIfUndefined: false });
    fields.watchers = watcherIds;
  }

  return { fields, assignedTo, watcherIds };
}

export async function applyWatchersAfterCreate(itemType, itemId, watchers, watcherIds) {
  if (watchers !== undefined || watcherIds.length > 0) {
    return await taigaService.updateWorkItem(itemType, itemId, { watchers: watcherIds });
  }

  return null;
}

export function formatAssignmentDetails(item, assignedTo, watcherIds) {
  const lines = [];

  if (assignedTo !== undefined || item?.assigned_to_extra_info || item?.owner_extra_info) {
    const assigneeName = item?.assigned_to_extra_info?.full_name
      || item?.assigned_to_extra_info?.full_name_display
      || item?.assigned_to_extra_info?.username
      || item?.owner_extra_info?.full_name
      || (assignedTo === null ? STATUS_LABELS.UNASSIGNED : assignedTo ? `User ID ${assignedTo}` : STATUS_LABELS.UNASSIGNED);
    lines.push(`- Assigned to: ${assigneeName}`);
  }

  if (watcherIds !== undefined) {
    lines.push(`- Watchers: ${watcherIds.length}${watcherIds.length ? ` (IDs: ${watcherIds.join(', ')})` : ''}`);
  } else if (item?.watchers) {
    lines.push(`- Watchers: ${item.watchers.length}`);
  }

  return lines.join('\n');
}
