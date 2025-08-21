export async function run(): Promise<void> {
	const Mocha = (await import('mocha')).default;
	const mocha = new Mocha({
		ui: 'bdd',
		color: true
	});
	// Import and register all suite/provider tests
	const { registerSuiteTests } = await import('./suite/index');
	registerSuiteTests(mocha);
	return new Promise((resolve, reject) => {
		mocha.run(failures => {
			if (failures > 0) {
				reject(new Error(`${failures} tests failed.`));
			} else {
				resolve();
			}
		});
	});
}

