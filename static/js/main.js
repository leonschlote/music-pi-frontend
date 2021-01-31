var host = window.location.hostname + ":" + window.location.port
var current_info = {};
const socket = io(host);
console.log('Connecting to WebSocket at '+host);

socket.on('update_info', (new_info)=>{
	if(new_info.source_name != current_info.source_name)
		$('.active_source .source_name').html(new_info.source_name)
	if(new_info.title != current_info.title)
		$('.active_source .title').html(new_info.title)
	if(new_info.detail != current_info.detail)
		$('.active_source .detail').html(new_info.detail)
})

socket.on('update_active', (info)=>{
	        console.log(info)
	      })

socket.on('update_album_art', (src)=>{
	src = '/static/img/'+src
	console.log(src)
	$('.active_source').css('background',"linear-gradient(rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.7)), url('" + src + "')")
})

function change_source(source_id){
	socket.emit('change_source', source_id)
}

