const fs = require("fs");
const path = require("path");

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach((file) => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === "ENOTDIR" || err.code === "EBUSY")
        filelist = [...filelist, dirFile];
    }
  });
  return filelist;
};

const files = walkSync(path.join(__dirname, "apps/frontend/src")).filter(
  (f) => f.endsWith(".tsx") || f.endsWith(".ts")
);

files.forEach((file) => {
  let content = fs.readFileSync(file, "utf8");
  let original = content;

  // Fix button-has-type
  content = content.replace(
    /<button(?![^>]*type=)([^>]*)>/g,
    '<button type="button"$1>'
  );

  // Fix no-autofocus
  content = content.replace(/\s+autoFocus(?:=\{[^}]*\})?/g, "");

  // Fix design-no-three-period-ellipsis
  content = content.replace(/Loading\.\.\./g, "Loading…");
  content = content.replace(/Search\.\.\./g, "Search…");

  // Fix no-noninteractive-tabindex
  content = content.replace(
    /<div([^>]*)tabIndex(?:=\{[^}]*\}|="[^"]*")([^>]*)>/g,
    "<div$1$2>"
  );

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    console.log(`Updated ${file}`);
  }
});
