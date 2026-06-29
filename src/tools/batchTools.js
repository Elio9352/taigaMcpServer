/**
 * Batch operations MCP tools for Taiga
 * Enables bulk operations for efficient project management
 */

import { z } from 'zod';
import { TaigaService } from '../taigaService.js';
import { 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES,
  BATCH_OPERATIONS,
  RESPONSE_TEMPLATES
} from '../constants.js';
import { 
  resolveProjectId,
  resolveUserStory,
  createErrorResponse,
  createSuccessResponse,
  formatDateTime,
  getSafeValue
} from '../utils.js';
import {
  assigneeSchema,
  watchersSchema,
  buildCreateAssignmentFields,
  applyWatchersAfterCreate,
  mergeBatchAssignment,
} from '../assignmentUtils.js';

const taigaService = new TaigaService();

/**
 * Batch create multiple issues
 */
export const batchCreateIssuesTool = {
  name: 'batchCreateIssues',
  schema: {
    projectIdentifier: z.string().describe('Project ID or slug'),
    assignee: assigneeSchema,
    watchers: watchersSchema,
    issues: z.array(z.object({
      subject: z.string().describe('Issue title/subject'),
      description: z.string().optional().describe('Issue description'),
      type: z.string().optional().describe('Issue type (Bug, Feature, Question, etc.)'),
      priority: z.string().optional().describe('Issue priority (Low, Normal, High, etc.)'),
      severity: z.string().optional().describe('Issue severity'),
      tags: z.array(z.string()).optional().describe('Issue tags'),
      assignee: assigneeSchema,
      watchers: watchersSchema,
    })).describe('Array of issues to create')
  },
  handler: async ({ projectIdentifier, assignee, watchers, issues }) => {
    try {
      const projectId = await resolveProjectId(projectIdentifier);
      
      if (issues.length === 0) {
        return createErrorResponse(BATCH_OPERATIONS.ERROR_EMPTY_BATCH);
      }

      if (issues.length > BATCH_OPERATIONS.MAX_BATCH_SIZE) {
        return createErrorResponse(`${BATCH_OPERATIONS.ERROR_BATCH_TOO_LARGE} (max: ${BATCH_OPERATIONS.MAX_BATCH_SIZE})`);
      }

      const results = [];
      const errors = [];
      
      for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        try {
          const { assignee: effectiveAssignee, watchers: effectiveWatchers } = mergeBatchAssignment(
            assignee,
            watchers,
            issue.assignee,
            issue.watchers
          );
          const { fields: assignmentFields, watcherIds } = await buildCreateAssignmentFields(
            'issue',
            projectId,
            effectiveAssignee,
            effectiveWatchers
          );

          const createdIssue = await taigaService.createIssue({
            project: projectId,
            subject: issue.subject,
            description: issue.description || '',
            type: issue.type,
            priority: issue.priority,
            severity: issue.severity,
            tags: issue.tags || [],
            ...assignmentFields,
          });

          await applyWatchersAfterCreate('issue', createdIssue.id, effectiveWatchers, watcherIds);
          
          results.push({
            index: i + 1,
            subject: issue.subject,
            ref: createdIssue.ref,
            id: createdIssue.id,
            status: 'success'
          });
        } catch (error) {
          errors.push({
            index: i + 1,
            subject: issue.subject,
            error: error.message,
            status: 'failed'
          });
        }
      }

      // Format response
      let responseText = `${BATCH_OPERATIONS.SUCCESS_BATCH_CREATED_ISSUES}\n\n`;
      
      if (results.length > 0) {
        responseText += `✅ **成功創建 ${results.length} 個Issues:**\n`;
        results.forEach(result => {
          responseText += `${result.index}. ${result.subject} (#${result.ref})\n`;
        });
      }
      
      if (errors.length > 0) {
        responseText += `\n❌ **失敗 ${errors.length} 個Issues:**\n`;
        errors.forEach(error => {
          responseText += `${error.index}. ${error.subject} - ${error.error}\n`;
        });
      }

      responseText += `\n📊 **總結:** ${results.length}/${issues.length} 成功`;
      
      return createSuccessResponse(responseText);
    } catch (error) {
      return createErrorResponse(`${ERROR_MESSAGES.FAILED_TO_CREATE_ISSUE}: ${error.message}`);
    }
  }
};

/**
 * Batch create multiple user stories
 */
