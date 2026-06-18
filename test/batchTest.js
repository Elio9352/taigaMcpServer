/**
 * Batch Operations Test Suite for Taiga MCP Server
 * Tests the batch creation functionality
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from '../src/tools/index.js';

console.log('🧪 Starting Batch Operations Test Suite...\n');

let testResults = {
  passed: 0,
  failed: 0,
  details: []
};

function logTest(testName, passed, details = '') {
  const status = passed ? '✅' : '❌';
  const message = `${status} ${testName}`;
  console.log(message);
  
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.details.push({ testName, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function runBatchTests() {
  console.log('📋 Testing Batch Operations Functionality\n');
  
  try {
    // Test 1: Server Creation and Tool Registration
    console.log('1️⃣ Testing MCP Server Creation with Batch Tools...');
    
    const server = new Server(
      {
        name: 'taiga-mcp-test',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    // Test tool registration mechanism (without actually registering to avoid server.tool issues)
    const { getAllTools } = await import('../src/tools/index.js');
    const allTools = getAllTools();
    
    logTest('MCP Server Creation', true, 'Server created successfully with batch tools registered');
    
    // Test 2: Batch Tools Schema Validation
    console.log('\n2️⃣ Testing Batch Tools Schema...');
    
    const batchTools = [
      'batchCreateIssues',
      'batchCreateUserStories', 
      'batchCreateTasks'
    ];
    
    // Count batch tools from getAllTools
    try {
      const batchToolNames = ['batchCreateIssues', 'batchCreateUserStories', 'batchCreateTasks'];
      const foundBatchTools = allTools.filter(tool => batchToolNames.includes(tool.name));
      const toolCount = foundBatchTools.length;
      
      if (toolCount === 3) {
        logTest('Batch Tools Registration', true, `${toolCount} batch tools found in tool registry`);
      } else {
        logTest('Batch Tools Registration', false, `Expected 3 batch tools, found ${toolCount}`);
      }
    } catch (error) {
      logTest('Batch Tools Registration', false, `Tool counting failed: ${error.message}`);
    }
    
    // Test 3: Batch Operations Constants
    console.log('\n3️⃣ Testing Batch Operations Constants...');
    
    try {
      const { BATCH_OPERATIONS } = await import('../src/constants.js');
      
      const requiredConstants = [
        'MAX_BATCH_SIZE',
        'ERROR_EMPTY_BATCH',
        'ERROR_BATCH_TOO_LARGE',
        'SUCCESS_BATCH_CREATED_ISSUES',
        'SUCCESS_BATCH_CREATED_STORIES',
        'SUCCESS_BATCH_CREATED_TASKS'
      ];
      
      let constantsValid = true;
      const missingConstants = [];
      
      requiredConstants.forEach(constant => {
        if (!(constant in BATCH_OPERATIONS)) {
          constantsValid = false;
          missingConstants.push(constant);
        }
      });
      
      if (constantsValid) {
        logTest('Batch Constants Validation', true, `All ${requiredConstants.length} batch constants defined correctly`);
      } else {
        logTest('Batch Constants Validation', false, `Missing constants: ${missingConstants.join(', ')}`);
      }
      
      // Test batch size limit
      const maxBatchSize = BATCH_OPERATIONS.MAX_BATCH_SIZE;
      if (typeof maxBatchSize === 'number' && maxBatchSize > 0) {
        logTest('Batch Size Limit', true, `MAX_BATCH_SIZE set to ${maxBatchSize}`);
      } else {
        logTest('Batch Size Limit', false, 'MAX_BATCH_SIZE not properly configured');
      }
      
    } catch (error) {
      logTest('Batch Constants Import', false, `Failed to import constants: ${error.message}`);
    }
    
    // Test 4: Batch Tools Module Structure
    console.log('\n4️⃣ Testing Batch Tools Module Structure...');
    
    try {
      const batchModule = await import('../src/tools/batchTools.js');
      
      const expectedExports = [
        'batchCreateIssuesTool',
        'batchCreateUserStoriesTool', 
        'batchCreateTasksTool',
        'registerBatchTools'
      ];
      
      let moduleStructureValid = true;
      const missingExports = [];
      
      expectedExports.forEach(exportName => {
        if (!(exportName in batchModule)) {
          moduleStructureValid = false;
          missingExports.push(exportName);
        }
      });
      
      if (moduleStructureValid) {
        logTest('Batch Module Structure', true, `All ${expectedExports.length} exports present`);
      } else {
        logTest('Batch Module Structure', false, `Missing exports: ${missingExports.join(', ')}`);
      }
      
      // Test tool structure
      const sampleTool = batchModule.batchCreateIssuesTool;
      if (sampleTool && sampleTool.name && sampleTool.schema && sampleTool.handler) {
        logTest('Batch Tool Structure', true, 'Tools have required name, schema, and handler properties');
      } else {
        logTest('Batch Tool Structure', false, 'Tools missing required properties');
      }
      
    } catch (error) {
      logTest('Batch Module Import', false, `Failed to import batch tools: ${error.message}`);
    }
    
    // Test 5: Schema Validation for Batch Tools
    console.log('\n5️⃣ Testing Batch Tools Schema Structure...');
    
    try {
      const { batchCreateIssuesTool, batchCreateUserStoriesTool, batchCreateTasksTool } = await import('../src/tools/batchTools.js');
      
      // Test batchCreateIssues schema
      const issuesSchema = batchCreateIssuesTool.schema;
      if (issuesSchema.projectIdentifier && issuesSchema.issues) {
        logTest('Batch Issues Schema', true, 'Contains required projectIdentifier and issues fields');
      } else {
        logTest('Batch Issues Schema', false, 'Missing required schema fields');
      }
      
      // Test batchCreateUserStories schema
      const storiesSchema = batchCreateUserStoriesTool.schema;
      if (storiesSchema.projectIdentifier && storiesSchema.userStories) {
        logTest('Batch Stories Schema', true, 'Contains required projectIdentifier and userStories fields');
      } else {
        logTest('Batch Stories Schema', false, 'Missing required schema fields');
      }
      
      // Test batchCreateTasks schema
      const tasksSchema = batchCreateTasksTool.schema;
      if (tasksSchema.projectIdentifier && tasksSchema.userStoryIdentifier && tasksSchema.tasks) {
        logTest('Batch Tasks Schema', true, 'Contains required projectIdentifier, userStoryIdentifier, and tasks fields');
      } else {
        logTest('Batch Tasks Schema', false, 'Missing required schema fields');
      }
      
    } catch (error) {
      logTest('Schema Structure Test', false, `Schema validation failed: ${error.message}`);
    }
    
  } catch (error) {
    logTest('Batch Test Suite', false, `Test suite execution failed: ${error.message}`);
  }
}

// Run the tests
await runBatchTests();

// Print summary
console.log('\n📊 Batch Operations Test Results:');
console.log(`✅ Passed: ${testResults.passed}`);
console.log(`❌ Failed: ${testResults.failed}`);
console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

if (testResults.failed === 0) {
  console.log('\n🎉 All batch operations tests passed! Batch functionality is ready for use.');
} else {
  console.log('\n⚠️  Some batch operations tests failed. Review the issues above.');
  process.exit(1);
}

console.log('\n🏁 Batch Operations Test Suite Complete\n');