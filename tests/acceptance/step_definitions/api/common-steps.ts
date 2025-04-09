/**
 * Common API step definitions for Cucumber
 * 
 * This file defines step definitions that can be used across multiple API features.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { SkidbladnirWorld } from '../../support/world';
import { expect } from 'chai';
import lodash from 'lodash';

/**
 * API Request steps
 */
When('I make a {word} request to {string}', async function(this: SkidbladnirWorld, method: string, path: string) {
  await this.createTestRequest(method.toUpperCase(), path);
});

When('I make a {word} request to {string} with the following data:', async function(this: SkidbladnirWorld, method: string, path: string, dataTable: any) {
  const data = dataTable.rowsHash();
  await this.createTestRequest(method.toUpperCase(), path, data);
});

When('I make a {word} request to {string} with the following JSON:', async function(this: SkidbladnirWorld, method: string, path: string, jsonString: string) {
  const data = JSON.parse(jsonString);
  await this.createTestRequest(method.toUpperCase(), path, data);
});

/**
 * Response assertion steps
 */
Then('the response status code should be {int}', function(this: SkidbladnirWorld, statusCode: number) {
  expect(this.context.apiResponse?.status).to.equal(statusCode);
});

Then('the response should contain a field {string} with value {string}', function(this: SkidbladnirWorld, field: string, value: string) {
  const responseData = this.context.responseData;
  expect(lodash.get(responseData, field)).to.equal(value);
});

Then('the response should contain a field {string} with a non-empty value', function(this: SkidbladnirWorld, field: string) {
  const responseData = this.context.responseData;
  const fieldValue = lodash.get(responseData, field);
  expect(fieldValue).to.exist;
  expect(fieldValue).to.not.be.empty;
});

Then('the response should contain a field {string}', function(this: SkidbladnirWorld, field: string) {
  const responseData = this.context.responseData;
  expect(lodash.get(responseData, field)).to.exist;
});

Then('the components should include {string}', function(this: SkidbladnirWorld, component: string) {
  const components = this.context.responseData?.components || {};
  expect(components).to.have.property(component);
  expect(components[component]).to.have.property('status');
});

/**
 * Authentication steps
 */
Given('I am authenticated with a valid API token', function(this: SkidbladnirWorld) {
  // In a real implementation, we'd get a token from somewhere
  const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  this.setAuthToken(sampleToken);
});