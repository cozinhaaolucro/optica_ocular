const fs = require('fs');
const path = require('path');

const legacyDir = path.join(__dirname, '..', 'legacy-v2');
const appDir = path.join(__dirname, '..', 'src', 'app');

function htmlToJsx(html) {
    let jsx = html;
    
    // Replace class= with className=
    jsx = jsx.replace(/class=/g, 'className=');
    // Replace for= with htmlFor=
    jsx = jsx.replace(/for=/g, 'htmlFor=');
    // Replace tabindex= with tabIndex=
    jsx = jsx.replace(/tabindex=/g, 'tabIndex=');
    // Replace svg attributes
    jsx = jsx.replace(/stroke-width=/g, 'strokeWidth=');
    jsx = jsx.replace(/stroke-linecap=/g, 'strokeLinecap=');
    jsx = jsx.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
    jsx = jsx.replace(/fill-rule=/g, 'fillRule=');
    jsx = jsx.replace(/clip-rule=/g, 'clipRule=');
    
    // Replace autofocus -> autoFocus
    jsx = jsx.replace(/autofocus/g, 'autoFocus');
    jsx = jsx.replace(/autoplay/g, 'autoPlay');
    jsx = jsx.replace(/crossorigin/g, 'crossOrigin');
    jsx = jsx.replace(/fetchpriority/g, 'fetchPriority');
    jsx = jsx.replace(/allowfullscreen/g, 'allowFullScreen');
    
    // Close self-closing tags
    jsx = jsx.replace(/<img([^>]*?[^\/])>/g, '<img$1 />');
    jsx = jsx.replace(/<input([^>]*?[^\/])>/g, '<input$1 />');
    jsx = jsx.replace(/<br([^>]*?[^\/])>/g, '<br$1 />');
    jsx = jsx.replace(/<source([^>]*?[^\/])>/g, '<source$1 />');
    jsx = jsx.replace(/<meta([^>]*?[^\/])>/g, '<meta$1 />');
    jsx = jsx.replace(/<link([^>]*?[^\/])>/g, '<link$1 />');
    
    // Fix checked, disabled, hidden attributes without values
    jsx = jsx.replace(/ checked(>|\s)/g, ' defaultChecked$1');
    jsx = jsx.replace(/ disabled(>|\s)/g, ' disabled={true}$1');
    jsx = jsx.replace(/ hidden(>|\s)/g, ' hidden={true}$1');
    jsx = jsx.replace(/ defer(>|\s)/g, ' defer={true}$1');
    jsx = jsx.replace(/ allowFullScreen(>|\s)/g, ' allowFullScreen={true}$1');

    return jsx;
}

const files = [
    { src: 'index.html', dest: 'page.tsx', isRoot: true },
    { src: 'oculos.html', dest: 'oculos/page.tsx', isRoot: false },
    { src: 'oculos-de-grau.html', dest: 'oculos-de-grau/page.tsx', isRoot: false },
    { src: 'oculos-de-sol.html', dest: 'oculos-de-sol/page.tsx', isRoot: false },
    { src: 'lentes.html', dest: 'lentes/page.tsx', isRoot: false },
    { src: 'sobre.html', dest: 'sobre/page.tsx', isRoot: false },
    { src: 'visite.html', dest: 'visite/page.tsx', isRoot: false },
    { src: 'duvidas.html', dest: 'duvidas/page.tsx', isRoot: false },
    { src: 'privacidade.html', dest: 'privacidade/page.tsx', isRoot: false },
    { src: '404.html', dest: 'not-found.tsx', isRoot: true },
];

for (const file of files) {
    const srcPath = path.join(legacyDir, file.src);
    if (!fs.existsSync(srcPath)) continue;
    
    const html = fs.readFileSync(srcPath, 'utf-8');
    
    // Extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) continue;
    
    let bodyContent = bodyMatch[1];
    
    // Remove scripts from body (we moved them to layout)
    bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    const jsxContent = htmlToJsx(bodyContent);
    
    // Next.js Link replacement - for a simple migration we'll just keep <a> tags, 
    // but Next.js prefers <Link>. For exact identical migration, standard <a> tags are fine.
    
    const destPath = path.join(appDir, file.dest);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    // Ensure all variables or weird HTML are properly escaped (like style="")
    let safeJsx = jsxContent.replace(/style="([^"]*)"/g, (match, styleString) => {
        // Convert style string to object
        const styleObj = {};
        styleString.split(';').forEach(rule => {
            const [key, value] = rule.split(':');
            if (key && value) {
                const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
                styleObj[camelKey] = value.trim();
            }
        });
        return `style={${JSON.stringify(styleObj)}}`;
    });
    
    const componentCode = `
export default function Page() {
  return (
    <>
      ${safeJsx}
    </>
  );
}
`;
    fs.writeFileSync(destPath, componentCode);
    console.log(`Migrated ${file.src} to ${file.dest}`);
}
