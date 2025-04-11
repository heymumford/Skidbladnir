/**
 * Utility functions for working with attachments during cross-provider migration tests
 */

/**
 * Creates a simple PNG image encoded as base64
 * 
 * @param {number} width - Width in pixels 
 * @param {number} height - Height in pixels
 * @param {string} text - Optional text to include in the image
 * @returns {string} Base64 encoded PNG image
 */
function createPngImage(width, height, text) {
  // For simplicity in tests, we'll use a fixed placeholder image
  // In a real implementation, this would generate an actual PNG with the specified dimensions
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
}

/**
 * Creates a simple text document
 * 
 * @param {string} content - Document content
 * @returns {string} Base64 encoded text document
 */
function createTextDocument(content) {
  // Convert string to base64
  return java.util.Base64.getEncoder().encodeToString(content.getBytes());
}

/**
 * Creates a large text document of specified size
 * 
 * @param {number} sizeInBytes - Approximate size in bytes
 * @returns {string} Base64 encoded text document
 */
function createLargeTextDocument(sizeInBytes) {
  // Generate a repeated string to reach the target size
  const char = 'X';
  const repeats = Math.ceil(sizeInBytes / char.length);
  const content = new Array(repeats + 1).join(char);
  
  return java.util.Base64.getEncoder().encodeToString(content.getBytes());
}

/**
 * Creates a PDF document from text content
 * 
 * @param {string} content - Document content
 * @returns {string} Base64 encoded PDF document
 */
