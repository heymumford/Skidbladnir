# Field Mapping Reference

This document provides a comprehensive reference for mapping fields between Zephyr Scale and qTest Manager during migration.

## Standard Field Mappings

The following table shows the recommended standard mappings between Zephyr Scale and qTest fields:

| Zephyr Scale Field | qTest Field | Notes |
|-------------------|-------------|-------|
| Name | Name | Test case name |
| Description | Description | Rich text support with HTML preservation |
| Test Key | External ID | Preserved as reference to original test |
| Objective | Description (prepended) | Can be combined with description |
| Status | Status | Values mapped according to status configuration |
| Priority | Priority | Values typically mapped as: Low→Low, Medium→Medium, High→High |
| Owner | Owner | User mapping may be required |
| Folder | Module | Hierarchical folder structure is preserved |
| Component | Component | Multiple components supported |
| Labels | Tag | Multiple labels/tags supported |
| Estimated Time | Estimated Time | Converted to appropriate time format |
| Execution Type | Test Type | Manual/Automated mapping |
| Precondition | Precondition | Preserved as separate field |
| Test Data | Custom Field | May require custom field in qTest |
| Created | Created Date | Timestamp preserved |
| Updated | Last Modified Date | Timestamp preserved |

## Custom Field Handling

Custom fields in Zephyr Scale can be mapped to custom fields in qTest. The following custom field types are supported:

| Zephyr Field Type | Compatible qTest Field Types | Transformation Notes |
|------------------|---------------------------|---------------------|
| Text | Text, Text Area | Direct mapping |
| Text Area | Text Area, Rich Text | HTML formatting preserved |
| Rich Text | Rich Text | HTML formatting preserved |
| Checkbox | Checkbox | Boolean value preserved |
| Number | Number | Decimal precision preserved |
| Date | Date | Format may be adjusted |
| Date & Time | Date & Time | Timezone adjustments may be needed |
| Single Select | Single Select List | Value mapping may be required |
| Multi Select | Multi Select List | Value mapping may be required |
| User | User List | User mapping may be required |
| URL | URL, Text | Direct mapping |

## Test Step Mapping

Test steps in Zephyr Scale are mapped to test steps in qTest with the following field mappings:

| Zephyr Step Field | qTest Step Field | Notes |
|-------------------|-----------------|-------|
| Step Number | Step Order | Sequence preserved |
| Description | Description | Rich text formatting preserved |
| Expected Result | Expected Result | Rich text formatting preserved |
| Test Data | Data | May require custom setup |
| Attachments | Attachments | Files migrated with steps |

## Advanced Mapping Features

### Value Mapping

Value mapping allows you to specify how values in certain fields should be transformed during migration. For example:

| Zephyr Priority | qTest Priority |
|----------------|---------------|
| Highest | Critical |
| High | High |
| Medium | Medium |
| Low | Low |
| Lowest | Minor |

### Field Concatenation

You can combine multiple Zephyr fields into a single qTest field:

Example: Combine "Objective" and "Description" into qTest "Description" field:
```
Objective: ${objective}

Description:
${description}
```

### Field Splitting

You can split a single Zephyr field into multiple qTest fields using regular expressions or delimiter-based splitting.

Example: Split "Environment" field by comma into multiple tags:
```
Source: "Windows, Chrome, Production"
Target: Three separate tags: "Windows", "Chrome", "Production"
```

### Text Transformations

The following text transformations are available:

| Transformation | Description | Example |
|----------------|-------------|---------|
| Trim | Remove leading/trailing whitespace | "  text  " → "text" |
| Upper Case | Convert to uppercase | "text" → "TEXT" |
| Lower Case | Convert to lowercase | "TEXT" → "text" |
| Title Case | Capitalize first letter of each word | "test case" → "Test Case" |
| Replace | Find and replace text | Replace "Zephyr" with "qTest" |
| Append | Add text to end | Append "[Migrated]" |
| Prepend | Add text to beginning | Prepend "MIGRATED: " |
| Substring | Extract part of text | Extract first 100 characters |
| Regex Replace | Replace using regular expressions | Complex pattern matching |

### JavaScript Transformations

For complex transformations, you can use JavaScript functions to transform field values:

```javascript
// Example: Custom transformation for version fields
function transformVersion(zephyrVersion) {
  // Extract major and minor versions
  const match = zephyrVersion.match(/v(\d+)\.(\d+)/);
  if (!match) return zephyrVersion;
  
  const [, major, minor] = match;
  // Format as qTest expects
  return `Version ${major}.${minor}`;
}
```

## Special Handling Cases

### Attachments

Attachments are handled with special consideration:

- File size limits: qTest has a file size limit of 100MB per attachment
- File types: All file types supported by Zephyr are also supported by qTest
- Attachment references: References in test descriptions are updated to point to new locations

### Rich Text and HTML

Rich text formatting is preserved during migration:

- Formatting: Bold, italic, underline, etc.
- Tables: Table structure is preserved
- Lists: Ordered and unordered lists are preserved
- Images: Embedded images are extracted and re-embedded
- Links: URLs are preserved

### Test Case Relationships

Relationships between test cases are migrated as follows:

| Zephyr Relationship | qTest Relationship |
|---------------------|-------------------|
| Blocks | Blocks |
| Is Blocked By | Is Blocked By |
| Relates To | Relates To |
| Duplicates | Similar |
| Is Duplicated By | Similar |
| Parent Of | Parent |
| Child Of | Child |

## Field Mapping Best Practices

1. **Map essential fields first**: Ensure core fields like Name, Description, and Steps are correctly mapped
2. **Preserve IDs**: Always map the Zephyr Test Key to a field in qTest for reference
3. **Check field lengths**: Some fields may have different length restrictions
4. **Test with samples**: Always test your mapping with representative samples
5. **Handle rich text carefully**: Verify that formatting is preserved correctly
6. **Document custom mappings**: Keep a record of any custom transformations
7. **Use field mapping templates**: Save and reuse successful mapping configurations

## Troubleshooting Field Mapping Issues

### Common Problems

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| Missing field values | Field not mapped correctly | Check mapping configuration |
| Truncated text | Field length limit in qTest | Use custom field with larger capacity |
| Formatting lost | Rich text conversion issue | Enable HTML preservation option |
| Drop-down values missing | Value mapping not configured | Set up value mapping for the field |
| Custom field errors | Field type mismatch | Check field type compatibility |

### Field Validation

The system validates field mappings before migration to identify potential issues:

- **Type compatibility**: Ensures source and target field types are compatible
- **Required fields**: Verifies all required target fields are mapped
- **Value mapping**: Checks that all source values have corresponding target values
- **Special characters**: Identifies problematic characters that might need escaping

## Advanced Configuration

For advanced field mapping scenarios, Skidbladnir supports:

- **Conditional mapping**: Apply different mappings based on field values
- **Two-stage transformations**: Apply multiple transformations in sequence
- **Default values**: Set default values for unmapped or empty fields
- **Scripted mapping**: Use JavaScript to implement complex mapping logic
- **Reference preservation**: Maintain links to external systems

## Further Resources

- [qTest Field Types Reference](https://support.qasymphony.com/hc/en-us/articles/360004699572-Custom-Fields-qTest-Manager)
- [Zephyr Scale Field Types](https://support.smartbear.com/zephyr-scale-cloud/docs/fields-and-screens/custom-fields.html)
- [HTML to Rich Text Conversion Guide](html-conversion.md)
- [JavaScript Transformation Examples](js-transformation-examples.md)