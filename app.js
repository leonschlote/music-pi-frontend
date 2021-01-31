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
var active_image = 'img/empty_album_art.png'

for (id in available_sources){
	let source = available_sources[id];
	console.log(source)
	sources_html += "<a class=\"source_container\" href=\"javascript:change_source('" + id + "')\" style=\"background-image: url('/static/img/"+id+".png'\"></a>"
}

fs.mkdirSync('/tmp/www/static/img', {recursive: true})

var website = fs.readFileSync(__dirname + '/static/html/index.html').toString().replace('<$sources_list$/>',sources_html)

app.use('/static/css', express.static(__dirname+'/static/css'))
app.use('/static/img', express.static(__dirname+'/static/img'))
app.use('/static/albumart', express.static('/tmp/www/static/img'))
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
	if(id != active_source){
		set_active_image(available_sources[id].image)
	}else{
		set_active_image(active_image)
	}

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
		//set_active_image('img/' + id + '.png')

		fs.writeFileSync('/tmp/active_audio_source', id);
	}
}

function set_active_image(src){
	console.log('New Image is -> '+ src + ', old image was -> ' + active_image)
	active_image = src
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
		fs.unlinkSync('/tmp/www/static/img/airplay_album_art_' + last_img_id + '.png')
	}catch(e){}

	var nocache = makeid(5) 
	last_img_id = nocache
	airplay_album_art = data

	fs.writeFileSync('/tmp/www/static/img/airplay_album_art_' + nocache + '.png', data)

	set_active_image('albumart/airplay_album_art_' + nocache + '.png')
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

try{
	enable_source(fs.readFileSync('/tmp/active_audio_source').toString())
}catch(e){
	enable_source('radio1')
}

