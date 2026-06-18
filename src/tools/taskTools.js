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
  },
  handler: async ({ projectIdentifier, userStoryIdentifier, subject, description, status, tags }) => {
    try {
      const projectId = await resolveProjectId(projectIdentifier);
      const userStory = await resolveUserStory(userStoryIdentifier, projectIdentifier);

      // Get status ID if a status name was provided
      let statusId = undefined;
      if (status) {
        const statuses = await taigaService.getTaskStatuses(projectId);
        statusId = findIdByName(statuses, status);
      }

      // Create the task
      const taskData = {
        project: projectId,
        user_story: userStory.id,
        subject,
        description,
        status: statusId,
        tags,
      };

      const createdTask = await taigaService.createTask(taskData);

      const creationDetails = `${SUCCESS_MESSAGES.TASK_CREATED}

Subject: ${createdTask.subject}
Reference: #${createdTask.ref}
Status: ${getSafeValue(createdTask.status_extra_info?.name, 'Default status')}
Project: ${getSafeValue(createdTask.project_extra_info?.name)}
User Story: #${createdTask.user_story_extra_info?.ref} - ${createdTask.user_story_extra_info?.subject}`;

      return createSuccessResponse(creationDetails);
    } catch (error) {
      return createErrorResponse(`Failed to create task: ${error.message}`);
    }
  }
};