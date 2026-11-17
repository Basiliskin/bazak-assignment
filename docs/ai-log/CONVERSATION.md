
### 2026-11-17T11:30:55.274Z : /chat — user

> why I get warning "Language server "plugin:typescript-lsp:typescript" couldn't start: its program "typescript-language-server" wasn't found. Check that it's installed
>   and on your PATH. If you don't need it, disable the plugin that provides it."

### 2026-11-17T11:31:06.141Z : /chat — assistant

> You have the **`typescript-lsp` plugin** turned on in Claude Code. The plugin doesn't include a language server. It only starts one that you install yourself, the `typescript-language-server` program. I checked, and it isn't installed on your machine (`tsc` isn't either), so the plugin fails when Claude Code starts and shows that warning.
> 
> **Fix: install it** (Node is already installed, at `/opt/homebrew/bin/node`):
> 
> ```bash
> npm install -g typescript-language-server typescript
> ```
> 
> Then restart Claude Code. The warning should go away, and Claude gets TypeScript features like go-to-definition, finding references and type errors.
> 
> One thing to watch: you have two Node installs on your PATH, Homebrew (`/opt/homebrew/bin`) and nvm (`~/.nvm/versions/node/v24.21.0`). Homebrew comes first, so `npm` above installs into Homebrew, which is on your PATH, so this works. If you later switch with `nvm use`, global packages from the other install won't be visible. In that case, reinstall it under the active Node.
> 
> **Or, if you don't need TypeScript features**, turn off the plugin with `/plugin` (find `typescript-lsp` and disable it), and the warning stops.
