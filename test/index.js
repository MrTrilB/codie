// Register ts-node so the extension test host can require TypeScript test files directly
require('ts-node').register({ transpileOnly: true, project: __dirname + '/tsconfig.test.json' });
// Import the TypeScript test runner and expose its `run` function as module.exports.run
const runner = require('./index.ts');
if (runner && typeof runner.run === 'function') {
	module.exports.run = runner.run;
} else {
	// Fallback: if the compiled JS exists, try requiring it
	try {
		const compiled = require('./index.js');
		if (compiled && typeof compiled.run === 'function') {
			module.exports.run = compiled.run;
		}
	} catch (e) {
		// nothing
	}
}
