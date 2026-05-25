const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('apps/frontend/src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content.replace(/<button type="button"([\s\S]*?)type="button"/g, '<button type="button"$1');
  if (content !== newContent) {
    fs.writeFileSync(f, newContent, 'utf8');
    console.log('Fixed duplicate type="button" in ' + f);
  }
});
