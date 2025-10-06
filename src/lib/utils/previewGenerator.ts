import { FileNode } from '@/lib/types';

export function generatePreviewHTML(
  files: FileNode[], 
  framework: 'react' | 'vue' | 'vanilla' = 'react'
): string {
  switch (framework) {
    case 'react':
      return generateReactPreview(files);
    case 'vue':
      return generateVuePreview(files);
    case 'vanilla':
      return generateVanillaPreview(files);
    default:
      return generateReactPreview(files);
  }
}

function generateReactPreview(files: FileNode[]): string {
  const htmlFile = files.find(f => f.path.endsWith('.html') || f.path.endsWith('index.html'));
  const jsFiles = files.filter(f => f.path.endsWith('.js') || f.path.endsWith('.jsx') || f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  const packageJson = files.find(f => f.path.endsWith('package.json'));

  // Get dependencies from package.json
  let dependencies: Record<string, string> = {};
  if (packageJson?.content) {
    try {
      const pkg = JSON.parse(packageJson.content);
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch (e) {
      console.warn('Failed to parse package.json');
    }
  }

  // Basic React setup with common dependencies
  const reactVersion = dependencies.react || '18.2.0';
  const reactDomVersion = dependencies['react-dom'] || '18.2.0';

  const cssContent = cssFiles.map(f => f.content || '').join('\n');
  const jsContent = jsFiles.map(f => f.content || '').join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://unpkg.com/react@${reactVersion}/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@${reactVersion}/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${dependencies.tailwindcss ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
    #root { min-height: 100vh; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    ${jsContent}
    
    // Default App component if none exists
    if (typeof App === 'undefined') {
      function App() {
        return React.createElement('div', {
          style: { padding: '2rem', textAlign: 'center' }
        }, [
          React.createElement('h1', { key: 'title' }, 'Hello World!'),
          React.createElement('p', { key: 'desc' }, 'Your React app is running.')
        ]);
      }
    }
    
    // Render the app
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  </script>
</body>
</html>`;
}

function generateVuePreview(files: FileNode[]): string {
  const htmlFile = files.find(f => f.path.endsWith('.html') || f.path.endsWith('index.html'));
  const vueFiles = files.filter(f => f.path.endsWith('.vue') || f.path.endsWith('.js'));
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  const packageJson = files.find(f => f.path.endsWith('package.json'));

  let dependencies: Record<string, string> = {};
  if (packageJson?.content) {
    try {
      const pkg = JSON.parse(packageJson.content);
      dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch (e) {
      console.warn('Failed to parse package.json');
    }
  }

  const vueVersion = dependencies.vue || '3.3.0';
  const cssContent = cssFiles.map(f => f.content || '').join('\n');
  const jsContent = vueFiles.map(f => f.content || '').join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://unpkg.com/vue@${vueVersion}/dist/vue.global.js"></script>
  ${dependencies.tailwindcss ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
    #app { min-height: 100vh; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="app"></div>
  
  <script>
    const { createApp } = Vue;
    
    ${jsContent}
    
    // Default app if none exists
    if (typeof App === 'undefined') {
      const App = {
        template: \`
          <div style="padding: 2rem; text-align: center;">
            <h1>Hello World!</h1>
            <p>Your Vue app is running.</p>
          </div>
        \`
      };
    }
    
    createApp(App).mount('#app');
  </script>
</body>
</html>`;
}

function generateVanillaPreview(files: FileNode[]): string {
  const htmlFile = files.find(f => f.path.endsWith('.html') || f.path.endsWith('index.html'));
  const jsFiles = files.filter(f => f.path.endsWith('.js'));
  const cssFiles = files.filter(f => f.path.endsWith('.css'));

  // If there's an HTML file, use it as base
  if (htmlFile?.content) {
    let html = htmlFile.content;
    
    // Inject CSS
    const cssContent = cssFiles.map(f => f.content || '').join('\n');
    if (cssContent) {
      const styleTag = `<style>${cssContent}</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else {
        html = `<head>${styleTag}</head>\n${html}`;
      }
    }
    
    // Inject JS
    const jsContent = jsFiles.map(f => f.content || '').join('\n');
    if (jsContent) {
      const scriptTag = `<script>${jsContent}</script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        html = `${html}\n${scriptTag}`;
      }
    }
    
    return html;
  }

  // Generate basic HTML structure
  const cssContent = cssFiles.map(f => f.content || '').join('\n');
  const jsContent = jsFiles.map(f => f.content || '').join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body { 
      margin: 0; 
      padding: 2rem; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
    }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root">
    <h1>Hello World!</h1>
    <p>Your vanilla JavaScript app is running.</p>
  </div>
  
  <script>
    ${jsContent}
  </script>
</body>
</html>`;
}
