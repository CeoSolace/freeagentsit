const path = require('path');

module.exports = {
  webpack: (config) => {
    // Explicitly set the '@' alias to the project root
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
};
