import fs from 'fs';
import path from 'path';
import tar from 'tar';
import axios from 'axios';
import FormData from 'form-data';

class UploadToCDN {
  constructor(options) {
    this.options = options;
  }

  readDirSync(base) {
    let result = [];
    const paths = fs.readdirSync(base);
    paths.forEach((item) => {
      const cur_path = `${base}/${item}`;
      const info = fs.statSync(cur_path);
      let temp;
      if (info.isDirectory()) {
        temp = this.readDirSync(cur_path);
      } else {
        temp = cur_path;
      }
      result = result.concat(temp);
    });
    return result;
  }

  deleteFiles(url, filterFile) {
    const cur_zip_paths = this.readDirSync(url);
    cur_zip_paths
      .filter((item) => item.indexOf(filterFile) == -1)
      .forEach((item) => {
        fs.unlinkSync(item);
      });
  }

  async upload(url) {
    const readStream = fs.createReadStream(url);
    const formData = new FormData();
    formData.append('file', readStream);
    let headers = formData.getHeaders();
    return new Promise((resolve, reject) => {
      formData.getLength(async (err, length) => {
        if (err) return;
        // headers['Content-Length'] = length;
        await axios
          .post(this.options.upload_url, formData, { headers })
          .then((result) => {
            resolve(result);
          })
          .catch((err) => {
            reject(err);
          });
      });
    });
  }

  gz(compilation, logger, callback) {
    try {
      fs.accessSync(this.options.gz_path, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      fs.mkdirSync(this.options.gz_path);
    }

    this.deleteFiles(this.options.gz_path);

    const gz_real_path = path.join(this.options.gz_path, `${this.options.gz_name}.tar.gz`);
    const pack = new tar.Pack({ gzip: true });
    pack.add(compilation.options.output.path.split('\\').slice(-1)[0]);
    pack.end();
    const writeStream = fs.createWriteStream(gz_real_path);
    writeStream.on('finish', async () => {
      await this.upload(gz_real_path);
      callback();
    });
    writeStream.on('error', (err) => {
      compilation.errors.push(err);
      logger.log(err);
      callback();
    });
    pack.pipe(writeStream);
  }

  // const JSZip = require('jszip');
  // const jszip = new JSZip();
  // const { RawSource } = require('webpack-sources');
  // zip(compilation, callback) {
  //   const folder = jszip.folder();
  //   // 遍历资源，把资源放进zip包中
  //   for (let filename in compilation.assets) {
  //     const source = compilation.assets[filename].source();
  //     folder.file(filename, source);
  //   }
  //   jszip.generateAsync({ type: 'nodebuffer' }).then((content) => {
  //     // 生成zip文件，并把文件输出到指定目录
  //     this.outputPath = path.join(compilation.options.output.path, this.options.zip_name);
  //     const outputRelativePath = path.relative(compilation.options.output.path, this.outputPath);
  //     compilation.assets[outputRelativePath] = new RawSource(content);
  //     callback(); // 通知Webpack该钩子函数已经执行完毕
  //   });
  // }

  apply(compiler) {
    // 因为会有异步操作，所以这里用tapAsync， 当逻辑执行完成时调用callback通知Webpack
    // compiler.hooks.emit.tapAsync('UploadToCDN', (compilation, callback) => {
    // this.zip(compilation, callback);
    // callback();
    // });

    compiler.hooks.afterEmit.tapAsync('UploadToCDN', (compilation, callback) => {
      const logger = compilation.getLogger("upload-to-cdn-webpack-plugin");
      this.gz(compilation, logger, callback);
    });
  }
};

export default UploadToCDN 