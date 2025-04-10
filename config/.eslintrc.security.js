module.exports = {
  "extends": [
    "./.eslintrc.js",
    "plugin:security/recommended"
  ],
  "plugins": [
    "security"
  ],
  "rules": {
    // Additional security-specific rules
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "warn",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-pseudoRandomBytes": "warn",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-html-injection": "error",
    "security/detect-sql-literal-injection": "error",
    "security/detect-unhandled-event-errors": "warn",
    "security/detect-xpath-injection": "error"
  }
};