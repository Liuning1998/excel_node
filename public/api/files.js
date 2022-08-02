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
		
		const stream = fs.createReadStream(oldpath);//创建可读流
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
			  readFile(oldpath,files.file.originalFilename,(result,createFileLength,failData)=>{
				  
				  if(result){
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
							  fileName:files.file.originalFilename,
							  fileLength: createFileLength,
							  failDataArray:failData
						   }
						})
						
				  }else{
					  // 删除失败文件
					  fs.unlink(files.file.filepath,function(error){
					  
					      if(error){
					  
					          console.log(error);
					  
					          return false;
					  
					      }
					  
					      console.log('删除文件成功');
					  
					  })
					  
					  response.json({      //响应json数据
					    code: 200,
					    data: { 
					  	  result: '失败',
					  	  fileName:files.file.originalFilename
					     }
					  })
					  
				  }
			  	
			  	
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
	
	let p = path.join(__dirname, '../../test/rule_data.json')
	//读取当前record.json文件内容
	let ruleData = JSON.parse(fs.readFileSync(p, 'utf8'))
	
	let ruleDataKeys = Object.keys(ruleData)
	
	let newFileObject = new Object();
	
	let list = xlsx.parse(filepath);
	
	let skuPosition = -1 //商品编码一栏在第几列
	
	let result = true
	
	let createFileLength = 0; //生成文件数量
	
	let failData = []; //规则外sku
	
	try{ //用来中止foreach循环
		
		await new Promise((resolve, reject)=>{
			list.forEach(async (ele,index) => {
				if(ele.hasOwnProperty("data") && ele.data.length > 0){
					for(const key in ele.data){
						
						if( key == 0 ){
							
							// 如果是第一行遍历给newFileObjectpush表头
							if(index == 0){//如果是sheet1情况下
								
								skuPosition = ele.data[key].indexOf('商品编码')
								
								if(skuPosition < 0){
									reject()
									console.log('文件错误')
									throw new Error('中止循环')
								}
								
								for(var i=0;i<ruleDataKeys.length;i++){
									newFileObject[ruleDataKeys[i]] = [];
									newFileObject[ruleDataKeys[i]].push({name:ele.name,data:[ele.data[key]]})
								}
							}
							
							resolve()
							
						}else{//从第二行开始遍历
							let currentData = ele.data[key][skuPosition]// skuPosition ---（sku所在列）
							let abc;
							for(const i in ruleDataKeys){ //遍历[ '盈通', '中科', '果园', '千禾', '早康' ]
								
								let ruleKey = ruleDataKeys[i] //‘中科’
								if(ruleData[ruleKey].includes( parseFloat(currentData) )){
									newFileObject[ruleKey][0].data.push(ele.data[key])
									abc = true
								}else if(i == ruleDataKeys.length - 1){
									if(abc != true){
										abc = false
										failData.push([ele.data[key][0],ele.data[key][1]])
										console.log('不存在',ele.data[key])
									}
								}
							}
							resolve()
						}
						
					}
					
				}
			})
			
		})
		
		// 拆分完成，遍历数组生成文件
		for(const file in newFileObject){ 
			
			if( newFileObject[file][0].data.length > 1 ){
				
				createFileLength += 1
				
				fs.writeFileSync('./downloads/'+setFileName(name,file), xlsx.build(newFileObject[file]), "binary");
				
				//记录文件
				var updateData = {
					oldName:name,
					resultName: setFileName(name,file),
					downloaded: false,
					create: Date.now()
				} 
				await readRecord(updateData)
			}
			
		}
		
		
	}catch(e){
		
		result = false
	}
	
	if(!!callBack){
		callBack(result,createFileLength,failData)
	}
	
}

/**
 * 添加记录到record.json
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
function setFileName(fileName,newName){
	
	var index=fileName.lastIndexOf(".");
	
	var name=fileName.substring(0, index);
	
	var houzhui = fileName.substring(fileName.lastIndexOf(".")+1);
	
	if(newName){
		return newName + sd.format(new Date(),"YYYY_MM_DD_HH_mm_ss") + '.' + houzhui
	}else{
		return newName + sd.format(new Date(),"YYYY_MM_DD_HH_mm_ss") + '.' + houzhui
	}
	
}

	
//导出
module.exports = fliesRouter