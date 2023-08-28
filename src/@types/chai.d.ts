import type Chai from 'chai';
import type Mocha from 'mocha';

declare global {
  let expect: Chai.ExpectStatic;
  let assert: Chai.AssertStatic;
  let should: Chai.Should;

  let describe: Mocha.SuiteFunction;
  let it: Mocha.TestFunction;

  let before: Mocha.HookFunction;
  let after: Mocha.HookFunction;
  let beforeEach: Mocha.HookFunction;
  let afterEach: Mocha.HookFunction;
}
