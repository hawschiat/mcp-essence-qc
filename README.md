# MCP pour/for [Régie Essence Québec](https://regieessencequebec.ca/)

Demandez à votre agent préféré de trouver l’essence au meilleur prix près de chez vous ⛽ Ask your favorite agent to find the best priced gas around you

## How to Use

### Locally

1. Build the server by running `npm run build`.
2. Configure your agent to use this MCP server.

#### Example: Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "essence-qc": {
      "command": "node",
      "args": [
        "<PATH_TO_PROJECT>/mcp-essence-qc/dist/index.js"
      ]
    }
  }
}
```

Then, restart Claude desktop.
