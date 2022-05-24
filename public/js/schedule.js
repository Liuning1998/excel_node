const schedule = require("node-schedule");
const path = require('path')//解析处理文件路径 名称 后缀等信息
const fs=require('fs');//读写文件 文件夹 判断文件类型等


const job = schedule.scheduleJob('30 1 1 1 * *', function (fireDate) {
	//将地址赋值给p
	let p = path.join(__dirname, '../../record.json')
	//读取当前record.json文件内容
	fs.readFile(p, 'utf8', (err, data) => {
		
		//如果错误则输出错误并返回
		if (err) {
		    console.log('err', err);
		}
		
		const arr = JSON.parse(data)
		
		const filterArr = arr.filter(v => {
			return getExpires(v.create,Date.now())
		})
		
		filterArr.forEach((ele,index)=>{
			//一个月检查一次 删除超过一个月的源文件和拆分文件 下载状态置为true
			ele.downloaded = true
			fs.writeFileSync(p, JSON.stringify(arr),'utf8')
			fs.unlink('./downloads/'+ele.resultName, (err) => {
			  console.log(ele.resultName+'已删除');
			  console.log(err);
			});
			fs.unlink('./uploads/'+ele.oldName, (err) => {
			  console.log(ele.oldName+'已删除');
			  console.log(err);
			});
		})
	  
	})
});

//比较两个时间是否大于一个月，例如20170215--到20170315 是一个月，到20170316是大于一个月
function getExpires(sDate, endDate) {
    var sDate = new Date(sDate);
    var eDate = new Date(endDate);
 
    if (eDate.getFullYear() - sDate.getFullYear() > 1) {//先比较年
        return true;
    } else if (eDate.getMonth() - sDate.getMonth() > 1) {//再比较月
        return true;
    } else if (eDate.getMonth() - sDate.getMonth() == 1) {
        if (eDate.getDate() - sDate.getDate() >= 1) {
            return true;
        }
    }
     else if (eDate.getFullYear() - sDate.getFullYear() == 1) {
        if (eDate.getMonth()+12 - sDate.getMonth() > 1) {
            return true;
        }
         else if (eDate.getDate() - sDate.getDate() >= 1) {
            return true;
        }
    }
    return false;
}

module.exports.job  = job