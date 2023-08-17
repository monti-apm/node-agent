import type Chai from 'chai'
import type Mocha from 'mocha'

declare global {
  var expect: Chai.ExpectStatic;
  var assert: Chai.AssertStatic;
  var should: Chai.Should;

  var describe: Mocha.SuiteFunction;
  var it: Mocha.TestFunction;

  var before: Mocha.HookFunction;
  var after: Mocha.HookFunction;
  var beforeEach: Mocha.HookFunction;
  var afterEach: Mocha.HookFunction;
}
