var promisesAplusTests = require("promises-aplus-tests");
const HelloPromise = require('../build/HelloPromise.js').default;

const adapter = {
	deferred: () => {
		let resolve;
		let reject;
		const promise = new HelloPromise((res, rej) => { resolve = res; reject = rej; });
		return {
			promise,
			reject,
			resolve,
		};
	},
	rejected: reason => HelloPromise.reject(reason),
	resolved: value => HelloPromise.resolve(value),
};

describe("Promises/A+ Tests", function () {
    promisesAplusTests.mocha(adapter);
});
