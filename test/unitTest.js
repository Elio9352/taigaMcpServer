#!/usr/bin/env node

/**
 * Unit Test Suite - Tests individual components without MCP transport
 */

import { TaigaService } from '../src/taigaService.js';
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../src/constants.js';
import { formatDate, createSuccessResponse, createErrorResponse, resolveUserStory } from '../src/utils.js';
import {
  mergeBatchAssignment,
  getAssigneeField,
  supportsAssignee,
  formatAssignmentDetails,
} from '../src/assignmentUtils.js';
import { createTaskTool } from '../src/tools/taskTools.js';
import { batchCreateTasksTool } from '../src/tools/batchTools.js';

class UnitTestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    try {
      process.stdout.write(`🧪 ${name}... `);
      await testFn();
      console.log('✅ PASS');
      this.passed++;
    } catch (error) {
      console.log('❌ FAIL');
      console.log(`   Error: ${error.message}`);
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  async run() {
    console.log('🧪 Unit Test Suite\n');

    // Test Constants
    await this.test('Constants are defined', async () => {
      this.assert(API_ENDPOINTS.PROJECTS, 'API_ENDPOINTS.PROJECTS should be defined');
      this.assert(ERROR_MESSAGES.AUTHENTICATION_FAILED, 'ERROR_MESSAGES.AUTHENTICATION_FAILED should be defined');
      this.assert(SUCCESS_MESSAGES.AUTHENTICATED, 'SUCCESS_MESSAGES.AUTHENTICATED should be defined');
    });

    // Test Utility Functions
    await this.test('Date formatting utility', async () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      this.assert(typeof formatted === 'string', 'Should return a string');
      this.assert(formatted.includes('2024'), 'Should contain the year');
    });

    await this.test('Success response creation', async () => {
      const response = createSuccessResponse('Test message');
      this.assert(response.content, 'Should have content property');
      this.assert(response.content[0].type === 'text', 'Should have text type');
      this.assert(response.content[0].text === 'Test message', 'Should contain the message');
    });

    await this.test('Error response creation', async () => {
      const response = createErrorResponse('Test error');
      this.assert(response.content, 'Should have content property');
      this.assert(response.isError === true, 'Should have isError flag');
      this.assert(response.content[0].text.includes('Test error'), 'Should contain the error message');
    });

    // Test TaigaService instantiation
    await this.test('TaigaService instantiation', async () => {
      const service = new TaigaService();
      this.assert(service, 'Should create TaigaService instance');
      this.assert(typeof service.listProjects === 'function', 'Should have listProjects method');
      this.assert(typeof service.createUserStory === 'function', 'Should have createUserStory method');
      this.assert(typeof service.getUserStoryByRef === 'function', 'Should have getUserStoryByRef method');
    });

    await this.test('Resolve user story by # reference', async () => {
      const originalGetUserStoryByRef = TaigaService.prototype.getUserStoryByRef;
      const calls = [];

      TaigaService.prototype.getUserStoryByRef = async (ref, projectId) => {
        calls.push({ ref, projectId });
        return { id: 101, ref: Number(ref), project: Number(projectId), subject: 'Story by ref' };
      };

      try {
        const story = await resolveUserStory('#27', '10');
        this.assert(story.id === 101, 'Should return story from by_ref lookup');
        this.assert(calls.length === 1, 'Should call getUserStoryByRef once');
        this.assert(calls[0].ref === '27', 'Should strip # prefix before lookup');
        this.assert(calls[0].projectId === '10', 'Should pass resolved project ID');
      } finally {
        TaigaService.prototype.getUserStoryByRef = originalGetUserStoryByRef;
      }
    });

    await this.test('Resolve numeric user story as ref after ID lookup fails', async () => {
      const originalGetUserStory = TaigaService.prototype.getUserStory;
      const originalGetUserStoryByRef = TaigaService.prototype.getUserStoryByRef;
      const calls = [];

      TaigaService.prototype.getUserStory = async (userStoryId) => {
        calls.push({ method: 'getUserStory', userStoryId });
        throw new Error('direct ID missing');
      };
      TaigaService.prototype.getUserStoryByRef = async (ref, projectId) => {
        calls.push({ method: 'getUserStoryByRef', ref, projectId });
        return { id: 101, ref: Number(ref), project: Number(projectId), subject: 'Story by numeric ref' };
      };

      try {
        const story = await resolveUserStory('27', '10');
        this.assert(story.id === 101, 'Should return story from fallback ref lookup');
        this.assert(calls[0].method === 'getUserStory', 'Should try direct ID lookup first');
        this.assert(calls[1].method === 'getUserStoryByRef', 'Should fall back to reference lookup');
        this.assert(calls[1].ref === '27', 'Should use numeric input as reference');
      } finally {
        TaigaService.prototype.getUserStory = originalGetUserStory;
        TaigaService.prototype.getUserStoryByRef = originalGetUserStoryByRef;
      }
    });

    await this.test('Resolve user story reference requires project identifier', async () => {
      try {
        await resolveUserStory('#27');
        this.assert(false, 'Should throw when reference has no project identifier');
      } catch (error) {
        this.assert(error.message.includes('Project identifier is required'), 'Should explain missing project identifier');
      }
    });

    await this.test('createTask resolves user story via by_ref without listing all stories', async () => {
      const originalListUserStories = TaigaService.prototype.listUserStories;
      const originalGetUserStoryByRef = TaigaService.prototype.getUserStoryByRef;
      const originalCreateTask = TaigaService.prototype.createTask;
      const originalGetCurrentUserId = TaigaService.prototype.getCurrentUserId;
      let listCalled = false;
      let createPayload = null;

      TaigaService.prototype.listUserStories = async () => {
        listCalled = true;
        return [];
      };
      TaigaService.prototype.getCurrentUserId = async () => 5;
      TaigaService.prototype.getUserStoryByRef = async (ref, projectId) => ({
        id: 147,
        ref: Number(ref),
        project: Number(projectId),
        subject: 'Story by ref',
      });
      TaigaService.prototype.createTask = async (taskData) => {
        createPayload = taskData;
        return {
          id: 1001,
          subject: taskData.subject,
          ref: 999,
          status_extra_info: { name: 'New' },
          project_extra_info: { name: 'Project' },
          user_story_extra_info: { ref: 262, subject: 'Story by ref' },
        };
      };

      try {
        const response = await createTaskTool.handler({
          projectIdentifier: '8',
          userStoryIdentifier: '#262',
          subject: 'test task',
          tags: [],
        });

        this.assert(!listCalled, 'Should not call listUserStories');
        this.assert(createPayload?.user_story === 147, 'Should pass resolved user story id');
        this.assert(createPayload?.project === '8', 'Should pass project id');
        this.assert(createPayload?.assigned_to === 5, 'Should default assignee to current user');
        this.assert(!response.isError, 'Should return success response');
      } finally {
        TaigaService.prototype.listUserStories = originalListUserStories;
        TaigaService.prototype.getUserStoryByRef = originalGetUserStoryByRef;
        TaigaService.prototype.createTask = originalCreateTask;
        TaigaService.prototype.getCurrentUserId = originalGetCurrentUserId;
      }
    });

    await this.test('batchCreateTasks uses userStoryIdentifier and correct createTask payload', async () => {
      const originalGetUserStory = TaigaService.prototype.getUserStory;
      const originalCreateTask = TaigaService.prototype.createTask;
      const originalGetCurrentUserId = TaigaService.prototype.getCurrentUserId;
      let createPayload = null;

      TaigaService.prototype.getCurrentUserId = async () => 5;
      TaigaService.prototype.getUserStory = async (userStoryId) => ({
        id: Number(userStoryId),
        ref: 262,
        subject: 'Story by id',
      });
      TaigaService.prototype.createTask = async (taskData) => {
        createPayload = taskData;
        return {
          id: 500,
          ref: 500,
          subject: taskData.subject,
        };
      };

      try {
        const response = await batchCreateTasksTool.handler({
          projectIdentifier: '8',
          userStoryIdentifier: '147',
          tasks: [{ subject: 'batch task' }],
        });

        this.assert(batchCreateTasksTool.schema.userStoryIdentifier, 'Schema should expose userStoryIdentifier');
        this.assert(!batchCreateTasksTool.schema.userStoryRef, 'Schema should not expose userStoryRef');
        this.assert(createPayload?.user_story === 147, 'Should pass user_story id');
        this.assert(createPayload?.project === '8', 'Should pass project id');
        this.assert(createPayload?.assigned_to === 5, 'Should default assignee to current user');
        this.assert(!response.isError, 'Should return success response');
      } finally {
        TaigaService.prototype.getUserStory = originalGetUserStory;
        TaigaService.prototype.createTask = originalCreateTask;
        TaigaService.prototype.getCurrentUserId = originalGetCurrentUserId;
      }
    });

    // Test URL construction
    await this.test('API URL construction', async () => {
      const service = new TaigaService();
      const baseUrl = process.env.TAIGA_API_URL || 'https://api.taiga.io/api/v1';
      
      // Test that service uses the base URL correctly
      this.assert(baseUrl.includes('api'), 'Should contain api in URL');
      this.assert(baseUrl.includes('v1'), 'Should contain version in URL');
    });

    // Test Constants Structure
    await this.test('Endpoints structure', async () => {
      this.assert(API_ENDPOINTS.PROJECTS, 'Should have PROJECTS endpoint');
      this.assert(API_ENDPOINTS.MILESTONES, 'Should have MILESTONES endpoint');
      this.assert(API_ENDPOINTS.USER_STORIES, 'Should have USER_STORIES endpoint');
      this.assert(API_ENDPOINTS.TASKS, 'Should have TASKS endpoint');
      this.assert(API_ENDPOINTS.ISSUES, 'Should have ISSUES endpoint');
      this.assert(API_ENDPOINTS.PRIORITIES, 'Should have PRIORITIES endpoint');
    });

    await this.test('Error messages structure', async () => {
      this.assert(ERROR_MESSAGES.AUTHENTICATION_FAILED, 'Should have AUTHENTICATION_FAILED message');
      this.assert(ERROR_MESSAGES.PROJECT_NOT_FOUND, 'Should have PROJECT_NOT_FOUND message');
      this.assert(ERROR_MESSAGES.FAILED_TO_LIST_PROJECTS, 'Should have FAILED_TO_LIST_PROJECTS message');
    });

    await this.test('Success messages structure', async () => {
      this.assert(SUCCESS_MESSAGES.AUTHENTICATED, 'Should have AUTHENTICATED message');
      this.assert(SUCCESS_MESSAGES.USER_STORY_CREATED, 'Should have USER_STORY_CREATED message');
      this.assert(SUCCESS_MESSAGES.ISSUE_CREATED, 'Should have ISSUE_CREATED message');
    });

    // Test Environment Variables Handling
    await this.test('Environment variable handling', async () => {
      const originalUrl = process.env.TAIGA_API_URL;
      
      // Test with undefined env var
      delete process.env.TAIGA_API_URL;
      const service1 = new TaigaService();
      this.assert(service1, 'Should handle missing environment variables');
      
      // Restore original value
      if (originalUrl) {
        process.env.TAIGA_API_URL = originalUrl;
      }
    });

    // Test Data Validation Helpers (if any exist in utils)
    await this.test('Response format validation', async () => {
      const validResponse = createSuccessResponse('test');
      this.assert(Array.isArray(validResponse.content), 'Content should be an array');
      this.assert(validResponse.content.length > 0, 'Content should not be empty');
      this.assert(validResponse.content[0].type, 'Content items should have type');
      this.assert(validResponse.content[0].text, 'Content items should have text');
    });

    await this.test('Batch assignment merge prefers item-level overrides', async () => {
      const merged = mergeBatchAssignment('batch-user', ['w1'], 'item-user', ['w2']);
      this.assert(merged.assignee === 'item-user', 'Item assignee should override batch assignee');
      this.assert(JSON.stringify(merged.watchers) === JSON.stringify(['w2']), 'Item watchers should override batch watchers');
    });

    await this.test('Batch assignment falls back to batch defaults', async () => {
      const merged = mergeBatchAssignment('batch-user', ['w1'], undefined, undefined);
      this.assert(merged.assignee === 'batch-user', 'Batch assignee should be used when item assignee is omitted');
      this.assert(JSON.stringify(merged.watchers) === JSON.stringify(['w1']), 'Batch watchers should be used when item watchers are omitted');
    });

    await this.test('Assignment field mapping by item type', async () => {
      this.assert(getAssigneeField('epic') === 'owner', 'Epic assignee should map to owner');
      this.assert(getAssigneeField('issue') === 'assigned_to', 'Issue assignee should map to assigned_to');
      this.assert(supportsAssignee('milestone') === false, 'Milestone should not support assignee');
      this.assert(supportsAssignee('wiki') === false, 'Wiki should not support assignee');
    });

    await this.test('Assignment details formatting', async () => {
      const details = formatAssignmentDetails(
        { assigned_to_extra_info: { full_name: 'Alice' } },
        7,
        [7, 8]
      );
      this.assert(details.includes('Assigned to: Alice'), 'Should include assignee name');
      this.assert(details.includes('Watchers: 2'), 'Should include watcher count');
    });

    // Print results
    console.log('\n📊 Unit Test Results:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    
    if (this.passed + this.failed > 0) {
      console.log(`📈 Success Rate: ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`);
    }

    if (this.failed > 0) {
      console.log('\n⚠️  Some unit tests failed.');
      return false;
    } else {
      console.log('\n🎉 All unit tests passed!');
      return true;
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new UnitTestRunner();
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Unit test runner failed:', error);
    process.exit(1);
  });
}

export default UnitTestRunner;