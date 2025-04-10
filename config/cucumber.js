/**
 * Cucumber.js configuration file
 * 
 * This file configures how Cucumber.js runs acceptance tests in the Skidbladnir project.
 * It defines different profiles for various testing scenarios.
 */

module.exports = {
  // Default profile - runs all features
  default: {
    paths: ['tests/acceptance/features/**/*.feature'],
    require: [
      'tests/acceptance/step_definitions/**/*.ts',
      'tests/acceptance/support/**/*.ts'
    ],
    requireModule: ['ts-node/register'],
    format: [
      'progress',
      '@cucumber/pretty-formatter',
      'html:test-results/cucumber/report.html',
      'json:test-results/cucumber/report.json'
    ],
    parallel: 2,
    retry: 1,
    tags: 'not @skip and not @wip'
  },

  // Development profile - shows more verbose output
  dev: {
    paths: ['tests/acceptance/features/**/*.feature'],
    require: [
      'tests/acceptance/step_definitions/**/*.ts',
      'tests/acceptance/support/**/*.ts'
    ],
    requireModule: ['ts-node/register'],
    format: [
      '@cucumber/pretty-formatter',
      'html:test-results/cucumber/report.html'
    ],
    tags: 'not @skip',
    publishQuiet: false
  },

  // WIP (Work In Progress) profile - only runs features tagged with @wip
  wip: {
    paths: ['tests/acceptance/features/**/*.feature'],
    require: [
      'tests/acceptance/step_definitions/**/*.ts',
      'tests/acceptance/support/**/*.ts'
    ],
    requireModule: ['ts-node/register'],
    format: [
      '@cucumber/pretty-formatter',
      'html:test-results/cucumber/report.html'
    ],
    tags: '@wip'
  },

  // CI profile - optimized for continuous integration environments
  ci: {
    paths: ['tests/acceptance/features/**/*.feature'],
    require: [
      'tests/acceptance/step_definitions/**/*.ts',
      'tests/acceptance/support/**/*.ts'
    ],
    requireModule: ['ts-node/register'],
    format: [
      'progress',
      'json:test-results/cucumber/report.json'
    ],
    parallel: 4,
    retry: 2,
    tags: 'not @skip and not @wip',
    publishQuiet: true
  },

  // Smoke tests profile - only runs critical paths
  smoke: {
    paths: ['tests/acceptance/features/**/*.feature'],
    require: [
      'tests/acceptance/step_definitions/**/*.ts',
      'tests/acceptance/support/**/*.ts'
    ],
    requireModule: ['ts-node/register'],
    format: [
      'progress',
      'html:test-results/cucumber/report.html',
      'json:test-results/cucumber/report.json'
    ],
    tags: '@smoke and not @skip'
  }
};