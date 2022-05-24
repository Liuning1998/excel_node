//引入模块
const express = require('express')
const cors = require('cors')
const userFile = require('./public/api/files')    // ! files 模块
const download = require('./public/api/download')    // ! files 模块
const schedule = require('./public/js/schedule')    // ! schedule 模块
//调用模块，创建应用
const app = express()
app.use(cors()) //跨域问题
app.use(express.static('public'))   // ! 托管静态资源
app.use('/public/api/files',userFile)  //静态路由，用use把router添加到中间件处理路径，我们就可以在主应用中，使用这个模块中的路由模块
app.use('/public/api/download',download)  //静态路由，用use把router添加到中间件处理路径，我们就可以在主应用中，使用这个模块中的路由模块
schedule.job.job();
// ! 设置监听 8527 端口，到时候我们在浏览器就访问这个端口
app.listen(8527,()=>console.log("server running succeed"))