# Dev environment notes

## Debugging

For connecting VSCode debugger to Bespoken Tools lambda runtime:

In launch.json:

```json
{
    /* ... */
    "program": "${workspaceRoot}/js/node_modules/bespoken-tools/bin/bst-proxy.js",
    "args": ["lambda", "js/index.js", "--verbose"],
    /* ... */
}
```
