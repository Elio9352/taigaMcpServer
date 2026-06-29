/**
 * Epic management tools for Taiga MCP Server
 * Handles Epic creation, management, and User Story linking for large-scale project organization
 */

import { z } from 'zod';
import { TaigaService } from '../taigaService.js';
import { createSuccessResponse, createErrorResponse } from '../utils.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants.js';
import {
  assigneeSchema,
  watchersSchema,
  buildCreateAssignmentFields,
  buildUpdateAssignmentFields,
  applyWatchersAfterCreate,
  formatAssignmentDetails,
} from '../assignmentUtils.js';

const taigaService = new TaigaService();

/**
 * Create Epic tool
 * Creates a new Epic for large-scale project organization
 */
export const createEpicTool = {
  name: 'createEpic',
  description: 'Create a new Epic for organizing large-scale project features',
  schema: {
    project: z.number().describe('Project ID where the Epic will be created'),
    subject: z.string().min(1).describe('Epic subject is required'),
    description: z.string().optional().describe('Optional detailed description of the Epic'),
    color: z.string().optional().describe('Optional color code for the Epic (e.g., #FF5733)'),
    tags: z.array(z.string()).optional().describe('Optional tags for categorization'),
    assignee: assigneeSchema,
    watchers: watchersSchema,
  },
  
  handler: async ({ project, subject, description, color, tags, assignee, watchers }) => {
    try {
      if (!taigaService.isAuthenticated()) {
        return createErrorResponse(ERROR_MESSAGES.AUTHENTICATION_FAILED);
      }

      const { fields: assignmentFields, assignedTo, watcherIds } =
        await buildCreateAssignmentFields('epic', project, assignee, watchers);

      const epicData = {
        project,
        subject,
        description: description || '',
        color: color || '#999999',
        tags: tags || [],
        ...assignmentFields,
      };

      const result = await taigaService.createEpic(epicData);
      const patchedResult = await applyWatchersAfterCreate('epic', result.id, watchers, watcherIds);
      const finalResult = patchedResult || result;
      const assignmentDetails = formatAssignmentDetails(finalResult, assignedTo, watcherIds);
      
      return createSuccessResponse(
        `${SUCCESS_MESSAGES.EPIC_CREATED}\n\n` +
        `🏛️ **Epic創建成功**\n` +
        `- Epic ID: ${finalResult.id}\n` +
        `- 標題: ${finalResult.subject}\n` +
        `- 專案: ${finalResult.project_extra_info?.name || project}\n` +
        `- 顏色: ${finalResult.color}\n` +
        `- 創建時間: ${new Date(finalResult.created_date).toLocaleString()}\n` +
        `${finalResult.description ? `- 描述: ${finalResult.description}\n` : ''}` +
        `${finalResult.tags && finalResult.tags.length > 0 ? `- 標籤: ${finalResult.tags.join(', ')}\n` : ''}` +
        `${assignmentDetails ? `${assignmentDetails}\n` : ''}`
      );
    } catch (error) {
      console.error('Error creating epic:', error);
      return createErrorResponse(ERROR_MESSAGES.FAILED_TO_CREATE_EPIC);
    }
  }
};

/**
 * List Epics tool
 * Lists all Epics in a project
 */
export const listEpicsTool = {
  name: 'listEpics',
  description: 'List all Epics in a project',
  schema: {
    project: z.number().describe('Project ID to list Epics from')
  },
  
  handler: async ({ project }) => {
    try {
      if (!taigaService.isAuthenticated()) {
        return createErrorResponse(ERROR_MESSAGES.AUTHENTICATION_FAILED);
      }

      const epics = await taigaService.listEpics(project);
      
      if (epics.length === 0) {
        return createSuccessResponse(
          `🏛️ **專案 #${project} Epic列表**\n\n` +
          `暫無Epic`
        );
      }

      const epicList = epics.map((epic, index) => {
        const createdDate = new Date(epic.created_date).toLocaleDateString();
        const storyCount = epic.user_stories_counts?.total || 0;
        const statusInfo = epic.status_extra_info?.name || '未設定';
        
        return (
          `${index + 1}. **${epic.subject}** (ID: ${epic.id})\n` +
          `   - 狀態: ${statusInfo}\n` +
          `   - 用戶故事: ${storyCount} 個\n` +
          `   - 創建日期: ${createdDate}\n` +
          `   - 顏色: ${epic.color}\n` +
          `${epic.description ? `   - 描述: ${epic.description.substring(0, 100)}${epic.description.length > 100 ? '...' : ''}\n` : ''}` +
          `${epic.tags && epic.tags.length > 0 ? `   - 標籤: ${epic.tags.join(', ')}\n` : ''}`
        );
      }).join('\n');

      return createSuccessResponse(
        `🏛️ **專案 #${project} Epic列表** (共 ${epics.length} 個)\n\n` +
        epicList
      );
    } catch (error) {
      console.error('Error listing epics:', error);
      return createErrorResponse(ERROR_MESSAGES.FAILED_TO_LIST_EPICS);
    }
  }
};

