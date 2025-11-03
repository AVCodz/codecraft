/**
 * Monaco Type Definitions - TypeScript/React type support for Monaco
 * Injects TypeScript type definitions for React and npm packages
 * Features: React types, inline type definitions, CDN-based npm package types
 * Used in: CodeEditor to provide IntelliSense and type checking
 */
import { getMonaco } from "./setup";
export async function addEssentialTypes() {
  const monaco = await getMonaco();
  if (!monaco) return;

  console.log("[Monaco] Adding essential type definitions...");

  // React core types
  const reactTypes = `
declare module 'react' {
  export interface FC<P = {}> {
    (props: P): JSX.Element | null;
  }
  
  export type ReactNode = JSX.Element | string | number | boolean | null | undefined;
  
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends Function>(callback: T, deps: unknown[]): T;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useContext<T>(context: React.Context<T>): T;
  export function useReducer<R extends React.Reducer<any, any>>(
    reducer: R,
    initialState: React.ReducerState<R>,
  ): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];
  
  export interface Context<T> {
    Provider: React.Provider<T>;
    Consumer: React.Consumer<T>;
  }
  
  export function createContext<T>(defaultValue: T): Context<T>;
  
  export namespace React {
    type ReactNode = JSX.Element | string | number | boolean | null | undefined;
    type FC<P = {}> = (props: P) => JSX.Element | null;
    
    interface Reducer<S, A> {
      (prevState: S, action: A): S;
    }
    
    type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
    type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
    type Dispatch<A> = (value: A) => void;
    
    interface Provider<T> {
      (props: { value: T; children?: ReactNode }): JSX.Element;
    }
    
    interface Consumer<T> {
      (props: { children: (value: T) => ReactNode }): JSX.Element;
    }
  }
  
  export = React;
  export as namespace React;
}

declare module 'react-dom/client' {
  import { ReactNode } from 'react';
  
  export interface Root {
    render(element: ReactNode): void;
    unmount(): void;
  }
  
  export function createRoot(container: Element | DocumentFragment): Root;
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
  `.trim();

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    reactTypes,
    "file:///node_modules/@types/react/index.d.ts"
  );

  console.log("[Monaco] ✅ Essential types added");
}

/**
 * Load type definitions from CDN
 */
export async function loadTypeDefinitionsFromCDN(
  packages: string[] = ["react", "react-dom"]
) {
  const monaco = await getMonaco();
  if (!monaco) return;

  console.log("[Monaco] Loading type definitions from CDN...");

  for (const pkg of packages) {
    try {
      const url = `https://unpkg.com/@types/${pkg}/index.d.ts`;
      const response = await fetch(url);

      if (response.ok) {
        const content = await response.text();

        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          content,
          `file:///node_modules/@types/${pkg}/index.d.ts`
        );

        console.log(`[Monaco] ✅ Loaded types for ${pkg} from CDN`);
      }
    } catch (error) {
      console.warn(
        `[Monaco] ⚠️ Failed to load types for ${pkg} from CDN:`,
        error
      );
    }
  }
}

/**
 * Initialize type definitions (use inline types as they're most reliable)
 */
export async function initializeTypeDefinitions() {
  // Always add essential inline types - most reliable approach
  await addEssentialTypes();

  // Optionally try to load from CDN in the background
  // This is non-blocking and provides enhanced IntelliSense
  loadTypeDefinitionsFromCDN(["react", "react-dom"]).catch((err) => {
    console.warn(
      "[Monaco] CDN type loading failed, using inline types only:",
      err
    );
  });
}
