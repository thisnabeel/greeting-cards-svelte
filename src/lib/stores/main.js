import { readable, writable } from 'svelte/store';

// export const api = readable('http://localhost:3000');
// export const api = readable('https://www.expressfeel.com');

export const traits = writable([]);
export const traitsMap = writable([]);

export const expressions = writable([]);
export const expressionsMap = writable([]);
export const popularExpressions = writable([]);

export const mapShown = writable(false);

export const selectedTrait = writable(null);
export const selectedExpression = writable(null);

export const selectedFeel = writable(null);

export const selectTrait = (item) => {
	selectedTrait.set(item);
	selectedFeel.set(item.feel);
	selectedExpression.set(null);
};

export const selectExpression = (item) => {
	selectedExpression.set(item);
	selectedTrait.set(null);
};

export const goHome = () => {
	selectedExpression.set(null);
	selectedTrait.set(null);
};

export const signIn = () => {
	selectedExpression.set(null);
	selectedTrait.set(null);
};
