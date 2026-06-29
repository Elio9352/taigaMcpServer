/**
 * Utility functions for Taiga MCP Server
 */

import { TaigaService } from './taigaService.js';
import { STATUS_LABELS } from './constants.js';

const taigaService = new TaigaService();

/**
 * Resolve project identifier to project ID
 * @param {string} projectIdentifier - Project ID or slug
 * @returns {Promise<string>} - Project ID
 */
export async function resolveProjectId(projectIdentifier) {
  if (!isNaN(projectIdentifier)) {
    return projectIdentifier;
  }

  const project = await taigaService.getProjectBySlug(projectIdentifier);
  return project.id;
}

/**
 * Resolve issue identifier to issue object
 * @param {string} issueIdentifier - Issue ID or reference (#123)
 * @param {string} [projectIdentifier] - Project ID or slug (required for reference)
 * @returns {Promise<Object>} - Issue object
 */
export async function resolveIssue(issueIdentifier, projectIdentifier) {
  // Handle #-prefixed reference numbers
  if (issueIdentifier.startsWith('#')) {
    if (!projectIdentifier) {
      throw new Error('Project identifier is required when using issue reference number');
    }

    const projectId = await resolveProjectId(projectIdentifier);
    const ref = issueIdentifier.substring(1);
    return await taigaService.getIssueByRef(ref, projectId);
  }

  // For pure numbers, try both approaches: first as ID, then as reference number
  if (/^\d+$/.test(issueIdentifier)) {
    // First try as direct Issue ID
    try {
      return await taigaService.getIssue(issueIdentifier);
    } catch (error) {
      // If that fails and we have a project identifier, try as reference number
      if (projectIdentifier) {
        try {
          const projectId = await resolveProjectId(projectIdentifier);
          return await taigaService.getIssueByRef(issueIdentifier, projectId);
        } catch (refError) {
          // If both fail, throw a more helpful error
          throw new Error(`Issue not found by ID "${issueIdentifier}" or reference number "#${issueIdentifier}" in project. Original errors: ID lookup: ${error.message}, Ref lookup: ${refError.message}`);
        }
      } else {
        // No project identifier available, can only try ID
        throw new Error(`Issue ID "${issueIdentifier}" not found. If this is a reference number, please provide projectIdentifier or use "#${issueIdentifier}" format.`);
      }
    }
  }

  // For non-numeric strings, treat as direct ID
  return await taigaService.getIssue(issueIdentifier);
}

/**
 * Resolve user story identifier to user story object
 * @param {string} userStoryIdentifier - User Story ID or reference (#123)
 * @param {string} [projectIdentifier] - Project ID or slug (required for reference)
 * @returns {Promise<Object>} - User Story object
 */
export async function resolveUserStory(userStoryIdentifier, projectIdentifier) {
  if (userStoryIdentifier.startsWith('#')) {
    if (!projectIdentifier) {
      throw new Error('Project identifier is required when using user story reference number');
    }

    const projectId = await resolveProjectId(projectIdentifier);
    const ref = userStoryIdentifier.substring(1);
    return await taigaService.getUserStoryByRef(ref, projectId);
  }

  // For pure numbers, try both approaches: first as ID, then as reference number
  if (/^\d+$/.test(userStoryIdentifier)) {
    try {
      return await taigaService.getUserStory(userStoryIdentifier);
    } catch (error) {
      if (projectIdentifier) {
        try {
          const projectId = await resolveProjectId(projectIdentifier);
          return await taigaService.getUserStoryByRef(userStoryIdentifier, projectId);
        } catch (refError) {
          throw new Error(`User story not found by ID "${userStoryIdentifier}" or reference number "#${userStoryIdentifier}" in project. Original errors: ID lookup: ${error.message}, Ref lookup: ${refError.message}`);
        }
      }

      throw new Error(`User story ID "${userStoryIdentifier}" not found. If this is a reference number, please provide projectIdentifier or use "#${userStoryIdentifier}" format.`);
    }
  }

  return await taigaService.getUserStory(userStoryIdentifier);
}

/**
 * Find status ID by name
 * @param {Array} statuses - Array of status objects
 * @param {string} statusName - Status name to find
 * @returns {number|undefined} - Status ID or undefined if not found
 */
export function findStatusIdByName(statuses, statusName) {
  if (!statusName) return undefined;

  const status = statuses.find(s =>
    s.name.toLowerCase() === statusName.toLowerCase()
  );
  return status?.id;
}

/**
 * Find ID by name in a collection
 * @param {Array} collection - Array of objects with name property
 * @param {string} name - Name to find
 * @returns {number|undefined} - ID or undefined if not found
 */
