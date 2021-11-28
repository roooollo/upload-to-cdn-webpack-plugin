<div align="center">
  <a href="https://github.com/hejingguang/upload-to-cdn-webpack-plugin">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
</div>

# upload-to-cdn-webpack-plugin

Copies individual files or entire directories, which already exist, to the build directory.

## Getting Started

To begin, you'll need to install `upload-to-cdn-webpack-plugin`:

```console
npm install upload-to-cdn-webpack-plugin --save-dev
```

Then add the plugin to your `webpack` config. For example:

**webpack.config.js**

```js
module.exports = {
  plugins: [
    new UploadToCDNPlugin({
      gz_path: path.join(__dirname, '../gzip'),
      gz_name: 'backup',
      upload_url: 'http://127.0.0.1:8100/deploy',
    }),
  ],
};
```