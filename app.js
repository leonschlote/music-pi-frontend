const { exec } = require("child_process"),
express = require('express'),
app = express(),
server = require('http').Server(app),
io = require('socket.io')(server),
//tcp = require('net'),
fs = require('fs'),
httpPort = 8080

var available_sources = JSON.parse(fs.readFileSync(__dirname+'/sources.json', 'utf-8'))

var sources_html = ""
var info = {
	'source_name': 'test_name',
	'title': 'test_title',
	'detail': 'detail - detail'
}

var active_source = ''
var active_image = 'empty_album_art.png'

for (id in available_sources){
	let source = available_sources[id];
	console.log(source)
	sources_html += "<a class=\"source_container\" href=\"javascript:change_source('" + id + "')\" style=\"background-image: url('/static/img/"+id+".png'\"></a>"
}


var website = fs.readFileSync(__dirname + '/static/html/index.html').toString().replace('<$sources_list$/>',sources_html)

app.use('/static/css', express.static(__dirname+'/static/css'))
app.use('/static/img', express.static(__dirname+'/static/img'))
app.use('/static/js', express.static(__dirname+'/static/js'))


app.get('/', (req, res)=>{
	  res.send(website)
})

app.get('*', (req, res)=>{
	  res.redirect('/')
})

io.on('connection', (socket)=>{
	socket.on('change_source', (id)=>{
		enable_source(id)
      })
	enable_source(active_source)
})

var update_info_interval = setInterval(()=>{
	if(available_sources[active_source] !== undefined){
		io.emit('update_info',available_sources[active_source].info)
	}
},2000)

server.listen(httpPort, ()=>{
	  console.log('HTTP Server started, listening on Port ' + (httpPort))
})

function enable_source(id){
	console.log('Enabling Audio Source -> ' + id)

	if(available_sources[id] !== undefined){
		active_source = id
		for(loop_id in available_sources){
			let source = available_sources[id]
			if (loop_id != id){
				console.log("Stopping -> " + available_sources[loop_id].service)
				exec('systemctl stop ' + available_sources[loop_id].service)
		        }
	      }
              exec('systemctl start ' + available_sources[id].service)
		console.log("Starting -> " + available_sources[id].service)
		set_active_image(id+'.png')

	}
}

function set_active_image(src){
	io.emit('update_album_art', src)
}


function makeid(length) {
	   var result           = '';
	   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	   var charactersLength = characters.length;
	   for ( var i = 0; i < length; i++ ) {
		         result += characters.charAt(Math.floor(Math.random() * charactersLength));
		      }
	   return result;
}

// =========== Shairport update metadata ============
const ShairportReader = require('shairport-sync-reader')
var pipeReader = new ShairportReader({ path: '/tmp/shairport-sync-metadata' });
var airplay_album_art = '';

pipeReader.on('meta', (data)=>{
	//console.log(data)
	if(data.asal != "" && data.asal != undefined)
		available_sources['airplay'].info.title = data.asal
	if(data.asar != "" && data.asar != undefined && data.minm != "" && data.minm != undefined)
		available_sources['airplay'].info.detail = data.asar + ' - ' + data.minm
})

var last_img_id = ''

pipeReader.on('PICT', (data)=>{

	try{
	fs.unlinkSync(__dirname+'/static/img/airplay_album_art_' + last_img_id + '.png')
	}catch(e){}

	var nocache = makeid(5) 
	last_img_id = nocache
	airplay_album_art = data


	fs.writeFileSync('static/img/airplay_album_art_' + nocache + '.png', data);

	
	app.get('/static/img/airplay_album_art_' + nocache + '.png', (req, res)=>{
		  res.send(airplay_album_art)
	})

	set_active_image('airplay_album_art_' + nocache + '.png')
	//console.log(app._router.stack)
})


// ============== Radio update metadata =================
setInterval(()=>{
	exec('mpc',(error, stdout, stderr)=>{
		radio_info = stdout.split('\n')[0]
		if(active_source == 'radio1'){
			available_sources[active_source].info.title = radio_info.substr(0,9)  
			available_sources[active_source].info.detail = radio_info.substr(11)  
		}else if(active_source == 'fritz'){
			available_sources[active_source].info.detail = radio_info  
		}
	})
},2000)



enable_source('radio1')