/**
 * Get Epic details tool
 * Gets detailed information about a specific Epic
 */
export const getEpicTool = {
  name: 'getEpic',
  description: 'Get detailed information about a specific Epic',
  schema: {
    epicId: z.number().describe('ID of the Epic to get details for')
  },
  
  handler: async ({ epicId }) => {
    try {
      if (!taigaService.isAuthenticated()) {
        return createErrorResponse(ERROR_MESSAGES.AUTHENTICATION_FAILED);
      }

      const epic = await taigaService.getEpic(epicId);
      
      const createdDate = new Date(epic.created_date).toLocaleString();
      const modifiedDate = new Date(epic.modified_date).toLocaleString();
      const storyCount = epic.user_stories_counts?.total || 0;
      const statusInfo = epic.status_extra_info?.name || '未設定';
      const ownerInfo = epic.owner_extra_info?.full_name || '未分配';
      
      return createSuccessResponse(
        `🏛️ **Epic詳細信息**\n\n` +
        `**基本信息**\n` +
        `- ID: ${epic.id}\n` +
        `- 標題: ${epic.subject}\n` +
        `- 專案: ${epic.project_extra_info?.name || epic.project}\n` +
        `- 狀態: ${statusInfo}\n` +
        `- 負責人: ${ownerInfo}\n` +
        `- 顏色: ${epic.color}\n\n` +
        `**進度統計**\n` +
        `- 關聯用戶故事: ${storyCount} 個\n` +
        `- 創建時間: ${createdDate}\n` +
        `- 最後修改: ${modifiedDate}\n\n` +
        `${epic.description ? `**描述**\n${epic.description}\n\n` : ''}` +
        `${epic.tags && epic.tags.length > 0 ? `**標籤**\n${epic.tags.join(', ')}\n\n` : ''}` +
        `**項目鏈接**\n` +
        `- Taiga URL: ${epic.permalink || '無'}`
      );
    } catch (error) {
      console.error('Error getting epic:', error);
      if (error.response?.status === 404) {
        return createErrorResponse(ERROR_MESSAGES.EPIC_NOT_FOUND);
      }
      return createErrorResponse(ERROR_MESSAGES.FAILED_TO_GET_EPIC);
    }
  }
};

/**
 * Update Epic tool
 * Updates an existing Epic's information
 */
