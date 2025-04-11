# Advanced Transformation Examples

This document provides examples of advanced transformations that can be applied during the migration process from Zephyr Scale to qTest Manager.

## Text Transformations

### Combining Multiple Fields

**Scenario**: Combine "Objective" and "Precondition" fields into qTest's "Description" field.

**Configuration**:
```
Source Fields: Objective, Precondition
Target Field: Description
Transformation:
```

```javascript
function transform(objective, precondition) {
  let result = '';
  
  if (objective && objective.trim() !== '') {
    result += `<h3>Objective</h3>\n${objective}\n\n`;
  }
  
  if (precondition && precondition.trim() !== '') {
    result += `<h3>Preconditions</h3>\n${precondition}\n\n`;
  }
  
  return result;
}
```

**Result**:
```
<h3>Objective</h3>
Verify that the login functionality works with valid credentials

<h3>Preconditions</h3>
User has been created in the system
```

### Formatting HTML Content

**Scenario**: Ensure HTML content is properly formatted for qTest.

**Configuration**:
```
Source Field: Description
Target Field: Description
Transformation:
```

```javascript
function transform(description) {
  // Replace Zephyr-specific markup
  let result = description
    .replace(/<ac:structured-macro.*?>(.*?)<\/ac:structured-macro>/g, '$1')
    .replace(/<ri:url.*?ri:value="(.*?)".*?>(.*?)<\/ri:url>/g, '<a href="$1">$2</a>');
  
  // Ensure proper paragraph breaks
  result = result.replace(/\n{2,}/g, '</p><p>');
  result = `<p>${result}</p>`;
  result = result.replace(/<p>\s*<\/p>/g, '');
  
  return result;
}
```

### Converting Date Formats

**Scenario**: Convert dates from Zephyr format to qTest format.

**Configuration**:
```
Source Field: Custom Date Field
Target Field: Custom Date Field
Transformation:
```

