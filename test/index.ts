// Entry point for running Mocha tests in the VS Code extension

import * as path from 'path';
import Mocha = require('mocha');
import { sync as globSync } from 'glob';

export function run(): Promise<void> {
    // Create the Mocha test instance
    const mocha = new Mocha({
        ui: 'bdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname);

    return new Promise<void>((resolve, reject) => {
        const files: string[] = globSync('**/*.test.js', { cwd: testsRoot });
        files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));
        try {
            mocha.run((failures: number) => {
                // Manual pause: keep process alive for 10 minutes after tests complete
                const PAUSE_MS = 10 * 60 * 1000;
                if (failures > 0) {
                    console.log(`\nTest run complete. Window will remain open for manual inspection for ${PAUSE_MS/60000} minutes...`);
                    setTimeout(() => reject(new Error(`${failures} tests failed.`)), PAUSE_MS);
                } else {
                    console.log(`\nTest run complete. Window will remain open for manual inspection for ${PAUSE_MS/60000} minutes...`);
                    setTimeout(resolve, PAUSE_MS);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

// If run directly (e.g., via ts-node or node), execute the runner

if (require.main === module) {
    run().catch((err: any) => {
        console.error(err);
        process.exit(1);
    });
}
