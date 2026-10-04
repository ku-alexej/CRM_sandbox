import '@testing-library/jest-dom/vitest';

class MockIntersectionObserver {
    static instances = [];

    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observed = [];
        MockIntersectionObserver.instances.push(this);
    }

    observe(target) {
        this.observed.push(target);
    }

    disconnect() {
        this.observed = [];
    }

    trigger(isIntersecting) {
        this.callback(this.observed.map((target) => ({ target, isIntersecting })), this);
    }
}

globalThis.IntersectionObserver = MockIntersectionObserver;