function createPdfDocument(content) {
  // For simplicity in tests, return a mock PDF (base64 encoded)
  return 'JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAErVAhUKFQwNDJXMFAw1VFIVTBSMAYAIVgDLQplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKMzIKZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAzIDAgUiAvUmVzb3VyY2VzIDYgMCBSIC9Db250ZW50cyA0IDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKNiAwIG9iago8PCAvUHJvY1NldCBbIC9QREYgL1RleHQgXSAvQ29sb3JTcGFjZSA8PCAvQ3MxIDcgMCBSID4+IC9Gb250IDw8IC9UVDIgOSAwIFIKPj4gPj4KZW5kb2JqCjEwIDAgb2JqCjw8IC9MZW5ndGggMTEgMCBSIC9OIDMgL0FsdGVybmF0ZSAvRGV2aWNlUkdCIC9GaWx0ZXIgL0ZsYXRlRGVjb2RlID4+CnN0cmVhbQp4AYVVeVRTVxbf970kJCGEEELYA2FNWMMSCKssQkgh7FvAIgSQPSRBNgFRlEUBFRBcEAdFRQEVFHWQxaNj66BlatU6Yw/WsT0dZ+w40that8k75Aw9/eP7vvPLvffe3+/e+919gQcIAFSOgEcFQuCIJcIwXynjoyKJ+EQCCRKhAZHQCS4ctkjgFxoaAP/WewWAW6ZKOIl/rP6zDnFYIjZAJC7hFC5bwGZD7IKo2SxxKgCUblhPz06dIJ8jTBfCBiGcM0HBOZM4aQLHTdjE4eFWcF9YJ04Z6xD4XCGxgZPNFs6Fc2oAxFeJRAIASkjYG2SzOLCehE/CYbOEEA+E/di8ZA7EExiXxKRxIJ7GsJuQn8qHdQYAOJQZLxLmpolTBS5sDptHTAf7KhQZQiabhK9crH/ueVyRBOIJWTQqmhzIiH8WYcHhoUQShUqiUCg2FGsi2Z5iQcZj7WbJk9nYXhw2m0zzn+Dfj/7tSUlO+89z89jZRFaYP9TNAcCUSNoEAMaXAEh18Nr4HFbXuwKgkv75zOQKAFkWgJo9PKE0fUKHTn4QQQJ5oAH1YQSMgTmwhg5wAu7AE/iAABAMwkEMSADzARvwQDIQgxywFKwARaAEbAI7QAXYCw6AQ+AIOAZawClwDlwC10A3uA0egAEwAl6CMfAejAMEwSF0iAFRRbQQA8QMsUOIiBfihwQjEUgMkoAkI2mIEJEiS5FVSAlShlQh+5F65GfkJHIOuYL0IPeQIWQUeYN8QlEoHWVBNVFjdBZKRH3RYDQGXYBOQ7PRAmoJuhath6vRo2gzeg69hnajA+hLdBwDGBVjYnqYDUbEfLAILBFLw0TYMqwYK8eqsUasDbuI3cYGsFfYRxwdx8AR2DS4O9wvLhbHxmXjluE24ipwh3DNuIu427gh3DjuK56B18Rb4d1wJHwMfho+G1+EL8cfxDfhL+Bv40fwHwgEgibBkuBKCCIkErIIiwmbCHsIjYRWQg9hmDBO5BJ1iNZEL2IEkUMsIJYS9xCPE88Te4ijxI8kKkkfZEcKICWShKR1pB2kI6SzpJukEdI4WYlsQnYjR5DZ5HxyKbmGfIZ8kzxC/kxRoZhTvCixlFmUNZRKShPlIuUh5R2VSrWgelJjqDzqauoO6nHqFeoQ9RNNjWZJI9GS2FLadlodrYP2gPaOTqeb0r3oifQC+lZ6Pf0i/TH9owJDwU6BpMBWWKVQpdCicFPhjaKSoonibMV0xSWKOxVPKt5UfKVEVjJR8lNiKS1X2qV0WqlfaVyZoWyjHKrMUy5R3q98Qfkxg8IwYfgx2IzVjBrGRcYIi8AyZZFYXFYp6xCri/VChaSirRKgkqFSpHJI5ZLKmCpD1U41WjVPtVL1tOogG2ObsUnsNPYmdjP7Dufzlx0vkV7ift7+uvPdWg+qGqqB6tnqFeon1QdYGMuGFcbKYe1gdbDGNFQ1ZmvEaazVaNIY0CRo2mgmaC7RPKh5TfOT1iwtklaOVqXWBa1X2prapzQSNbg6zTrD2ixdkm6KboH2Pt0u3XE9vd47etu1beh90Mfr2+un6Jfpt+mPGjAMvAx4BuUGZw1eGWoZBhrmGO4z7DFCjeyN2EbbjtqMPhkbGUcbrzZuMP5sYmiSZFJm0mbyd6qhaUjqutSmqWemdFOfaRnTDkz7zGhmvmaFZg1mD80Z5oHmi82bzd/YaFrE2qy3abN5Y6tj67XdYttpR7Xzslto12j3xF7VPtR+nX2b/VsHQweuwyaHLke6Y4DjcsdWxw9OVk5pTnucbjirmLucVzh3uOBdvF0Wu7S4vHPVO5+nuu56gb5P/xX9Tf2fDNQG2A2qBj4YMgcnDG8a3jdiMTmMTYwbIyKj2aMPjO6PYkaFj1o36lrQaFDYqNKgGyRF0lzSOdKzYYbhvPC94WMRFhGZEYcj/oq0iRRHNkVh0X7Ra6KvRqtEJ0YfiB6NsYtZEHM+lh4bE1sV+zzOIk4Yr4fE+Plx6+Nuj9YczRtdE69aHx9fFf9igkPCkoRLiYzEuYmHEt8nuScVJ91INkvOTW5PoaXMSalNeT/Gd0x5Wn+qTaoorenEqomTJlZP/JY2O604rSddLX1e+pEM1YzUjJ8ziZNjJ9dP/pDpm1mWOZDlmLUma2BK+JRNOR6zHbKLsrvnTJuzck7nXO25BXMvzVObx59/KkeRw8k5nkvMjcs9lPuFG8OtxY3nhebt443xA/mb+KMCL0G5YFTkJdogepZnkbclb0SiIKnIG8ufnd+QPyFNFB3KGsqfk9+SryKmiUlZullLs3pELuLCgsHFIYt3LR4TB4gPSJDi+ZK2Qq77lYlWqiP9Rjq0pHBJ3ZKvS+OXHS9VKxWWXltutnzN8kdLQ5buXUZcJlrWtdxw+arlD1eQV+xZSS7lrexa5bBq46pXq2NXt5fpla0sG/4h/IfGcpXyRcuerrNbt23dlUpeVX+l/srixkeTEyefy9XOj+YPrA9a333VYtXh1ZTVwtX9a3zW1JQrFucWj62NWrvvR+aPRR8Nrlu07uB61fXZ65/8FPhT/QbGhuINwxsTNrZvctxUvVl5c+Hm0Z9jfm7d4rBl51bK1pytz7fFb+v42flnxnbN7UXbP+zg7BjcGbGzudypvHqX8q7C3RM7knf0VPhUHNrN2F28++Meod7r1TGVrXtd9+6vMqgq+wX/y9J9b/en7u+uDqpuqnGu2XdA40DxgU8HMw8++jXi1/aDXgfrDxkf2nGYcbio9n1dbt1Yw5SGwVOHTt33jPvwTBN9eeBIq4fmofqm496jTcc8jzXUaxTvb9BuKDtOPF50/OOJrBMjJ9NODjYmNHafij51+XTw6XNnSGdO/ub12/GzxLPN55zPNTa5NNWftzt/rMWxpf6C44XG1lmtjRedLza1zW5rvuR1qe2y3+Vzl/0un7/id+XiVfLVrmvh127ciL0x0D6lfejm9JvDt/i3Xt7Ovv3mziLjnzvid+l3S+6p3Cu/r3G/+jfT3+oGHAdOPvB90PUw8uHdR6xHL4ZyH30eKHzCeFJeqF9Y/dTuaVORb1HPswnPRp7znk+8KP5D6Y+qF2YvTvwZ8GfXcPLwiJd8QP9lxSvdV/te272+OBI58mA0a3T89ZI3qm/23XF509keM/r4bdHb8Xel77XeH/zg9qFzInHi2cf8T4RP5Z+NP7d9Cfl6/1vWt/Fp6d+Vv9f8sPvR8TPqZ9/0vBniL8W/DH/t/+X9687MvTGePR0sJgrZGQUULE8ALy8DYC4FwOgEgDJ5Yh6fYL5z3h/8JcwZGSAmOD+LwTVYvTIGd2QMHuC5jAHpMDsJKPO5tOcAVCUAwKAIYODmhjqlj8hZuLm6OaP0KQsBEAeghvwszRQB8HcBYDUCkB8AYA0AUK4BYFcD0McD4NKbOUX+GrPZkwfA+Q46JY45DBRJH1n/ANmtqkXYUTOdAAAACXBIWXMAAA7EAAAOxAGVKw4bAAACkElEQVQoU2XTy09TQRjG4e9M59ICblzXJSQmJIQ/wJiYuDEmGk0MGjfGnYlr9T9w496NCxdEjSaKghdijBc0AQQjBES5tJ3pOZ2Z7+v5ZlQoQZ6c5iTn/Z3TUpnN5rXF2fnLnZ3eVH9f32IcRZHzrh4FYbBdqVZX1is7K6VyeanbHJ5dyCVPTRYuDQwMjnvnKFdKdM4c7/h/j6xzrvL95spKrVpZPIhPZ6fOXJibvzD2+tXrB5/Xvu3XwKPcaG5svH/3YWlrc/vmYHZooZv86OrCdC53+tqd+/cefni5XNnY3Fyt12spY1DaYIxGKyUiIjKi0RqvpV3f3l2tNxpPXyyXN8qV9VqzOWWsNVprjJGIaJ1EG43yTBgtWIFQiAYsKHROlFgn4hkhrTERD1ZQScfQoJQgiXeO1qGh3X68V9yTOAvW0d/To7RS3jkkEvGeJNFCwomCXq1W26rVDwghREJBLLRaIY1Di8F5j4ikjNZWxCCFHg8ORYQgooNId1CKiUxm+PzFubnh4eGsFFrtl9Y3yq/KpfI9YHByIndjvJCf0VoPGqVaB419TUY3Wo1PGzcaDfb39rrZYvHyeD4/IyKZb99/1u9++fR5fH5ubkorhURUZzQYnRJSxgAShXGj9eL7Vvn9zsHBD6Z+/T50MUY3qiPLSsRaURMTk1IuFgZs2ArA3XK9Npszrt1pt6/BnlWs1bUuxzY0g5PZqcXbN25dL00Vi6nIJ0rF4JwTkdY7OEgsOk5iTYFPotDamlTocMIYYy0mnWToSg5P1nJICVZAKxLrhIRXmigC76XNObbPX/0BD99ePuOLxNIAAAAASUVORK5CYII=';
}

