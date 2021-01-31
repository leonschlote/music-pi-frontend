const { exec } = require("child_process");

const express = require('express'),
app = express(),
server = require('http').Server(app),
io = require('socket.io')(server),
//tcp = require('net'),
fs = require('fs'),
httpPort = 8080

var available_sources = require(__dirname+'/sources.json')
var sources_html = ""
var services = {}

for (source of available_sources){
	services[source.id] = source.service
	sources_html += "<a class=\"source_container\" href=\"javascript:change_source('" + source.id + "')\"></a>"
}


var website = fs.readFileSync(__dirname + '/static/html/index.html').toString().replace('<$sources_list$/>',sources_html)

app.use('/static/css', express.static(__dirname+'/static/css'))
app.use('/static/js', express.static(__dirname+'/static/js'))

app.get('/', (req, res)=>{
	  res.send(website)
})

app.get('*', (req, res)=>{
	  res.redirect('/')
})

io.on('connection', (socket)=>{
	socket.on('change_source', (source_id)=>{
		console.log(source_id)
		for(source of available_sources){
			//console.log(source.id + " <- source")
			if (source.id != source_id){
				exec('systemctl stop ' + source.service)
			}
		}
		setTimeout(()=>{exec('systemctl start ' + services[source_id])},2000)
	          })
	          })

server.listen(httpPort, ()=>{
	  console.log('HTTP Server started, listening on Port ' + (httpPort))
})






/*
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World!');
}).listen(8080);*/
