/**
 * @description lineBot的訊息事件
 * @author frenkie
 * @date 2020-08-06
 */
import { line, request, config, client, db, fsItem } from './_import';
import { getLineMessageImages } from './_lineEvent';
const fs = require("fs");

const globalAny: any = global;

export default async function (event: lineEvent) {
  console.log('訊息事件發生');
  console.log(event);
  // use reply API
  let replyMessage = null;
  switch (event.message.type) {
    case 'text':
      let message: string = event.message.text;
      let keyWord: string;
      if(message.slice(message.length - 4 , message.length) === '.jpg'){
        keyWord = message.slice(message.length - 4 , message.length);
        message = message.slice(0 , message.length - 4);
      }else{
        let messageSplit = message.split(' ');
        keyWord = messageSplit.splice(0, 1)[0];
        message = messageSplit.join(' ');
      }
      var regex = new RegExp("^[\u4e00-\u9fa5_a-zA-Z0-9_][\u4e00-\u9fa5_a-zA-Z0-9_ ][\u4e00-\u9fa5_a-zA-Z0-9_]*$");
      if(!regex.test(message)){
        console.log('要寫在觸發事件後去檢查然後退回驗證失敗');
      }
      console.log(regex.test(message), {message, keyWord});
      switch (keyWord) {
        case '.h':
          replyMessage = [
            { type: 'text', text: '目前可用指令如下'},
            { type: 'text', text: '.y2b XXX，回覆youtube的搜尋結果' + '\n\n'  + '.meme XXX，建立XXX.jpg的梗圖' + '\n\n'  + 'XXX.jpg，要求機器人回傳對應的梗圖'}
          ];
          break;
        case '.y2b':
          var request = require('request');
          let url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=8&q=' + encodeURI(message) +'&type=video&videoCategoryId=10&key=' + config.googleApiKey;
          console.log(url)
          var options = {
            'method': 'GET',
            'url': url,
            'headers': {
            }
          };
          request(options, function (error: any, response: any) {
            if (error) throw new Error(error);
            let youtubeItems = JSON.parse(response.body).items;
            console.log(response.body, '獲取youtube結果');
            console.log(youtubeItems, 'youtubeItems');
            let flexContents : any = [];
            youtubeItems.forEach((v: any)=>{
              flexContents.push({
                "type": "bubble",
                "hero": {
                  "type": "image",
                  "url": v.snippet.thumbnails.medium.url,
                  "size": "full",
                  "aspectMode": "cover",
                  "aspectRatio": "480:260"
                },
                "body": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "text",
                      "text": v.snippet.title,
                      "weight": "bold",
                      "size": "md",
                      "style": "italic"
                    },
                    {
                      "type": "text",
                      "text": v.snippet.channelTitle,
                      "size": "xxs",
                      "align": "end"
                    }
                  ]
                },
                "footer": {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "button",
                      "action": {
                        "type": "uri",
                        "label": "前往",
                        "uri": "https://www.youtube.com/watch?v=" + v.id.videoId
                      },
                      "style": "primary",
                      "height": "sm"
                    }
                  ]
                }
              })
            })
            replyMessage = {
              type: "flex",
              altText: "this is a youtube search result",
              contents: {
                  type: "carousel",
                  contents: flexContents
                }
              }
            console.log('replyMessage', replyMessage)
            client.replyMessage(event.replyToken, replyMessage).catch((err: any) => {
              console.log('回覆line錯誤:' + err)
            });
          });
          break;
        case '.meme':
          let checkMemeResult = await db.findOneQuery('memeImages', {memeName : message});
          if(!checkMemeResult){
            replyMessage = { type: 'text', text: '請為"' + message + '.jpg"上傳對應的圖片，這張圖片每個人都看的到喔！注意不要上傳私人照片或是為違法照片。'};
            globalAny.lineUserStates[event.source.userId] = {
              type: 'meme',
              memeName: message
            }
          }else{
            replyMessage = { type: 'text', text: '"' + message + '.jpg"已經存在了喔！'};
          }
          break;
        case '.jpg':
          let memeResult = await db.findOneQuery('memeImages', {memeName : message}) as any;
          console.log(memeResult, 'memeResult')
          if(memeResult){
            replyMessage = {
              type: 'image',
              originalContentUrl: memeResult.fileUrl,
              previewImageUrl: memeResult.fileUrl
            }
          }else{
            replyMessage = { type: 'text', text: '"' + message + '.jpg"不存在喔！為我們新增？'};
          }
          break
        default:
          break;
      }
      break;
    case 'image':
      if(globalAny.lineUserStates[event.source.userId] && globalAny.lineUserStates[event.source.userId].type === 'meme'){
        let imageName = 'meme-' + event.source.userId + '-' + (Math.floor(Math.random() * 99999));
        // 這邊不處理線下的圖片的原因是會消耗效能，因為heroku的設定會定期將非本體的檔案清除所以並不需要另外浪費效能去作這件事
        getLineMessageImages(event.message.id, imageName, 'jpg', './').then(res=>{
          request({
            method : 'post',
            url : 'https://api.imgur.com/3/upload',
            headers :{
              Authorization: 'Client-ID ' + config.imgur.clientID
            },
            formData: {
              'type': 'file',
              'image': {
                'value': fs.createReadStream('./' + imageName + '.jpg'),
                'options': {
                  'filename': imageName + '.jpg',
                  'contentType': null
                }
              },
              'name': imageName + '.jpg'
            }
          }, function(error: any, res: any){
            if (error) throw new Error(error);
            let imgurData = JSON.parse(res.body).data;
            replyMessage = [
              { 
                type: 'image',
                originalContentUrl: imgurData.link,
                previewImageUrl: imgurData.link 
              },
              { type: 'text', text: '梗圖"' + globalAny.lineUserStates[event.source.userId].memeName + '.jpg"上傳完成'}
            ]
            db.create('memeImages', {
              userId : event.source.userId,
              memeName : globalAny.lineUserStates[event.source.userId].memeName,
              fileUrl : imgurData.link,
              deletehash : imgurData.deletehash
            })
            delete globalAny.lineUserStates[event.source.userId];
            client.replyMessage(event.replyToken, replyMessage).catch((err: any) => {
              console.log('回覆line錯誤:' + err)
            });
          })
        }).catch(err=>{
          console.log('上傳失敗:' + err);
          replyMessage = { type: 'text', text: '梗圖"' + globalAny.lineUserStates[event.source.userId].memeName + '.jpg"上傳失敗'}
          delete globalAny.lineUserStates[event.source.userId];
        })
      }
      break;
    default:
      break;
  }
  if(replyMessage){
    client.replyMessage(event.replyToken, replyMessage).catch((err: any) => {
      console.log('回覆line錯誤:' + err)
    });
  }
}