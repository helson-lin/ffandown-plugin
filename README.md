Here's the English version of your README:

---

# FFandown Plugin

<p>First, please note that this is a demo specifically designed for developing the FFandown plugin. It does not support other systems.</p>

<p><a href="/README_ZH.md">
        <img alt="lang" style="height: 30px;" src="https://img.shields.io/badge/Lang-中文-brightgreen" />
</a><a href="https://github.com/helson-lin/ffandown-plugin">
       <img alt="GitHub forks" style="height: 30px;" src="https://img.shields.io/github/forks/helson-lin/ffandown-plugin">
</a></p>

## Requirements

- FFandown
- Node 18+

## Development 

The plugin is invoked before downloading begins. When a URL is entered in FFandown, it first goes through the plugin system's matching process (via the plugin's `match` method). If a match is found, the URL and plugin configuration information are passed to the plugin's `parser` method. After the `parser` returns the processed URL, FFandown's downloader begins downloading.

Plugins run via Node's `vm` module and cannot access all Node modules. Only the following modules and functions are supported:

| Module | Documentation |
| ----------- | ----------- |
| bcrypt | https://www.npmjs.com/package/bcrypt ^5.1.1 |
| fetch | https://www.npmjs.com/package/node-fetch ^2 |
| URL | https://nodejs.org/api/url.html#class-url |
| URLSearchParams | https://nodejs.org/api/url.html#class-urlsearchparams |
| console | https://nodejs.org/api/console.html#console |
| log | Winston instance. Logs are output to log files, and `verbose` method outputs when debug is enabled |

![Plugin System](./assets/CleanShot%202025-03-30%20at%2018.27.31@2x.png)

### Basic Plugin Structure

The basic plugin structure is as follows:

```js
class Parser {
    match(url) {
        // return true if the url is matched
        return true;
    }
    async parser(url, options) {
        return {
            url,
            audioUrl,
            headers: [
                {
                    key: 'cookie',
                    value: 'cookie'
                }
            ]
        }
    }
}
```

The plugin must be a class containing both `match` and `parser` methods.

**`match` Method:**
- Used to match URLs
- Returns `true` on successful match
- Parameter: URL

**`parser` Method:**
- Parses the URL and must return an object with this structure:
```js
{
    url: string,
    audioUrl: string,
    headers: [{
        key: string,
        value: string
    }]
}
```
- `url`: Video URL
- `audioUrl`: Audio URL (optional)
  - If both URL and audioUrl exist, both video and audio will be downloaded and merged
- `headers`: Request headers (array of objects, optional)

The `parser` method receives the URL and plugin configuration as parameters. Plugin configurations are set in the plugin system.

### Plugin Configuration

If your plugin requires configuration (e.g., cookies), define it in the `settings` field of `package.json`:

```json
{
    "settings": {
        "cookie": {
            "type": "input",
            "value": "",
            "require": true,
            "label": "Cookie"
        },
        "quality": {
            "type": "select",
            "options": [
                {
                    "label": "Ultra HD 8K",
                    "value": "127"
                },
                {
                    "label": "Dolby Vision",
                    "value": "126"
                },
                // Other quality options...
            ],
            "require": true,
            "label": "Max Quality",
            "value": "116"
        }
    }
}
```

Each field under `settings` represents a configuration item.

**Supported `type` values:**
- `input`: Text input field
- `select`: Dropdown menu

## Testing

### Testing Plugins

1. Modify the test URL in `parser.test.js` to match your plugin's target platform.
2. Run `npm run test` to ensure all tests pass.

### Adding New Plugins

During development, use `npm run dev` to start the plugin. Then, in FFandown's plugin system, add a new plugin with the URL: `http://localhost:3312`.

### Configuring Plugin Information

![Plugin Configuration](./assets/Shot2025-03-March-Fr5VUkQh.png)

## Building

Run `npm run build` to package the plugin. The output will be in the `build` folder. The built plugin can be uploaded to online OSS services or GitHub Releases.