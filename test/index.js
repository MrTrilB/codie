"use strict";
// Entry point for running Mocha tests in the VS Code extension
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const path = __importStar(require("path"));
const Mocha = require("mocha");
const glob_1 = require("glob");
function run() {
    // Create the Mocha test instance
    const mocha = new Mocha({
        ui: 'bdd',
        color: true
    });
    const testsRoot = path.resolve(__dirname);
    return new Promise((resolve, reject) => {
        const files = (0, glob_1.sync)('**/*.test.js', { cwd: testsRoot });
        files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));
        try {
            mocha.run((failures) => {
                // Manual pause: keep process alive for 10 minutes after tests complete
                const PAUSE_MS = 10 * 60 * 1000;
                if (failures > 0) {
                    console.log(`\nTest run complete. Window will remain open for manual inspection for ${PAUSE_MS / 60000} minutes...`);
                    setTimeout(() => reject(new Error(`${failures} tests failed.`)), PAUSE_MS);
                }
                else {
                    console.log(`\nTest run complete. Window will remain open for manual inspection for ${PAUSE_MS / 60000} minutes...`);
                    setTimeout(resolve, PAUSE_MS);
                }
            });
        }
        catch (err) {
            reject(err);
        }
    });
}
// If run directly (e.g., via ts-node or node), execute the runner
if (require.main === module) {
    run().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map