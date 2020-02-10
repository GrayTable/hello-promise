/**
 * Determines how the Promise will be resolved or rejected`
 *
 * @name executor
 * @function
 * @param {Function} resolve - resolves the Promise with the value passed in
 * @param {Function} reject - rejects the Promise with the value passed in
*/

/**
 * Holds onFulfilled and onRejected handlers passed to .then() method, which
 * will later be fired in ._executeCallbacks() as soon as the Promise settles
 *
 * @typedef {Object} Callback
 * @private
 * @param {Function} onFulfilled - Called when current Promise becomes resolved.
 *      Value passed in will be the same as the value current Promise resolved with.
 * @param {Function} onRejected - Called when current Promise becomes rejected.
 *      Value passed in will the same as the value current Promise was rejected with.
*/

/**
 * Three possible states of the Promise
 * @readonly
 * @private
 * @enum {String}
 */
const states = {
    /** Promise is not settled */
    pending: 'pending',
    /** Promise settled with rejected state */
    rejected: 'rejected',
    /** Promise settled with resolved state */
    resolved: 'resolved'
}

const isFunction = value => typeof value === 'function';
const isObject = value => typeof value === 'object';
const isPromise = value => value instanceof HelloPromise;
const runAsync = fn => setTimeout(fn, 0);


/**
 * Represents Promise object
 */
class HelloPromise {
    /**
     * Creates new HelloPromise instance
     *
     * @param  {executor} executor - Determines how the Promise will be resolved
     *      or rejected.
     */
    constructor(executor) {
        this.value = null;
        this.state = states.pending;
        this.callbacks = [];

        try {
            executor(this._resolver, this._reject);
        }
        catch (reason) {
            this._reject(reason);
        }
    }

    /**
     * Executes all callbacks held in stack
     * @private
     */
    _executeCallbacks = () => {
        /** If Promise is not settled, bail */
        if (this.state === states.pending) return;

        // If Promise is resolved, execute onFulfilled callbacks
        // If Promise is rejected, execute onRejected callbacks
        const member = this.state === states.resolved ? 'onFulfilled' : 'onRejected';

        const fire = () => {
            while (this.callbacks.length) {
                // Execute only once
                const callback = this.callbacks.shift();
                // with value current Promise settled with
                callback[member](this.value);
            }
        }

        // fire callbacks asynchronously
        runAsync(fire);
    }


    /**
     * Adds new callback and tries to execute callback stack. The reason behind
     * firing callbacks at this stage is that the Promise could've already settled.
     *
     * @private
     * @method
     * @param {Callback} callback - holds onFullfiled and onRejected handlers
     */
    _addCallback = callback => {
        this.callbacks.push(callback);
        this._executeCallbacks();
    }


    /**
     * Transitions the Promise to new state and value
     * @private
     * @method
     * @param {String} state - state to be set
     * @param {*} value - value to be set
     */
    _transition = (state, value) => {
        /** 2.1 If Promise is already settled, bail */
        if (this.state !== states.pending) return;

        this.value = value;
        this.state = state;

        /** Execute callbacks in stack after the Promise settled */
        this._executeCallbacks();
    }


    /**
     * Handles resolution procedure described in
     * 2.3.3 section of the Promises/A+ spec
     *
     * @private
     * @method
     * @param {Object|Function} value - value to be resolved
     */
    _handleThen = value => {
        var wasCalled = false;

        /** We need to make sure that the function was called only once in
         *  case of circular thenable chain.
         */
        const once = fn => {
            if (wasCalled) return;
            fn();
            wasCalled = true;
        }

        /** Implemented according to 2.3.3 part of the Promises/A+ spec */
        try {
            const then = value.then;

            if (!isFunction(then))  {
                return once(_ => this._fulfill(value));
            }

            then.call(value,
                y => once(_ => this._resolver(y)),
                y => once(_ => this._reject(y)),
            );
        }

        catch (reason) {
            return once(_ => this._reject(reason))
        }
    }


    /**
     * Resolves the value according to 2.3 section of the Promises/A+ spec
     *
     * @private
     * @method
     * @param {*} value - value to be resolved
     */
    _resolver = value => {
        /** 2.3.1 */
        if (value === this) return this._reject(new TypeError("The promise and its value refer to the same object"));

        /** 2.3.2 */
        if (isPromise(value)) {
            return value.then(this._resolver, this._reject);
        }

        /** 2.3.3 */
        if ((isObject(value) || isFunction(value)) && value) {
            return this._handleThen(value);
        }

        /** 2.3.4 */
        this._fulfill(value);
    }


    /**
     * Returns a new Promise and adds new callback to the stack
     *
     * @method
     * @param {Function} onFulfilled - Called when current Promise becomes resolved.
     *      Value passed in will be the same as the value current Promise resolved with.
     * @param {Function} onRejected - Called when current Promise becomes rejected.
     *      Value passed in will the same as the value current Promise was rejected with.
     */
    then = (onFulfilled, onRejected) => {
        return new HelloPromise((resolve, reject) => {
            /** Fallback is either resolve or reject */
            const member = (fn, fallback) => value => {
                /** 2.2.7.3, 2.2.7.4 */
                if (!isFunction(fn)) return fallback(value);

                try {
                    /** 2.2.7.1 */
                    resolve(fn(value));
                }
                catch (reason) {
                    /** 2.2.7.2 */
                    reject(reason);
                }
            }

            return this._addCallback({
                onFulfilled: member(onFulfilled, resolve),
                onRejected: member(onRejected, reject),
            })
        });
    }


    /**
     * Resolves the Promise with value
     *
     * @private
     * @method
     * @param {*} value - Value to resolve the Promise with.
     */
    _fulfill = value => this._transition(states.resolved, value);

    /**
     * Rejects the Promise with value
     *
     * @private
     * @method
     * @param {*} reason - Reason to reject the Promise with.
     */
    _reject = reason => this._transition(states.rejected, reason);

    /**
     * Returns new Promise object resolved with the value passed in. Needed
     * to be exposed for compliance tests.
     *
     * @static
     * @method
     * @param {*} value - Value to resolve new Promise with.
     */
    static resolve = value => new HelloPromise(resolve => resolve(value));

    /**
     * Returns new Promise object rejected with the reason passed in. Needed
     * to be exposed for  compliance tests.
     *
     * @static
     * @method
     * @param {*} reason - Reason to reject new Promise with.
     */
    static reject = reason => new HelloPromise((_, reject) => reject(reason));
}

export default HelloPromise;