export const batchCreateUserStoriesTool = {
  name: 'batchCreateUserStories',
  schema: {
    projectIdentifier: z.string().describe('Project ID or slug'),
    assignee: assigneeSchema,
    watchers: watchersSchema,
    userStories: z.array(z.object({
      subject: z.string().describe('User story title'),
      description: z.string().optional().describe('User story description'),
      points: z.number().optional().describe('Story points'),
      tags: z.array(z.string()).optional().describe('User story tags'),
      assignee: assigneeSchema,
      watchers: watchersSchema,
    })).describe('Array of user stories to create')
  },
  handler: async ({ projectIdentifier, assignee, watchers, userStories }) => {
    try {
      const projectId = await resolveProjectId(projectIdentifier);
      
      if (userStories.length === 0) {
        return createErrorResponse(BATCH_OPERATIONS.ERROR_EMPTY_BATCH);
      }

      if (userStories.length > BATCH_OPERATIONS.MAX_BATCH_SIZE) {
        return createErrorResponse(`${BATCH_OPERATIONS.ERROR_BATCH_TOO_LARGE} (max: ${BATCH_OPERATIONS.MAX_BATCH_SIZE})`);
      }

      const results = [];
      const errors = [];
      
      for (let i = 0; i < userStories.length; i++) {
        const story = userStories[i];
        try {
          const { assignee: effectiveAssignee, watchers: effectiveWatchers } = mergeBatchAssignment(
            assignee,
            watchers,
            story.assignee,
            story.watchers
          );
          const { fields: assignmentFields, watcherIds } = await buildCreateAssignmentFields(
            'user_story',
            projectId,
            effectiveAssignee,
            effectiveWatchers
          );

          const createdStory = await taigaService.createUserStory({
            project: projectId,
            subject: story.subject,
            description: story.description || '',
            points: story.points,
            tags: story.tags || [],
            ...assignmentFields,
          });

          await applyWatchersAfterCreate('user_story', createdStory.id, effectiveWatchers, watcherIds);
          
          results.push({
            index: i + 1,
            subject: story.subject,
            ref: createdStory.ref,
            id: createdStory.id,
            status: 'success'
          });
        } catch (error) {
          errors.push({
            index: i + 1,
            subject: story.subject,
            error: error.message,
            status: 'failed'
          });
        }
      }

      // Format response
      let responseText = `${BATCH_OPERATIONS.SUCCESS_BATCH_CREATED_STORIES}\n\n`;
      
      if (results.length > 0) {
        responseText += `✅ **成功創建 ${results.length} 個User Stories:**\n`;
        results.forEach(result => {
          responseText += `${result.index}. ${result.subject} (#${result.ref})\n`;
        });
      }
      
      if (errors.length > 0) {
        responseText += `\n❌ **失敗 ${errors.length} 個User Stories:**\n`;
        errors.forEach(error => {
          responseText += `${error.index}. ${error.subject} - ${error.error}\n`;
        });
      }

      responseText += `\n📊 **總結:** ${results.length}/${userStories.length} 成功`;
      
      return createSuccessResponse(responseText);
    } catch (error) {
      return createErrorResponse(`${ERROR_MESSAGES.FAILED_TO_CREATE_USER_STORY}: ${error.message}`);
    }
  }
};

/**
 * Batch create multiple tasks
 */
export const batchCreateTasksTool = {
  name: 'batchCreateTasks',
  schema: {
    projectIdentifier: z.string().describe('Project ID or slug'),
    userStoryIdentifier: z.string().describe('User story ID or reference number (e.g., "147", "#123")'),
    assignee: assigneeSchema,
    watchers: watchersSchema,
    tasks: z.array(z.object({
      subject: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      tags: z.array(z.string()).optional().describe('Task tags'),
      assignee: assigneeSchema,
      watchers: watchersSchema,
    })).describe('Array of tasks to create')
  },
  handler: async ({ projectIdentifier, userStoryIdentifier, assignee, watchers, tasks }) => {
    try {
      const projectId = await resolveProjectId(projectIdentifier);
      
      if (tasks.length === 0) {
        return createErrorResponse(BATCH_OPERATIONS.ERROR_EMPTY_BATCH);
      }

      if (tasks.length > BATCH_OPERATIONS.MAX_BATCH_SIZE) {
        return createErrorResponse(`${BATCH_OPERATIONS.ERROR_BATCH_TOO_LARGE} (max: ${BATCH_OPERATIONS.MAX_BATCH_SIZE})`);
      }

      const userStory = await resolveUserStory(userStoryIdentifier, projectIdentifier);

      const results = [];
      const errors = [];
      
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        try {
          const { assignee: effectiveAssignee, watchers: effectiveWatchers } = mergeBatchAssignment(
            assignee,
            watchers,
            task.assignee,
            task.watchers
          );
          const { fields: assignmentFields, watcherIds } = await buildCreateAssignmentFields(
            'task',
            projectId,
            effectiveAssignee,
            effectiveWatchers
          );

          const createdTask = await taigaService.createTask({
            project: projectId,
            user_story: userStory.id,
            subject: task.subject,
            description: task.description || '',
            tags: task.tags || [],
            ...assignmentFields,
          });

          await applyWatchersAfterCreate('task', createdTask.id, effectiveWatchers, watcherIds);
          
          results.push({
            index: i + 1,
            subject: task.subject,
            ref: createdTask.ref,
            id: createdTask.id,
            status: 'success'
          });
        } catch (error) {
          errors.push({
            index: i + 1,
            subject: task.subject,
            error: error.message,
            status: 'failed'
          });
        }
      }

      // Format response
      let responseText = `${BATCH_OPERATIONS.SUCCESS_BATCH_CREATED_TASKS}\n\n`;
      responseText += `📋 **User Story:** ${userStory.subject} (#${userStory.ref})\n\n`;
      
      if (results.length > 0) {
        responseText += `✅ **成功創建 ${results.length} 個Tasks:**\n`;
        results.forEach(result => {
          responseText += `${result.index}. ${result.subject} (#${result.ref})\n`;
        });
      }
      
      if (errors.length > 0) {
        responseText += `\n❌ **失敗 ${errors.length} 個Tasks:**\n`;
        errors.forEach(error => {
          responseText += `${error.index}. ${error.subject} - ${error.error}\n`;
        });
      }

      responseText += `\n📊 **總結:** ${results.length}/${tasks.length} 成功`;
      
      return createSuccessResponse(responseText);
    } catch (error) {
      return createErrorResponse(`${ERROR_MESSAGES.FAILED_TO_CREATE_TASK}: ${error.message}`);
    }
  }
};

/**
 * Register all batch tools
 */
export function registerBatchTools(server) {
  server.tool(batchCreateIssuesTool.name, batchCreateIssuesTool.schema, batchCreateIssuesTool.handler);
  server.tool(batchCreateUserStoriesTool.name, batchCreateUserStoriesTool.schema, batchCreateUserStoriesTool.handler);
  server.tool(batchCreateTasksTool.name, batchCreateTasksTool.schema, batchCreateTasksTool.handler);
}