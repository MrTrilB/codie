"use strict";
// Minimal Mocha test suite for VS Code extension
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTests = registerTests;
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const mocha_1 = __importDefault(require("mocha"));
function registerTests(mocha) {
    const suite = mocha_1.default.Suite.create(mocha.suite, 'Codie Extension');
    suite.addTest(new mocha_1.default.Test('should be present', function () {
        console.log('Running test: should be present');
        const extension = vscode.extensions.getExtension('mrtrilb.codie');
        assert.ok(extension, 'Extension should be present');
    }));
    suite.addTest(new mocha_1.default.Test('should activate', function (done) {
        console.log('Running test: should activate');
        const extension = vscode.extensions.getExtension('mrtrilb.codie');
        if (extension) {
            extension.activate().then(() => {
                assert.ok(extension.isActive, 'Extension should be active after activation');
                done();
            }, err => {
                done(err);
            });
        }
        else {
            done(new Error('Extension not found'));
        }
    }));
}
//# sourceMappingURL=index.js.map