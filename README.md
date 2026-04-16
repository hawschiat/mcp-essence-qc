# MCP pour/for [Régie Essence Québec](https://regieessencequebec.ca/)

Demandez à votre agent préféré de trouver l’essence au meilleur prix près de chez vous ⛽ Ask your favorite agent to find the best priced gas around you

## How to Use

### Locally

1. Pull this repo and install dependencies using `npm install`.
2. Build the server by running `npm run build`.
3. Configure your agent to use this MCP server.

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

---

## Comment s'en servir

### En local

1. Clone le repo et installe les dépendances avec la commande `npm install`.
2. Bâtis le serveur en lançant `npm run build`.
3. Configure ton agent pour qu'il utilise ce serveur MCP.

#### Exemple : Claude Desktop

Ajoute ceci à ton fichier `claude_desktop_config.json`:

```json
{
    "mcpServers": {
      "essence-qc": {
        "command": "node", 
        "args": [
          "<CHEMIN_VERS_LE_PROJET>/mcp-essence-qc/dist/index.js"
        ]
      }
    }
}
```

Une fois que c'est fait, redémarre l'application Claude Desktop.
