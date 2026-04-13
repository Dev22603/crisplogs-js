# Examples

Runnable examples demonstrating every feature of crisplogs.

> **Prerequisite:** Build the package first from the project root:
>
> ```bash
> npm run build
> ```

## Running

```bash
node examples/basic.js
```

## Index

| File | Description |
|------|-------------|
| [`basic.js`](basic.js) | Default colored output with all five log levels |
| [`box-styles.js`](box-styles.js) | All three box styles: short-fixed, short-dynamic, long-boxed |
| [`custom-colors.js`](custom-colors.js) | Override colors for each log level |
| [`custom-date-format.js`](custom-date-format.js) | Customize timestamps with strftime tokens |
| [`extra-fields.js`](extra-fields.js) | Attach structured key-value context to log messages |
| [`file-logging.js`](file-logging.js) | Write logs to a file with separate console/file levels |
| [`level-filtering.js`](level-filtering.js) | Set a minimum log level to filter out noise |
| [`named-loggers.js`](named-loggers.js) | Named child loggers that inherit root configuration |
| [`plain-output.js`](plain-output.js) | Disable colors for CI, piped output, or log files |
