import type * as monacoType from 'monaco-editor';

// Dynamically import monaco-editor only on client-side
let monaco: typeof monacoType | null = null;

async function loadMonaco() {
  if (typeof window === 'undefined') return null;
  if (monaco) return monaco;
  
  monaco = await import('monaco-editor');
  return monaco;
}

/**
 * Setup Monaco Editor environment with proper workers
 */
export async function setupMonacoEnvironment() {
  if (typeof window === 'undefined') return;
  
  // Only setup once
  if ((window as any).MonacoEnvironment) {
    return;
  }

  console.log('[Monaco] Setting up environment...');

  // Simple worker setup for Next.js
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function (_: string, label: string) {
      const baseUrl = '/_next/static/chunks';
      
      if (label === 'json') {
        return `${baseUrl}/monaco-json.worker.js`;
      }
      if (label === 'css' || label === 'scss' || label === 'less') {
        return `${baseUrl}/monaco-css.worker.js`;
      }
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return `${baseUrl}/monaco-html.worker.js`;
      }
      if (label === 'typescript' || label === 'javascript') {
        return `${baseUrl}/monaco-ts.worker.js`;
      }
      return `${baseUrl}/monaco-editor.worker.js`;
    },
  };

  console.log('[Monaco] ✅ Environment configured');
}

/**
 * Configure TypeScript compiler options for Monaco
 */
export async function configureTypeScript() {
  const monacoInstance = await loadMonaco();
  if (!monacoInstance) return;

  console.log('[Monaco] Configuring TypeScript...');

  const compilerOptions: monacoType.languages.typescript.CompilerOptions = {
    target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monacoInstance.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monacoInstance.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
    skipLibCheck: true,
    strict: false, // Disable strict mode to reduce errors
    resolveJsonModule: true,
    isolatedModules: true,
    lib: ['es2020', 'dom', 'dom.iterable'],
    allowSyntheticDefaultImports: true,
  };

  monacoInstance.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
  monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

  // Set diagnostics options - be more lenient
  monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [
      2307, // Cannot find module
      2304, // Cannot find name
      1109, // Expression expected
      1005, // Expected token
    ],
  });

  monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  // Enable JSX support
  monacoInstance.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monacoInstance.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  console.log('[Monaco] ✅ TypeScript configured');
}

/**
 * Configure CSS language features to ignore Tailwind classes
 */
export async function configureCSSLanguageFeatures() {
  const monacoInstance = await loadMonaco();
  if (!monacoInstance) return;

  console.log('[Monaco] Configuring CSS language features...');

  // Disable CSS validation to avoid Tailwind class warnings
  monacoInstance.languages.css.cssDefaults.setOptions({
    validate: false,
  });

  // Configure SCSS
  monacoInstance.languages.css.scssDefaults.setOptions({
    validate: false,
  });

  // Configure LESS
  monacoInstance.languages.css.lessDefaults.setOptions({
    validate: false,
  });

  console.log('[Monaco] ✅ CSS language features configured');
}

/**
 * Initialize Monaco Editor with all configurations
 */
export async function initializeMonaco() {
  await setupMonacoEnvironment();
  await configureTypeScript();
  await configureCSSLanguageFeatures();
  console.log('[Monaco] ✅ Fully initialized');
}

/**
 * Get Monaco instance (for use in other files)
 */
export async function getMonaco(): Promise<typeof monacoType | null> {
  return await loadMonaco();
}
