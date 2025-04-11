/**
 * Utility functions for creating test cases for different providers
 */

/**
 * Creates a Zephyr test case object
 * 
 * @param {string} id - Test case ID
 * @param {string} name - Test case name
 * @param {string} description - Test case description
 * @returns {object} Zephyr test case
 */
function createZephyrTestCase(id, name, description) {
  return {
    id: id,
    name: name,
    description: description,
    priority: 'Medium',
    status: 'Draft',
    steps: [
      {
        order: 1,
        description: 'Navigate to test page',
        expectedResult: 'Page loads successfully'
      },
      {
        order: 2,
        description: 'Enter test data',
        expectedResult: 'Data is accepted'
      },
      {
        order: 3,
        description: 'Submit the form',
        expectedResult: 'Form processes successfully'
      }
    ],
    labels: ['Automated', 'Regression'],
    folder: '/Test Folder',
    createdBy: 'Test User',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Creates a qTest test case object
 * 
 * @param {string} id - Test case ID
 * @param {string} name - Test case name
 * @param {string} description - Test case description
 * @returns {object} qTest test case
 */
function createQTestTestCase(id, name, description) {
  return {
    id: id,
    name: name,
    description: description,
    properties: [
      { field_id: 'priority', field_value: 'Medium' },
      { field_id: 'status', field_value: 'Ready' }
    ],
    test_steps: [
      {
        order: 1,
        description: 'Navigate to test page',
        expected_result: 'Page loads successfully'
      },
      {
        order: 2,
        description: 'Enter test data',
        expected_result: 'Data is accepted'
      },
      {
        order: 3,
        description: 'Submit the form',
        expected_result: 'Form processes successfully'
      }
    ],
    parent_id: 123,
    created_date: new Date().getTime(),
    last_modified_date: new Date().getTime()
  };
}

/**
 * Creates a Micro Focus ALM test case object
 * 
 * @param {string} id - Test case ID
 * @param {string} name - Test case name
 * @param {string} description - Test case description
 * @returns {object} Micro Focus ALM test case
 */
function createMicroFocusTestCase(id, name, description) {
  return {
    id: id,
    name: name,
    description: description,
    Fields: [
      { Name: 'priority', Value: 'Medium' },
      { Name: 'status', Value: 'Ready' },
      { Name: 'owner', Value: 'Test User' }
    ],
    DesignSteps: [
      {
        StepName: 'Step 1',
        StepDescription: 'Navigate to test page',
        ExpectedResult: 'Page loads successfully'
      },
      {
        StepName: 'Step 2',
        StepDescription: 'Enter test data',
        ExpectedResult: 'Data is accepted'
      },
      {
        StepName: 'Step 3',
        StepDescription: 'Submit the form',
        ExpectedResult: 'Form processes successfully'
      }
    ],
    ParentId: 123
  };
}

/**
 * Creates a TestRail test case object
 * 
 * @param {string} id - Test case ID
 * @param {string} name - Test case name
 * @param {string} description - Test case description
 * @returns {object} TestRail test case
 */
function createTestRailTestCase(id, name, description) {
  return {
    id: parseInt(id.replace(/\D/g, '')) || 1,
    title: name,
    custom_description: description,
    priority_id: 2, // Medium
    custom_steps_separated: [
      {
        content: 'Navigate to test page',
        expected: 'Page loads successfully'
      },
      {
        content: 'Enter test data',
        expected: 'Data is accepted'
      },
      {
        content: 'Submit the form',
        expected: 'Form processes successfully'
      }
    ],
    type_id: 1,
    section_id: 1,
    created_by: 1,
    created_on: Math.floor(Date.now() / 1000)
  };
}

/**
 * Creates a Jama test case object
 * 
 * @param {string} id - Test case ID
 * @param {string} name - Test case name
 * @param {string} description - Test case description
 * @returns {object} Jama test case
 */
function createJamaTestCase(id, name, description) {
  return {
    id: id,
    name: name,
    description: description,
    fields: {
      priority: {
        id: 'priority',
        value: 'Medium'
      },
      status: {
        id: 'status',
        value: 'Draft'
      }
    },
    steps: [
      {
        action: 'Navigate to test page',
        expectedResult: 'Page loads successfully'
      },
      {
        action: 'Enter test data',
        expectedResult: 'Data is accepted'
      },
      {
        action: 'Submit the form',
        expectedResult: 'Form processes successfully'
      }
    ],
    documentKey: 'TC-' + id,
    project: 123,
    location: {
      parent: {
        id: 456
      }
    },
    createdDate: new Date().toISOString(),
    modifiedDate: new Date().toISOString()
  };
}

// Export test case creation utilities
module.exports = {
  createZephyrTestCase: createZephyrTestCase,
  createQTestTestCase: createQTestTestCase,
  createMicroFocusTestCase: createMicroFocusTestCase,
  createTestRailTestCase: createTestRailTestCase,
  createJamaTestCase: createJamaTestCase
};