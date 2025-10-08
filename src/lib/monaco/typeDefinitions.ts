import type * as monacoType from 'monaco-editor';
import type { WebContainer } from '@webcontainer/api';
import { getMonaco } from './setup';

/**
 * Add essential React type definitions inline
 * This provides basic types to eliminate most red squiggles
 */
export async function addEssentialTypes() {
  const monaco = await getMonaco();
  if (!monaco) return;

  console.log('[Monaco] Adding essential type definitions...');

  // React core types
  const reactTypes = `
declare module 'react' {
  export interface FC<P = {}> {
    (props: P): JSX.Element | null;
  }
  
  export type ReactNode = JSX.Element | string | number | boolean | null | undefined;
  
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends Function>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
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
    'file:///node_modules/@types/react/index.d.ts'
  );

  console.log('[Monaco] ✅ Essential types added');
}

/**
 * Load type definitions from WebContainer's node_modules
 */
export async function loadTypeDefinitionsFromWebContainer(
  container: WebContainer,
  packages: string[] = ['react', 'react-dom']
) {
  const monaco = await getMonaco();
  if (!monaco) return;

  console.log('[Monaco] Loading type definitions from WebContainer...');

  for (const pkg of packages) {
    try {
      // Try to read the main index.d.ts
      const typesPath = `/node_modules/@types/${pkg}/index.d.ts`;
      const dtsContent = await container.fs.readFile(typesPath, 'utf-8');

      const libUri = `file:///node_modules/@types/${pkg}/index.d.ts`;

      monaco.languages.typescript.typescriptDefaults.addExtraLib(dtsContent, libUri);

      console.log(`[Monaco] ✅ Loaded types for ${pkg} from WebContainer`);
    } catch (error) {
      console.warn(`[Monaco] ⚠️ Could not load types for ${pkg} from WebContainer:`, error);
    }
  }
}

/**
 * Load type definitions from CDN as fallback
 */
export async function loadTypeDefinitionsFromCDN(
  packages: string[] = ['react', 'react-dom']
) {
  const monaco = await getMonaco();
  if (!monaco) return;

  console.log('[Monaco] Loading type definitions from CDN...');

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
      console.warn(`[Monaco] ⚠️ Failed to load types for ${pkg} from CDN:`, error);
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
  loadTypeDefinitionsFromCDN(['react', 'react-dom']).catch((err) => {
    console.warn('[Monaco] CDN type loading failed, using inline types only:', err);
  });
}

/**
 * Auto-detect and load type definitions from WebContainer after npm install
 */
export async function autoLoadTypeDefinitions(container: WebContainer) {
  console.log('[Monaco] Auto-loading type definitions from WebContainer...');

  try {
    // Check if @types directory exists
    const typesEntries = await container.fs.readdir('/node_modules/@types', {
      withFileTypes: true,
    });

    const typePackages = typesEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .slice(0, 20); // Limit to first 20 to avoid overwhelming Monaco

    console.log(`[Monaco] Found ${typePackages.length} type packages`);

    // Load them
    await loadTypeDefinitionsFromWebContainer(container, typePackages);
  } catch (error) {
    console.warn('[Monaco] ⚠️ Could not auto-load type definitions:', error);
  }
}
