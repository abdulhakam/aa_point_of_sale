# Plugins

Optional, self-contained features. Each plugin is one directory here:

```text
plugins/
  <slug>/
    meta.md      # description + YAML frontmatter (title, author, license, tags, order)
    index.html   # the plugin's single static page
```

The `/plugins` page lists every directory here, reading its `meta.md`. The plugin
page itself is served as a static file at `/plugins/<slug>/`; a plugin can be
added, changed or removed by copying or deleting its folder — nothing in `src/`
or `views/` has to change.

## `meta.md` frontmatter

```yaml
---
title: My plugin            # defaults to the first # heading, else the folder name
description: One line summary shown in the list.
author: Your Name
license: MIT
tags: [example, demo]       # inline or a "- item" block list
order: 100                  # lower sorts first; default 100
---
```

The prose after the frontmatter is for humans; the `description` used in the
list comes from the `description` field, or the first paragraph if it is absent.

## Adding a plugin

1. Create `plugins/my-plugin/`.
2. Add `meta.md` with at least a title/description.
3. Add `index.html` with the whole feature (inline CSS/JS is fine). Link the
   shared stylesheet with `/static/css/app.css` and the favicon with
   `/static/favicon.svg` to match the rest of the app.
4. Reload `/plugins`.

Plugin pages are behind the same login as the rest of the app.
