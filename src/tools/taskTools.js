/**
 * Task related MCP tools
 */

import { z } from 'zod';
import { TaigaService } from '../taigaService.js';
import { SUCCESS_MESSAGES } from '../constants.js';
import { 
  resolveProjectId,
  resolveUserStory,
  findIdByName,
  getSafeValue,
  createErrorResponse,
  createSuccessResponse
} from '../utils.js';
import {
  assigneeSchema,
  watchersSchema,
  buildCreateAssignmentFields,
  applyWatchersAfterCreate,
  formatAssignmentDetails,
} from '../assignmentUtils.js';

const taigaService = new TaigaService();

/**
 * Tool to create a new task
 */
export const createTaskTool = {
  name: 'createTask',
  schema: {
    projectIdentifier: z.string().describe('Project ID or slug'),
    userStoryIdentifier: z.string().describe('User story ID or reference number'),
    subject: z.string().describe('Task title/subject'),
    description: z.string().optional().describe('Task description'),
    status: z.string().optional().describe('Status name (e.g., "New", "In progress")'),
    tags: z.array(z.string()).optional().describe('Array of tags'),
    assignee: assigneeSchema,
    watchers: watchersSchema,
  },
  handler: async ({ projectIdentifier, userStoryIdentifier, subject, description, status, tags, assignee, watchers }) => {
    try {
      const projectId = await resolveProjectId(projectIdentifier);
      const userStory = await resolveUserStory(userStoryIdentifier, projectIdentifier);

      // Get status ID if a status name was provided
      let statusId = undefined;
      if (status) {
        const statuses = await taigaService.getTaskStatuses(projectId);
        statusId = findIdByName(statuses, status);
      }

      const { fields: assignmentFields, assignedTo, watcherIds } =
        await buildCreateAssignmentFields('task', projectId, assignee, watchers);

      // Create the task
      const taskData = {
        project: projectId,
        user_story: userStory.id,
        subject,
        description,
        status: statusId,
        tags,
        ...assignmentFields,
      };

      const createdTask = await taigaService.createTask(taskData);
      const patchedTask = await applyWatchersAfterCreate('task', createdTask.id, watchers, watcherIds);
      const finalTask = patchedTask || createdTask;

      const creationDetails = `${SUCCESS_MESSAGES.TASK_CREATED}

Subject: ${finalTask.subject}
Reference: #${finalTask.ref}
Status: ${getSafeValue(finalTask.status_extra_info?.name, 'Default status')}
Project: ${getSafeValue(finalTask.project_extra_info?.name)}
User Story: #${finalTask.user_story_extra_info?.ref} - ${finalTask.user_story_extra_info?.subject}
${formatAssignmentDetails(finalTask, assignedTo, watcherIds)}`;

      return createSuccessResponse(creationDetails);
    } catch (error) {
      return createErrorResponse(`Failed to create task: ${error.message}`);
    }
  }
};