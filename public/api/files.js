//引入router方法，实现路由模块化
const formidable = require('formidable')
const path = require('path')//解析处理文件路径 名称 后缀等信息
const fs=require('fs');//读写文件 文件夹 判断文件类型等
const sd=require('silly-datetime');//格式化时间字符串
const crypto = require('crypto');
const xlsx = require('node-xlsx');// 读写xlsx的插件
const fliesRouter = require('express').Router()



/**
 * 接收xlsx文件 拆分文件并返回执行结果
 * @param {object}request
 * @param {object}response
 * @param {object}next
 * @returns {object} return:结果
 */
fliesRouter.post('/student',(request,response,next) => {
    const form = formidable({
        uploadDir: path.join(__dirname, '../../uploads'), // 上传文件放置的目录
        keepExtensions: true,           //包含源文件的扩展名
        multiples: true                 //多个文件的倍数
      })
    
      // 从请求中解析提交的数据（包括文本与文件数据）
      // fields 中保存的是文本数据信息
      // files 中保存的是文件数据相关信息
      form.parse(request, (err, fields, files) => {
		
		// console.log(fields)
        if (err) {  
          next(err)
          return
        }
	
		var oldpath=files.file.filepath;
		
		const stream = fs.createReadStream(oldpath);
		const hash = crypto.createHash('md5');
		stream.on('data', chunk => {
		  hash.update(chunk, 'utf8');
		});
		stream.on('end', () => {
		  const serverMd5 = hash.digest('hex');
		  if(serverMd5 != fields.md5){
			  response.json({      //响应json数据
			    code: 200,
			    data: { 
			  	  result: '失败',
			  	  fileName:files.file.originalFilename
			     }
			  })
		  }else{
			  readFile(oldpath,files.file.originalFilename,()=>{
			  	// var newpath=path.parse(files.file.filepath).dir + '/' + getFileName(files.file.originalFilename);
			  	
			  	var newpath=path.parse(files.file.filepath).dir + '/' + files.file.originalFilename;
			  	
			  	fs.rename(oldpath,newpath,function(err){
			  		if(err){
			  			console.log('改名失败',err)
			  		}
			  	})
			  	
			  
			  	response.json({      //响应json数据
			  	  code: 200,
			  	  data: { 
			  		  result: '成功',
			  		  fileName:files.file.originalFilename
			  	   }
			  	})
			  	
			  	
			  })
			  
		  }
			
		});
		
      })
})
	

/**
 * 读取文件
 * @param {object}name
 * @returns {string} return:name
 */
async function readFile(filepath,name,callBack){
	
	let list = xlsx.parse(filepath);
	await new Promise((resolve, reject)=>{
		list.forEach(async (ele,index) => {
			if(ele.hasOwnProperty("data") && ele.data.length > 0){
				for(const key in ele.data){
					if(key > 0){
						try{
							//规则
							var xlsxObj = new Array();
							xlsxObj.push(
								{
									name:ele.name,
									data:[ele.data[0],ele.data[key]],
								}
							)
							//生成文件
							fs.writeFileSync('./downloads/'+getFileName(name,ele.name+key), xlsx.build(xlsxObj), "binary");
							
							//记录文件
							var updateData = {
								oldName:name,
								resultName: getFileName(name,ele.name+key),
								downloaded: false,
								create: Date.now()
							} 
							await readRecord(updateData)
							resolve()
						}catch(e){
							console.log('readFile-err', e);
							reject()
							return
						}
						
					}
				}
				
			}
		})
		
	})

	console.log('完成')
	
	if(!!callBack){
		callBack()
	}
	
}

/**
 * 读取record.json
 * @param {object}updateData
 * @returns {string} return:
 */
function readRecord(updateData){
	return new Promise((resolve, reject)=>{
		//将地址赋值给p
		let p = path.join(__dirname, '../../record.json')
		//读取当前record.json文件内容
		let data = fs.readFileSync(p, 'utf8')
		
		//定义一个数组存放读取到的数据
		let arr = JSON.parse(data)
		//将新记录添加到数组中
		arr.push(updateData)
		//添加后写入b.json文件
		fs.writeFileSync(p,JSON.stringify(arr), 'utf8')
		resolve()

	})
}
	
/**
 * 获取文件名并去掉后缀
 * @param {string}fileName
 * @returns {string} return:newFileName
 */
function getFileName(fileName,el){
	
	var index=fileName.lastIndexOf(".");
	
	var name=fileName.substring(0, index);
	
	var houzhui = fileName.substring(fileName.lastIndexOf(".")+1);
	
	if(el){
		return name + sd.format(new Date(),"YYYYMMDDHHmmss") + '(' + el + ').' + houzhui
	}else{
		return name + sd.format(new Date(),"YYYYMMDDHHmmss") + '.' + houzhui
	}
	
}

	
//导出
module.exports = fliesRouter