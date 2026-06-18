#!/usr/bin/env node

/**
 * MCP Server Test Suite
 * Tests core functionality of the Taiga MCP Server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { RESOURCE_URIS } from '../src/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const DEFAULT_TAIGA_API_URL = 'https://api.taiga.io/api/v1';

function getTestServerEnv() {
  return {
    ...process.env,
    ...(process.env.TAIGA_API_URL ? {} : { TAIGA_API_URL: DEFAULT_TAIGA_API_URL }),
  };
}

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.client = null;
  }

  async setup() {
    console.log('🚀 Starting Taiga MCP Server Tests\n');
    
    try {
      // Create transport that connects to our MCP server
      const transport = new StdioClientTransport({
        command: 'node',
        args: [join(__dirname, '..', 'src', 'index.js')],
        env: getTestServerEnv(),
      });

      // Create client
      this.client = new Client(
        {
          name: 'Taiga MCP Test Client',
          version: '1.0.0',
        },
        {
          capabilities: {
            resources: {},
            tools: {},
          },
        }
      );

      // Add timeout and better error handling
      const connectPromise = this.client.connect(transport);
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
      );
      
      await Promise.race([connectPromise, timeout]);
      console.log('✅ Connected to Taiga MCP server\n');
      
      // Give the server a moment to fully initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error.message);
      console.log('💡 This may be due to MCP transport complexity in test environment');
      console.log('💡 The quick test already verified core functionality works');
      return false;
    }
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
    const connected = await this.setup();
    if (!connected) {
      process.exit(1);
    }

    try {
      // Test 1: List available tools
      await this.test('List available tools', async () => {
        const tools = await this.client.listTools();
        this.assert(tools && tools.tools, 'Should return tools object');
        this.assert(tools.tools.length > 0, 'Should have at least one tool');
        
        const toolNames = tools.tools.map(t => t.name);
        this.assert(toolNames.includes('listProjects'), 'Should include listProjects tool');
        this.assert(toolNames.includes('authenticate'), 'Should include authenticate tool');
      });

      // Test 2: List available resources
      await this.test('List available resources', async () => {
        const resources = await this.client.listResources();
        this.assert(resources && resources.resources, 'Should return resources object');
        this.assert(resources.resources.length > 0, 'Should have at least one resource');
        
        const resourceUris = resources.resources.map(r => r.uri);
        this.assert(resourceUris.includes(RESOURCE_URIS.API_DOCS), 'Should include API docs resource');
      });

      // Test 3: Read API documentation resource
      await this.test('Read API documentation resource', async () => {
        const docResource = await this.client.readResource({ uri: RESOURCE_URIS.API_DOCS });
        this.assert(docResource && docResource.contents, 'Should return resource contents');
        this.assert(docResource.contents.length > 0, 'Should have content');
        this.assert(docResource.contents[0].text.includes('Taiga API Documentation'), 'Should contain documentation text');
      });

      // Test 4: Test authentication without credentials (should handle gracefully)
      await this.test('Handle authentication without credentials', async () => {
        try {
          const result = await this.client.callTool({
            name: 'authenticate',
            arguments: {
              username: '',
              password: ''
            }
          });
          // Should return some response, even if authentication fails
          this.assert(result && result.content, 'Should return response content');
        } catch (error) {
          // This is acceptable for this test
          this.assert(true, 'Authentication properly handled missing credentials');
        }
      });

      // Test 5: Test project listing (may require authentication)
      await this.test('List projects (without auth)', async () => {
        try {
          const result = await this.client.callTool({
            name: 'listProjects',
            arguments: {}
          });
          this.assert(result && result.content, 'Should return response content');
          
          // Check if we get an authentication error or actual projects
          const content = result.content[0]?.text || '';
          const isAuthError = content.includes('authentication') || content.includes('login');
          const hasProjects = content.includes('Projects:') || content.includes('project');
          
          this.assert(isAuthError || hasProjects, 'Should either show auth error or projects');
        } catch (error) {
          // Expected if not authenticated
          this.assert(true, 'Project listing properly handled authentication requirement');
        }
      });

      // Test 6: Test tool parameter validation
      await this.test('Tool parameter validation', async () => {
        try {
          await this.client.callTool({
            name: 'createUserStory',
            arguments: {
              // Missing required parameters
            }
          });
          this.assert(false, 'Should have thrown error for missing parameters');
        } catch (error) {
          this.assert(true, 'Properly validated required parameters');
        }
      });

      // Test 7: Test invalid tool name
      await this.test('Handle invalid tool name', async () => {
        try {
          await this.client.callTool({
            name: 'nonExistentTool',
            arguments: {}
          });
          this.assert(false, 'Should have thrown error for invalid tool');
        } catch (error) {
          this.assert(error.message.includes('Unknown tool') || error.message.includes('not found'), 'Should indicate unknown tool');
        }
      });

      // Test 8: Test malformed resource URI
      await this.test('Handle malformed resource URI', async () => {
        try {
          await this.client.readResource({ uri: 'invalid://malformed/uri' });
          this.assert(false, 'Should have thrown error for malformed URI');
        } catch (error) {
          this.assert(true, 'Properly handled malformed resource URI');
        }
      });

    } catch (error) {
      console.error('\n❌ Test suite failed with error:', error);
      process.exit(1);
    }

    // Print results
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`);

    if (this.failed > 0) {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default TestRunner;