export function findIdByName(collection, name) {
  if (!name) return undefined;

  const item = collection.find(item =>
    item.name.toLowerCase() === name.toLowerCase()
  );
  return item?.id;
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date or 'Not set'
 */
export function formatDate(dateString) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
}

/**
 * Format datetime for display
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted datetime
 */
export function formatDateTime(dateString) {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleString();
}

/**
 * Calculate completion percentage
 * @param {number} completed - Completed items
 * @param {number} total - Total items
 * @returns {number} - Percentage (0-100)
 */
export function calculateCompletionPercentage(completed, total) {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Create MCP error response
 * @param {string} message - Error message
 * @returns {Object} - MCP error response
 */
export function createErrorResponse(message) {
  return {
    content: [
      {
        type: 'text',
        text: `❌ Error: ${message}`,
      },
    ],
    isError: true,
  };
}

/**
 * Create MCP success response
 * @param {string} text - Response text
 * @returns {Object} - MCP success response
 */
export function createSuccessResponse(text) {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Get status label (Active/Closed)
 * @param {boolean} closed - Whether item is closed
 * @returns {string} - Status label
 */
export function getStatusLabel(closed) {
  return closed ? STATUS_LABELS.CLOSED : STATUS_LABELS.ACTIVE;
}

/**
 * Get safe value or default
 * @param {any} value - Value to check
 * @param {string} defaultValue - Default value if null/undefined
 * @returns {string} - Safe value
 */
export function getSafeValue(value, defaultValue = STATUS_LABELS.UNKNOWN) {
  return value || defaultValue;
}

/**
 * Get assignee display name from Taiga extra_info
 * @param {Object} [extraInfo] - assigned_to_extra_info or owner_extra_info
 * @param {number|null} [assignedToId] - assigned user id fallback
 * @returns {string}
 */
export function getAssigneeDisplayName(extraInfo, assignedToId = null) {
  if (extraInfo?.full_name) return extraInfo.full_name;
  if (extraInfo?.full_name_display) return extraInfo.full_name_display;
  if (extraInfo?.username) return extraInfo.username;
  if (assignedToId) return `User ID ${assignedToId}`;
  return STATUS_LABELS.UNASSIGNED;
}

/**
 * Format project list for display
 * @param {Array} projects - Array of project objects
 * @returns {string} - Formatted project list
 */
export function formatProjectList(projects) {
  return projects.map(p => `- ${p.name} (ID: ${p.id}, Slug: ${p.slug})`).join('\n');
}

/**
 * Format user story list for display
 * @param {Array} userStories - Array of user story objects
 * @returns {string} - Formatted user story list
 */
export function formatUserStoryList(userStories) {
  return userStories.map(us =>
    `- #${us.ref}: ${us.subject} (Status: ${getSafeValue(us.status_extra_info?.name)})`
  ).join('\n');
}

/**
 * Format issue list for display
 * @param {Array} issues - Array of issue objects
 * @returns {string} - Formatted issue list
 */
export function formatIssueList(issues) {
  return issues.map(issue => `- #${issue.ref}: ${issue.subject}
  Status: ${getSafeValue(issue.status_extra_info?.name)}
  Priority: ${getSafeValue(issue.priority_extra_info?.name)}
  Sprint: ${getSafeValue(issue.milestone_extra_info?.name, STATUS_LABELS.NO_SPRINT)}
  Assigned: ${getSafeValue(issue.assigned_to_extra_info?.full_name, STATUS_LABELS.UNASSIGNED)}`).join('\n\n');
}

/**
 * Format sprint list for display
 * @param {Array} sprints - Array of sprint objects
 * @returns {string} - Formatted sprint list
 */
export function formatSprintList(sprints) {
  return sprints.map(sprint => {
    const startDate = formatDate(sprint.estimated_start);
    const endDate = formatDate(sprint.estimated_finish);
    const status = getStatusLabel(sprint.closed);
    return `- ${sprint.name} (ID: ${sprint.id})
  Status: ${status}
  Duration: ${startDate} ~ ${endDate}`;
  }).join('\n\n');
}

/**
 * Format sprint issues for display
 * @param {Array} issues - Array of issue objects
 * @returns {string} - Formatted issue list for sprint
 */
export function formatSprintIssues(issues) {
  return issues.map(issue => `🔸 #${issue.ref}: ${issue.subject}
   Status: ${getSafeValue(issue.status_extra_info?.name)}
   Priority: ${getSafeValue(issue.priority_extra_info?.name)}
   Assigned: ${getSafeValue(issue.assigned_to_extra_info?.full_name, STATUS_LABELS.UNASSIGNED)}`).join('\n\n');
}
