const eventTarget = new EventTarget();

export default eventTarget;

export const message = arg => eventTarget.dispatchEvent(new CustomEvent('message', {detail: arg}));
