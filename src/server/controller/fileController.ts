/**
 * @description 用來操作伺服器檔案
 * @author frenkie
 * @date 2020-08-06
 */

const fs = require("fs");
const request = require('request');

/**
 * @description create dir
 * @author frenkie
 * @date 2020-08-06
 * @param {String} path
 * @returns 
 */
function checkDirExists(path : string){
  return new Promise((resolve, reject)=>{
    fs.exists(path, function(exists : any){
      if(!exists){
         let mkDir = function (dirPath : string) : Promise<boolean | string>{
          return new Promise((resolve)=>{
            fs.exists(dirPath, function(exists:any){
              if(!exists){
                fs.mkdir(dirPath, function(err:any){
                  if(err) {
                    reject('建立資料夾失敗:' + err);
                  }
                  console.log('建立資料夾:' + dirPath)
                  resolve(true);
                })
              }
            })
          })
        }
        let dir = path.split('/');
        let dirPath = '';
        dir.forEach(async (v : string) => {
          dirPath += v +'/';
          await mkDir(dirPath);
        });
        setTimeout(() => {
          resolve(true);
        }, 0);
      }else{
        resolve(true);
      }
    })
  })
}

/**
 * @description download image from url
 * @author frenkie
 * @date 2020-08-06
 * @param {String} url url
 * @param {String} fileName fileName
 * @param {String} type .jpg || .png
 * @param {String} path ./aaa/bbb
 * @returns 
 */
function downloadImage(url : string, fileName : string, type : string, path : string) {
  return new Promise((resolve, rejects) => {
    request({uri:url, encoding: 'binary'}, function(error : any, res : object, body : Buffer){
      if (error) rejects(error);
      saveBufferImage(body, fileName, type, path);
    })
  })
}


/**
 * @description save buffer data to image
 * @author frenkie
 * @date 2020-08-07
 * @param {Buffer} buffer
 * @param {string} fileName
 * @param {string} type
 * @param {string} path
 * @returns 
 */
function saveBufferImage(buffer : Buffer, fileName : string, type : string, path : string) {
  return new Promise((resolve, rejects) => {
    checkDirExists(path).then(res=>{
      fs.writeFile(path + '/' + fileName + '.' + type, buffer,　"binary", function(err: any,res: any){
        if (err) rejects(err);
        resolve(true);
      })
    }).catch(err=>{
      console.log('儲存失敗:' + err);
    });
  })
}

/**
 * @description save stream file to local
 * @author frenkie
 * @date 2020-08-07
 * @param {String} fileName
 * @param {String} type .jpg
 * @param {String} path ./src/xxx
 * @returns 
 */
function createWriteStream(fileName: string, type : string, path : string){
  return new Promise((resolve, rejects) => {
    checkDirExists(path).then(res=>{
      resolve(fs.createWriteStream(path + '/' + fileName + '.' + type));
    }).catch(err=>{
      console.log('儲存失敗:' + err);
    });
  })
}

export {
  downloadImage,
  saveBufferImage,
  createWriteStream
}