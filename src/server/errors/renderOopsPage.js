/**
 * Render a plain error page. Displays the standard user-facing message with
 * a reference identifier for support. Keeps styling minimal to avoid
 * dependency on any templating engine.
 *
 * @param {import('express').Response} res Express response
 * @param {string} refId Reference identifier for the incident
 */
function renderOops(res, refId) {
  const content = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta http-equiv="X-UA-Compatible" content="IE=edge">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Unexpected Error</title>',
    '  <style>',
    '    body { font-family: sans-serif; padding: 2rem; line-height: 1.6; }',
    '    .ref { margin-top: 1rem; color: #666; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <h1>oops, we have had a error</h1>',
    '  <p>it has been alerted to the right authority</p>',
    '  <p>check back later or check our discord server</p>',
    `  <p class="ref">Ref: ${refId}</p>`,
    '</body>',
    '</html>'
  ].join('\n');
  res.status(500).send(content);
}

module.exports = renderOops;