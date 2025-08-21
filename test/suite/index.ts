// Minimal Mocha test suite for VS Code extension
import * as assert from 'assert';
import * as vscode from 'vscode';

import { registerFoundryLocalProviderTests } from '../providers/FoundryLocalProvider.test';


export function registerSuiteTests(mocha: Mocha) {
  const suite = Mocha.Suite.create(mocha.suite, 'Codie Extension');

  suite.addTest(new Mocha.Test('should be present', function() {
    console.log('Running test: should be present');
    const extension = vscode.extensions.getExtension('mrtrilb.codie');
    assert.ok(extension, 'Extension should be present');
  }));

  suite.addTest(new Mocha.Test('should activate', function(done) {
    console.log('Running test: should activate');
    const extension = vscode.extensions.getExtension('mrtrilb.codie');
    if (extension) {
      extension.activate().then(() => {
        assert.ok(extension.isActive, 'Extension should be active after activation');
        done();
      }, err => {
        done(err);
      });
    } else {
      done(new Error('Extension not found'));
    }
  }));

  // Register FoundryLocalProvider tests
  registerFoundryLocalProviderTests(suite);
}