export const updateEpicTool = {
  name: 'updateEpic',
  description: 'Update an existing Epic\'s information',
  schema: {
    epicId: z.number().describe('ID of the Epic to update'),
    subject: z.string().optional().describe('New subject/title for the Epic'),
    description: z.string().optional().describe('New description for the Epic'),
    color: z.string().optional().describe('New color code for the Epic'),
    tags: z.array(z.string()).optional().describe('New tags for the Epic'),
    status: z.number().optional().describe('New status ID for the Epic'),
    assignee: assigneeSchema,
    watchers: watchersSchema,
  },
  
  handler: async ({ epicId, subject, description, color, tags, status, assignee, watchers }) => {
    try {
      if (!taigaService.isAuthenticated()) {
        return createErrorResponse(ERROR_MESSAGES.AUTHENTICATION_FAILED);
      }

      const epic = await taigaService.getEpic(epicId);
      const { fields, assignedTo, watcherIds } = await buildUpdateAssignmentFields(
        'epic',
        epic.project,
        assignee,
        watchers
      );

      const updateData = {};
      if (subject !== undefined) updateData.subject = subject;
      if (description !== undefined) updateData.description = description;
      if (color !== undefined) updateData.color = color;
      if (tags !== undefined) updateData.tags = tags;
      if (status !== undefined) updateData.status = status;
      Object.assign(updateData, fields);

      const result = await taigaService.updateEpic(epicId, updateData);
      const assignmentDetails = formatAssignmentDetails(result, assignedTo, watcherIds);
      
      return createSuccessResponse(
        `${SUCCESS_MESSAGES.EPIC_UPDATED}\n\n` +
        `🏛️ **Epic更新完成**\n` +
        `- Epic ID: ${result.id}\n` +
        `- 標題: ${result.subject}\n` +
        `- 狀態: ${result.status_extra_info?.name || '未設定'}\n` +
        `- 最後修改: ${new Date(result.modified_date).toLocaleString()}\n` +
        `${result.description ? `- 描述: ${result.description.substring(0, 150)}${result.description.length > 150 ? '...' : ''}\n` : ''}` +
        `${assignmentDetails ? `${assignmentDetails}\n` : ''}`
      );
    } catch (error) {
      console.error('Error updating epic:', error);
      if (error.response?.status === 404) {
        return createErrorResponse(ERROR_MESSAGES.EPIC_NOT_FOUND);
      }
      return createErrorResponse(ERROR_MESSAGES.FAILED_TO_UPDATE_EPIC);
    }
  }
};

/**
 * Link User Story to Epic tool
 * Links a User Story to an Epic for organization
 */
export const linkStoryToEpicTool = {
  name: 'linkStoryToEpic',
  description: 'Link a User Story to an Epic for better organization',
  schema: {
    userStoryId: z.number().describe('ID of the User Story to link'),
    epicId: z.number().describe('ID of the Epic to link the story to')
  },
  
  handler: async ({ userStoryId, epicId }) => {
    try {
      if (!taigaService.isAuthenticated()) {
        return createErrorResponse(ERROR_MESSAGES.AUTHENTICATION_FAILED);
      }

      const result = await taigaService.linkStoryToEpic(userStoryId, epicId);
      
      return createSuccessResponse(
        `${SUCCESS_MESSAGES.STORY_LINKED_TO_EPIC}\n\n` +
        `🔗 **故事連結成功**\n` +
        `- User Story: #${userStoryId} "${result.subject}"\n` +
        `- Epic: #${epicId} "${result.epic?.subject || 'Epic'}"\n` +
        `- 連結時間: ${new Date().toLocaleString()}\n` +
        `- 專案: ${result.project_extra_info?.name || result.project}`
      );
    } catch (error) {
      console.error('Error linking story to epic:', error);
      if (error.response?.status === 404) {
        return createErrorResponse(ERROR_MESSAGES.USER_STORY_NOT_FOUND);
      }
      return createErrorResponse(ERROR_MESSAGES.FAILED_TO_LINK_STORY);
    }
  }
};

/**
 * Unlink User Story from Epic tool
 * Removes the link between a User Story and Epic
 */
export const unlinkStoryFromEpicTool = {
  name: 'unlinkStoryFromEpic',
  description: 'Remove the link between a User Story and Epic',
  schema: {
    userStoryId: z.number().describe('ID of the User Story to unlink')
  },
  
  handler: async ({ userStoryId }) => {
    try {
      if (!taigaService.isAuthenticated()) {
        return createErrorResponse(ERROR_MESSAGES.AUTHENTICATION_FAILED);
      }

      const result = await taigaService.unlinkStoryFromEpic(userStoryId);
      
      return createSuccessResponse(
        `${SUCCESS_MESSAGES.STORY_UNLINKED_FROM_EPIC}\n\n` +
        `🔓 **故事取消連結**\n` +
        `- User Story: #${userStoryId} "${result.subject}"\n` +
        `- 已從Epic移除\n` +
        `- 操作時間: ${new Date().toLocaleString()}\n` +
        `- 專案: ${result.project_extra_info?.name || result.project}`
      );
    } catch (error) {
      console.error('Error unlinking story from epic:', error);
      if (error.response?.status === 404) {
        return createErrorResponse(ERROR_MESSAGES.USER_STORY_NOT_FOUND);
      }
      return createErrorResponse(ERROR_MESSAGES.FAILED_TO_UNLINK_STORY);
    }
  }
};