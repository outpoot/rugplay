const adjectives = [
	'happy',
	'lucky',
	'sunny',
	'clever',
	'brave',
	'bright',
	'cool',
	'wild',
	'calm',
	'kind'
];
const nouns = ['panda', 'tiger', 'whale', 'eagle', 'lion', 'wolf', 'bear', 'fox', 'deer', 'seal'];

export function generateUsername(): string {
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	const number = Math.floor(Math.random() * 9999);
	return `${adj}_${noun}${number}`;
}
