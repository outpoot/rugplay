/*
Rugplay Poker Engine.
partially ported from https://github.com/brunoscopelliti/poker-holdem-engine/tree/master/engine

DISCLAIMER: This engine is partially ported, and I (in this case md1125), am not a poker expert, so yeah uh review this carefully.
So especially for game.ts I do understand whats going on, but since its basically copy pasted and shaped to fit. I cant guarantee its the best logic.

Not ported:
    - table.ts (this is like multiplayer logic)
    - eval.ts (this highlights your hands like in discords pokernight. Idea from @ahbrakadraba)
*/

export * from './components/types';
export * from './components/constants';
export { createDeck } from './components/deck';
export { evalHand, compare } from './components/eval';
export { generateCode, generateTableId, createTable, addPlayer, removePlayer, build } from './components/table';
export { splitPot, resolveFoldWin, resolveShowdown } from './components/resolution';
export { startHand, processAction } from './components/game';