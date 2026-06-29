#!/usr/bin/env node

/**
 * Integration tests for assignee/watchers against a real Taiga project.
 * Usage: node test/assignmentIntegrationTest.js [projectSlug]
 * Default project slug: test
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const PROJECT_SLUG = process.argv[2] || 'test';

class AssignmentIntegrationTest {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.client = null;
    this.currentUserLabel = null;
    this.createdRefs = [];
  }

  async setup() {
    if (!process.env.TAIGA_USERNAME || !process.env.TAIGA_PASSWORD) {
      console.log('⚠️  TAIGA_USERNAME / TAIGA_PASSWORD not set in .env');
      return false;
    }

    const transport = new StdioClientTransport({
      command: 'node',
      args: [join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'index.js')],
    });

    this.client = new Client(
      { name: 'Assignment Integration Test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    await this.client.connect(transport);
    return true;
  }

  async callTool(name, args = {}) {
    const result = await this.client.callTool({ name, arguments: args });
    const text = result.content?.[0]?.text || '';
    if (result.isError) {
      throw new Error(text.replace(/^❌ Error:\s*/, ''));
    }
    return text;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  extractRef(text) {
    const match = text.match(/Reference: #(\d+)/i) || text.match(/#(\d+)/);
    return match?.[1] || null;
  }

  async test(name, fn) {
    try {
      process.stdout.write(`🧪 ${name}... `);
      await fn();
      console.log('✅ PASS');
      this.passed++;
    } catch (error) {
      console.log('❌ FAIL');
      console.log(`   ${error.message}`);
      this.failed++;
    }
  }

  async run() {
    console.log(`🔄 Assignment integration tests (project: ${PROJECT_SLUG})\n`);

    const ready = await this.setup();
    if (!ready) {
      process.exit(0);
    }

    await this.test('Authenticate', async () => {
      const text = await this.callTool('authenticate', {
        username: process.env.TAIGA_USERNAME,
        password: process.env.TAIGA_PASSWORD,
      });
      this.assert(/authenticated/i.test(text), 'Authentication should succeed');
      const userMatch = text.match(/as (.+?) \(/);
      this.currentUserLabel = userMatch?.[1]?.trim() || process.env.TAIGA_USERNAME;
    });

    await this.test('Resolve test project', async () => {
      const text = await this.callTool('getProject', { projectIdentifier: PROJECT_SLUG });
      this.assert(/Project:/i.test(text) || /Name:/i.test(text), 'Project should exist');
    });

    await this.test('createIssue defaults assignee to current user', async () => {
      const subject = `[assignment-test] default assignee ${Date.now()}`;
      const created = await this.callTool('createIssue', {
        projectIdentifier: PROJECT_SLUG,
        subject,
        description: 'assignment integration test',
      });

      const ref = this.extractRef(created);
      this.assert(ref, 'Should return issue reference');
      this.createdRefs.push(ref);

      this.assert(/Assigned to:/i.test(created), 'Create response should include assignee');
      this.assert(
        created.includes(this.currentUserLabel) || created.includes(process.env.TAIGA_USERNAME),
        `Create response should assign current user (${this.currentUserLabel})`
      );
      this.assert(/Watchers: 0/i.test(created), 'Default watchers should be empty');

      const detail = await this.callTool('getIssue', {
        issueIdentifier: `#${ref}`,
        projectIdentifier: PROJECT_SLUG,
      });
      this.assert(!/Unassigned/i.test(detail), 'Issue detail should show an assignee');
    });

    await this.test('createIssue supports explicit unassign and watchers none', async () => {
      const subject = `[assignment-test] unassigned ${Date.now()}`;
      const created = await this.callTool('createIssue', {
        projectIdentifier: PROJECT_SLUG,
        subject,
        assignee: 'unassign',
        watchers: 'none',
      });

      const ref = this.extractRef(created);
      this.assert(ref, 'Should return issue reference');
      this.createdRefs.push(ref);

      this.assert(/Assigned to: Unassigned/i.test(created), 'Should be explicitly unassigned');
      this.assert(/Watchers: 0/i.test(created), 'Watchers should be empty');

      const detail = await this.callTool('getIssue', {
        issueIdentifier: `#${ref}`,
        projectIdentifier: PROJECT_SLUG,
      });
      this.assert(/Unassigned/i.test(detail), 'Issue detail should be unassigned');
    });

    await this.test('createUserStory defaults assignee to current user', async () => {
      const subject = `[assignment-test] story ${Date.now()}`;
      const created = await this.callTool('createUserStory', {
        projectIdentifier: PROJECT_SLUG,
        subject,
      });

      this.assert(/Assigned to:/i.test(created), 'Story create response should include assignee');
      this.assert(
        created.includes(this.currentUserLabel) || created.includes(process.env.TAIGA_USERNAME),
        'Story should default to current user'
      );
    });

    await this.test('batchCreateIssues supports batch and item overrides', async () => {
      const text = await this.callTool('batchCreateIssues', {
        projectIdentifier: PROJECT_SLUG,
        assignee: 'unassign',
        issues: [
          { subject: `[assignment-test] batch default ${Date.now()}` },
          {
            subject: `[assignment-test] batch override ${Date.now()}`,
            assignee: process.env.TAIGA_USERNAME,
          },
        ],
      });

      this.assert(/成功創建 2 個Issues/i.test(text) || /成功创建 2/i.test(text) || /2\/2 成功/.test(text), text);
    });

    await this.test('updateIssueStatus can set assignee and watchers', async () => {
      const subject = `[assignment-test] update ${Date.now()}`;
      const created = await this.callTool('createIssue', {
        projectIdentifier: PROJECT_SLUG,
        subject,
        assignee: 'unassign',
      });
      const ref = this.extractRef(created);
      this.assert(ref, 'Should create issue for update test');
      this.createdRefs.push(ref);

      const updated = await this.callTool('updateIssueStatus', {
        issueIdentifier: `#${ref}`,
        projectIdentifier: PROJECT_SLUG,
        status: 'In progress',
        assignee: process.env.TAIGA_USERNAME,
        watchers: [process.env.TAIGA_USERNAME],
      });

      this.assert(/Assigned to:/i.test(updated), 'Update response should include assignee');
      this.assert(/Watchers: 1/i.test(updated), 'Update response should include one watcher');
    });

    console.log('\n📊 Results');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    if (this.createdRefs.length) {
      console.log(`\n📝 Created issue refs in ${PROJECT_SLUG}: #${this.createdRefs.join(', #')}`);
    }

    process.exit(this.failed > 0 ? 1 : 0);
  }
}

new AssignmentIntegrationTest().run().catch((error) => {
  console.error('Assignment integration test crashed:', error);
  process.exit(1);
});
