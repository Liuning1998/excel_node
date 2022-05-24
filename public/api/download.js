//引入router方法，实现路由模块化
const formidable = require('formidable')
const path = require('path')//解析处理文件路径 名称 后缀等信息
const fs=require('fs');//读写文件 文件夹 判断文件类型等
const sd=require('silly-datetime');//格式化时间字符串
const xlsx = require('node-xlsx');// 读写xlsx的插件
const fliesRouter = require('express').Router()



/**
 * 返回待下载文件列表GET
 * @param {object}request
 * @param {object}response
 * @param {object}next
 * @returns {object} return:结果
 */
fliesRouter.get('/download_list',async (request,response,next) => {
	var downloaded = false
	getJson(downloaded).then((res) =>{
		response.json({      //响应json数据
		  code: 200,
		  data: { filesArray: res }
		})
	}).catch((err)=>{
		console.log(err)
		response.json({      //响应json数据
		  code: 200,
		  data: { filesArray: [] }
		})
	})


})

/**
 * 下载文件接口
 * @param {object}request
 * @param {object}response
 * @param {object}next
 * @returns {object} return:结果
 * 
 */
fliesRouter.get('/download',(request,response,next) => {
    var fileName = request.query.name,
		filePath = path.resolve('./downloads/'),
        currFile = path.join(filePath,fileName),
        fReadStream;

	
    fs.exists(currFile,function(exist) {
        if(exist){
			updateRecord(fileName,true).then(()=>{
				response.set("Access-Control-Expose-Headers", "Content-Disposition");
				// res.set("Content-Type", "application/vnd.ms-excel");
				response.set("Content-Type", "application/octet-stream");
				response.set("Content-Disposition", `attachment; filename=${encodeURI(fileName)}`);
				fs.createReadStream(currFile).pipe(response);
			}).catch((err) => {
				console.log(err)
				// response.set("Content-type","text/html");
				// response.send({
				// 	msg:'失败'
				// });
				// response.end();
				response.json({      //响应json数据
				  code: 200,
				  data: { 
					  result: '失败',
				   }
				})
				
			})
        }else{
			response.json({      //响应json数据
			  code: 200,
			  data: { 
				  result: '失败',
			   }
			})
        }
    });

})

/**
 * 读取record.json
 * @param {downloaded} 是否被下载
 * @returns {object} return:结果
 */
function getJson(downloaded){
	return new Promise((resolve, reject)=>{
		//将地址赋值给p
		let p = path.join(__dirname, '../../record.json')
		//读取当前record.json文件内容
		let data = fs.readFileSync(p, 'utf8')
		if(data){
			const arr = JSON.parse(data)
			
			const filterArr = arr.filter(v => {
				return v.downloaded == downloaded
			})
			
			if (filterArr[0]) {
				resolve(filterArr) 
			} else {
				reject()
			}
		}else{
			console.log(data)
		}
		// fs.readFile(p, 'utf8', (err, data) => {
			
		// 	//如果错误则输出错误并返回
		// 	if (err) {
		// 	    console.log('err-readFile');
		// 	    reject()
		// 	}
			
		// 	console.log(data)
		// 	if(data){
		// 		const arr = JSON.parse(data)
				
		// 		const filterArr = arr.filter(v => {
		// 			return v.downloaded == downloaded
		// 		})
				
		// 		if (filterArr[0]) {
		// 			resolve(filterArr) 
		// 		} else {
		// 			reject()
		// 		}
		// 	}else{
		// 		console.log(data)
		// 	}
			
		  
		// })
	
	})
}


/**
 * 修改record.json
 * @param {string} 被下载文件名字
 * @returns {object} return:结果
 */
function updateRecord(fileNmae,downloaded){
	return new Promise((resolve, reject)=>{
		//将地址赋值给p
		let p = path.join(__dirname, '../../record.json')
		//读取当前record.json文件内容
		fs.readFile(p, 'utf8', (err, data) => {
			
			//如果错误则输出错误并返回
			if (err) {
			    console.log('err', err);
			    reject()
			}
			
			const arr = JSON.parse(data)
			
			const filterArr = arr.filter(v => {
				return v.resultName == fileNmae
			})
			
			
			if (filterArr[0]) {
				filterArr[0].downloaded = downloaded
				//保存回去
				if (!fs.writeFileSync(p, JSON.stringify(arr),'utf8')) {
					resolve()
				} else {
					reject()
				}
			} else {
				reject()
			}
		  
		})
	
	})
}

/**
 * 遍历文件方法
 * @param {string}filePath
 * @returns {object} return:结果
 */
function fileDisplay(filePath){
	//根据文件路径读取文件，返回文件列表
	var p = new Promise((resolve)=>{
		fs.readdir(filePath, function(err, files) {
			if (err) {
				console.warn(err, "读取文件夹错误！")
			} else {
				//遍历读取到的文件列表
				var filesArray = new Array();
				var  promiseArray = new Array();
				files.forEach(function(filename,index) {
					promiseArray[index] = new Promise((resolve) => {
						//获取当前文件的绝对路径
						var filedir = path.join(filePath, filename);
						//根据文件路径获取文件信息，返回一个fs.Stats对象
						fs.stat(filedir, function(eror, stats) {
							if (eror) {
								console.warn('获取文件stats失败');
							} else {
								var isFile = stats.isFile(); //是文件
								var isDir = stats.isDirectory(); //是文件夹
								if (isFile) {
									if(filedir.substring(filedir.lastIndexOf('.') + 1) != 'DS_Store'){
										filesArray.push(filedir)
										resolve();
									}else{
										resolve();
									}
								}
								if (isDir) {
									fileDisplay(filedir); //递归，如果是文件夹，就继续遍历该文件夹下面的文件
								}
							}
						})
					})
				});
				Promise.all(promiseArray).then(() => {
					resolve(filesArray);
				})
		
			}
		});
	})
	
	return p

}


	
//导出
module.exports = fliesRouter