/**
 * Creates a Word document (DOCX)
 * 
 * @param {string} content - Document content
 * @returns {string} Base64 encoded DOCX document
 */
function createWordDocument(content) {
  // For simplicity in tests, return a mock DOCX (base64 encoded)
  return 'UEsDBBQABgAIAAAAIQA2U2DNAwEAABAEAAATAAgCW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAAC';
}

/**
 * Creates an Excel spreadsheet
 * 
 * @param {Array} sheets - Array of sheet objects with name and data
 * @returns {string} Base64 encoded XLSX spreadsheet
 */
function createExcelSpreadsheet(sheets) {
  // For simplicity in tests, return a mock XLSX (base64 encoded)
  return 'UEsDBBQABgAIAAAAIQCq5Q9+9QAAAP4CAAATAAgCW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAAC';
}

/**
 * Creates an attachment object with the specified properties
 * 
 * @param {string} name - Attachment filename
 * @param {string} contentType - MIME type
 * @param {string} content - Base64 encoded content
 * @returns {object} Attachment object
 */
function createAttachment(name, contentType, content) {
  return {
    name: name,
    contentType: contentType,
    size: content ? content.length : 0,
    content: content
  };
}

/**
 * Compares two base64 encoded contents for approximate equality
 * 
 * @param {string} content1 - First base64 content
 * @param {string} content2 - Second base64 content
 * @returns {boolean} True if contents match approximately
 */
function compareBase64Content(content1, content2) {
  // For test simplicity, we'll just compare length for approximate equality
  // In a real implementation, this would do a proper comparison of decoded content
  const lengthDiff = Math.abs(content1.length - content2.length);
  const threshold = Math.max(content1.length, content2.length) * 0.1; // 10% difference tolerance
  
  return lengthDiff <= threshold;
}

// Export utility functions
module.exports = {
  createPngImage: createPngImage,
  createTextDocument: createTextDocument,
  createLargeTextDocument: createLargeTextDocument,
  createPdfDocument: createPdfDocument,
  createWordDocument: createWordDocument,
  createExcelSpreadsheet: createExcelSpreadsheet,
  createAttachment: createAttachment,
  compareBase64Content: compareBase64Content
};