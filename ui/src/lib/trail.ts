// Back, inside the app: the Shell mirrors the history it has pushed, so a page reached through a door
// (a link inside another page) can say where back goes ("‹ Today"). A tab or sidebar link starts over.
import { createContext, useContext } from "react";
export type Back = { label: string; steps: number };
export const BackCtx = createContext<Back | null>(null);
export const useBack = () => useContext(BackCtx);