```javascript
function transform(dateString) {
  if (!dateString) return null;
  
  // Parse Zephyr date (e.g., "2023-04-15T14:30:00.000Z")
  const date = new Date(dateString);
  
  // Format for qTest (e.g., "15-Apr-2023")
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()}-${months[date.getMonth()]}-${date.getFullYear()}`;
}
```

## Value Mappings

### Status Mapping

**Scenario**: Map Zephyr statuses to qTest statuses.

**Configuration**:
```
Source Field: Status
Target Field: Status
Mapping:
```

| Zephyr Value | qTest Value |
|--------------|-------------|
| Draft | Draft |
| Ready to Review | Ready for Review |
| Approved | Approved |
| Obsolete | Deprecated |
| In Progress | In Progress |

### Priority Mapping

**Scenario**: Map Zephyr priorities to qTest priorities with custom ordering.

**Configuration**:
```
Source Field: Priority
Target Field: Priority
Mapping:
```

| Zephyr Value | qTest Value |
|--------------|-------------|
| Critical | P0 - Critical |
| High | P1 - High |
| Medium | P2 - Medium |
| Low | P3 - Low |
| Trivial | P4 - Trivial |

### Component/Label Transformation

**Scenario**: Convert Zephyr components to qTest tags with prefix.

**Configuration**:
```
Source Field: Components (multi-select)
Target Field: Tags
Transformation:
```

```javascript
function transform(components) {
  if (!components || !Array.isArray(components)) return [];
  
  // Add "component-" prefix to each component name
  return components.map(component => `component-${component.toLowerCase().replace(/\s+/g, '-')}`);
}
```

**Result**:
```
Zephyr: ["User Interface", "Authentication"]
qTest: ["component-user-interface", "component-authentication"]
```

## List and Array Transformations

### Converting Semicolon-Separated List to Tags

**Scenario**: Convert a custom field with semicolon-separated values to qTest tags.

**Configuration**:
```
Source Field: Custom Field "TestEnvironments"
Target Field: Tags
Transformation:
```

```javascript
function transform(environments) {
  if (!environments) return [];
  
  // Split by semicolon and trim each value
  return environments
    .split(';')
    .map(env => env.trim())
    .filter(env => env !== '');
}
```

**Result**:
```
Zephyr: "Windows 10; Chrome; Production"
qTest: ["Windows 10", "Chrome", "Production"]
```

### Merging Multiple Lists

**Scenario**: Combine values from multiple Zephyr fields into a single qTest list field.

**Configuration**:
```
Source Fields: Labels, Components, CustomTags
Target Field: Tags
Transformation:
```

```javascript
function transform(labels, components, customTags) {
  let result = [];
  
  // Add labels
  if (labels && Array.isArray(labels)) {
    result = result.concat(labels);
  }
  
  // Add components with prefix
  if (components && Array.isArray(components)) {
    result = result.concat(components.map(c => `component-${c}`));
  }
  
  // Add custom tags if present
  if (customTags) {
    // Split by comma if it's a string
    if (typeof customTags === 'string') {
      result = result.concat(customTags.split(',').map(t => t.trim()));
    } else if (Array.isArray(customTags)) {
      result = result.concat(customTags);
    }
  }
  
  // Remove duplicates
  return [...new Set(result)];
}
```

## Step Transformations

### Formatting Test Steps

**Scenario**: Enhance test step formatting for better readability in qTest.

**Configuration**:
```
Step Transformation:
```

```javascript
function transformSteps(steps) {
  return steps.map(step => {
    // Format description
    let description = step.description || '';
    if (description) {
      description = `<strong>Action:</strong> ${description}`;
    }
    
    // Format expected result
    let expectedResult = step.expectedResult || '';
    if (expectedResult) {
      expectedResult = `<strong>Expected:</strong> ${expectedResult}`;
    }
    
    // Format data
    let data = step.data || '';
    if (data) {
      data = `<strong>Test Data:</strong> ${data}`;
    }
    
    return {
      ...step,
      description,
      expectedResult,
      data
    };
  });
}
```

### Converting Tabular Steps to Standard Format

**Scenario**: Convert steps stored in HTML tables to standard qTest test steps.

**Configuration**:
```
Source Field: Description (containing HTML table of steps)
Target Field: Steps
Transformation:
```

```javascript
function extractStepsFromTable(description) {
  // Example for parsing a specific table format
  const stepRegex = /<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/g;
  const steps = [];
  
  let match;
  while ((match = stepRegex.exec(description)) !== null) {
    const [, action, expected] = match;
    steps.push({
      description: action.trim(),
      expectedResult: expected.trim()
    });
  }
  
  return steps;
}
```

## Attachment Transformations

### Processing Embedded Images

**Scenario**: Extract and process embedded images from rich text fields.

**Configuration**:
```
Source Field: Description (with embedded images)
Target Fields: Description, Attachments
Transformation:
```

```javascript
function processEmbeddedImages(description) {
  const imgRegex = /<img.*?src="data:image\/(.*?);base64,(.*?)".*?>/g;
  const newDescription = description.replace(imgRegex, (match, format, data) => {
    // Generate a filename
    const filename = `embedded_image_${Date.now()}_${Math.floor(Math.random() * 1000)}.${format}`;
    
    // Add to attachments queue (this is a pseudo-code for the internal API)
    addAttachmentFromBase64({
      filename,
      data,
      mimeType: `image/${format}`
    });
    
    // Replace with a reference to the newly created attachment
    return `[Image: ${filename}]`;
  });
  
  return newDescription;
}
```

### Attachment Path Mapping

**Scenario**: Update attachment references in text content.

**Configuration**:
```
Attachment Reference Handling: Enabled
Path Transformation:
```

```javascript
function updateAttachmentReferences(content, attachmentMap) {
  // attachmentMap is provided by the system, mapping old paths to new paths
  let updatedContent = content;
  
  for (const [oldPath, newPath] of Object.entries(attachmentMap)) {
    // Update all references using various patterns
    updatedContent = updatedContent.replace(
      new RegExp(`\\[attachment:${oldPath}\\]`, 'g'),
      `[attachment:${newPath}]`
    );
    
    updatedContent = updatedContent.replace(
      new RegExp(`href=".*?/secure/attachment/${oldPath}"`, 'g'),
      `href="attachments/${newPath}"`
    );
  }
  
  return updatedContent;
}
```

## Complex Transformations

### Custom Test ID Generation

**Scenario**: Generate custom test IDs for qTest based on Zephyr test data.

**Configuration**:
```
Source Fields: Project, Component, TestKey
Target Field: ExternalId
Transformation:
```

```javascript
function generateCustomId(project, component, testKey) {
  // Extract numeric part from Zephyr test key
  const keyMatch = testKey.match(/(\w+)-(\d+)/);
  if (!keyMatch) return testKey;
  
  const [, projectCode, number] = keyMatch;
  
  // Generate component prefix (first two letters)
  let componentPrefix = '';
  if (component && typeof component === 'string') {
    componentPrefix = component.substring(0, 2).toUpperCase();
  } else if (Array.isArray(component) && component.length > 0) {
    componentPrefix = component[0].substring(0, 2).toUpperCase();
  }
  
  // Format: PROJECT-COMPONENT-NUMBER
  return `${projectCode}-${componentPrefix}-${number}`;
}
```

### Test Case Classification

**Scenario**: Classify test cases based on multiple fields.

**Configuration**:
```
Source Fields: Description, Steps, CustomField_Complexity
Target Field: CustomField_TestClass
Transformation:
```

```javascript
function classifyTestCase(description, steps, complexity) {
  // Determine test size based on step count
  const stepCount = Array.isArray(steps) ? steps.length : 0;
  let size = 'Medium';
  
  if (stepCount > 20) {
    size = 'Large';
  } else if (stepCount < 5) {
    size = 'Small';
  }
  
  // Determine test type based on description content
  let type = 'Functional';
  
  if (description) {
    if (description.toLowerCase().includes('performance') || 
        description.toLowerCase().includes('load test')) {
      type = 'Performance';
    } else if (description.toLowerCase().includes('security')) {
      type = 'Security';
    } else if (description.toLowerCase().includes('usability') || 
               description.toLowerCase().includes('ui test')) {
      type = 'UI';
    }
  }
  
  // Use provided complexity or derive from steps
  let testComplexity = complexity || 'Medium';
  if (!complexity) {
    if (stepCount > 15) {
      testComplexity = 'High';
    } else if (stepCount < 8) {
      testComplexity = 'Low';
    }
  }
  
  // Final classification
  return `${type} - ${size} - ${testComplexity}`;
}
```

### Handling Special Values

**Scenario**: Special handling for null, empty, or specific values.

**Configuration**:
```
Source Field: Any field
Target Field: Any field
Transformation:
```

```javascript
function handleSpecialValues(value) {
  // Handle null or undefined
  if (value === null || value === undefined) {
    return 'Not Specified';
  }
  
  // Handle empty string
  if (typeof value === 'string' && value.trim() === '') {
    return 'Not Specified';
  }
  
  // Handle specific placeholder values
  if (value === 'N/A' || value === 'TBD' || value === 'None') {
    return 'Not Specified';
  }
  
  // Return original value if no special handling needed
  return value;
}
```

## Conditional Transformations

### Apply Different Transformations Based on Test Type

**Scenario**: Apply different transformations based on the test type.

**Configuration**:
```
Source Fields: Type, Description
Target Field: Description
Transformation:
```

```javascript
function conditionalTransform(type, description) {
  if (!description) return '';
  
  // For manual tests, add additional guidance
  if (type === 'Manual') {
    return `<div class="manual-test-note">This test should be executed manually.</div>\n${description}`;
  }
  
  // For automated tests, add automation note
  if (type === 'Automated') {
    return `<div class="automation-note">This test is automated. See script reference.</div>\n${description}`;
  }
  
  // For exploratory tests, add structure
  if (type === 'Exploratory') {
    return `<h3>Exploratory Test Session</h3>
<p>Time Box: 30 minutes</p>
<p>Focus Areas:</p>
<ul>
  <li>Key functionality</li>
  <li>Edge cases</li>
  <li>User experience</li>
</ul>
<h3>Test Notes</h3>
${description}`;
  }
  
  // Default case
  return description;
}
```

### Dynamic Field Mapping Based on Content

**Scenario**: Dynamically determine target field based on content.

**Configuration**:
```
Source Field: CustomField_TestInfo
Target Fields: determined dynamically
Transformation:
```

```javascript
function dynamicFieldMapping(testInfo) {
  const result = {};
  
  // Default empty values
  result.automationReference = '';
  result.testEnvironment = '';
  result.prerequisites = '';
  
  if (!testInfo) return result;
  
  // Check for automation script reference
  const automationMatch = testInfo.match(/Automation Script:\s*(.+?)(?=\n|$)/);
  if (automationMatch) {
    result.automationReference = automationMatch[1].trim();
  }
  
  // Check for environment information
  const envMatch = testInfo.match(/Environment:\s*(.+?)(?=\n|$)/);
  if (envMatch) {
    result.testEnvironment = envMatch[1].trim();
  }
  
  // Check for prerequisites
  const prereqMatch = testInfo.match(/Prerequisites:\s*(.+?)(?=\n|$)/);
  if (prereqMatch) {
    result.prerequisites = prereqMatch[1].trim();
  }
  
  return result;
}
```

## Performance Optimizations

### Efficient Bulk Transformations

**Scenario**: Optimize transformations for large batches of test cases.

**Configuration**:
```
Batch Processing: Enabled
Transformation:
```

```javascript
// This transformation is applied to batches of test cases at once
function bulkTransform(testCases) {
  // Pre-compile regular expressions
  const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;
  const userRegex = /\[@(.+?)\]/g;
  
  // Create a map of user references
  const userMap = {};
  
  // Process all test cases in a single pass
  return testCases.map(testCase => {
    // Clone to avoid modifying original
    const processed = { ...testCase };
    
    // Process description
    if (processed.description) {
      // Replace timestamps
      processed.description = processed.description.replace(
        timestampRegex, 
        'Timestamp removed during migration'
      );
      
      // Replace user references with consistent format
      processed.description = processed.description.replace(
        userRegex,
        (match, username) => {
          if (!userMap[username]) {
            userMap[username] = `@${username}`;
          }
          return userMap[username];
        }
      );
    }
    
    return processed;
  });
}
```

## Advanced JavaScript Examples

### Using External Libraries

Skidbladnir supports using certain pre-approved libraries in transformations. Here's an example with a date manipulation library:

```javascript
// Using DayJS for date manipulation
function transformDate(dateString) {
  // dayjs is pre-loaded
  const date = dayjs(dateString);
  
  if (!date.isValid()) return null;
  
  // Format for target system and add weekday
  return date.format('DD MMM YYYY') + ' (' + date.format('dddd') + ')';
}
```

### Working with Complex HTML

```javascript
function cleanupHtml(html) {
  // Use DOMParser (available in the transformation environment)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove all style attributes
  const elementsWithStyle = doc.querySelectorAll('[style]');
  elementsWithStyle.forEach(el => {
    el.removeAttribute('style');
  });
  
  // Convert specific tags
  const tableCells = doc.querySelectorAll('td');
  tableCells.forEach(cell => {
    // Check if cell only contains a check mark or 'x'
    if (cell.textContent.trim() === '✓' || cell.textContent.trim() === '✗') {
      // Create a new element with appropriate styling
      const newEl = doc.createElement('span');
      newEl.className = cell.textContent.trim() === '✓' ? 'checkmark' : 'x-mark';
      newEl.textContent = cell.textContent;
      
      // Replace cell contents
      cell.innerHTML = '';
      cell.appendChild(newEl);
    }
  });
  
  // Get cleaned HTML
  return doc.body.innerHTML;
}
```

## Testing Your Transformations

Skidbladnir provides a transformation testing tool to verify your transformations before applying them to actual data:

1. Navigate to the "Field Mapping" tab
2. Click on "Test Transformation" next to your configured transformation
3. Enter sample input values
4. Click "Test" to see the transformation result
5. Adjust your transformation as needed

## Conclusion

These examples demonstrate the flexibility and power of Skidbladnir's transformation capabilities. By leveraging these advanced transformations, you can ensure that your test assets are migrated accurately and efficiently from Zephyr Scale to qTest Manager.

For additional assistance with transformations, please contact our support team or consult the [transformation API reference](transformation-api-reference.md).